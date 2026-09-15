// Luna Residences — Facility-view resident/lease reference data (Phase 16A).
//
// DISCLOSURE: resident identity, lease status, and next-due dates do not
// exist anywhere in this project's canonical data (confirmed by the Phase
// 16A audit — occupancy alone is real for 5 units; nothing about WHO
// occupies a unit or their lease terms has ever been modeled). This file
// is explicit, deterministic REFERENCE data — not fabricated per-render,
// not random, but not backend-real either — so the Facility Apartment Card
// (Phase 16A) has something genuine and stable to render. This is the same
// "canonical-STYLE, not backend-real, explicitly disclosed" pattern
// lunaInteriors.ts already established for 5 of its 6 interiors.
//
// Deliberately does NOT model a "Facility Fee" field — the Phase 16A brief
// explicitly requires that field removed from the Facility apartment card
// (Facility manages the residence as an operational/service
// responsibility, not a billing relationship the twin needs to surface).

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(h, 31) + str.charCodeAt(i)) | 0;
  return h >>> 0;
}

// A small, deliberately non-specific name pool — resident identity here is
// reference data standing in for a real CRM/lease-management integration,
// not a claim about any real person.
const RESIDENT_NAMES = [
  "Mr. A. Okafor",
  "Mrs. F. Adeyemi",
  "Mr. C. Balogun",
  "Ms. T. Nwosu",
  "Mr. E. Okonkwo",
  "Mrs. B. Yusuf",
  "Mr. O. Eze",
  "Ms. K. Adebayo",
];

export type LeaseStatus = "Active" | "Renewal Pending" | "New";

export interface ResidentStub {
  residentName: string;
  leaseStatus: LeaseStatus;
  nextDue: string;
}

const LEASE_STATUSES: LeaseStatus[] = ["Active", "Active", "Active", "Renewal Pending", "New"];

/** Deterministic reference resident/lease record for an occupied unit.
 * Returns undefined for non-occupied units — an available/reserved unit
 * has no resident to show. */
export function residentStubFor(unitRef: string, lifecycle: "occupied" | "available" | "reserved"): ResidentStub | undefined {
  if (lifecycle !== "occupied") return undefined;
  const h = hash(unitRef);
  const residentName = RESIDENT_NAMES[h % RESIDENT_NAMES.length];
  const leaseStatus = LEASE_STATUSES[(h >>> 3) % LEASE_STATUSES.length];
  // A stable reference due-date within the next ~60 days, derived from the
  // ref (not from "today") so it doesn't silently drift/expire each time
  // someone opens the card.
  const dayOffset = 5 + ((h >>> 6) % 55);
  const due = new Date(Date.UTC(2026, 9, 1)); // fixed reference epoch, Oct 1 2026
  due.setUTCDate(due.getUTCDate() + dayOffset);
  const nextDue = due.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return { residentName, leaseStatus, nextDue };
}
