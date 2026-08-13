"use client";

import React, { createContext, useContext, useRef } from "react";
import { gsap } from "gsap";
import { Sun, Moon } from "lucide-react";

type Theme = "light" | "dark";

interface ThemeContextType {
  getTheme: () => Theme;
  toggleTheme: (event?: React.MouseEvent) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const readTheme = (): Theme =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const iconRef = useRef<HTMLDivElement>(null);

  const toggleTheme = (e?: React.MouseEvent) => {
    const nextTheme: Theme = readTheme() === "dark" ? "light" : "dark";

    if (iconRef.current) {
      gsap.fromTo(
        iconRef.current,
        { rotate: 0, scale: 0.75 },
        { rotate: 360, scale: 1, duration: 0.55, ease: "back.out(1.7)" }
      );
    }

    const updateDOM = () => {
      localStorage.setItem("loomie-theme", nextTheme);
      document.documentElement.classList.toggle("dark", nextTheme === "dark");
    };

    if (typeof document.startViewTransition === "function" && e) {
      const x = e.clientX;
      const y = e.clientY;
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      const transition = document.startViewTransition(updateDOM);

      transition.ready.then(() => {
        const clipPath = [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`,
        ];

        document.documentElement.animate(
          {
            clipPath: nextTheme === "dark" ? clipPath : [...clipPath].reverse(),
          },
          {
            duration: 650,
            easing: "cubic-bezier(0.76, 0, 0.24, 1)",
            pseudoElement:
              nextTheme === "dark"
                ? "::view-transition-new(root)"
                : "::view-transition-old(root)",
          }
        );
      });
    } else {
      updateDOM();
    }
  };

  return (
    <ThemeContext.Provider value={{ getTheme: readTheme, toggleTheme }}>
      {children}
      <button
        onClick={(e) => toggleTheme(e)}
        className="fixed bottom-8 right-8 z-[9999] p-4 rounded-none bg-surface-card border border-border-custom text-foreground shadow-2xl transition-all duration-300 hover:border-foreground hover:border-foreground group select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        aria-label="Toggle Light / Dark Theme"
        data-cursor="hover"
      >
        <div ref={iconRef}>
          <Sun className="w-5 h-5 text-amber-400 hidden dark:block" />
          <Moon className="w-5 h-5 text-indigo-600 block dark:hidden" />
        </div>
      </button>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
