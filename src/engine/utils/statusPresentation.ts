import type { OperationalStatus } from "../twinRuntime";

/** A restrained, consistent visual language for operational status — the
 * same five colors regardless of building or system, so a marker's state
 * reads at a glance without turning the scene into a game HUD. "normal"
 * and "active" keep the asset's own system color (they're not alerts);
 * only warning/critical/offline introduce a distinct color. */
export function statusTint(baseColor: string, status: OperationalStatus): { color: string; emissiveIntensity: number; pulse: boolean } {
  switch (status) {
    case "critical":
      return { color: "#e8503c", emissiveIntensity: 1.1, pulse: true };
    case "warning":
      return { color: "#f2b544", emissiveIntensity: 0.85, pulse: false };
    case "offline":
      return { color: "#53565f", emissiveIntensity: 0.12, pulse: false };
    case "active":
      return { color: baseColor, emissiveIntensity: 0.95, pulse: false };
    case "normal":
    default:
      return { color: baseColor, emissiveIntensity: 0.45, pulse: false };
  }
}
