"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MeshTransmissionMaterial } from "@react-three/drei/core/MeshTransmissionMaterial";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { observePointer, readPointer } from "../pointerStore";
import { getCapabilities } from "./capabilities";
import { getGradientTexture } from "./gradientTexture";
import { loaderOwnsField, readAnchor } from "./sceneStore";

/**
 * A2 — the mark as two lenses of clear ice.
 *
 * Two overlapping capsules whose union is exactly the LoomieEyes silhouette,
 * carrying a transmission material so the gradient behind them refracts
 * through. The apertures are dark cores set just under the front surface, seen
 * through the ice, and they turn toward the cursor rather than sliding across
 * it — the difference between an eye and a dot on a plate.
 *
 * The whole mark drifts by about eight degrees and never settles.
 */

const ANCHOR_ID = "hero-lenses";

/**
 * Geometry in units of the anchor width, taken straight off the 360x185
 * LoomieEyes viewBox so the 3D mark and the SVG mark are the same shape.
 *
 *   lens radius   = 92.5 / 360   (half the mark height)
 *   lens gap      = (180 - 113) / 360   (aperture offset from centre)
 *   lens length   = whatever makes the two capsules meet the mark's ends
 *
 * The apertures are the exception. A lens magnifies whatever sits inside it,
 * so a sphere cut to the SVG's 46/360 renders about half again too big. These
 * are sized and sunk to land on the mark's proportion after refraction, not
 * before it.
 */
const LENS_RADIUS = 92.5 / 360;
const LENS_GAP = (180 - 113) / 360;
const LENS_LENGTH = 2 * (0.5 - LENS_GAP - LENS_RADIUS);
const PUPIL_RADIUS = 0.09;

/**
 * In front of the ice, not inside it.
 *
 * Inside was the intuitive placement and it looked terrible. The transmission
 * pass re-renders the whole scene into a 512px buffer and takes six jittered
 * taps through it, so a hard black edge behind the lens comes back as a ring
 * of spokes. In front, the aperture is drawn in the main pass at full canvas
 * resolution with a clean edge, and the soft refracted copy still in the
 * buffer sits directly behind it, reading as depth in the ice.
 */
const PUPIL_DEPTH = 92.5 / 360 + 0.02;

/** Deep cold, not the theme background. See the note on the aperture meshes. */
const APERTURE_COLOUR = "#070B14";

/** The SVG mark caps deflection at 5% of its width. Same number here. */
const PUPIL_TRAVEL = 0.05;
const PUPIL_LERP = 0.08;

/** Degrees of never-settling drift. */
const DRIFT = 8 * (Math.PI / 180);

export function HeroLenses() {
  const group = useRef<THREE.Group>(null);
  const leftPupil = useRef<THREE.Mesh>(null);
  const rightPupil = useRef<THREE.Mesh>(null);

  const viewport = useThree((state) => state.viewport);
  const size = useThree((state) => state.size);
  const capabilities = getCapabilities();

  const aim = useRef(new THREE.Vector2());

  useEffect(() => observePointer(), []);

  /**
   * One geometry, not two meshes. A second transmission material means a
   * second set of buffers and a second full-screen sampler for no visual
   * gain, and merging keeps both lens surfaces so the overlap still reads.
   */
  const lensGeometry = useMemo(() => {
    const build = (offset: number) => {
      // Refraction reads the interpolated normal, so a coarse capsule shows up
      // as banding in the ice long before it shows up in the silhouette.
      const capsule = new THREE.CapsuleGeometry(
        LENS_RADIUS,
        LENS_LENGTH,
        16,
        64
      );
      // CapsuleGeometry runs along Y; the mark runs along X.
      capsule.rotateZ(Math.PI / 2);
      capsule.translate(offset, 0, 0);
      return capsule;
    };

    const left = build(-LENS_GAP);
    const right = build(LENS_GAP);
    const merged = mergeGeometries([left, right]);
    left.dispose();
    right.dispose();

    return merged;
  }, []);

  useEffect(() => () => lensGeometry?.dispose(), [lensGeometry]);

  const backdrop = useMemo(() => getGradientTexture(), []);

  useFrame((state) => {
    const node = group.current;
    if (!node) return;

    const anchor = readAnchor(ANCHOR_ID);

    // While the loader owns the field the canvas is lifted above the overlay,
    // so anything else drawing into it lands on the loading screen. The lenses
    // belong to the hero and the hero is not on screen yet.
    if (loaderOwnsField() || !anchor || !anchor.visible || anchor.faded >= 1) {
      node.visible = false;
      return;
    }

    node.visible = true;

    // Screen pixels to world units, so the lenses sit exactly where the
    // layout reserved space for them.
    const worldX = (anchor.centreX / size.width - 0.5) * viewport.width;
    const worldY = -(anchor.centreY / size.height - 0.5) * viewport.height;
    const scale = (anchor.width / size.width) * viewport.width;

    node.position.set(worldX, worldY, 0);
    node.scale.setScalar(scale * (1 - anchor.faded * 0.25));

    const time = state.clock.elapsedTime;

    // Drift, never settling.
    node.rotation.x = Math.sin(time * 0.32) * DRIFT;
    node.rotation.y = Math.cos(time * 0.24) * DRIFT;
    node.rotation.z = Math.sin(time * 0.17) * DRIFT * 0.4;

    // Pupils turn toward the cursor, or drift on their own where there isn't
    // one. Same idle behaviour as the SVG mark, so a touch device still gets
    // eyes that are alive.
    const cursor = readPointer();
    const tracking = cursor.seen && cursor.fine;

    const targetX = tracking
      ? (cursor.x / size.width) * 2 - 1
      : Math.sin(time * 0.6) * 0.6;
    const targetY = tracking
      ? 1 - (cursor.y / size.height) * 2
      : Math.cos(time * 0.42) * 0.45;

    aim.current.x += (targetX - aim.current.x) * PUPIL_LERP;
    aim.current.y += (targetY - aim.current.y) * PUPIL_LERP;

    const offsetX = aim.current.x * PUPIL_TRAVEL;
    const offsetY = aim.current.y * PUPIL_TRAVEL;

    leftPupil.current?.position.set(
      -LENS_GAP + offsetX,
      offsetY,
      PUPIL_DEPTH
    );
    rightPupil.current?.position.set(LENS_GAP + offsetX, offsetY, PUPIL_DEPTH);
  });

  if (!lensGeometry) return null;

  const lensMaterial = capabilities.transmission ? (
    <MeshTransmissionMaterial
      transmission={1}
      // The lens is about a third of a world unit thick once scaled; the
      // thickness has to be on that order or the ice goes opaque.
      thickness={0.25}
      roughness={0.05}
      chromaticAberration={0.05}
      distortion={0.12}
      distortionScale={0.3}
      temporalDistortion={0.03}
      // Ice, literally: 1.31.
      ior={1.31}
      samples={10}
      /*
        Supplying a buffer is what makes this affordable and what makes it
        look right.

        Left to itself the material re-renders the entire scene into a 512px
        buffer twice per frame and refracts that. Two problems: those are the
        only expensive passes on the page, and the apertures land in the
        buffer at about fourteen pixels across, so the ice refracts an aliased
        copy of them and every eye grows a ring of spokes.

        drei skips both passes when the buffer is not its own, so handing it
        the gradient removes the cost and the artefact together, and the ice
        refracts the same sky that lights it.
      */
      buffer={backdrop ?? undefined}
    />
  ) : (
    // Phone GPUs cannot afford transmission. Frosted standard material
    // instead, tuned to land on the same pale ice rather than on grey: at 0.55
    // opacity over a near-black page it read as a pebble.
    <meshStandardMaterial
      color="#DCE9F6"
      transparent
      opacity={0.78}
      roughness={0.22}
      metalness={0}
      envMapIntensity={1.2}
    />
  );

  return (
    <group ref={group} visible={false}>
      {/* Inside the group, so the specular travels as the mark drifts. */}
      <directionalLight position={[2, 3, 4]} intensity={2.2} />
      <directionalLight
        position={[-3, -1, 2]}
        intensity={0.8}
        color="#E8DFA0"
      />

      <mesh geometry={lensGeometry}>{lensMaterial}</mesh>

      {/*
        Flat discs, unlit, exactly as the SVG mark draws its apertures. A
        sphere was the obvious choice and the wrong one: its limb shades to
        black, and lit shading on something meant to read as a hole is wrong
        anyway.

        The colour is fixed rather than the theme background. The mark is pale
        ice in both themes, so an aperture that followed --background would
        disappear in light mode.
      */}
      <mesh ref={leftPupil}>
        <circleGeometry args={[PUPIL_RADIUS, 48]} />
        <meshBasicMaterial color={APERTURE_COLOUR} toneMapped={false} />
      </mesh>

      <mesh ref={rightPupil}>
        <circleGeometry args={[PUPIL_RADIUS, 48]} />
        <meshBasicMaterial color={APERTURE_COLOUR} toneMapped={false} />
      </mesh>
    </group>
  );
}
