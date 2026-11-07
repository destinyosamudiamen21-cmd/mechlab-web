import { useEffect, useRef, useState } from "react";

// A play/pause clock for animated widgets: while running, calls onTick with the
// seconds since the last frame. Stops for people who ask for reduced motion.
export function useClock(onTick: (dt: number) => void) {
  const [running, setRunning] = useState(false);
  const tickRef = useRef(onTick);
  useEffect(() => {
    tickRef.current = onTick;
  });

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      // Cap the step so a background tab does not jump when it comes back.
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      tickRef.current(dt);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return { running, setRunning, reducedMotion };
}
