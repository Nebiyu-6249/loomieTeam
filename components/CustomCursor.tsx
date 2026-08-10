"use client";

import React, { useEffect, useRef, useState } from "react";

export function CustomCursor() {
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const cursorRingRef = useRef<HTMLDivElement>(null);
  const [cursorText, setCursorText] = useState("");
  const [cursorMode, setCursorMode] = useState<"default" | "hover" | "card">("default");
  const [isVisible, setIsVisible] = useState(false);

  const mousePos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      if (!isVisible) setIsVisible(true);

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const card = target.closest("[data-cursor='card']") as HTMLElement | null;
      const interactive = target.closest("a, button, [data-cursor='hover']") as HTMLElement | null;
      const customText = target.closest("[data-cursor-text]") as HTMLElement | null;

      if (customText) {
        setCursorText(customText.getAttribute("data-cursor-text") || "VIEW");
      } else {
        setCursorText("");
      }

      if (card) {
        setCursorMode("card");
        if (!customText) setCursorText("EXPLORE");
      } else if (interactive) {
        setHoverMode("hover");
      } else {
        setCursorMode("default");
      }
    };

    const setHoverMode = (mode: "hover") => setCursorMode(mode);

    const onMouseLeave = () => setIsVisible(false);

    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseleave", onMouseLeave);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [isVisible]);

  useEffect(() => {
    let animFrame: number;

    const render = () => {
      ringPos.current.x += (mousePos.current.x - ringPos.current.x) * 0.18;
      ringPos.current.y += (mousePos.current.y - ringPos.current.y) * 0.18;

      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate3d(${mousePos.current.x}px, ${mousePos.current.y}px, 0)`;
      }

      if (cursorRingRef.current) {
        cursorRingRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0)`;
      }

      animFrame = requestAnimationFrame(render);
    };

    animFrame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrame);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[999999] overflow-hidden select-none">
      {/* Precision Core Dot (Monochrome White/Black Dot, Sharp Box) */}
      <div
        ref={cursorDotRef}
        className={`fixed top-0 left-0 w-2 h-2 rounded-none bg-foreground -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300 ${
          cursorMode === "card" || cursorMode === "hover" ? "opacity-0" : "opacity-100"
        }`}
      />

      {/* Dynamic Trailing Lens Box (Sharp Rectangular Lens Box) */}
      <div
        ref={cursorRingRef}
        className={`fixed top-0 left-0 rounded-none flex items-center justify-center -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-out font-mono font-bold tracking-widest text-xs uppercase ${
          cursorMode === "card"
            ? "w-24 h-24 bg-foreground text-background shadow-2xl scale-100 backdrop-blur-md border border-foreground"
            : cursorMode === "hover"
            ? "w-12 h-12 bg-white text-black mix-blend-difference scale-110"
            : "w-8 h-8 border border-foreground/30 bg-transparent scale-100"
        }`}
      >
        {cursorMode === "card" && (
          <span className="animate-pulse">{cursorText || "EXPLORE"}</span>
        )}
      </div>
    </div>
  );
}
