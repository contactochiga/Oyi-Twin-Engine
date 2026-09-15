import type { TwinDataProvider } from "../../engine/twinData";
import { LUNA_OPERATIONAL_ASSETS } from "./lunaOperationalAssets";

// The "local simulation today" half of the provider/adapter split: a plain
// in-memory lookup over the static dataset above. A future
// `OyiApiTwinDataProvider` implementing the same interface (fetching from
// the live Oyi backend instead) is a drop-in replacement — nothing that
// consumes useTwinData() would need to change.
const byRef = new Map(LUNA_OPERATIONAL_ASSETS.map((a) => [a.ref, a]));

export const lunaTwinDataProvider: TwinDataProvider = {
  listAssets: () => LUNA_OPERATIONAL_ASSETS,
  getAsset: (ref) => byRef.get(ref),
};
