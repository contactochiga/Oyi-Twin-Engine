import { LIFT_STOPS } from "../lift/lunaLift";
// Luna deterministic intent parser (Phase 6). No external LLM dependency
// — a priority-ordered cascade of pattern matchers, each either resolving
// a complete ParsedIntent or returning null so the next, more general
// matcher gets a turn. Order matters: "show me the water problem" must be
// caught by the problem matcher before the more general show-system
// matcher ever sees the word "water" in isolation.

import type { ParsedIntent, IntentKind, TwinIntelligenceContext } from "../../engine/twinIntelligence";
import { HOME_DESTINATION_SENTINEL } from "../../engine/twinIntelligence";
import type { CommandName } from "../../engine/twinRuntime";
import type { EngineeringRelationshipType } from "../../engine/engineeringRelationships";
import { matchAsset, matchSpace, matchSystem, SPACE_SENSOR_ALIASES } from "./lunaVocabulary";
import { terminationAssetFor } from "./lunaServiceRoutes";
import { LUNA_EXTERIOR_ENTRANCE_PLAZA } from "../transitions/lunaTransitions";

function intent(kind: IntentKind, raw: string, targetRefs: string[], extra: Partial<ParsedIntent> = {}): ParsedIntent {
  return { kind, raw, targetRefs, ...extra };
}

function usesPronoun(text: string): boolean {
  return /\b(it|this|that)\b/.test(text);
}

type Matcher = (text: string, context: TwinIntelligenceContext) => ParsedIntent | null;

const VERB_COMMANDS: Array<{ re: RegExp; command: CommandName }> = [
  { re: /\bturn on\b/, command: "turnOn" },
  { re: /\bturn off\b/, command: "turnOff" },
  { re: /\bunlock\b/, command: "unlock" },
  { re: /\block\b/, command: "lock" },
  { re: /\bstop\b/, command: "stop" },
  { re: /\bstart\b/, command: "start" },
  { re: /\bclose\b/, command: "close" },
  { re: /\bopen\b/, command: "open" },
];

const matchCommand: Matcher = (text, context) => {
  const pronounRef = usesPronoun(text) ? context.lastAssetRef : undefined;

  const setMatch = text.match(/\bset\b.*?\bto\b\s*(-?\d+)/);
  if (setMatch) {
    // HVAC System V1 — "set Apartment 6A to 22 degrees" names a space,
    // not a device alias; matchAsset() alone can't resolve it. Falls back
    // to the SAME hvac termination lookup the route matcher deliberately
    // avoids for routing (see lunaServiceRoutes.ts) — safe here since a
    // command target just needs A controllable asset, not a topology claim.
    const space = matchSpace(text);
    const spaceRef = space ? terminationAssetFor(space.ref, "hvac") : undefined;
    const refs = matchAsset(text) ?? (spaceRef && spaceRef !== space?.ref ? [spaceRef] : undefined) ?? (pronounRef ? [pronounRef] : undefined);
    if (refs) return intent("command", text, refs, { command: "setTemperature", commandArgs: { temperature: Number(setMatch[1]) } });
    return intent("command", text, [], { unresolvedReason: "Which device should I set that on?" });
  }

  for (const { re, command } of VERB_COMMANDS) {
    if (!re.test(text)) continue;
    const refs = matchAsset(text);
    if (refs) return intent("command", text, refs, { command });
    // "open"/"close" with no asset alias found is very likely navigation
    // ("open the living room"), not a device command — let it fall
    // through to the space matcher instead of failing outright.
    if (command === "open" || command === "close") return null;
    if (pronounRef) return intent("command", text, [pronounRef], { command });
    return intent("command", text, [], { unresolvedReason: `I'm not sure what you want me to ${command === "turnOn" ? "turn on" : command === "turnOff" ? "turn off" : command}.` });
  }
  return null;
};

const matchProblem: Matcher = (text) => {
  if (/\b(problem|critical issues?|what('?s| is) wrong|issues?|fault|wrong with)\b/.test(text)) {
    return intent("show_problem", text, [], { system: matchSystem(text) });
  }
  return null;
};

const matchListStatus: Matcher = (text) => {
  if (/\bcamera/.test(text) && /\boffline\b/.test(text)) {
    return intent("list_status", text, [], { assetKindFilter: "camera", statusFilter: "offline" });
  }
  return null;
};

// Drainage V1 — hand-authored demo phrases from the implementation brief,
// resolved to `query` (not `show_route`) so lunaExplain.ts's
// explainDrainageState() produces the richer, CORRECTLY-DIRECTIONED
// narrative (fixture -> discharge, the real physical flow) plus the DD10
// disclosure, rather than buildServiceRoute()'s generic engine-level text
// — which is graph-root-first (discharge-first) for drainage, the
// opposite of every other system, per docs/LUNA_MEP_COORDINATION_SPEC.md's
// own pre-existing warning. Must run BEFORE matchShowRoute: several of
// these phrases contain the trigger word "route", which matchShowRoute
// would otherwise claim first and route through the generic (correctly
// ordered for other systems, backwards-reading for drainage) engine path.
// "Where does the master bathroom waste go?" is deliberately NOT
// special-cased here — it falls through to matchShowRoute's own existing
// mechanism unchanged, proving route-tracing itself still works honestly
// for drainage (see the known ordering caveat documented in
// docs/LUNA_DRAINAGE_REFERENCE_SPEC.md), while THIS matcher covers the
// phrases that specifically need the narrative/DD10 answer shape.
const matchDrainageInvestigation: Matcher = (text) => {
  if (/\bshow\s+me\s+the\s+drainage\s+from\s+apartment\s+6a\b/.test(text)) {
    return intent("query", text, ["LUNA-L06-APT-A-DRAIN-01"]);
  }
  if (/\bshow\s+me\s+the\s+soil\s+stack\b/.test(text)) {
    return intent("query", text, ["LUNA-RISER-DRAINAGE-01"]);
  }
  if (/\bstormwater\s+route\s+from\s+the\s+roof\b/.test(text)) {
    return intent("query", text, ["LUNA-ROOFTOP-STORM-DRAIN-01"]);
  }
  if (/\bwastewater\s+from\s+this\s+apartment\s+terminate\b/.test(text)) {
    return intent("query", text, ["LUNA-B1-DRAINAGE-MAIN-01"]);
  }
  return null;
};

// Must run before matchQuery — "what supplies X with Y" starts with "what"
// and would otherwise be swallowed by the general question matcher.
const matchShowRoute: Matcher = (text) => {
  // "trace" added for Domestic Water Reference System V1's "Trace water
  // from the B1 plant to Apartment 6A" — generic across every system, not
  // water-specific wording.
  const isRoutePhrase = /\broute\b|\bpath\b|\btrace\b|\bwhere does\b.*\bgo\b/.test(text);
  const isSupplyPhrase = /\bwhat\s+supplies\b/.test(text) || /\bsupplies\b.*\bwith\b/.test(text);
  // "What powers X" is a route question (trace its electrical supply
  // chain), not a runtime-state question — matched here, before matchQuery
  // gets a chance to answer it with the AC's own on/off state instead.
  // Electrical System V1 — broadened from "what powers" alone so route
  // phrases naming "power" generically ("what supplies power to L06",
  // "trace power to Apartment 6A") also default to the electrical system
  // without requiring the literal word "electrical".
  const isPowerPhrase = /\bpowers?\b/.test(text);
  if (!isRoutePhrase && !isSupplyPhrase && !isPowerPhrase) return null;

  const system = matchSystem(text) ?? (isPowerPhrase ? "electrical" : undefined);
  if (!system) return intent("show_route", text, [], { unresolvedReason: "Which service — water, electrical, drainage, fire, or network?" });

  // HVAC System V1 — the reference chain's real connectivity is a
  // connected_to edge (outdoor condenser <-> indoor units), not a
  // parentRef chain (each indoor unit's own parentRef is its ELECTRICAL
  // AC circuit — a different relationship). Walking that chain under an
  // "HVAC route" label would silently mislabel the electrical supply path
  // as HVAC routing — exactly what Part 5 forbids ("do not infer
  // topology... geometry represents the relationship, it does not define
  // it"). Navigate to the outdoor condenser directly instead — the one
  // real anchor at the source end of the already-rendered refrigerant
  // connection lines, the same honest-anchor simplification Electrical's
  // "active power path" and Fire's "affected floor" already established.
  if (system === "hvac") return intent("navigate", text, ["LUNA-L06-APT-A-AC-OUTDOOR-01"], { targetKind: "asset" });

  // Asset match first: a specific device alias ("living room AC") is more
  // precise than a room-level space alias, and several asset patterns
  // (e.g. "living room ac") contain a room alias ("living room") as a
  // substring — checking space first would silently resolve "what powers
  // the living room AC" to the *room*, not the AC, and then fail to find
  // any route at all since a room isn't an operational asset.
  const assetRefs = matchAsset(text);
  if (assetRefs) return intent("show_route", text, [assetRefs[0]], { system });

  const space = matchSpace(text);
  if (space) return intent("show_route", text, [space.ref], { system });

  // Electrical System V1.1 — "show me the active power path"/"show me
  // where the power is coming from" name no specific device or apartment,
  // but Part 5 requires them to reveal something real, not "which
  // apartment did you mean". Defaulting to the Apartment 6A meter is
  // honest: it's the one destination with a fully detailed, already-
  // registered reference chain from source (matches how L06/6A is already
  // the single representative floor everywhere else in the electrical
  // system) — never a fabricated "whole building" route.
  if (system === "electrical" && /\bactive power path\b|\bwhere the power is coming from\b/.test(text)) {
    return intent("show_route", text, ["LUNA-L06-APT-A-METER-ELEC-01"], { system });
  }

  return intent("show_route", text, [], { system, unresolvedReason: "Which apartment or device did you mean?" });
};

// Apartment A Full Interior Reality V1 (Part 1/2/3) — explicit phrase
// semantics for SPACE navigation, layered onto the SAME "navigate" intent
// / enterDestination() dispatch every other space phrase already resolves
// through (matchNavigateOrAsset, below) — no second movement system, no
// Kitchen-specific code, no Apartment-A string hack. This matcher only
// ever ADDS a navAction/navModeOverride annotation for phrasing that
// actually requests something other than the pre-existing default
// (mode-agnostic ENTER); a bare name or generic "take me to X" still
// falls through unchanged to matchNavigateOrAsset. Must run before
// matchQuery so "where is the kitchen?" (a real question mark) resolves
// as a LOCATE-navigate, not a generic state query.
const matchSpatialNavAction: Matcher = (text) => {
  if (/\b(take me|go)\s+home\b/.test(text)) {
    return intent("navigate", text, [HOME_DESTINATION_SENTINEL], { targetKind: "interior", navAction: "enter" });
  }

  const isLocate = /\bwhere\s+is\b/.test(text) || /\bshow\s+me\s+the\b/.test(text);
  const isExplicitTour = /\bwalk\s+me\s+to\b/.test(text) || /\btour\s+me\s+to\b/.test(text) || /\btake\s+me\s+there\s+physically\b/.test(text);
  const isExplicitTeleport = /\bjump\s+to\b/.test(text) || /\bteleport\s+me\s+to\b/.test(text);
  if (!isLocate && !isExplicitTour && !isExplicitTeleport) return null;

  // Asset match first (same discipline as matchShowRoute/matchQuery above):
  // a specific device/asset alias is more precise than a room-level space
  // alias, and several asset phrases ("the camera at apartment 6a") name a
  // space alias as a substring — checking space first would silently steal
  // that phrase away from its real, more specific asset resolution. A
  // device LOCATE/override phrase itself has no distinct spatial-travel
  // meaning and falls through to the existing asset-query/command matchers
  // unchanged.
  if (matchAsset(text)) return null;

  const space = matchSpace(text);
  if (!space) return null;

  if (isLocate) return intent("navigate", text, [space.ref], { targetKind: space.kind, navAction: "locate" });
  if (isExplicitTour) return intent("navigate", text, [space.ref], { targetKind: space.kind, navAction: "enter", navModeOverride: "TOUR" });
  return intent("navigate", text, [space.ref], { targetKind: space.kind, navAction: "enter", navModeOverride: "TELEPORT" });
};

const matchQuery: Matcher = (text, context) => {
  const isQuestion = /^(is|are|what|which|does|do|has|have|can)\b/.test(text) || text.includes("?");
  if (!isQuestion) return null;

  const assetRefs = matchAsset(text);
  if (assetRefs) return intent("query", text, [assetRefs[0]]);

  const space = matchSpace(text);
  if (space) {
    const wantsTemp = /\btemperature\b/.test(text);
    const wantsLeak = /\bleak\b/.test(text);
    const sensor = SPACE_SENSOR_ALIASES.find((s) => s.spaceRef === space.ref && ((wantsTemp && s.kind === "temperature") || (wantsLeak && s.kind === "leak")));
    if (sensor) return intent("query", text, [sensor.sensorRef]);
    // Electrical System V1.1 — "is Apartment 6A powered" reuses the SAME
    // unit->termination mapping "show what supplies power to Apartment
    // 6A" already resolves through (lunaServiceRoutes.ts), just from the
    // query path instead of the route path.
    if (/\bpowered\b/.test(text)) {
      const termination = terminationAssetFor(space.ref, "electrical");
      if (termination !== space.ref) return intent("query", text, [termination]);
    }
    // "What source is L06 using" — L06 is currently the one registered
    // floor with an electrical branch (see docs/LUNA_ELECTRICAL_REFERENCE_
    // SPEC.md's scope decision); this deliberately does not generalize to
    // other floors, which have no registered branch to resolve to.
    if (space.ref === "LUNA-L06" && /\bsource\b/.test(text)) {
      return intent("query", text, ["LUNA-L06-ELECTRICAL-BRANCH-01"]);
    }
  }

  if (usesPronoun(text) && context.lastAssetRef) return intent("query", text, [context.lastAssetRef]);

  return intent("unknown", text, [], { unresolvedReason: "I'm not sure which asset or space you're asking about." });
};

// "Show me the structure" / "Show Level 6 structure" — broadened beyond
// requiring the literal word "system" so structure-mode phrasing (which
// never says "structure system") still matches. When the same phrase also
// names a level ("Level 6"), that level rides along as targetRefs[0] so
// the controller isolates/flies to it as well as switching the layer —
// Phase 13 §13's "Show Level 6 structure" acceptance example is exactly
// this combination, not a separate capability.
const matchShowSystem: Matcher = (text) => {
  // "plant" added for Domestic Water Reference System V1's "Show the B1
  // water plant" — generic phrasing any system's plant room could use
  // ("the electrical plant", "the fire pump plant"), not water-specific.
  if (/\b(show|view|display)\b.*\b(system|structure|structural|plant)\b/.test(text)) {
    const system = matchSystem(text);
    if (!system) return null;
    const space = matchSpace(text);
    if (space && space.kind === "level") return intent("show_system", text, [space.ref], { system, targetKind: "level" });
    return intent("show_system", text, [], { system });
  }
  return null;
};

// Relationship questions that aren't a parentRef walk (Phase 13 §9/§13) —
// "which valve isolates X", "what does X serve". Must run before
// matchQuery, which would otherwise swallow these as a generic "which"/
// "what" question and answer with the asset's own runtime state instead.
const RELATIONSHIP_PHRASES: Array<{ re: RegExp; type: EngineeringRelationshipType }> = [
  // "isolation" added for Domestic Water Reference System V1's "the
  // nearest isolation point for Apartment 6A" — generic wording any
  // system's isolation valve could use, not water-specific.
  { re: /\bisolates?\b|\bisolation\b/, type: "isolated_by" },
  { re: /\bserves?\b|\bserving\b/, type: "supplied_by" },
  { re: /\bprotects?\b/, type: "protected_by" },
  { re: /\bmonitors?\b/, type: "monitored_by" },
  { re: /\bconnected to\b|\bconnects to\b/, type: "connected_to" },
  { re: /\brouted through\b/, type: "routed_through" },
];

const matchShowRelationship: Matcher = (text) => {
  const found = RELATIONSHIP_PHRASES.find((p) => p.re.test(text));
  if (!found) return null;

  const assetRefs = matchAsset(text);
  if (assetRefs) return intent("show_relationship", text, [assetRefs[0]], { relationshipType: found.type });

  const space = matchSpace(text);
  if (space) return intent("show_relationship", text, [space.ref], { relationshipType: found.type });

  return intent("show_relationship", text, [], { unresolvedReason: "Which asset or space did you mean?" });
};

// Spatial Transition Engine V1.1 Part 13 — "go outside"/"take me outside"/
// "exterior" have no NormalizedSpatialObject to resolve through matchSpace
// (the exterior plaza is a real canonical ref, but not a level/interior/
// room/door findSpace() already knows how to look up), so this is
// matched directly rather than forcing a fake space-lookup result.
const matchExterior: Matcher = (text) => {
  if (/\b(?:go(?:ing)? outside|outside|exterior|leave the building|exit the building)\b/.test(text)) {
    return intent("navigate", text, [LUNA_EXTERIOR_ENTRANCE_PLAZA], { targetKind: "level" });
  }
  return null;
};

const matchNavigateOrAsset: Matcher = (text) => {
  const assetRefs = matchAsset(text);
  if (assetRefs) return intent("navigate", text, [assetRefs[0]], { targetKind: "asset" });

  const space = matchSpace(text);
  if (space) return intent("navigate", text, [space.ref], { targetKind: space.kind });

  return null;
};

// Four-lift generalization — resolves WHICH of the four canonical lifts a
// phrase names, instead of always assuming Lift 02. "Service"/"fire" is
// checked before the numbered patterns since it has no digit to collide
// with; the three numbered patterns are otherwise mutually exclusive (a
// phrase names at most one lift number). Digit-only, matching the exact
// convention the previously-shipped Lift 02 pattern already established
// (no word-form "elevator one" support here — that was never supported
// for Lift 02 either, so not a capability regression to leave as-is).
const LIFT_REF_PATTERNS: Array<{ ref: string; re: RegExp }> = [
  { ref: "LUNA-LIFT-SERVICE-01", re: /\bservice\s+(?:lift|elevator)\b|\bfire\s+(?:lift|elevator)\b/ },
  { ref: "LUNA-LIFT-PASS-01", re: /\b(?:passenger\s+)?(?:lift|elevator)\s*0?1\b/ },
  { ref: "LUNA-LIFT-PASS-02", re: /\b(?:passenger\s+)?(?:lift|elevator)\s*0?2\b/ },
  { ref: "LUNA-LIFT-PASS-03", re: /\b(?:passenger\s+)?(?:lift|elevator)\s*0?3\b/ },
];

const matchLift: Matcher = (text) => {
  // "Show all elevators" / "show elevators in engineering view" — the
  // whole-system representation, reusing the existing setSystemMode path
  // (matchShowSystem's own regex requires the literal word "system", which
  // this phrasing doesn't use, so it's handled here instead — no new
  // capability beyond what vertical-transport system mode already does).
  // Plural "elevators"/"lifts" (vs. the singular "lift"/"elevator" + digit
  // every specific-lift pattern below uses) is what distinguishes "all of
  // them" from "this one" — no "all"/"every" keyword required.
  if (/\b(?:lifts|elevators)\b/.test(text)) {
    return intent("show_system", text, [], { system: "vertical-transport" });
  }
  const found = LIFT_REF_PATTERNS.find((p) => p.re.test(text));
  if (!found) return null;
  const ref = found.ref;
  const floorNumber = text.match(/\b(?:level|l)\s*0?(\d{1,2})\b/);
  const floorRef = /\bground\b/.test(text) ? "LUNA-GROUND" : /\bb1|basement\b/.test(text) ? "LUNA-B1" : floorNumber ? (Number(floorNumber[1]) === 1 ? "LUNA-L01-AMENITIES" : `LUNA-L${floorNumber[1].padStart(2, "0")}`) : undefined;
  if (/\b(take|move|send|call)\b/.test(text)) return intent("command", text, [ref], { command: /\bcall\b/.test(text) ? "callLift" : "setPosition", commandArgs: { floor: LIFT_STOPS.find(s => s.ref === floorRef)?.ref } });
  if (/\b(close|open)\b/.test(text)) return intent("command", text, [ref], { command: /\bclose\b/.test(text) ? "close" : "open" });
  const view = /\bfollow\b/.test(text) ? "follow" : /\bengineering\b/.test(text) ? "engineering" : /\bstructur/.test(text) ? "structure" : /\bshaft\b/.test(text) ? "shaft" : undefined;
  if (view) return intent("asset_view", text, [ref], { assetView: view });
  return intent("query", text, [ref]);
};
// Electrical System V1.1 — building-level live power questions that don't
// name a specific asset ("what is the building running on", "why are we
// on generator") and so wouldn't resolve through matchQuery's own
// asset-alias lookup. Resolves to a real, existing anchor ref (never a
// fabricated one) — GRID-01 for general "what/is" questions, GEN-01 for
// causal "why" questions — which lunaExplain.ts's explainAsset special-
// cases into the full building-power narrative (see resolveBuildingPower()
// in lunaPowerResolver.ts). Phrases that DO name an asset directly
// ("Are we on generator?", "Is utility available?") already resolve via
// matchQuery's existing matchAsset() call and never reach this matcher.
const matchBuildingPower: Matcher = (text) => {
  const isWhy = /\bwhy\b.*\b(on|running on)\s+(generator|utility)\b/.test(text) || /\bwhat\s+happened\s+to\s+(the\s+)?utility\b/.test(text);
  const isGeneral = /\bwhat('?s| is)\s+(the\s+building|luna)\s+running\s+on\b/.test(text) || /\bwhat('?s| is)\s+powering\s+(luna|the\s+building)\b/.test(text);
  if (!isWhy && !isGeneral) return null;
  return intent("query", text, [isWhy ? "LUNA-B1-ELECTRICAL-GEN-01" : "LUNA-B1-ELECTRICAL-GRID-01"]);
};

// Fire & Life Safety System V1 — building-level fire-status/investigation
// questions that don't name a specific asset ("what is the fire status",
// "where is the alarm", "what triggered it") and so wouldn't resolve
// through matchQuery's own asset-alias lookup. All resolve to PANEL-01 —
// the one real, always-present anchor a person would actually check in a
// real building to answer any of these, not a fabricated location.
// "Show me the affected floor" is the one exception, anchored at the L06
// fire zone since the reference incident chain (Part 4) is itself scoped
// to L06/Apartment 6A — the same honest simplification Electrical's own
// "active power path" default used (lunaExplain.ts's explainAsset then
// reports dynamically whether that zone is actually the current origin).
const matchFireStatus: Matcher = (text) => {
  const isAffectedFloor = /\bshow\b.*\baffected\s+(floor|level)\b/.test(text);
  if (isAffectedFloor) return intent("navigate", text, ["LUNA-L06-FIRE-BRANCH-01"], { targetKind: "asset" });
  const isFireStatusQuestion =
    /\bwhat('?s| is)\s+the\s+fire\s+status\b/.test(text) ||
    /\bare\s+there\s+any\s+fire\s+alarms?\b/.test(text) ||
    /\bwhere\s+is\s+the\s+alarm\b/.test(text) ||
    /\bwhat\s+triggered\s+(the\s+)?(alarm|it)\b/.test(text) ||
    /\bwhat\s+devices\s+responded\b/.test(text) ||
    /\bare\s+there\s+any\s+fire\s+(system\s+)?faults?\b/.test(text) ||
    /\bshow\b.*\bactive\s+incident\b/.test(text);
  if (!isFireStatusQuestion) return null;
  return intent("query", text, ["LUNA-B1-FIRE-PANEL-01"]);
};

// HVAC System V1 — reference-chain status/investigation questions that
// don't name a specific asset ("what is the HVAC status", "is there an
// HVAC fault", "which indoor unit is running", "what is cooling
// Apartment 6A", "why isn't Apartment 6A cooling") and so wouldn't
// resolve through matchQuery's own asset-alias/space lookup. Most resolve
// to AC-OUTDOOR-01 — the one real anchor whose explainAsset narrative
// (see lunaExplain.ts's explainHvacState) covers both zones plus
// condenser demand, the same "one honest anchor for an aggregate
// question" precedent as matchFireStatus/matchBuildingPower. The setpoint
// question resolves to the primary indoor unit instead, since a setpoint
// is a per-unit fact, not an aggregate one.
const matchHvacStatus: Matcher = (text) => {
  const isSetpoint = /\bwhat('?s| is)\s+the\s+(current\s+)?setpoint\b/.test(text);
  if (isSetpoint) return intent("query", text, ["LUNA-L06-APT-A-LIVING-AC-01"]);
  // "Is there an HVAC fault?"/"Are there any HVAC faults?" are deliberately
  // NOT listed here — the pre-existing, higher-priority matchProblem (any
  // phrase containing "fault"/"problem"/"issue"/"wrong") already catches
  // these first and resolves them to a show_problem intent with
  // system:"hvac" via matchSystem(text), the same generic cross-system
  // fault-question mechanism every other system already relies on. Adding
  // a second, unreachable branch for the same phrasing here would just be
  // dead code.
  const isGeneral =
    /\bwhat('?s| is)\s+the\s+hvac\s+status\b/.test(text) ||
    /\bwhat('?s| is)\s+the\s+hvac\s+source\b/.test(text) ||
    /\bwhich\s+indoor\s+unit\s+is\s+running\b/.test(text) ||
    /\bwhat\s+is\s+cooling\s+apartment\s+6a\b/.test(text) ||
    /\bis\s+apartment\s+6a\s+cooling\b/.test(text) ||
    /\bwhy\s+isn'?t\s+apartment\s+6a\s+cooling\b/.test(text) ||
    /\bwhy\s+is\s+apartment\s+6a\s+not\s+cooling\b/.test(text);
  if (!isGeneral) return null;
  return intent("query", text, ["LUNA-L06-APT-A-AC-OUTDOOR-01"]);
};

// Access & Security System V1 — aggregate/investigation questions that
// don't name one specific common access point alias and so wouldn't
// resolve through matchQuery's own asset-alias lookup ("which doors are
// unlocked", "why was access denied", "show me the last access attempt",
// "who attempted access", "show me the access point"). All resolve to
// MAIN-01 — the one real anchor whose explainAsset narrative (see
// lunaExplain.ts's explainAccessState) covers every registered point plus
// the real access event log, the same "one honest anchor for an aggregate
// question" precedent as matchFireStatus/matchHvacStatus. A specific
// point named by its own alias ("is the main entrance locked", "is the
// residential entrance secure") already resolves through matchQuery's
// plain matchAsset() lookup and never reaches this matcher.
const matchAccessStatus: Matcher = (text) => {
  const isGeneral =
    /\bwhich\s+doors?\s+(are|is)\s+(currently\s+)?unlocked\b/.test(text) ||
    /\bwhy\s+was\s+access\s+denied\b/.test(text) ||
    /\bshow\s+me\s+the\s+last\s+access\s+attempt\b/.test(text) ||
    /\bwho\s+attempted\s+access\b/.test(text) ||
    /\bshow\s+me\s+the\s+access\s+point\b/.test(text);
  if (!isGeneral) return null;
  return intent("query", text, ["LUNA-GROUND-ACCESS-MAIN-01"]);
};

// CCTV & Spatial Security System V1 — the investigation flow: "show me
// the last access event"/"show me the security event" resolve to the one
// governed reference access point (Section 12's "SECURITY EVENT -> SHOW
// LOCATION" step); "show me the camera associated with..." resolves
// straight to its own real, canonical monitored_by camera — the one
// honest anchor precedent every prior aggregate-question matcher already
// uses (matchFireStatus/matchHvacStatus/matchAccessStatus), since only
// ONE access point in this catalog actually generates GRANTED/DENIED
// events at all (see lunaSimulationProvider.ts's ACCESS_GOVERNED_REFS).
// This matcher deliberately does NOT read live runtime/event state itself
// — like every other matcher here, it only resolves TEXT to a REF; the
// live event/camera narrative is composed later by lunaExplain.ts's
// explainAsset(), the same purity every prior matcher already preserves.
const matchCctvInvestigation: Matcher = (text) => {
  // "Show me the cameras." names no specific camera and doesn't contain
  // the literal word "system"/"structure"/"plant" matchShowSystem
  // requires — a small, CCTV-scoped addition rather than broadening that
  // generic matcher's trigger for every system. Anchored to end-of-phrase
  // so it does NOT swallow "show me the camera AT APARTMENT 6A" (a
  // specific-asset phrase, resolved later via matchAsset's own alias).
  if (/\bshow\s+me\s+the\s+cameras?[.?]?$/.test(text)) {
    return intent("show_system", text, [], { system: "security" });
  }
  if (/\bshow\s+me\s+the\s+camera\s+associated\s+with\b/.test(text)) {
    return intent("navigate", text, ["LUNA-L06-APT-A-ENTRY-INTERCOM-01"], { targetKind: "asset" });
  }
  if (/\bshow\s+me\s+the\s+(last\s+)?access\s+event\b/.test(text) || /\bshow\s+me\s+the\s+security\s+event\b/.test(text)) {
    return intent("navigate", text, ["LUNA-L06-APT-A-ENTRY-LOCK-01"], { targetKind: "asset" });
  }
  if (/\btake\s+me\s+to\s+the\s+camera\b/.test(text)) {
    return intent("navigate", text, [], { targetKind: "asset", unresolvedReason: "Which camera — 01 through 04, or the apartment intercom?" });
  }
  return null;
};

// Network/Edge & Physical Connectivity V1 — "show me the network." names
// no specific asset and doesn't contain "system"/"structure"/"plant", the
// same gap matchCctvInvestigation's own "show me the cameras" fix already
// covers — anchored to end-of-phrase for the identical reason (must not
// swallow a specific-asset phrase like "show me the network gateway",
// which already resolves correctly via matchAsset's own alias).
const matchNetworkInvestigation: Matcher = (text) => {
  if (/\bshow\s+me\s+the\s+network[.?]?$/.test(text)) {
    return intent("show_system", text, [], { system: "network-edge" });
  }
  return null;
};

const MATCHERS: Matcher[] = [matchLift, matchCommand, matchProblem, matchListStatus, matchDrainageInvestigation, matchShowRoute, matchShowRelationship, matchBuildingPower, matchFireStatus, matchHvacStatus, matchAccessStatus, matchCctvInvestigation, matchNetworkInvestigation, matchSpatialNavAction, matchQuery, matchShowSystem, matchExterior, matchNavigateOrAsset];

export function parseIntent(raw: string, context: TwinIntelligenceContext): ParsedIntent {
  const text = raw.toLowerCase().trim();
  for (const matcher of MATCHERS) {
    const result = matcher(text, context);
    if (result) return { ...result, raw };
  }
  return intent("unknown", raw, [], {
    unresolvedReason: 'I didn\'t quite catch that. Try things like "show me the water system" or "take me to Apartment 6A".',
  });
}
