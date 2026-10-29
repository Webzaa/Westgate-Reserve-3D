import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { detectDeviceCapability } from "@/lib/capability";

export const fadeUp = {
  hidden: { y: 44, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: { duration: 1.05, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};

export const viewportOnce = { once: true, margin: "-12% 0px" } as const;

interface ParallaxImageProps {
  src: string;
  alt: string;
  className?: string;
  speed?: number;
  testId?: string;
}

// Scroll-linked parallax inside a clipped frame; disabled on LOW tier and
// reduced motion, where it degrades to a plain still image.
export function ParallaxImage({
  src,
  alt,
  className = "",
  speed = 0.09,
  testId,
}: ParallaxImageProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [enabled] = useState(() => detectDeviceCapability().parallax);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [`${-speed * 100}%`, `${speed * 100}%`],
  );

  if (!enabled) {
    return (
      <div className={`pimg ${className}`} ref={ref}>
        <img src={src} alt={alt} loading="lazy" decoding="async" data-testid={testId} />
      </div>
    );
  }

  return (
    <div className={`pimg motion ${className}`} ref={ref}>
      <motion.img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        style={{ y }}
        data-testid={testId}
      />
    </div>
  );
}

// Lightweight section-view tracker hook for analytics milestones.
export function useSectionTracking(event: string) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          import("@/lib/analytics").then((m) => m.track(event));
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [event]);
  return ref;
}
