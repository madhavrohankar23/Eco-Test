import lineGeometriesData from "@/data/lineGeometries.json";
import { buildNetwork, haversine, type Place, type TransitNetwork } from "./network";
import { walkRoute, clearWalkCache } from "./ors";

clearWalkCache();


export type Preference = "balanced" | "fastest" | "least_walk" | "fewest_transfers" | "low_co2";

/** Average parameters */
export const PARAMS = {
  walkSpeedKmh: 4.8,
  busSpeedKmh: 17,
  metroSpeedKmh: 32,
  busWaitMin: 5,
  metroWaitMin: 4,
  transferPenaltyMin: 3,
  maxAccessWalkM: 1500,
  maxTransferWalkM: 700,
  co2PerKm: { walk: 0, bus: 68, metro: 22 },
};

export const PREFERENCE_WEIGHTS: Record<
  Preference,
  { time: number; walk: number; transfer: number; co2: number; busPenalty: number }
> = {
  // cost = time(min)*w.time + walk(km)*w.walk + transfers*w.transfer + co2(kg)*w.co2
  //        + bus(km)*w.busPenalty   (metro is preferred whenever it is available)
  balanced: { time: 1, walk: 18, transfer: 5, co2: 3, busPenalty: 2 },
  fastest: { time: 1, walk: 5, transfer: 1, co2: 0, busPenalty: 1 },
  least_walk: { time: 0.4, walk: 60, transfer: 2, co2: 0, busPenalty: 1.5 },
  fewest_transfers: { time: 0.5, walk: 4, transfer: 45, co2: 0, busPenalty: 1.5 },
  low_co2: { time: 0.4, walk: 2, transfer: 3, co2: 60, busPenalty: 4 },
};


export interface LatLng {
  lat: number;
  lon: number;
  name?: string;
}

export interface Leg {
  mode: "walk" | "bus" | "metro";
  /** bus route name / metro line name */
  line?: string;
  busNumber?: string | undefined;
  from: string;
  to: string;
  distanceM: number;
  timeMin: number;
  co2g: number;
  stops?: string[];
  path: { lat: number; lon: number }[];
  frequencyMin?: number;
}

export interface Journey {
  legs: Leg[];
  /** Total distance of all legs (walking + transit) in meters */
  totalDistanceM: number;
  /** Total distance traveled by transit (bus + metro) in meters */
  transitDistanceM: number;
  /** Total journey duration in minutes */
  totalTimeMin: number;
  /** Total pedestrian walking distance in meters */
  walkDistanceM: number;
  /** Total number of transit transfers / interchanges */
  transfers: number;
  /** Total CO₂ footprint of the journey in grams */
  co2g: number;
  /** Multi-objective routing score */
  score: number;
}

interface Metrics {
  timeMin: number;
  walkM: number;
  transitM: number;
  busM: number;
  boardings: number;
  co2g: number;
}

interface Edge {
  to: string;
  kind: "walk" | "board" | "alight" | "ride";
  mode?: "bus" | "metro";
  lineId?: string;
  fromPlace?: string;
  toPlace?: string;
  distanceM: number;
  timeMin: number;
  co2g: number;
  orsResolved?: boolean;
}

const net: TransitNetwork = buildNetwork();
export const network = net;

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
        const d = haversine(a.lat, a.lon, b.lat, b.lon) * 1.2;
        addEdge(rideNode(line.id, i), {
          to: rideNode(line.id, j),
          kind: "ride",
          mode: line.mode,
          lineId: line.id,
          fromPlace: line.placeIds[i]!,
          toPlace: line.placeIds[j]!,
          distanceM: d,
          timeMin: (d / 1000 / speed) * 60 + 0.4,
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

function cost(m: Metrics, pref: Preference) {
  const w = PREFERENCE_WEIGHTS[pref];
  const transfers = Math.max(0, m.boardings - 1);
  return (
    m.timeMin * w.time +
    (m.walkM / 1000) * w.walk +
    transfers * w.transfer +
    (m.co2g / 1000) * w.co2 +
    (m.busM / 1000) * w.busPenalty
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
    [startKey, { node: ORIGIN, transfers: 0, m: { timeMin: 0, walkM: 0, transitM: 0, busM: 0, boardings: 0, co2g: 0 } }],
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

      if (e.kind === "board") {
        nextLineId = e.lineId;
        newBoardings += 1;
        if (curTrace.m.boardings > 0) {
          transferPenalty = PARAMS.transferPenaltyMin;
        }
      } else if (e.kind === "ride") {
        nextLineId = e.lineId ?? cur.lineId;
      } else if (e.kind === "alight") {
        nextLineId = undefined;
      } else {
        // walk
        nextLineId = undefined;
      }

      const nextTransfers = Math.max(0, newBoardings - 1);
      if (nextTransfers > 3) continue;

      const m: Metrics = {
        timeMin: curTrace.m.timeMin + e.timeMin + transferPenalty,
        walkM: curTrace.m.walkM + (e.kind === "walk" ? e.distanceM : 0),
        transitM: curTrace.m.transitM + (e.kind === "ride" ? e.distanceM : 0),
        busM: curTrace.m.busM + (e.kind === "ride" && e.mode === "bus" ? e.distanceM : 0),
        boardings: newBoardings,
        co2g: curTrace.m.co2g + e.co2g,
      };

      if (m.walkM > 4000) continue;

      const nextKey = makeStateKey(e.to, nextLineId, nextTransfers);
      if (done.has(nextKey)) continue;

      const gCost = cost(m, pref);
      if (gCost < (best.get(nextKey) ?? Infinity)) {
        best.set(nextKey, gCost);
        trace.set(nextKey, {
          prevStateKey: cur.key,
          node: e.to,
          lineId: nextLineId,
          transfers: nextTransfers,
          edge: e,
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
      let time = e.timeMin;
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

        legs.push({
          mode: line.mode,
          line: line.name,
          busNumber: line.busNumber,
          from: boardPlace,
          to: lastPlace,
          distanceM: dist,
          timeMin: time,
          co2g: co2,
          stops,
          path: realisticPath,
          frequencyMin: line.frequencyMin,
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

  return {
    legs: merged,
    totalDistanceM,
    transitDistanceM,
    totalTimeMin,
    walkDistanceM,
    transfers: Math.max(0, transitLegs.length - 1),
    co2g: merged.reduce((s, l) => s + l.co2g, 0),
    score: res.score,
  };
}

/**
 * Checks if Journey A Pareto-dominates Journey B across all 4 multi-modal objectives:
 * [totalTimeMin, walkDistanceM, transfers, co2g].
 *
 * A dominates B if A is at least as good as B in ALL metrics and strictly better in AT LEAST ONE.
 */
function dominates(a: Journey, b: Journey): boolean {
  // At least as good (within tiny tolerance for floating point)
  const timeLe = a.totalTimeMin <= b.totalTimeMin + 0.5;
  const walkLe = a.walkDistanceM <= b.walkDistanceM + 25;
  const transLe = a.transfers <= b.transfers;
  const co2Le = a.co2g <= b.co2g + 5;

  // Strictly better in at least one metric
  const timeLt = a.totalTimeMin < b.totalTimeMin - 0.5;
  const walkLt = a.walkDistanceM < b.walkDistanceM - 25;
  const transLt = a.transfers < b.transfers;
  const co2Lt = a.co2g < b.co2g - 5;

  return timeLe && walkLe && transLe && co2Le && (timeLt || walkLt || transLt || co2Lt);
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
async function resolveAccessEgressEdges(
  origin: LatLng,
  destination: LatLng,
): Promise<{
  accessEdges: Edge[];
  egressEdges: Map<string, Edge>;
  directWalkEdge: Edge | undefined;
}> {
  const nearOrigin = nearestPlaces(origin);
  const nearDest = nearestPlaces(destination);

  // Pick top 3 closest candidate stops for ORS resolution
  const topAccess = nearOrigin.slice(0, 3);
  const topEgress = nearDest.slice(0, 3);

  const directHvDist = haversine(origin.lat, origin.lon, destination.lat, destination.lon) * 1.25;

  const [accessResults, egressResults, directResult] = await Promise.all([
    Promise.all(topAccess.map(({ place }) => fetchWalkCost(origin, place))),
    Promise.all(topEgress.map(({ place }) => fetchWalkCost(place, destination))),
    directHvDist <= 1200 ? fetchWalkCost(origin, destination) : Promise.resolve(null),
  ]);

  // Build access edges (ORIGIN -> placeNode)
  const accessEdges: Edge[] = nearOrigin.map(({ place, d }, idx) => {
    const ors = idx < 3 ? accessResults[idx] : null;
    if (ors) {
      return {
        to: placeNode(place.id),
        kind: "walk" as const,
        toPlace: place.id,
        distanceM: ors.distanceM,
        timeMin: ors.timeMin,
        co2g: 0,
        orsResolved: true,
      };
    }
    const { d: wd, t } = walkEdge(origin, place, d * 1.25);
    return {
      to: placeNode(place.id),
      kind: "walk" as const,
      toPlace: place.id,
      distanceM: wd,
      timeMin: t,
      co2g: 0,
    };
  });

  const egressEdges = new Map<string, Edge>();
  nearDest.forEach(({ place, d }, idx) => {
    const ors = idx < 3 ? egressResults[idx] : null;
    const pn = placeNode(place.id);
    if (ors) {
      egressEdges.set(pn, {
        to: "DEST",
        kind: "walk",
        fromPlace: place.id,
        distanceM: ors.distanceM,
        timeMin: ors.timeMin,
        co2g: 0,
        orsResolved: true,
      });
    } else {
      const { d: wd, t } = walkEdge(place, destination, d * 1.25);
      egressEdges.set(pn, {
        to: "DEST",
        kind: "walk",
        fromPlace: place.id,
        distanceM: wd,
        timeMin: t,
        co2g: 0,
      });
    }
  });

  // Direct walk edge
  let directWalkEdge: Edge | undefined;
  if (directResult && directResult.distanceM <= 700) {
    directWalkEdge = {
      to: "DEST",
      kind: "walk",
      distanceM: directResult.distanceM,
      timeMin: directResult.timeMin,
      co2g: 0,
      orsResolved: true,
    };
  } else if (directHvDist <= 700) {
    const { d, t } = walkEdge(origin, destination);
    directWalkEdge = {
      to: "DEST",
      kind: "walk",
      distanceM: d,
      timeMin: t,
      co2g: 0,
    };
  }

  return { accessEdges, egressEdges, directWalkEdge };
}

/** Plans a journey using Pareto Multi-Objective Routing.
 *
 * 1. Computes the optimal route for the user's selected preference profile.
 * 2. Generates candidate routes across all multi-modal objective vectors:
 *    - Travel Time (fastest)
 *    - Walking Distance (least_walk)
 *    - Transfer Count (fewest_transfers)
 *    - CO₂ Emissions (low_co2)
 *    - Alternative transit corridors (line banning)
 * 3. Applies Pareto Dominance filtering: prunes all routes that are strictly
 *    worse across all 4 metrics.
 * 4. Returns a curated set of non-dominated routes representing distinct trade-offs.
 */
export async function planJourney(
  origin: LatLng,
  destination: LatLng,
  preference: Preference = "balanced",
): Promise<{ journeys: Journey[]; error?: string }> {
  const { accessEdges, egressEdges, directWalkEdge } =
    await resolveAccessEgressEdges(origin, destination);

  // 1. Primary search for user's selected preference profile
  const primary = search(
    origin, destination, preference, undefined,
    accessEdges, egressEdges, directWalkEdge,
  );
  if (!primary) {
    return {
      journeys: [],
      error:
        "No public-transport connection found in the current dataset between these points. Try locations closer to a known bus stop or metro station.",
    };
  }
  const best = toJourney(primary, origin, destination);

  // 2. Multi-Objective candidate pool
  const candidatePool: Journey[] = [best];
  const seenSignatures = new Set<string>([signature(best)]);

  // Generate candidates across all 5 Pareto objective profiles
  const allPrefs: Preference[] = ["balanced", "fastest", "least_walk", "fewest_transfers", "low_co2"];
  for (const p of allPrefs) {
    if (p === preference) continue;
    const res = search(origin, destination, p, undefined, accessEdges, egressEdges, directWalkEdge);
    if (!res) continue;
    const j = toJourney(res, origin, destination);
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
    const alt = search(origin, destination, preference, line.id, accessEdges, egressEdges, directWalkEdge);
    if (!alt) continue;
    const j = toJourney(alt, origin, destination);
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
    .sort((a, b) => a.score - b.score);

  for (const j of remainingPareto) {
    const sig = signature(j);
    if (!finalSeen.has(sig)) {
      finalSeen.add(sig);
      orderedJourneys.push(j);
    }
  }

  return { journeys: orderedJourneys.slice(0, 4) };
}

function signature(j: Journey) {
  return j.legs.map((l) => `${l.mode}:${l.line ?? ""}:${l.from}>${l.to}`).join("|");
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
): Promise<Journey> {
  const enriched = await Promise.all(
    journey.legs.map(async (leg): Promise<Leg> => {
      if (leg.mode !== "walk") return leg;

      // Determine real start/end coordinates for this walk leg
      const from =
        leg.path.length > 0
          ? leg.path[0]!
          : { lat: origin.lat, lon: origin.lon };
      const to =
        leg.path.length > 1
          ? leg.path[leg.path.length - 1]!
          : { lat: destination.lat, lon: destination.lon };

      const ors = await walkRoute(from, to);
      if (!ors) return leg; // fallback: keep original leg (already has accurate cost from planJourney)

      return {
        ...leg,
        distanceM: ors.distanceM,
        timeMin: ors.timeMin,
        path: ors.path,
      };
    }),
  );

  // Recompute journey-level totals from enriched legs
  const totalDistanceM = enriched.reduce((s, l) => s + l.distanceM, 0);
  const walkDistanceM = enriched
    .filter((l) => l.mode === "walk")
    .reduce((s, l) => s + l.distanceM, 0);
  const transitDistanceM = enriched
    .filter((l) => l.mode !== "walk")
    .reduce((s, l) => s + l.distanceM, 0);

  return {
    ...journey,
    legs: enriched,
    totalDistanceM,
    transitDistanceM,
    totalTimeMin: enriched.reduce((s, l) => s + l.timeMin, 0),
    walkDistanceM,
  };
}
