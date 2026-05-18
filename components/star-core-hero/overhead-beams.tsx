"use client";

import { useMemo, useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const SOURCE_VEC = new THREE.Vector3(0, 5.35, 0.08);
const TARGET_VEC = new THREE.Vector3(0, 1.72, 0);
const BEAM_DIR = TARGET_VEC.clone().sub(SOURCE_VEC);
const BEAM_LENGTH = BEAM_DIR.length();
BEAM_DIR.normalize();
const BEAM_CENTER = SOURCE_VEC.clone().add(TARGET_VEC).multiplyScalar(0.5);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const BEAM_TILT_QUAT = new THREE.Quaternion().setFromUnitVectors(
  Y_AXIS,
  BEAM_DIR,
);
const BEAM_HALF = BEAM_LENGTH / 2;

const SOFT_BEAM_VERTEX = `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vT;
  uniform float uHalfLength;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    vT = (position.y + uHalfLength) / (uHalfLength * 2.0);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const CENTER_BEAM_FRAGMENT = `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uFresPower;
  uniform float uFadeStart;
  uniform float uFadeEnd;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vT;

  void main() {
    float topCap = smoothstep(uFadeStart, uFadeEnd, vT);
    float bottomCap = 1.0 - smoothstep(0.92, 1.0, vT);
    float distToMid = abs(vT - 0.5) * 2.0;
    float ends = pow(distToMid, 1.4);
    float env = (0.08 + 0.92 * ends) * topCap * bottomCap;
    float facing = max(dot(normalize(vNormal), normalize(vViewDir)), 0.0);
    float body = pow(facing, uFresPower);
    float alpha = body * env * uIntensity;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

function makeUniforms(color: string, intensity: number, fresPower: number) {
  return {
    uColor: { value: new THREE.Color(color) },
    uIntensity: { value: intensity },
    uFresPower: { value: fresPower },
    uFadeStart: { value: 0.18 },
    uFadeEnd: { value: 0.38 },
    uHalfLength: { value: BEAM_HALF },
  };
}

export function OverheadBeams({ reducedMotion }: { reducedMotion: boolean }) {
  const coreRef = useRef<THREE.ShaderMaterial>(null);

  const midUniforms = useMemo(() => makeUniforms("#cdeaff", 0.018, 2.3), []);
  const innerUniforms = useMemo(() => makeUniforms("#dfeeff", 0.04, 2.7), []);
  const coreUniforms = useMemo(() => makeUniforms("#eaf6ff", 0.08, 3.4), []);

  useFrame(() => {
    const t = performance.now() / 1000;
    const breathe = reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(t * 1.25);
    if (coreRef.current) {
      const u = coreRef.current.uniforms.uIntensity;
      if (u) u.value = 0.08 + 0.02 * breathe;
    }
  });

  return (
    <group
      position={[BEAM_CENTER.x, BEAM_CENTER.y, BEAM_CENTER.z]}
      quaternion={[
        BEAM_TILT_QUAT.x,
        BEAM_TILT_QUAT.y,
        BEAM_TILT_QUAT.z,
        BEAM_TILT_QUAT.w,
      ]}
    >
      <mesh>
        <cylinderGeometry args={[0.95, 0.28, BEAM_LENGTH, 64, 1, true]} />
        <shaderMaterial
          vertexShader={SOFT_BEAM_VERTEX}
          fragmentShader={CENTER_BEAM_FRAGMENT}
          uniforms={midUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.52, 0.15, BEAM_LENGTH, 64, 1, true]} />
        <shaderMaterial
          vertexShader={SOFT_BEAM_VERTEX}
          fragmentShader={CENTER_BEAM_FRAGMENT}
          uniforms={innerUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.22, 0.05, BEAM_LENGTH, 64, 1, true]} />
        <shaderMaterial
          ref={coreRef}
          vertexShader={SOFT_BEAM_VERTEX}
          fragmentShader={CENTER_BEAM_FRAGMENT}
          uniforms={coreUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
