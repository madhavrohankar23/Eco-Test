/**
 * Live Bus Tracking Module (Powered by Chalo API)
 * Completely isolated from the main route-planning algorithm.
 */
import rawNetwork from "@/data/network.json";
import lineGeometriesData from "@/data/lineGeometries.json";
import busSchedulesData from "@/data/bus_schedules.json";

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
  bus_number: string;
  route_name: string;
  label: string;
  from_terminal: string;
  to_terminal: string;
  stopsCount: number;
  stops: LiveBusStop[];
  polyline: [number, number][];
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

interface RawStopJson {
  name: string;
  lat: number;
  lon: number;
  bus_number?: string | undefined;
  route_id?: string | undefined;
  stop_sequence?: number | undefined;
  stop_id?: string | undefined;
}

interface RawBusRouteJson {
  route: string;
  bus_number?: string | undefined;
  stops: RawStopJson[];
}

interface RawNetworkJson {
  bus: RawBusRouteJson[];
}

const networkData = rawNetwork as unknown as RawNetworkJson;
const schedulesMap = busSchedulesData as unknown as Record<
  string,
  {
    routeName?: string;
    busNumber?: string;
    tripsPerDay?: number;
    durationMin?: number;
    routeId?: string;
    departures?: number[];
  }
>;
const geometries = lineGeometriesData as unknown as { bus?: Record<string, [number, number][]> };

// Cache of compiled LiveBusRoute objects
let cachedRoutes: LiveBusRoute[] | null = null;

/**
 * Returns all bus routes indexed with stop sequence and geometries.
 * Uses exact route bus number from network.json and bus_schedules.json.
 */
export function getAllBusRoutes(): LiveBusRoute[] {
  if (cachedRoutes) return cachedRoutes;

  const routes: LiveBusRoute[] = [];

  networkData.bus.forEach((r, idx) => {
    const routeKey = r.route.toLowerCase().trim();
    const schedEntry = schedulesMap[routeKey];

    // Priority: route-level bus_number in network.json > bus_schedules.json > stop[0]
    const busNo = r.bus_number || schedEntry?.busNumber || r.stops[0]?.bus_number || "Bus";
    const routeId = r.stops[0]?.route_id || schedEntry?.routeId || `route_${idx}`;

    const stops: LiveBusStop[] = r.stops.map((s, sIdx) => ({
      stop_id: s.stop_id || `stop_${idx}_${sIdx}`,
      name: s.name,
      lat: s.lat,
      lon: s.lon,
      stop_sequence: s.stop_sequence || sIdx + 1,
      bus_number: busNo,
      route_id: s.route_id || routeId,
    }));

    const firstStop = stops[0];
    const lastStop = stops[stops.length - 1];
    const fromTerminal = firstStop?.name || "Start";
    const toTerminal = lastStop?.name || "End";

    // Geometry polyline: use high-resolution road path if available, else connect stop coordinates
    const polyline =
      geometries.bus?.[r.route] || stops.map((s) => [s.lat, s.lon] as [number, number]);

    routes.push({
      id: `${routeId}_${idx}`,
      route_id: routeId,
      bus_number: busNo,
      route_name: r.route,
      label: `Bus ${busNo} · ${fromTerminal} ➔ ${toTerminal}`,
      from_terminal: fromTerminal,
      to_terminal: toTerminal,
      stopsCount: stops.length,
      stops,
      polyline,
    });
  });

  cachedRoutes = routes;
  return routes;
}

/**
 * Searches bus routes by bus number or stop / terminal name.
 * Robust matching handles queries like "135", "bus 135", "135stl", "hingna", "sitabuldi".
 */
export function searchLiveBusRoutes(query: string, limit = 50): LiveBusRoute[] {
  const all = getAllBusRoutes();
  const cleanQ = query.toLowerCase().replace(/^(bus\s*)/i, "").trim();
  if (!cleanQ) return all.slice(0, limit);

  return all
    .filter((r) => {
      const bNo = r.bus_number.toLowerCase();
      const rName = r.route_name.toLowerCase();
      const lbl = r.label.toLowerCase();
      const matchBusNo = bNo.includes(cleanQ);
      const matchName = rName.includes(cleanQ);
      const matchLabel = lbl.includes(cleanQ);
      const matchStop = r.stops.some((s) => s.name.toLowerCase().includes(cleanQ));
      return matchBusNo || matchName || matchLabel || matchStop;
    })
    .sort((a, b) => {
      const aB = a.bus_number.toLowerCase();
      const bB = b.bus_number.toLowerCase();

      // 1. Exact bus number match (e.g. searching "135" puts 135 before 135A)
      const aExact = aB === cleanQ ? 0 : 1;
      const bExact = bB === cleanQ ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;

      // 2. Bus number starts with query (e.g. "135" starts with "135")
      const aPrefix = aB.startsWith(cleanQ) ? 0 : 1;
      const bPrefix = bB.startsWith(cleanQ) ? 0 : 1;
      if (aPrefix !== bPrefix) return aPrefix - bPrefix;

      // 3. Numeric difference if both bus numbers are numeric
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
 * Retrieves scheduled departure times and timetable for a bus route.
 */
export function getBusRouteTimetable(routeName: string): BusTimetableInfo | null {
  const normKey = routeName.toLowerCase().trim();
  const entry = schedulesMap[normKey];

  if (!entry || !entry.departures || entry.departures.length === 0) {
    return null;
  }

  const departureTimes = entry.departures.map((m) => {
    const hours24 = Math.floor(m / 60);
    const mins = m % 60;
    const period = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    const padM = mins < 10 ? `0${mins}` : `${mins}`;
    return `${hours12}:${padM} ${period}`;
  });

  return {
    routeName: entry.routeName || routeName,
    busNumber: entry.busNumber || "",
    tripsPerDay: entry.tripsPerDay || departureTimes.length,
    durationMin: Math.round(entry.durationMin || 0),
    departureTimes,
  };
}

/**
 * Fetches real-time bus telemetry and stop ETAs from the Chalo Nagpur API.
 */
export async function fetchLiveRouteInfo(
  routeId: string,
  stopIds: string[] = [],
): Promise<LiveRouteTelemetry> {
  const queryParam = stopIds.length > 0 ? `?stopIds=${encodeURIComponent(stopIds.join(","))}` : "";
  const url = `https://chalo.com/app/api/vasudha/track/route-live-info/nagpur/${encodeURIComponent(routeId)}${queryParam}`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Chalo API returned HTTP ${res.status}`);
    }

    const data = (await res.json()) as {
      routeLiveInfo?: Record<string, string | Record<string, unknown>>;
      stopsEta?: Record<string, Record<string, string | Record<string, unknown>>>;
    };

    // Parse routeLiveInfo (stringified JSON inside object values)
    const vehicles: LiveBusVehicle[] = [];
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
            vehicles.push({
              vehicleId: vKey,
              vNo: String(parsed["vNo"] || vKey),
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
        } catch {
          // ignore individual parse error
        }
      }
    }

    // Parse stopsEta (stringified JSON inside nested object values)
    const stopsEta: Record<string, LiveStopEtaInfo[]> = {};
    if (data.stopsEta && typeof data.stopsEta === "object") {
      for (const [stopId, busMap] of Object.entries(data.stopsEta)) {
        if (busMap && typeof busMap === "object") {
          const etas: LiveStopEtaInfo[] = [];
          for (const rawVal of Object.values(busMap)) {
            try {
              const parsed =
                typeof rawVal === "string" ? (JSON.parse(rawVal) as Record<string, unknown>) : rawVal;
              if (parsed) {
                const rawEta = typeof parsed["eta"] === "number" ? (parsed["eta"] as number) : -1;
                // Only record upcoming vehicles with a valid non-negative ETA in seconds
                if (rawEta >= 0) {
                  etas.push({
                    vNo: String(parsed["vNo"] || ""),
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
            } catch {
              // ignore
            }
          }
          if (etas.length > 0) {
            // Sort by earliest arrival
            etas.sort((a, b) => a.etaSeconds - b.etaSeconds);
            stopsEta[stopId] = etas;
          }
        }
      }
    }

    return {
      routeId,
      vehicles,
      stopsEta,
      lastUpdated: Date.now(),
    };
  } catch (err) {
    console.warn("Chalo Live API fetch error:", err);
    return {
      routeId,
      vehicles: [],
      stopsEta: {},
      lastUpdated: Date.now(),
      error: err instanceof Error ? err.message : "Could not fetch live bus data",
    };
  }
}
