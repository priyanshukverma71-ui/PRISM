import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useAuth } from '../../context/AuthContext.js';

interface PrismMeshProps {
  activityState?: 'NORMAL' | 'HIGH_ALERT' | 'SIMULATION';
  reducedMotion?: boolean;
}

function PlatinumPrism({ activityState = 'NORMAL', reducedMotion = false }: PrismMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const wireframeRef = useRef<THREE.Mesh>(null!);
  const ringRef = useRef<THREE.Group>(null!);

  useFrame((state, delta) => {
    if (reducedMotion) return;

    // Slow, precision engineered rotation
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.35;
      meshRef.current.rotation.x += delta * 0.15;
    }
    if (wireframeRef.current) {
      wireframeRef.current.rotation.y -= delta * 0.2;
      wireframeRef.current.rotation.z += delta * 0.1;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.15;
    }
  });

  const getAccentColor = () => {
    switch (activityState) {
      case 'HIGH_ALERT':
        return '#FF626B'; // Critical red
      case 'SIMULATION':
        return '#F4B860'; // Amber
      default:
        return '#C7CBD0'; // Brushed platinum
    }
  };

  return (
    <group>
      {/* Signature Precision Prism Octahedron */}
      <Float speed={reducedMotion ? 0 : 2} rotationIntensity={0.4} floatIntensity={0.6}>
        <mesh ref={meshRef} scale={[1.4, 1.8, 1.4]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color="#DEE1E5"
            metalness={0.92}
            roughness={0.18}
            envMapIntensity={1.2}
          />
        </mesh>

        {/* Outer Precision Wireframe Cage */}
        <mesh ref={wireframeRef} scale={[1.75, 2.15, 1.75]}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial
            color={getAccentColor()}
            wireframe
            transparent
            opacity={0.35}
          />
        </mesh>

        {/* Orbital Activity Nodes */}
        <group ref={ringRef}>
          {[0, 1, 2, 3, 4].map((i) => {
            const angle = (i / 5) * Math.PI * 2;
            const radius = 2.4;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            return (
              <mesh key={i} position={[x, (i % 2 === 0 ? 0.3 : -0.3), z]}>
                <sphereGeometry args={[0.07, 16, 16]} />
                <meshStandardMaterial
                  color={i === 1 && activityState === 'HIGH_ALERT' ? '#FF626B' : '#E1E4E8'}
                  emissive={getAccentColor()}
                  emissiveIntensity={0.6}
                />
              </mesh>
            );
          })}
        </group>
      </Float>

      {/* Volumetric Lights */}
      <pointLight position={[5, 6, 5]} intensity={120} color="#FFFFFF" />
      <pointLight position={[-5, -4, -4]} intensity={60} color="#9EA4AC" />
      <directionalLight position={[0, 8, 2]} intensity={1.8} color="#F7F8FA" />
      <ambientLight intensity={0.45} />
    </group>
  );
}

export function PrismCore({
  activityState = 'NORMAL',
  className = 'h-72 w-full',
}: {
  activityState?: 'NORMAL' | 'HIGH_ALERT' | 'SIMULATION';
  className?: string;
}) {
  const { reducedMotion } = useAuth();
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) setHasWebGL(false);
    } catch (e) {
      setHasWebGL(false);
    }
  }, []);

  if (!hasWebGL) {
    // Non-WebGL Fallback: Precision SVG Rendering
    return (
      <div className={`relative flex items-center justify-center bg-obsidian-gradient rounded-xl border border-graphite-border ${className}`}>
        <div className="text-center p-6">
          <div className="relative inline-block">
            <svg className="w-24 h-24 mx-auto animate-pulse-subtle" viewBox="0 0 100 100" fill="none">
              <polygon points="50,12 88,80 12,80" stroke="#C7CBD0" strokeWidth="2.5" fill="#14171C" />
              <polygon points="50,22 80,75 20,75" stroke="#434852" strokeWidth="1.5" />
              <circle cx="50" cy="50" r="4" fill="#E1E4E8" />
            </svg>
          </div>
          <p className="text-xs uppercase tracking-widest text-platinum mt-3 font-mono">PRISM Core Engine</p>
          <span className="text-[10px] text-slate-muted font-mono">Fallback Mode (Standard Graphics)</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-xl border border-graphite-border bg-obsidian ${className}`}>
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-radial-gradient pointer-events-none opacity-40" />

      <Canvas
        camera={{ position: [0, 0, 5.2], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <PlatinumPrism activityState={activityState} reducedMotion={reducedMotion} />
      </Canvas>

      {/* Floating System Telemetry Badge */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-obsidian/80 backdrop-blur-md px-2.5 py-1 rounded border border-graphite-border text-[11px] font-mono text-platinum">
        <span
          className={`w-2 h-2 rounded-full animate-ping ${
            activityState === 'HIGH_ALERT' ? 'bg-status-critical' : activityState === 'SIMULATION' ? 'bg-status-warning' : 'bg-status-success'
          }`}
        />
        <span>PRISM KERNEL // {activityState}</span>
      </div>
    </div>
  );
}
export default PrismCore;
