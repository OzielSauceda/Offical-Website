"use client";

// three line buffers are mutated each frame to animate the streak
/* eslint-disable react-hooks/immutability */

import { useEffect, useState } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type Streak = {
  active: boolean;
  start: THREE.Vector3;
  end: THREE.Vector3;
  t: number;
  duration: number;
  next: number;
  line: THREE.Line;
  geom: THREE.BufferGeometry;
  mat: THREE.LineBasicMaterial;
};

const COUNT = 2;

function randSpawn(): THREE.Vector3 {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.random() * Math.PI * 0.55;
  const r = 14;
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi) + 1.2,
    r * Math.sin(phi) * Math.sin(theta) - 4,
  );
}

function createStreaks(): Streak[] {
  return Array.from({ length: COUNT }, (_, i) => {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(2 * 3);
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xe6ecff,
      transparent: true,
      opacity: 0,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const line = new THREE.Line(geom, mat);
    return {
      active: false,
      start: new THREE.Vector3(),
      end: new THREE.Vector3(),
      t: 0,
      duration: 0,
      next: 3 + i * 4 + Math.random() * 6,
      line,
      geom,
      mat,
    };
  });
}

export function ShootingStars() {
  const [streaks] = useState<Streak[]>(() => createStreaks());

  useEffect(() => {
    return () => {
      for (const s of streaks) {
        s.geom.dispose();
        s.mat.dispose();
      }
    };
  }, [streaks]);

  useFrame((_, delta) => {
    for (const s of streaks) {
      if (!s.active) {
        s.next -= delta;
        if (s.next <= 0) {
          s.start.copy(randSpawn());
          const dir = new THREE.Vector3(
            -0.6 - Math.random() * 0.5,
            -0.3 - Math.random() * 0.4,
            0.2 + Math.random() * 0.3,
          )
            .normalize()
            .multiplyScalar(3 + Math.random() * 2);
          s.end.copy(s.start).add(dir);
          s.t = 0;
          s.duration = 0.7 + Math.random() * 0.4;
          s.active = true;
          s.mat.opacity = 0;
        }
        continue;
      }

      s.t += delta;
      const p = Math.min(1, s.t / s.duration);
      const head = s.start.clone().lerp(s.end, p);
      const tail = s.start.clone().lerp(s.end, Math.max(0, p - 0.15));
      const arr = s.geom.attributes.position!.array as Float32Array;
      arr[0] = tail.x; arr[1] = tail.y; arr[2] = tail.z;
      arr[3] = head.x; arr[4] = head.y; arr[5] = head.z;
      s.geom.attributes.position!.needsUpdate = true;
      const fade = p < 0.2 ? p / 0.2 : 1 - (p - 0.2) / 0.8;
      s.mat.opacity = Math.max(0, fade) * 0.85;

      if (p >= 1) {
        s.active = false;
        s.next = 4 + Math.random() * 9;
        s.mat.opacity = 0;
      }
    }
  });

  return (
    <group>
      {streaks.map((s, i) => (
        <primitive key={i} object={s.line} />
      ))}
    </group>
  );
}
