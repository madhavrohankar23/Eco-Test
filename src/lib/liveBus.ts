/**
 * Live Bus Tracking Module (Powered by Official Chalo Nagpur API)
 * Completely isolated from the main route-planning algorithm.
 * Uses Chalo's 100% official live bus database, stop sequences, and decoded road polylines.
 */
import chaloRoutesIndex from "@/data/chalo_routes_index.json";

export interface LiveBusStop {
  stop_id: string;
  name: string;
  lat: number;
  lon: number;
  stop_sequence: number;
  bus_number?: string | undefined;
  route_id?: string | undefined;
}

export interface LiveBusRoute {
  id: string;
  route_id: string;
  variant_route_ids: string[];
  bus_number: string;
  display_bus_number: string;
  all_bus_numbers: string[];
  route_name: string;
  label: string;
  from_terminal: string;
  to_terminal: string;
  stopsCount: number;
  stops: LiveBusStop[];
  polyline: [number, number][];
  isLiveEnriched?: boolean;
}

export interface LiveBusVehicle {
  vehicleId: string;
  vNo: string;
  lat: number;
  lon: number;
  bearing: number;
  isHalted: boolean;
  etaSeconds?: number | undefined;
  etaMinutes?: number | undefined;
  sId?: string | undefined;
  psId?: string | undefined;
  psTime?: number | undefined;
  tS: number;
  lSId?: string | undefined;
  opId?: string | undefined;
}

export interface LiveStopEtaInfo {
  vNo: string;
  etaSeconds: number;
  etaMinutes: number;
  isHalted: boolean;
  dest: string;
  rN: string;
  dist: number;
  tS: number;
}

export interface LiveRouteTelemetry {
  routeId: string;
  vehicles: LiveBusVehicle[];
  stopsEta: Record<string, LiveStopEtaInfo[]>;
  lastUpdated: number;
  error?: string | undefined;
}

export interface BusTimetableInfo {
  routeName: string;
  busNumber: string;
  tripsPerDay: number;
  durationMin: number;
  departureTimes: string[];
}

export interface LiveRouteDetailsResponse {
  stops: LiveBusStop[];
  polyline: [number, number][];
  timetable?: BusTimetableInfo | undefined;
}

interface CompactChaloRouteItem {
  id: string;
  bus: string;
  from: string;
  to: string;
  stopsCount: number;
  variants: string[];
  altBus: string[];
  stops: string[];
}

// In-memory cache of compiled LiveBusRoute objects
let cachedRoutes: LiveBusRoute[] | null = null;

// Cache of dynamically fetched live route details from Chalo
const liveRouteDetailsCache = new Map<string, LiveRouteDetailsResponse>();

/**
 * Decodes a Google Encoded Polyline algorithm string into an array of [lat, lon] coordinates.
 */
export function decodeGooglePolyline(encoded: string): [number, number][] {
  if (!encoded) return [];
  const points: [number, number][] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat * 1e-5, lng * 1e-5]);
  }
  return points;
}

function compileCompactRoutes(rawList: CompactChaloRouteItem[]): LiveBusRoute[] {
  return rawList.map((r) => {
    const busNo = (r.bus || "Bus").trim();
    const fromTerm = (r.from || "Start").trim();
    const toTerm = (r.to || "End").trim();
    const routeName = `${fromTerm} - ${toTerm}`;
    const allBusNumbers = [busNo, ...(r.altBus || [])];

    const stops: LiveBusStop[] = (r.stops || []).map((name, sIdx) => ({
      stop_id: `idx_${r.id}_${sIdx}`,
      name,
      lat: 0,
      lon: 0,
      stop_sequence: sIdx + 1,
      bus_number: busNo,
      route_id: r.id,
    }));

    return {
      id: r.id,
      route_id: r.id,
      variant_route_ids: r.variants && r.variants.length > 0 ? r.variants : [r.id],
      bus_number: busNo,
      display_bus_number: busNo,
      all_bus_numbers: allBusNumbers,
      route_name: routeName,
      label: `Bus ${busNo} · ${fromTerm} ➔ ${toTerm}`,
      from_terminal: fromTerm,
      to_terminal: toTerm,
      stopsCount: r.stopsCount || stops.length,
      stops,
      polyline: [],
      isLiveEnriched: false,
    };
  });
}

/**
 * Returns all 978 official bus routes directly from Chalo's live network index.
 */
export function getAllBusRoutes(): LiveBusRoute[] {
  if (cachedRoutes) return cachedRoutes;
  const rawList = chaloRoutesIndex as unknown as CompactChaloRouteItem[];
  cachedRoutes = compileCompactRoutes(rawList);
  return cachedRoutes;
}

/**
 * Searches bus routes by bus number, terminal, or stop name using 100% official Chalo routes.
 */
export function searchLiveBusRoutes(query: string, limit = 50): LiveBusRoute[] {
  const all = getAllBusRoutes();
  const cleanQ = query.toLowerCase().replace(/^(bus\s*)/i, "").trim();
  if (!cleanQ) return all.slice(0, limit);

  return all
    .filter((r) => {
      const bNo = r.bus_number.toLowerCase();
      const matchBusNo =
        bNo === cleanQ ||
        bNo.includes(cleanQ) ||
        r.all_bus_numbers.some((b) => b.toLowerCase().includes(cleanQ));
      const matchName = r.route_name.toLowerCase().includes(cleanQ);
      const matchLabel = r.label.toLowerCase().includes(cleanQ);
      const matchStop = r.stops.some((s) => s.name.toLowerCase().includes(cleanQ));
      return matchBusNo || matchName || matchLabel || matchStop;
    })
    .sort((a, b) => {
      const aB = a.bus_number.toLowerCase();
      const bB = b.bus_number.toLowerCase();

      // 1. Exact bus number match (e.g. searching "1" matches Bus 1 first)
      const aExact = aB === cleanQ ? 0 : 1;
      const bExact = bB === cleanQ ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;

      // 2. Bus number starts with cleanQ (e.g. "135" starts with "135")
      const aPrefix = aB.startsWith(cleanQ) ? 0 : 1;
      const bPrefix = bB.startsWith(cleanQ) ? 0 : 1;
      if (aPrefix !== bPrefix) return aPrefix - bPrefix;

      // 3. Numeric difference if both are integers
      const aNum = parseInt(aB, 10);
      const bNum = parseInt(bB, 10);
      const qNum = parseInt(cleanQ, 10);
      if (!isNaN(aNum) && !isNaN(bNum) && !isNaN(qNum)) {
        const aNumDiff = Math.abs(aNum - qNum);
        const bNumDiff = Math.abs(bNum - qNum);
        if (aNumDiff !== bNumDiff) return aNumDiff - bNumDiff;
      }

      return a.route_name.localeCompare(b.route_name);
    })
    .slice(0, limit);
}

/**
 * Fetches real-time route details, updated stop sequence with coordinates, and decoded road polyline
 * directly from Chalo's dynamic routedetailslive API endpoint.
 */
export async function fetchLiveRouteDetails(
  routeId: string,
  day?: string,
): Promise<LiveRouteDetailsResponse | null> {
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayStr = (day || dayNames[new Date().getDay()] || "sunday").toLowerCase();
  const cacheKey = `${routeId}_${dayStr}`;

  if (liveRouteDetailsCache.has(cacheKey)) {
    return liveRouteDetailsCache.get(cacheKey)!;
  }

  const url = `https://chalo.com/app/api/scheduler_v4/v4/nagpur/routedetailslive?route_id=${encodeURIComponent(routeId)}&day=${encodeURIComponent(dayStr)}`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`routedetailslive returned HTTP ${res.status}`);
    }

    const data = (await res.json()) as {
      route?: {
        route_id?: string;
        route_name?: string;
        polyline?: string;
        stopSequenceWithDetails?: Array<{
          stop_id?: string;
          stop_name?: string;
          stop_lat?: number;
          stop_lon?: number;
          short_id?: number;
        }>;
      };
      timings?: Array<{ start_time?: number }>;
      timeTable?: Array<{ start_time?: number }>;
      trips?: Array<{ start_time?: number; trip_duration?: number }>;
    };

    if (!data.route || !data.route.stopSequenceWithDetails || data.route.stopSequenceWithDetails.length === 0) {
      return null;
    }

    // 1. Dynamic Stops with accurate real-time GPS coordinates
    const stops: LiveBusStop[] = data.route.stopSequenceWithDetails
      .filter((s) => typeof s.stop_lat === "number" && typeof s.stop_lon === "number")
      .map((s, idx) => ({
        stop_id: s.stop_id || `live_stop_${idx}`,
        name: s.stop_name || `Stop ${idx + 1}`,
        lat: s.stop_lat as number,
        lon: s.stop_lon as number,
        stop_sequence: idx + 1,
        route_id: routeId,
      }));

    // 2. Decode high-resolution Google Encoded Polyline from Chalo
    let polyline: [number, number][] = [];
    if (data.route.polyline) {
      polyline = decodeGooglePolyline(data.route.polyline);
    }
    if (polyline.length === 0) {
      polyline = stops.map((s) => [s.lat, s.lon]);
    }

    // 3. Dynamic Timetable Departures from Chalo Scheduler
    const tripsRaw = data.timings || data.timeTable || data.trips || [];
    const departureTimes = tripsRaw
      .filter((t) => typeof t.start_time === "number")
      .map((t) => {
        const sec = t.start_time as number;
        const totalMins = Math.floor(sec / 60);
        const h24 = Math.floor(totalMins / 60);
        const m = totalMins % 60;
        const period = h24 >= 12 ? "PM" : "AM";
        const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
        const padM = m < 10 ? `0${m}` : `${m}`;
        return `${h12}:${padM} ${period}`;
      });

    const timetable: BusTimetableInfo | undefined =
      departureTimes.length > 0
        ? {
            routeName: data.route.route_name || routeId,
            busNumber: data.route.route_name || "",
            tripsPerDay: departureTimes.length,
            durationMin: Math.round((data.trips?.[0]?.trip_duration || 2700) / 60),
            departureTimes,
          }
        : undefined;

    const result: LiveRouteDetailsResponse = {
      stops,
      polyline,
      timetable,
    };

    liveRouteDetailsCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn(`Could not fetch dynamic live route details for ${routeId}:`, err);
    return null;
  }
}

/**
 * Format ETA in seconds into a friendly human-readable string.
 * @param seconds ETA in seconds from Chalo API
 * @returns e.g. "Arriving (< 1 min)", "In 2 min", "In 15 min", or ""
 */
export function formatLiveEta(seconds: number): string {
  if (seconds < 0 || isNaN(seconds)) return "";
  if (seconds < 45) return "Arriving (< 1 min)";
  const mins = Math.ceil(seconds / 60);
  return `In ${mins} min`;
}

/**
 * Format ETA in seconds into a compact badge string for stop sequence items.
 * @param seconds ETA in seconds
 * @returns e.g. "< 1m", "2m", "15m", or ""
 */
export function formatLiveEtaShort(seconds: number): string {
  if (seconds < 0 || isNaN(seconds)) return "";
  if (seconds < 45) return "< 1m";
  const mins = Math.ceil(seconds / 60);
  return `${mins}m`;
}

/**
 * Fetches real-time bus telemetry and stop ETAs from the Chalo Nagpur API.
 */
export async function fetchLiveRouteInfo(
  routeIdOrIds: string | string[],
  stopIds: string[] = [],
): Promise<LiveRouteTelemetry> {
  const routeIds = Array.isArray(routeIdOrIds) ? routeIdOrIds : [routeIdOrIds];
  const primaryRouteId = routeIds[0] || "";
  const queryParam = stopIds.length > 0 ? `?stopIds=${encodeURIComponent(stopIds.join(","))}` : "";

  try {
    const responses = await Promise.allSettled(
      routeIds.map(async (rid) => {
        const url = `https://chalo.com/app/api/vasudha/track/route-live-info/nagpur/${encodeURIComponent(rid)}${queryParam}`;
        const res = await fetch(url, {
          headers: {
            Accept: "application/json",
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as {
          routeLiveInfo?: Record<string, string | Record<string, unknown>>;
          stopsEta?: Record<string, Record<string, string | Record<string, unknown>>>;
        };
      }),
    );

    const vehicleMap = new Map<string, LiveBusVehicle>();
    const stopsEta: Record<string, LiveStopEtaInfo[]> = {};

    for (const result of responses) {
      if (result.status !== "fulfilled" || !result.value) continue;
      const data = result.value;

      // Parse vehicles
      if (data.routeLiveInfo && typeof data.routeLiveInfo === "object") {
        for (const [vKey, rawVal] of Object.entries(data.routeLiveInfo)) {
          try {
            const parsed =
              typeof rawVal === "string" ? (JSON.parse(rawVal) as Record<string, unknown>) : rawVal;
            if (
              parsed &&
              typeof parsed["_latitude"] === "number" &&
              typeof parsed["_longitude"] === "number"
            ) {
              const rawEta = typeof parsed["eta"] === "number" ? (parsed["eta"] as number) : undefined;
              const vehicleId = vKey;
              if (!vehicleMap.has(vehicleId)) {
                vehicleMap.set(vehicleId, {
                  vehicleId,
                  vNo: String(parsed["vNo"] || vehicleId),
                  lat: parsed["_latitude"] as number,
                  lon: parsed["_longitude"] as number,
                  bearing: typeof parsed["bearing"] === "number" ? (parsed["bearing"] as number) : 0,
                  isHalted: Boolean(parsed["_isHalted"]),
                  etaSeconds: rawEta !== undefined && rawEta >= 0 ? rawEta : undefined,
                  etaMinutes: rawEta !== undefined && rawEta >= 0 ? Math.ceil(rawEta / 60) : undefined,
                  sId: typeof parsed["sId"] === "string" ? (parsed["sId"] as string) : undefined,
                  psId: typeof parsed["psId"] === "string" ? (parsed["psId"] as string) : undefined,
                  psTime: typeof parsed["psTime"] === "number" ? (parsed["psTime"] as number) : undefined,
                  tS: typeof parsed["tS"] === "number" ? (parsed["tS"] as number) : Date.now(),
                  lSId: typeof parsed["lSId"] === "string" ? (parsed["lSId"] as string) : undefined,
                  opId: typeof parsed["opId"] === "string" ? (parsed["opId"] as string) : undefined,
                });
              }
            }
          } catch {
            // ignore individual parse error
          }
        }
      }

      // Parse stop ETAs
      if (data.stopsEta && typeof data.stopsEta === "object") {
        for (const [stopId, busMap] of Object.entries(data.stopsEta)) {
          if (busMap && typeof busMap === "object") {
            if (!stopsEta[stopId]) stopsEta[stopId] = [];
            for (const rawVal of Object.values(busMap)) {
              try {
                const parsed =
                  typeof rawVal === "string" ? (JSON.parse(rawVal) as Record<string, unknown>) : rawVal;
                if (parsed) {
                  const rawEta = typeof parsed["eta"] === "number" ? (parsed["eta"] as number) : -1;
                  if (rawEta >= 0) {
                    const vNo = String(parsed["vNo"] || "");
                    const exists = stopsEta[stopId]?.some((x) => x.vNo === vNo);
                    if (!exists) {
                      stopsEta[stopId]?.push({
                        vNo,
                        etaSeconds: rawEta,
                        etaMinutes: Math.max(0, Math.ceil(rawEta / 60)),
                        isHalted: Boolean(parsed["isHalted"]),
                        dest: String(parsed["dest"] || ""),
                        rN: String(parsed["rN"] || ""),
                        dist: typeof parsed["dist"] === "number" ? (parsed["dist"] as number) : 0,
                        tS: typeof parsed["tS"] === "number" ? (parsed["tS"] as number) : Date.now(),
                      });
                    }
                  }
                }
              } catch {
                // ignore
              }
            }
          }
        }
      }
    }

    // Sort all stop ETAs by earliest arrival
    for (const stopId of Object.keys(stopsEta)) {
      stopsEta[stopId]?.sort((a, b) => a.etaSeconds - b.etaSeconds);
    }

    return {
      routeId: primaryRouteId,
      vehicles: Array.from(vehicleMap.values()),
      stopsEta,
      lastUpdated: Date.now(),
    };
  } catch (err) {
    console.warn("Chalo Live API fetch error:", err);
    return {
      routeId: primaryRouteId,
      vehicles: [],
      stopsEta: {},
      lastUpdated: Date.now(),
      error: err instanceof Error ? err.message : "Could not fetch live bus data",
    };
  }
}
