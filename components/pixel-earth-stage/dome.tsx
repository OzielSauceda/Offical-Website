"use client";

import { RefObject, useEffect, useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const AUTO_SPEED = 0.14;
const RESUME_DELAY_MS = 6500;
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
    const loader = new THREE.TextureLoader();
    let disposed = false;
    let loadedTex: THREE.Texture | null = null;
    loader.load("/textures/earth-blue-marble.jpg", (tex) => {
      if (disposed) {
        tex.dispose();
        return;
      }
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
    });
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
