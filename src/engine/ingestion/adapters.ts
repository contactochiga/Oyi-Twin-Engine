// Oyi Twin Engine — Building Ingestion V1: the adapter contract (brief
// Part B4). One generic interface every future format handler
// implements; the Twin Engine never imports a specific adapter, it only
// consumes this shape via the registry below. Adding a new format's
// adapter must never require modifying the Twin Engine itself.

import type { BuildingSourceRecord, ExtractedBuildingModel, SourceFormat } from "./types";

export interface SourceAdapter {
  id: string;
  format: SourceFormat;
  /** Given a registered source record (and, where the adapter actually
   * needs it, the raw file bytes), produce the normalized intermediate
   * ExtractedBuildingModel. Adapters that cannot actually parse their
   * declared format yet (REQUIRES_CONVERSION/REQUIRES_REVIEW formats)
   * are never registered here — see formatRegistry.ts's own disclosure
   * for what's real vs. not yet implemented. */
  extract(source: BuildingSourceRecord, bytes?: ArrayBuffer): Promise<ExtractedBuildingModel>;
}

/** A small, explicit registry — deliberately not a giant parser. Building
 * modules (src/luna/ingestion/...) register their own adapters here;
 * this file has zero building-specific knowledge. */
export class SourceAdapterRegistry {
  private adapters = new Map<string, SourceAdapter>();

  register(adapter: SourceAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  get(adapterId: string): SourceAdapter | undefined {
    return this.adapters.get(adapterId);
  }

  listForFormat(format: SourceFormat): SourceAdapter[] {
    return [...this.adapters.values()].filter((a) => a.format === format);
  }

  list(): SourceAdapter[] {
    return [...this.adapters.values()];
  }
}
