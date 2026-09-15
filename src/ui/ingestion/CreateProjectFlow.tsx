import { useMemo, useState } from "react";
import { GLASS_SURFACE, GLASS_ACCENT } from "../../engine/components/spatial/glassStyle";
import type { ProjectStore } from "../../engine/ingestion/projectStore";
import type { BuildingSourceRecord, MappingProposal, ProjectRecord, SourceFormat, SourceRole } from "../../engine/ingestion/types";
import { SOURCE_FORMAT_REGISTRY, formatDescriptor } from "../../engine/ingestion/formatRegistry";
import { SOURCE_ROLE_REGISTRY, sourceRoleDescriptor } from "../../engine/ingestion/sourceRoles";
import type { SourceAdapterRegistry } from "../../engine/ingestion/adapters";

// Building Ingestion V1 — the "Create New Project" foundation (brief Part
// B12). Generic/building-agnostic: this component only depends on the
// engine-layer ProjectStore/adapter-registry contracts, never on Luna
// directly — whatever project(s) the host has already seeded (Luna, via
// ensureLunaProject in App.tsx) simply show up here like any other.
//
// CREATE PROJECT -> BUILDING SOURCES -> INGESTION -> REVIEW -> PUBLISH.
// Steps that have no real working implementation yet are explicitly
// labeled COMING NEXT / REQUIRES REVIEW rather than faked (Part B12's own
// instruction) — this is a foundation, not the full platform.

const STEP_LABELS = ["Project", "Sources", "Ingestion", "Review", "Publish"] as const;
type Step = (typeof STEP_LABELS)[number];

function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" | "bad" }) {
  const color = tone === "good" ? "#7be0a8" : tone === "warn" ? "#f2c744" : tone === "bad" ? "#f5b8b0" : "#c9c9d4";
  return (
    <span style={{ fontSize: 10, letterSpacing: "0.04em", textTransform: "uppercase", color, border: `1px solid ${color}55`, borderRadius: 999, padding: "2px 8px" }}>
      {children}
    </span>
  );
}

function SupportBadge({ format }: { format: SourceFormat }) {
  const descriptor = formatDescriptor(format);
  if (!descriptor) return null;
  const tone = descriptor.supportLevel === "SUPPORTED" ? "good" : descriptor.supportLevel === "PARTIALLY_SUPPORTED" ? "warn" : descriptor.supportLevel === "VISUAL_ONLY" ? "warn" : "bad";
  return <StatusPill tone={tone}>{descriptor.supportLevel.replace(/_/g, " ")}</StatusPill>;
}

export interface CreateProjectFlowProps {
  store: ProjectStore;
  adapters: SourceAdapterRegistry;
  onClose: () => void;
}

export function CreateProjectFlow({ store, adapters, onClose }: CreateProjectFlowProps) {
  const [step, setStep] = useState<Step>("Project");
  const [projects, setProjects] = useState<ProjectRecord[]>(() => store.listProjects());
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projects[0]?.projectId ?? null);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<SourceRole | "">("");
  const [form, setForm] = useState({ name: "", projectId: "", developerOwner: "", projectType: "", buildingType: "", address: "", phase: "concept" as ProjectRecord["phase"], designRevision: "", notes: "" });
  const [, forceRerender] = useState(0);

  const refresh = () => {
    setProjects(store.listProjects());
    forceRerender((n) => n + 1);
  };

  const selectedProject = projects.find((p) => p.projectId === selectedProjectId) ?? null;
  const sources = useMemo(() => (selectedProjectId ? store.listSources(selectedProjectId) : []), [selectedProjectId, store, projects]);
  const selectedSource: BuildingSourceRecord | undefined = sources.find((s) => s.sourceId === selectedSourceId) ?? sources[0];
  const mappings: MappingProposal[] = selectedSource ? store.listMappings(selectedSource.sourceId) : [];
  const published = selectedProjectId ? store.listPublished(selectedProjectId) : [];

  const createProject = () => {
    if (!form.name.trim() || !form.projectId.trim()) return;
    const record = store.createProject(form);
    setSelectedProjectId(record.projectId);
    refresh();
    setStep("Sources");
  };

  const registerSource = async (file: File) => {
    if (!selectedProjectId) return;
    const bytes = await file.arrayBuffer();
    const ext = file.name.split(".").pop()?.toLowerCase();
    const format: SourceFormat = (["rvt", "ifc", "archicad", "skp", "glb", "gltf", "pdf", "cad"].find((f) => f === ext) as SourceFormat) ?? "cad";
    const adapter = adapters.listForFormat(format)[0];
    const record = await store.registerSource({ projectId: selectedProjectId, fileName: file.name, sourceFormat: format, adapter: adapter?.id ?? "none", role: pendingRole || undefined, bytes });
    setSelectedSourceId(record.sourceId);
    setPendingRole("");
    refresh();
  };

  const runExtraction = async () => {
    if (!selectedSource) return;
    const adapter = adapters.get(selectedSource.adapter);
    if (!adapter) return; // no working adapter — the Ingestion tab already discloses this, never silently fakes it
    const model = await adapter.extract(selectedSource);
    store.recordExtraction(selectedSource.sourceId, model);
    refresh();
  };

  const reviewAction = (mapping: MappingProposal, action: "CONFIRMED" | "REJECTED") => {
    store.updateMappingStatus(mapping.mappingId, action, { reviewer: "Facility Manager" });
    refresh();
  };

  const publishProject = () => {
    if (!selectedProjectId) return;
    store.publish(selectedProjectId);
    refresh();
    setStep("Publish");
  };

  const confirmedCount = mappings.filter((m) => m.status === "CONFIRMED" || m.status === "EDITED").length;

  return (
    <div data-create-project-flow style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(6, 8, 14, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "auto" }}>
      <div style={{ ...GLASS_SURFACE, width: 720, maxHeight: "82vh", overflow: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.55 }}>Oyi Building Ingestion</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Create New Project</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "transparent", border: "none", color: "inherit", opacity: 0.6, cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>

        <div role="tablist" style={{ display: "flex", gap: 4, borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 8 }}>
          {STEP_LABELS.map((label) => (
            <button
              key={label}
              role="tab"
              aria-selected={step === label}
              onClick={() => setStep(label)}
              style={{
                background: step === label ? `${GLASS_ACCENT}22` : "transparent",
                border: `1px solid ${step === label ? GLASS_ACCENT + "66" : "transparent"}`,
                color: "inherit",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {step === "Project" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 11, opacity: 0.6 }}>Existing projects</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {projects.map((p) => (
                <button
                  key={p.projectId}
                  onClick={() => { setSelectedProjectId(p.projectId); setStep("Sources"); }}
                  style={{ textAlign: "left", background: p.projectId === selectedProjectId ? `${GLASS_ACCENT}18` : "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "8px 10px", color: "inherit", cursor: "pointer", display: "flex", justifyContent: "space-between" }}
                >
                  <span>{p.name} <span style={{ opacity: 0.5, fontSize: 11 }}>({p.projectId})</span></span>
                  <StatusPill tone={p.ingestionStatus === "published" ? "good" : "neutral"}>{p.ingestionStatus.replace(/_/g, " ")}</StatusPill>
                </button>
              ))}
              {projects.length === 0 && <div style={{ fontSize: 12, opacity: 0.5 }}>No projects yet.</div>}
            </div>

            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 8 }}>New project</div>
            {(["name", "projectId", "developerOwner", "projectType", "buildingType", "address", "designRevision"] as const).map((field) => (
              <input
                key={field}
                placeholder={field === "projectId" ? "Project ID (e.g. LUNA)" : field.replace(/([A-Z])/g, " $1")}
                value={form[field]}
                onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", color: "#eee", fontSize: 12.5, padding: "8px 10px", borderRadius: 8, outline: "none" }}
              />
            ))}
            <select value={form.phase} onChange={(e) => setForm((f) => ({ ...f, phase: e.target.value as ProjectRecord["phase"] }))} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", color: "#eee", fontSize: 12.5, padding: "8px 10px", borderRadius: 8 }}>
              {(["concept", "reference", "design", "construction", "operational"] as const).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <textarea
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", color: "#eee", fontSize: 12.5, padding: "8px 10px", borderRadius: 8, outline: "none", resize: "vertical" }}
            />
            <button onClick={createProject} disabled={!form.name.trim() || !form.projectId.trim()} style={{ background: `${GLASS_ACCENT}33`, border: `1px solid ${GLASS_ACCENT}8c`, color: "#fff", borderRadius: 8, padding: "9px 14px", fontSize: 12.5, cursor: "pointer", alignSelf: "flex-start" }}>
              Create Project
            </button>
          </div>
        )}

        {step === "Sources" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {!selectedProject && <div style={{ fontSize: 12, opacity: 0.6 }}>Select or create a project first.</div>}
            {selectedProject && (
              <>
                <div style={{ fontSize: 12, opacity: 0.75 }}>Building sources for <strong>{selectedProject.name}</strong></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {sources.map((s) => (
                    <button
                      key={s.sourceId}
                      onClick={() => setSelectedSourceId(s.sourceId)}
                      style={{ textAlign: "left", background: s.sourceId === selectedSource?.sourceId ? `${GLASS_ACCENT}18` : "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "8px 10px", color: "inherit", cursor: "pointer" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>{s.fileName}</span>
                        <div style={{ display: "flex", gap: 4 }}>
                          {s.role && <StatusPill>{sourceRoleDescriptor(s.role)?.label ?? s.role}</StatusPill>}
                          <SupportBadge format={s.sourceFormat} />
                        </div>
                      </div>
                      <div style={{ fontSize: 10.5, opacity: 0.55, marginTop: 2 }}>
                        {s.sourceFormat.toUpperCase()} · extraction: {s.extractionStatus} · review: {s.reviewStatus} {s.checksum ? `· checksum ${s.checksum.slice(0, 10)}…` : ""}
                      </div>
                    </button>
                  ))}
                  {sources.length === 0 && <div style={{ fontSize: 12, opacity: 0.5 }}>No sources registered yet.</div>}
                </div>
                {/* Part 3 — role is declared explicitly here, never inferred
                    from the file extension: a project commonly arrives with
                    several coordinated sources (a BIM model AND a 2D plan
                    set AND a site survey), and the registry must retain
                    which is which. Optional (left blank = unspecified),
                    matching every other additive V2 field's own discipline
                    of never forcing a value the user hasn't actually stated. */}
                <label style={{ fontSize: 11, opacity: 0.6 }}>What does this source represent? (optional, but recommended)</label>
                <select value={pendingRole} onChange={(e) => setPendingRole(e.target.value as SourceRole | "")} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", color: "#eee", fontSize: 12.5, padding: "8px 10px", borderRadius: 8 }}>
                  <option value="">Unspecified</option>
                  {SOURCE_ROLE_REGISTRY.map((r) => <option key={r.role} value={r.role}>{r.label}</option>)}
                </select>
                {pendingRole && <div style={{ fontSize: 10.5, opacity: 0.5 }}>{sourceRoleDescriptor(pendingRole)?.description}</div>}
                <label style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>Register a new source file</label>
                <input type="file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void registerSource(f); }} style={{ fontSize: 12 }} />
                <div style={{ fontSize: 10.5, opacity: 0.5 }}>Supported formats and their real status: {SOURCE_FORMAT_REGISTRY.map((f) => f.label).join(", ")}. See the Ingestion tab for what happens next.</div>
              </>
            )}
          </div>
        )}

        {step === "Ingestion" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {!selectedSource && <div style={{ fontSize: 12, opacity: 0.6 }}>Register a source first.</div>}
            {selectedSource && (
              <>
                <div style={{ fontSize: 12, opacity: 0.75 }}>{selectedSource.fileName}</div>
                <SupportBadge format={selectedSource.sourceFormat} />
                <div style={{ fontSize: 11, opacity: 0.6 }}>{formatDescriptor(selectedSource.sourceFormat)?.note}</div>
                {adapters.get(selectedSource.adapter) ? (
                  <button onClick={() => void runExtraction()} style={{ background: `${GLASS_ACCENT}33`, border: `1px solid ${GLASS_ACCENT}8c`, color: "#fff", borderRadius: 8, padding: "9px 14px", fontSize: 12.5, cursor: "pointer", alignSelf: "flex-start" }}>
                    Run Extraction
                  </button>
                ) : (
                  <div style={{ fontSize: 12, opacity: 0.6, fontStyle: "italic" }}>COMING NEXT — no working adapter is registered for this format yet. Nothing is fabricated in its place.</div>
                )}
                {store.getExtraction(selectedSource.sourceId) && (
                  <div style={{ fontSize: 11.5, opacity: 0.75 }}>
                    Extracted {store.getExtraction(selectedSource.sourceId)!.objects.length} objects.
                    {store.getExtraction(selectedSource.sourceId)!.warnings.length > 0 && (
                      <div style={{ marginTop: 4, opacity: 0.6 }}>{store.getExtraction(selectedSource.sourceId)!.warnings.length} warning(s) — see Review.</div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {step === "Review" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {mappings.length === 0 && <div style={{ fontSize: 12, opacity: 0.6 }}>No mappings to review yet — run extraction first.</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflow: "auto" }}>
              {mappings.map((m) => (
                <div key={m.mappingId} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "8px 10px", fontSize: 11.5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{m.sourceCrosswalk.sourceName}</span>
                    <StatusPill tone={m.status === "CONFIRMED" || m.status === "EDITED" ? "good" : m.status === "REJECTED" ? "bad" : m.status === "UNRESOLVED" || m.status === "DESIGN_DECISION_REQUIRED" ? "warn" : "neutral"}>{m.status}</StatusPill>
                  </div>
                  <div style={{ opacity: 0.6, marginTop: 2 }}>
                    Proposed: {(m.editedRef ?? m.proposedRef) || "—"} · Confidence: {m.confidence === "UNKNOWN" ? "UNKNOWN" : `${Math.round(m.confidence * 100)}%`}
                  </div>
                  {m.status === "PROPOSED" && (
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <button onClick={() => reviewAction(m, "CONFIRMED")} style={{ background: "rgba(123,224,168,0.15)", border: "1px solid rgba(123,224,168,0.4)", color: "#dff7e8", borderRadius: 6, padding: "4px 9px", fontSize: 11, cursor: "pointer" }}>Accept</button>
                      <button onClick={() => reviewAction(m, "REJECTED")} style={{ background: "rgba(245,184,176,0.12)", border: "1px solid rgba(245,184,176,0.4)", color: "#ffe0da", borderRadius: 6, padding: "4px 9px", fontSize: 11, cursor: "pointer" }}>Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === "Publish" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              {confirmedCount} of {mappings.length} mappings for this source are CONFIRMED/EDITED and eligible to publish. Everything else stays unresolved — nothing is silently promoted to canonical.
            </div>
            <button data-publish-action onClick={publishProject} disabled={!selectedProjectId} style={{ background: `${GLASS_ACCENT}33`, border: `1px solid ${GLASS_ACCENT}8c`, color: "#fff", borderRadius: 8, padding: "9px 14px", fontSize: 12.5, cursor: "pointer", alignSelf: "flex-start" }}>
              Publish
            </button>
            <div style={{ fontSize: 11, opacity: 0.6 }}>Published canonical refs for this project: {published.length}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 160, overflow: "auto" }}>
              {published.slice(0, 60).map((p) => (
                <span key={p.mappingId} style={{ fontSize: 10, background: "rgba(255,255,255,0.06)", borderRadius: 6, padding: "2px 6px" }}>{p.ref}</span>
              ))}
              {published.length > 60 && <span style={{ fontSize: 10, opacity: 0.5 }}>+{published.length - 60} more</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
