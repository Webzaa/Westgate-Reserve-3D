import { useEffect, useMemo, useRef, useState } from "react";
import { detectDeviceCapability } from "@/lib/capability";
import { LeadForm } from "@/components/LeadForm";
import { scrollEngine } from "@/lib/scrollEngine";
import { enquiry } from "@/lib/enquiry";
import {
  ENDING_HOLD_VH,
  ENDING_LERP,
  ENDING_MAX_SHARE,
  ENDING_VH,
  FRAME_COUNT,
  FPS,
  JOURNEY_VH_DESKTOP,
  JOURNEY_VH_MOBILE,
  MIN_SEEK_DELTA,
  POSTER,
  VIDEO_LERP,
} from "@/lib/perf";

const chapters = [
  {
    at: 50 / FRAME_COUNT,
    label: "01 · Horizon",
    title: "A COMMANDING SWEEP OF HORIZONS.",
    text: "Spanning hills, the river and the boundless sky",
  },
  {
    at: 135 / FRAME_COUNT,
    label: "02 · Entrance",
    title: "AN ARRIVAL INTO INSTINCTIVE OPULENCE.",
    text: "Light settles in gently. Space opens like a breath. And home welcomes you here.",
  },
  {
    at: 301 / FRAME_COUNT,
    label: "03 · Residence",
    title: "Excellence Elevated.",
    text: "From living room to bedroom to kitchen, every space reflects the same quiet precision.",
  },
  {
    at: 620 / FRAME_COUNT,
    label: "04 · Clubhouse",
    title: "A CLUB OF ELITE INDULGENCES.",
    text: "A 30,000 sq. ft. clubhouse with a temperature-controlled pool and a private gym.",
  },
  {
    at: 920 / FRAME_COUNT,
    label: "05 · Wellness",
    title: "AN EXPANSE OF RECREATIONAL SPLENDOUR.",
    text: "For the spirit of sport and peace of mind.",
  },
  {
    at: 1255 / FRAME_COUNT,
    label: "06 · Leisure",
    title: "MOMENTS WORTH FRAMING.",
    text: "For poolside serenity and soothing soaks in a heated Jacuzzi.",
  },
  {
    at: 1470 / FRAME_COUNT,
    label: "07 · Elevation",
    title: <>LUXURIOUS <br />4 BHK RESIDENCES.</>,
    text: "55 storeys of spacious living and exclusive privileges.",
  },
];

// Header turns solid cream when the rising wave reaches it.
const HEADER_SOLID_AT = 0.45;

// Doors sequence. The wave still follows the scroll, but the doors are TIME-driven:
// once the wave apex reaches half the screen the doors start and always finish on
// their own, even if the user stops scrolling.
//   wave apex y = 100vh - 145vh * (reveal / .62)  →  half screen at reveal ≈ 0.214
const DOORS_TRIGGER_AT = 0.215;
// Scrolling back above this (after the doors have fully closed) re-opens them.
const DOORS_RELEASE_AT = 0.15;
const DOORS_CLOSE_MS = 1500;
const DOORS_OPEN_MS = 800;
// Form becomes clickable once the doors are (almost) shut.
const DOORS_LIVE_AT = 0.98;
// Header turns solid once the doors are about half way in.
const DOORS_HEADER_AT = 0.45;

function fmt(s: number) {
  s = Math.max(0, s);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

interface Props {
  started: boolean;
  onLoadProgress: (ratio: number) => void;
  onAssetsReady: () => void;
}

export function CinematicJourney({ started, onLoadProgress, onAssetsReady }: Props) {
  const cap = useMemo(detectDeviceCapability, []);
  const renderer = cap.renderer;
  const journeyVh = renderer === "poster" ? 100 : cap.isMobile ? JOURNEY_VH_MOBILE : JOURNEY_VH_DESKTOP;

  const sectionRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const hudRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLElement | null>(null);
  const timeRef = useRef<HTMLSpanElement | null>(null);
  const counterRef = useRef<HTMLSpanElement | null>(null);

  const progressP = useRef(0);
  const endingT = useRef(0);
  const endingS = useRef(0);
  const endingRaf = useRef(0);
  const endingLast = useRef(0);
  const formPhase = useRef<"hidden" | "closing" | "live">("hidden");
  const doorsP = useRef(0);
  const doorsTarget = useRef<0 | 1>(0);
  const doorsRaf = useRef(0);
  const doorsLast = useRef(0);
  const stageInView = useRef(true);
  const videoTargetT = useRef(0);
  const videoRenderedT = useRef(0);
  const seekRaf = useRef(0);
  const lastSeekAt = useRef(0);
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);

  // Video is intentionally used for the cinematic sequence on every device.
  // This avoids decoding hundreds of full-resolution WebP bitmaps into JS memory.
  useEffect(() => {
    if (renderer === "poster") {
      onLoadProgress(1);
      onAssetsReady();
      return;
    }

    const video = videoRef.current;
    if (!video) {
      onLoadProgress(1);
      onAssetsReady();
      return;
    }

    let ready = false;
    let primed = false;
    const onSeeked = () => scheduleSeek();
    video.addEventListener("seeked", onSeeked);

    // Tells the preloader the video is usable. Only called AFTER priming so
    // the preloader stays on top of the brief play/pause and the user never
    // sees the video moving.
    const markReady = () => {
      if (ready) return;
      ready = true;
      onLoadProgress(1);
      onAssetsReady();
      video.currentTime = 0;
    };

    // iOS Safari only paints frames from currentTime after playback has run
    // once. We prime it (muted play, then pause), but we must:
    //  1) pause on the real "playing" event, not on the play() promise, and
    //  2) keep the preloader up until that happens, so the brief playback
    //     on a cold first load is hidden behind it.
    const onPlaying = () => {
      if (primed) return;
      primed = true;
      video.pause();
      markReady();
    };
    // After priming, this video must never play on its own.
    const onPlay = () => {
      if (primed) video.pause();
    };
    video.addEventListener("playing", onPlaying);
    video.addEventListener("play", onPlay);

    const primeVideo = () => {
      if (primed) return;
      video.muted = true; // React's `muted` prop doesn't always set the DOM property
      const p = video.play();
      if (p && typeof p.catch === "function") {
        // Autoplay blocked (e.g. Low Power Mode): don't hang the preloader.
        p.catch(() => markReady());
      }
    };

    // Call play() immediately (as before): iOS won't buffer the video until
    // play() is requested, so waiting for "canplay" first would hang forever.
    primeVideo();

    // If priming is slow, still release the preloader; the "playing" handler
    // above will pause the video whenever playback finally starts.
    const fallback = window.setTimeout(markReady, 6000);
    return () => {
      window.clearTimeout(fallback);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("play", onPlay);
    };
  }, [renderer, onAssetsReady, onLoadProgress]);

  const seekVideo = () => {
    seekRaf.current = 0;
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;

    const now = performance.now();

    // One seek at a time. On a weak decoder (most Android phones) a seek can
    // take well over 28ms to actually finish; re-seeking before it finishes
    // cancels the in-flight decode and starts over, so the frame never lands
    // and the picture appears to freeze/stall while you scroll. Wait for the
    // "seeked" event (below) to ask for the next frame; the 500ms guard just
    // stops a lost/never-fired event from blocking seeks forever.
    if (video.seeking && now - lastSeekAt.current < 500) return;

    const target = videoTargetT.current;
    if (Math.abs(video.currentTime - target) >= MIN_SEEK_DELTA) {
      video.currentTime = target;
      lastSeekAt.current = now;
    }
  };

  const scheduleSeek = () => {
    if (!seekRaf.current) seekRaf.current = requestAnimationFrame(seekVideo);
  };

  useEffect(() => {
    if (renderer === "poster") return;

    // Writes the eased reveal value to CSS and updates who can interact with the
    // in-journey form. Cheap: one custom property + (rarely) one attribute.
    // Writes the time-driven doors progress (0 → 1) and who can interact with the form.
    const applyDoors = () => {
      const d = doorsP.current;
      stageRef.current?.style.setProperty("--doors", d.toFixed(4));

      // hidden  → doors not started: form is off-screen, not focusable/clickable
      // closing → doors are moving: visible, but not yet interactive
      // live    → doors are shut: form is fully interactive
      const phase = d >= DOORS_LIVE_AT ? "live" : d > 0 || doorsTarget.current === 1 ? "closing" : "hidden";
      if (phase !== formPhase.current) {
        formPhase.current = phase;
        formRef.current?.setAttribute("data-phase", phase);
      }

      enquiry.setInlineFormVisible(doorsTarget.current === 1 && stageInView.current);
      enquiry.setFormReached(d >= DOORS_HEADER_AT || endingS.current >= HEADER_SOLID_AT);
    };

    // Advances the doors by real elapsed time (not scroll). Runs only while moving.
    const doorsTick = (ts: number) => {
      const dt = Math.min(64, ts - (doorsLast.current || ts));
      doorsLast.current = ts;

      const closing = doorsTarget.current === 1;
      const step = dt / (closing ? DOORS_CLOSE_MS : DOORS_OPEN_MS);
      doorsP.current = closing ? Math.min(1, doorsP.current + step) : Math.max(0, doorsP.current - step);

      applyDoors();

      if (doorsP.current !== doorsTarget.current) doorsRaf.current = requestAnimationFrame(doorsTick);
      else {
        doorsRaf.current = 0;
        doorsLast.current = 0;
        // The doors just finished: re-check where the wave is now. If the user
        // scrolled back up while they were closing, they should re-open instead
        // of staying shut over the video until the next scroll event.
        updateDoorsTarget();
      }
    };

    const startDoors = () => {
      if (!doorsRaf.current) doorsRaf.current = requestAnimationFrame(doorsTick);
    };

    // Decides when the doors start / re-open, based on where the wave is.
    // Closing is committed: once started it runs to the end whatever the scroll does.
    // Re-opening only happens after the doors are fully shut and the user is back
    // above DOORS_RELEASE_AT (this one may be interrupted by scrolling down again).
    const updateDoorsTarget = () => {
      const s = endingS.current;
      if (doorsTarget.current === 0) {
        if (s >= DOORS_TRIGGER_AT && stageInView.current) {
          doorsTarget.current = 1;
          startDoors();
        }
      } else if (doorsP.current >= 1 && s <= DOORS_RELEASE_AT) {
        doorsTarget.current = 0;
        startDoors();
      }
    };

    const applyReveal = () => {
      stageRef.current?.style.setProperty("--reveal", endingS.current.toFixed(4));
      updateDoorsTarget();
      applyDoors();
    };

    // Eases the reveal toward its scroll-driven target so the wave rises and the
    // doors close as a smooth animation, even when the user flicks the wheel/touch.
    // The loop only runs while the value is still travelling.
    const easeTick = (ts: number) => {
      const dt = Math.min(64, ts - (endingLast.current || ts));
      endingLast.current = ts;
      const k = 1 - Math.pow(1 - ENDING_LERP, dt / 16.667);
      const diff = endingT.current - endingS.current;

      if (Math.abs(diff) < 0.0006) endingS.current = endingT.current;
      else endingS.current += diff * k;

      applyReveal();

      if (endingS.current !== endingT.current) endingRaf.current = requestAnimationFrame(easeTick);
      else {
        endingRaf.current = 0;
        endingLast.current = 0;
      }
    };

    let firstCompute = true;

    const compute = () => {
      const el = sectionRef.current;
      if (!el) return;

      const vh = window.innerHeight;
      const total = Math.max(1, el.offsetHeight - vh);
      const holdPx = (ENDING_HOLD_VH / 100) * vh;
      const endingPx = Math.min(total * ENDING_MAX_SHARE, (ENDING_VH / 100) * vh);
      const videoScrollable = Math.max(1, total - endingPx - holdPx);
      const rawScrolled = window.scrollY - el.offsetTop;
      const scrolled = Math.max(0, Math.min(total, rawScrolled));

      const p = scrolled <= videoScrollable ? scrolled / videoScrollable : 1;
      const endingP = scrolled <= videoScrollable ? 0 : Math.min(1, (scrolled - videoScrollable) / endingPx);

      progressP.current = p;
      endingT.current = endingP;
      stageInView.current = rawScrolled <= total + vh * 0.35;

      const video = videoRef.current;
      if (video && Number.isFinite(video.duration) && video.duration > 0) {
        videoTargetT.current = p * video.duration;
        scheduleSeek();
      }

      heroRef.current?.classList.toggle("hide", p > 0.022);
      hudRef.current?.classList.toggle("hide", endingP > 0.02);

      let a = 0;
      for (let i = 0; i < chapters.length; i++) {
        if (p >= chapters[i].at) a = i + 1;
        else break;
      }

      if (a !== activeRef.current) {
        activeRef.current = a;
        setActive(a);
        if (counterRef.current) {
          counterRef.current.textContent =
            `${String(Math.max(1, a)).padStart(2, "0")} / ${String(chapters.length).padStart(2, "0")}`;
        }
      }

      // Reveal follows the target with easing (see easeTick). On the very first
      // pass (e.g. a reload mid-page) jump straight to the target instead.
      if (firstCompute) {
        firstCompute = false;
        endingS.current = endingT.current;
        if (endingS.current >= DOORS_TRIGGER_AT) {
          doorsTarget.current = 1;
          doorsP.current = 1;
        }
        applyReveal();
      } else if (endingS.current !== endingT.current && !endingRaf.current) {
        endingRaf.current = requestAnimationFrame(easeTick);
      } else {
        applyReveal();
      }

      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
      if (timeRef.current) timeRef.current.textContent = fmt(videoRef.current?.currentTime ?? 0);
    };

    const unsub = scrollEngine.subscribe(compute);
    const onResize = () => compute();
    window.addEventListener("resize", onResize, { passive: true });
    compute();

    return () => {
      unsub();
      window.removeEventListener("resize", onResize);
      if (seekRaf.current) cancelAnimationFrame(seekRaf.current);
      if (endingRaf.current) cancelAnimationFrame(endingRaf.current);
      endingRaf.current = 0;
      if (doorsRaf.current) cancelAnimationFrame(doorsRaf.current);
      doorsRaf.current = 0;
      enquiry.setInlineFormVisible(false);
      enquiry.setFormReached(false);
    };
  }, [renderer]);

  return (
    <section
      ref={sectionRef}
      className="journey"
      style={{ height: `${journeyVh + (renderer === "poster" ? 0 : ENDING_VH + ENDING_HOLD_VH)}vh` }}
      aria-label="A cinematic journey through Hiranandani Westgate"
      data-testid="cinematic-journey"
    >
      <div className="stage" ref={stageRef}>
        {renderer === "video" && (
          <video
            ref={videoRef}
            className="journey-video"
            src={cap.videoSrc}
            poster={POSTER}
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            aria-hidden="true"
            data-testid="journey-video"
            webkit-playsinline="true"
            x5-playsinline="true"
            controls={false}
            disableRemotePlayback
          />
        )}
        {renderer === "poster" && (
          <img
            className="journey-poster"
            src={POSTER}
            alt="Hiranandani Westgate towers rising above the Thane skyline at dusk"
            data-testid="journey-poster"
          />
        )}

        <div className="shade" />
        <div className="vignette" />

        <div className={`hero-copy ${started ? "on" : ""}`} ref={heroRef} data-testid="hero-copy">
          <h1>
            <span className="mask"><span className="line">LIVING EXCELLENCE</span></span>
            <span className="mask"><span className="line d1 sub">IN A CLASS RESERVED FOR FEW</span></span>
          </h1>
          <div className="enter">Scroll to enter <b /></div>
        </div>

        {renderer !== "poster" && chapters.map((c, i) => (
          <div key={c.label} className={`chapter ${i % 2 ? "right" : ""} ${active === i + 1 ? "active" : ""}`} data-testid={`chapter-${i + 1}`}>
            {/*<div className="num">{c.label}</div>*/}
            <h2>{c.title}</h2>
            <p>{c.text}</p>
          </div>
        ))}

        {renderer !== "poster" && (
          <div className="journey-hud" ref={hudRef} aria-hidden="true">
            <div className="progress"><i ref={barRef} /></div>
          </div>
        )}

        {renderer !== "poster" && (
          <div className="cinematic-form" ref={formRef} data-phase="hidden" aria-label="Westgate enquiry form">
            <div className="wave-mask" aria-hidden="true" />
            <div className="form-doors">
              <LeadForm />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}