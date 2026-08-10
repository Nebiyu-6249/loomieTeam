"use client";

import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * Route transition: the Loomie pill expands to fill the screen and contracts
 * away to reveal the new route.
 *
 * Module-level rather than state, because it must survive the remount that
 * template.tsx performs on every navigation. It stays false through the first
 * render of a full page load, so nothing here can delay first paint.
 */
let hasNavigated = false;

/** Enough to cover any viewport: the tightest constraint is 100vh / 36vmax. */
const COVER_SCALE = 4;

function PillWipe({ onDone }: { onDone: () => void }) {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[99998] flex items-center justify-center overflow-hidden pointer-events-none"
    >
      <motion.div
        className="w-[70vmax] h-[36vmax] rounded-full bg-foreground"
        initial={{ scale: 0 }}
        animate={{ scale: [0, COVER_SCALE, COVER_SCALE, 0] }}
        transition={{
          duration: 0.6,
          times: [0, 0.42, 0.52, 1],
          ease: [0.76, 0, 0.24, 1],
        }}
        onAnimationComplete={onDone}
      />
    </div>
  );
}

export default function Template({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  // Read at mount only: true on a client-side navigation, false on a full load.
  const [wiping, setWiping] = useState(() => hasNavigated);

  useEffect(() => {
    hasNavigated = true;
  }, []);

  return (
    <>
      {wiping && !reduceMotion && (
        <PillWipe onDone={() => setWiping(false)} />
      )}
      {children}
    </>
  );
}
