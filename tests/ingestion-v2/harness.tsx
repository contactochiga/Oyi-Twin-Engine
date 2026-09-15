// Building Ingestion V2 — Part 27/30 live proof harness. NOT a product
// surface: this mounts ONLY generic src/engine components (LevelRail,
// FloorPlan2D), fed entirely by generic src/engine/spatial derivation
// functions running against a small synthetic building
// (miniBuildingFixture.ts) that has never had a line of Luna-specific
// code written for it. If this page works, the generalization is real —
// not just true in a deterministic Node test, but true in the same
// rendering components Luna's own live app uses.
import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "../../src/index.css";
import { LevelRail } from "../../src/engine/components/spatial/LevelRail";
import { FloorPlan2D } from "../../src/engine/components/FloorPlan2D";
import { buildMiniBuildingModel } from "../../src/engine/spatial/testFixtures/miniBuildingFixture";
import { deriveLevelRailItems } from "../../src/engine/spatial/levelRail";
import { deriveFloorPlanSpec } from "../../src/engine/spatial/floorControl";
import { resolveTapAction } from "../../src/engine/spatial/twoStageInteraction";
import { buildNavigationGraph, connectedSpaces } from "../../src/engine/spatial/navigationGraph";

function Harness() {
  const model = useMemo(() => buildMiniBuildingModel(), []);
  const railItems = useMemo(() => deriveLevelRailItems(model.levels), [model]);
  const graph = useMemo(() => buildNavigationGraph(model), [model]);
  const [activeLevelRef, setActiveLevelRef] = useState<string | null>(model.levels[1]?.canonicalRef ?? null);
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
  const [enteredRef, setEnteredRef] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const spec = activeLevelRef ? deriveFloorPlanSpec(model, activeLevelRef) : undefined;

  const onSelectUnit = (ref: string) => {
    const action = resolveTapAction(ref, selectedRef, enteredRef);
    setLastAction(action);
    setSelectedRef(ref);
    if (action === "enter") setEnteredRef(ref);
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#12131c", color: "#eee", fontFamily: "sans-serif" }}>
      <div style={{ width: 90, padding: 10 }}>
        <LevelRail levels={railItems} activeLevelRef={activeLevelRef} onSelectLevel={setActiveLevelRef} />
      </div>
      <div style={{ flex: 1, padding: 20 }}>
        <h2 data-testid="level-label">{spec?.label ?? "No floor plan"}</h2>
        <div style={{ width: 480, height: 400 }}>{spec && <FloorPlan2D spec={spec} unitStates={{}} selectedRef={selectedRef} onSelectUnit={onSelectUnit} />}</div>
        <div data-testid="debug-panel" style={{ marginTop: 20, fontSize: 13 }}>
          <div>Selected: <span data-testid="selected-ref">{selectedRef ?? "none"}</span></div>
          <div>Entered: <span data-testid="entered-ref">{enteredRef ?? "none"}</span></div>
          <div>Last action: <span data-testid="last-action">{lastAction ?? "none"}</span></div>
          <div>Connected to Lift Lobby: <span data-testid="connected-to-lobby">{connectedSpaces(graph, "MINI-L01-LIFT-LOBBY").join(", ") || "none"}</span></div>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Harness />
  </StrictMode>
);
