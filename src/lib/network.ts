import raw from "@/data/network.json";
import schedulesData from "@/data/bus_schedules.json";
import { getFrequencyMin } from "./frequencies";

export type Mode = "walk" | "bus" | "metro";

export interface RawStop {
  name: string;
  lat: number;
  lon: number;
}
export interface RawBusRoute {
  route: string;
  bus_number?: string | undefined;
  stops: RawStop[];
}
export interface RawMetroLine {
  line: string;
  stations: RawStop[];
}
export interface RawNetwork {
  bus: RawBusRoute[];
  metro: RawMetroLine[];
}

/** A physical place where you can board/alight (a cluster of nearby stops/stations). */
export interface Place {
  id: string;
  name: string;
  lat: number;
  lon: number;
  modes: Set<Mode>;
  /** route ids serving this place */
  routes: Set<string>;
}

export interface RouteLine {
  id: string;
  mode: "bus" | "metro";
  /** display name: bus route name or metro line name */
  name: string;
  /** bus number (e.g. '1', '5', '72B') */
  busNumber?: string | undefined;
  /** total route duration in minutes from timetable */
  durationMin?: number | undefined;
  /** scheduled departure times in minutes from midnight (e.g. 390 = 6:30 AM) */
  departures?: number[] | undefined;
  /** total scheduled trips per day */
  tripsPerDay?: number | undefined;
  /** average headway between scheduled departures in minutes */
  headwayMin?: number | undefined;
  /** time offset in minutes from origin stop for each sequential stop */
  stopOffsets?: number[] | undefined;
  /** ordered place ids */
  placeIds: string[];
  points: RawStop[];
  /** Average headway between departures in minutes */
  frequencyMin: number;
}

export interface TransitNetwork {
  places: Map<string, Place>;
  lines: Map<string, RouteLine>;
  placeList: Place[];
}

export const EARTH_R = 6371000;

export function haversine(aLat: number, aLon: number, bLat: number, bLon: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(s));
}

export function formatTime(minFromMidnight: number): string {
  const norm = ((Math.round(minFromMidnight) % 1440) + 1440) % 1440;
  let h = Math.floor(norm / 60);
  const m = norm % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${m < 10 ? "0" : ""}${m} ${ampm}`;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Stops within this distance AND with a similar name are treated as the same place. */
const CLUSTER_M = 120;

const busSchedules: Record<
  string,
  { routeName: string; busNumber: string; routeId: string; durationMin: number; departures: number[] }
> = schedulesData as unknown as Record<
  string,
  { routeName: string; busNumber: string; routeId: string; durationMin: number; departures: number[] }
>;

/**
 * Builds the multimodal network from the dataset with timetable, headway & stop offsets.
 */
export function buildNetwork(data: RawNetwork = raw as unknown as RawNetwork): TransitNetwork {
  const places = new Map<string, Place>();
  const placeList: Place[] = [];
  const byName = new Map<string, Place[]>();

  function getPlace(stop: RawStop, mode: Mode): Place {
    const key = norm(stop.name);
    const candidates = byName.get(key) ?? [];
    for (const c of candidates) {
      if (haversine(c.lat, c.lon, stop.lat, stop.lon) <= CLUSTER_M) return c;
    }
    // also merge different names that are physically the same spot
    for (const p of placeList) {
      if (haversine(p.lat, p.lon, stop.lat, stop.lon) <= 40 && p.modes.has(mode)) return p;
    }
    const place: Place = {
      id: `p${placeList.length}`,
      name: stop.name,
      lat: stop.lat,
      lon: stop.lon,
      modes: new Set<Mode>(),
      routes: new Set<string>(),
    };
    places.set(place.id, place);
    placeList.push(place);
    byName.set(key, [...candidates, place]);
    return place;
  }

  const lines = new Map<string, RouteLine>();

  data.bus.forEach((r, i) => {
    const id = `bus:${i}`;
    const sched = busSchedules[r.route.toLowerCase().trim()];
    const durationMin = sched?.durationMin || 45;
    const departures = sched?.departures || [];
    const validDeps = departures.filter((d) => d > 0 && d < 1439);
    const tripsPerDay = validDeps.length;

    let headwayMin = getFrequencyMin(r.route);
    if (tripsPerDay >= 2) {
      headwayMin = Math.max(5, Math.round((validDeps[tripsPerDay - 1]! - validDeps[0]!) / (tripsPerDay - 1)));
    } else if (tripsPerDay === 1) {
      headwayMin = 120; // single trip daily
    }

    // Calculate cumulative distance and stop time offsets
    const cumDist: number[] = [0];
    for (let sIdx = 1; sIdx < r.stops.length; sIdx++) {
      const prev = r.stops[sIdx - 1]!;
      const curr = r.stops[sIdx]!;
      const d = haversine(prev.lat, prev.lon, curr.lat, curr.lon) * 1.25;
      cumDist.push(cumDist[cumDist.length - 1]! + d);
    }
    const totalDist = cumDist[cumDist.length - 1] || 1;
    const stopOffsets = cumDist.map((d) =>
      totalDist > 0 ? Number(((d / totalDist) * durationMin).toFixed(2)) : 0
    );

    const placeIds = r.stops.map((s) => {
      const p = getPlace(s, "bus");
      p.modes.add("bus");
      p.routes.add(id);
      return p.id;
    });

    lines.set(id, {
      id,
      mode: "bus",
      name: r.route,
      busNumber: r.bus_number || sched?.busNumber,
      durationMin,
      departures,
      tripsPerDay,
      headwayMin,
      stopOffsets,
      placeIds,
      points: r.stops,
      frequencyMin: headwayMin,
    });
  });

  data.metro.forEach((l, i) => {
    const id = `metro:${i}`;
    const lineName = `${l.line} Line`;
    const placeIds = l.stations.map((s) => {
      const p = getPlace(s, "metro");
      p.modes.add("metro");
      p.routes.add(id);
      return p.id;
    });

    // Calculate cumulative distance and stop time offsets for Metro
    const cumDist: number[] = [0];
    for (let sIdx = 1; sIdx < l.stations.length; sIdx++) {
      const prev = l.stations[sIdx - 1]!;
      const curr = l.stations[sIdx]!;
      const d = haversine(prev.lat, prev.lon, curr.lat, curr.lon);
      cumDist.push(cumDist[cumDist.length - 1]! + d);
    }
    const totalDist = cumDist[cumDist.length - 1] || 1;
    const isBlue = l.line.toLowerCase().includes("blue") || l.line.toLowerCase().includes("line 2") || l.line.toLowerCase().includes("aqua");
    const durationMin = isBlue ? 36 : 38;
    const stopOffsets = cumDist.map((d) =>
      totalDist > 0 ? Number(((d / totalDist) * durationMin).toFixed(2)) : 0
    );

    // Official Maha Metro operating schedule: 06:00 AM (360 min) to 10:30 PM (1350 min) every 10 min
    const headwayMin = 10;
    const departures: number[] = [];
    for (let t = 360; t <= 1350; t += headwayMin) {
      departures.push(t);
    }

    lines.set(id, {
      id,
      mode: "metro",
      name: lineName,
      placeIds,
      points: l.stations,
      durationMin,
      departures,
      tripsPerDay: departures.length,
      headwayMin,
      stopOffsets,
      frequencyMin: headwayMin,
    });
  });

  return { places, lines, placeList };
}

export { CLUSTER_M };
