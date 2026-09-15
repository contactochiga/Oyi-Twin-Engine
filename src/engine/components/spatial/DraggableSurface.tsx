import { useEffect, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from "react";
import { GLASS_ACCENT } from "./glassStyle";
import type { ScreenRect } from "../SelectionFrameProbe";

// Phase 16A §17 — below this width, cards stop being draggable floating
// zones (there's no room for 4 named zones on a phone-width screen) and
// become an anchored bottom sheet instead: no drag gesture required to
// reach any info/action, matching the brief's explicit mobile rule.
const COMPACT_BREAKPOINT = 680;

function useIsCompact(): boolean {
  const [compact, setCompact] = useState(() => typeof window !== "undefined" && window.innerWidth < COMPACT_BREAKPOINT);
  useEffect(() => {
    const onResize = () => setCompact(window.innerWidth < COMPACT_BREAKPOINT);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return compact;
}

// Oyi Twin Engine — controlled, bounded, snap-positioned draggable card
// shell (Phase 16A §9). Deliberately NOT a free-floating desktop window:
// a card can only ever rest at one of four named zones; dragging is a
// live preview that always resolves to the nearest zone on release, never
// an arbitrary saved (x,y).
//
// OrbitControls conflict: this component's drag handle uses Pointer
// Events with explicit pointer capture (`setPointerCapture`), and the
// pointerdown handler calls `stopPropagation()`. Three.js's OrbitControls
// only ever starts tracking a drag from a pointerdown that originates
// directly on ITS OWN domElement (the <canvas>) — a pointerdown that
// starts on this card's DOM node (which sits above the canvas in normal
// document stacking order, so the browser's own hit-testing delivers the
// event here, never to the canvas underneath) never reaches OrbitControls
// at all, with or without stopPropagation. The explicit capture +
// stopPropagation here is the defensive, belt-and-braces version of that
// same guarantee, matching the brief's explicit ask to use Pointer Events
// and prevent any conflict, not just rely on implicit DOM stacking.
export type DockZone = "left" | "right" | "bottom-left" | "bottom-right";

interface ZoneAnchor {
  style: React.CSSProperties;
  /** Approximate screen-space anchor point used purely to find the
   * NEAREST zone on drag release — not the actual rendered position
   * (that's `style`, which uses left/right/top/bottom so it stays correct
   * across window resizes). */
  point: (vw: number, vh: number) => { x: number; y: number };
}

// Reserved-space rule (brief §9): never permanently cover the level rail
// (left edge, vertically centered, ~70px wide), the Oyi orb (bottom-
// right, ~56-340px), or the top-right weather/time + profile stack
// (right edge, top:56, ~140px tall — see App.tsx's presentation-mode
// chrome). "right"/"bottom-right" therefore start below that stack, not
// at top:96 (confirmed overlapping it in real-browser verification);
// "left"/"bottom-left" sit beside the rail, clear of it either way. The
// top-right cluster shrank to one horizontal row in the Presentation Mode
// polish pass (weather | Facility Manager, ~52px tall, see App.tsx), so
// "right" only needs to start below THAT, not the old two/three-row stack.
const ZONES: Record<DockZone, ZoneAnchor> = {
  left: { style: { left: "calc(110px + var(--sidebar-shift, 0px))", top: 96 }, point: (_vw, vh) => ({ x: 92 + 140, y: 96 + vh * 0.25 }) },
  right: { style: { right: 16, top: 96 }, point: (vw, vh) => ({ x: vw - 16 - 140, y: 96 + vh * 0.2 }) },
  "bottom-left": { style: { left: "calc(110px + var(--sidebar-shift, 0px))", bottom: 96 }, point: (_vw, vh) => ({ x: 92 + 140, y: vh - 96 - vh * 0.2 }) },
  "bottom-right": { style: { right: 16, bottom: 96 }, point: (vw, vh) => ({ x: vw - 16 - 140, y: vh - 96 - vh * 0.2 }) },
};

// Phase 16A correction §3 — collision-aware relocation only ever mirrors
// left<->right (or bottom-left<->bottom-right): those are the two pairs
// that sit on opposite sides of the same vertical band, so "move to
// protect the subject" always reads as a clean side-swap, never a jump to
// an unrelated corner.
const MIRROR_ZONE: Record<DockZone, DockZone> = {
  left: "right",
  right: "left",
  "bottom-left": "bottom-right",
  "bottom-right": "bottom-left",
};

// Material overlap threshold (CSS px) before the card is considered to be
// "obstructing" the selected geometry — a sliver of edge overlap doesn't
// count, matching the brief's "ONLY when materially obstructs" wording.
const COLLISION_THRESHOLD_PX = 28;

function nearestZone(x: number, y: number, vw: number, vh: number): DockZone {
  let best: DockZone = "left";
  let bestDist = Infinity;
  (Object.keys(ZONES) as DockZone[]).forEach((zone) => {
    const p = ZONES[zone].point(vw, vh);
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = zone;
    }
  });
  return best;
}

export interface DraggableSurfaceProps {
  zone: DockZone;
  onZoneChange: (zone: DockZone) => void;
  children: ReactNode;
  /** Phase 16A correction §3 — the current on-screen rect of whatever 3D
   * geometry the camera is framing (from `SelectionFrameProbe`), if any.
   * When the card's OWN rendered rect materially overlaps this, the card
   * relocates itself to the mirrored zone (left<->right) to protect the
   * shot — collision-aware layout, not arbitrary panel jumping. `null`/
   * omitted means "nothing to protect," so the card just stays put. */
  avoidRect?: ScreenRect | null;
}

/** Bounded/snap draggable wrapper (Phase 16A §9). The grip in the
 * top-right corner is the ONLY drag-initiating region — an overlay hit
 * target, not a separate visual header bar, so the card underneath
 * (whatever glass surface the caller renders as `children`) stays exactly
 * as designed. Clicking/interacting with `children` anywhere else is
 * ordinary DOM interaction, never mistaken for a drag gesture. */
export function DraggableSurface({ zone, onZoneChange, children, avoidRect }: DraggableSurfaceProps) {
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const compact = useIsCompact();

  // Collision-aware relocation (correction §3): only runs on desktop
  // (mobile's bottom sheet is already clear of the twin), only reacts to
  // NEW avoidRect values (SelectionFrameProbe already debounces those to
  // real movement, so this effectively fires once per camera settle, not
  // every frame), and never fights an in-progress manual drag.
  useEffect(() => {
    if (compact || !avoidRect || dragOffset) return;
    const el = surfaceRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const overlapX = Math.min(rect.right, avoidRect.right) - Math.max(rect.left, avoidRect.left);
    const overlapY = Math.min(rect.bottom, avoidRect.bottom) - Math.max(rect.top, avoidRect.top);
    if (overlapX > COLLISION_THRESHOLD_PX && overlapY > COLLISION_THRESHOLD_PX) {
      onZoneChange(MIRROR_ZONE[zone]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avoidRect, compact]);

  const onHandlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY };
    setDragOffset({ x: 0, y: 0 });
  };

  const onHandlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    e.stopPropagation();
    setDragOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };

  const onHandlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!dragStart.current || !surfaceRef.current) {
      setDragOffset(null);
      dragStart.current = null;
      return;
    }
    const rect = surfaceRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const next = nearestZone(cx, cy, window.innerWidth, window.innerHeight);
    dragStart.current = null;
    setDragOffset(null);
    if (next !== zone) onZoneChange(next);
  };

  // Phase 16A §17 — compact/mobile: an anchored bottom sheet, not a
  // draggable floating zone. Dragging isn't required to reach anything
  // here (the brief's own mobile rule), so no grip is rendered at all;
  // `zone`/`onZoneChange` are simply unused on this path. Anchored above
  // the bottom dock (~18 + ~50px tall, see App.tsx's ModeDock wrapper) so
  // the sheet never covers it or the collapsed Oyi orb next to it.
  if (compact) {
    return (
      <div className="context-surface"
        style={{
          position: "absolute",
          left: 86,
          right: 10,
          bottom: 78,
          maxHeight: "58vh",
          overflowY: "auto",
          pointerEvents: "auto",
          zIndex: 25,
        }}
      >
        {children}
      </div>
    );
  }

  const base = ZONES[zone].style;
  const transform = dragOffset ? `translate(${dragOffset.x}px, ${dragOffset.y}px)` : undefined;

  return (
    <div className="context-surface"
      ref={surfaceRef}
      style={{
        position: "absolute",
        ...base,
        transform,
        transition: dragOffset ? "none" : "left 0.25s ease, right 0.25s ease, top 0.25s ease, bottom 0.25s ease",
        pointerEvents: "auto",
        zIndex: dragOffset ? 40 : 25,
      }}
    >
      <div style={{ position: "relative" }}>
        {children}
        <div
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          role="button"
          aria-label="Move card"
          title="Drag to reposition"
          style={{
            position: "absolute",
            top: 6,
            right: 34,
            width: 22,
            height: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: dragOffset ? "grabbing" : "grab",
            touchAction: "none",
            userSelect: "none",
            fontSize: 13,
            letterSpacing: 1,
            opacity: 0.4,
            color: GLASS_ACCENT,
            borderRadius: 6,
          }}
        >
          ⠿
        </div>
      </div>
    </div>
  );
}
