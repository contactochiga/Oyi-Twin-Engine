import { createContext, useContext, type Dispatch, type SetStateAction } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { CanonicalRef, TwinNodeKind } from "../types";

/** What's under the pointer right now — derived from a real raycast hit
 * on real canonical geometry (Phase 12's "no fake screen-coordinate
 * hotspots" requirement), never a hand-placed overlay position. */
export interface HoverInfo {
  ref: CanonicalRef;
  kind: TwinNodeKind;
  label: string;
  /** A short second line — "AC · 22°C", "Booster Pump 02 · Running" — left
   * to the caller since only Luna-specific code knows how to phrase it. */
  detail?: string;
  screenX: number;
  screenY: number;
}

export interface HoverState {
  hovered: HoverInfo | null;
  setHovered: Dispatch<SetStateAction<HoverInfo | null>>;
}

const noopSetHovered: Dispatch<SetStateAction<HoverInfo | null>> = () => {};

export const HoverContext = createContext<HoverState>({ hovered: null, setHovered: noopSetHovered });

export function useHover(): HoverState {
  return useContext(HoverContext);
}

/** Spreadable R3F pointer handlers for any selectable mesh — hover to
 * preview, matching the existing useSelection()/onClick convention every
 * canonical mesh already follows. Desktop-only by nature (pointerover has
 * no touch equivalent); touch's "tap → select" already works today via
 * the existing onClick handlers, so this is purely additive. */
export function useCanonicalHoverHandlers(info: Omit<HoverInfo, "screenX" | "screenY"> | (() => Omit<HoverInfo, "screenX" | "screenY">)) {
  const { setHovered } = useHover();
  const resolve = () => (typeof info === "function" ? info() : info);

  return {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const i = resolve();
      setHovered({ ...i, screenX: e.nativeEvent.clientX, screenY: e.nativeEvent.clientY });
    },
    onPointerMove: (e: ThreeEvent<PointerEvent>) => {
      const i = resolve();
      setHovered((prev) => (prev && prev.ref === i.ref ? { ...prev, screenX: e.nativeEvent.clientX, screenY: e.nativeEvent.clientY } : prev));
    },
    onPointerOut: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const i = resolve();
      setHovered((prev) => (prev?.ref === i.ref ? null : prev));
    },
  };
}
