"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  BRAND_PLATES,
  COLUMN_SPREAD,
  PLATE_SPAN,
  ROW_SPREAD,
} from "../brandPlates";
import { getCapabilities } from "./capabilities";
import {
  CAPTION_HEIGHT,
  CAPTION_WIDTH,
  PLATE_HEIGHT,
  PLATE_WIDTH,
  drawPlateArt,
  drawPlateCaption,
} from "./plateArt";
import { readAnchor, readProgress } from "./sceneStore";

/**
 * A4 — the brand system as plates in space.
 *
 * Assembled, the six pieces are one stack. As the section scrolls they push
 * out along their own vectors, turning, and pass each other in depth. Then
 * they rotate to face front and lock into a 3 x 2 grid.
 *
 * The spec asks for the camera to dolly in. The camera is shared with
 * everything else in this canvas, so the group travels toward it instead:
 * same shot, and the hero lenses do not lurch when this section runs.
 */

const ANCHOR_ID = "exploded";
const PROGRESS_ID = "exploded";

const PLATE_ASPECT = PLATE_HEIGHT / PLATE_WIDTH;
const CAPTION_ASPECT = CAPTION_HEIGHT / 2 / CAPTION_WIDTH;

/** Matches the DOM version's md:max-w-[230px] cap, in CSS pixels. */
const PLATE_MAX_PIXELS = 230;

/** Where the stack sits at each of the three states, in world units. */
const DOLLY_ASSEMBLED = -1.45;
const DOLLY_EXPLODED = 0.35;
const DOLLY_LOCKED = 0;

/**
 * The explode vectors are shared with the DOM version, which has no
 * perspective. Here the dolly and the depth spread both magnify, so the same
 * numbers throw the outer plates past the edge of the screen. This pulls them
 * back in by the amount perspective adds.
 */
const PERSPECTIVE_TRIM_X = 0.85;
/**
 * Harder vertically. The stage is short and wide — it is what is left of a
 * viewport after the heading — so the same fraction that fits comfortably
 * across it pushes the lowest plate's caption off the bottom of the screen.
 */
const PERSPECTIVE_TRIM_Y = 0.72;

const DEG = Math.PI / 180;

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
};

const readTheme = () =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";

interface PlateRefs {
  group: THREE.Group | null;
  caption: THREE.Mesh | null;
}

export function ExplodedPlates() {
  const root = useRef<THREE.Group>(null);
  const plates = useRef<PlateRefs[]>(
    BRAND_PLATES.map(() => ({ group: null, caption: null }))
  );

  const size = useThree((state) => state.size);
  const viewport = useThree((state) => state.viewport);
  const capabilities = getCapabilities();

  /**
   * The scrubbing lives here rather than in the ScrollTrigger. GSAP's scrub
   * eases a timeline; there is no timeline on this side, only a number, so
   * the number is eased instead — and the easing then runs on the canvas's
   * own frame loop rather than on a second one.
   */
  const eased = useRef(0);

  const textures = useMemo(() => {
    if (capabilities.mobile) return null;

    const theme = readTheme();
    return BRAND_PLATES.map((plate) => {
      const art = new THREE.CanvasTexture(drawPlateArt(plate.id, theme));
      art.colorSpace = THREE.SRGBColorSpace;
      art.anisotropy = 4;

      const caption = new THREE.CanvasTexture(
        drawPlateCaption(plate.label, plate.service, theme)
      );
      caption.colorSpace = THREE.SRGBColorSpace;
      // One texture, two bands. flipY is on, so the canvas's top band — the
      // exploded label — is the upper half of the v range.
      caption.repeat.set(1, 0.5);
      caption.offset.set(0, 0.5);

      return { art, caption };
    });
  }, [capabilities.mobile]);

  useEffect(() => {
    if (!textures) return;
    return () => {
      for (const set of textures) {
        set.art.dispose();
        set.caption.dispose();
      }
    };
  }, [textures]);

  /**
   * Webfonts are not necessarily available to a canvas at first paint, and a
   * plate drawn before they land is drawn in the fallback face. Redraw once
   * they are ready, and again whenever the theme changes.
   */
  useEffect(() => {
    if (!textures) return;

    const redraw = () => {
      const theme = readTheme();
      BRAND_PLATES.forEach((plate, index) => {
        const set = textures[index];
        set.art.image = drawPlateArt(plate.id, theme);
        set.art.needsUpdate = true;
        set.caption.image = drawPlateCaption(plate.label, plate.service, theme);
        set.caption.needsUpdate = true;
      });
    };

    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) redraw();
    });

    const observer = new MutationObserver(redraw);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [textures]);

  useFrame(() => {
    const node = root.current;
    if (!node) return;

    const anchor = readAnchor(ANCHOR_ID);

    if (!anchor || !anchor.visible) {
      node.visible = false;
      return;
    }

    node.visible = true;

    // Stage box, in world units.
    const stageWidth = (anchor.width / size.width) * viewport.width;
    const stageHeight = (anchor.height / size.height) * viewport.height;

    // The plate meshes are built one unit wide, so the group carries the size.
    // Capped the same way the DOM version is, so the two renderings of this
    // section are the same size on the same screen.
    const plateSize = Math.min(
      PLATE_SPAN * stageWidth,
      (PLATE_MAX_PIXELS / size.width) * viewport.width
    );

    eased.current += (readProgress(PROGRESS_ID) - eased.current) * 0.14;
    const t = eased.current;

    const opening = smoothstep(0, 0.5, t);
    const closing = smoothstep(0.5, 1, t);

    node.position.set(
      (anchor.centreX / size.width - 0.5) * viewport.width,
      -(anchor.centreY / size.height - 0.5) * viewport.height,
      DOLLY_ASSEMBLED +
        (DOLLY_EXPLODED - DOLLY_ASSEMBLED) * opening +
        (DOLLY_LOCKED - DOLLY_EXPLODED) * closing
    );

    // The caption appears with the explosion and swaps label for service on
    // the way to the grid, dipping through zero so the words never crossfade
    // into an unreadable overlap.
    const captionIn = smoothstep(0.2, 0.36, t);
    const swapping = Math.min(Math.max((t - 0.58) / 0.09, 0), 1);
    const captionAlpha = captionIn * (1 - Math.sin(swapping * Math.PI));

    BRAND_PLATES.forEach((plate, index) => {
      const refs = plates.current[index];
      const group = refs.group;
      if (!group) return;

      // Assembled is a stack; exploded is the piece's own vector, in depth;
      // locked is the grid, square to the camera.
      const explodedX = plate.explode.x * stageWidth * PERSPECTIVE_TRIM_X;
      const explodedY = -plate.explode.y * stageHeight * PERSPECTIVE_TRIM_Y;
      // Depth is measured against the plate, not the stage. Against the stage
      // the nearest plate ends up half the camera's distance away and fills
      // the screen on its own.
      const explodedZ = plate.depth * plateSize;

      const lockedX = (plate.cell.column - 1) * COLUMN_SPREAD * stageWidth;
      const lockedY = -(plate.cell.row - 0.5) * 2 * ROW_SPREAD * stageHeight;

      // Nearest first, so the assembled stack shows the mark. The DOM version
      // orders its z-index the same way round.
      const stackedZ =
        (BRAND_PLATES.length - 1 - index) * 0.02 * plateSize;

      group.position.set(
        explodedX * opening + (lockedX - explodedX) * closing,
        explodedY * opening + (lockedY - explodedY) * closing,
        stackedZ +
          (explodedZ - stackedZ) * opening +
          (0 - explodedZ) * closing
      );

      // Turning, then square. rotationX/rotationY is what actually turns a
      // plate in three; rotateX/rotateY are method names, not properties.
      const turn = opening * (1 - closing);
      group.rotation.set(
        plate.explode.rotate * 0.9 * DEG * turn,
        plate.explode.rotate * -1.6 * DEG * turn,
        plate.explode.rotate * 0.45 * DEG * turn
      );

      const scale =
        1 + (plate.explode.scale - 1) * opening * (1 - closing);
      group.scale.setScalar(scale * plateSize);

      const caption = refs.caption;
      if (caption) {
        const material = caption.material as THREE.MeshBasicMaterial;
        material.opacity = captionAlpha;
        // Past the midpoint of the dip the band becomes the service name.
        material.map?.offset.set(0, swapping > 0.5 ? 0 : 0.5);
      }
    });
  });

  if (!textures) return null;

  return (
    <group ref={root} visible={false}>
      {BRAND_PLATES.map((plate, index) => (
        <group
          key={plate.id}
          ref={(node) => {
            plates.current[index].group = node;
          }}
        >
          <mesh scale={[1, PLATE_ASPECT, 1]}>
            <planeGeometry args={[1, 1]} />
            {/*
              Opaque, so the plates sit in the depth-sorted pass and genuinely
              occlude one another. Transparent plates would be sorted by
              distance and drawn back to front regardless of geometry, which
              is exactly the flat look this rework replaces.
            */}
            <meshBasicMaterial map={textures[index].art} toneMapped={false} />
          </mesh>

          <mesh
            ref={(node) => {
              plates.current[index].caption = node;
            }}
            position={[0, -PLATE_ASPECT * 0.5 - CAPTION_ASPECT, 0.001]}
            scale={[1, CAPTION_ASPECT * 2, 1]}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              map={textures[index].caption}
              transparent
              opacity={0}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
