import { useEffect, useReducer, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useBlocker, useNavigate } from "react-router-dom";
import { track } from "@/lib/analytics";
import { getRecommendations, prefetchProducts } from "@/lib/dataSource";
import { compressImage } from "@/lib/compressImage";
import type { ScoredRecommendationSet } from "@/lib/products/scoring";
import { fadeUp } from "@/styles/motionVariants";
import { ScanBackground } from "./components/ScanBackground";
import { ScanProgress } from "./components/ScanProgress";
import { IntroStep } from "./steps/IntroStep";
import { PhotoStep } from "./steps/PhotoStep";
import { ReviewStep } from "./steps/ReviewStep";
import { QuizStep } from "./steps/QuizStep";
import { AnalyzingStep } from "./steps/AnalyzingStep";
import {
  clearPersistedQuizProgress,
  createInitialScannerState,
  scannerReducer,
  writePersistedQuizProgress,
} from "./scannerReducer";
import { STEP_ORDER } from "./steps";
import type { QuizAnswerValue } from "./quiz/quizTypes";
import { toDiagnosticAnswers } from "./toDiagnosticAnswers";
import { usePhotoPreview } from "./usePhotoPreviews";
import s from "./scanner.module.css";

export default function ScannerRoute() {
  const [state, dispatch] = useReducer(scannerReducer, undefined, createInitialScannerState);
  const [compressing, setCompressing] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const navigate = useNavigate();
  const previewUrl = usePhotoPreview(state.photo);

  const step = STEP_ORDER[state.stepIndex];
  const hasProgress = Boolean(state.photo) || Object.keys(state.quizAnswers).length > 0;

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasProgress) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasProgress]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasProgress &&
      nextLocation.pathname !== currentLocation.pathname &&
      nextLocation.pathname !== "/scan/results"
  );

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    const confirmed = window.confirm("Leave your scan? Your progress will be discarded.");
    if (confirmed) blocker.proceed();
    else blocker.reset();
  }, [blocker]);

  // The narrow sessionStorage exception (see CLAUDE.md): quiz answers and
  // quiz position persist while the user is in the quiz step. The photo is
  // never included here — it stays purely in-memory, matching what it
  // always was.
  useEffect(() => {
    if (step !== "quiz") return;
    writePersistedQuizProgress({
      quizAnswers: state.quizAnswers,
      quizIndex: state.quizIndex,
      interstitialShown: state.interstitialShown,
    });
  }, [step, state.quizAnswers, state.quizIndex, state.interstitialShown]);

  // The moment the user leaves the quiz, its sessionStorage snapshot is
  // stale forever (the write effect above only fires while step === "quiz",
  // so it's frozen at the last quiz question, not "the user finished all
  // 9"). Without this, refreshing on the review step (the step immediately
  // after the quiz) would read that stale blob and bounce the user back
  // into the last quiz question instead of leaving them on the review
  // screen — sessionStorage is only ever consulted at mount
  // (createInitialScannerState), so clearing it here doesn't affect normal
  // in-app Back navigation, which uses the reducer's in-memory state, and
  // self-heals if the user backs into the quiz again (the write effect
  // just fires again).
  useEffect(() => {
    if (step === "review") clearPersistedQuizProgress();
  }, [step]);

  // Prefetch the catalog the moment the quiz starts, not at the results
  // page — scoring itself is milliseconds, the network fetch is the slow
  // part. The user spends minutes on 9 questions, so this warms the cache
  // well before getRecommendations() needs it (see dataSource.ts). Still
  // fires at quiz start, not photo start, even though photo now comes
  // first (P2 of 4) — the photo step alone is a much shorter beat than the
  // 9-question quiz, so the meaningful head start is still there.
  // Deliberately NOT precomputing scoreProducts() here — the user can still
  // go back and change answers, and invalidating a cached score isn't
  // worth it for a millisecond-cheap pure function.
  useEffect(() => {
    if (step === "quiz") prefetchProducts();
  }, [step]);

  useEffect(() => {
    if (step !== "analyzing") return;
    let cancelled = false;

    (async () => {
      const diagnosticAnswers = toDiagnosticAnswers(state.quizAnswers);
      try {
        const recommendations: ScoredRecommendationSet = await getRecommendations(diagnosticAnswers);
        if (cancelled) return;
        track("scan_completed");
        clearPersistedQuizProgress();
        // `answers` rides along so the results page can render an honest
        // per-product match checklist (porosity/curl type/sensitivities/
        // budget/black-owned) — matchReasons alone only records what DID
        // match, not what the user actually asked for.
        navigate("/scan/results", { state: { recommendations, answers: diagnosticAnswers }, replace: true });
      } catch {
        // The only I/O this step does is the catalog fetch (scoreProducts()
        // itself is pure and synchronous) — so in practice every failure
        // here is a products-database problem, cold cache included. Name
        // that specifically rather than a generic "something went wrong."
        if (!cancelled) {
          dispatch({
            type: "ANALYSIS_FAILED",
            message: "We couldn't load the product database — check your connection and try again.",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, state.analysisAttempt]);

  async function handleCapture(file: File) {
    setPhotoError(null);
    setCompressing(true);
    try {
      const compressed = await compressImage(file);
      dispatch({ type: "SET_PHOTO", file: compressed });
    } catch {
      // Most commonly a format the browser's <img>/canvas pipeline can't
      // decode (e.g. HEIC on a non-Safari browser) — compressImage's own
      // loadImage() rejects rather than silently producing a blank canvas.
      setPhotoError(
        "We couldn't process that photo. Try a JPG or PNG, or skip this step for now — you can always add a photo later."
      );
    } finally {
      setCompressing(false);
    }
  }

  function handleQuizAnswer(questionId: string, value: QuizAnswerValue) {
    dispatch({ type: "SET_QUIZ_ANSWER", questionId, value });
  }

  function handleStartOver() {
    const confirmed = window.confirm("Start over? This will discard your answers and photo.");
    if (!confirmed) return;
    clearPersistedQuizProgress();
    dispatch({ type: "RESET" });
  }

  let stepContent: ReactNode = null;
  let stepKey: string = step;

  if (step === "intro") {
    stepContent = <IntroStep onDone={() => dispatch({ type: "NEXT" })} />;
  } else if (step === "photo") {
    stepContent = (
      <PhotoStep
        file={state.photo}
        previewUrl={previewUrl}
        compressing={compressing}
        error={photoError}
        onErrorChange={setPhotoError}
        onCapture={handleCapture}
        onRetake={() => {
          setPhotoError(null);
          dispatch({ type: "CLEAR_PHOTO" });
        }}
        onBack={() => dispatch({ type: "BACK" })}
        onNext={() => dispatch({ type: "NEXT" })}
        onSkip={() => {
          setPhotoError(null);
          dispatch({ type: "SKIP_PHOTO" });
        }}
      />
    );
  } else if (step === "quiz") {
    stepKey = `quiz-${state.quizIndex}-${state.showInterstitial}`;
    stepContent = (
      <QuizStep
        quizIndex={state.quizIndex}
        quizAnswers={state.quizAnswers}
        showInterstitial={state.showInterstitial}
        onAnswer={handleQuizAnswer}
        onAdvance={() => dispatch({ type: "ADVANCE_QUIZ" })}
        onDismissInterstitial={() => dispatch({ type: "DISMISS_INTERSTITIAL" })}
        onBack={() => dispatch({ type: "BACK" })}
      />
    );
  } else if (step === "review") {
    stepContent = (
      <ReviewStep
        quizAnswers={state.quizAnswers}
        onBack={() => dispatch({ type: "BACK" })}
        onContinue={() => dispatch({ type: "NEXT" })}
        onStartOver={handleStartOver}
      />
    );
  } else if (step === "analyzing") {
    stepContent = <AnalyzingStep error={state.analysisError} onRetry={() => dispatch({ type: "RETRY_ANALYSIS" })} />;
  }

  return (
    <div className={s.screen}>
      <ScanBackground />
      <div className={s.progressWrap}>
        <ScanProgress step={step} quizIndex={state.quizIndex} />
      </div>
      <div className={s.contentWrap}>
        <AnimatePresence mode="wait">
          <motion.div key={stepKey} initial="hidden" animate="visible" exit="hidden" variants={fadeUp}>
            {stepContent}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
