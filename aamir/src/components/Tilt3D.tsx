"use client";

import { useRef, useEffect, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger);

/**
 * Real 3D rotation tied to scroll position, plus a mouse-follow tilt.
 * `amount`'s sign sets the rotation direction — alternate it across siblings
 * (e.g. a product grid) so neighbouring elements don't move in lockstep.
 * Disabled under prefers-reduced-motion.
 */
export function Tilt3D({
  children,
  className,
  amount = 12,
}: {
  children: ReactNode;
  className?: string;
  /** Peak rotation in degrees; sign sets direction. */
  amount?: number;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const inner = innerRef.current;
    if (!stage || !inner || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        inner,
        { rotateY: -amount, rotateX: amount / 3 },
        {
          rotateY: amount,
          rotateX: -amount / 3,
          ease: "none",
          scrollTrigger: {
            trigger: stage,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.6,
          },
        },
      );
    }, stage);

    const handleMove = (e: MouseEvent) => {
      const rect = stage.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      gsap.to(inner, {
        rotateY: px * amount,
        rotateX: -py * amount,
        duration: 0.5,
        ease: "power2.out",
        overwrite: "auto",
      });
    };
    stage.addEventListener("mousemove", handleMove);

    return () => {
      stage.removeEventListener("mousemove", handleMove);
      ctx.revert();
    };
  }, [amount]);

  return (
    <div ref={stageRef} className={className} style={{ perspective: 1000, position: "relative" }}>
      <div
        ref={innerRef}
        style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", willChange: "transform" }}
      >
        {children}
      </div>
    </div>
  );
}
