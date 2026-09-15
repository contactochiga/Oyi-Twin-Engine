import { useSelection } from "../engine/hooks/useSelection";

/** Debug/inspection panel proving the 3D scene resolves to the same
 * canonical reference strings the Oyi backend already uses. This is
 * intentionally plain — Phase 1 scope is "prove the identity resolves,"
 * not final UI polish. */
export function SelectionDebug() {
  const { selected } = useSelection();

  return (
    <div className="selection-debug">
      <div className="selection-debug__label">Selected</div>
      <div className="selection-debug__value">{selected ? selected.ref : "(none)"}</div>
      {selected && (
        <div className="selection-debug__meta">
          <div>
            <span>kind</span>
            {selected.kind}
          </div>
          <div>
            <span>label</span>
            {selected.label}
          </div>
          {selected.parentRef && (
            <div>
              <span>parent</span>
              {selected.parentRef}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
