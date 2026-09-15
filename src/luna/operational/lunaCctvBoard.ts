// CCTV & Spatial Security System V1 — the CCTV Control Board's asset
// selector, the seventh SystemControlBoard consumer after Elevators,
// Water, Electrical, Fire, HVAC and Access. All four registered cameras
// (Master Equipment Schedule's own "Current instance register") are
// common infrastructure — FULL_3D for Facility, unchanged. The apartment
// video intercom is deliberately NOT a tab here: it is HIDDEN to Facility
// (same private-unit boundary as Access V1's own entrance lock), reached
// only via the camera-monitored_by relationship from the access point,
// never listed as an independent CCTV-board asset.
import { CCTV_CAMERA_REFS } from "../runtime/lunaCameraResolver";

export interface CctvBoardAsset {
  ref: string;
  shortLabel: string;
}

export const CCTV_BOARD_ASSETS: CctvBoardAsset[] = [
  { ref: CCTV_CAMERA_REFS[0], shortLabel: "Camera 01" },
  { ref: CCTV_CAMERA_REFS[1], shortLabel: "Camera 02" },
  { ref: CCTV_CAMERA_REFS[2], shortLabel: "Camera 03" },
  { ref: CCTV_CAMERA_REFS[3], shortLabel: "Camera 04" },
];

const CCTV_BOARD_REFS = new Set(CCTV_BOARD_ASSETS.map((a) => a.ref));

export function isCctvBoardRef(ref: string): boolean {
  return CCTV_BOARD_REFS.has(ref);
}

export function cctvBoardTabKeyFor(ref: string): string {
  return ref;
}

export const CCTV_BOARD_DEFAULT_REF = CCTV_CAMERA_REFS[0];
