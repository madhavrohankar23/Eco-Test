/**
 * Utility: find bus stops and metro stations near a geographic anchor.
 * Uses the same datasets as the route planner — no hardcoded data.
 *
 * NOTE: haversine() in network.ts uses EARTH_R = 6_371_000 m so it returns
 * distances in METRES directly.
 */
import { haversine } from "@/lib/network";
import { busStops, metroStations, allLines } from "@/lib/routing";

export interface NearbyStop {
  id: string;
  name: string;
  lat: number;
  lon: number;
  mode: "bus" | "metro";
  /** Parent metro line name e.g. "Blue Line" / "Orange Line" — only for metro stations */
  lineName?: string;
  /** Distance from anchor in metres */
  distM: number;
  /** Estimated walk time in minutes at ~4.8 km/h */
  walkMin: number;
}

export interface NearbyResult {
  busStops: NearbyStop[];
  metroStations: NearbyStop[];
}

/** Walking speed estimate: 4.8 km/h = 80 metres per minute */
const WALK_MPM = 80;

/**
 * Returns the nearest bus stops and metro stations from a given anchor point,
 * sorted by distance ascending within the specified search radius (in metres).
 */
export function findNearby(
  anchor: { lat: number; lon: number },
  searchRadiusM = 2500,
): NearbyResult {
  if (!anchor || typeof anchor.lat !== "number" || typeof anchor.lon !== "number") {
    return { busStops: [], metroStations: [] };
  }

  const maxBusM = searchRadiusM;
  const maxMetroM = searchRadiusM;

  // Calculate distances to all bus stops and filter strictly within search radius
  const resultBus: NearbyStop[] = busStops
    .map((s) => {
      const distM = Math.round(haversine(anchor.lat, anchor.lon, s.lat, s.lon));
      return {
        id: s.id,
        name: s.name,
        lat: s.lat,
        lon: s.lon,
        mode: "bus" as const,
        distM,
        walkMin: Math.max(1, Math.ceil(distM / WALK_MPM)),
      };
    })
    .filter((s) => s.distM <= maxBusM)
    .sort((a, b) => a.distM - b.distM);

  // Calculate distances to all metro stations and filter strictly within search radius
  const resultMetro: NearbyStop[] = metroStations
    .map((s) => {
      const distM = Math.round(haversine(anchor.lat, anchor.lon, s.lat, s.lon));
      const parentLine = allLines.find(
        (l) =>
          l.mode === "metro" &&
          l.points.some(
            (p: { lat: number; lon: number }) =>
              Math.abs(p.lat - s.lat) < 0.0005 && Math.abs(p.lon - s.lon) < 0.0005,
          ),
      );
      const lineName = parentLine?.name;
      return {
        id: s.id,
        name: s.name,
        lat: s.lat,
        lon: s.lon,
        mode: "metro" as const,
        ...(lineName ? { lineName } : {}),
        distM,
        walkMin: Math.max(1, Math.ceil(distM / WALK_MPM)),
      };
    })
    .filter((s) => s.distM <= maxMetroM)
    .sort((a, b) => a.distM - b.distM);

  return {
    busStops: resultBus,
    metroStations: resultMetro,
  };
}

/** Formats distance: e.g. "420 m" or "1.4 km" */
export function fmtNearbyDist(m: number): string {
  if (m < 1000) {
    return `${m} m`;
  }
  return `${(m / 1000).toFixed(1)} km`;
}
