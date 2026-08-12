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
 * - The stack is draggable, with a flick carrying inertia, and focusing a card
 *   brings it to the front. Both are in the interaction inventory; neither was
 *   in the supplied component.
 */

const EASINGS = {
  elastic: "elastic.out(0.6, 0.9)",
  linear: "power1.inOut",
} as const;

/** Pixels of drag per card. About half a card's width reads as one throw. */
const DRAG_STEP = 150;
/** Past this much travel the gesture was a drag, and must not also click. */
const DRAG_SLOP = 8;
/** Pixels per millisecond that count as one card of carry. */
const FLICK_PER_CARD = 0.55;
/** However hard it is thrown. Past this it stops reading as a throw. */
const MAX_FLING = 3;

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
  const pausedRef = useRef({ hover: false, offscreen: false, dragging: false });

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

          /**
           * Cards slide between slots. Used for anything the visitor drives
           * directly, where the auto-cycle's fall-away would read as the
           * component answering back rather than following the hand.
           */
          const applyOrder = (order: number[], duration: number) => {
            order.forEach((cardIndex, slot) => {
              gsap.to(elements[cardIndex], {
                ...slotVars(slot),
                opacity: 1,
                duration,
                ease: EASINGS[easing],
                overwrite: "auto",
              });
            });
            orderRef.current = order;
          };

          const step = (direction: 1 | -1) => {
            const order = orderRef.current;
            applyOrder(
              direction === 1
                ? [...order.slice(1), order[0]]
                : [order[order.length - 1], ...order.slice(0, -1)],
              0.42
            );
          };

          /**
           * The keyboard equivalent of the drag. Tabbing to a card that is
           * three deep in the stack would otherwise focus something buried
           * behind two others.
           */
          const bringToFront = (cardIndex: number) => {
            const order = orderRef.current;
            const at = order.indexOf(cardIndex);
            if (at <= 0) return;
            applyOrder([...order.slice(at), ...order.slice(0, at)], 0.45);
          };

          const start = () => {
            if (intervalRef.current) return;
            intervalRef.current = setInterval(() => {
              const { hover, offscreen, dragging } = pausedRef.current;
              if (hover || offscreen || dragging) return;
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

          // ---- drag, with inertia -------------------------------------
          let dragging = false;
          let pointerId = -1;
          let carried = 0;
          let travelled = 0;
          let lastX = 0;
          let lastTime = 0;
          let velocity = 0;
          let fling: ReturnType<typeof setTimeout> | null = null;

          const stopFling = () => {
            if (!fling) return;
            clearTimeout(fling);
            fling = null;
          };

          const onPointerDown = (event: PointerEvent) => {
            if (event.button !== 0) return;
            stopFling();
            gsap.killTweensOf(elements);

            dragging = true;
            pointerId = event.pointerId;
            carried = 0;
            travelled = 0;
            velocity = 0;
            lastX = event.clientX;
            lastTime = event.timeStamp;
            pausedRef.current.dragging = true;
            stage.setPointerCapture(event.pointerId);
          };

          const onPointerMove = (event: PointerEvent) => {
            if (!dragging || event.pointerId !== pointerId) return;

            const dx = event.clientX - lastX;
            const dt = Math.max(event.timeStamp - lastTime, 1);
            lastX = event.clientX;
            lastTime = event.timeStamp;

            // Smoothed, so one stuttering frame cannot decide the throw.
            velocity = velocity * 0.7 + (dx / dt) * 0.3;
            carried += dx;
            travelled += Math.abs(dx);

            while (carried <= -DRAG_STEP) {
              step(1);
              carried += DRAG_STEP;
            }
            while (carried >= DRAG_STEP) {
              step(-1);
              carried -= DRAG_STEP;
            }
          };

          const onPointerUp = (event: PointerEvent) => {
            if (!dragging || event.pointerId !== pointerId) return;
            dragging = false;

            if (stage.hasPointerCapture(pointerId)) {
              stage.releasePointerCapture(pointerId);
            }

            // A drag that ends over a card must not also follow its link.
            //
            // The listener has to be taken back down rather than left to
            // once:true, which only removes itself when it fires: a drag that
            // ends outside a link leaves it armed, and it then eats the next
            // genuine click on a card.
            if (travelled > DRAG_SLOP) {
              const swallow = (click: MouseEvent) => {
                click.preventDefault();
                click.stopPropagation();
              };
              stage.addEventListener("click", swallow, {
                capture: true,
                once: true,
              });
              setTimeout(() => {
                stage.removeEventListener("click", swallow, { capture: true });
              }, 0);
            }

            const direction = velocity < 0 ? 1 : -1;
            let remaining = Math.min(
              Math.floor(Math.abs(velocity) / FLICK_PER_CARD),
              MAX_FLING
            );

            if (remaining <= 0) {
              pausedRef.current.dragging = false;
              return;
            }

            // Inertia: each further card takes longer than the last, so the
            // throw runs down rather than stopping dead.
            let wait = 90;
            const carry = () => {
              step(direction);
              remaining -= 1;

              if (remaining <= 0) {
                fling = null;
                pausedRef.current.dragging = false;
                return;
              }

              wait *= 1.75;
              fling = setTimeout(carry, wait);
            };

            fling = setTimeout(carry, wait);
          };

          /**
           * Every card is covered by a stretched anchor, and a mouse pressed
           * on a link and moved is a native link drag as far as the browser is
           * concerned. It takes over the gesture, fires pointercancel and
           * stops sending pointermove — measured: one move event arrived and
           * then the stream stopped dead. Refusing dragstart hands the gesture
           * back, and unlike preventing pointerdown it leaves clicking and
           * focusing alone.
           */
          const onDragStart = (event: DragEvent) => event.preventDefault();

          const onFocusIn = (event: FocusEvent) => {
            const target = event.target as Node | null;
            if (!target) return;
            const index = elements.findIndex((el) => el?.contains(target));
            if (index >= 0) bringToFront(index);
          };

          stage.addEventListener("pointerdown", onPointerDown);
          stage.addEventListener("pointermove", onPointerMove);
          stage.addEventListener("pointerup", onPointerUp);
          stage.addEventListener("pointercancel", onPointerUp);
          stage.addEventListener("dragstart", onDragStart);
          stage.addEventListener("focusin", onFocusIn);

          start();

          // Cleared here whichever branch above ran, so the interval can never
          // outlive the component.
          return () => {
            stop();
            stopFling();
            observer.disconnect();
            stage.removeEventListener("pointerdown", onPointerDown);
            stage.removeEventListener("pointermove", onPointerMove);
            stage.removeEventListener("pointerup", onPointerUp);
            stage.removeEventListener("pointercancel", onPointerUp);
            stage.removeEventListener("dragstart", onDragStart);
            stage.removeEventListener("focusin", onFocusIn);
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
        className="hidden md:block relative h-[420px] lg:h-[460px] cursor-grab active:cursor-grabbing select-none"
        // pan-y so a vertical swipe still scrolls the page: the stack only
        // takes the horizontal axis.
        style={{ perspective: "1000px", touchAction: "pan-y" }}
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
