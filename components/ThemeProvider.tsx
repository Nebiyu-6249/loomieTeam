"use client";

import React, { createContext, useContext } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  getTheme: () => Theme;
  toggleTheme: (event?: React.MouseEvent) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const readTheme = (): Theme =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";

/**
 * The theme, with no chrome of its own.
 *
 * There used to be a bordered sun/moon button pinned to the bottom-right
 * corner at z-index 9999, floating over every page at every scroll position.
 * It was the most prominent permanent control on a site whose subject is other
 * people's work, and the first thing a visitor's eye went to on a page meant
 * to lead with a headline. The switch now lives in the menu, with the rest of
 * the site's controls, and this component provides only the behaviour.
 *
 * The view-transition circle is kept: it wipes from wherever the control
 * happens to be, so it works just as well from inside the menu.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const toggleTheme = (e?: React.MouseEvent) => {
    const nextTheme: Theme = readTheme() === "dark" ? "light" : "dark";

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
