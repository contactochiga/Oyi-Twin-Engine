/** Building-agnostic render-quality profile (Phase 11 section 22) — lets a
 * host pick a lighter rendering path for a small embedded card without any
 * building-specific logic living here. "embedded": no shadow pass, capped
 * pixel ratio — for Facility/Consumer host cards. "standard": the
 * standalone dev-harness default. "high": the expanded/full-screen Command
 * View experience. Purely a hint hosts opt into; omitting it everywhere
 * keeps today's behavior unchanged (defaults to "standard"). */
export type RenderQuality = "embedded" | "standard" | "high";

export function shadowsEnabledFor(quality: RenderQuality): boolean {
  return quality !== "embedded";
}

export function dprFor(quality: RenderQuality): [number, number] {
  if (quality === "embedded") return [1, 1.25];
  if (quality === "high") return [1, 2];
  return [1, 1.75];
}
