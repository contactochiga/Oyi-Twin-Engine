import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface RouteHighlightLineProps {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
}

/** A deliberately different visual language from SystemRelationshipLine —
 * always fully visible regardless of Systems Mode state, thicker, and
 * gently pulsing — because this line's entire purpose is to be the thing
 * Oyi just told the user to look at ("show me the water route to
 * Apartment 6A"), not ambient infrastructure context. It never fades with
 * useSystemAssetOpacity; the host clears the route (empty ref list) when
 * the reveal is done. */
export function RouteHighlightLine({ from, to, color }: RouteHighlightLineProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  const { geometry, position, quaternion } = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const dir = new THREE.Vector3().subVectors(end, start);
    const length = Math.max(dir.length(), 0.001);
    const geo = new THREE.CylinderGeometry(0.09, 0.09, length, 8);
    geo.translate(0, length / 2, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { geometry: geo, position: start, quaternion: quat };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from[0], from[1], from[2], to[0], to[1], to[2]]);

  useFrame(({ clock }) => {
    const mat = materialRef.current;
    if (!mat) return;
    mat.opacity = 0.75 + Math.sin(clock.elapsedTime * 3) * 0.2;
  });

  return (
    <mesh ref={meshRef} geometry={geometry} position={position} quaternion={quaternion}>
      <meshBasicMaterial ref={materialRef} color={color} transparent opacity={0.9} depthTest={false} />
    </mesh>
  );
}
