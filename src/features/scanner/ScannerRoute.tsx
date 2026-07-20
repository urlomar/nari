import { useEffect, useReducer, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useBlocker, useNavigate } from "react-router-dom";
import { track } from "@/lib/analytics";
import { analyzeHair } from "@/lib/analyzeHair";
import { compressImage } from "@/lib/compressImage";
import { ScanDataSchema, type HairAnalysis, type ScanAnswers, type ScanPhotos } from "@/lib/schemas";
import { fadeUp } from "@/styles/motionVariants";
import { PhotoStep } from "./steps/PhotoStep";
import { QuestionStep } from "./steps/QuestionStep";
import { ConfirmationStep } from "./steps/ConfirmationStep";
import { AnalyzingStep } from "./steps/AnalyzingStep";
import { WelcomeStep } from "./steps/WelcomeStep";
import { initialScannerState, scannerReducer } from "./scannerReducer";
import { PHOTO_STEPS, QUESTION_STEPS, STEP_ORDER } from "./steps";
import { usePhotoPreviews } from "./usePhotoPreviews";
import s from "./scanner.module.css";

const ANSWER_ADVANCE_DELAY_MS = 250;

export default function ScannerRoute() {
  const [state, dispatch] = useReducer(scannerReducer, initialScannerState);
  const [compressingKey, setCompressingKey] = useState<keyof ScanPhotos | null>(null);
  const navigate = useNavigate();
  const previews = usePhotoPreviews(state.photos);

  const step = STEP_ORDER[state.stepIndex];
  const hasProgress = Boolean(state.photos.front || state.photos.back || state.photos.strand);

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
    const confirmed = window.confirm("Leave your scan? Your photos will be discarded.");
    if (confirmed) blocker.proceed();
    else blocker.reset();
  }, [blocker]);

  useEffect(() => {
    if (step !== "analyzing") return;
    let cancelled = false;

    (async () => {
      const parsed = ScanDataSchema.safeParse({ photos: state.photos, answers: state.answers });
      if (!parsed.success) {
        dispatch({
          type: "ANALYSIS_FAILED",
          message: "Something's missing from your scan. Please review your photos and answers.",
        });
        return;
      }
      try {
        const analysis: HairAnalysis = await analyzeHair(parsed.data);
        if (cancelled) return;
        track("scan_completed");
        navigate("/scan/results", { state: { analysis }, replace: true });
      } catch {
        if (!cancelled) {
          dispatch({ type: "ANALYSIS_FAILED", message: "We couldn't analyze your photos. Please try again." });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, state.analysisAttempt]);

  async function handleCapture(key: keyof ScanPhotos, file: File) {
    setCompressingKey(key);
    try {
      const compressed = await compressImage(file);
      dispatch({ type: "SET_PHOTO", key, file: compressed });
    } finally {
      setCompressingKey(null);
    }
  }

  function handleAnswerSelect(key: keyof ScanAnswers, value: string) {
    dispatch({ type: "SET_ANSWER", key, value: value as NonNullable<ScanAnswers[keyof ScanAnswers]> });
    window.setTimeout(() => dispatch({ type: "NEXT" }), ANSWER_ADVANCE_DELAY_MS);
  }

  function handleStart() {
    track("scan_started");
    dispatch({ type: "NEXT" });
  }

  const photoConfig = PHOTO_STEPS.find((config) => config.id === step);
  const questionConfig = QUESTION_STEPS.find((config) => config.id === step);

  let stepContent: ReactNode = null;
  if (step === "welcome") {
    stepContent = <WelcomeStep onStart={handleStart} />;
  } else if (photoConfig) {
    const index = PHOTO_STEPS.indexOf(photoConfig);
    stepContent = (
      <PhotoStep
        config={photoConfig}
        stepNumber={index + 1}
        totalSteps={PHOTO_STEPS.length}
        file={state.photos[photoConfig.key]}
        previewUrl={previews[photoConfig.key]}
        compressing={compressingKey === photoConfig.key}
        onCapture={(file) => handleCapture(photoConfig.key, file)}
        onRetake={() => dispatch({ type: "CLEAR_PHOTO", key: photoConfig.key })}
        onBack={() => dispatch({ type: "BACK" })}
        onNext={() => dispatch({ type: "NEXT" })}
      />
    );
  } else if (questionConfig) {
    stepContent = (
      <QuestionStep
        config={questionConfig}
        selected={state.answers[questionConfig.key]}
        onSelect={(value) => handleAnswerSelect(questionConfig.key, value)}
        onBack={() => dispatch({ type: "BACK" })}
      />
    );
  } else if (step === "confirmation") {
    stepContent = (
      <ConfirmationStep
        previews={previews}
        answers={state.answers}
        onEditPhoto={(stepId) => dispatch({ type: "GOTO", step: stepId, returnTo: "confirmation" })}
        onEditAnswer={(stepId) => dispatch({ type: "GOTO", step: stepId, returnTo: "confirmation" })}
        onBack={() => dispatch({ type: "BACK" })}
        onConfirm={() => dispatch({ type: "NEXT" })}
      />
    );
  } else if (step === "analyzing") {
    stepContent = (
      <AnalyzingStep error={state.analysisError} onRetry={() => dispatch({ type: "RETRY_ANALYSIS" })} />
    );
  }

  return (
    <div className={s.screen}>
      <AnimatePresence mode="wait">
        <motion.div key={step} initial="hidden" animate="visible" exit="hidden" variants={fadeUp}>
          {stepContent}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
