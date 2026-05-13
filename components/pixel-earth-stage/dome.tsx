"use client";

import { RefObject, useEffect, useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const AUTO_SPEED = 0.14;
const RESUME_DELAY_MS = 1800;
const DOME_RADIUS = 1.82;

type Props = {
  targetRotationRef: RefObject<number>;
  isDraggingRef: RefObject<boolean>;
  lastInteractionRef: RefObject<number>;
  reducedMotion: boolean;
  isGlobeEnvironment: boolean;
};

export function Dome({
  targetRotationRef,
  isDraggingRef,
  lastInteractionRef,
  reducedMotion,
  isGlobeEnvironment,
}: Props) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  // load the photographic earth without suspending — Canvas only has a single
  // internal Suspense boundary, so a suspending loader inside the scene would
  // blank out every sibling component (screen, beams, character) while it waits.
  // assigning via the material ref + needsUpdate forces the shader to recompile
  // so the map sampler is actually wired in (passing it through a state-backed
  // JSX prop leaves the material rendering unmapped/gray on the first hit).
  useEffect(() => {
    let disposed = false;
    let loadedTex: THREE.Texture | null = null;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (disposed) return;
      // posterize the blue marble into a flat cartoon-globe palette.
      // continent shapes and ocean layout come straight from the source
      // pixels, but photographic micro-detail collapses into ~6 flat
      // regions (ocean, shallow, forest, plains, desert, ice). reads as
      // a stylized illustrated globe instead of a NASA poster, while
      // still being unambiguously Earth.
      const sw = img.naturalWidth;
      const sh = img.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, sw, sh);
      const imgData = ctx.getImageData(0, 0, sw, sh);
      const data = imgData.data;

      // flat cartoon-earth palette. saturations are tuned so the result
      // looks illustrated, not neon — and so it still sits inside the
      // stage's warm key light.
      const OCEAN_DEEP: [number, number, number] = [26, 66, 118];
      const OCEAN: [number, number, number] = [48, 100, 160];
      const SHALLOW: [number, number, number] = [86, 142, 184];
      const FOREST: [number, number, number] = [70, 132, 78];
      const GRASS: [number, number, number] = [128, 172, 92];
      const PLAINS: [number, number, number] = [196, 188, 122];
      const DESERT: [number, number, number] = [218, 188, 130];
      const ICE: [number, number, number] = [232, 234, 232];

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i] ?? 0;
        const g = data[i + 1] ?? 0;
        const b = data[i + 2] ?? 0;
        const lum = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const chroma = (maxC - minC) / 255;

        // ice / snow / clouds: bright + nearly neutral
        if (lum > 0.78 && chroma < 0.12) {
          data[i] = ICE[0];
          data[i + 1] = ICE[1];
          data[i + 2] = ICE[2];
          continue;
        }

        // water: blue dominant over red and at/over green
        const isWater = b > r + 10 && b >= g - 4;
        if (isWater) {
          let c: [number, number, number];
          if (lum < 0.28) c = OCEAN_DEEP;
          else if (lum < 0.5) c = OCEAN;
          else c = SHALLOW;
          data[i] = c[0];
          data[i + 1] = c[1];
          data[i + 2] = c[2];
          continue;
        }

        // land: classify by green dominance and warmth
        const greenDom = g - Math.max(r, b);
        const warmth = r + g - 2 * b;
        let c: [number, number, number];
        if (greenDom > 6 && lum < 0.42) c = FOREST;
        else if (greenDom > 0) c = GRASS;
        else if (warmth > 60 && lum > 0.55) c = DESERT;
        else c = PLAINS;
        data[i] = c[0];
        data[i + 1] = c[1];
        data[i + 2] = c[2];
      }
      ctx.putImageData(imgData, 0, 0);
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      // sample only the northern hemisphere of the equirectangular image.
      // offset.x shifts which longitude faces the camera at rotation 0 —
      // 0.40 puts Middle East / Africa / South Asia squarely at the front
      // so there's always recognizable land visible on the dome's main face.
      tex.offset.set(0.4, 0.5);
      tex.repeat.set(1, 0.5);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
      loadedTex = tex;
      const mat = matRef.current;
      if (mat) {
        mat.map = tex;
        // route the same image through the emissive channel so the surface
        // keeps its land/ocean color even in the shadowed half — without this
        // the unlit parts of the dome wash out to flat blue
        mat.emissiveMap = tex;
        mat.needsUpdate = true;
      }
    };
    img.src = "/textures/earth-blue-marble.jpg";

    return () => {
      disposed = true;
      loadedTex?.dispose();
    };
  }, []);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const now = performance.now();
    const sinceInteraction = now - lastInteractionRef.current;
    // only auto-rotate while the globe is the active environment. when in
    // pyramid (or any non-globe) env, leave targetRotationRef alone so the
    // pyramid stage sits still until the user drags it.
    const canAutoRotate =
      !reducedMotion &&
      !isDraggingRef.current &&
      sinceInteraction > RESUME_DELAY_MS &&
      isGlobeEnvironment;
    if (canAutoRotate) {
      targetRotationRef.current += AUTO_SPEED * delta;
    }
    const current = mesh.rotation.y;
    const target = targetRotationRef.current;
    // ease toward target so drag feels responsive but not jittery
    mesh.rotation.y = current + (target - current) * Math.min(1, delta * 14);

    // snap visibility on the actual target environment so the dome disappears
    // the moment the section switches, instead of lingering through a fade.
    const mat = matRef.current;
    if (mat) {
      mat.opacity = isGlobeEnvironment ? 1 : 0;
      mesh.visible = isGlobeEnvironment;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[0, 0, 0]}>
      {/* upper hemisphere only — theta runs from north pole to equator.
          higher segment count + smooth shading so the dome reads as a
          projection surface rather than a low-poly facet ball */}
      <sphereGeometry args={[DOME_RADIUS, 128, 56, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial
        ref={matRef}
        color="#fff8e8"
        roughness={0.88}
        metalness={0}
        emissive="#ffffff"
        emissiveIntensity={1.55}
        side={THREE.FrontSide}
        transparent
      />
    </mesh>
  );
}
