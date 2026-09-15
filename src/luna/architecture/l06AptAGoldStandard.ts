// Luna Architectural Reality V2 — L06 Apartment A canonical room registry
// (brief Parts 5/6/7/21). This is the single artifact tying together
// everything this phase established: the extracted/normalized procedural
// reference data, the structural coordination check, and the derived MEP
// interfaces — never a second, independently hand-authored data set. Every
// field is either read straight off LUNA_L06_APT_A (the same interior
// data rendered/camera-framed/device-populated since Phase 3) or computed
// from it; nothing here is invented.
//
// STATUS: PROCEDURAL_REFERENCE. This is explicitly NOT a claim of
// architectural truth — see L06_APT_A_SOURCE_FRAME (l06AptAFrame.ts),
// which discloses "Architectural Gold Standard source pending" because no
// real architect-produced source exists yet for L06 Apartment A anywhere
// in this repository.

import { LUNA_L06_APT_A, type RoomLayoutSpec } from "../interiors/lunaInteriors";
import type { DoorSide } from "../../engine/components/InteriorRoom";
import { LUNA_L06_APT_A_ADAPTER_ID, l06AptADoorRef, l06AptARoomGeometryRef, roomSourceType } from "../ingestion/lunaL06AptAAdapter";
import { deriveL06AptARoomServiceInterfaces, type RoomServiceInterface } from "./l06AptAServiceInterfaces";
import { checkL06AptAStructuralCoordination, type StructuralCoordinationFinding } from "./l06AptAStructuralCoordination";
import { L06_APT_A_FRAME_CONTRACT, L06_APT_A_SOURCE_FRAME } from "./l06AptAFrame";

export type RepresentationStatus = "PROCEDURAL_REFERENCE"; // the only status this phase can honestly assign — see file header

export interface CanonicalRoomRecord {
  canonicalRef: string;
  sourceId: string;
  sourceAdapter: string;
  name: string;
  roomType: string;
  parentApartmentRef: string;
  levelRef: string;
  geometryRef: string;
  boundary: { x: number; z: number; width: number; depth: number };
  area: number;
  centroid: { x: number; z: number };
  doors: Array<{ ref: string; wall: DoorSide }>;
  windows: []; // always empty — see file header + adapter's own disclosed warning; UNRESOLVED, never fabricated
  serviceInterfaces: RoomServiceInterface[];
  representationStatus: RepresentationStatus;
  confidence: number;
  reviewStatus: "PROPOSED"; // matches the real ReviewStatus this room's mapping actually carries in the ProjectStore until a human/Oyi review action changes it
}

function buildRoomRecord(room: RoomLayoutSpec, serviceInterfacesByRoom: Map<string, RoomServiceInterface[]>): CanonicalRoomRecord {
  return {
    canonicalRef: room.ref,
    sourceId: room.ref,
    sourceAdapter: LUNA_L06_APT_A_ADAPTER_ID,
    name: room.label,
    roomType: roomSourceType(room),
    parentApartmentRef: LUNA_L06_APT_A.interiorRef,
    levelRef: LUNA_L06_APT_A.ownerLevelRef,
    geometryRef: l06AptARoomGeometryRef(room),
    boundary: { x: room.x, z: room.z, width: room.width, depth: room.depth },
    area: Math.round(room.width * room.depth * 100) / 100,
    centroid: { x: room.x, z: room.z }, // RoomLayoutSpec's x/z IS the rect center — no separate centroid computation needed
    // UPDATED (Apartment A Full Interior Reality V1): rooms now carry
    // their real door(s) via `doors` (which superseded the single
    // `doorSide` field) and can legitimately have more than one — map
    // every entry, matching the ingestion adapter's own per-index refs
    // (l06AptADoorRef(room.ref, index)) rather than reporting only door 1.
    doors: (room.doors ?? []).map((door, index) => ({ ref: l06AptADoorRef(room.ref, index), wall: door.side })),
    windows: [],
    serviceInterfaces: serviceInterfacesByRoom.get(room.ref) ?? [],
    representationStatus: "PROCEDURAL_REFERENCE",
    confidence: 1, // extraction confidence — this IS the existing accepted procedural room, read faithfully (see adapter)
    reviewStatus: "PROPOSED",
  };
}

export function buildL06AptAGoldStandardRegistry(): {
  apartmentRef: string;
  levelRef: string;
  sourceStatus: typeof L06_APT_A_SOURCE_FRAME;
  frameContractVersion: number;
  structuralCoordination: StructuralCoordinationFinding;
  rooms: CanonicalRoomRecord[];
} {
  const serviceInterfacesByRoom = deriveL06AptARoomServiceInterfaces();
  return {
    apartmentRef: LUNA_L06_APT_A.interiorRef,
    levelRef: LUNA_L06_APT_A.ownerLevelRef,
    sourceStatus: L06_APT_A_SOURCE_FRAME,
    frameContractVersion: L06_APT_A_FRAME_CONTRACT.version,
    structuralCoordination: checkL06AptAStructuralCoordination(),
    rooms: LUNA_L06_APT_A.rooms.map((room) => buildRoomRecord(room, serviceInterfacesByRoom)),
  };
}
