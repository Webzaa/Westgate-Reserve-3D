import { useEffect, useRef, useState } from "react";
import { LOADER_MIN_MS } from "@/lib/perf";

interface Props {
  progress: number; // 0..1 real asset readiness
  assetsReady: boolean;
  onDone: () => void;
}

// Premium 4.5s-minimum loader. The bar reflects BOTH elapsed time and real
// asset readiness — whichever is slower — so no device waits for assets it
// was never going to need.
export function Preloader({ progress, assetsReady, onDone }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const t0 = performance.now();
    const id = window.setInterval(
      () => setElapsed(performance.now() - t0),
      100,
    );
    return () => {
      window.clearInterval(id);
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (doneRef.current) return;
    if (assetsReady && elapsed >= LOADER_MIN_MS) {
      doneRef.current = true;
      setLeaving(true);
      document.body.style.overflow = "";
    }
  }, [assetsReady, elapsed]);

  useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(() => {
      setGone(true);
      onDone();
    }, 1150);
    return () => window.clearTimeout(t);
  }, [leaving, onDone]);

  if (gone) return null;

  const shown = Math.min(progress, elapsed / LOADER_MIN_MS);
  const pct = Math.round(shown * 100);

  return (
    <div
      className={`preloader ${leaving ? "leaving" : ""}`}
      role="status"
      aria-label="Loading the Westgate experience"
      data-testid="preloader"
    >
      <div>
        <div className="pre-title" aria-hidden="true">
          <img className="loader-logo" src="./images/logo.png" alt="Westgate Reserve" title="Westgate Reserve" />
        </div>
        &nbsp;
        <div className="pre-line">
          <i style={{ width: `${shown * 100}%` }} />
        </div>
        <div className="pre-meta">
          <span className="pre-sub" data-testid="preloader-tier">Preparing the cinematic journey</span>
          <span data-testid="preloader-progress">{pct}%</span>
        </div>
      </div>
    </div>
  );
}
