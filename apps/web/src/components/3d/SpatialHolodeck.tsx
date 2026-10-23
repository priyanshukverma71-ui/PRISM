import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Float, Html, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { useAuth } from '../../context/AuthContext.js';

export interface SpatialCaseNode {
  id: string;
  applicationNumber: string;
  institutionName: string;
  region: string;
  stage: string;
  riskScore: number;
  riskCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  deadlineDaysRemaining: number;
  hasExpiringLease?: boolean;
  leaseExpiresInDays?: number;
  isEvcBlocked?: boolean;
}

interface SpatialHolodeckProps {
  cases: SpatialCaseNode[];
  onSelectCase: (c: SpatialCaseNode) => void;
  selectedCaseId?: string | null;
  temporalOffsetDays: number; // e.g. -15 (past) to +30 (future)
  activeIntervention: 'NONE' | 'FAST_TRACK_EVC' | 'SPECIAL_SCRUTINY_DRIVE' | 'PROVISIONAL_UNDERTAKING';
}

// Custom Central Monolith Prism
function CentralCore({
  isHighAlert = false,
  reducedMotion = false,
}: {
  isHighAlert: boolean;
  reducedMotion: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const wireRef = useRef<THREE.Mesh>(null!);
  const ringRef = useRef<THREE.Group>(null!);

  useFrame((state, delta) => {
    if (reducedMotion) return;
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.25;
      meshRef.current.rotation.x += delta * 0.12;
    }
    if (wireRef.current) {
      wireRef.current.rotation.y -= delta * 0.18;
      wireRef.current.rotation.z += delta * 0.08;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.1;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Primary Floating Platinum Monolith */}
      <mesh ref={meshRef} scale={[1.8, 2.4, 1.8]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#E1E4E8"
          metalness={0.95}
          roughness={0.12}
          envMapIntensity={1.5}
        />
      </mesh>

      {/* Wireframe Spatial Hologram Cage */}
      <mesh ref={wireRef} scale={[2.1, 2.7, 2.1]}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial
          color={isHighAlert ? '#FF626B' : '#C7CBD0'}
          wireframe
          transparent
          opacity={0.35}
        />
      </mesh>

      {/* Equatorial Telemetry Pulse Ring */}
      <group ref={ringRef} rotation={[Math.PI / 3, 0, 0]}>
        <mesh>
          <torusGeometry args={[3.2, 0.025, 16, 100]} />
          <meshBasicMaterial
            color={isHighAlert ? '#FF626B' : '#E1E4E8'}
            transparent
            opacity={0.4}
          />
        </mesh>
      </group>

      <pointLight position={[0, 0, 0]} intensity={180} color={isHighAlert ? '#FF626B' : '#C7CBD0'} distance={10} />
    </group>
  );
}

// Floating Spatial Institutional Satellite Node
function InstitutionalNode({
  node,
  position,
  isSelected,
  onClick,
  temporalOffsetDays,
  activeIntervention,
  reducedMotion,
}: {
  node: SpatialCaseNode;
  position: [number, number, number];
  isSelected: boolean;
  onClick: () => void;
  temporalOffsetDays: number;
  activeIntervention: string;
  reducedMotion: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);

  // Compute 4D temporal state for this node
  const dynamicState = useMemo(() => {
    let effectiveRisk = node.riskScore;
    let effectiveCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = node.riskCategory;
    let isRuptured = false;
    let ruptureReason = '';

    // Temporal Future Simulation (Scrubbing Forward)
    if (temporalOffsetDays > 0) {
      const projectedDeadlineRemaining = node.deadlineDaysRemaining - temporalOffsetDays;
      if (projectedDeadlineRemaining < 0) {
        effectiveRisk += 35;
        isRuptured = true;
        ruptureReason = `SLA Ruptured: ${Math.abs(projectedDeadlineRemaining)} days overdue`;
      }

      // Check lease expiry
      if (node.hasExpiringLease && node.leaseExpiresInDays !== undefined) {
        if (temporalOffsetDays >= node.leaseExpiresInDays) {
          effectiveRisk += 45;
          isRuptured = true;
          ruptureReason = `Lease Expired: Campus deed breached regulatory SLA`;
        }
      }
    }

    // Apply active intervention healing
    if (activeIntervention === 'FAST_TRACK_EVC' && (node.stage === 'EVC_PENDING' || node.isEvcBlocked)) {
      effectiveRisk = Math.max(10, effectiveRisk - 35);
      isRuptured = false;
    } else if (activeIntervention === 'PROVISIONAL_UNDERTAKING' && node.hasExpiringLease) {
      effectiveRisk = Math.max(15, effectiveRisk - 40);
      isRuptured = false;
    }

    effectiveRisk = Math.min(100, Math.max(0, effectiveRisk));
    if (effectiveRisk >= 80) effectiveCategory = 'CRITICAL';
    else if (effectiveRisk >= 55) effectiveCategory = 'HIGH';
    else if (effectiveRisk >= 25) effectiveCategory = 'MEDIUM';
    else effectiveCategory = 'LOW';

    return {
      risk: effectiveRisk,
      category: effectiveCategory,
      isRuptured,
      ruptureReason,
    };
  }, [node, temporalOffsetDays, activeIntervention]);

  useFrame((state, delta) => {
    if (reducedMotion) return;
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.4;
      meshRef.current.rotation.z += delta * 0.2;
    }
  });

  const getNodeColor = () => {
    if (dynamicState.category === 'CRITICAL') return '#FF626B'; // Critical Red
    if (dynamicState.category === 'HIGH') return '#F4B860'; // Warning Amber
    if (node.stage === 'APPROVED') return '#47D7A0'; // Success Green
    return '#C7CBD0'; // Brushed Platinum
  };

  const scale = isSelected ? 1.4 : hovered ? 1.25 : 1.0;

  return (
    <group position={position}>
      {/* Core Node Sphere / Polyhedron */}
      <mesh
        ref={meshRef}
        scale={[scale, scale, scale]}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <dodecahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial
          color={getNodeColor()}
          metalness={0.9}
          roughness={0.2}
          emissive={getNodeColor()}
          emissiveIntensity={hovered || isSelected ? 0.7 : 0.2}
        />
      </mesh>

      {/* Pulsing Alert Halo for Critical Cases */}
      {dynamicState.isRuptured && (
        <mesh scale={[scale * 1.6, scale * 1.6, scale * 1.6]}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial
            color="#FF626B"
            wireframe
            transparent
            opacity={0.4}
          />
        </mesh>
      )}

      {/* Floating Spatial Hologram HUD Tag */}
      <Html
        position={[0, 0.85, 0]}
        center
        distanceFactor={12}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div
          className={`px-2.5 py-1 rounded-lg backdrop-blur-md font-mono text-[11px] whitespace-nowrap transition-all border shadow-lg ${
            isSelected
              ? 'bg-platinum text-obsidian border-white font-bold scale-110'
              : dynamicState.category === 'CRITICAL'
              ? 'bg-status-critical/80 text-white border-status-critical font-bold animate-pulse'
              : 'bg-graphite/85 text-silver border-graphite-border hover:border-platinum'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                dynamicState.category === 'CRITICAL'
                  ? 'bg-white'
                  : dynamicState.category === 'HIGH'
                  ? 'bg-status-warning'
                  : 'bg-status-success'
              }`}
            />
            <span>{node.applicationNumber}</span>
          </div>

          <div className="text-[9px] opacity-85 truncate max-w-[130px]">
            {node.institutionName.split(' ')[0]} • Risk: {dynamicState.risk}
          </div>

          {dynamicState.isRuptured && (
            <div className="text-[8px] text-white bg-black/60 px-1 rounded mt-0.5 font-sans font-semibold">
              ⚠️ {dynamicState.ruptureReason}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

// 3D Curved Laser Data Highways connecting Nodes to Central Prism
function LaserHighway({
  start,
  end,
  color,
  isBroken = false,
}: {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
  isBroken?: boolean;
}) {
  const lineRef = useRef<THREE.Line>(null!);

  const points = useMemo(() => {
    const midX = (start[0] + end[0]) * 0.5;
    const midY = (start[1] + end[1]) * 0.5 + 0.8; // subtle curve
    const midZ = (start[2] + end[2]) * 0.5;

    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...start),
      new THREE.Vector3(midX, midY, midZ),
      new THREE.Vector3(...end)
    );

    return curve.getPoints(24);
  }, [start, end]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [points]);

  return (
    <primitive
      object={
        new THREE.Line(
          geometry,
          new THREE.LineBasicMaterial({
            color: isBroken ? '#FF626B' : color,
            transparent: true,
            opacity: isBroken ? 0.35 : 0.45,
            linewidth: isBroken ? 1 : 2,
          })
        )
      }
      ref={lineRef}
    />
  );
}

export function SpatialHolodeck({
  cases,
  onSelectCase,
  selectedCaseId,
  temporalOffsetDays,
  activeIntervention,
}: SpatialHolodeckProps) {
  const { reducedMotion } = useAuth();

  // Position nodes in an orbital ring around the central prism
  const nodePositions = useMemo(() => {
    const total = cases.length || 6;
    const radius = 6.2;
    return cases.map((_, i) => {
      const angle = (i / total) * Math.PI * 2;
      const height = Math.sin(i * 1.8) * 1.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      return [x, height, z] as [number, number, number];
    });
  }, [cases]);

  const isHighAlert = cases.some((c) => c.riskCategory === 'CRITICAL');

  return (
    <div className="relative w-full h-full min-h-[580px] bg-obsidian rounded-2xl overflow-hidden border border-graphite-border shadow-2xl select-none">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 4, 12], fov: 48 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 15, 10]} intensity={1.5} color="#FFFFFF" />
        <pointLight position={[-10, -10, -10]} intensity={50} color="#858B95" />

        <OrbitControls
          enablePan={false}
          maxDistance={18}
          minDistance={6}
          autoRotate={!reducedMotion && !selectedCaseId}
          autoRotateSpeed={0.4}
          dampingFactor={0.05}
        />

        {/* Ambient Spatial Particles */}
        <Sparkles
          count={100}
          scale={16}
          size={reducedMotion ? 0 : 2}
          speed={reducedMotion ? 0 : 0.4}
          color="#C7CBD0"
        />

        {/* Central PRISM Monolith */}
        <CentralCore isHighAlert={isHighAlert} reducedMotion={reducedMotion} />

        {/* Laser Data Highways Connecting Central Prism to Satellites */}
        {nodePositions.map((pos, idx) => (
          <LaserHighway
            key={`laser-${idx}`}
            start={[0, 0, 0]}
            end={pos}
            color="#C7CBD0"
            isBroken={cases[idx]?.riskCategory === 'CRITICAL'}
          />
        ))}

        {/* Institutional Satellites in 3D Space */}
        {cases.map((c, idx) => (
          <InstitutionalNode
            key={c.id}
            node={c}
            position={nodePositions[idx]}
            isSelected={selectedCaseId === c.id}
            onClick={() => onSelectCase(c)}
            temporalOffsetDays={temporalOffsetDays}
            activeIntervention={activeIntervention}
            reducedMotion={reducedMotion}
          />
        ))}
      </Canvas>

      {/* Spatial HUD Overlay Legend */}
      <div className="absolute top-4 left-4 pointer-events-none space-y-1">
        <div className="flex items-center gap-2 bg-obsidian/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-graphite-border font-mono text-xs text-platinum">
          <span className="w-2 h-2 rounded-full bg-status-success animate-ping" />
          <span>SPATIAL HOLODECK // AICTE ORBITAL NETWORK</span>
        </div>
        <p className="text-[10px] font-mono text-slate-muted pl-1">
          Click any satellite node to lock focus & open instant Case Dossier
        </p>
      </div>

      {/* Orbit Controls Tip */}
      <div className="absolute bottom-4 right-4 pointer-events-none text-[10px] font-mono text-slate-muted bg-obsidian/70 backdrop-blur-md px-2.5 py-1 rounded border border-graphite-border">
        <span>Left-click & drag to orbit • Scroll to zoom</span>
      </div>
    </div>
  );
}
export default SpatialHolodeck;
