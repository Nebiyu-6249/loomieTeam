"use client";

import React, { useEffect, useRef } from "react";
import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from "ogl";
import type { TeamMember } from "@/lib/content-types";
import { drawTeamPlaceholder } from "@/lib/team-placeholder";

/**
 * The team, on a ring.
 *
 * Adapted from the circular-gallery pattern rather than lifted from it, and
 * the adaptation is most of the work. What that pattern gets right is the
 * feeling: portraits on a curved surface that you push around, close enough to
 * touch. What it gets wrong for a real site is everything about how it
 * attaches to the page.
 *
 * ── What changed, and why each one mattered ──────────────────────────────
 *
 * Events are bound to the container, not to `window`. A gallery that listens
 * on window is a gallery that responds while you are reading the footer, and
 * on a page with more than one of them they fight.
 *
 * Vertical scrolling is never consumed. The wheel handler ignores anything
 * that is not clearly a horizontal gesture, and `preventDefault` is called
 * only for the ones it acts on — so a trackpad flick down the page still
 * scrolls the page, and Lenis is left alone rather than being fought for
 * control of the same events.
 *
 * The render loop stops when the ring is off screen. An IntersectionObserver
 * cancels the frame request rather than letting a WebGL context redraw a
 * canvas nobody is looking at for the whole length of the page.
 *
 * Nothing here is the accessible representation. The names, roles and links
 * live in the DOM beside this, because text rendered into a texture is text no
 * screen reader, no search engine and no find-in-page will ever see. This
 * component draws pictures and reports which one is in front; it does not own
 * the information.
 *
 * ── What it does not do ──────────────────────────────────────────────────
 * It is never constructed under reduced motion or without WebGL — the parent
 * decides that and renders the roster instead — so there is no fallback path
 * inside here.
 */

/** How far apart the portraits sit along the ring, in world units. */
const GAP = 2.15;

/** The ring's radius. Large, so the curve is a lean rather than a barrel. */
const RADIUS = 9;

/** Lerp factor per frame toward the target position. */
const EASE = 0.085;

const VERTEX = /* glsl */ `
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Cover-fit in the shader rather than by resizing the texture: the portraits
 * arrive at whatever aspect ratio somebody uploaded, and letterboxing a face
 * inside a plane looks like a mistake.
 *
 * `uDim` fades the ones away from the front so the eye is told where to look
 * without anything being hidden.
 */
const FRAGMENT = /* glsl */ `
  precision highp float;
  uniform sampler2D tMap;
  uniform vec2 uImageSize;
  uniform vec2 uPlaneSize;
  uniform float uDim;
  varying vec2 vUv;

  void main() {
    vec2 ratio = vec2(
      min((uPlaneSize.x / uPlaneSize.y) / (uImageSize.x / uImageSize.y), 1.0),
      min((uPlaneSize.y / uPlaneSize.x) / (uImageSize.y / uImageSize.x), 1.0)
    );
    vec2 uv = vec2(
      vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
      vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
    );
    vec4 colour = texture2D(tMap, uv);
    gl_FragColor = vec4(colour.rgb * uDim, colour.a);
  }
`;

interface Portrait {
  mesh: Mesh;
  program: Program;
  index: number;
}

export function TeamRing({
  members,
  active,
  onActiveChange,
}: {
  members: TeamMember[];
  active: number;
  /** Reports which portrait the ring has settled in front of. */
  onActiveChange: (index: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * The parent owns `active`; this ref lets the render loop read the current
   * target without the loop being torn down and rebuilt on every change.
   */
  const target = useRef(active);
  const reportRef = useRef(onActiveChange);
  reportRef.current = onActiveChange;
  target.current = active;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || members.length === 0) return;

    const renderer = new Renderer({
      alpha: true,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
    });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    container.appendChild(gl.canvas);
    gl.canvas.style.width = "100%";
    gl.canvas.style.height = "100%";
    gl.canvas.style.display = "block";

    const camera = new Camera(gl, { fov: 42 });
    camera.position.z = 7.5;

    const scene = new Transform();
    const geometry = new Plane(gl, { widthSegments: 1, heightSegments: 1 });
    const portraits: Portrait[] = [];

    /** Where the ring currently is, and where it is heading. */
    let position = target.current;
    let raf = 0;
    let running = false;
    let planeWidth = 1.6;
    let planeHeight = 2;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      renderer.setSize(rect.width, rect.height);
      camera.perspective({ aspect: rect.width / rect.height });

      // The visible height at the ring's depth, so the portraits are sized in
      // proportion to the container rather than to an arbitrary constant.
      const visibleHeight = 2 * Math.tan((camera.fov * Math.PI) / 180 / 2) * camera.position.z;
      planeHeight = visibleHeight * 0.78;
      planeWidth = planeHeight * 0.76;

      for (const portrait of portraits) {
        portrait.mesh.scale.set(planeWidth, planeHeight, 1);
        (portrait.program.uniforms.uPlaneSize.value as [number, number]) = [
          planeWidth,
          planeHeight,
        ];
      }
    };

    /* ── One plane per member ─────────────────────────────────────────── */

    members.forEach((member, index) => {
      const texture = new Texture(gl, { generateMipmaps: false });

      const program = new Program(gl, {
        vertex: VERTEX,
        fragment: FRAGMENT,
        uniforms: {
          tMap: { value: texture },
          uImageSize: { value: [1, 1] },
          uPlaneSize: { value: [planeWidth, planeHeight] },
          uDim: { value: 1 },
        },
        transparent: true,
      });

      if (member.photo?.src) {
        const image = new window.Image();
        image.crossOrigin = "anonymous";
        image.src = member.photo.src;
        image.onload = () => {
          texture.image = image;
          (program.uniforms.uImageSize.value as [number, number]) = [
            image.naturalWidth,
            image.naturalHeight,
          ];
        };
        // A photograph that fails to load falls back to the same drawn plate
        // as one that was never uploaded, rather than to an empty rectangle.
        image.onerror = () => {
          const plate = drawTeamPlaceholder(member.index);
          texture.image = plate;
          (program.uniforms.uImageSize.value as [number, number]) = [plate.width, plate.height];
        };
      } else {
        const plate = drawTeamPlaceholder(member.index);
        texture.image = plate;
        (program.uniforms.uImageSize.value as [number, number]) = [plate.width, plate.height];
      }

      const mesh = new Mesh(gl, { geometry, program });
      mesh.setParent(scene);
      portraits.push({ mesh, program, index });
    });

    resize();

    /* ── The loop ─────────────────────────────────────────────────────── */

    const frame = () => {
      raf = requestAnimationFrame(frame);

      position += (target.current - position) * EASE;

      for (const portrait of portraits) {
        /**
         * Each portrait takes the nearest place on the ring, wrapping round.
         *
         * Without this the first member has nothing to their left and the last
         * has nothing to their right, so the composition is empty down one
         * side at both ends of the list — which is what a row looks like, not
         * a ring. Wrapping puts the last member just behind the first, which
         * is the whole reason for arranging them on a circle.
         */
        const count = members.length;
        let offset = portrait.index - position;
        offset -= Math.round(offset / count) * count;

        const angle = (offset * GAP) / RADIUS;

        portrait.mesh.position.x = Math.sin(angle) * RADIUS;
        portrait.mesh.position.z = (Math.cos(angle) - 1) * RADIUS;
        portrait.mesh.rotation.y = -angle;

        (portrait.program.uniforms.uDim as { value: number }).value =
          1 - Math.min(Math.abs(offset) * 0.26, 0.6);
      }

      renderer.render({ scene, camera });
    };

    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    /**
     * Nothing renders while the ring is off screen.
     *
     * A WebGL context redrawing a canvas nobody can see costs the same as one
     * somebody is looking at, and the About page is long enough that this is
     * most of the time somebody spends on it.
     */
    const visibility = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { rootMargin: "120px" }
    );
    visibility.observe(container);

    const sizes = new ResizeObserver(resize);
    sizes.observe(container);

    /* ── Dragging, scoped to the container ────────────────────────────── */

    let dragging = false;
    let dragStartX = 0;
    let dragStartPosition = 0;

    const onPointerDown = (event: PointerEvent) => {
      // Left button or touch only: a right-click should open a menu.
      if (event.button !== 0) return;
      dragging = true;
      dragStartX = event.clientX;
      dragStartPosition = target.current;
      container.setPointerCapture(event.pointerId);
      container.style.cursor = "grabbing";
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      const travelled = (dragStartX - event.clientX) / (planeWidth * 90);
      const next = dragStartPosition + travelled;
      reportRef.current(wrap(next));
      // Between whole numbers while the finger is down, so the ring follows
      // the hand rather than snapping a portrait at a time.
      position += (next - position) * 0.3;
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      container.releasePointerCapture(event.pointerId);
      container.style.cursor = "grab";
    };

    /** Wraps, because the ring does. */
    const wrap = (value: number) => {
      const count = members.length;
      return ((Math.round(value) % count) + count) % count;
    };

    /**
     * Horizontal wheel intent only.
     *
     * A trackpad sends both axes; taking the vertical one would mean the page
     * stops scrolling whenever the pointer happens to be over the gallery,
     * which is the single most annoying thing a component like this can do.
     * preventDefault is called only when the gesture is actually being used,
     * so an ordinary scroll passes straight through to Lenis.
     */
    let wheelSettle = 0;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();

      wheelSettle += event.deltaX;
      if (Math.abs(wheelSettle) < 40) return;

      const direction = wheelSettle > 0 ? 1 : -1;
      wheelSettle = 0;
      reportRef.current(wrap(target.current + direction));
    };

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", onPointerUp);
    container.addEventListener("pointercancel", onPointerUp);
    container.addEventListener("wheel", onWheel, { passive: false });
    container.style.cursor = "grab";

    return () => {
      stop();
      visibility.disconnect();
      sizes.disconnect();
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("pointercancel", onPointerUp);
      container.removeEventListener("wheel", onWheel);

      for (const portrait of portraits) {
        portrait.mesh.setParent(null);
        gl.deleteProgram(portrait.program.program);
      }
      gl.canvas.remove();
      // Frees the context immediately rather than waiting for the collector,
      // which matters because browsers cap how many a page may hold.
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [members]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="absolute inset-0 touch-pan-y"
    />
  );
}

export default TeamRing;
