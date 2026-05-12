"use client";

// shader uniforms are three objects designed to be mutated each frame
/* eslint-disable react-hooks/immutability */

import { RefObject, useMemo, useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// rim light using fresnel — bright where the surface curves away from the camera
const VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    // flip the normal so BackSide renders the rim correctly
    vNormal = normalize(normalMatrix * -normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  uniform vec3 uInner;
  uniform vec3 uOuter;
  uniform float uPower;
  uniform float uIntensity;
  uniform float uTime;
  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vView);
    float d = max(dot(N, V), 0.0);
    float rim = pow(1.0 - d, uPower);
    // breathe slowly so the halo doesn't feel static
    float pulse = 0.92 + 0.08 * sin(uTime * 0.6);
    vec3 col = mix(uInner, uOuter, rim);
    float a = clamp(rim * uIntensity * pulse, 0.0, 1.0);
    gl_FragColor = vec4(col * a, a);
  }
`;

type Props = {
  reducedMotion: boolean;
  envBlendRef: RefObject<number>;
};

const INNER_BASE_INTENSITY = 1.35;
const OUTER_BASE_INTENSITY = 0.55;

export function Atmosphere({ reducedMotion, envBlendRef }: Props) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);

  const uniforms = useMemo(
    () => ({
      uInner: { value: new THREE.Color("#7d8fff") },
      uOuter: { value: new THREE.Color("#c9b4ff") },
      uPower: { value: 2.6 },
      uIntensity: { value: INNER_BASE_INTENSITY },
      uTime: { value: 0 },
    }),
    [],
  );

  const outerUniforms = useMemo(
    () => ({
      uInner: { value: new THREE.Color("#5b6fff") },
      uOuter: { value: new THREE.Color("#ff9cb0") },
      uPower: { value: 4.0 },
      uIntensity: { value: OUTER_BASE_INTENSITY },
      uTime: uniforms.uTime,
    }),
    [uniforms.uTime],
  );

  useFrame((_, delta) => {
    if (!reducedMotion) uniforms.uTime.value += delta;
    // halo only makes sense while the globe is on stage — fade with it
    const k = 1 - envBlendRef.current;
    uniforms.uIntensity.value = INNER_BASE_INTENSITY * k;
    outerUniforms.uIntensity.value = OUTER_BASE_INTENSITY * k;
    // belt + suspenders: also skip drawing the hemispheres entirely once
    // they're effectively invisible, so no transparent dome geometry can
    // contribute curvature over the mountain scene
    if (groupRef.current) groupRef.current.visible = k > 0.002;
  });

  return (
    <group ref={groupRef}>
      {/* inner soft halo, hugs the upper hemisphere */}
      <mesh>
        <sphereGeometry args={[1.63, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <shaderMaterial
          ref={matRef}
          uniforms={uniforms}
          vertexShader={VERT}
          fragmentShader={FRAG}
          side={THREE.BackSide}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* wider outer bloom, softer */}
      <mesh>
        <sphereGeometry args={[1.85, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <shaderMaterial
          uniforms={outerUniforms}
          vertexShader={VERT}
          fragmentShader={FRAG}
          side={THREE.BackSide}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
