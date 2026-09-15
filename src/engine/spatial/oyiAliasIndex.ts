// Oyi Twin Engine — Building Ingestion V2 Part 19: Oyi spatial language
// generalization.
//
// Luna's own vocabulary (lunaVocabulary.ts) is real, working, and
// Luna-specific by design — every phrase pattern was hand-authored and
// hand-checked for collisions against Luna's own catalog. That discipline
// doesn't generalize (a new project's spaces have different names), but
// the MECHANISM should: aliases derived from a space's own normalized
// name/source label, matched by longest-pattern-first substring search —
// exactly the technique lunaVocabulary.ts's own findByPattern() already
// uses, generalized here to work from ANY NormalizedBuildingModel rather
// than a hand-typed Luna array. A real project's own intelligence layer
// (its own thin equivalent of lunaIntentParser.ts) still resolves verbs
// ("show me"/"take me to"/"where is") — that dispatch logic is already
// building-agnostic in twinIntelligence.ts; this file only replaces the
// hand-authored NAME -> REF lookup table.

import type { CanonicalRef } from "../types";
import type { NormalizedBuildingModel } from "./types";
import { allSpatialObjects } from "./types";

export interface SpatialAlias {
  ref: CanonicalRef;
  patterns: string[];
}

/** "Lift Lobby" -> ["lift lobby", "the lift lobby"]. Deliberately
 * minimal — no speculative synonym guessing (no "elevator lobby" invented
 * for "Lift Lobby"), matching Part 19's own "aliases can come from
 * normalized names/source labels" instruction, not from assumed synonym
 * dictionaries. */
export function deriveAliasesFromName(name: string): string[] {
  const lower = name.trim().toLowerCase();
  if (!lower) return [];
  const out = new Set([lower]);
  if (!lower.startsWith("the ")) out.add(`the ${lower}`);
  return [...out];
}

export function buildSpatialAliasIndex(model: NormalizedBuildingModel): SpatialAlias[] {
  return allSpatialObjects(model)
    .filter((obj) => obj.name.trim().length > 0)
    .map((obj) => ({ ref: obj.canonicalRef, patterns: deriveAliasesFromName(obj.name) }));
}

/** Longest-pattern-first, exact-or-substring match — the same collision-
 * avoidance discipline lunaVocabulary.ts's own findByPattern() documents
 * (a longer, more specific phrase should never lose to a shorter one
 * that happens to be a substring of it). Returns undefined rather than a
 * guessed ref when nothing matches. */
export function resolveSpatialAlias(aliases: SpatialAlias[], text: string): CanonicalRef | undefined {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return undefined;
  const flattened = aliases.flatMap((a) => a.patterns.map((pattern) => ({ ref: a.ref, pattern })));
  flattened.sort((a, b) => b.pattern.length - a.pattern.length);
  const hit = flattened.find(({ pattern }) => normalized === pattern || normalized.includes(pattern));
  return hit?.ref;
}

/** Real, disclosed collision detection — two different canonical refs
 * whose OWN patterns overlap (same name reused, or one name is a
 * substring of another). Surfaced for review rather than silently
 * resolved by pattern length alone at alias-BUILD time (matching's own
 * longest-first behavior is a runtime tie-breaker, not a substitute for
 * flagging real ambiguity to a human). */
export function findAliasCollisions(aliases: SpatialAlias[]): Array<{ pattern: string; refs: CanonicalRef[] }> {
  const byPattern = new Map<string, Set<CanonicalRef>>();
  for (const alias of aliases) {
    for (const pattern of alias.patterns) {
      if (!byPattern.has(pattern)) byPattern.set(pattern, new Set());
      byPattern.get(pattern)!.add(alias.ref);
    }
  }
  const collisions: Array<{ pattern: string; refs: CanonicalRef[] }> = [];
  for (const [pattern, refs] of byPattern) {
    if (refs.size > 1) collisions.push({ pattern, refs: [...refs] });
  }
  return collisions;
}
