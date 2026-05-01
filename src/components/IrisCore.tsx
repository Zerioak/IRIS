import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { motion } from "motion/react";

interface ParticleSphereProps {
  isSpeaking: boolean;
  isListening: boolean;
}

function ParticleSphere({ isSpeaking, isListening }: ParticleSphereProps) {
  const points = useRef<THREE.Points>(null);

  const particlesCount = 400;
  const [positions, colors] = useMemo(() => {
    const positions = new Float32Array(particlesCount * 3);
    const colors = new Float32Array(particlesCount * 3);
    const color1 = new THREE.Color("#3b82f6"); // Blue
    const color2 = new THREE.Color("#fbbf24"); // Yellow/Amber

    for (let i = 0; i < particlesCount; i++) {
      const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
      const phi = THREE.MathUtils.randFloat(0, Math.PI);
      const r = THREE.MathUtils.randFloat(1.8, 2.0);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const mixedColor = Math.random() > 0.5 ? color1 : color2;
      colors[i * 3] = mixedColor.r;
      colors[i * 3 + 1] = mixedColor.g;
      colors[i * 3 + 2] = mixedColor.b;
    }
    return [positions, colors];
  }, []);

  useFrame((state) => {
    if (!points.current) return;
    
    const time = state.clock.getElapsedTime();
    points.current.rotation.y = time * 0.2;
    points.current.rotation.x = time * 0.1;

    const scale = isSpeaking 
      ? 1 + Math.sin(time * 10) * 0.05 
      : isListening 
      ? 1 + Math.sin(time * 2) * 0.02 
      : 1;
    
    points.current.scale.set(scale, scale, scale);
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particlesCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particlesCount}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.015}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export const IrisCore: React.FC<ParticleSphereProps> = React.memo(({ isSpeaking, isListening }) => {
  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 1]}>
        <ambientLight intensity={0.5} />
        <ParticleSphere isSpeaking={isSpeaking} isListening={isListening} />
      </Canvas>
      {/* Subtle glow overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0%,transparent_70%)]" />
    </div>
  );
});
