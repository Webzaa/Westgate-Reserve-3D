// Central performance budget + asset manifest constants.
export const FRAME_COUNT = 1690;
export const FPS = 30;
export const VIDEO_DESKTOP = `${import.meta.env.BASE_URL}video/westgate-desktop.mp4`;
export const VIDEO_MOBILE = `${import.meta.env.BASE_URL}video/westgate-mobile.mp4`;
export const VIDEO_MOBILE_LOW = `${import.meta.env.BASE_URL}video/westgate-mobile.mp4`;
export const POSTER = `${import.meta.env.BASE_URL}images/cinematic-poster-full.webp`;

export const LOADER_MIN_MS = 1400;

export const JOURNEY_VH_DESKTOP = 3200;
export const JOURNEY_VH_MOBILE = 2200;
// Scroll length of the wave + doors "form reveal" at the end of the journey.
export const ENDING_VH = 70;
// After the reveal completes the stage stays pinned for this much extra scroll,
// so the form sits still full-screen instead of sliding away on the next wheel tick.
export const ENDING_HOLD_VH = 30;
export const ENDING_MAX_SHARE = 0.35;

export const MIN_SEEK_DELTA = 0.015;
export const VIDEO_LERP = 0.25;
export const FRAME_LERP = 0.12;
export const ENDING_LERP = 0.12;
// Above this many frames of lag, skip straight to the target instead of
// easing through every intermediate frame (fast scrolls).
export const FRAME_SNAP_DISTANCE = 48;

export const CRITICAL_FRAMES = 40;
export const NEAREST_FRAME_SEARCH = 60;

export const MOBILE_BREAKPOINT = 820;

