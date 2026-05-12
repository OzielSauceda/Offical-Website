"use client";

import {
  type ComponentRef,
  RefObject,
  useCallback,
  useEffect,
  useRef,
} from "react";

import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

import type { EnvironmentId } from "@/lib/sections";

import { YeezusMountainDebug } from "./yeezus-mountain-debug";

type Props = {
  targetRotationRef: RefObject<number>;
  isDraggingRef: RefObject<boolean>;
  lastInteractionRef: RefObject<number>;
  reducedMotion: boolean;
  screenRotationTargetRef: RefObject<number>;
  environment: EnvironmentId;
};

const DEBUG_CAMERA_TARGET = new THREE.Vector3(0, 0, 0);

const DEBUG_CAMERA_VIEWS = {
  default: {
    position: new THREE.Vector3(0, 1.75, 5.6),
    up: new THREE.Vector3(0, 1, 0),
  },
  front: {
    position: new THREE.Vector3(0, 0.1, 6),
    up: new THREE.Vector3(0, 1, 0),
  },
  right: {
    position: new THREE.Vector3(6, 0.1, 0),
    up: new THREE.Vector3(0, 1, 0),
  },
  left: {
    position: new THREE.Vector3(-6, 0.1, 0),
    up: new THREE.Vector3(0, 1, 0),
  },
  top: {
    position: new THREE.Vector3(0, 6, 0.001),
    up: new THREE.Vector3(0, 0, -1),
  },
} as const;

type DebugCameraView = keyof typeof DEBUG_CAMERA_VIEWS;

function DebugCameraControls() {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { camera } = useThree();

  const setView = useCallback(
    (view: DebugCameraView) => {
      const controls = controlsRef.current;
      const config = DEBUG_CAMERA_VIEWS[view];

      camera.position.copy(config.position);
      camera.up.copy(config.up);
      camera.lookAt(DEBUG_CAMERA_TARGET);

      if (controls) {
        controls.target.copy(DEBUG_CAMERA_TARGET);
        controls.update();
      }
    },
    [camera],
  );

  useEffect(() => {
    setView("default");
  }, [setView]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();

      if (key === "0" || key === "d") {
        setView("default");
        return;
      }

      if (key === "f") {
        setView("front");
        return;
      }

      if (key === "r") {
        setView("right");
        return;
      }

      if (key === "l") {
        setView("left");
        return;
      }

      if (key === "t") {
        setView("top");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setView]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={2.2}
      maxDistance={10}
      target={DEBUG_CAMERA_TARGET}
    />
  );
}

export function Scene(props: Props) {
  return (
    <>
      <color attach="background" args={["#f4f4f0"]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} color="#ffffff" />
      <DebugCameraControls />
      <group name={`debug-${props.environment}`}>
        <YeezusMountainDebug />
      </group>
    </>
  );
}
