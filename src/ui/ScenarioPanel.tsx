import { useState } from "react";
import { LUNA_SCENARIOS } from "../luna/runtime/lunaScenarios";

/** Facility-scope simulation/scenario panel — Phase 5. Triggering a
 * scenario runs its `apply()`, which mutates state through the exact same
 * provider choke point every command uses (see lunaRuntimeInternals in
 * lunaSimulationProvider.ts); this panel itself holds no simulation logic
 * of its own, only a button per preset and a small "last triggered" note.
 * No auth/role system exists in this reference viewer, so "Facility-only"
 * is expressed as clear labeling and scope, not a login gate. */
export function ScenarioPanel() {
  const [lastKey, setLastKey] = useState<string | null>(null);

  return (
    <div className="scenario-panel">
      <div className="scenario-panel__header">
        <span className="scenario-panel__title">Facility Scenario Simulator</span>
        <span className="scenario-panel__subtitle">Simulation only — deterministic, resettable</span>
      </div>
      <div className="scenario-panel__list">
        {LUNA_SCENARIOS.map((scenario) => (
          <button
            key={scenario.key}
            className={`scenario-panel__item ${lastKey === scenario.key ? "active" : ""} ${scenario.key === "normal" ? "scenario-panel__item--reset" : ""}`}
            title={scenario.description}
            onClick={() => {
              scenario.apply();
              setLastKey(scenario.key);
            }}
          >
            {scenario.label}
          </button>
        ))}
      </div>
      {lastKey && <div className="scenario-panel__status">Last triggered: {LUNA_SCENARIOS.find((s) => s.key === lastKey)?.label}</div>}
    </div>
  );
}
