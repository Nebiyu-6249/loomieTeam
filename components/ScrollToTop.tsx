"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLenis } from "./LenisScrollProvider";

/**
 * Resets scroll position on route change.
 *
 * Lenis keeps its own scroll position independently of the window, so
 * without this a client-side navigation lands part way down the new page.
 */
export function ScrollToTop() {
  const pathname = usePathname();
  const lenis = useLenis();

  useEffect(() => {
    // Leave anchor navigation alone, including the /story -> /studio#story
    // style redirects, which would otherwise be yanked back to the top.
    if (window.location.hash) return;

    lenis?.current?.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
  }, [pathname, lenis]);

  return null;
}
