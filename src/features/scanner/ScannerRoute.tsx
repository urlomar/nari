import { useEffect, useReducer, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useBlocker, useNavigate } from "react-router-dom";
import { track } from "@/lib/analytics";
import { getRecommendations } from "@/lib/dataSource";
import { compressImage } from "@/lib/compressImage";
import type { RecommendationSet } from "@/lib/schemas";
import { fadeUp } from "@/styles/motionVariants";
import { ScanBackground } from "./components/ScanBackground";
import { ScanProgress } from "./components/ScanProgress";
import { IntroStep } from "./steps/IntroStep";
import { PhotoStep } from "./steps/PhotoStep";
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
  // 9"). Without this, refreshing on the photo step would read that stale
  // blob and bounce the user back into the last quiz question instead of
  // leaving them on photo — sessionStorage is only ever consulted at mount
  // (createInitialScannerState), so clearing it here doesn't affect normal
  // in-app Back navigation, which uses the reducer's in-memory state.
  useEffect(() => {
    if (step === "photo") clearPersistedQuizProgress();
  }, [step]);

  useEffect(() => {
    if (step !== "analyzing") return;
    let cancelled = false;

    (async () => {
      const diagnosticAnswers = toDiagnosticAnswers(state.quizAnswers);
      try {
        const recommendations: RecommendationSet = await getRecommendations(diagnosticAnswers);
        if (cancelled) return;
        track("scan_completed");
        clearPersistedQuizProgress();
        navigate("/scan/results", { state: { recommendations }, replace: true });
      } catch {
        if (!cancelled) {
          dispatch({ type: "ANALYSIS_FAILED", message: "We couldn't build your results. Please try again." });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, state.analysisAttempt]);

  async function handleCapture(file: File) {
    setCompressing(true);
    try {
      const compressed = await compressImage(file);
      dispatch({ type: "SET_PHOTO", file: compressed });
    } finally {
      setCompressing(false);
    }
  }

  function handleQuizAnswer(questionId: string, value: QuizAnswerValue) {
    dispatch({ type: "SET_QUIZ_ANSWER", questionId, value });
  }

  let stepContent: ReactNode = null;
  let stepKey: string = step;

  if (step === "intro") {
    stepContent = <IntroStep onDone={() => dispatch({ type: "NEXT" })} />;
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
  } else if (step === "photo") {
    stepContent = (
      <PhotoStep
        file={state.photo}
        previewUrl={previewUrl}
        compressing={compressing}
        onCapture={handleCapture}
        onRetake={() => dispatch({ type: "CLEAR_PHOTO" })}
        onBack={() => dispatch({ type: "BACK" })}
        onNext={() => dispatch({ type: "NEXT" })}
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
