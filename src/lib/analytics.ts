// Batched analytics. Sink is intentionally a no-op console channel (MOCKED)
// until a real collector is wired — batching/throttling are production-shaped.
import { scrollEngine } from "./scrollEngine";

interface AnalyticsEvent {
  name: string;
  data?: Record<string, unknown>;
  ts: number;
}

const queue: AnalyticsEvent[] = [];
let flushTimer: number | null = null;

function flush() {
  flushTimer = null;
  if (queue.length === 0) return;
  const batch = queue.splice(0, queue.length);
  if (import.meta.env.DEV || location.search.includes("debug")) {
    console.info(
      "[analytics]",
      batch.map((e) => e.name).join(", "),
      batch,
    );
  }
}

function scheduleFlush() {
  if (flushTimer === null) {
    flushTimer = window.setTimeout(flush, 4000);
  }
}

export function track(name: string, data?: Record<string, unknown>) {
  queue.push({ name, data, ts: Date.now() });
  scheduleFlush();
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

// Fires 25/50/75/100 percent scroll milestones exactly once each.
export function trackScrollMilestones() {
  const fired = new Set<number>();
  return scrollEngine.subscribe(() => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    if (max <= 0) return;
    const pct = (window.scrollY / max) * 100;
    for (const m of [25, 50, 75, 100]) {
      if (pct >= m && !fired.has(m)) {
        fired.add(m);
        track(`${m}_percent_scroll`);
      }
    }
  });
}

// Fires `event` once when the element enters the viewport.
export function trackViewOnce(el: Element | null, event: string) {
  if (!el) return;
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        track(event);
        io.disconnect();
      }
    },
    { threshold: 0.25 },
  );
  io.observe(el);
}
