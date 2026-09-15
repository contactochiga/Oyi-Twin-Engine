import { useRepresentation } from "../engine/hooks/useRepresentation";
import { useState } from "react";
import { useSelection } from "../engine/hooks/useSelection";
import { useTwinData } from "../engine/twinData";
import type { AssetClassification } from "../engine/twinData";
import { useTwinRuntime, useRuntimeAssetState } from "../engine/twinRuntime";
import type { CommandName, CommandResult } from "../engine/twinRuntime";
import { SYSTEM_LABEL } from "../luna/operational/systemPresentation";

const OPERATIONAL_KINDS = new Set(["device", "camera", "access-point", "edge-node"]);

function classificationLabel(c: AssetClassification): string {
  switch (c) {
    case "controllable":
      return "Observable / Controllable as defined by the contract";
    case "observable":
      return "Observable (read-only telemetry)";
    case "asset-only":
    default:
      return "Asset-only (no live telemetry point)";
  }
}

// A curated, known-good set of floor shortcuts for the elevator "move to
// floor" control — real LUNA_LEVELS refs, never invented locations.
const ELEVATOR_FLOOR_SHORTCUTS = [
  { ref: "LUNA-GROUND", label: "Ground" },
  { ref: "LUNA-L06", label: "Level 6" },
  { ref: "LUNA-L10", label: "Level 10" },
];

// Which sensors offer a clearly-labeled simulation/test event — exactly
// the three events Phase 5 asks for, never a generic "trigger" on any
// observable device.
const SIMULATE_EVENT_FOR: Record<string, { event: string; label: string }> = {
  "LUNA-L06-APT-A-KITCHEN-LEAK-01": { event: "leak_detected", label: "Simulate Leak Detected" },
  "LUNA-L06-APT-A-ENTRY-SMOKE-01": { event: "smoke_detected", label: "Simulate Smoke Alarm" },
  "LUNA-L06-APT-A-LIVING-OCC-01": { event: "occupancy_detected", label: "Simulate Occupancy Detected" },
};

function fmtValue(v: unknown): string {
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(2);
  return JSON.stringify(v);
}

/** Buttons derived purely from the asset's live availableCommands + current
 * state shape — never a per-asset-ref switch statement. This is what
 * keeps the UI honest to "the Twin UI must not contain Luna-specific
 * fake-control logic": a control only appears because the runtime
 * provider's contract says this asset supports it, and which widget to
 * show is inferred from which *combination* of commands is present, not
 * from knowing "this is the living room AC". */
export function CommandControls({ commands, state, run, pending }: { commands: CommandName[]; state: Record<string, unknown>; run: (c: CommandName, args?: Record<string, unknown>) => void; pending: boolean }) {
  if (commands.length === 0) return null;
  const has = (c: CommandName) => commands.includes(c);
  const buttons: Array<{ label: string; onClick: () => void; active?: boolean }> = [];

  if (has("setTemperature")) {
    const on = Boolean(state.on);
    const target = typeof state.target_temp_c === "number" ? state.target_temp_c : 24;
    buttons.push({ label: on ? "Turn Off" : "Turn On", onClick: () => run(on ? "turnOff" : "turnOn"), active: on });
    buttons.push({ label: `− ${target - 1}°C`, onClick: () => run("setTemperature", { temperature: target - 1 }) });
    buttons.push({ label: `+ ${target + 1}°C`, onClick: () => run("setTemperature", { temperature: target + 1 }) });
    if (has("setMode")) {
      for (const mode of ["cool", "heat", "fan", "auto"]) {
        buttons.push({ label: mode, onClick: () => run("setMode", { mode }), active: state.mode === mode });
      }
    }
  } else if (has("open") && has("close") && has("setPosition")) {
    const position = typeof state.position === "number" ? state.position : 0;
    buttons.push({ label: "Open", onClick: () => run("open"), active: position === 100 });
    buttons.push({ label: "Half", onClick: () => run("setPosition", { position: 50 }), active: position === 50 });
    buttons.push({ label: "Close", onClick: () => run("close"), active: position === 0 });
  } else if (has("lock") || has("unlock")) {
    const locked = Boolean(state.locked);
    buttons.push({ label: "Lock", onClick: () => run("lock"), active: locked });
    buttons.push({ label: "Unlock", onClick: () => run("unlock"), active: !locked });
  } else if (has("open") && has("close")) {
    const open = Boolean(state.open);
    buttons.push({ label: "Open", onClick: () => run("open"), active: open });
    buttons.push({ label: "Close", onClick: () => run("close"), active: !open });
  } else if (has("setPosition")) {
    for (const floor of ELEVATOR_FLOOR_SHORTCUTS) {
      buttons.push({ label: `Send to ${floor.label}`, onClick: () => run("setPosition", { floor: floor.ref }), active: state.floor === floor.ref });
    }
  } else if (has("setMode") && has("turnOn")) {
    const on = Boolean(state.running);
    buttons.push({ label: on ? "Turn Off" : "Turn On", onClick: () => run(on ? "turnOff" : "turnOn"), active: on });
    for (const mode of ["auto", "manual"]) {
      buttons.push({ label: mode, onClick: () => run("setMode", { mode }), active: state.mode === mode });
    }
  } else if (has("setMode")) {
    buttons.push({ label: "Source: Grid", onClick: () => run("setMode", { mode: "grid" }), active: state.source === "grid" });
    buttons.push({ label: "Source: Generator", onClick: () => run("setMode", { mode: "generator" }), active: state.source === "generator" });
  } else if (has("turnOn") || has("turnOff")) {
    const on = Boolean(state.on ?? state.running);
    buttons.push({ label: on ? "Turn Off" : "Turn On", onClick: () => run(on ? "turnOff" : "turnOn"), active: on });
  }

  return (
    <div className="asset-panel__commands">
      <div className="asset-panel__label">Commands</div>
      <div className="asset-panel__command-row">
        {buttons.map((b) => (
          <button key={b.label} disabled={pending} className={b.active ? "active" : ""} onClick={b.onClick}>
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Read-only-by-default detail panel for a selected operational asset,
 * now also the Phase 5 asset controls surface: live provider state,
 * source, available commands, and command result — commands only ever
 * appear when the runtime provider's own contract says this asset
 * supports them (see CommandControls above), never assumed by this UI. */
export function AssetInfoPanel({ onReturnToBuilding }: { onReturnToBuilding: () => void }) {
  const { selected } = useSelection();
  const provider = useTwinData();
  const runtimeProvider = useTwinRuntime();
  const { identity, policy } = useRepresentation();
  const [pending, setPending] = useState(false);
  const [lastResult, setLastResult] = useState<CommandResult | null>(null);

  const ref = selected && OPERATIONAL_KINDS.has(selected.kind) ? selected.ref : null;
  const runtime = useRuntimeAssetState(ref ?? "__none__");

  if (!ref) return null;
  const asset = provider.getAsset(ref);
  if (!asset) return null;
  const mode = policy.resolveMode({ ref, identity });
  if (mode === "HIDDEN") return null;

  const run = async (command: CommandName, args?: Record<string, unknown>) => {
    setPending(true);
    const result = await runtimeProvider.execute({ assetRef: ref, command, args, actor: identity });
    setLastResult(result);
    setPending(false);
  };

  const simulateEvent = SIMULATE_EVENT_FOR[ref];

  return (
    <div className="asset-panel">
      <div className="asset-panel__label">Operational Asset</div>
      <div className="asset-panel__name">{asset.label}</div>
      <div className="asset-panel__ref">{asset.ref}</div>

      <div className="asset-panel__rows">
        <div className="asset-panel__row">
          <span>System</span>
          {SYSTEM_LABEL[asset.system]}
        </div>
        <div className="asset-panel__row">
          <span>Type</span>
          {asset.type}
        </div>
        <div className="asset-panel__row">
          <span>Location</span>
          {asset.locationLabel}
        </div>
        <div className="asset-panel__row">
          <span>Class</span>
          {classificationLabel(asset.classification)}
        </div>
        <div className="asset-panel__row">
          <span>Source</span>
          {runtime ? `${runtime.source} · ${runtime.status}` : "—"}
        </div>
      </div>

      {runtime ? (
        <div className="asset-panel__state">
          <div className="asset-panel__label">Current state</div>
          <pre>{Object.entries(runtime.state).length ? Object.entries(runtime.state).map(([k, v]) => `${k}: ${fmtValue(v)}`).join("\n") : "(no live fields — asset-only)"}</pre>
        </div>
      ) : (
        <div className="asset-panel__state asset-panel__state--empty">No runtime state available.</div>
      )}

      {runtime && mode === "FULL_3D" && <CommandControls commands={runtime.availableCommands} state={runtime.state} run={run} pending={pending} />}

      {simulateEvent && (
        <div className="asset-panel__commands">
          <div className="asset-panel__label">Simulation / Test</div>
          <div className="asset-panel__command-row">
            <button disabled={pending} onClick={() => setLastResult(runtimeProvider.simulateEvent(ref, simulateEvent.event))}>
              {simulateEvent.label}
            </button>
          </div>
        </div>
      )}

      {lastResult && <div className={`asset-panel__result ${lastResult.ok ? "ok" : "error"}`}>{lastResult.message}</div>}

      <button className="asset-panel__return" onClick={onReturnToBuilding}>
        Return to Building
      </button>
    </div>
  );
}
