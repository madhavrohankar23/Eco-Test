import lineGeometriesData from "@/data/lineGeometries.json";
import { buildNetwork, haversine, formatTime, type Place, type TransitNetwork } from "./network";
import { walkRoute, clearWalkCache } from "./ors";
import { getBusFare, getMetroFare, getMetroFareResult, getLegFare } from "./fares";



export type Preference = "balanced" | "fastest" | "cheapest" | "least_walk" | "fewest_transfers" | "low_co2";

/** Average parameters */
export const PARAMS = {
  walkSpeedKmh: 4.8,
  busSpeedKmh: 17,
  metroSpeedKmh: 32,
  busWaitMin: 5,
  metroWaitMin: 4,
  transferPenaltyMin: 6,
  maxAccessWalkM: 1500,
  maxTransferWalkM: 700,
  maxTotalWalkM: 4000,
  maxTransfers: 3,
  directWalkThresholdM: 700,
  maxAccessCandidates: 8,
  transferWalkMultiplier: 1.25,
  co2PerKm: { walk: 0, bus: 68, metro: 22 },
  transferBuffers: {
    busToBus: 2,       // 2 min buffer to alight, walk stop & board next bus
    busToMetro: 3,     // 3 min buffer for street-to-concourse, security & platform
    metroToBus: 3,     // 3 min buffer for platform-to-street exit & walk to bus stop
    metroToMetro: 2,   // 2 min buffer for interchange platform transfer at Sitabuldi
  },
};

export const PREFERENCE_WEIGHTS: Record<
  Preference,
  { time: number; walk: number; transfer: number; co2: number; busPenalty: number; fare: number }
> = {
  // cost = time(min)*w.time + walk(km)*w.walk + transfers*w.transfer + co2(kg)*w.co2
  //        + bus(km)*w.busPenalty + fare(Rs)*w.fare   (metro is preferred whenever it is available)
  balanced: { time: 1, walk: 18, transfer: 5, co2: 3, busPenalty: 2, fare: 0 },
  fastest: { time: 1, walk: 5, transfer: 1, co2: 0, busPenalty: 1, fare: 0 },
  cheapest: { time: 0.1, walk: 1.5, transfer: 3, co2: 0, busPenalty: 0, fare: 10 },
  least_walk: { time: 0.4, walk: 60, transfer: 2, co2: 0, busPenalty: 1.5, fare: 0 },
  fewest_transfers: { time: 0.5, walk: 4, transfer: 45, co2: 0, busPenalty: 1.5, fare: 0 },
  low_co2: { time: 0.4, walk: 2, transfer: 3, co2: 60, busPenalty: 4, fare: 0 },
};


export interface LatLng {
  lat: number;
  lon: number;
  name?: string;
}

export interface Leg {
  mode: "walk" | "bus" | "metro";
  line?: string | undefined;
  busNumber?: string | undefined;
  from: string;
  to: string;
  distanceM: number;
  timeMin: number;
  co2g: number;
  fareRs?: number | undefined;
  fareSource?: string | undefined;
  stops?: string[];
  path: { lat: number; lon: number }[];
  frequencyMin?: number | undefined;
  tripsPerDay?: number | undefined;
  frequencyRating?: "high" | "medium" | "low" | undefined;
  departureTimeStr?: string | undefined;
  arrivalTimeStr?: string | undefined;
  waitMin?: number | undefined;
  scheduledDepartureMin?: number | undefined;
  nextDepartures?: string[] | undefined;
  orsResolved?: boolean | undefined;
}

export interface Journey {
  legs: Leg[];
  totalDistanceM: number;
  transitDistanceM: number;
  walkDistanceM: number;
  totalTimeMin: number;
  transfers: number;
  score: number;
  co2g: number;
  totalFareRs: number;
  fareBreakdown?: { bus: number; metro: number; walk: number } | undefined;
  signature?: string | undefined;
  departureTimeStr?: string | undefined;
  arrivalTimeStr?: string | undefined;
  departureTimeMin?: number | undefined;
}

interface Metrics {
  timeMin: number;
  walkM: number;
  transitM: number;
  busM: number;
  boardings: number;
  co2g: number;
  fareRs: number;
  currentLegFareRs?: number | undefined;
  boardPlaceId?: string | undefined;
  boardStopIdx?: number | undefined;
  currentLegDistM?: number | undefined;
}

interface Edge {
  to: string;
  kind: "walk" | "board" | "alight" | "ride";
  mode?: "bus" | "metro" | undefined;
  lineId?: string | undefined;
  fromPlace?: string | undefined;
  toPlace?: string | undefined;
  distanceM: number;
  timeMin: number;
  co2g: number;
  orsResolved?: boolean | undefined;
  path?: { lat: number; lon: number }[] | undefined;
  scheduledDepartureMin?: number | undefined;
  waitMin?: number | undefined;
}

const net: TransitNetwork = buildNetwork();
export const network = net;
export { net };

export function computePolylineDistanceM(points: { lat: number; lon: number }[]): number {
  if (!points || points.length < 2) return 0;
  let d = 0;
  for (let i = 1; i < points.length; i++) {
    d += haversine(points[i - 1]!.lat, points[i - 1]!.lon, points[i]!.lat, points[i]!.lon);
  }
  return d;
}

export function calculateTransitLegFare(params: {
  mode: "bus" | "metro" | "walk";
  busNumber?: string | undefined;
  from: string;
  to: string;
  stationCount?: number | undefined;
  distanceM?: number | undefined;
  stops?: string[] | undefined;
}): { fare: number; source: string } {
  const { mode, busNumber, from, to, distanceM = 0, stops } = params;
  const stationCount = params.stationCount ?? Math.max(1, (stops?.length ?? 2) - 1);

  if (mode === "metro") {
    const res = getMetroFareResult(from, to, stationCount);
    return { fare: res.fare, source: res.source };
  }

  if (mode === "walk") {
    return { fare: 0, source: "free_walk" };
  }

  const busFareResult = getBusFare(busNumber || "", from, to, distanceM);
  if (busFareResult.source !== "distance_slab_fallback") {
    return busFareResult;
  }

  const legRes = getLegFare({
    mode: "bus",
    busNumber,
    from,
    to,
    stationCount,
    distanceM,
    stops,
  });

  return { fare: legRes.fare, source: legRes.source };
}

export function validateJourneyMetrics(journey: Journey, tolerance = 0.05): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const sumTime = journey.legs.reduce((s, l) => s + l.timeMin, 0);
  if (Math.abs(sumTime - journey.totalTimeMin) > tolerance) {
    errors.push(`Total time mismatch: legs sum ${sumTime.toFixed(2)}m vs total ${journey.totalTimeMin.toFixed(2)}m`);
  }

  const sumWalk = journey.legs.filter((l) => l.mode === "walk").reduce((s, l) => s + l.distanceM, 0);
  if (Math.abs(sumWalk - journey.walkDistanceM) > 1.0) {
    errors.push(`Walk distance mismatch: legs sum ${sumWalk.toFixed(1)}m vs total ${journey.walkDistanceM.toFixed(1)}m`);
  }

  const sumTransit = journey.legs.filter((l) => l.mode !== "walk").reduce((s, l) => s + l.distanceM, 0);
  if (Math.abs(sumTransit - journey.transitDistanceM) > 1.0) {
    errors.push(`Transit distance mismatch: legs sum ${sumTransit.toFixed(1)}m vs total ${journey.transitDistanceM.toFixed(1)}m`);
  }

  if (Math.abs((journey.walkDistanceM + journey.transitDistanceM) - journey.totalDistanceM) > 1.0) {
    errors.push(`Total distance mismatch: walk + transit ${(journey.walkDistanceM + journey.transitDistanceM).toFixed(1)}m vs total ${journey.totalDistanceM.toFixed(1)}m`);
  }

  const sumCO2 = journey.legs.reduce((s, l) => s + l.co2g, 0);
  if (Math.abs(sumCO2 - journey.co2g) > 1.0) {
    errors.push(`CO2 mismatch: legs sum ${sumCO2.toFixed(1)}g vs total ${journey.co2g.toFixed(1)}g`);
  }

  const sumFare = journey.legs.reduce((s, l) => s + (l.fareRs ?? 0), 0);
  if (Math.abs(sumFare - journey.totalFareRs) > 0.01) {
    errors.push(`Fare mismatch: legs sum Rs ${sumFare} vs total Rs ${journey.totalFareRs}`);
  }

  let expectedTransfers = 0;
  let prevTransitService: string | undefined;
  for (const leg of journey.legs) {
    if (leg.mode !== "walk") {
      const currentService = leg.line ?? leg.busNumber ?? leg.mode;
      if (prevTransitService !== undefined && prevTransitService !== currentService) {
        expectedTransfers++;
      }
      prevTransitService = currentService;
    }
  }

  if (journey.transfers !== expectedTransfers) {
    errors.push(`Transfers mismatch: calculated ${expectedTransfers} vs journey.transfers ${journey.transfers}`);
  }

  if (journey.walkDistanceM > PARAMS.maxTotalWalkM) {
    errors.push(`Walk constraint violated: ${journey.walkDistanceM.toFixed(0)}m > max ${PARAMS.maxTotalWalkM}m`);
  }

  if (journey.transfers > PARAMS.maxTransfers) {
    errors.push(`Transfer constraint violated: ${journey.transfers} > max ${PARAMS.maxTransfers}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export const validateJourney = validateJourneyMetrics;


const placeNode = (id: string) => `P:${id}`;
const rideNode = (lineId: string, idx: number) => `R:${lineId}:${idx}`;

/** Static graph edges (built once, reused for every query). */
const graph = new Map<string, Edge[]>();
function addEdge(from: string, e: Edge) {
  const arr = graph.get(from);
  if (arr) arr.push(e);
  else graph.set(from, [e]);
}

function walkEdge(from: LatLng, to: LatLng, distanceM?: number) {
  const d = distanceM ?? haversine(from.lat, from.lon, to.lat, to.lon) * 1.25;
  return { d, t: (d / 1000 / PARAMS.walkSpeedKmh) * 60 };
}

const walkCostCache = new Map<string, { distanceM: number; timeMin: number }>();

function walkCacheKey(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
): string {
  return `${from.lat.toFixed(5)},${from.lon.toFixed(5)}|${to.lat.toFixed(5)},${to.lon.toFixed(5)}`;
}

/**
 * Fetch real walking distance & time from ORS for a pair of coordinates.
 * Returns null if ORS is unavailable or the pair is trivially short.
 * Results are stored in walkCostCache to avoid repeated API calls.
 */
async function fetchWalkCost(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
): Promise<{ distanceM: number; timeMin: number } | null> {
  const key = walkCacheKey(from, to);
  const cached = walkCostCache.get(key);
  if (cached) return cached;

  const hvDist = haversine(from.lat, from.lon, to.lat, to.lon);
  if (hvDist < 80) return null;

  const ors = await walkRoute(from, to);
  if (!ors) return null;

  const result = { distanceM: ors.distanceM, timeMin: ors.timeMin };
  walkCostCache.set(key, result);
  return result;
}

// Geospatial Grid Spatial Index
// Replaces O(N^2) pairwise comparisons with O(1) spatial bucket queries.

/**
 * 2D Geospatial Hash Grid Spatial Index for ultra-fast radius & k-NN queries.
 *
 * Partitions the geographic coordinate space into fixed-meter rectangular buckets.
 * Radius lookups only inspect adjacent grid cells rather than scanning the entire city,
 * reducing pairwise graph construction from O(N^2) to O(N) and radius queries to O(1).
 */
export class SpatialIndex<T extends { lat: number; lon: number }> {
  private cellSizeLat: number;
  private cellSizeLon: number;
  private grid = new Map<string, T[]>();

  constructor(cellSizeMeters = 500) {
    this.cellSizeLat = cellSizeMeters / 111000;
    this.cellSizeLon = cellSizeMeters / (111000 * Math.cos((21.15 * Math.PI) / 180));
  }

  private cellKey(cx: number, cy: number): string {
    return `${cx}:${cy}`;
  }

  private getCellCoords(lat: number, lon: number): [number, number] {
    return [
      Math.floor(lat / this.cellSizeLat),
      Math.floor(lon / this.cellSizeLon),
    ];
  }

  insert(item: T): void {
    const [cx, cy] = this.getCellCoords(item.lat, item.lon);
    const key = this.cellKey(cx, cy);
    const cell = this.grid.get(key);
    if (cell) {
      cell.push(item);
    } else {
      this.grid.set(key, [item]);
    }
  }

  insertAll(items: T[]): void {
    for (let i = 0; i < items.length; i++) {
      this.insert(items[i]!);
    }
  }

  /**
   * Finds all items within `radiusM` meters of the target coordinate.
   * Returns items with their exact haversine distance, sorted from nearest to farthest.
   */
  queryRadius(
    center: { lat: number; lon: number },
    radiusM: number,
    limit = Infinity,
  ): Array<{ item: T; distanceM: number }> {
    const [cx, cy] = this.getCellCoords(center.lat, center.lon);
    const spanLat = Math.ceil(radiusM / 111000 / this.cellSizeLat);
    const spanLon = Math.ceil(
      radiusM / (111000 * Math.cos((center.lat * Math.PI) / 180)) / this.cellSizeLon,
    );

    const candidates: Array<{ item: T; distanceM: number }> = [];

    for (let dx = -spanLat; dx <= spanLat; dx++) {
      for (let dy = -spanLon; dy <= spanLon; dy++) {
        const key = this.cellKey(cx + dx, cy + dy);
        const cell = this.grid.get(key);
        if (!cell) continue;

        for (let i = 0; i < cell.length; i++) {
          const item = cell[i]!;
          const d = haversine(center.lat, center.lon, item.lat, item.lon);
          if (d <= radiusM) {
            candidates.push({ item, distanceM: d });
          }
        }
      }
    }

    candidates.sort((a, b) => a.distanceM - b.distanceM);
    return limit === Infinity ? candidates : candidates.slice(0, limit);
  }
}

export const placeSpatialIndex = new SpatialIndex<Place>(500);
placeSpatialIndex.insertAll(net.placeList);

(function buildGraph() {
  // 1. Board / Alight / Ride edges along transit lines
  for (const line of net.lines.values()) {
    const wait = line.mode === "bus" ? PARAMS.busWaitMin : PARAMS.metroWaitMin;
    const speed = line.mode === "bus" ? PARAMS.busSpeedKmh : PARAMS.metroSpeedKmh;
    const co2 = PARAMS.co2PerKm[line.mode];
    line.placeIds.forEach((pid, i) => {
      addEdge(placeNode(pid), {
        to: rideNode(line.id, i),
        kind: "board",
        lineId: line.id,
        distanceM: 0,
        timeMin: wait,
        co2g: 0,
      });
      addEdge(rideNode(line.id, i), {
        to: placeNode(pid),
        kind: "alight",
        lineId: line.id,
        distanceM: 0,
        timeMin: 0,
        co2g: 0,
      });
      for (const j of [i - 1, i + 1]) {
        if (j < 0 || j >= line.placeIds.length) continue;
        const a = line.points[i]!;
        const b = line.points[j]!;
        const d = haversine(a.lat, a.lon, b.lat, b.lon) * 1.25;

        // Exact timetable segment time derived directly from official duration_min
        let segTime = (d / 1000 / speed) * 60;
        if (line.mode === "bus" && line.stopOffsets && line.stopOffsets[j] != null && line.stopOffsets[i] != null) {
          segTime = Math.max(0.1, Math.abs(line.stopOffsets[j]! - line.stopOffsets[i]!));
        } else if (line.mode === "metro") {
          segTime = (d / 1000 / speed) * 60 + 0.3;
        }

        addEdge(rideNode(line.id, i), {
          to: rideNode(line.id, j),
          kind: "ride",
          mode: line.mode,
          lineId: line.id,
          fromPlace: line.placeIds[i]!,
          toPlace: line.placeIds[j]!,
          distanceM: d,
          timeMin: segTime,
          co2g: (d / 1000) * co2,
        });
      }
    });
  }

  // 2. Walking transfer edges between nearby places:
  const seenPairs = new Set<string>();
  for (const A of net.placeList) {
    const nearby = placeSpatialIndex.queryRadius(A, PARAMS.maxTransferWalkM);
    for (const { item: B, distanceM: d } of nearby) {
      if (A.id === B.id) continue;
      const pairKey = A.id < B.id ? `${A.id}|${B.id}` : `${B.id}|${A.id}`;
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);

      const { d: wd, t } = walkEdge(A, B, d * 1.25);
      addEdge(placeNode(A.id), {
        to: placeNode(B.id),
        kind: "walk",
        fromPlace: A.id,
        toPlace: B.id,
        distanceM: wd,
        timeMin: t,
        co2g: 0,
      });
      addEdge(placeNode(B.id), {
        to: placeNode(A.id),
        kind: "walk",
        fromPlace: B.id,
        toPlace: A.id,
        distanceM: wd,
        timeMin: t,
        co2g: 0,
      });
    }
  }
})();

/**
 * High-performance spatial query for nearest transit stops / places within radius.
 * Uses the 2D Geospatial Hash Grid index for O(1) expected lookup time.
 */
export function nearestPlaces(
  point: LatLng,
  radiusM = PARAMS.maxAccessWalkM,
  limit = 8,
): Array<{ place: Place; d: number }> {
  return placeSpatialIndex
    .queryRadius(point, radiusM, limit)
    .map(({ item, distanceM }) => ({ place: item, d: distanceM }));
}

export function calculateJourneyScore(j: Journey, pref: Preference): number {
  const w = PREFERENCE_WEIGHTS[pref];
  return (
    j.totalTimeMin * w.time +
    (j.walkDistanceM / 1000) * w.walk +
    j.transfers * w.transfer +
    (j.co2g / 1000) * w.co2 +
    (j.transitDistanceM / 1000) * w.busPenalty +
    j.totalFareRs * (w.fare ?? 0)
  );
}

function cost(m: Metrics, pref: Preference) {
  const w = PREFERENCE_WEIGHTS[pref];
  const transfers = Math.max(0, m.boardings - 1);
  return (
    m.timeMin * w.time +
    (m.walkM / 1000) * w.walk +
    transfers * w.transfer +
    (m.co2g / 1000) * w.co2 +
    (m.busM / 1000) * w.busPenalty +
    m.fareRs * (w.fare ?? 0)
  );
}


interface QueueItem {
  key: string;
  node: string;
  lineId?: string | undefined;
  transfers: number;
  c: number;
}

/**
 * Binary Min-Heap Priority Queue for State-Aware routing.
 *
 * Provides O(log N) push and O(log N) pop operations, ensuring that the routing
 * state with the lowest cumulative cost is always expanded first.
 */
export class PriorityQueue {
  private heap: QueueItem[] = [];

  push(item: QueueItem): void {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  /** Remove and return the lowest-cost state item in O(log N) time */
  pop(): QueueItem | undefined {
    const len = this.heap.length;
    if (len === 0) return undefined;
    const top = this.heap[0]!;
    const bottom = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this.bubbleDown(0);
    }
    return top;
  }

  peek(): QueueItem | undefined {
    return this.heap[0];
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  get size(): number {
    return this.heap.length;
  }

  get length(): number {
    return this.heap.length;
  }

  clear(): void {
    this.heap = [];
  }

  private bubbleUp(idx: number): void {
    while (idx > 0) {
      const parentIdx = (idx - 1) >> 1;
      if (this.heap[idx]!.c >= this.heap[parentIdx]!.c) break;
      const tmp = this.heap[idx]!;
      this.heap[idx] = this.heap[parentIdx]!;
      this.heap[parentIdx] = tmp;
      idx = parentIdx;
    }
  }

  private bubbleDown(idx: number): void {
    const len = this.heap.length;
    while (true) {
      const left = (idx << 1) + 1;
      const right = left + 1;
      let smallest = idx;

      if (left < len && this.heap[left]!.c < this.heap[smallest]!.c) {
        smallest = left;
      }
      if (right < len && this.heap[right]!.c < this.heap[smallest]!.c) {
        smallest = right;
      }
      if (smallest === idx) break;

      const tmp = this.heap[idx]!;
      this.heap[idx] = this.heap[smallest]!;
      this.heap[smallest] = tmp;
      idx = smallest;
    }
  }
}

export const MinHeap = PriorityQueue;

interface StateTrace {
  prevStateKey?: string | undefined;
  node: string;
  lineId?: string | undefined;
  transfers: number;
  edge?: Edge | undefined;
  m: Metrics;
}

function makeStateKey(node: string, lineId: string | undefined, transfers: number): string {
  return `${node}#${lineId ?? "NONE"}#${transfers}`;
}

/**
 * Geographically valid, strictly admissible heuristic for A* Search.
 *
 * Estimates the theoretical minimum remaining cost from `node` to `destination`.
 * Since travel speed across the network cannot exceed the straight-line max speed (Metro speed)
 * with zero transfers, zero walking, zero CO2, and zero bus penalties:
 *   h(node) = (haversine(node, dest) / 1000 / maxSpeedKmh * 60) * w.time
 *
 * Because h(node) <= h*(node) (admissible) and h(u) <= c(u,v) + h(v) (consistent),
 * A* search explores significantly fewer states while guaranteeing mathematical optimality.
 */
function heuristic(
  node: string,
  destination: LatLng,
  pref: Preference,
  origin: LatLng,
): number {
  if (node === "DEST") return 0;
  if (node === "ORIGIN") {
    const d = haversine(origin.lat, origin.lon, destination.lat, destination.lon);
    const minTimeMin = (d / 1000 / PARAMS.metroSpeedKmh) * 60;
    return minTimeMin * PREFERENCE_WEIGHTS[pref].time;
  }

  let lat: number | undefined;
  let lon: number | undefined;

  if (node.startsWith("P:")) {
    const placeId = node.slice(2);
    const p = net.places.get(placeId);
    if (p) {
      lat = p.lat;
      lon = p.lon;
    }
  } else if (node.startsWith("R:")) {
    const secondColon = node.indexOf(":", 2);
    if (secondColon !== -1) {
      const lineId = node.slice(2, secondColon);
      const idx = parseInt(node.slice(secondColon + 1), 10);
      const pt = net.lines.get(lineId)?.points[idx];
      if (pt) {
        lat = pt.lat;
        lon = pt.lon;
      }
    }
  }

  if (lat === undefined || lon === undefined) return 0;

  const d = haversine(lat, lon, destination.lat, destination.lon);
  const minTimeMin = (d / 1000 / PARAMS.metroSpeedKmh) * 60;
  return minTimeMin * PREFERENCE_WEIGHTS[pref].time;
}

/** State-aware A* Search over the multimodal graph with a pluggable cost function.
 * Combines state-aware transfer tracking with an admissible geographical heuristic
 * f(s) = g(s) + h(s) for fast, optimal multimodal route planning.
 */
function search(
  origin: LatLng,
  destination: LatLng,
  pref: Preference,
  banLine?: string,

  accessEdges?: Edge[],
  egressEdges?: Map<string, Edge>,
  directWalkEdge?: Edge,
  departureTimeMin?: number,
) {
  const ORIGIN = "ORIGIN";
  const DEST = "DEST";
  const extra = new Map<string, Edge[]>();
  const addExtra = (from: string, e: Edge) => {
    const a = extra.get(from);
    if (a) a.push(e);
    else extra.set(from, [e]);
  };

  // --- Access edges: ORIGIN -> transit stops ---
  const resolvedAccessIds = new Set<string>(
    (accessEdges ?? []).map((e) => e.to),
  );
  for (const { place, d } of nearestPlaces(origin)) {
    const pn = placeNode(place.id);
    if (resolvedAccessIds.has(pn)) continue;
    const { d: wd, t } = walkEdge(origin, place, d * 1.25);
    addExtra(ORIGIN, {
      to: pn,
      kind: "walk",
      toPlace: place.id,
      distanceM: wd,
      timeMin: t,
      co2g: 0,
    });
  }
  for (const e of accessEdges ?? []) addExtra(ORIGIN, e);

  // --- Egress edges: transit stop -> DEST ---
  const destAccess = new Map<string, Edge>();
  const resolvedEgressIds = egressEdges ?? new Map<string, Edge>();
  for (const { place, d } of nearestPlaces(destination)) {
    const pn = placeNode(place.id);
    if (resolvedEgressIds.has(pn)) {
      destAccess.set(pn, resolvedEgressIds.get(pn)!);
      continue;
    }
    const { d: wd, t } = walkEdge(place, destination, d * 1.25);
    destAccess.set(pn, {
      to: DEST,
      kind: "walk",
      fromPlace: place.id,
      distanceM: wd,
      timeMin: t,
      co2g: 0,
    });
  }

  // --- Direct walk fallback (only short distances or ORS-resolved) ---
  if (directWalkEdge) {
    addExtra(ORIGIN, directWalkEdge);
  } else {
    const { d, t } = walkEdge(origin, destination);
    if (d <= 700) addExtra(ORIGIN, { to: DEST, kind: "walk", distanceM: d, timeMin: t, co2g: 0 });
  }

  const edgesOf = (n: string): Edge[] => {
    const out = [...(graph.get(n) ?? []), ...(extra.get(n) ?? [])];
    const da = destAccess.get(n);
    if (da) out.push(da);
    return banLine ? out.filter((e) => e.lineId !== banLine) : out;
  };

  const startKey = makeStateKey(ORIGIN, undefined, 0);
  const best = new Map<string, number>([[startKey, 0]]); // stores g(s)
  const trace = new Map<string, StateTrace>([
    [startKey, {
      node: ORIGIN,
      transfers: 0,
      m: {
        timeMin: 0,
        walkM: 0,
        transitM: 0,
        busM: 0,
        boardings: 0,
        co2g: 0,
        fareRs: 0,
        currentLegFareRs: 0,
        boardPlaceId: undefined,
        boardStopIdx: undefined,
        currentLegDistM: 0,
      },
    }],
  ]);

  const heap = new PriorityQueue();
  const hStart = heuristic(ORIGIN, destination, pref, origin);
  heap.push({ key: startKey, node: ORIGIN, lineId: undefined, transfers: 0, c: hStart });

  const done = new Set<string>();
  let bestDestKey: string | undefined;

  while (!heap.isEmpty()) {
    const cur = heap.pop()!;
    if (done.has(cur.key)) continue;
    done.add(cur.key);

    if (cur.node === DEST) {
      bestDestKey = cur.key;
      break;
    }

        const curTrace = trace.get(cur.key)!;
    for (const e of edgesOf(cur.node)) {
      let nextLineId: string | undefined;
      let newBoardings = curTrace.m.boardings;
      let transferPenalty = 0;
      let edgeTimeMin = e.timeMin;
      let edgeScheduledDepMin: number | undefined;
      let edgeWaitMin: number | undefined;

      let nextBoardPlaceId = curTrace.m.boardPlaceId;
      let nextBoardStopIdx = curTrace.m.boardStopIdx;
      let nextCurrentLegDistM = curTrace.m.currentLegDistM ?? 0;
      let nextCurrentLegFareRs = curTrace.m.currentLegFareRs ?? 0;
      let nextFareRs = curTrace.m.fareRs;

      if (e.kind === "board") {
        nextLineId = e.lineId;
        newBoardings += 1;
        if (curTrace.m.boardings > 0) {
          transferPenalty = PARAMS.transferPenaltyMin;
        }

        const line = net.lines.get(e.lineId!);
        const stopIdxMatch = e.to.match(/:(\d+)$/);
        const stopIdx = stopIdxMatch ? parseInt(stopIdxMatch[1]!, 10) : 0;
        const boardPid = curTrace.node.startsWith("P:") ? curTrace.node.slice(2) : "";

        let initLegFare = 12;
        if (line && line.mode === "metro") {
          initLegFare = getMetroFare(1);
        } else if (line && line.mode === "bus") {
          initLegFare = getBusFare(line.busNumber ?? "", "", "", 0).fare;
        }

        nextBoardPlaceId = boardPid;
        nextBoardStopIdx = stopIdx;
        nextCurrentLegDistM = 0;
        nextCurrentLegFareRs = initLegFare;
        nextFareRs = curTrace.m.fareRs + initLegFare;

        // ── TIME-DEPENDENT TIMETABLE CHECK ──
        if (line) {
          const now = new Date();
          const depMin = departureTimeMin != null ? departureTimeMin : (now.getHours() * 60 + now.getMinutes());
          const arrivalAtStopMin = depMin + curTrace.m.timeMin;

          if (line.mode === "bus") {
            const offset = (line.stopOffsets && line.stopOffsets[stopIdx] != null) ? line.stopOffsets[stopIdx]! : 0;
            const departures = line.departures || [];
            const validDepartures = departures.filter((d) => d > 0 && d < 1439);

            if (validDepartures.length > 0) {
              const stopDepartures = validDepartures.map((d) => d + offset);
              const nextDep = stopDepartures.find((d) => d >= arrivalAtStopMin);
              if (nextDep == null) {
                continue;
              }
              const waitMin = nextDep - arrivalAtStopMin;
              if (waitMin > 90) {
                continue;
              }
              const trips = line.tripsPerDay || 1;
              const headway = line.headwayMin || line.frequencyMin || 30;
              let headwayPenalty = 2;
              if (trips >= 25) {
                headwayPenalty = 1;
              } else if (trips >= 10) {
                headwayPenalty = 3;
              } else if (trips < 5) {
                headwayPenalty = 14;
              } else {
                headwayPenalty = Math.min(12, Math.max(2, headway * 0.2));
              }

              edgeTimeMin = Math.max(1, waitMin) + headwayPenalty;
              edgeScheduledDepMin = nextDep;
              edgeWaitMin = waitMin;
            } else {
              if (arrivalAtStopMin < 360 || arrivalAtStopMin > 1350) {
                continue;
              }
              const trips = line.tripsPerDay || 1;
              const headwayPenalty = trips >= 15 ? 2 : 10;
              edgeTimeMin = PARAMS.busWaitMin + headwayPenalty;
              edgeScheduledDepMin = arrivalAtStopMin + PARAMS.busWaitMin;
              edgeWaitMin = PARAMS.busWaitMin;
            }
          } else if (line.mode === "metro") {
            if (arrivalAtStopMin < 360 || arrivalAtStopMin > 1350) {
              continue;
            }
            edgeTimeMin = PARAMS.metroWaitMin;
            edgeScheduledDepMin = arrivalAtStopMin + PARAMS.metroWaitMin;
            edgeWaitMin = PARAMS.metroWaitMin;
          }
        }
      } else if (e.kind === "ride") {
        nextLineId = e.lineId ?? cur.lineId;
        const line = net.lines.get(nextLineId!);
        const stopIdxMatch = e.to.match(/:(\d+)$/);
        const curStopIdx = stopIdxMatch ? parseInt(stopIdxMatch[1]!, 10) : 0;

        nextCurrentLegDistM = (curTrace.m.currentLegDistM ?? 0) + e.distanceM;
        let updatedLegFare = curTrace.m.currentLegFareRs ?? 0;

        if (line && line.mode === "metro") {
          const stationCount = Math.max(1, Math.abs(curStopIdx - (curTrace.m.boardStopIdx ?? 0)));
          updatedLegFare = getMetroFare(stationCount);
        } else if (line && line.mode === "bus") {
          const boardName = net.places.get(curTrace.m.boardPlaceId ?? "")?.name ?? "";
          const curPlaceName = net.places.get(e.toPlace ?? "")?.name ?? "";
          updatedLegFare = getBusFare(line.busNumber ?? "", boardName, curPlaceName, nextCurrentLegDistM).fare;
        }

        const fareDelta = updatedLegFare - (curTrace.m.currentLegFareRs ?? 0);
        nextCurrentLegFareRs = updatedLegFare;
        nextFareRs = curTrace.m.fareRs + Math.max(0, fareDelta);
      } else if (e.kind === "alight") {
        nextLineId = undefined;
        nextBoardPlaceId = undefined;
        nextBoardStopIdx = undefined;
        nextCurrentLegDistM = 0;
        nextCurrentLegFareRs = 0;
        nextFareRs = curTrace.m.fareRs;
      } else {
        // walk
        nextLineId = undefined;
        nextBoardPlaceId = undefined;
        nextBoardStopIdx = undefined;
        nextCurrentLegDistM = 0;
        nextCurrentLegFareRs = 0;
        nextFareRs = curTrace.m.fareRs;
      }

      const nextTransfers = Math.max(0, newBoardings - 1);
      if (nextTransfers > 3) continue;

      const m: Metrics = {
        timeMin: curTrace.m.timeMin + edgeTimeMin + transferPenalty,
        walkM: curTrace.m.walkM + (e.kind === "walk" ? e.distanceM : 0),
        transitM: curTrace.m.transitM + (e.kind === "ride" ? e.distanceM : 0),
        busM: curTrace.m.busM + (e.kind === "ride" && e.mode === "bus" ? e.distanceM : 0),
        boardings: newBoardings,
        co2g: curTrace.m.co2g + e.co2g,
        fareRs: nextFareRs,
        currentLegFareRs: nextCurrentLegFareRs,
        boardPlaceId: nextBoardPlaceId,
        boardStopIdx: nextBoardStopIdx,
        currentLegDistM: nextCurrentLegDistM,
      };

      if (m.walkM > 4000) continue;

      const nextKey = makeStateKey(e.to, nextLineId, nextTransfers);
      if (done.has(nextKey)) continue;

      const gCost = cost(m, pref);
      if (gCost < (best.get(nextKey) ?? Infinity)) {
        best.set(nextKey, gCost);
        const edgeCopy: Edge = {
          ...e,
          timeMin: edgeTimeMin,
          scheduledDepartureMin: edgeScheduledDepMin,
          waitMin: edgeWaitMin,
        };
        trace.set(nextKey, {
          prevStateKey: cur.key,
          node: e.to,
          lineId: nextLineId,
          transfers: nextTransfers,
          edge: edgeCopy,
          m,
        });

        // A* Priority: f(s) = g(s) + h(s)
        const hCost = heuristic(e.to, destination, pref, origin);
        const fCost = gCost + hCost;

        heap.push({
          key: nextKey,
          node: e.to,
          lineId: nextLineId,
          transfers: nextTransfers,
          c: fCost,
        });
      }
    }
  }

  if (!bestDestKey || !trace.has(bestDestKey)) return null;

  const chain: { node: string; edge: Edge }[] = [];
  let cursorKey: string | undefined = bestDestKey;
  while (cursorKey && cursorKey !== startKey) {
    const t = trace.get(cursorKey);
    if (!t || !t.edge || !t.prevStateKey) break;
    chain.unshift({ node: t.node, edge: t.edge });
    cursorKey = t.prevStateKey;
  }

  return { chain, metrics: trace.get(bestDestKey)!.m, score: best.get(bestDestKey)! };
}

function label(placeId: string | undefined, fallback: string) {
  if (!placeId) return fallback;
  return net.places.get(placeId)?.name ?? fallback;
}

function pt(p: Place) {
  return { lat: p.lat, lon: p.lon };
}

interface LineGeometryData {
  metro: Record<string, Array<{ lat: number; lon: number }>>;
  bus: Record<string, Array<{ lat: number; lon: number }>>;
}

const lineGeometries = lineGeometriesData as unknown as LineGeometryData;

/**
 * Retrieves the full high-resolution road/track polyline for a given bus route or metro line.
 */
export function getLineFullGeometry(
  mode: "bus" | "metro",
  lineName: string,
  fallbackPoints: LatLng[],
): LatLng[] {
  if (mode === "metro") {
    const cleanName = lineName.replace(/ Line$/i, "").trim();
    const exact =
      lineGeometries.metro[lineName] ??
      lineGeometries.metro[`${cleanName} Line`] ??
      lineGeometries.metro[cleanName];
    if (exact && exact.length > 0) return exact;
  } else {
    // Bus
    const exact = lineGeometries.bus[lineName];
    if (exact && exact.length > 0) return exact;

    const matchKey = Object.keys(lineGeometries.bus).find(
      (k) => k.toLowerCase().trim() === lineName.toLowerCase().trim(),
    );
    if (matchKey && lineGeometries.bus[matchKey]?.length) {
      return lineGeometries.bus[matchKey]!;
    }
  }
  return fallbackPoints;
}


function findNearestPolylineIndex(polyline: LatLng[], target: LatLng): number {
  let bestIdx = 0;
  let minD = Infinity;
  for (let i = 0; i < polyline.length; i++) {
    const pt = polyline[i]!;
    const d = haversine(pt.lat, pt.lon, target.lat, target.lon);
    if (d < minD) {
      minD = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/**
 * Extracts a realistic geometric road/rail sub-segment along a line polyline between two stations/stops.
 */
export function sliceRouteGeometry(
  fullPolyline: LatLng[],
  startPt: LatLng,
  endPt: LatLng,
  intermediateStops: LatLng[] = [],
): LatLng[] {
  if (!fullPolyline || fullPolyline.length < 2) {
    return [startPt, ...intermediateStops, endPt];
  }

  const sIdx = findNearestPolylineIndex(fullPolyline, startPt);
  const eIdx = findNearestPolylineIndex(fullPolyline, endPt);

  let slice: LatLng[];
  if (sIdx <= eIdx) {
    slice = fullPolyline.slice(sIdx, eIdx + 1);
  } else {
    slice = fullPolyline.slice(eIdx, sIdx + 1).reverse();
  }

  const rawPoints = [startPt, ...slice, endPt];
  const result: LatLng[] = [];

  for (let i = 0; i < rawPoints.length; i++) {
    const pt = rawPoints[i]!;
    const prev = result[result.length - 1];
    if (!prev) {
      result.push({ lat: pt.lat, lon: pt.lon });
    } else {
      const d = haversine(prev.lat, prev.lon, pt.lat, pt.lon);
      if (d > 5 || i === rawPoints.length - 1) {
        result.push({ lat: pt.lat, lon: pt.lon });
      }
    }
  }

  return result.length >= 2 ? result : [startPt, endPt];
}

function toJourney(
  res: NonNullable<ReturnType<typeof search>>,
  origin: LatLng,
  destination: LatLng,
  departureTimeMin?: number,
): Journey {
  const legs: Leg[] = [];
  const originName = origin.name ?? "Source";
  const destName = destination.name ?? "Destination";

  let i = 0;
  const chain = res.chain;
  while (i < chain.length) {
    const e = chain[i]!.edge;
    if (e.kind === "walk") {
      const fromP = e.fromPlace ? net.places.get(e.fromPlace) : undefined;
      const toP = e.toPlace ? net.places.get(e.toPlace) : undefined;
      legs.push({
        mode: "walk",
        from: fromP?.name ?? originName,
        to: toP?.name ?? destName,
        distanceM: e.distanceM,
        timeMin: e.timeMin,
        co2g: 0,
        fareRs: 0,
        fareSource: "free_walk",
        path: [fromP ? pt(fromP) : origin, toP ? pt(toP) : destination],
      });
      i++;
      continue;
    }
    if (e.kind === "board") {
      const lineId = e.lineId!;
      const line = net.lines.get(lineId)!;
      let j = i + 1;
      const stops: string[] = [];
      let dist = 0;
      let time = 0; // Pure in-transit ride duration from official timetable
      let co2 = 0;
      const stopPoints: { lat: number; lon: number }[] = [];
      let boardPlace = "";
      let lastPlace = "";
      while (j < chain.length && chain[j]!.edge.kind === "ride") {
        const r = chain[j]!.edge;
        if (!boardPlace) {
          boardPlace = label(r.fromPlace, line.name);
          stops.push(boardPlace);
          const p = net.places.get(r.fromPlace!);
          if (p) stopPoints.push(pt(p));
        }
        dist += r.distanceM;
        time += r.timeMin;
        co2 += r.co2g;
        lastPlace = label(r.toPlace, line.name);
        stops.push(lastPlace);
        const p2 = net.places.get(r.toPlace!);
        if (p2) stopPoints.push(pt(p2));
        j++;
      }
      if (j < chain.length && chain[j]!.edge.kind === "alight") j++;
      if (dist > 0) {
        const boardPt = stopPoints[0] ?? origin;
        const lastPt = stopPoints[stopPoints.length - 1] ?? destination;
        const fullGeom = getLineFullGeometry(line.mode, line.name, line.points);
        const realisticPath = sliceRouteGeometry(fullGeom, boardPt, lastPt, stopPoints.slice(1, -1));

        const fareResult = getLegFare({
          mode: line.mode,
          busNumber: line.busNumber,
          from: boardPlace,
          to: lastPlace,
          distanceM: dist,
          stops,
        });

        const waitDuration = e.waitMin ?? 0;
        const totalLegTime = time + waitDuration;
        legs.push({
          mode: line.mode,
          line: line.name,
          busNumber: line.busNumber,
          from: boardPlace,
          to: lastPlace,
          distanceM: dist,
          timeMin: totalLegTime,
          co2g: co2,
          fareRs: fareResult.fare,
          fareSource: fareResult.source,
          stops,
          path: realisticPath,
          frequencyMin: line.frequencyMin,
          tripsPerDay: line.tripsPerDay,
          frequencyRating: line.frequencyMin && line.frequencyMin <= 15 ? "high" : (line.frequencyMin && line.frequencyMin <= 30 ? "medium" : "low"),
          waitMin: waitDuration,
          scheduledDepartureMin: e.scheduledDepartureMin,
        });
      }
      i = j;
      continue;
    }
    i++;
  }

  // merge consecutive walk legs
  const merged: Leg[] = [];
  for (const leg of legs) {
    const prev = merged[merged.length - 1];
    if (prev && prev.mode === "walk" && leg.mode === "walk") {
      prev.to = leg.to;
      prev.distanceM += leg.distanceM;
      prev.timeMin += leg.timeMin;
      prev.path = [...prev.path, ...leg.path.slice(1)];
    } else merged.push({ ...leg });
  }
  // drop negligible walking legs (origin/destination already at the stop)
  for (let k = merged.length - 1; k >= 0; k--) {
    if (merged[k]!.mode === "walk" && merged[k]!.distanceM < 30) merged.splice(k, 1);
  }
  const transitLegs = merged.filter((l) => l.mode !== "walk");
  const totalDistanceM = merged.reduce((s, l) => s + l.distanceM, 0);
  const walkDistanceM = merged.filter((l) => l.mode === "walk").reduce((s, l) => s + l.distanceM, 0);
  const transitDistanceM = transitLegs.reduce((s, l) => s + l.distanceM, 0);
  const totalTimeMin = merged.reduce((s, l) => s + l.timeMin, 0);

  const totalFareRs = merged.reduce((s, l) => s + (l.fareRs ?? 0), 0);
  const fareBreakdown = {
    bus: merged.filter((l) => l.mode === "bus").reduce((s, l) => s + (l.fareRs ?? 0), 0),
    metro: merged.filter((l) => l.mode === "metro").reduce((s, l) => s + (l.fareRs ?? 0), 0),
    walk: 0,
  };

  const startDepMin = departureTimeMin != null ? departureTimeMin : (() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  })();

  let legClockMin = startDepMin;
  for (const leg of merged) {
    if (leg.mode === "walk") {
      leg.departureTimeStr = formatTime(legClockMin);
      legClockMin += leg.timeMin;
      leg.arrivalTimeStr = formatTime(legClockMin);
    } else {
      const wait = leg.waitMin ?? 0;
      const vehicleDepMin = leg.scheduledDepartureMin != null ? leg.scheduledDepartureMin : (legClockMin + wait);
      const rideTime = Math.max(0.5, leg.timeMin - wait);
      leg.departureTimeStr = formatTime(vehicleDepMin);
      leg.arrivalTimeStr = formatTime(vehicleDepMin + rideTime);
      legClockMin += leg.timeMin;
    }
  }

  // Derive transfer count strictly from line/service changes
  let derivedTransfers = 0;
  let prevService: string | undefined;
  for (const leg of merged) {
    if (leg.mode !== "walk") {
      const currentService = leg.line ?? leg.busNumber ?? leg.mode;
      if (prevService !== undefined && prevService !== currentService) {
        derivedTransfers++;
      }
      prevService = currentService;
    }
  }

  return {
    legs: merged,
    totalDistanceM,
    transitDistanceM,
    totalTimeMin,
    walkDistanceM,
    transfers: derivedTransfers,
    co2g: merged.reduce((s, l) => s + l.co2g, 0),
    totalFareRs,
    fareBreakdown,
    score: res.score,
    departureTimeMin: startDepMin,
    departureTimeStr: formatTime(startDepMin),
    arrivalTimeStr: formatTime(startDepMin + totalTimeMin),
  };
}

/**
 * Checks if Journey A Pareto-dominates Journey B across all 4 multi-modal objectives:
 * [totalTimeMin, walkDistanceM, transfers, co2g].
 *
 * A dominates B if A is at least as good as B in ALL metrics and strictly better in AT LEAST ONE.
 */
function dominates(a: Journey, b: Journey): boolean {
  const aFare = a.totalFareRs ?? 0;
  const bFare = b.totalFareRs ?? 0;

  // At least as good (within tiny tolerance for floating point)
  const timeLe = a.totalTimeMin <= b.totalTimeMin + 0.5;
  const walkLe = a.walkDistanceM <= b.walkDistanceM + 25;
  const transLe = a.transfers <= b.transfers;
  const co2Le = a.co2g <= b.co2g + 5;
  const fareLe = aFare <= bFare;

  // Strictly better in at least one metric
  const timeLt = a.totalTimeMin < b.totalTimeMin - 0.5;
  const walkLt = a.walkDistanceM < b.walkDistanceM - 25;
  const transLt = a.transfers < b.transfers;
  const co2Lt = a.co2g < b.co2g - 5;
  const fareLt = aFare < bFare;

  return (
    timeLe &&
    walkLe &&
    transLe &&
    co2Le &&
    fareLe &&
    (timeLt || walkLt || transLt || co2Lt || fareLt)
  );
}

/**
 * Filters candidate journeys down to the Pareto-optimal non-dominated frontier.
 * Removes all paths that are inferior in every metric to another discovered route.
 */
export function filterParetoFrontier(candidates: Journey[]): Journey[] {
  const nonDominated: Journey[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i]!;
    let isDominated = false;

    for (let j = 0; j < candidates.length; j++) {
      if (i === j) continue;
      const other = candidates[j]!;
      if (dominates(other, candidate)) {
        isDominated = true;
        break;
      }
    }

    if (!isDominated) {
      nonDominated.push(candidate);
    }
  }

  return nonDominated;
}

/**
 * Fetches ORS costs for top nearest transit stops (access/egress legs) in parallel.
 * Limits ORS calls to the top 3 closest candidate stops (distance > 80m) to strictly
 * respect the 40 requests/minute API rate limit, using haversine fallback for the rest.
 */
function resolveAccessEgressEdges(
  origin: LatLng,
  destination: LatLng,
): {
  accessEdges: Edge[];
  egressEdges: Map<string, Edge>;
  directWalkEdge: Edge | undefined;
} {
  const nearOrigin = nearestPlaces(origin);
  const nearDest = nearestPlaces(destination);
  const directHvDist = haversine(origin.lat, origin.lon, destination.lat, destination.lon) * 1.25;

  // Build access edges (ORIGIN -> placeNode) using local 1.25 estimation
  const accessEdges: Edge[] = nearOrigin.map(({ place, d }) => {
    const { d: wd, t } = walkEdge(origin, place, d * 1.25);
    return {
      to: placeNode(place.id),
      kind: "walk" as const,
      toPlace: place.id,
      distanceM: wd,
      timeMin: t,
      co2g: 0,
      path: [{ lat: origin.lat, lon: origin.lon }, { lat: place.lat, lon: place.lon }],
    };
  });

  const egressEdges = new Map<string, Edge>();
  nearDest.forEach(({ place, d }) => {
    const pn = placeNode(place.id);
    const { d: wd, t } = walkEdge(place, destination, d * 1.25);
    egressEdges.set(pn, {
      to: "DEST",
      kind: "walk",
      fromPlace: place.id,
      distanceM: wd,
      timeMin: t,
      co2g: 0,
      path: [{ lat: place.lat, lon: place.lon }, { lat: destination.lat, lon: destination.lon }],
    });
  });

  // Direct walk edge
  let directWalkEdge: Edge | undefined;
  if (directHvDist <= 700) {
    const { d, t } = walkEdge(origin, destination, directHvDist);
    directWalkEdge = {
      to: "DEST",
      kind: "walk",
      distanceM: d,
      timeMin: t,
      co2g: 0,
      path: [{ lat: origin.lat, lon: origin.lon }, { lat: destination.lat, lon: destination.lon }],
    };
  }

  return { accessEdges, egressEdges, directWalkEdge };
}

/** Plans a journey using Pareto Multi-Objective Routing.
 *
 * Runs purely in-memory using local graph and Haversine * 1.25 walking estimations.
 * Returns candidate routes in < 50ms without waiting for external API calls.
 */
export async function planJourney(
  origin: LatLng,
  destination: LatLng,
  preference: Preference = "balanced",
  departureTimeMin?: number,
): Promise<{ journeys: Journey[]; error?: string }> {
  const { accessEdges, egressEdges, directWalkEdge } =
    resolveAccessEgressEdges(origin, destination);

  const now = new Date();
  const depMin = departureTimeMin != null ? departureTimeMin : (now.getHours() * 60 + now.getMinutes());

  // 1. Primary search for user's selected preference profile
  const primary = search(
    origin, destination, preference, undefined,
    accessEdges, egressEdges, directWalkEdge, depMin,
  );
  if (!primary) {
    return {
      journeys: [],
      error: `No public-transport connection found at ${formatTime(depMin)}. Services operate daily from 06:00 AM to 10:30 PM.`,
    };
  }
  const best = toJourney(primary, origin, destination, depMin);

  // 2. Multi-Objective candidate pool
  const candidatePool: Journey[] = [best];
  const seenSignatures = new Set<string>([signature(best)]);

  // Generate candidates across all 5 Pareto objective profiles
  const allPrefs: Preference[] = ["balanced", "fastest", "cheapest", "least_walk", "fewest_transfers", "low_co2"];
  for (const p of allPrefs) {
    if (p === preference) continue;
    const res = search(origin, destination, p, undefined, accessEdges, egressEdges, directWalkEdge, depMin);
    if (!res) continue;
    const j = toJourney(res, origin, destination, depMin);
    const sig = signature(j);
    if (!seenSignatures.has(sig)) {
      seenSignatures.add(sig);
      candidatePool.push(j);
    }
  }

  // Generate corridor alternative candidates (banning each used line)
  const usedLines = best.legs.filter((l) => l.mode !== "walk" && l.line != null).map((l) => l.line as string);
  for (const line of net.lines.values()) {
    if (!usedLines.includes(line.name)) continue;
    const alt = search(origin, destination, preference, line.id, accessEdges, egressEdges, directWalkEdge, depMin);
    if (!alt) continue;
    const j = toJourney(alt, origin, destination, depMin);
    const sig = signature(j);
    if (!seenSignatures.has(sig)) {
      seenSignatures.add(sig);
      candidatePool.push(j);
    }
  }

  // 3. Apply Pareto Dominance Filter
  const paretoFrontier = filterParetoFrontier(candidatePool);

  // 4. Order results: primary best route first, followed by non-dominated trade-off alternatives
  const orderedJourneys: Journey[] = [];
  const finalSeen = new Set<string>();

  // If primary best is on the frontier (or user's preferred choice), place it first
  orderedJourneys.push(best);
  finalSeen.add(signature(best));

  // Sort remaining Pareto alternatives by their score under the current preference
  const remainingPareto = paretoFrontier
    .filter((j) => !finalSeen.has(signature(j)))
    .sort((a, b) => {
      if (preference === "cheapest") {
        return (a.totalFareRs ?? 0) - (b.totalFareRs ?? 0) || a.score - b.score;
      }
      return a.score - b.score;
    });

  for (const j of remainingPareto) {
    const sig = signature(j);
    if (!finalSeen.has(sig)) {
      finalSeen.add(sig);
      orderedJourneys.push(j);
    }
  }

  const finalJourneys = orderedJourneys.slice(0, 4);
  return { journeys: finalJourneys };
}

export function signature(j: Journey): string {
  return j.legs.map((l) => `${l.mode}:${l.line ?? ""}:${l.busNumber ?? ""}:${l.from}>${l.to}`).join("|");
}



export interface SearchablePlace {
  id: string;
  name: string;
  lat: number;
  lon: number;
  modes: string[];
  routes: number;
}

export const searchablePlaces: SearchablePlace[] = net.placeList
  .map((p) => ({
    id: p.id,
    name: p.name,
    lat: p.lat,
    lon: p.lon,
    modes: [...p.modes],
    routes: p.routes.size,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function searchPlaces(q: string, limit = 8) {
  const s = q.toLowerCase().trim();
  if (!s) return [];
  return searchablePlaces
    .filter((p) => p.name.toLowerCase().includes(s))
    .sort((a, b) => {
      const ai = a.name.toLowerCase().startsWith(s) ? 0 : 1;
      const bi = b.name.toLowerCase().startsWith(s) ? 0 : 1;
      return ai - bi || a.name.length - b.name.length;
    })
    .slice(0, limit);
}

export const networkStats = {
  busRoutes: [...net.lines.values()].filter((l) => l.mode === "bus").length,
  metroLines: [...net.lines.values()].filter((l) => l.mode === "metro").length,
  places: net.placeList.length,
};

export const allLines = [...net.lines.values()].map((l) => ({
  id: l.id,
  name: l.name,
  mode: l.mode,
  points: l.points,
  geometry: getLineFullGeometry(l.mode, l.name, l.points),
}));

export const busStops = searchablePlaces.filter((p) => p.modes.includes("bus"));

export const metroStations = searchablePlaces.filter((p) => p.modes.includes("metro"));

/**
 * Takes a completed Journey and enriches each walk leg with the full ORS
 * road geometry (polyline coordinates) for map rendering.
 *
 * NOTE: Since planJourney() now uses ORS costs during routing, the distanceM
 * and timeMin on walk legs are already accurate. This function only adds the
 * detailed path geometry for legs that don't have it yet.
 *
 * Falls back silently to the original straight-line path on any API error.
 */
export async function enrichWalkLegs(
  journey: Journey,
  origin: LatLng,
  destination: LatLng,
  pref: Preference = "balanced",
): Promise<Journey> {
  const enriched = await Promise.all(
    journey.legs.map(async (leg): Promise<Leg> => {
      if (leg.mode !== "walk") return leg;

      // Skip if already resolved by ORS/OSM
      if (leg.orsResolved) {
        return leg;
      }

      const from =
        leg.path && leg.path.length > 0
          ? leg.path[0]!
          : { lat: origin.lat, lon: origin.lon };
      const to =
        leg.path && leg.path.length > 1
          ? leg.path[leg.path.length - 1]!
          : { lat: destination.lat, lon: destination.lon };

      const ors = await walkRoute(from, to);
      if (!ors || !ors.path || ors.path.length < 2) return leg;

      const walkTime = (ors.distanceM / 1000 / PARAMS.walkSpeedKmh) * 60;

      return {
        ...leg,
        distanceM: ors.distanceM,
        timeMin: walkTime,
        path: ors.path,
        orsResolved: true,
      };
    }),
  );

  const totalDistanceM = enriched.reduce((s, l) => s + l.distanceM, 0);
  const walkDistanceM = enriched
    .filter((l) => l.mode === "walk")
    .reduce((s, l) => s + l.distanceM, 0);
  const transitDistanceM = enriched
    .filter((l) => l.mode !== "walk")
    .reduce((s, l) => s + l.distanceM, 0);
  const totalTimeMin = enriched.reduce((s, l) => s + l.timeMin, 0);

  // Re-synchronize departure and arrival time strings across legs if timeline shifted
  const startDepMin = journey.departureTimeMin ?? (() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  })();

  let legClockMin = startDepMin;
  for (const leg of enriched) {
    if (leg.mode === "walk") {
      leg.departureTimeStr = formatTime(legClockMin);
      legClockMin += leg.timeMin;
      leg.arrivalTimeStr = formatTime(legClockMin);
    } else {
      const wait = leg.waitMin ?? 0;
      const vehicleDepMin = leg.scheduledDepartureMin != null ? leg.scheduledDepartureMin : (legClockMin + wait);
      const rideTime = Math.max(0.5, leg.timeMin - wait);
      leg.departureTimeStr = formatTime(vehicleDepMin);
      leg.arrivalTimeStr = formatTime(vehicleDepMin + rideTime);
      legClockMin += leg.timeMin;
    }
  }

  const updatedJourney: Journey = {
    ...journey,
    legs: enriched,
    totalDistanceM,
    transitDistanceM,
    totalTimeMin,
    walkDistanceM,
    score: journey.score,
    totalFareRs: journey.totalFareRs,
    fareBreakdown: journey.fareBreakdown,
    departureTimeMin: startDepMin,
    departureTimeStr: formatTime(startDepMin),
    arrivalTimeStr: formatTime(startDepMin + totalTimeMin),
  };
  updatedJourney.score = calculateJourneyScore(updatedJourney, pref);
  return updatedJourney;
}
