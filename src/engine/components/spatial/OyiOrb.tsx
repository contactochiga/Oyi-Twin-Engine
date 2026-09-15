import { useState } from "react";
import { GLASS_SURFACE, GLASS_ACCENT } from "./glassStyle";
import type { OyiResponse } from "../../twinIntelligence";

export interface OyiOrbProps {
  onAsk: (text: string) => Promise<OyiResponse>;
  placeholder?: string;
  suggestedPrompts?: string[];
  /** Optionally-controlled open state (Oyi Visual Identity Integration) —
   * lets a host share ONE conversation-open boolean between this orb and
   * another entry point (e.g. a top-bar identity mark) instead of each
   * maintaining its own. Falls back to internal state when omitted, so
   * every pre-existing uncontrolled usage is unaffected. */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

// Oyi Visual Identity Integration — the closed-state button now reuses the
// SAME identity language as Facility's own conversation launcher
// (facility-oyi/components/oyi-shell/OyiOrb.tsx + its `.oyi-shell-orb`
// class in app/globals.css), ported value-for-value rather than
// approximated from a screenshot: dark glass circle (#06101d), a sky/cyan
// border + glow (not the prior purple treatment), and the literal "Oyi"
// wordmark as text — the actual asset Facility uses for this exact
// surface, not a redrawn logo.
const OYI_ORB_BG = "#06101d";
const OYI_ORB_BORDER = "rgba(125, 211, 252, 0.3)"; // sky-300/30
const OYI_ORB_BORDER_HOVER = "rgba(125, 211, 252, 0.6)"; // sky-300/60
const OYI_ORB_GLOW = "0 10px 40px rgba(56, 189, 248, 0.35)"; // sky-400/35

/** Presentation mode's Oyi entry point (Phase 12) — a small orb instead of
 * a permanently-open chat panel. Click expands a compact glass composer;
 * click the orb again (or ask empty space to dismiss via the host's own
 * onPointerMissed) collapses it back to just the orb. Wraps the exact same
 * onAsk callback the development harness's OyiPanel already uses — same
 * parseIntent → TwinIntelligenceController → TwinRuntimeProvider pipeline,
 * this is only a different presentation of it. */
export function OyiOrb({ onAsk, placeholder = "Ask Oyi about Luna...", suggestedPrompts = [], expanded: expandedProp, onExpandedChange }: OyiOrbProps) {
  const [expandedState, setExpandedState] = useState(false);
  const expanded = expandedProp ?? expandedState;
  const setExpanded = (value: boolean) => { setExpandedState(value); onExpandedChange?.(value); };
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<OyiResponse | null>(null);

  const submit = async (text: string) => {
    const question = text.trim();
    if (!question || pending) return;
    setPending(true);
    setInput("");
    const response = await onAsk(question);
    setLastAnswer(response);
    setPending(false);
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        aria-label="Ask Oyi"
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = OYI_ORB_BORDER_HOVER; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = OYI_ORB_BORDER; }}
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: `1px solid ${OYI_ORB_BORDER}`,
          background: OYI_ORB_BG,
          boxShadow: OYI_ORB_GLOW,
          color: "#fff",
          fontSize: 18,
          fontWeight: 600,
          cursor: "pointer",
          pointerEvents: "auto",
          transition: "border-color 160ms ease",
        }}
      >
        Oyi
      </button>
    );
  }

  return (
    <div style={{ ...GLASS_SURFACE, width: 340, padding: 14, pointerEvents: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: "#d9c2ff" }}>Oyi</span>
        <button
          onClick={() => setExpanded(false)}
          aria-label="Collapse Oyi"
          style={{ background: "transparent", border: "none", color: "inherit", opacity: 0.6, cursor: "pointer", fontSize: 15 }}
        >
          ✕
        </button>
      </div>

      {lastAnswer && (
        <div
          style={{
            fontSize: 12.5,
            lineHeight: 1.4,
            marginBottom: 10,
            color: lastAnswer.deniedByScope ? "#ffdca0" : lastAnswer.ok ? "#eee" : "#f5b8b0",
          }}
        >
          {lastAnswer.text}
        </div>
      )}
      {pending && <div style={{ fontSize: 12, opacity: 0.6, fontStyle: "italic", marginBottom: 10 }}>Thinking…</div>}

      {suggestedPrompts.length > 0 && !lastAnswer && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {suggestedPrompts.slice(0, 4).map((p) => (
            <button
              key={p}
              disabled={pending}
              onClick={() => submit(p)}
              style={{
                background: "rgba(184, 138, 240, 0.1)",
                border: `1px solid ${GLASS_ACCENT}4d`,
                color: "#d9c2ff",
                borderRadius: 999,
                padding: "5px 10px",
                fontSize: 10.5,
                cursor: "pointer",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        style={{ display: "flex", gap: 6 }}
      >
        <input
          value={input}
          disabled={pending}
          placeholder={placeholder}
          onChange={(e) => setInput(e.target.value)}
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.14)",
            color: "#eee",
            fontSize: 12.5,
            padding: "8px 10px",
            borderRadius: 9,
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          style={{ background: "rgba(184,138,240,0.22)", border: `1px solid ${GLASS_ACCENT}8c`, color: "#e6d6ff", borderRadius: 9, padding: "8px 14px", fontSize: 12.5, cursor: "pointer" }}
        >
          Ask
        </button>
      </form>
    </div>
  );
}
