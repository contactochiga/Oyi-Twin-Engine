import type { RepresentationIdentity } from "./representationPolicy";
import type { NavigationMode } from "./spatial/route";
// Oyi Twin Engine — Twin Intelligence orchestration contract (Phase 6).
// Building-agnostic, same discipline as twinData.ts/twinRuntime.ts:
// nothing here may name "Luna" or hardcode a Luna-specific value. This is
// the layer that lets Oyi actually operate a twin:
//
//   User intent -> Oyi interpretation -> canonical asset/space resolution
//   -> twin navigation/highlight -> optional runtime action -> response
//
// Natural-language parsing and phrase-to-canonical-ref resolution are
// deliberately NOT here — that's the "Luna vocabulary/config layer"
// (see src/luna/intelligence/). This controller only ever receives an
// already-resolved ParsedIntent (canonical refs, not phrases) and acts on
// it through the same TwinDataProvider/TwinRuntimeProvider every other UI
// surface uses, plus a small SceneActions callback interface the host app
// implements with its own camera/state logic — the controller never
// touches React state or three.js directly.

import type { CanonicalRef, TwinNodeKind } from "./types";
import type { TwinDataProvider, OperationalSystem } from "./twinData";
import type { TwinRuntimeProvider, CommandName, OperationalStatus } from "./twinRuntime";
import type { ServiceRoute } from "./serviceRoute";
import type { EngineeringRelationship, EngineeringRelationshipType } from "./engineeringRelationships";
import { relationshipLabel, reverseRelationshipLabel } from "./engineeringRelationships";

export type IntentKind = "asset_view" | "navigate" | "show_system" | "show_problem" | "list_status" | "command" | "query" | "show_route" | "show_relationship" | "unknown";

/** Apartment A Full Interior Reality V1 (Part 3) — a "navigate" intent
 * whose targetRefs[0] is this sentinel resolves to the acting identity's
 * OWN assigned home (RepresentationIdentity.assignedHomeRefs[0]) rather
 * than a fixed ref — the vocabulary/parser layer has no identity to
 * resolve "home" against (see lunaIntentParser.ts), only handleNavigate
 * does, via scopePolicy.actor. Building-agnostic: any host wiring a
 * "take me home" phrase to this sentinel gets identity-correct resolution
 * for free, never a hardcoded destination. */
export const HOME_DESTINATION_SENTINEL = "__OYI_HOME__";

/** A relationship edge found for a queried ref, plus which side of the
 * edge that ref was on — the controller needs this to phrase the answer
 * in the direction the question was actually asked (see
 * reverseRelationshipLabel's own docstring). */
export interface RelationshipLookupResult {
  edge: EngineeringRelationship;
  direction: "from" | "to";
}

export interface ParsedIntent {
  kind: IntentKind;
  raw: string;
  /** Resolved canonical refs — never phrases. A "navigate"/"query" intent
   * normally carries exactly one; a "command" intent may carry several
   * (e.g. "turn off the living room light" affects two light circuits). */
  targetRefs: CanonicalRef[];
  targetKind?: "asset" | "level" | "interior" | "room" | "door" | "unit";
  system?: OperationalSystem;
  statusFilter?: OperationalStatus | "problem";
  assetKindFilter?: TwinNodeKind;
  command?: CommandName;
  commandArgs?: Record<string, unknown>;
  assetView?: "shaft" | "follow" | "lobby" | "interior" | "engineering" | "structure";
  /** Phase 13 §9/§13 — set for a "show_relationship" intent: which edge
   * type the question is asking about (isolated_by, supplied_by, ...).
   * targetRefs[0] is the ref the question is anchored on; the controller
   * tries both edge directions from there (see handleShowRelationship). */
  relationshipType?: EngineeringRelationshipType;
  /** Apartment A Full Interior Reality V1 (Part 2) — for a "navigate"
   * intent targeting a space: "locate" means select/highlight/peek only,
   * never move the traveler in (the LOCATE half of the existing LOCATE/
   * ENTER grammar); "enter" (the default when unset, preserving every
   * pre-existing navigate phrase's behavior) means dispatch through the
   * real ENTER path (enterDestination), obeying the current session
   * navigationMode unless navModeOverride names one. */
  navAction?: "locate" | "enter";
  /** A ONE-SHOT override of the session's own navigationMode for this
   * single navigate action only ("walk me to the kitchen" / "teleport me
   * to the kitchen") — never a way to permanently mutate the session
   * mode; the host's own navigationMode state is untouched by this field. */
  navModeOverride?: NavigationMode;
  /** Set when parsing understood the shape of the request but couldn't
   * resolve a target — lets the response be specific ("I don't know an
   * asset called that") instead of a generic "I didn't understand". */
  unresolvedReason?: string;
}

/** How Oyi actually moves/highlights the twin — implemented by the host
 * app using its own camera math and React state, never by this
 * controller reaching into UI state directly. */
export interface SceneActions {
  navigateToAsset(ref: CanonicalRef): void;
  assetView?(ref: CanonicalRef, view: NonNullable<ParsedIntent["assetView"]>): boolean;
  /** Apartment A Full Interior Reality V1 (Part 1/2) — the SAME single
   * canonical destination path every other spatial entry point (map,
   * room list, 3D click) already uses; `options` only ever ANNOTATES how
   * this one call should behave (LOCATE vs ENTER, a one-shot mode
   * override) — it is never a second movement system. Omitting `options`
   * preserves every pre-existing caller's exact behavior unchanged. */
  navigateToSpace(ref: CanonicalRef, options?: { navAction?: "locate" | "enter"; navModeOverride?: NavigationMode }): void;
  setSystemMode(system: OperationalSystem | "all" | null): void;
  /** Spatially reveals a resolved service route (e.g. the water path to an
   * apartment) — optional so hosts that predate Phase 10's route intelligence
   * (Facility OS, Consumer OS) keep compiling without implementing it. */
  highlightRoute?(refs: CanonicalRef[]): void;
}

export type InteractionScope = "facility" | "consumer";

/** Whether a given canonical ref is visible/actionable under the current
 * scope. Facility vs Consumer policy is inherently building-specific (in
 * this reference build: Consumer = LUNA-L06-APT-A and nothing else), so
 * the *policy* is supplied by the caller — the controller only ever
 * calls isAllowed(), never hardcodes what Consumer scope means. */
export interface ScopePolicy {
  scope: InteractionScope;
  actor?: RepresentationIdentity;
  canControl?(ref: CanonicalRef): boolean;
  isAllowed(ref: CanonicalRef): boolean;
  /** A short, reusable denial sentence for this scope — kept here so
   * every denial reads consistently regardless of which intent triggered it. */
  denialMessage(ref: CanonicalRef, twinData: TwinDataProvider): string;
}

export interface TwinIntelligenceContext {
  lastAssetRef?: CanonicalRef;
  lastSpaceRef?: CanonicalRef;
}

export interface OyiResponse {
  text: string;
  ok: boolean;
  deniedByScope?: boolean;
  /** Structured data behind the response — the same fields the sentence
   * was built from, for a UI that wants to show more than prose. */
  data?: Record<string, unknown>;
  context: TwinIntelligenceContext;
}

/** Reads a runtime asset's state into a natural sentence. Supplied by the
 * host (Luna's version knows Luna's field shapes and phrasing); the
 * controller never invents wording about a building it doesn't model. */
export type ExplainAsset = (assetRef: CanonicalRef) => string;

export class TwinIntelligenceController {
  private twinData: TwinDataProvider;
  private twinRuntime: TwinRuntimeProvider;
  private scene: SceneActions;
  private explainAsset: ExplainAsset;
  private buildRoute?: (system: OperationalSystem, targetRef: CanonicalRef) => ServiceRoute | null;
  private resolveRelationship?: (ref: CanonicalRef, type: EngineeringRelationshipType) => RelationshipLookupResult | null;

  constructor(
    twinData: TwinDataProvider,
    twinRuntime: TwinRuntimeProvider,
    scene: SceneActions,
    explainAsset: ExplainAsset,
    buildRoute?: (system: OperationalSystem, targetRef: CanonicalRef) => ServiceRoute | null,
    resolveRelationship?: (ref: CanonicalRef, type: EngineeringRelationshipType) => RelationshipLookupResult | null
  ) {
    this.twinData = twinData;
    this.twinRuntime = twinRuntime;
    this.scene = scene;
    this.explainAsset = explainAsset;
    this.buildRoute = buildRoute;
    this.resolveRelationship = resolveRelationship;
  }

  async handleIntent(intent: ParsedIntent, scopePolicy: ScopePolicy, context: TwinIntelligenceContext): Promise<OyiResponse> {
    switch (intent.kind) {
      case "asset_view": {
        const ref = intent.targetRefs[0];
        if (!ref || !intent.assetView) return { ok: false, text: "Which asset view?", context };
        if (!scopePolicy.isAllowed(ref) || !scopePolicy.canControl?.(ref)) return { ok: false, deniedByScope: true, text: "This inspection view requires an authorized host context.", context };
        const ok = this.scene.assetView?.(ref, intent.assetView) ?? false;
        return { ok, text: ok ? `Showing ${intent.assetView} view.` : "This host does not support that view.", context: { ...context, lastAssetRef: ref } };
      }
      case "navigate":
        return this.handleNavigate(intent, scopePolicy, context);
      case "show_system":
        return this.handleShowSystem(intent, scopePolicy, context);
      case "show_problem":
        return this.handleShowProblem(intent, scopePolicy, context);
      case "list_status":
        return this.handleListStatus(intent, scopePolicy, context);
      case "command":
        return this.handleCommand(intent, scopePolicy, context);
      case "query":
        return this.handleQuery(intent, scopePolicy, context);
      case "show_route":
        return this.handleShowRoute(intent, scopePolicy, context);
      case "show_relationship":
        return this.handleShowRelationship(intent, scopePolicy, context);
      default:
        return {
          ok: false,
          text: intent.unresolvedReason ?? "I didn't understand that. Try something like \"show me the water system\" or \"take me to Apartment 6A\".",
          context,
        };
    }
  }

  private denyIfOutOfScope(ref: CanonicalRef, scopePolicy: ScopePolicy, context: TwinIntelligenceContext): OyiResponse | null {
    if (scopePolicy.isAllowed(ref)) return null;
    return { ok: false, deniedByScope: true, text: scopePolicy.denialMessage(ref, this.twinData), context };
  }

  private handleNavigate(intent: ParsedIntent, scopePolicy: ScopePolicy, context: TwinIntelligenceContext): OyiResponse {
    let ref = intent.targetRefs[0];
    if (!ref) return { ok: false, text: intent.unresolvedReason ?? "I'm not sure where you mean.", context };

    // Apartment A Full Interior Reality V1 (Part 3) — "take me home"
    // resolves against the ACTING identity, never a fixed ref: only
    // handleNavigate has scopePolicy.actor, so the vocabulary/parser layer
    // hands this sentinel through unresolved rather than guessing.
    if (ref === HOME_DESTINATION_SENTINEL) {
      const home = scopePolicy.actor?.assignedHomeRefs?.[0];
      if (!home) return { ok: false, text: "You don't have an assigned home in this building.", context };
      ref = home;
    }

    const denial = this.denyIfOutOfScope(ref, scopePolicy, context);
    if (denial) return denial;

    if (intent.targetKind === "asset") {
      const asset = this.twinData.getAsset(ref);
      this.scene.navigateToAsset(ref);
      const nextContext = { ...context, lastAssetRef: ref };
      return { ok: true, text: asset ? `Here's ${asset.label}. ${this.explainAsset(ref)}` : `Here it is.`, context: nextContext };
    }

    this.scene.navigateToSpace(ref, { navAction: intent.navAction, navModeOverride: intent.navModeOverride });
    const nextContext = { ...context, lastSpaceRef: ref };
    // Part 11 — the response text itself must distinguish "I showed you
    // where it is" from "you actually traveled there", matching the
    // existing LOCATE/ENTER grammar's own meaning; kept to the minimum
    // wording change needed, not a new messaging system.
    const text = intent.navAction === "locate" ? "Here's where it is." : "Here you go.";
    return { ok: true, text, context: nextContext };
  }

  private handleShowSystem(intent: ParsedIntent, scopePolicy: ScopePolicy, context: TwinIntelligenceContext): OyiResponse {
    if (!intent.system) return { ok: false, text: "Which system would you like to see?", context };

    // "structure" (Phase 13) deliberately has zero OperationalAssetRecord
    // entries — structural geometry lives in a separate catalogue, kept
    // out of the operational asset table by design (§3's "keep purely
    // visual structural geometry separate from backend operational
    // assets"). The usual "does this system have any visible assets"
    // gate would therefore always report it as missing — skip that check
    // for structure specifically rather than teaching the engine about a
    // building-specific catalogue shape it has no other reason to know.
    if (intent.system !== "structure") {
      const assets = this.twinData.listAssets().filter((a) => a.system === intent.system);
      const visible = assets.filter((a) => scopePolicy.isAllowed(a.ref));
      if (visible.length === 0) {
        const sample = assets[0];
        if (sample) {
          const denial = this.denyIfOutOfScope(sample.ref, scopePolicy, context);
          if (denial) return denial;
        }
        return { ok: false, text: "I don't have that system in this building.", context };
      }
    }

    // Level isolation before system mode, not after: navigateToSpace's own
    // level-isolation path resets system mode as part of its normal
    // "just isolating a level, not inspecting a system" semantics (see
    // Luna's isolateLevelAndFly) — calling it second would silently
    // clobber the setSystemMode call right above it back to Architecture,
    // even though the response text already promised "showing structure".
    if (intent.targetKind === "level" && intent.targetRefs[0]) {
      this.scene.navigateToSpace(intent.targetRefs[0]);
    }
    this.scene.setSystemMode(intent.system);
    return { ok: true, text: `Showing the ${intent.system.replace("-", " ")} system.`, context };
  }

  private handleShowProblem(intent: ParsedIntent, scopePolicy: ScopePolicy, context: TwinIntelligenceContext): OyiResponse {
    const states = this.twinRuntime.listStates();
    const troubled = states
      .filter((s) => s.status === "critical" || s.status === "warning")
      .map((s) => ({ state: s, asset: this.twinData.getAsset(s.ref) }))
      .filter((x) => x.asset && scopePolicy.isAllowed(x.asset.ref))
      .filter((x) => !intent.system || x.asset!.system === intent.system)
      .sort((a, b) => (a.state.status === b.state.status ? 0 : a.state.status === "critical" ? -1 : 1));

    if (troubled.length === 0) {
      const scopeNote = intent.system ? ` in the ${intent.system.replace("-", " ")} system` : "";
      return { ok: true, text: `No current issues${scopeNote}. Everything is reading normal.`, context };
    }

    const worst = troubled[0];
    this.scene.setSystemMode(worst.asset!.system);
    this.scene.navigateToAsset(worst.asset!.ref);
    const systems = Array.from(new Set(troubled.map((t) => t.asset!.system)));
    const listText = troubled.map((t) => t.asset!.label).join(", ");
    const nextContext = { ...context, lastAssetRef: worst.asset!.ref };
    return {
      ok: true,
      text: `${troubled.length === 1 ? "One issue" : `${troubled.length} issues`} found (${systems.map((s) => s.replace("-", " ")).join(", ")}): ${listText}. ${this.explainAsset(worst.asset!.ref)}`,
      context: nextContext,
      data: { troubled: troubled.map((t) => t.asset!.ref) },
    };
  }

  private handleListStatus(intent: ParsedIntent, scopePolicy: ScopePolicy, context: TwinIntelligenceContext): OyiResponse {
    const states = this.twinRuntime.listStates();
    const matches = states
      .map((s) => ({ state: s, asset: this.twinData.getAsset(s.ref) }))
      .filter((x) => x.asset && scopePolicy.isAllowed(x.asset.ref))
      .filter((x) => !intent.assetKindFilter || x.asset!.kind === intent.assetKindFilter)
      .filter((x) => !intent.statusFilter || x.state.status === intent.statusFilter);

    const baseKind = intent.assetKindFilter ?? "asset";
    const kindLabel = (n: number) => `${baseKind}${n === 1 ? "" : "s"}`;
    if (matches.length === 0) {
      return { ok: true, text: `No ${kindLabel(2)} are currently ${intent.statusFilter ?? "matching that"}.`, context };
    }
    this.scene.setSystemMode(matches[0].asset!.system);
    this.scene.navigateToAsset(matches[0].asset!.ref);
    const nextContext = { ...context, lastAssetRef: matches[0].asset!.ref };
    return {
      ok: true,
      text: `${matches.length} ${kindLabel(matches.length)} ${intent.statusFilter ?? ""}: ${matches.map((m) => m.asset!.label).join(", ")}.`,
      context: nextContext,
      data: { refs: matches.map((m) => m.asset!.ref) },
    };
  }

  private async handleCommand(intent: ParsedIntent, scopePolicy: ScopePolicy, context: TwinIntelligenceContext): Promise<OyiResponse> {
    if (intent.targetRefs.length === 0) return { ok: false, text: intent.unresolvedReason ?? "I'm not sure what you want me to control.", context };
    if (!intent.command) return { ok: false, text: "I understood the target but not the action.", context };

    for (const ref of intent.targetRefs) {
      const denial = this.denyIfOutOfScope(ref, scopePolicy, context);
      if (denial) return denial;
    }

    const results: string[] = [];
    let anyOk = false;
    for (const ref of intent.targetRefs) {
      const state = this.twinRuntime.getState(ref);
      const asset = this.twinData.getAsset(ref);
      if (!state || !asset) {
        results.push(`I couldn't find that asset.`);
        continue;
      }
      const command = state.availableCommands.includes(intent.command) ? intent.command : synonymFallback(intent.command, state.availableCommands);
      if (!command) {
        results.push(`${asset.label} doesn't support that.`);
        continue;
      }
      const result = await this.twinRuntime.execute({ assetRef: ref, command, args: intent.commandArgs, actor: scopePolicy.actor });
      anyOk = anyOk || result.ok;
      results.push(`${asset.label}: ${result.message}`);
    }

    this.scene.navigateToAsset(intent.targetRefs[0]);
    const nextContext = { ...context, lastAssetRef: intent.targetRefs[0] };
    return { ok: anyOk, text: results.join(" "), context: nextContext };
  }

  /** Resolves and spatially reveals the service route feeding a target
   * asset. Route steps are individually re-checked against scopePolicy —
   * Engineering Mode must never expose more than the current scope already
   * allows, so a Consumer asking about their own unit legitimately sees a
   * shorter, unit-only slice of the same route a Facility user sees in full
   * (per Phase 10 section 10 — this is the intended privacy behavior, not
   * a bug). */
  private handleShowRoute(intent: ParsedIntent, scopePolicy: ScopePolicy, context: TwinIntelligenceContext): OyiResponse {
    const targetRef = intent.targetRefs[0];
    if (!targetRef) return { ok: false, text: intent.unresolvedReason ?? "I'm not sure which asset you mean.", context };
    if (!intent.system) return { ok: false, text: "Which service — water, electrical, drainage, fire, or network?", context };
    if (!this.buildRoute) return { ok: false, text: "Route tracing isn't available in this build.", context };

    const denial = this.denyIfOutOfScope(targetRef, scopePolicy, context);
    if (denial) return denial;

    const route = this.buildRoute(intent.system, targetRef);
    if (!route || route.steps.length === 0) {
      return { ok: false, text: "I don't have a traced route for that.", context };
    }

    const visibleSteps = route.steps.filter((s) => scopePolicy.isAllowed(s.ref));
    if (visibleSteps.length === 0) {
      return { ok: false, deniedByScope: true, text: scopePolicy.denialMessage(targetRef, this.twinData), context };
    }

    this.scene.setSystemMode(intent.system);
    this.scene.navigateToAsset(targetRef);
    this.scene.highlightRoute?.(visibleSteps.map((s) => s.ref));

    const nextContext = { ...context, lastAssetRef: targetRef };
    const path = visibleSteps.map((s) => s.label).join(" -> ");
    const note = visibleSteps.length < route.steps.length ? " (showing the portion visible in your current view)" : "";
    return {
      ok: true,
      text: `${path}${note}.`,
      context: nextContext,
      data: { routeRefs: visibleSteps.map((s) => s.ref) },
    };
  }

  /** Answers relationship questions that aren't a parentRef walk — "which
   * valve isolates this?", "what does this pump serve?" (Phase 13 §9/§13).
   * Tries both edge directions from the queried ref so the parser doesn't
   * need to get direction exactly right: relationshipsFrom first (the
   * common "X is isolated_by Y" shape), then relationshipsTo (the reverse
   * "what does Y serve" shape) — see resolveRelationship's own building-
   * specific implementation for how the two lookups are combined. */
  private handleShowRelationship(intent: ParsedIntent, scopePolicy: ScopePolicy, context: TwinIntelligenceContext): OyiResponse {
    const ref = intent.targetRefs[0];
    if (!ref) return { ok: false, text: intent.unresolvedReason ?? "I'm not sure which asset or space you mean.", context };
    if (!intent.relationshipType) return { ok: false, text: "I'm not sure what relationship you're asking about.", context };
    if (!this.resolveRelationship) return { ok: false, text: "Relationship lookup isn't available in this build.", context };

    const denial = this.denyIfOutOfScope(ref, scopePolicy, context);
    if (denial) return denial;

    const result = this.resolveRelationship(ref, intent.relationshipType);
    if (!result) return { ok: false, text: "I don't have that relationship on record.", context };

    const otherRef = result.direction === "from" ? result.edge.to : result.edge.from;
    const otherDenial = this.denyIfOutOfScope(otherRef, scopePolicy, context);
    if (otherDenial) return otherDenial;

    const refLabel = this.twinData.getAsset(ref)?.label ?? ref;
    const otherLabel = this.twinData.getAsset(otherRef)?.label ?? otherRef;
    const phrase = result.direction === "from" ? result.edge.label ?? relationshipLabel(intent.relationshipType) : reverseRelationshipLabel(intent.relationshipType);

    this.scene.navigateToAsset(otherRef);
    const nextContext = { ...context, lastAssetRef: otherRef };
    return {
      ok: true,
      text: `${refLabel} ${phrase} ${otherLabel}.`,
      context: nextContext,
      data: { relationshipType: intent.relationshipType, otherRef },
    };
  }

  private handleQuery(intent: ParsedIntent, scopePolicy: ScopePolicy, context: TwinIntelligenceContext): OyiResponse {
    const ref = intent.targetRefs[0];
    if (!ref) return { ok: false, text: intent.unresolvedReason ?? "I'm not sure which asset you mean.", context };
    const denial = this.denyIfOutOfScope(ref, scopePolicy, context);
    if (denial) return denial;
    this.scene.navigateToAsset(ref);
    const nextContext = { ...context, lastAssetRef: ref };
    return { ok: true, text: this.explainAsset(ref), context: nextContext };
  }
}

/** "Stop"/"start" are natural things to say to a pump or a light even
 * when the asset's real backend capabilities only expose turnOn/turnOff
 * — this keeps that a from-command synonym, decided against the asset's
 * *actual* available commands, not assumed universally supported. */
function synonymFallback(command: CommandName, available: CommandName[]): CommandName | null {
  const synonyms: Partial<Record<CommandName, CommandName>> = { stop: "turnOff", start: "turnOn" };
  const fallback = synonyms[command];
  return fallback && available.includes(fallback) ? fallback : null;
}
