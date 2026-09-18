import busFaresData from "@/data/bus_fares.json";
import metroFaresData from "@/data/metro_fares.json";

export interface BusFareLookupResult {
  fare: number;
  source: "exact_forward" | "exact_reverse" | "distance_slab_fallback";
}

export interface MetroFareLookupResult {
  fare: number;
  source: "exact_metro_matrix" | "station_count_tariff";
}

export interface LegFareResult {
  fare: number;
  source:
    | "exact_forward"
    | "exact_reverse"
    | "distance_slab_fallback"
    | "exact_metro_matrix"
    | "station_count_tariff"
    | "free_walk";
}

export interface MetroFareValidationReport {
  totalRows: number;
  uniquePairs: number;
  duplicatePairs: number;
  invalidFares: number;
  duplicates: Array<{ from: string; to: string; count: number }>;
}

const busFares = busFaresData as Record<string, Record<string, number>>;

interface MetroFareRow {
  from_stop_id: string;
  from_stop_name: string;
  from_reach?: string;
  to_stop_id: string;
  to_stop_name: string;
  to_reach?: string;
  fare: number;
}

const isDev =
  (typeof process !== "undefined" && process.env && process.env["NODE_ENV"] !== "production") ||
  (typeof import.meta !== "undefined" && Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV));

/**
 * Normalizes stop names for resilient matching (lowercased, alphanumeric only, trimmed).
 */
export function normalizeStopName(name: string): string {
  return (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Validates the metro fares dataset for integrity, duplicates, and non-negative numeric fares.
 */
export function validateMetroFaresDataset(): MetroFareValidationReport {
  const seenPairs = new Map<string, number>();
  let invalidFares = 0;
  const rawList = metroFaresData as MetroFareRow[];

  for (const row of rawList) {
    if (typeof row.fare !== "number" || isNaN(row.fare) || row.fare < 0) {
      invalidFares++;
    }
    const key = `${normalizeStopName(row.from_stop_name)}:${normalizeStopName(row.to_stop_name)}`;
    seenPairs.set(key, (seenPairs.get(key) ?? 0) + 1);
  }

  const duplicates: Array<{ from: string; to: string; count: number }> = [];
  let duplicateCount = 0;
  for (const [key, count] of seenPairs.entries()) {
    if (count > 1) {
      duplicateCount += count - 1;
      const [from, to] = key.split(":");
      duplicates.push({ from: from ?? "", to: to ?? "", count });
    }
  }

  return {
    totalRows: rawList.length,
    uniquePairs: seenPairs.size,
    duplicatePairs: duplicateCount,
    invalidFares,
    duplicates,
  };
}

// Build exact pairwise lookup Map by station names ONLY (no station IDs)
const metroFaresMap = new Map<string, number>();
for (const row of metroFaresData as MetroFareRow[]) {
  const sName = normalizeStopName(row.from_stop_name);
  const eName = normalizeStopName(row.to_stop_name);
  if (sName && eName) {
    metroFaresMap.set(`${sName}:${eName}`, row.fare);
  }
}

/**
 * Debug helper to verify whether station names match the Metro Fare dataset.
 */
export function checkMetroStationNameMatches(stationNames: string[]): {
  matched: string[];
  unmatched: string[];
} {
  const matched: string[] = [];
  const unmatched: string[] = [];
  for (const name of stationNames) {
    const norm = normalizeStopName(name);
    let found = false;
    for (const key of metroFaresMap.keys()) {
      if (key.startsWith(`${norm}:`) || key.endsWith(`:${norm}`)) {
        found = true;
        break;
      }
    }
    if (found) matched.push(name);
    else unmatched.push(name);
  }
  return { matched, unmatched };
}

/**
 * Debug logging helper for development/testing visibility.
 */
export function logMetroFareDebug(
  fromStation: string,
  toStation: string,
  result: MetroFareLookupResult
): void {
  if (result.source === "exact_metro_matrix") {
    console.log(`[METRO FARE]\n${fromStation} → ${toStation}\nfare=${result.fare}\nsource=${result.source}`);
  } else {
    console.warn(
      `[METRO FARE FALLBACK]\n${fromStation} → ${toStation}\nfare=${result.fare}\nsource=${result.source}\nreason=OD pair not found`
    );
  }
}

/**
 * Calculates official Aapli Bus ticket fare between two stop names.
 * Symmetrically works in BOTH directions (Up & Down / Reverse return journeys).
 *
 * @param busNumber - Bus number (e.g. '1', '100', '106A', '35')
 * @param fromStopName - Name of the boarding stop (e.g. 'Jaitala', 'Pardi Octroi Naka')
 * @param toStopName - Name of the destination stop (e.g. 'Sitabuldi', 'Godawari Square')
 * @param distanceM - Distance in meters for fallback calculation if stop name differs
 */
export function getBusFare(
  busNumber: string,
  fromStopName: string,
  toStopName: string,
  distanceM?: number
): BusFareLookupResult {
  const cleanBusNo = (busNumber || "").trim();
  const fares = busFares[cleanBusNo];

  if (fares && fromStopName && toStopName) {
    const sName = normalizeStopName(fromStopName);
    const eName = normalizeStopName(toStopName);

    // 1. Check forward direction (Up route: Start -> End)
    const forwardKey = `${sName}:${eName}`;
    if (fares[forwardKey] !== undefined) {
      return { fare: fares[forwardKey]!, source: "exact_forward" };
    }

    // 2. Check reverse direction (Down / Return route: End -> Start)
    const reverseKey = `${eName}:${sName}`;
    if (fares[reverseKey] !== undefined) {
      return { fare: fares[reverseKey]!, source: "exact_reverse" };
    }
  }

  // 3. Official NMC distance-based stage tariff slab fallback
  const distKm = (distanceM || 5000) / 1000;
  let slabFare = 12;
  if (distKm > 22) slabFare = 50;
  else if (distKm > 18) slabFare = 40;
  else if (distKm > 14) slabFare = 32;
  else if (distKm > 10) slabFare = 25;
  else if (distKm > 6) slabFare = 18;
  else if (distKm > 3) slabFare = 14;

  return { fare: slabFare, source: "distance_slab_fallback" };
}

/**
 * Calculates official Maha Metro Nagpur fare between two stations based on the official pairwise fare matrix.
 * Station names only are used for matching (NO station-ID lookup).
 * Priority:
 * 1. Exact normalized station-name forward pair (sName:eName)
 * 2. Exact normalized station-name reverse pair (eName:sName)
 * 3. Station-count tariff fallback (only if exact OD pair not found)
 */
export function getMetroFareResult(
  fromStation?: string | number,
  toStation?: string,
  stationCount?: number
): MetroFareLookupResult {
  if (typeof fromStation === "string" && typeof toStation === "string" && fromStation && toStation) {
    const sName = normalizeStopName(fromStation);
    const eName = normalizeStopName(toStation);

    // 1. Direct normalized station-name forward lookup
    const forwardKey = `${sName}:${eName}`;
    const directFare = metroFaresMap.get(forwardKey);
    if (directFare !== undefined) {
      return { fare: directFare, source: "exact_metro_matrix" };
    }

    // 2. Symmetric reverse normalized station-name lookup
    const reverseKey = `${eName}:${sName}`;
    const revFare = metroFaresMap.get(reverseKey);
    if (revFare !== undefined) {
      return { fare: revFare, source: "exact_metro_matrix" };
    }

    // Exact OD pair not found in matrix -> calculate fallback and log warning in development
    const count = typeof stationCount === "number" ? stationCount : 1;
    const validCount = Math.max(1, count);
    let slabFare = 10;
    if (validCount > 19) slabFare = 40;
    else if (validCount > 15) slabFare = 35;
    else if (validCount > 12) slabFare = 30;
    else if (validCount > 9) slabFare = 25;
    else if (validCount > 6) slabFare = 20;
    else if (validCount > 3) slabFare = 15;
    else slabFare = 10;

    if (isDev && sName !== eName) {
      console.warn(
        `[METRO FARE FALLBACK]\n${fromStation} → ${toStation}\nfare=${slabFare}\nsource=station_count_tariff\nreason=OD pair not found`
      );
    }

    return { fare: slabFare, source: "station_count_tariff" };
  }

  // If no destination or same-station non-ride query
  if (typeof fromStation === "string" && (!toStation || fromStation === toStation)) {
    const sName = normalizeStopName(fromStation);
    const selfFare = metroFaresMap.get(`${sName}:${sName}`);
    if (selfFare !== undefined) {
      return { fare: selfFare, source: "exact_metro_matrix" };
    }
    return { fare: 0, source: "station_count_tariff" };
  }

  // Fallback to official distance/station count tariff slab ONLY if station names are missing
  const count =
    typeof fromStation === "number"
      ? fromStation
      : typeof stationCount === "number"
      ? stationCount
      : 1;
  const validCount = Math.max(1, count);
  let slabFare = 10;
  if (validCount > 19) slabFare = 40;
  else if (validCount > 15) slabFare = 35;
  else if (validCount > 12) slabFare = 30;
  else if (validCount > 9) slabFare = 25;
  else if (validCount > 6) slabFare = 20;
  else if (validCount > 3) slabFare = 15;
  else slabFare = 10;

  return { fare: slabFare, source: "station_count_tariff" };
}

/**
 * Calculates official Maha Metro Nagpur fare returning numeric value (Rs).
 * Overloaded for compatibility with both station count and origin-destination calls.
 */
export function getMetroFare(
  fromStation?: string | number,
  toStation?: string,
  stationCount?: number
): number {
  return getMetroFareResult(fromStation, toStation, stationCount).fare;
}

/**
 * Calculates fare for any individual travel leg (Walk = Rs 0, Bus = Aapli Bus Matrix, Metro = Nagpur Metro Matrix/Tariff).
 */
export function getLegFare(leg: {
  mode: "walk" | "bus" | "metro";
  busNumber?: string | undefined;
  from: string;
  to: string;
  distanceM: number;
  stops?: string[] | undefined;
  stationCount?: number | undefined;
}): LegFareResult {
  if (leg.mode === "walk") {
    return { fare: 0, source: "free_walk" };
  }
  if (leg.mode === "metro") {
    const stationCount = leg.stationCount ?? Math.max(1, (leg.stops?.length ?? 2) - 1);
    const metroRes = getMetroFareResult(leg.from, leg.to, stationCount);
    return { fare: metroRes.fare, source: metroRes.source };
  }
  return getBusFare(leg.busNumber ?? "", leg.from, leg.to, leg.distanceM);
}
