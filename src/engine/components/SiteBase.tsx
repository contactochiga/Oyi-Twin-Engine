import { useMemo } from "react";

interface SiteBaseProps {
  width: number;
  depth: number;
  groundColor?: string;
  landscapeAccentColor?: string;
}

/** A minimal stylised site plate: a ground plane plus a handful of low-poly
 * "planting" markers around the perimeter. Phase 1 deliberately keeps
 * landscaping schematic rather than attempting real botanical assets. */
export function SiteBase({ width, depth, groundColor = "#3d4a3c", landscapeAccentColor = "#4f7a4a" }: SiteBaseProps) {
  const plantingSpots = useMemo(() => {
    const spots: Array<[number, number]> = [];
    const marginX = width / 2 - 3;
    const marginZ = depth / 2 - 3;
    const count = 14;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const rx = marginX * (0.85 + 0.15 * Math.sin(i * 2.1));
      const rz = marginZ * (0.85 + 0.15 * Math.cos(i * 1.7));
      spots.push([Math.cos(angle) * rx, Math.sin(angle) * rz]);
    }
    return spots;
  }, [width, depth]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.05, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={groundColor} roughness={1} />
      </mesh>
      {plantingSpots.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.6, 0]} castShadow>
            <coneGeometry args={[0.9, 1.8, 7]} />
            <meshStandardMaterial color={landscapeAccentColor} roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.15, 0.18, 0.5, 6]} />
            <meshStandardMaterial color="#5b4636" roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
