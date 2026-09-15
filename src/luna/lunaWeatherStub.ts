// Luna Residences — weather/location data for the presentation shell's
// WeatherTimeSurface (Phase 16A §1).
//
// DISCLOSURE: this is a static stub, not a live weather feed — the Phase
// 16A brief explicitly says not to build a new weather backend this
// phase. It is architected so a later phase only has to replace
// `lunaWeatherState()`'s body with a real Ochiga backend call (keyed off
// `LUNA_SITE_ANCHOR.anchor.lat/lon`, already the same coordinate every
// other geospatial feature in this project uses — see lunaSite.ts) —
// nothing about WeatherTimeSurface itself, or its props contract, would
// need to change.

import type { WeatherState } from "../engine/components/spatial/WeatherTimeSurface";
import { LUNA_SITE_ANCHOR } from "./lunaSite";

export const LUNA_WEATHER_LOCATION_LABEL = "Lagos, Nigeria";

/** The exact coordinate a future real weather call should key off — the
 * same anchor every other geospatial feature already uses, not a second
 * lat/lon invented for this surface. */
export const LUNA_WEATHER_COORDS = LUNA_SITE_ANCHOR.anchor;

/** Placeholder weather state. Real future implementation:
 *   fetchOchigaWeather(LUNA_WEATHER_COORDS)
 * and mapping that response's condition code onto WeatherCondition. */
export function lunaWeatherState(): WeatherState {
  return { condition: "partly-cloudy", temperatureC: 28 };
}
