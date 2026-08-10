"use client";

import React, { useEffect, useRef } from "react";

const SPECS = [
  { label: "Construction", value: "Pill + two apertures" },
  { label: "Aperture ratio", value: "0.53 of cap height" },
  { label: "Minimum size", value: "24 px wide" },
  { label: "Colour", value: "One colour, either polarity" },
];

export function IdentitySection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftPupilRef = useRef<SVGCircleElement>(null);
  const rightPupilRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    const MAX_OFFSET = 18;

    const handleMouseMove = (event: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const centreX = rect.left + rect.width / 2;
      const centreY = rect.top + rect.height / 2;

      const dx = event.clientX - centreX;
      const dy = event.clientY - centreY;
      const distance = Math.hypot(dx, dy) || 1;
      const clamped = Math.min(distance, MAX_OFFSET * 12) / (MAX_OFFSET * 12);

      target.x = (dx / distance) * MAX_OFFSET * clamped;
      target.y = (dy / distance) * MAX_OFFSET * clamped;
    };

    let frame = 0;

    const render = () => {
      current.x += (target.x - current.x) * 0.12;
      current.y += (target.y - current.y) * 0.12;

      const transform = `translate(${current.x.toFixed(2)}, ${current.y.toFixed(2)})`;

      if (leftPupilRef.current) {
        leftPupilRef.current.setAttribute("transform", transform);
      }
      if (rightPupilRef.current) {
        rightPupilRef.current.setAttribute("transform", transform);
      }

      frame = requestAnimationFrame(render);
    };

    window.addEventListener("mousemove", handleMouseMove);
    frame = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section
      id="identity"
      className="scroll-mt-28 py-24 md:py-32 px-6 md:px-12 max-w-[1700px] mx-auto border-t border-border-custom"
    >
      <span className="text-xs font-mono font-bold uppercase tracking-widest text-foreground-secondary block mb-6">
        03 / Identity
      </span>

      <h2 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tighter uppercase text-foreground leading-[0.95] max-w-4xl">
        The mark
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 mt-16 items-center">
        {/* Blueprint */}
        <div
          ref={containerRef}
          className="lg:col-span-7 p-10 md:p-16 rounded-none bg-surface-card border border-border-custom flex items-center justify-center"
        >
          <svg
            viewBox="0 0 360 185"
            className="w-full max-w-[340px] h-auto"
            role="img"
            aria-label="The LOOMIE mark: a pill containing two apertures that follow the cursor"
          >
            <rect
              x="10"
              y="8"
              width="340"
              height="170"
              rx="85"
              className="fill-foreground"
            />
            <circle
              ref={leftPupilRef}
              cx="117"
              cy="93"
              r="45"
              className="fill-background"
            />
            <circle
              ref={rightPupilRef}
              cx="243"
              cy="93"
              r="45"
              className="fill-background"
            />
          </svg>
        </div>

        {/* Specs */}
        <div className="lg:col-span-5">
          <p className="text-base sm:text-lg text-foreground-secondary leading-relaxed mb-10 max-w-xl">
            Two apertures in a rounded field. It reads as a pair of eyes at
            large sizes and as a single solid shape at small ones, which is the
            only test a mark really has to pass.
          </p>

          <dl className="border-t border-border-custom">
            {SPECS.map((spec) => (
              <div
                key={spec.label}
                className="py-5 border-b border-border-custom flex items-baseline justify-between gap-6 font-mono text-xs uppercase tracking-widest"
              >
                <dt className="text-foreground-secondary">{spec.label}</dt>
                <dd className="text-foreground font-bold text-right">
                  {spec.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
