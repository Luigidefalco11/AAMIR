"use client";

import { useRef, useEffect } from "react";
import { Tilt3D } from "./Tilt3D";
import { Reveal } from "./Reveal";
import { prefersReducedMotion } from "@/lib/motion";

export function CraftSection({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !prefersReducedMotion()) return;
    video.pause();
    video.removeAttribute("loop");
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-6 mt-28 grid md:grid-cols-2 gap-10 items-center">
      <Reveal>
        <Tilt3D
          className="relative aspect-[9/16] w-full max-w-sm mx-auto overflow-hidden"
          amount={8}
        >
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            poster="/videos/lavorazione-poster.jpg"
            className="absolute inset-0 h-full w-full object-cover"
            preload="metadata"
          >
            <source src="/videos/lavorazione.mp4" type="video/mp4" />
          </video>
        </Tilt3D>
      </Reveal>
      <Reveal delay={0.15}>
        <div>
          <h2 className="font-serif text-3xl mb-4">{title}</h2>
          <p className="text-lg text-[color:var(--color-text)]/80 max-w-md">{text}</p>
        </div>
      </Reveal>
    </section>
  );
}
