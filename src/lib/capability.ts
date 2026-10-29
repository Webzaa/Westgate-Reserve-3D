import {
  MOBILE_BREAKPOINT,
  VIDEO_DESKTOP,
  VIDEO_MOBILE,
  VIDEO_MOBILE_LOW,
} from "./perf";

export type DeviceTier = "LOW" | "MEDIUM" | "HIGH" | "DESKTOP_HIGH";
export type Renderer = "video" | "poster";

export interface Capability {
  tier: DeviceTier;
  isMobile: boolean;
  reducedMotion: boolean;
  saveData: boolean;
  effectiveType: string;
  dpr: number;
  dprCap: number;
  webgl: boolean;
  renderer: Renderer;
  videoSrc: string;
  parallax: boolean;
}

interface ConnectionLike {
  effectiveType?: string;
  saveData?: boolean;
}

let cached: Capability | null = null;

function getTier(isMobile: boolean, slowNet: boolean, cores: number, memory: number): DeviceTier {
  if (slowNet || cores <= 2 || memory <= 2) return "LOW";
  if (isMobile) {
    if (cores >= 8 && memory >= 6) return "HIGH";
    return "MEDIUM";
  }
  if (cores >= 8 && memory >= 8) return "DESKTOP_HIGH";
  if (cores >= 6 || memory >= 8) return "HIGH";
  return "MEDIUM";
}

export function detectDeviceCapability(): Capability {
  if (cached) return cached;

  const nav = navigator;
  const conn = (nav as Navigator & { connection?: ConnectionLike }).connection;
  const effectiveType = conn?.effectiveType ?? "4g";
  const saveData = Boolean(conn?.saveData);
  const slowNet = saveData || effectiveType === "2g" || effectiveType === "slow-2g";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile =
    window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches ||
    /Mobi|Android|iPhone|iPad/i.test(nav.userAgent);

  const cores = nav.hardwareConcurrency || 4;
  const memory = (nav as Navigator & { deviceMemory?: number }).deviceMemory || 4;
  const dpr = window.devicePixelRatio || 1;
  const tier = getTier(isMobile, slowNet, cores, memory);

  cached = {
    tier,
    isMobile,
    reducedMotion,
    saveData,
    effectiveType,
    dpr,
    dprCap: tier === "DESKTOP_HIGH" ? 1.25 : 1,
    webgl: false,
    renderer: reducedMotion ? "poster" : "video",
    videoSrc: isMobile
      ? (slowNet || tier === "LOW" ? VIDEO_MOBILE_LOW : VIDEO_MOBILE)
      : VIDEO_DESKTOP,
    parallax: !reducedMotion && tier !== "LOW",
  };

  return cached;
}
