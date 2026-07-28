import { useEffect, useReducer, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useBlocker, useNavigate } from "react-router-dom";
import { track } from "@/lib/analytics";
import { getQuizQuestions, getRecommendations } from "@/lib/dataSource";
import { compressImage } from "@/lib/compressImage";
import type { HairContext, RecommendationSet } from "@/lib/schemas";
import { fadeUp } from "@/styles/motionVariants";
import { ScanBackground } from "./components/ScanBackground";
import { ScanProgress } from "./components/ScanProgress";
import { IntroStep } from "./steps/IntroStep";
import { QuestionStep } from "./steps/QuestionStep";
import { PhotoStep } from "./steps/PhotoStep";
import { QuizStep } from "./steps/QuizStep";
import { AnalyzingStep } from "./steps/AnalyzingStep";
import {
  clearPersistedQuizProgress,
  createInitialScannerState,
  scannerReducer,
  writePersistedQuizProgress,
} from "./scannerReducer";
import { QUESTION_STEPS, STEP_ORDER } from "./steps";
import { usePhotoPreview } from "./usePhotoPreviews";
import s from "./scanner.module.css";

const ANSWER_ADVANCE_DELAY_MS = 250;

export default function ScannerRoute() {
  const [state, dispatch] = useReducer(scannerReducer, undefined, createInitialScannerState);
  const [compressing, setCompressing] = useState(false);
  const navigate = useNavigate();
  const previewUrl = usePhotoPreview(state.photo);

  const step = STEP_ORDER[state.stepIndex];
  const hasProgress = Boolean(state.photo) || Object.keys(state.quizAnswers).length > 0;

  // Fetched once on mount regardless of step, so questions are ready by the
  // time the user reaches the quiz — including immediately on a restored
  // mid-quiz refresh.
  useEffect(() => {
    let cancelled = false;
    getQuizQuestions().then((questions) => {
      if (!cancelled) dispatch({ type: "SET_QUIZ_QUESTIONS", questions });
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  // The narrow sessionStorage exception (see CLAUDE.md): quiz answers, quiz
  // position, and the 2 hair-context answers persist while the user is in
  // the quiz step. The photo is never included here — it stays purely
  // in-memory, matching what it always was.
  useEffect(() => {
    if (step !== "quiz") return;
    const { naturalState, product } = state.hairContext;
    if (!naturalState || !product) return;
    writePersistedQuizProgress({
      hairContext: { naturalState, product },
      quizAnswers: state.quizAnswers,
      quizIndex: state.quizIndex,
      interstitialShown: state.interstitialShown,
    });
  }, [step, state.hairContext, state.quizAnswers, state.quizIndex, state.interstitialShown]);

  useEffect(() => {
    if (step !== "analyzing") return;
    let cancelled = false;

    (async () => {
      const { naturalState, product } = state.hairContext;
      if (!naturalState || !product) {
        dispatch({
          type: "ANALYSIS_FAILED",
          message: "Something's missing from your answers. Please start your scan again.",
        });
        return;
      }
      const hairContext: HairContext = { naturalState, product };
      try {
        const recommendations: RecommendationSet = await getRecommendations(state.quizAnswers, hairContext);
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

  function handleHairAnswer(key: "naturalState" | "product", value: string) {
    dispatch({ type: "SET_HAIR_ANSWER", key, value });
    window.setTimeout(() => dispatch({ type: "NEXT" }), ANSWER_ADVANCE_DELAY_MS);
  }

  function handleQuizAnswer(questionId: string, value: string) {
    dispatch({ type: "SET_QUIZ_ANSWER", questionId, value });
  }

  const questionConfig = QUESTION_STEPS.find((config) => config.id === step);

  let stepContent: ReactNode = null;
  let stepKey: string = step;

  if (step === "intro") {
    stepContent = <IntroStep onDone={() => dispatch({ type: "NEXT" })} />;
  } else if (questionConfig) {
    stepContent = (
      <QuestionStep
        config={questionConfig}
        selected={state.hairContext[questionConfig.key]}
        onSelect={(value) => handleHairAnswer(questionConfig.key, value)}
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
  } else if (step === "quiz") {
    stepKey = `quiz-${state.quizIndex}-${state.showInterstitial}`;
    stepContent = (
      <QuizStep
        questions={state.quizQuestions}
        quizIndex={state.quizIndex}
        quizAnswers={state.quizAnswers}
        showInterstitial={state.showInterstitial}
        onAnswer={handleQuizAnswer}
        onDismissInterstitial={() => dispatch({ type: "DISMISS_INTERSTITIAL" })}
        onBack={() => dispatch({ type: "BACK" })}
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
