"use client";

import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * A 3D card stack that cycles its front card to the back.
 *
 * Adapted rather than pasted. Changes from the supplied component:
 * - rounded-xl / bg-card / border-border become rounded-none /
 *   bg-surface-card / border-border-custom, which are the tokens that exist
 *   in this codebase.
 * - No new dependencies. The original listed framer-motion and lucide-react
 *   in package.json without importing either.
 * - Card refs are collected through callback refs rather than a useMemo keyed
 *   on childArr.length, which React Compiler rejects as a mismatched
 *   dependency.
 * - The interval is typed ReturnType<typeof setInterval> | null rather than
 *   useRef<number>(0), which is wrong under Node types.
 * - No forwardRef. React 19 passes ref as an ordinary prop.
 * - Under reduced motion it renders a static stack with no interval and no
 *   GSAP at all.
 * - The interval is cleared on unmount whether or not pauseOnHover is set.
 * - Cards are keyboard reachable: when onCardClick is set they get button
 *   semantics, tabIndex and Enter/Space handling. Consumers with a URL are
 *   better served by putting a stretched anchor inside the card, which is
 *   what FeaturedWork does.
 * - Below 768px the perspective stack is replaced by a horizontal snap row,
 *   because the 3D stack does not work at phone width.
 */

const EASINGS = {
  elastic: "elastic.out(0.6, 0.9)",
  linear: "power1.inOut",
} as const;

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  ref?: React.Ref<HTMLDivElement>;
}

export function Card({ children, className = "", ...rest }: CardProps) {
  return (
    <div
      {...rest}
      className={`rounded-none bg-surface-card border border-border-custom overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}

interface CardSwapProps {
  children: React.ReactNode;
  cardDistance?: number;
  verticalDistance?: number;
  delay?: number;
  pauseOnHover?: boolean;
  skewAmount?: number;
  easing?: keyof typeof EASINGS;
  onCardClick?: (index: number) => void;
}

export function CardSwap({
  children,
  cardDistance = 56,
  verticalDistance = 64,
  delay = 4500,
  pauseOnHover = false,
  skewAmount = 4,
  easing = "elastic",
  onCardClick,
}: CardSwapProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  const cards = React.Children.toArray(
    children
  ) as React.ReactElement<CardProps>[];
  const total = cards.length;

  const stageRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const orderRef = useRef<number[]>([]);
  const pausedRef = useRef({ hover: false, offscreen: false });

  useEffect(() => {
    if (prefersReducedMotion) return;

    const stage = stageRef.current;
    if (!stage || total < 2) return;

    const mm = gsap.matchMedia();

    const ctx = gsap.context(() => {
      mm.add(
        "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
        () => {
          const elements = cardRefs.current.slice(0, total);
          if (elements.some((el) => !el)) return;

          const slotVars = (slot: number) => ({
            x: slot * cardDistance,
            y: -slot * verticalDistance,
            z: -slot * cardDistance * 1.6,
            zIndex: total - slot,
          });

          orderRef.current = elements.map((_, index) => index);

          elements.forEach((el, index) => {
            gsap.set(el, {
              xPercent: -50,
              yPercent: -50,
              transformOrigin: "center center",
              ...slotVars(index),
            });
          });

          const swap = () => {
            const order = orderRef.current;
            const [front, ...rest] = order;
            const frontEl = elements[front];
            if (!frontEl) return;

            const timeline = gsap.timeline();

            // Front card falls away.
            timeline.to(frontEl, {
              y: `+=${verticalDistance * 5}`,
              opacity: 0,
              duration: 0.42,
              ease: "power2.in",
            });

            // The rest step forward one slot each.
            rest.forEach((cardIndex, slot) => {
              timeline.to(
                elements[cardIndex],
                {
                  ...slotVars(slot),
                  duration: 0.62,
                  ease: EASINGS[easing],
                },
                0.22
              );
            });

            // The fallen card reappears at the back of the stack.
            timeline.set(frontEl, {
              ...slotVars(rest.length),
              y: `+=${verticalDistance * 2}`,
              opacity: 0,
            });
            timeline.to(frontEl, {
              ...slotVars(rest.length),
              opacity: 1,
              duration: 0.5,
              ease: EASINGS[easing],
            });

            orderRef.current = [...rest, front];
          };

          const start = () => {
            if (intervalRef.current) return;
            intervalRef.current = setInterval(() => {
              const { hover, offscreen } = pausedRef.current;
              if (hover || offscreen) return;
              swap();
            }, delay);
          };

          const stop = () => {
            if (!intervalRef.current) return;
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          };

          // An animation running off-screen is wasted battery.
          const observer = new IntersectionObserver(
            ([entry]) => {
              pausedRef.current.offscreen = !entry.isIntersecting;
            },
            { threshold: 0.15 }
          );
          observer.observe(stage);

          const onEnter = () => {
            pausedRef.current.hover = true;
          };
          const onLeave = () => {
            pausedRef.current.hover = false;
          };

          if (pauseOnHover) {
            stage.addEventListener("mouseenter", onEnter);
            stage.addEventListener("mouseleave", onLeave);
          }

          start();

          // Cleared here whichever branch above ran, so the interval can never
          // outlive the component.
          return () => {
            stop();
            observer.disconnect();
            if (pauseOnHover) {
              stage.removeEventListener("mouseenter", onEnter);
              stage.removeEventListener("mouseleave", onLeave);
            }
          };
        }
      );
    }, stageRef);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      mm.revert();
      ctx.revert();
    };
  }, [
    prefersReducedMotion,
    total,
    cardDistance,
    verticalDistance,
    delay,
    pauseOnHover,
    easing,
  ]);

  const interactionProps = (index: number) => {
    if (!onCardClick) return {};
    return {
      role: "button",
      tabIndex: 0,
      onClick: () => onCardClick(index),
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onCardClick(index);
        }
      },
    };
  };

  // Static stack: no interval, no GSAP, nothing moving.
  if (prefersReducedMotion) {
    return (
      <div className="flex flex-col gap-6">
        {cards.map((card, index) => (
          <div key={index} {...interactionProps(index)}>
            {card}
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Desktop: the perspective stack. */}
      <div
        ref={stageRef}
        data-cardswap-stack=""
        className="hidden md:block relative h-[420px] lg:h-[460px]"
        style={{ perspective: "1000px" }}
      >
        <div
          className="absolute inset-0"
          style={{ transform: `skewY(${skewAmount}deg)` }}
        >
          {cards.map((card, index) =>
            React.cloneElement(card, {
              key: index,
              ref: (el: HTMLDivElement | null) => {
                cardRefs.current[index] = el;
              },
              className: `${
                card.props.className ?? ""
              } absolute left-1/2 top-1/2 w-[300px] lg:w-[340px]`,
              ...interactionProps(index),
            })
          )}
        </div>
      </div>

      {/* Mobile: a horizontal snap row of the same cards. */}
      <div
        data-cardswap-row=""
        className="md:hidden -mx-6 px-6 flex gap-4 overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {cards.map((card, index) => (
          <div
            key={index}
            className="snap-start shrink-0 w-[78vw] max-w-[320px]"
            {...interactionProps(index)}
          >
            {card}
          </div>
        ))}
      </div>
    </>
  );
}
