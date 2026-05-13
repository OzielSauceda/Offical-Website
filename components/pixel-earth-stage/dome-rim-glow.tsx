"use client";

import { useMemo, useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type Props = {
  isGlobeEnvironment: boolean;
};

const DOME_R = 1.82;
// two stacked hemisphere shells. the rim shell is slightly larger and uses
// a fresnel falloff so it only paints the silhouette. the wash shell sits
// just above that and lights the lower band of the dome on its front-facing
// surface, simulating light spilling up from the neon platform ring.
const RIM_R = DOME_R * 1.006;
const WASH_R = DOME_R * 1.004;

const RIM_VERTEX = `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vY;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    vY = position.y;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

// fresnel-weighted rim. alpha is highest at grazing angles and weighted
// toward the base, so the silhouette of the lower dome is the dominant
// region. a small floor keeps the side silhouette visible without painting
// front-facing pixels.
const RIM_FRAGMENT = `
  uniform vec3 uColor;
  uniform vec3 uOuterColor;
  uniform float uIntensity;
  uniform float uPower;
  uniform float uDomeR;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vY;

  void main() {
    float facing = max(dot(normalize(vNormal), normalize(vViewDir)), 0.0);
    float fres = pow(1.0 - facing, uPower);
    float h = clamp(vY / uDomeR, 0.0, 1.0);
    float base = 1.0 - smoothstep(0.0, 0.78, h);
    float top = smoothstep(0.74, 1.0, h) * 0.16;
    float vertical = base * 0.88 + top + 0.16;
    vec3 tint = mix(uColor, uOuterColor, clamp(1.0 - facing, 0.0, 1.0) * 0.5);
    float alpha = fres * vertical * uIntensity;
    gl_FragColor = vec4(tint, alpha);
  }
`;

// lower-band wash. no fresnel — alpha is a smooth height ramp confined to
// the bottom ~22% of the dome so it lights the front-facing surface, not the
// silhouette. low opacity, warm-white, additive — reads as reflected light
// from the ring rather than a painted band.
const WASH_FRAGMENT = `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uDomeR;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vY;

  void main() {
    float h = clamp(vY / uDomeR, 0.0, 1.0);
    // strongest at the very base, fades out by roughly 22% up the dome.
    // a soft inner curve avoids any visible band line.
    float band = pow(1.0 - smoothstep(0.0, 0.22, h), 1.6);
    // soften further toward the back hemisphere so it doesn't bleed onto
    // surfaces the camera can't see lit by the ring.
    float facing = max(dot(normalize(vNormal), normalize(vViewDir)), 0.0);
    float facingBias = mix(0.55, 1.0, facing);
    float alpha = band * facingBias * uIntensity;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

export function DomeRimGlow({ isGlobeEnvironment }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const rimRef = useRef<THREE.ShaderMaterial>(null);
  const washRef = useRef<THREE.ShaderMaterial>(null);

  const rimUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color("#fff8df") },
      uOuterColor: { value: new THREE.Color("#ffe8a8") },
      uIntensity: { value: 1.05 },
      uPower: { value: 2.2 },
      uDomeR: { value: DOME_R },
    }),
    [],
  );

  const washUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color("#fff4c2") },
      uIntensity: { value: 0.42 },
      uDomeR: { value: DOME_R },
    }),
    [],
  );

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.visible = isGlobeEnvironment;
    if (!rimRef.current || !washRef.current) return;
    const rimI = rimRef.current.uniforms.uIntensity;
    const washI = washRef.current.uniforms.uIntensity;
    if (rimI) rimI.value = isGlobeEnvironment ? 1.05 : 0;
    if (washI) washI.value = isGlobeEnvironment ? 0.42 : 0;
  });

  return (
    <group ref={groupRef}>
      {/* lower-band wash — front-facing light spill on the dome's bottom
          ~22%. drawn first so the fresnel rim sits on top of it cleanly */}
      <mesh renderOrder={2}>
        <sphereGeometry
          args={[WASH_R, 128, 56, 0, Math.PI * 2, 0, Math.PI / 2]}
        />
        <shaderMaterial
          ref={washRef}
          vertexShader={RIM_VERTEX}
          fragmentShader={WASH_FRAGMENT}
          uniforms={washUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          side={THREE.FrontSide}
        />
      </mesh>
      {/* fresnel rim — silhouette glow concentrated at the base */}
      <mesh renderOrder={3}>
        <sphereGeometry
          args={[RIM_R, 128, 56, 0, Math.PI * 2, 0, Math.PI / 2]}
        />
        <shaderMaterial
          ref={rimRef}
          vertexShader={RIM_VERTEX}
          fragmentShader={RIM_FRAGMENT}
          uniforms={rimUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          side={THREE.FrontSide}
        />
      </mesh>
    </group>
  );
}
