// Oyi Twin Engine — Twin Runtime Provider contract (Phase 5).
// Building-agnostic, same discipline as twinData.ts: nothing here may name
// "Luna" or hardcode a Luna-specific value. This is the next layer on top
// of the static Twin Data Provider (catalog: ref/label/location/
// capabilities) — the runtime provider owns LIVE state and commands:
//
//   Twin UI  -->  Command/State Contract  -->  Luna Simulation (today)
//                                          \->  Oyi Core / device API / edge runtime (tomorrow)
//
// The UI never contains building-specific fake-control logic: it reads
// RuntimeAssetState and calls execute() with a CommandName the asset
// itself declares support for (availableCommands) — it never assumes any
// asset supports any particular command.

import { createContext, useContext, useEffect, useState } from "react";
import type { RepresentationIdentity } from "./representationPolicy";
import type { CanonicalRef } from "./types";

/** Small, deliberately generic vocabulary — the same handful of verbs
 * apply whether the eventual backend is a light bulb, a pump, or a real
 * elevator controller. An asset only ever exposes the subset it actually
 * supports (see RuntimeAssetState.availableCommands), derived from the
 * asset's own backend capabilities[], never assumed by the UI. */
export type CommandName = "callLift" | "turnOn" | "turnOff" | "setTemperature" | "setMode" | "lock" | "unlock" | "open" | "close" | "setPosition" | "start" | "stop" | "resetFault";

export interface CommandRequest {
  assetRef: CanonicalRef;
  command: CommandName;
  args?: Record<string, unknown>;
  /** Local host actor context; physical gateways must authenticate independently. */
  actor?: RepresentationIdentity;
}

export interface CommandResult {
  ok: boolean;
  message: string;
  timestamp: number;
}

/** Whether the data backing an asset's state is simulated, a genuine
 * physical connection, or currently unreachable. Every asset in Luna's
 * Phase 5 provider reports "simulated" — this field exists so the UI can
 * render it honestly and so a future live provider has somewhere to report
 * "physical" or "offline" without the UI changing shape. */
export type SourceKind = "simulated" | "physical" | "offline";

/** A restrained, consistent status vocabulary driving marker/panel color —
 * not a per-building invention. "active" means "doing something normal"
 * (light on, pump running, curtain mid-position); "warning"/"critical"
 * mean genuine attention is warranted; "offline" means no live state. */
export type OperationalStatus = "normal" | "active" | "warning" | "critical" | "offline";

export interface RuntimeAssetState {
  ref: CanonicalRef;
  status: OperationalStatus;
  /** Free-form current state fields (mirrors the shape of the backend's
   * own device_states.status jsonb) — e.g. {on:true} for a light,
   * {running:true, pressure_bar:3.2} for a pump. The UI reads this
   * generically (key/value rows), never assumes specific fields exist. */
  state: Record<string, unknown>;
  availableCommands: CommandName[];
  source: SourceKind;
  updatedAt: number;
}

export interface TwinRuntimeProvider {
  getState(ref: CanonicalRef): RuntimeAssetState | undefined;
  listStates(): RuntimeAssetState[];
  /** Fires with the full current state list on every change. Returns an
   * unsubscribe function. Deliberately a plain subscription rather than a
   * React state store — components decide for themselves how much of that
   * list they actually need to re-render on, and non-React consumers (a
   * future scenario CLI, a test) can use the exact same contract. */
  subscribe(listener: (states: RuntimeAssetState[]) => void): () => void;
  execute(request: CommandRequest): Promise<CommandResult>;
  /** For sensor/observable assets, which never accept commands: a clearly
   * simulation-only escape hatch for demonstrating an event (occupancy
   * detected, leak detected, smoke alarm) without pretending it's a real
   * command the asset "supports". Never available for controllable assets. */
  simulateEvent(ref: CanonicalRef, event: string): CommandResult;
}

export const TwinRuntimeContext = createContext<TwinRuntimeProvider | null>(null);

export function useTwinRuntime(): TwinRuntimeProvider {
  const ctx = useContext(TwinRuntimeContext);
  if (!ctx) throw new Error("useTwinRuntime must be used within a TwinRuntimeContext.Provider");
  return ctx;
}

/** Subscribes to one asset's live state. Re-renders only when this
 * specific ref's state object identity changes — the Luna provider always
 * replaces (never mutates) an asset's state object on change, so a plain
 * reference check is enough to skip re-rendering every marker on every
 * unrelated state change. */
export function useRuntimeAssetState(ref: CanonicalRef): RuntimeAssetState | undefined {
  const provider = useTwinRuntime();
  const [state, setState] = useState(() => provider.getState(ref));

  useEffect(() => {
    setState(provider.getState(ref));
    return provider.subscribe((states) => {
      const next = states.find((s) => s.ref === ref);
      setState((prev) => (next === prev ? prev : next));
    });
  }, [provider, ref]);

  return state;
}

/** Subscribes to every asset's live state — for the scenario panel and any
 * future facility-wide status summary. */
export function useRuntimeStates(): RuntimeAssetState[] {
  const provider = useTwinRuntime();
  const [states, setStates] = useState(() => provider.listStates());

  useEffect(() => {
    setStates(provider.listStates());
    return provider.subscribe(setStates);
  }, [provider]);

  return states;
}
