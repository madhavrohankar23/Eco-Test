import busFaresData from "@/data/bus_fares.json";

export interface BusFareLookupResult {
  fare: number;
  source: "exact_forward" | "exact_reverse" | "distance_slab_fallback";
}

export interface LegFareResult {
  fare: number;
  source: "exact_forward" | "exact_reverse" | "distance_slab_fallback" | "metro_tariff" | "free_walk";
}

const busFares = busFaresData as Record<string, Record<string, number>>;

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
 * Calculates official Maha Metro Nagpur fare based on station count.
 * Official Nagpur Metro Tariff Slabs:
 * - 1 to 3 stations: ₹10
 * - 4 to 9 stations: ₹20
 * - 10 to 15 stations: ₹30
 * - 16+ stations: ₹35
 */
export function getMetroFare(stationCount: number): number {
  const count = Math.max(1, stationCount);
  if (count <= 3) return 10;
  if (count <= 9) return 20;
  if (count <= 15) return 30;
  return 35;
}

/**
 * Calculates fare for any individual travel leg (Walk = ₹0, Bus = Aapli Bus Matrix, Metro = Nagpur Metro Tariff).
 */
export function getLegFare(leg: {
  mode: "walk" | "bus" | "metro";
  busNumber?: string | undefined;
  from: string;
  to: string;
  distanceM: number;
  stops?: string[] | undefined;
}): LegFareResult {
  if (leg.mode === "walk") {
    return { fare: 0, source: "free_walk" };
  }
  if (leg.mode === "metro") {
    const stationCount = Math.max(1, (leg.stops?.length ?? 2) - 1);
    return { fare: getMetroFare(stationCount), source: "metro_tariff" };
  }
  return getBusFare(leg.busNumber ?? "", leg.from, leg.to, leg.distanceM);
}
