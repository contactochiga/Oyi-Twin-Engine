import { createContext, useContext } from "react";
import type { CanonicalRef } from "../types";

export interface InteriorFocusState {
  /** ref of the interior (home or level) the camera has "entered" — null
   * means exterior/no interior active. Entering an interior does not by
   * itself hide anything; it exists so room-level focus (below) knows
   * which interior's rooms it's allowed to dim. */
  activeInteriorRef: CanonicalRef | null;
  setActiveInterior: (ref: CanonicalRef | null) => void;
  /** ref of a specific room focused within the active interior, or null
   * (every room in the active interior shows at full opacity). */
  focusedRoomRef: CanonicalRef | null;
  setFocusedRoom: (ref: CanonicalRef | null) => void;
}

export const InteriorFocusContext = createContext<InteriorFocusState | null>(null);

export function useInteriorFocus(): InteriorFocusState {
  const ctx = useContext(InteriorFocusContext);
  if (!ctx) throw new Error("useInteriorFocus must be used within an InteriorFocusContext.Provider");
  return ctx;
}
