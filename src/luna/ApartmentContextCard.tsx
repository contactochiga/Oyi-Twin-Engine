import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { GLASS_SURFACE, GLASS_ACCENT, useTwinData, useTwinRuntime, useRepresentation, FloorPlan2D } from "../engine";
import { LUNA_LEVELS } from "./lunaProgramme";
import { lunaRepresentationPolicy } from "./policy/lunaRepresentationPolicy";
import { unitLifecycleState } from "./policy/lunaUnitLifecycle";
import { residentialUnit } from "./lunaResidentialUnits";
import { residentStubFor } from "./lunaFacilityResidentStub";
import { unitStatusForFacility, floorPlanForLevel, roomTintColor } from "./policy/lunaFloorPlans";
import { interiorForUnit } from "./interiors/lunaSpaceLookup";
import { Representation2D3DToggle } from "./Representation2D3DToggle";
import type { CanonicalRef } from "../engine/types";
import type { UnitLifecycleState } from "../engine/representationPolicy";

const LIFECYCLE_COLOR: Record<UnitLifecycleState, string> = { occupied: "#3ddc84", available: "#7c8699", reserved: "#e8a33d" };
const LIFECYCLE_LABEL: Record<UnitLifecycleState, string> = { occupied: "Occupied", available: "Vacant", reserved: "Reserved" };

// Presentation Mode polish pass §7 — Occupancy/Utilities/Maintenance only.
// The generic "Overview" tab duplicated Occupancy's own content (both
// showed status/resident/lease/next-due), so it's gone; Occupancy is now
// simply the default tab instead of a separate landing tab in front of it.
type Tab = "occupancy" | "utilities" | "maintenance";
const TABS: { key: Tab; label: string }[] = [
  { key: "occupancy", label: "Occupancy" },
  { key: "utilities", label: "Utilities" },
  { key: "maintenance", label: "Maintenance" },
];

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0" }}>
      <span style={{ opacity: 0.6 }}>{label}</span>
      <span style={{ color: valueColor, fontWeight: valueColor ? 600 : 400 }}>{value}</span>
    </div>
  );
}

function formatStateValue(v: unknown): string {
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

interface ApartmentContextCardProps {
  unitRef: CanonicalRef;
  onBack: () => void;
  onClose: () => void;
  /** Spatial navigation restoration pass §6 — undefined when there's
   * nothing to enter (no InteriorSpec exists for this unit at all, e.g.
   * every generated unit and L06-APT-B/C/D); the button itself is only
   * ever rendered when representation policy ALSO grants FULL_3D, so
   * "does an interior scene exist" and "is entry authorized" are two
   * independent, both-required gates — never one bypassing the other. */
  onEnter?: () => void;
  navigationControls?: ReactNode;
  livePosition?: { x: number; z: number } | null;
  representationMode: "2D" | "3D";
  onSetRepresentationMode: (mode: "2D" | "3D") => void;
}

/** Facility-view apartment card (Phase 16A §5) — every field's visibility
 * is derived from lunaRepresentationPolicy, never a second permission
 * model in UI code. Deliberately no "Facility Fee" row (brief §5) and no
 * resident lifestyle/device state (TV, private lights/scenes) — only what
 * FACILITY's own resolveAssetMode already authorizes ever renders. This
 * is the SUMMARY/selection state only (Occupancy/Utilities/Maintenance);
 * once "Enter Apartment" succeeds the card switches to
 * InteriorNavigationCard instead — selecting a unit is never the same
 * thing as entering its private interior (restoration pass §6). */
export function ApartmentContextCard({ unitRef, onBack, onClose, onEnter, representationMode, onSetRepresentationMode, navigationControls, livePosition }: ApartmentContextCardProps) {
  const [tab, setTab] = useState<Tab>("occupancy");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const twinData = useTwinData();
  const twinRuntime = useTwinRuntime();
  const { identity } = useRepresentation();

  useEffect(() => {
    if (!menuOpen) return;
    const onDocPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [menuOpen]);

  const level = LUNA_LEVELS.find((l) => unitRef.startsWith(l.ref + "-") || unitRef === l.ref);
  const generated = residentialUnit(unitRef);
  const lifecycle: UnitLifecycleState = unitLifecycleState(unitRef) ?? generated?.lifecycle ?? "occupied";
  // unitType already encodes bedroom count (e.g. "2 Bed Residence",
  // "3 Bed Premium") — appending "· N Bed" on top of it repeated the same
  // number twice (polish pass §7's "no information duplication" rule).
  const unitType = generated?.unitType ?? (unitRef.includes("L10") ? "3 Bed Premium" : "Residence");
  const resident = lifecycle === "occupied" ? residentStubFor(unitRef, "occupied") : undefined;

  const allAssets = twinData.listAssets();
  const unitAssets = allAssets.filter((a) => a.unitRef === unitRef);
  const authorizedUnitAssets = unitAssets.filter((a) => lunaRepresentationPolicy.resolveMode({ ref: a.ref, identity }) !== "HIDDEN");
  const states = allAssets.map((a) => twinRuntime.getState(a.ref)).filter((s): s is NonNullable<typeof s> => Boolean(s));
  const facilityStatus = unitStatusForFacility(unitRef, allAssets, states);

  // Correction §4 — the card's header visual is the unit's own real plan
  // position within its level's existing FloorPlan2D spec (the same
  // primitive/data LevelContextCard already renders), not a fabricated
  // marketing interior photo. Works uniformly whether the unit is a real
  // backend row (L06/L10) or Phase 16A generated reference data, since
  // both already appear in `floorPlanForLevel`'s spec either way.
  const plan = level ? floorPlanForLevel(level.ref) : undefined;
  const planUnitStates = plan ? Object.fromEntries(plan.units.map((u) => [u.ref, unitStatusForFacility(u.ref, allAssets, states)])) : undefined;

  const levelShort = level?.label.replace(/^Level /, "L").replace(/\s*—.*/, "") ?? level?.ref ?? "";
  const unitSuffix = unitRef.split("-").pop();

  // Restoration pass §6/§10 — "Enter Apartment" is only ever offered when
  // BOTH an interior scene actually exists for this unit (interiorForUnit
  // — true today only for LUNA-L06-APT-A, LUNA-L10-APT-A, LUNA-PENTHOUSE)
  // AND representation policy grants full private-interior access for the
  // CURRENT identity (FULL_3D — a resident assigned to this exact home, or
  // public browsing a unit that's still available for sale/lease). Facility
  // never gets FULL_3D for a private unit (resolveUnitMode is
  // unconditionally OPERATIONAL_2D for facility role — see
  // lunaRepresentationPolicy.ts), so Facility never sees this button,
  // matching the brief's own worked example exactly.
  const hasInteriorScene = Boolean(interiorForUnit(unitRef));
  const canEnter = hasInteriorScene && onEnter && lunaRepresentationPolicy.resolveMode({ ref: unitRef, identity }) === "FULL_3D";
  // Contacting a resident is a Facility operational action — Public has no
  // legitimate reason to reach a private resident directly, and a resident
  // viewing their own home has no reason to "call" themselves, so this is
  // deliberately narrower than the general asset-visibility gate above.
  const canContactResident = identity.role === "facility";

  return (
    <div style={{ ...GLASS_SURFACE, width: "min(300px, 100%)", padding: "14px 18px 16px", pointerEvents: "auto", maxHeight: "min(80vh, 660px)", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: GLASS_ACCENT, fontSize: 11.5, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
          ‹ {level?.label ?? "Level"}
        </button>
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="More options"
            aria-expanded={menuOpen}
            style={{ background: "none", border: "none", color: "inherit", opacity: 0.5, cursor: "pointer", fontSize: 13, letterSpacing: 1.5, padding: "2px 4px" }}
          >
            •••
          </button>
          {menuOpen && (
            <div style={{ ...GLASS_SURFACE, position: "absolute", top: "calc(100% + 6px)", right: 0, width: 140, padding: 6, zIndex: 30 }}>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onClose();
                }}
                style={{ textAlign: "left", background: "none", border: "none", color: "inherit", padding: "8px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer", width: "100%" }}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>

      <div data-spatial-card-breadcrumb style={{ fontSize: 9.5, opacity: 0.45, letterSpacing: "0.03em", marginTop: 6 }}>
        {level?.label ?? "Level"} › Apartment {unitSuffix}
      </div>

      <div style={{ marginTop: 8, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            Apartment {unitSuffix}
            {levelShort ? ` · ${levelShort}` : ""}
          </div>
          <div style={{ fontSize: 11.5, opacity: 0.6, marginTop: 1 }}>{unitType}</div>
        </div>
        {plan && <Representation2D3DToggle mode={representationMode} onSetMode={onSetRepresentationMode} />}
      </div>

      {navigationControls}
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8, fontSize: 11 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: LIFECYCLE_COLOR[lifecycle] }} />
        <span style={{ color: LIFECYCLE_COLOR[lifecycle], fontWeight: 600 }}>{LIFECYCLE_LABEL[lifecycle]}</span>
      </div>

      {plan && planUnitStates && (
        <div style={{ marginTop: 10, height: 108, borderRadius: 10, overflow: "hidden", background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "100%", aspectRatio: `${plan.outline.width} / ${plan.outline.depth}`, color: "rgba(255,255,255,0.85)" }}>
            <FloorPlan2D livePosition={livePosition} spec={plan} unitStates={planUnitStates} selectedRef={unitRef} roomTintColor={roomTintColor} />
          </div>
        </div>
      )}

      {canEnter && (
        <button
          onClick={onEnter}
          style={{
            marginTop: 10,
            width: "100%",
            background: "rgba(184, 138, 240, 0.16)",
            border: `1px solid ${GLASS_ACCENT}55`,
            color: "#e6d6ff",
            borderRadius: 9,
            padding: "8px 10px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Enter Apartment
        </button>
      )}

      <div style={{ display: "flex", gap: 2, marginTop: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              borderBottom: tab === t.key ? `2px solid ${GLASS_ACCENT}` : "2px solid transparent",
              color: tab === t.key ? "#e6d6ff" : "rgba(242,242,245,0.55)",
              fontSize: 11,
              fontWeight: 600,
              padding: "7px 2px",
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "occupancy" && (
        <div style={{ marginTop: 12 }}>
          <Row label="Status" value={LIFECYCLE_LABEL[lifecycle]} valueColor={LIFECYCLE_COLOR[lifecycle]} />
          {resident ? (
            <>
              <Row label="Resident" value={resident.residentName} />
              <Row label="Lease Status" value={resident.leaseStatus} />
              <Row label="Next Due" value={resident.nextDue} />
            </>
          ) : (
            <div style={{ fontSize: 11.5, opacity: 0.55, fontStyle: "italic", marginTop: 6 }}>No resident/lease record — unit is {LIFECYCLE_LABEL[lifecycle].toLowerCase()}.</div>
          )}

          {lifecycle === "occupied" && canContactResident && (
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <CardButton label="Call" icon="☎" />
              <CardButton label="Message" icon="✉" />
            </div>
          )}
        </div>
      )}

      {tab === "utilities" && (
        <div style={{ marginTop: 12 }}>
          {authorizedUnitAssets.length === 0 ? (
            <div style={{ fontSize: 11.5, opacity: 0.55, fontStyle: "italic" }}>No Facility-owned meters modeled for this residence yet.</div>
          ) : (
            authorizedUnitAssets.map((asset) => {
              const runtime = twinRuntime.getState(asset.ref);
              return (
                <div key={asset.ref} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, opacity: 0.85 }}>{asset.label}</div>
                  {runtime ? (
                    Object.entries(runtime.state)
                      .slice(0, 3)
                      .map(([k, v]) => <Row key={k} label={k.replace(/_/g, " ")} value={formatStateValue(v)} />)
                  ) : (
                    <div style={{ fontSize: 11, opacity: 0.5 }}>No live reading available.</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "maintenance" && (
        <div style={{ marginTop: 12 }}>
          <Row
            label="Facility Status"
            value={facilityStatus.statusLabel}
            valueColor={facilityStatus.tone === "attention" ? "#e5484d" : facilityStatus.tone === "maintenance" ? "#e8a33d" : "#3ddc84"}
          />
          {authorizedUnitAssets.length === 0 && (
            <div style={{ fontSize: 11.5, opacity: 0.55, fontStyle: "italic", marginTop: 6 }}>
              No Facility-owned equipment modeled for this residence — status reflects lease/occupancy state only.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CardButton({ label, icon }: { label: string; icon: string }) {
  const [note, setNote] = useState(false);
  return (
    <div style={{ flex: 1 }}>
      <button
        onClick={() => setNote(true)}
        style={{ width: "100%", background: "rgba(184, 138, 240, 0.14)", border: `1px solid ${GLASS_ACCENT}55`, color: "#e6d6ff", borderRadius: 9, padding: "8px 10px", fontSize: 12, cursor: "pointer" }}
      >
        {icon} {label}
      </button>
      {note && <div style={{ fontSize: 9.5, opacity: 0.5, marginTop: 3, textAlign: "center" }}>Not connected in this reference build</div>}
    </div>
  );
}
