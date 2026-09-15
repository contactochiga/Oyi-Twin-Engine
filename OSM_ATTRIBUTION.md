# OpenStreetMap data provenance (Phase 15B)

This project's Ring 2 geospatial context (real roads and neighbouring
building footprints around Luna Residences' conceptual site anchor) is
derived from **OpenStreetMap** data, © OpenStreetMap contributors,
available under the **Open Database License (ODbL) 1.0**.

> © OpenStreetMap contributors — https://www.openstreetmap.org/copyright

## Extraction details

| | |
|---|---|
| **Source** | OpenStreetMap, via the public Overpass API (`https://overpass-api.de/api/interpreter`) |
| **Extraction date** | 2026-09-06 |
| **Method** | Two one-time Overpass QL queries, run by hand during Phase 15B implementation. Results saved as static JSON (`scripts/osm-raw/vi_extract.json`) and processed offline into local-frame data (`src/luna/site/lunaRing2Data.ts`) — **the running application never queries OpenStreetMap or Overpass at runtime.** |
| **Bounding area (main extract)** | `6.4133, 3.4158` to `6.4293, 3.4318` (south, west, north, east) — roughly a 1.8km × 1.8km box centred on the Luna conceptual site anchor, `6.4213, 3.4238` |
| **Bounding area (context/heading extract)** | `6.38, 3.38` to `6.45, 3.46` — a wider box used only to determine real coastline/Eko Atlantic bearing for the site heading calculation (see `src/luna/lunaSite.ts`), not rendered as Ring 2 geometry |
| **Feature types requested** | `highway=*` (roads), `building=*` (footprints), `natural=coastline`, `natural=water`, `landuse=*` |
| **Elements retrieved** | 748 (main extract) + 25 (context extract) |
| **Elements actually rendered** | 435 road segments (from 108 named/unnamed ways) and 203 simplified building masses, after axis-aligned bounding-box simplification and exclusion of anything overlapping the conceptual Luna Ring 1 site envelope (see `LUNA_RING1_ENVELOPE` in `lunaSite.ts`) |

## What was and wasn't used

- Road **names and centreline geometry** are genuine OSM data (e.g. Ahmadu
  Bello Way, Adeola Odeku Street, Akin Adesola Street, Saka Tinubu Street
  all appear in the raw extract and are reflected in Ring 2).
- Building **footprint positions and extents** are genuine OSM data,
  simplified to axis-aligned bounding boxes for merged-geometry rendering
  performance (Phase 15A §6/§7).
- Building **heights** are **not** OSM data — OSM carries no height tags
  for this area at usable coverage. Heights are a deterministic
  (non-random) pseudo-value per footprint, disclosed as such in the
  Phase 15B report.
- **Terrain/elevation** was not sourced from anywhere — Victoria Island's
  reclaimed land is flat enough that a single flat datum was judged
  sufficient (Phase 15A §6).
- **No Google Maps, Google Earth, or any other proprietary/licensed
  mapping data was used anywhere in this project.**

## Attribution requirement

Per ODbL, any public-facing use of this data must carry attribution to
OpenStreetMap contributors and a link to the ODbL license text
(https://opendatacommons.org/licenses/odbl/). This is local reference
development only (no production deployment per the Phase 15 safety
constraints) — if this twin is ever deployed publicly, a visible
attribution string (e.g. "Map context data © OpenStreetMap contributors")
must be added to the presentation UI before that happens.

## Raw extract files

- `scripts/osm-raw/vi_extract.json` — the main Overpass response used for
  Ring 2 roads/buildings.
- `scripts/prepRing2FromOsm.mjs` — the offline prep script that projects
  and simplifies the raw extract into `src/luna/site/lunaRing2Data.ts`.
  Re-runnable by hand (`node scripts/prepRing2FromOsm.mjs`) if the extract
  or projection parameters ever change.
