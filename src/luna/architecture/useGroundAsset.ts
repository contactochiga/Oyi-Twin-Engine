import { useEffect, useMemo, useState } from "react";
import { useRepresentation } from "../../engine/hooks/useRepresentation";
import { admitGroundSource, loadGroundAsset } from "./groundAsset";
import type { GroundAsset, GroundAssetSource } from "./groundAsset";

export function useGroundAsset(source?: GroundAssetSource) {
  const { identity, policy } = useRepresentation();
  // Value keys prevent unrelated host renders from restarting loads. Identity
  // changes invalidate the mounted asset synchronously, before effect cleanup.
  const sourceKey = JSON.stringify(source ?? null);
  const identityKey = JSON.stringify(identity);
  const stableSource = useMemo(() => JSON.parse(sourceKey) as GroundAssetSource | null, [sourceKey]);
  const stableIdentity = useMemo(() => JSON.parse(identityKey) as typeof identity, [identityKey]);
  const ticket = useMemo(() => ({ stableSource, stableIdentity, policy }), [stableSource, stableIdentity, policy]);
  const [result, setResult] = useState<{ ticket: object; asset?: GroundAsset; error?: string } | null>(null);
  let admissionError: string | undefined;
  if (stableSource) {
    try { admitGroundSource(stableSource, policy, stableIdentity); }
    catch (error) { admissionError = String(error); }
  }
  useEffect(() => {
    if (!stableSource || admissionError) return;
    const abort = new AbortController();
    let owned: GroundAsset | undefined;
    void loadGroundAsset(stableSource, policy, stableIdentity, abort.signal).then(asset => {
      if (abort.signal.aborted) { asset.dispose(); return; }
      owned = asset;
      setResult({ ticket, asset });
    }).catch(error => {
      if (!abort.signal.aborted) setResult({ ticket, error: String(error) });
    });
    return () => { abort.abort(); owned?.dispose(); };
  }, [stableSource, stableIdentity, policy, ticket, admissionError]);
  const current = !admissionError && result?.ticket === ticket ? result : null;
  return {
    asset: current?.asset,
    status: !stableSource ? 'procedural' : admissionError ? 'rejected' : current?.error ? 'failed' : current?.asset ? 'imported' : 'loading',
    error: admissionError ?? current?.error,
  };
}

