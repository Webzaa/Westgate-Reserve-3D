// One centralized scroll controller: a single passive listener + one RAF
// scheduler. Components subscribe; nobody attaches their own listener.
export interface ScrollState {
  y: number;
  velocity: number; // px per second, smoothed
  direction: 1 | -1 | 0;
}

type Listener = (s: ScrollState) => void;

class ScrollEngine {
  private listeners = new Set<Listener>();
  private raf = 0;
  private lastY = 0;
  private lastTs = 0;
  private velocity = 0;
  private attached = false;

  readonly state: ScrollState = { y: 0, velocity: 0, direction: 0 };

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    this.attach();
    // Emit current position immediately so late subscribers settle.
    l(this.state);
    return () => {
      this.listeners.delete(l);
      if (this.listeners.size === 0) this.detach();
    };
  }

  private attach() {
    if (this.attached) return;
    this.attached = true;
    this.lastY = window.scrollY;
    this.lastTs = performance.now();
    this.state.y = this.lastY;
    window.addEventListener("scroll", this.onScroll, { passive: true });
    window.addEventListener("resize", this.onScroll, { passive: true });
  }

  private detach() {
    this.attached = false;
    window.removeEventListener("scroll", this.onScroll);
    window.removeEventListener("resize", this.onScroll);
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private onScroll = () => {
    if (!this.raf) this.raf = requestAnimationFrame(this.tick);
  };

  private tick = () => {
    this.raf = 0;
    const now = performance.now();
    const y = window.scrollY;
    const dt = Math.max(1, now - this.lastTs);
    const instant = ((y - this.lastY) / dt) * 1000;
    this.velocity = this.velocity * 0.7 + instant * 0.3;
    this.state.y = y;
    this.state.velocity = this.velocity;
    this.state.direction = y > this.lastY ? 1 : y < this.lastY ? -1 : 0;
    this.lastY = y;
    this.lastTs = now;
    this.listeners.forEach((l) => l(this.state));
  };
}

export const scrollEngine = new ScrollEngine();
