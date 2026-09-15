import { ContextCard } from "../../engine/components/spatial/ContextCard";
import { useRuntimeAssetState } from "../../engine/twinRuntime";
import { useRepresentation } from "../../engine/hooks/useRepresentation";
import { liftDefinition } from "./lunaLift";
import { LiftControlsPanel, type LiftNavigationProps } from "./LiftControlsPanel";

// Legacy single-lift card. Since the Unified Spatial Control Surface v1
// (ElevatorControlBoard, left-side rail) is now the primary way to reach
// elevator controls, App.tsx no longer routes lift refs here — this stays
// in place, unused-but-dormant, as the generic "other" fallback surface
// continues to exist for any future non-board selection path.
export function LiftContextCard({ liftRef, onClose, liftView, onLiftView }: LiftNavigationProps & { liftRef: string; onClose: () => void }) {
  const snapshot = useRuntimeAssetState(liftRef);
  const { identity, policy } = useRepresentation();
  const def = liftDefinition(liftRef);
  const mode = policy.resolveMode({ ref: liftRef, identity });
  if (!snapshot || !def || mode === "HIDDEN") return null;
  return (
    <ContextCard onClose={() => { onLiftView?.(null); onClose(); }} content={{ title: `Lift · ${snapshot.source}`, subtitle: def.label }}>
      <LiftControlsPanel liftRef={liftRef} liftView={liftView} onLiftView={onLiftView} />
    </ContextCard>
  );
}
