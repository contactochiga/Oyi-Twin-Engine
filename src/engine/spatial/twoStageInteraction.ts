// Oyi Twin Engine — Building Ingestion V2 Part 10: the universal
// two-stage interaction grammar, generalized.
//
// The Part 1 audit found this grammar fully real and working in Luna
// today (selectUnitAndFly / enterInterior / focusRoom in App.tsx) but
// expressed as five bespoke closures reasoning directly about Luna's own
// InteriorSpec/unitPlanGeometry/lunaRepresentationPolicy types — nothing
// reusable for a different project. This file extracts the actual
// DECISION LOGIC (which tap does what, given current state) as a pure,
// stateless function any host can call; the host still owns its own
// selection/entered state and its own camera-flight side effects (which
// space-specific derivation function to call — SPACE_EXTERIOR vs
// SPACE_INTERIOR, see cameraDerivation.ts — and whether
// RepresentationPolicy actually grants entry) exactly as Luna's App.tsx
// already does. Generalizing the DECISION doesn't require rebuilding the
// state management or the policy check — those stay exactly where they
// already correctly live.

import type { CanonicalRef } from "../types";

export type TapAction = "locate" | "enter";

/** TAP 1 = LOCATE/UNDERSTAND. TAP 2 = ENTER/OPERATE (Part 10). Given only
 * "what was tapped," "what's currently selected," and "what's currently
 * entered," decides which stage this tap represents:
 *   - tapping something NOT already selected -> always "locate" (never
 *     skip straight to entering something the user hasn't even located
 *     yet, regardless of how many times they've tapped other objects).
 *   - tapping the ALREADY-selected-but-not-entered object again ->
 *     "enter" (the real second tap).
 *   - tapping the object that's already entered -> "locate" (a no-op
 *     re-tap; the host decides what, if anything, that should do — this
 *     function only refuses to claim it's a "fresh" second-tap entry).
 * This function makes no judgment about whether entering is actually
 * ALLOWED — that is RepresentationPolicy's job, evaluated by the host
 * after this returns "enter", exactly as Luna's own enterInterior()
 * already re-checks policy independently of the UI-level gate. */
export function resolveTapAction(ref: CanonicalRef, currentlySelectedRef: CanonicalRef | null, currentlyEnteredRef: CanonicalRef | null): TapAction {
  if (currentlySelectedRef !== ref) return "locate";
  if (currentlyEnteredRef === ref) return "locate";
  return "enter";
}

export interface TwoStageInteractionState {
  selectedRef: CanonicalRef | null;
  enteredRef: CanonicalRef | null;
}

export interface TwoStageInteractionHandlers {
  /** Called for a "locate" tap action — the host flies the camera to a
   * SPACE_EXTERIOR/SPACE_ENTRY destination and updates selection, but
   * does not change enteredRef. */
  onLocate: (ref: CanonicalRef) => void;
  /** Called for a "enter" tap action ONLY — the host must still verify
   * RepresentationPolicy grants entry before actually flying to a
   * SPACE_INTERIOR destination; if policy denies it, the host should
   * fall back to onLocate's own behavior instead (matching Luna's own
   * enterInterior() downgrade-on-denial pattern), never silently no-op. */
  onEnter: (ref: CanonicalRef) => void;
}

/** The one call site a host needs: resolves the action, then dispatches
 * to whichever handler applies. Kept separate from resolveTapAction()
 * itself so tests can exercise the pure decision function without any
 * handler wiring. */
export function handleSpatialTap(ref: CanonicalRef, state: TwoStageInteractionState, handlers: TwoStageInteractionHandlers): TapAction {
  const action = resolveTapAction(ref, state.selectedRef, state.enteredRef);
  if (action === "enter") handlers.onEnter(ref);
  else handlers.onLocate(ref);
  return action;
}
