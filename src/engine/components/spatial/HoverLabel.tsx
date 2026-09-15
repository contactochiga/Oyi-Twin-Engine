import { useHover } from "../../hooks/useHover";
import { GLASS_SURFACE } from "./glassStyle";

/** A small glass label that follows the pointer over real canonical
 * geometry — "L06 · Residential", "Living Room", "AC · 22°C" (Phase 12).
 * Plain DOM, not a 3D-projected <Html>: it reads screen coordinates
 * already captured at the pointer event (see useCanonicalHoverHandlers),
 * so it never fights the 3D projection math or lags a frame behind the
 * cursor. Rendered as a sibling of the Canvas, not inside it.
 *
 * Uses inline GLASS_SURFACE like every other Spatial Glass primitive
 * (never a bare className) — this package ships with no stylesheet of its
 * own, so a class-only style here would silently render unstyled in every
 * host. Caught the hard way: screenX/screenY had no visible effect without
 * position:fixed, which only an inline style (not an unstyled div) sets. */
export function HoverLabel() {
  const { hovered } = useHover();
  if (!hovered) return null;

  return (
    <div
      aria-hidden
      style={{
        ...GLASS_SURFACE,
        position: "fixed",
        left: hovered.screenX + 16,
        top: hovered.screenY + 16,
        padding: "6px 10px",
        pointerEvents: "none",
        zIndex: 30,
      }}
    >
      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{hovered.label}</div>
      {hovered.detail && <div style={{ fontSize: 11, opacity: 0.65, marginTop: 1 }}>{hovered.detail}</div>}
    </div>
  );
}
