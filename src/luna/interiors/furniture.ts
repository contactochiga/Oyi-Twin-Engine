import type { BoxSpec } from "../../engine/utils/geometryUtils";

// Simple furniture blockouts, not modeled pieces — Phase 3 scope is
// "clearly readable as a bedroom / kitchen / living room," not furniture
// catalog fidelity. Every generator returns parts positioned relative to
// (0,0) at floor level; `place()` rotates and translates that cluster to
// wherever the room needs it, so a single generator works in any corner
// facing any direction.

function rotate(dx: number, dz: number, angle: number): [number, number] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [dx * cos - dz * sin, dx * sin + dz * cos];
}

/** Rotates + translates a furniture cluster (already centered on 0,0) into
 * its final room position, preserving each part's own size and adding the
 * cluster rotation to each part's own rotation. */
export function place(parts: BoxSpec[], cx: number, cz: number, rotationY = 0): BoxSpec[] {
  return parts.map((part) => {
    const [dx, dz] = rotate(part.position[0], part.position[2], rotationY);
    return {
      size: part.size,
      position: [cx + dx, part.position[1], cz + dz],
      rotationY: (part.rotationY ?? 0) + rotationY,
    };
  });
}

export const furniture = {
  bed(): BoxSpec[] {
    return [
      { size: [1.9, 0.55, 2.1], position: [0, 0.275, 0] }, // mattress/base
      { size: [1.9, 0.35, 0.12], position: [0, 0.72, -1.02] }, // headboard
      { size: [0.5, 0.5, 0.45], position: [-1.25, 0.25, -0.85] }, // nightstand L
      { size: [0.5, 0.5, 0.45], position: [1.25, 0.25, -0.85] }, // nightstand R
      { size: [0.7, 1.9, 0.5], position: [-1.35, 0.95, -0.3] }, // wardrobe
    ];
  },
  sofaAndTable(): BoxSpec[] {
    return [
      { size: [2.6, 0.7, 0.95], position: [0, 0.35, 0] }, // sofa
      { size: [2.6, 0.35, 0.2], position: [0, 0.55, -0.55] }, // sofa back
      { size: [1.2, 0.35, 0.6], position: [0, 0.18, 1.1] }, // coffee table
      { size: [2.2, 1.3, 0.18], position: [0, 0.65, 1.9] }, // media wall panel, facing the sofa
      { size: [1.4, 0.08, 0.35], position: [0, 1.15, 1.82] }, // media console shelf on the wall
    ];
  },
  diningSet(): BoxSpec[] {
    const chairs: BoxSpec[] = [];
    const chairSpots: Array<[number, number]> = [
      [-1.1, 0],
      [1.1, 0],
      [0, -0.85],
      [0, 0.85],
    ];
    for (const [x, z] of chairSpots) chairs.push({ size: [0.45, 0.45, 0.45], position: [x, 0.225, z] });
    return [{ size: [1.6, 0.4, 0.9], position: [0, 0.4, 0] }, ...chairs];
  },
  kitchenCounter(length: number): BoxSpec[] {
    return [
      { size: [length, 0.9, 0.65], position: [0, 0.45, 0] }, // base cabinets + counter
      { size: [length, 0.08, 0.65], position: [0, 0.92, 0] }, // countertop overhang lip
      { size: [length * 0.94, 0.7, 0.32], position: [0, 1.55, -0.15] }, // upper cabinets
      { size: [1.2, 0.95, 1.2], position: [length / 2 - 0.8, 0.475, 1.1] }, // island
      { size: [1.2, 0.05, 1.2], position: [length / 2 - 0.8, 0.98, 1.1] }, // island countertop lip
    ];
  },
  vanityAndTub(): BoxSpec[] {
    return [
      { size: [0.9, 0.8, 0.5], position: [-0.9, 0.4, -0.9] }, // vanity
      { size: [0.7, 0.05, 0.45], position: [-0.9, 0.82, -0.9] }, // vanity counter
      { size: [1.6, 0.5, 0.8], position: [0.5, 0.25, 0.9] }, // tub / shower base
      { size: [0.42, 0.38, 0.45], position: [0.95, 0.19, -0.9] }, // toilet base
      { size: [0.38, 0.32, 0.14], position: [0.95, 0.5, -1.08] }, // toilet cistern
    ];
  },
  shelving(): BoxSpec[] {
    return [{ size: [1.6, 2, 0.4], position: [0, 1, 0] }];
  },
  console(): BoxSpec[] {
    return [{ size: [1.4, 0.85, 0.35], position: [0, 0.425, 0] }];
  },
  desk(): BoxSpec[] {
    return [
      { size: [1.4, 0.75, 0.7], position: [0, 0.375, 0] },
      { size: [0.5, 0.75, 0.5], position: [0, 0.375, -0.7] }, // chair
    ];
  },
  // Phase 12 light interior pass: one or two extra credible details per
  // piece — enough for these lower-priority spaces (Lobby/Club/Luna Sky)
  // to read as considered rather than blockout, well short of Apartment
  // 6A's full fidelity treatment.
  receptionDesk(length: number): BoxSpec[] {
    return [
      { size: [length, 1.1, 0.7], position: [0, 0.55, 0] }, // desk
      { size: [length * 0.9, 0.06, 0.7], position: [0, 1.13, 0] }, // stone counter lip
      { size: [length * 0.96, 1.6, 0.15], position: [0, 0.8, -0.55] }, // signage/back wall panel
    ];
  },
  loungeSeating(): BoxSpec[] {
    return [
      { size: [1.6, 0.6, 0.8], position: [-1, 0.3, 0] },
      { size: [1.6, 0.6, 0.8], position: [1, 0.3, 0] },
      { size: [0.9, 0.3, 0.9], position: [0, 0.15, 0] }, // coffee table
      { size: [2.2, 0.04, 2.2], position: [0, 0.02, 0] }, // area rug plinth
      { size: [0.18, 1.35, 0.18], position: [-1.9, 0.68, -0.9] }, // floor lamp
    ];
  },
  gymEquipmentRow(count: number): BoxSpec[] {
    const parts: BoxSpec[] = [];
    for (let i = 0; i < count; i++) parts.push({ size: [0.8, 1.4, 1.8], position: [i * 1.2 - ((count - 1) * 1.2) / 2, 0.7, 0] });
    parts.push({ size: [count * 1.2 + 0.4, 2.1, 0.06], position: [0, 1.05, -1.05] }); // mirror wall behind the row
    return parts;
  },
  pool(width: number, depth: number): BoxSpec[] {
    return [{ size: [width, 0.15, depth], position: [0, -0.08, 0] }];
  },
  loungers(count: number, spacing: number): BoxSpec[] {
    const parts: BoxSpec[] = [];
    for (let i = 0; i < count; i++) parts.push({ size: [0.7, 0.35, 1.9], position: [i * spacing - ((count - 1) * spacing) / 2, 0.175, 0] });
    return parts;
  },
  barCounter(length: number): BoxSpec[] {
    return [
      { size: [length, 1.05, 0.55], position: [0, 0.525, 0] }, // bar counter
      { size: [length * 0.92, 1.3, 0.12], position: [0, 1.35, -0.5] }, // back-bar shelf wall
      { size: [0.35, 0.75, 0.35], position: [-length * 0.3, 0.375, 0.6] }, // stool
      { size: [0.35, 0.75, 0.35], position: [length * 0.3, 0.375, 0.6] }, // stool
    ];
  },
  planter(): BoxSpec[] {
    return [{ size: [0.6, 0.5, 0.6], position: [0, 0.25, 0] }];
  },
  railing(length: number): BoxSpec[] {
    return [{ size: [length, 1.0, 0.08], position: [0, 0.5, 0] }];
  },
  // Apartment A Full Interior Reality V1 — the new room programme (guest
  // WC, compact corridor-fed ensuites, a real kitchen appliance run, a
  // dedicated utility room, standalone bedroom wardrobes) needs a few
  // pieces the original Phase 3 catalogue didn't: smaller/simpler
  // fixture clusters than the combined vanityAndTub(), never full
  // catalogue fidelity, matching this file's own established scope.
  guestWC(): BoxSpec[] {
    return [
      { size: [0.42, 0.38, 0.45], position: [0.55, 0.19, -0.6] }, // toilet base
      { size: [0.38, 0.32, 0.14], position: [0.55, 0.5, -0.78] }, // toilet cistern
      { size: [0.6, 0.75, 0.42], position: [-0.55, 0.375, -0.6] }, // basin unit
      { size: [0.5, 0.05, 0.32], position: [-0.55, 0.78, -0.6] }, // basin counter
    ];
  },
  vanityAndShower(): BoxSpec[] {
    return [
      { size: [0.85, 0.8, 0.48], position: [-0.85, 0.4, -0.85] }, // vanity
      { size: [0.65, 0.05, 0.43], position: [-0.85, 0.82, -0.85] }, // vanity counter
      { size: [0.95, 2.0, 0.06], position: [0.7, 1.0, 0.1] }, // shower glass screen
      { size: [0.9, 0.06, 0.9], position: [0.7, 0.03, 0.55] }, // shower tray
      { size: [0.4, 0.38, 0.43], position: [0.85, 0.19, -0.85] }, // toilet base
      { size: [0.36, 0.3, 0.13], position: [0.85, 0.5, -1.02] }, // toilet cistern
    ];
  },
  kitchenAppliances(): BoxSpec[] {
    return [
      { size: [0.75, 1.8, 0.68], position: [0, 0.9, 0] }, // fridge/freezer column
      { size: [0.9, 0.06, 0.65], position: [1.3, 0.93, 0] }, // cooktop panel (sits on the counter run)
      { size: [0.75, 0.6, 0.6], position: [1.3, 1.55, -0.2] }, // extractor hood
    ];
  },
  utilityUnit(): BoxSpec[] {
    return [
      { size: [0.65, 0.85, 0.62], position: [-0.6, 0.425, 0] }, // washer
      { size: [0.65, 0.85, 0.62], position: [0.15, 0.425, 0] }, // dryer
      { size: [1.5, 0.9, 0.4], position: [0.6, 1.5, -0.3] }, // storage shelf above
    ];
  },
  /** A wide-but-shallow ensuite (WC + basin + shower in a single row) — the
   * new corridor-fed ensuite bands (Apartment A Full Interior Reality V1)
   * are real, but shallow (~1.15m), too shallow for vanityAndTub()'s
   * roughly-square arrangement. */
  longEnsuite(length: number): BoxSpec[] {
    return [
      { size: [0.4, 0.38, 0.42], position: [-length / 2 + 0.4, 0.19, 0] }, // WC base
      { size: [0.36, 0.3, 0.13], position: [-length / 2 + 0.4, 0.5, -0.16] }, // WC cistern
      { size: [0.55, 0.8, 0.42], position: [0, 0.4, 0] }, // basin unit
      { size: [0.5, 0.05, 0.4], position: [0, 0.82, 0] }, // basin counter
      { size: [0.85, 1.9, 0.05], position: [length / 2 - 0.5, 0.95, 0] }, // shower glass screen
      { size: [0.85, 0.06, 0.85], position: [length / 2 - 0.5, 0.03, 0] }, // shower tray
    ];
  },
  wardrobeRun(length: number): BoxSpec[] {
    return [
      { size: [length, 2.1, 0.62], position: [0, 1.05, 0] },
      { size: [length * 0.96, 0.04, 0.02], position: [0, 1.9, 0.31] }, // door reveal line (visual detail only)
    ];
  },
};
