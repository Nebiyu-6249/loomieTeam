"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { getCapabilities } from "./capabilities";
import {
  buildParticleField,
  MARK_PIXELS_DESKTOP,
  MARK_PIXELS_MOBILE,
} from "./particleField";
import { acquireFrames, markSceneDrawing, readLoader } from "./sceneStore";

/**
 * A3 — suspended snow to directional flow, and the field A10 hands over.
 *
 * At the top of the page several thousand points hang almost motionless. As
 * the page scrolls they fall, begin to align, and by the lower third they have
 * gathered into a ribbon that meanders away behind the content.
 *
 * All of that happens in the vertex shader. The CPU touches four numbers a
 * frame — scroll, time, and the loader's two — and never a position. Moving
 * eight thousand points on the CPU is how a scroll handler ends up costing
 * more than everything else on the page put together.
 *
 * This is the connective tissue for the whole page, so it holds a frame lease
 * for as long as it is mounted. The saving that matters here is the hidden
 * tab, which Scene handles.
 */

/** Cold at the snow end, gold at the river end, per theme. */
const PALETTE = {
  dark: { cold: "#CBDDF0", warm: "#E8DFA0" },
  light: { cold: "#5B7DA6", warm: "#7C6B1F" },
} as const;

const VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  uniform float uForm;
  uniform float uHandoff;
  uniform float uSize;
  uniform float uDepthScale;
  uniform vec3 uMarkScale;
  uniform vec3 uCold;
  uniform vec3 uWarm;

  attribute vec3 aRiver;
  attribute vec3 aMark;
  attribute vec3 aSeed;

  varying vec3 vColor;
  varying float vAlpha;

  const float TAU = 6.2831853;

  void main() {
    float phase = aSeed.x * TAU;

    // Suspended: a few pixels of drift and no more. Anything faster stops
    // reading as hanging and starts reading as floating.
    vec3 snow = position;
    snow.x += sin(uTime * 0.24 + phase) * 0.006;
    snow.y += cos(uTime * 0.18 + phase) * 0.009;

    // Each particle leaves at its own moment, so the field aligns over a
    // stretch of scroll instead of snapping together on one frame.
    float lead = aSeed.y * 0.4;
    float t = clamp((uProgress - lead) / 0.55, 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t);

    // Once in the river the points travel along it rather than sitting in it.
    vec3 river = aRiver;
    river.x += sin(uTime * 0.42 + phase) * 0.012;
    river.y += cos(uTime * 0.33 + phase) * 0.006;

    vec3 scrollPos = mix(snow, river, t);

    // They fall on the way. The bow peaks mid-transition and is gone at both
    // ends, which is what turns a straight interpolation into weight.
    float bow = t * (1.0 - t) * 4.0;
    scrollPos.y -= bow * (0.10 + aSeed.y * 0.14);

    // The loader: scattered, flying in, freezing into the mark.
    // uMarkScale carries the aspect correction as well as the size: x is
    // scaled by the viewport width and y by its height, so a single factor
    // would squash the mark on anything but a square screen.
    vec3 markPos = aMark * uMarkScale;
    vec3 scattered = position * 2.8;
    float form = clamp(uForm, 0.0, 1.0);
    form = form * form * (3.0 - 2.0 * form);
    vec3 loaderPos = mix(scattered, markPos, form);

    vec3 finalPos = mix(loaderPos, scrollPos, uHandoff);

    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Perspective sizing, so depth in the river reads as distance.
    //
    // uSize is a diameter in world units and uDepthScale is half the drawing
    // buffer height, which is what turns world units into buffer pixels at a
    // given depth. Feeding a pixel count in here instead gives points several
    // hundred pixels across, and eight thousand of those will stall a
    // software rasteriser outright.
    float size = uSize * (0.45 + aSeed.z);
    gl_PointSize = size * uDepthScale / max(-mvPosition.z, 0.001);

    // Cold where it is snow, warm where it is river, exactly as the page's
    // own accent strength does.
    vColor = mix(uCold, uWarm, clamp(t * 0.85 + uProgress * 0.15, 0.0, 1.0));

    // The mark is solid; the field is not. Fade the difference rather than
    // cutting between them.
    float fieldAlpha = aSeed.z * (0.55 + 0.45 * t);
    vAlpha = mix(0.35 + 0.65 * form, fieldAlpha, uHandoff);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    gl_FragColor = vec4(vColor, smoothstep(0.5, 0.12, d) * vAlpha);
  }
`;

const readTheme = () =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";

export function Particles() {
  const points = useRef<THREE.Points>(null);
  const material = useRef<THREE.ShaderMaterial>(null);

  const size = useThree((state) => state.size);
  const viewport = useThree((state) => state.viewport);

  const capabilities = getCapabilities();

  const markPixels = capabilities.mobile
    ? MARK_PIXELS_MOBILE
    : MARK_PIXELS_DESKTOP;

  const field = useMemo(
    () => buildParticleField(capabilities.particles),
    [capabilities.particles]
  );

  const framesDrawn = useRef(0);

  const geometry = useMemo(() => {
    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute("position", new THREE.BufferAttribute(field.snow, 3));
    buffer.setAttribute("aRiver", new THREE.BufferAttribute(field.river, 3));
    buffer.setAttribute("aMark", new THREE.BufferAttribute(field.mark, 3));
    buffer.setAttribute("aSeed", new THREE.BufferAttribute(field.seed, 3));
    // The field is repositioned entirely in the vertex shader, so the bounds
    // three would compute from the attribute are wrong and would cull it.
    buffer.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 8);
    return buffer;
  }, [field]);

  /**
   * The initial uniforms only. Everything after this is written through the
   * material ref rather than to this object: uniforms change every frame, and
   * a memo result is not something to be mutated.
   */
  const uniforms = useMemo(() => {
    const palette = PALETTE[readTheme()];
    return {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uForm: { value: 0 },
      uHandoff: { value: 1 },
      // World units. About two and a half CSS pixels at the camera's distance.
      uSize: { value: capabilities.mobile ? 0.034 : 0.03 },
      uDepthScale: { value: 1 },
      uMarkScale: { value: new THREE.Vector3(0.18, 0.18, 0.18) },
      uCold: { value: new THREE.Color(palette.cold) },
      uWarm: { value: new THREE.Color(palette.warm) },
    };
  }, [capabilities.mobile]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  // The whole page is its section, so it wants frames for as long as it is on
  // the page.
  useEffect(() => acquireFrames(), []);

  useEffect(() => {
    const applyTheme = () => {
      const shader = material.current;
      if (!shader) return;
      const palette = PALETTE[readTheme()];
      shader.uniforms.uCold.value.set(palette.cold);
      shader.uniforms.uWarm.value.set(palette.warm);
    };

    const observer = new MutationObserver(applyTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  useFrame((state) => {
    const node = points.current;
    const shader = material.current;
    if (!node || !shader) return;

    // Normalised units to world units. Doing this on the object rather than
    // baking it into the attributes means a resize costs one multiply, not a
    // rebuild of four buffers.
    node.scale.set(viewport.width, viewport.height, viewport.height);

    const scrollable =
      document.documentElement.scrollHeight - window.innerHeight;
    const progress =
      scrollable <= 0
        ? 0
        : Math.min(Math.max(window.scrollY / scrollable, 0), 1);

    const loader = readLoader();

    shader.uniforms.uTime.value = state.clock.elapsedTime;
    shader.uniforms.uProgress.value = progress;
    shader.uniforms.uForm.value = loader.form;
    shader.uniforms.uHandoff.value = loader.handoff;
    shader.uniforms.uDepthScale.value =
      state.gl.getPixelRatio() * size.height * 0.5;

    // The mark is a pixel size, so it converts against each axis separately.
    shader.uniforms.uMarkScale.value.set(
      markPixels / size.width,
      markPixels / size.height,
      markPixels / size.width
    );

    // Two frames, so this is a report of drawing rather than of intending to.
    // The loading screen holds its own mark until it hears this.
    framesDrawn.current += 1;
    if (framesDrawn.current === 2) markSceneDrawing();
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  );
}
