import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { runWhenIdle } from "../lib/runWhenIdle";
import "../styles/intro.css";

/** 200ms pause before pan starts + 2000ms pan duration = 2200ms total */
const PAN_START_DELAY_MS = 200;
const PAN_COMPLETE_MS = 2_200;

function getIsMobile(): boolean {
  return typeof window !== "undefined" && window.innerWidth < 768;
}

export interface IntroScreenProps {
  readonly onComplete: () => void;
  readonly onPrefetch: () => void;
}

export default function IntroScreen({
  onComplete,
  onPrefetch,
}: IntroScreenProps) {
  const completed = useRef(false);
  const firstWordRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  // Initialize phase based on reduced motion preference — no setState in effect
  const [phase, setPhase] = useState<"initial" | "panning">("initial");
  const [isMobile, setIsMobile] = useState(getIsMobile);
  const [panBounds, setPanBounds] = useState<{
    readonly endX: number;
    readonly startX: number;
  } | null>(null);

  useLayoutEffect(() => {
    let cancelled = false;

    function measurePanBounds() {
      const firstWord = firstWordRef.current;
      const title = titleRef.current;

      if (!firstWord || !title) return;

      const firstWordWidth = firstWord.getBoundingClientRect().width;
      const titleWidth = title.getBoundingClientRect().width;

      if (firstWordWidth <= 0 || titleWidth <= 0) return;

      setPanBounds({
        endX: -titleWidth,
        startX: window.innerWidth - firstWordWidth / 2,
      });
    }

    measurePanBounds();
    window.addEventListener("resize", measurePanBounds);

    if ("fonts" in document) {
      void document.fonts.ready.then(() => {
        if (!cancelled) {
          measurePanBounds();
        }
      });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("resize", measurePanBounds);
    };
  }, [isMobile]);

  useEffect(() => {
    const idleHandle = runWhenIdle(onPrefetch, 0);

    // Resize listener for mobile detection
    const handleResize = () => {
      setIsMobile(getIsMobile());
    };
    window.addEventListener("resize", handleResize);

      // Already in "panning" phase from initial state — just schedule completion
    // Phase 1 -> Phase 2: Start horizontal pan after short delay
    const panTimer = window.setTimeout(() => {
      setPhase("panning");
    }, PAN_START_DELAY_MS);

    // Trigger page swipe when pan finishes
    const completeTimer = window.setTimeout(() => {
      if (!completed.current) {
        completed.current = true;
        onComplete();
      }
    }, PAN_COMPLETE_MS);

    return () => {
      idleHandle.cancel();
      window.removeEventListener("resize", handleResize);
      window.clearTimeout(panTimer);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete, onPrefetch]);

  function finishIntro() {
    if (completed.current) return;
    completed.current = true;
    onComplete();
  }

  const titleTranslateX =
    phase === "initial"
      ? (panBounds?.startX ?? window.innerWidth)
      : (panBounds?.endX ?? -window.innerWidth);

  return (
    <main
      aria-label="HH Goa Builder ID introduction"
      className="intro-screen"
      onClick={finishIntro}
    >
      {/* Container for Giant Typography Pan Motion */}
      <div className="intro-pan-container">
        {/* Animated Title Text Element */}
        <div
          ref={titleRef}
          className="intro-title-element"
          style={{
            fontSize: isMobile ? "88px" : "250px",
            lineHeight: isMobile ? "88px" : "250px",
            transitionDuration: phase === "initial" ? "0ms" : "2000ms",
            transform: `translate3d(${String(titleTranslateX)}px, -50%, 0)`,
            visibility: panBounds ? "visible" : "hidden",
          }}
        >
          <h1 className="intro-title-text">
            <span ref={firstWordRef} className="intro-offwhite">
              LET&apos;S
            </span>{" "}
            <span className="intro-yellow">MAKE YOUR ID CARD</span>
          </h1>
        </div>
      </div>

    </main>
  );
}
