import { useState } from "react";
import type { OyiResponse, InteractionScope } from "../engine/twinIntelligence";
import { useTwinData } from "../engine/twinData";

interface OyiPanelProps {
  onAsk: (text: string) => Promise<OyiResponse>;
  scope: InteractionScope;
  onScopeChange: (scope: InteractionScope) => void;
}

const SUGGESTED_PROMPTS = [
  "Show critical issues",
  "Show me the water system",
  "Take me to Apartment 6A",
  "Turn on the living room light",
  "Set the living room AC to 22 degrees",
  "Which cameras are offline?",
  "Take me to Luna Sky",
];

interface Exchange {
  question: string;
  response: OyiResponse;
}

/** Phase 6's conversational surface — deliberately restrained (a single
 * input row, the last exchange, a short suggestion strip) rather than a
 * full scrolling chat transcript: Oyi's value here is that talking to it
 * moves and explains the building, not that it's a chat app bolted onto
 * one. All intelligence lives in App.tsx's TwinIntelligenceController;
 * this component only renders the conversation, it never resolves an
 * intent or touches the runtime provider itself. */
export function OyiPanel({ onAsk, scope, onScopeChange }: OyiPanelProps) {
  const twinData = useTwinData();
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [history, setHistory] = useState<Exchange[]>([]);

  const submit = async (text: string) => {
    const question = text.trim();
    if (!question || pending) return;
    setPending(true);
    setInput("");
    const response = await onAsk(question);
    setHistory((h) => [...h.slice(-2), { question, response }]);
    setPending(false);
  };

  const last = history[history.length - 1];
  const contextRef = last?.response.context.lastAssetRef ?? last?.response.context.lastSpaceRef;
  const contextLabel = contextRef ? twinData.getAsset(contextRef)?.label ?? contextRef : null;

  return (
    <div className="oyi-panel">
      <div className="oyi-panel__header">
        <span className="oyi-panel__title">Oyi</span>
        <div className="oyi-panel__scope">
          <button className={scope === "facility" ? "active" : ""} onClick={() => onScopeChange("facility")}>
            Facility
          </button>
          <button className={scope === "consumer" ? "active" : ""} onClick={() => onScopeChange("consumer")}>
            Consumer
          </button>
        </div>
      </div>

      {contextLabel && <div className="oyi-panel__context">Context: {contextLabel}</div>}

      <div className="oyi-panel__conversation">
        {history.length === 0 && <div className="oyi-panel__hint">Ask about a system, a space, or an asset — Oyi will show and explain it.</div>}
        {history.map((exchange, i) => (
          <div key={i} className="oyi-panel__exchange">
            <div className="oyi-panel__question">{exchange.question}</div>
            <div className={`oyi-panel__answer ${exchange.response.deniedByScope ? "denied" : exchange.response.ok ? "" : "error"}`}>{exchange.response.text}</div>
          </div>
        ))}
        {pending && <div className="oyi-panel__answer oyi-panel__answer--pending">Thinking…</div>}
      </div>

      <div className="oyi-panel__prompts">
        {SUGGESTED_PROMPTS.map((p) => (
          <button key={p} className="oyi-panel__prompt" disabled={pending} onClick={() => submit(p)}>
            {p}
          </button>
        ))}
      </div>

      <form
        className="oyi-panel__input-row"
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        <input value={input} disabled={pending} placeholder="Ask Oyi about Luna…" onChange={(e) => setInput(e.target.value)} />
        <button type="submit" disabled={pending || !input.trim()}>
          Ask
        </button>
      </form>
    </div>
  );
}
