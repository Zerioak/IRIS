import React, { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Color, AdditiveBlending, MathUtils, Points as ThreePoints } from "three";

interface ParticleSphereProps {
  isSpeaking: boolean;
  isListening: boolean;
}

const PARTICLES_COUNT = 800;
const COLOR_1 = new Color("#3b82f6"); // Blue
const COLOR_2 = new Color("#fbbf24"); // Yellow/Amber

function ParticleSphere({ isSpeaking, isListening }: ParticleSphereProps) {
  const points = useRef<ThreePoints>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  const [positions, colors] = useMemo(() => {
    if (typeof window === "undefined") return [new Float32Array(0), new Float32Array(0)];
    
    try {
      const positionsArr = new Float32Array(PARTICLES_COUNT * 3);
      const colorsArr = new Float32Array(PARTICLES_COUNT * 3);

      for (let i = 0; i < PARTICLES_COUNT; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const r = 1.8 + Math.random() * 0.2;

        positionsArr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positionsArr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positionsArr[i * 3 + 2] = r * Math.cos(phi);

        const mixedColor = Math.random() > 0.5 ? COLOR_1 : COLOR_2;
        colorsArr[i * 3] = mixedColor.r;
        colorsArr[i * 3 + 1] = mixedColor.g;
        colorsArr[i * 3 + 2] = mixedColor.b;
      }
      return [positionsArr, colorsArr];
    } catch (e) {
      console.error("Neural Core initialization failed", e);
      return [new Float32Array(0), new Float32Array(0)];
    }
  }, []);

  useFrame((state) => {
    if (!isReady || !points.current) return;
    
    try {
      const time = state.clock.getElapsedTime();
      points.current.rotation.y = time * 0.2;
      points.current.rotation.x = time * 0.1;

      const scale = isSpeaking 
        ? 1 + Math.sin(time * 10) * 0.05 
        : isListening 
        ? 1 + Math.sin(time * 2) * 0.02 
        : 1;
      
      points.current.scale.set(scale, scale, scale);
    } catch (e) {
      // Silent fail to prevent crash loop in frame loop
    }
  });

  if (!isReady || positions.length === 0) return null;

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLES_COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={PARTICLES_COUNT}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.015}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation={true}
        blending={AdditiveBlending}
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
