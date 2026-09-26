import { LUNA_LEVELS } from '../lunaProgramme';

/** Decorative planting only. Exclude the canonical Ground envelope and the
 * existing central arrival axis; this never edits walkable/navigation geometry. */
export function sitePlantingLayout(width: number, depth: number) {
  const ground = LUNA_LEVELS.find(level => level.ref === 'LUNA-GROUND')!.footprint;
  const halfX = ground.width / 2 + 1.35, halfZ = ground.depth / 2 + 1.35;
  return Array.from({ length: 14 }, (_, i) => {
    const angle = i / 14 * Math.PI * 2;
    let x = Math.cos(angle) * (width / 2 - 3) * (.85 + .15 * Math.sin(i * 2.1));
    let z = Math.sin(angle) * (depth / 2 - 3) * (.85 + .15 * Math.cos(i * 1.7));
    if (Math.abs(x) < halfX && Math.abs(z) < halfZ) {
      if (halfX - Math.abs(x) < halfZ - Math.abs(z)) x = Math.sign(x || 1) * halfX;
      else z = Math.sign(z || 1) * halfZ;
    }
    // Keep decorative bed edges outside the 14m-wide arrival band.
    if (z > ground.depth / 2 && Math.abs(x) < 8.35) x = Math.sign(x || 1) * 8.35;
    return { position: [x, .16, z] as [number, number, number], scale: [1.8, 1.4, 1.8] as [number, number, number] };
  });
}

/** Current four palms, kept outside the canopy and outer Ground posts. */
export function sitePalmPlacements(siteDepth:number):Array<[number,number,number]> {
  const width=LUNA_LEVELS.find(level=>level.ref==='LUNA-GROUND')!.footprint.width;
  return [[-width*.31-3.3,0,siteDepth/2-1],[width*.31+3.3,0,siteDepth/2-1],[-width/2-3.3,0,siteDepth/2-8],[width/2+3.3,0,siteDepth/2-8]];
}
