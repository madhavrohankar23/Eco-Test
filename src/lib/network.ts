import raw from "@/data/network.json";
import { getFrequencyMin } from "./frequencies";

export type Mode = "walk" | "bus" | "metro";

export interface RawStop {
  name: string;
  lat: number;
  lon: number;
}
export interface RawBusRoute {
  route: string;
  bus_number?: string;
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

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Stops within this distance AND with a similar name are treated as the same place. */
const CLUSTER_M = 120;

/**
 * Builds the multimodal network from the dataset. Adding new bus routes, stops or
 * metro lines to network.json requires no change here — everything is derived.
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
      busNumber: r.bus_number,
      placeIds,
      points: r.stops,
      frequencyMin: getFrequencyMin(r.route),
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
    lines.set(id, {
      id,
      mode: "metro",
      name: lineName,
      placeIds,
      points: l.stations,
      frequencyMin: getFrequencyMin(lineName),
    });
  });

  return { places, lines, placeList };
}

export { CLUSTER_M };
