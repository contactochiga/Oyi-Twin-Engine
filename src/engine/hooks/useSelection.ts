import { createContext, useContext } from "react";
import type { SelectionState, TwinNodeDescriptor } from "../types";

export const SelectionContext = createContext<SelectionState | null>(null);

export function useSelection(): SelectionState {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useSelection must be used within a SelectionContext.Provider");
  return ctx;
}

export function useIsSelected(ref: TwinNodeDescriptor["ref"]) {
  const { selected } = useSelection();
  return selected?.ref === ref;
}
