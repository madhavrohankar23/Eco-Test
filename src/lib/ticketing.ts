import { getBusFare, getMetroFareResult } from "./fares";
import chaloRoutesData from "@/data/chalo_routes_index.json";

export type TicketCategory = "exclusive_eco" | "standard_metro" | "standard_bus";
export type TransitMode = "metro" | "bus" | "combo";
export type PaymentMethod = "upi" | "mahacard" | "card" | "netbanking";
export type TicketStatus = "active" | "used" | "expired";

export interface PassengerBreakdown {
  adult: number;
  student: number;
  senior: number;
}

export interface TransitLegItem {
  id: string;
  mode: "metro" | "bus";
  lineOrRoute: string; // e.g. "Orange Line", "Aqua Line", "135", "400"
  from: string; // Boarding station/stop
  to: string; // Destination station/stop
  fare: number; // Exact fare for 1 adult in Rs
}

export interface IssuedTicket {
  id: string; // e.g. "ECO-NAG-84920"
  category: TicketCategory;
  mode: TransitMode;
  title: string;
  source: string;
  destination: string;
  viaInterchange?: string | undefined;
  lineOrRouteName: string;
  busNumber?: string | undefined;
  legs: TransitLegItem[]; // Up to 4 transit legs
  currentLegIndex: number; // Active leg (0 to legs.length - 1)
  currentLegStep: "not_started" | "tapped_bus" | "metro_in_transit" | "metro_exited" | "completed";
  bookingTime: string; // ISO string
  validUntil: string; // 24 Hours for Metro/Combo, 2 Hours for Bus
  interchangeValidUntil?: string | undefined; // 2 Hours transfer window
  passengers: PassengerBreakdown;
  totalPassengers: number;
  standardBaseFare: number;
  discountAmount: number;
  discountPercent: number;
  finalFare: number;
  co2SavedKg: number;
  greenPointsEarned: number;
  paymentMethod: PaymentMethod;
  transactionRef: string;
  qrPayload: string;
  status: TicketStatus;
  gateScans: Array<{
    timestamp: string;
    gateName: string;
    legIndex: number;
    action: string;
  }>;
}

export interface MetroLineInfo {
  id: "orange" | "aqua";
  name: string;
  color: string;
  terminalStart: string;
  terminalEnd: string;
  stations: string[];
}

export const NAGPUR_METRO_LINES: MetroLineInfo[] = [
  {
    id: "orange",
    name: "Orange Line (North-South)",
    color: "#ff6a00",
    terminalStart: "Automotive Square",
    terminalEnd: "Khapri",
    stations: [
      "Automotive Square",
      "Nari Road",
      "Indora Square",
      "Kadvi Chowk",
      "GaddiGodam Square",
      "Kasturchand Park",
      "Zero Mile Freedom Park",
      "Sitabuldi Interchange",
      "Congress Nagar",
      "Rahate Colony",
      "Ajni Square",
      "Chhatrapati Square",
      "Jaiprakash Nagar",
      "Ujjwal Nagar",
      "Airport",
      "Airport South",
      "New Airport",
      "Khapri",
    ],
  },
  {
    id: "aqua",
    name: "Aqua Line (East-West)",
    color: "#0099ff",
    terminalStart: "Prajapati Nagar",
    terminalEnd: "Lokmanya Nagar",
    stations: [
      "Prajapati Nagar",
      "Vaishno Devi Chowk",
      "Ambedkar Chowk",
      "Telephone Exchange",
      "Chittar Oli Chowk",
      "Agrasen Chowk",
      "Dosar Vaisya Chowk",
      "Nagpur Railway Station",
      "Cotton Market",
      "Sitabuldi Interchange",
      "Jhansi Rani Chowk",
      "Institute of Engineers",
      "Shankar Nagar Square",
      "LAD Square",
      "Dharampeth College",
      "Subhash Nagar",
      "Rachna Ring Road",
      "Vasudev Nagar",
      "Bansi Nagar",
      "Lokmanya Nagar",
    ],
  },
];

export interface BusRouteSummary {
  busNumber: string;
  from: string;
  to: string;
  stopsCount: number;
  stops: string[];
}

interface RawChaloRoute {
  id: string;
  bus: string;
  from: string;
  to: string;
  stopsCount: number;
  stops: string[];
}

// Extract and deduplicate bus routes from chalo index
export function getAvailableBusRoutes(): BusRouteSummary[] {
  const rawList = chaloRoutesData as RawChaloRoute[];
  const seen = new Set<string>();
  const list: BusRouteSummary[] = [];

  for (const r of rawList) {
    const key = `${r.bus.trim()}::${r.from.trim()}->${r.to.trim()}`;
    if (!seen.has(key) && r.stops && r.stops.length > 1) {
      seen.add(key);
      list.push({
        busNumber: r.bus.trim(),
        from: r.from.trim(),
        to: r.to.trim(),
        stopsCount: r.stops.length,
        stops: r.stops,
      });
    }
  }

  // Sort by numeric bus numbers first
  return list.sort((a, b) => {
    const numA = parseInt(a.busNumber, 10);
    const numB = parseInt(b.busNumber, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.busNumber.localeCompare(b.busNumber);
  });
}

/**
 * Normalizes and resolves any user station name to the exact canonical station string in NAGPUR_METRO_LINES
 */
export function resolveCanonicalMetroStation(input: string): string {
  if (!input) return "Sitabuldi Interchange";
  const cleanInput = input
    .toLowerCase()
    .replace(/\bngr\b|\bng\b/g, "nagar")
    .replace(/\bsq\.?\b/g, "square")
    .replace(/\bclg\b/g, "college")
    .replace(/\beng\.?\b|\bengineering\b|\bengineers\b/g, "eng")
    .replace(/\binstitution\b|\binstitute\b/g, "institute")
    .replace(/\bexchang\b/g, "exchange")
    .replace(/\binterchange\b|\bmetro\b|\bstation\b|\bstn\b/g, " ")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const allStations: string[] = [];
  NAGPUR_METRO_LINES.forEach((l) => l.stations.forEach((s) => allStations.push(s)));

  // 1. Exact match on raw input
  for (const st of allStations) {
    if (st.toLowerCase().trim() === input.toLowerCase().trim()) return st;
  }

  // 2. Exact match on cleaned input
  for (const st of allStations) {
    const cleanSt = st
      .toLowerCase()
      .replace(/\bngr\b|\bng\b/g, "nagar")
      .replace(/\bsq\.?\b/g, "square")
      .replace(/\bclg\b/g, "college")
      .replace(/\beng\.?\b|\bengineering\b|\bengineers\b/g, "eng")
      .replace(/\binstitution\b|\binstitute\b/g, "institute")
      .replace(/\bexchang\b/g, "exchange")
      .replace(/\binterchange\b|\bmetro\b|\bstation\b|\bstn\b/g, " ")
      .replace(/[^a-z0-9]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (cleanSt === cleanInput) {
      return st;
    }
  }

  // 3. Common station aliases & spelling variants (checked with priority)
  if (cleanInput.includes("airport south")) return "Airport South";
  if (cleanInput.includes("new airport")) return "New Airport";
  if (cleanInput.includes("sitabuldi") || cleanInput.includes("buldi") || cleanInput.includes("sitaburdi")) return "Sitabuldi Interchange";
  if (cleanInput.includes("lokmanya")) return "Lokmanya Nagar";
  if (cleanInput.includes("institute") || cleanInput.includes("institution") || cleanInput.includes("engineer")) return "Institute of Engineers";
  if (cleanInput.includes("automotive")) return "Automotive Square";
  if (cleanInput.includes("khapri")) return "Khapri";
  if (cleanInput.includes("airport")) return "Airport";
  if (cleanInput.includes("zero mile") || cleanInput.includes("freedom park")) return "Zero Mile Freedom Park";
  if (cleanInput.includes("prajapati")) return "Prajapati Nagar";
  if (cleanInput.includes("dharampeth")) return "Dharampeth College";
  if (cleanInput.includes("shankar")) return "Shankar Nagar Square";
  if (cleanInput.includes("jhansi") || cleanInput.includes("rani")) return "Jhansi Rani Chowk";
  if (cleanInput.includes("railway") || cleanInput.includes("rly")) return "Nagpur Railway Station";
  if (cleanInput.includes("subhash")) return "Subhash Nagar";
  if (cleanInput.includes("rachna") || cleanInput.includes("rachana") || cleanInput.includes("ring road")) return "Rachna Ring Road";
  if (cleanInput.includes("vasudev") || cleanInput.includes("vasudeo")) return "Vasudev Nagar";
  if (cleanInput.includes("bansi")) return "Bansi Nagar";
  if (cleanInput.includes("lad")) return "LAD Square";
  if (cleanInput.includes("cotton")) return "Cotton Market";
  if (cleanInput.includes("dosar") || cleanInput.includes("vaisya") || cleanInput.includes("vaishya")) return "Dosar Vaisya Chowk";
  if (cleanInput.includes("agrasen")) return "Agrasen Chowk";
  if (cleanInput.includes("chittar") || cleanInput.includes("chitar") || cleanInput.includes("oli")) return "Chittar Oli Chowk";
  if (cleanInput.includes("telephone") || cleanInput.includes("exchange")) return "Telephone Exchange";
  if (cleanInput.includes("ambedkar")) return "Ambedkar Chowk";
  if (cleanInput.includes("vaishno") || cleanInput.includes("vaishnodevi")) return "Vaishno Devi Chowk";
  if (cleanInput.includes("kasturchand") || cleanInput === "kp") return "Kasturchand Park";
  if (cleanInput.includes("gaddigodam") || cleanInput.includes("gaddi") || cleanInput.includes("godam")) return "GaddiGodam Square";
  if (cleanInput.includes("kadvi") || cleanInput.includes("kadbi")) return "Kadvi Chowk";
  if (cleanInput.includes("indora")) return "Indora Square";
  if (cleanInput.includes("nari")) return "Nari Road";
  if (cleanInput.includes("congress")) return "Congress Nagar";
  if (cleanInput.includes("rahate")) return "Rahate Colony";
  if (cleanInput.includes("ajni")) return "Ajni Square";
  if (cleanInput.includes("chhatrapati")) return "Chhatrapati Square";
  if (cleanInput.includes("jaiprakash") || cleanInput.includes("jayprakash") || cleanInput.includes("jp nagar")) return "Jaiprakash Nagar";
  if (cleanInput.includes("ujjwal") || cleanInput.includes("ujwal")) return "Ujjwal Nagar";

  // 4. Substring fallback ordered by longest name
  const sortedByLength = [...allStations].sort((a, b) => b.length - a.length);
  for (const st of sortedByLength) {
    const cleanSt = st.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
    if (cleanSt.includes(cleanInput) || cleanInput.includes(cleanSt)) {
      return st;
    }
  }

  // 5. If still not matched, preserve input string rather than defaulting to first station
  return input.trim() || "Sitabuldi Interchange";
}

/**
 * Returns whether a station belongs to Orange or Aqua Line
 */
export function resolveMetroLine(fromStation: string, toStation?: string): "orange" | "aqua" {
  const orangeStations = new Set(
    (NAGPUR_METRO_LINES.find((l) => l.id === "orange")?.stations || []).filter(
      (s) => s !== "Sitabuldi Interchange"
    )
  );
  const aquaStations = new Set(
    (NAGPUR_METRO_LINES.find((l) => l.id === "aqua")?.stations || []).filter(
      (s) => s !== "Sitabuldi Interchange"
    )
  );

  if (orangeStations.has(fromStation) || (toStation && orangeStations.has(toStation))) {
    return "orange";
  }
  if (aquaStations.has(fromStation) || (toStation && aquaStations.has(toStation))) {
    return "aqua";
  }
  return "orange";
}

/**
 * Resolves a stop name to the exact stop string in a bus route
 */
export function resolveCanonicalBusStop(busNumber: string, stopName: string): string {
  if (!stopName) return "Sitabuldi Bus Terminal";
  const cleanBusNo = busNumber.replace(/^bus\s*/i, "").trim();
  const routes = getAvailableBusRoutes();
  const foundRoute =
    routes.find((r) => r.busNumber.toLowerCase() === cleanBusNo.toLowerCase()) ||
    routes.find((r) => r.busNumber.replace(/[^0-9]/g, "") === cleanBusNo.replace(/[^0-9]/g, "")) ||
    routes[0];
  if (!foundRoute || !foundRoute.stops || foundRoute.stops.length === 0) return stopName;

  const cleanStop = stopName.toLowerCase().replace(/[^a-z0-9]/g, "").trim();

  // 1. Exact match
  for (const st of foundRoute.stops) {
    if (st.toLowerCase().trim() === stopName.toLowerCase().trim()) return st;
  }

  // 2. Normalized alphanumeric match in current route
  for (const st of foundRoute.stops) {
    const sClean = st.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
    if (sClean === cleanStop || sClean.includes(cleanStop) || cleanStop.includes(sClean)) {
      return st;
    }
  }

  // 3. Match across all routes
  for (const r of routes) {
    for (const st of r.stops) {
      const sClean = st.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
      if (sClean === cleanStop || sClean.includes(cleanStop) || cleanStop.includes(sClean)) {
        return st;
      }
    }
  }

  return stopName;
}

/**
 * Converts journey legs from the Journey Planner into clean, valid TransitLegItems.
 * Automatically merges consecutive metro legs (e.g. Aqua Line ➔ Orange Line via Sitabuldi)
 * into a single unified Metro journey pass, while preserving separate legs for Metro ➔ Bus ➔ Metro transitions.
 */
export function convertJourneyLegsToTransitLegs(journeyLegs: Array<{
  mode: string;
  line?: string | undefined;
  busNumber?: string | undefined;
  from: string;
  to: string;
  fareRs?: number | undefined;
}>): TransitLegItem[] {
  const filtered = journeyLegs.filter((l) => l.mode === "metro" || l.mode === "bus");
  if (filtered.length === 0) return [];

  const routes = getAvailableBusRoutes();

  // 1. Merge consecutive metro legs (continuous in-station transfers like Aqua ➔ Orange at Sitabuldi)
  const mergedTransit: Array<{
    mode: "metro" | "bus";
    line?: string | undefined;
    busNumber?: string | undefined;
    from: string;
    to: string;
    fareRs?: number | undefined;
    isMultiLineMetro?: boolean | undefined;
    metroLines?: string[] | undefined;
  }> = [];

  for (const leg of filtered) {
    const prev = mergedTransit[mergedTransit.length - 1];
    if (prev && prev.mode === "metro" && leg.mode === "metro") {
      // Consecutive metro legs! Merge into single continuous metro leg
      prev.to = leg.to;
      prev.isMultiLineMetro = true;
      const lines = prev.metroLines || (prev.line ? [prev.line] : []);
      if (leg.line && !lines.includes(leg.line)) {
        lines.push(leg.line);
      }
      prev.metroLines = lines;
      prev.fareRs = undefined; // Will re-calculate single unified fare from start to end
    } else {
      mergedTransit.push({
        mode: leg.mode as "metro" | "bus",
        line: leg.line,
        busNumber: leg.busNumber,
        from: leg.from,
        to: leg.to,
        fareRs: leg.fareRs,
        metroLines: leg.mode === "metro" && leg.line ? [leg.line] : undefined,
      });
    }
  }

  // 2. Convert to TransitLegItem with canonical names and exact fare
  return mergedTransit.slice(0, 4).map((l, i) => {
    if (l.mode === "metro") {
      const canonicalFrom = resolveCanonicalMetroStation(l.from);
      const canonicalTo = resolveCanonicalMetroStation(l.to);

      let lineName = "Aqua Line";
      if (l.isMultiLineMetro && l.metroLines && l.metroLines.length > 1) {
        const formattedLines = l.metroLines.map((ln) => {
          if (ln.toLowerCase().includes("orange") || ln.toLowerCase().includes("north")) return "Orange Line";
          if (ln.toLowerCase().includes("aqua") || ln.toLowerCase().includes("blue") || ln.toLowerCase().includes("east")) return "Aqua Line";
          return ln;
        });
        lineName = Array.from(new Set(formattedLines)).join(" ➔ ");
      } else if (l.line && (l.line.toLowerCase().includes("orange") || l.line.toLowerCase().includes("north"))) {
        lineName = "Orange Line";
      } else if (l.line && (l.line.toLowerCase().includes("aqua") || l.line.toLowerCase().includes("blue") || l.line.toLowerCase().includes("east"))) {
        lineName = "Aqua Line";
      } else {
        const lineId = resolveMetroLine(canonicalFrom, canonicalTo);
        lineName = lineId === "aqua" ? "Aqua Line" : "Orange Line";
      }

      const fare = getMetroFareResult(canonicalFrom, canonicalTo).fare;

      return {
        id: `leg-${i}-${Date.now()}`,
        mode: "metro",
        lineOrRoute: lineName,
        from: canonicalFrom,
        to: canonicalTo,
        fare: l.fareRs && l.fareRs > 0 && !l.isMultiLineMetro ? l.fareRs : fare,
      };
    } else {
      let busNo = (l.busNumber || "").replace(/^bus\s*/i, "").trim();
      if (!busNo && l.line) {
        busNo = l.line.replace(/^bus\s*/i, "").trim();
      }
      if (!busNo) busNo = "135";

      const matchedRoute =
        routes.find((r) => r.busNumber.toLowerCase() === busNo.toLowerCase()) ||
        routes.find((r) => r.busNumber.replace(/[^0-9]/g, "") === busNo.replace(/[^0-9]/g, "")) ||
        routes[0];
      const routeNo = matchedRoute?.busNumber || busNo;

      const canonicalFrom = resolveCanonicalBusStop(routeNo, l.from);
      const canonicalTo = resolveCanonicalBusStop(routeNo, l.to);
      const fare = getBusFare(routeNo, canonicalFrom, canonicalTo).fare;

      return {
        id: `leg-${i}-${Date.now()}`,
        mode: "bus",
        lineOrRoute: routeNo,
        from: canonicalFrom,
        to: canonicalTo,
        fare: l.fareRs && l.fareRs > 0 ? l.fareRs : fare,
      };
    }
  });
}

/**
 * Calculates dynamic fare for any multi-leg transit list with 100% exact dataset matching
 */
export function calculateMultiLegFareSummary({
  category,
  legs,
  passengers,
}: {
  category: TicketCategory;
  legs: Array<{
    mode: "metro" | "bus";
    lineOrRoute: string;
    from: string;
    to: string;
  }>;
  passengers: PassengerBreakdown;
}): {
  legFares: number[];
  baseSingleAdultTotal: number;
  standardTotal: number;
  ecoDiscountAmount: number;
  concessionDiscountAmount: number;
  totalDiscountAmount: number;
  finalTotalFare: number;
  co2SavedKg: number;
  greenPointsEarned: number;
} {
  const totalCount = (passengers.adult || 0) + (passengers.student || 0) + (passengers.senior || 0);
  if (totalCount <= 0 || legs.length === 0) {
    return {
      legFares: [],
      baseSingleAdultTotal: 0,
      standardTotal: 0,
      ecoDiscountAmount: 0,
      concessionDiscountAmount: 0,
      totalDiscountAmount: 0,
      finalTotalFare: 0,
      co2SavedKg: 0,
      greenPointsEarned: 0,
    };
  }

  const legFares: number[] = legs.map((leg) => {
    if (!leg.from || !leg.to) return 0;
    if (leg.mode === "metro") {
      return getMetroFareResult(leg.from, leg.to).fare;
    } else {
      return getBusFare(leg.lineOrRoute, leg.from, leg.to).fare;
    }
  });

  const baseSingleAdultTotal = legFares.reduce((sum, f) => sum + f, 0);

  if (baseSingleAdultTotal === 0) {
    return {
      legFares,
      baseSingleAdultTotal: 0,
      standardTotal: 0,
      ecoDiscountAmount: 0,
      concessionDiscountAmount: 0,
      totalDiscountAmount: 0,
      finalTotalFare: 0,
      co2SavedKg: 0,
      greenPointsEarned: 0,
    };
  }

  // Concessions: Adult = 100%, Student = 75% (25% off), Senior = 50% (50% off)
  const adultSubtotal = (passengers.adult || 0) * baseSingleAdultTotal;
  const studentFullSubtotal = (passengers.student || 0) * baseSingleAdultTotal;
  const studentDiscount = Math.round(studentFullSubtotal * 0.25);
  const studentSubtotal = studentFullSubtotal - studentDiscount;

  const seniorFullSubtotal = (passengers.senior || 0) * baseSingleAdultTotal;
  const seniorDiscount = Math.round(seniorFullSubtotal * 0.5);
  const seniorSubtotal = seniorFullSubtotal - seniorDiscount;

  const standardTotal = adultSubtotal + studentFullSubtotal + seniorFullSubtotal;
  const concessionDiscountAmount = studentDiscount + seniorDiscount;
  const standardPostConcession = adultSubtotal + studentSubtotal + seniorSubtotal;

  // Eco-Move Exclusive 12% Discount on Combo or Special Eco Passes (Requires >= 2 transfers/legs)
  let ecoDiscountAmount = 0;
  if (category === "exclusive_eco" && legs.length >= 2) {
    ecoDiscountAmount = Math.max(2, Math.round(standardPostConcession * 0.12));
  }

  const finalTotalFare = Math.max(5, standardPostConcession - ecoDiscountAmount);
  const totalDiscountAmount = concessionDiscountAmount + ecoDiscountAmount;

  // CO2 savings estimate: ~0.85 kg per passenger per transit stage
  const factor = legs.length > 1 ? 1.4 : legs[0]?.mode === "metro" ? 1.1 : 0.8;
  const co2SavedKg = Number((totalCount * 0.85 * factor).toFixed(2));
  const greenPointsEarned = category === "exclusive_eco" ? totalCount * 25 : totalCount * 10;

  return {
    legFares,
    baseSingleAdultTotal,
    standardTotal,
    ecoDiscountAmount,
    concessionDiscountAmount,
    totalDiscountAmount,
    finalTotalFare,
    co2SavedKg,
    greenPointsEarned,
  };
}

const STORAGE_KEY = "eco_move_tickets_v1";

export function getStoredTickets(): IssuedTicket[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as IssuedTicket[];
    const now = new Date().getTime();

    // Auto-update expired status
    return list.map((t) => {
      if (t.status === "active" && new Date(t.validUntil).getTime() < now) {
        return { ...t, status: "expired" };
      }
      return t;
    });
  } catch (e) {
    console.error("Failed to load tickets from storage:", e);
    return [];
  }
}

export function saveIssuedTicket(ticket: IssuedTicket): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getStoredTickets();
    const updated = [ticket, ...existing.filter((t) => t.id !== ticket.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save ticket:", e);
  }
}

export function getActiveTickets(): IssuedTicket[] {
  return getStoredTickets().filter((t) => t.status === "active" && t.currentLegStep !== "completed");
}

export function generateTicketId(): string {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `ECO-NAG-${num}`;
}

export function generateTransactionRef(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let str = "TXN-";
  for (let i = 0; i < 9; i++) {
    str += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return str;
}

/**
 * Advanced Multi-Leg Transit Gate / Bus Validator State Simulator
 * Automatically handles:
 * - Bus Validator tap (1 tap per bus leg)
 * - Metro Turnstile Entry & Exit (2 taps per metro leg)
 * - Medium Switching (Bus -> Metro or Metro -> Bus)
 * - 2-Hour Interchange countdown start on transfer
 */
export function simulateGateScan(
  ticketId: string
): {
  success: boolean;
  message: string;
  gateName: string;
  nextMediumText: string;
  isComplete: boolean;
  updatedTicket?: IssuedTicket;
} {
  const tickets = getStoredTickets();
  const ticket = tickets.find((t) => t.id === ticketId);

  if (!ticket) {
    return {
      success: false,
      message: "Ticket not found or invalid QR",
      gateName: "Gate",
      nextMediumText: "",
      isComplete: false,
    };
  }

  const now = new Date();
  if (new Date(ticket.validUntil).getTime() < now.getTime()) {
    return {
      success: false,
      message: "Pass has expired. Please buy a new pass.",
      gateName: "Gate",
      nextMediumText: "",
      isComplete: false,
    };
  }

  const legs = ticket.legs && ticket.legs.length > 0 ? ticket.legs : [
    {
      id: "leg-0",
      mode: ticket.mode === "metro" ? "metro" : "bus",
      lineOrRoute: ticket.lineOrRouteName,
      from: ticket.source,
      to: ticket.destination,
      fare: ticket.finalFare,
    } as TransitLegItem,
  ];

  let currentLegIdx = ticket.currentLegIndex ?? 0;
  let currentStep = ticket.currentLegStep ?? "not_started";
  const currentLeg = legs[currentLegIdx] || legs[0]!;

  let message = "";
  let gateName = "";
  let nextMediumText = "";
  let isComplete = false;
  let newInterchangeExpiry = ticket.interchangeValidUntil;

  if (currentLeg.mode === "bus") {
    // Bus leg: 1 tap validator
    gateName = `Aapli Bus (${currentLeg.lineOrRoute}) Validator`;
    const isLastLeg = currentLegIdx >= legs.length - 1;

    if (isLastLeg) {
      currentStep = "completed";
      isComplete = true;
      message = `✅ Bus ${currentLeg.lineOrRoute} Validator Tap Approved (${currentLeg.from} ➔ ${currentLeg.to}). Journey Complete!`;
      nextMediumText = "🎉 All Transit Legs Completed";
    } else {
      currentLegIdx += 1;
      currentStep = "not_started";
      const nextLeg = legs[currentLegIdx]!;
      // Start 2-Hour Interchange Window
      newInterchangeExpiry = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
      message = `✅ Bus ${currentLeg.lineOrRoute} Verified! Interchanging to next leg (${nextLeg.mode === "metro" ? `Maha Metro at ${nextLeg.from}` : `Bus ${nextLeg.lineOrRoute}`}).`;
      nextMediumText = `Next: ${nextLeg.mode === "metro" ? `🚇 Maha Metro (${nextLeg.lineOrRoute})` : `🚌 Aapli Bus (${nextLeg.lineOrRoute})`}`;
    }
  } else {
    // Metro leg: 2 taps (Entry -> Exit)
    if (currentStep !== "metro_in_transit") {
      // Tap 1: Metro Entry
      gateName = `${currentLeg.from} Metro Gate ${Math.floor(1 + Math.random() * 4)}`;
      currentStep = "metro_in_transit";
      message = `✅ Metro Entry Authorized at ${currentLeg.from} (${gateName}). In transit to ${currentLeg.to}.`;
      nextMediumText = `🚇 In Transit to ${currentLeg.to} (Tap gate at exit)`;
    } else {
      // Tap 2: Metro Exit
      gateName = `${currentLeg.to} Metro Gate ${Math.floor(1 + Math.random() * 4)}`;
      const isLastLeg = currentLegIdx >= legs.length - 1;

      if (isLastLeg) {
        currentStep = "completed";
        isComplete = true;
        message = `✅ Metro Exit Authorized at ${currentLeg.to} (${gateName}). Thank you for travelling green!`;
        nextMediumText = "🎉 All Transit Legs Completed";
      } else {
        currentLegIdx += 1;
        currentStep = "not_started";
        const nextLeg = legs[currentLegIdx]!;
        // Start 2-Hour Interchange Window
        newInterchangeExpiry = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
        message = `✅ Metro Exit Authorized at ${currentLeg.to}. Interchanging to next leg (${nextLeg.mode === "metro" ? `Metro at ${nextLeg.from}` : `Bus ${nextLeg.lineOrRoute} at ${nextLeg.from}`}).`;
        nextMediumText = `Next: ${nextLeg.mode === "metro" ? `🚇 Maha Metro (${nextLeg.lineOrRoute})` : `🚌 Aapli Bus (${nextLeg.lineOrRoute})`}`;
      }
    }
  }

  const updatedGateScans = [
    ...(ticket.gateScans || []),
    {
      timestamp: now.toISOString(),
      gateName,
      legIndex: currentLegIdx,
      action: message,
    },
  ];

  const updatedTicket: IssuedTicket = {
    ...ticket,
    legs,
    currentLegIndex: currentLegIdx,
    currentLegStep: currentStep,
    interchangeValidUntil: newInterchangeExpiry,
    status: isComplete ? "used" : "active",
    gateScans: updatedGateScans,
  };

  saveIssuedTicket(updatedTicket);

  return {
    success: true,
    message,
    gateName,
    nextMediumText,
    isComplete,
    updatedTicket,
  };
}

/**
 * Plays an authentic Metro turnstile flap beep sound synthesized with Web Audio API
 */
export function playTurnstileBeep(isSuccess = true): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (isSuccess) {
      // Pleasant futuristic high-pitch dual chime (880Hz -> 1760Hz)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "triangle";

      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);

      osc2.frequency.setValueAtTime(1320, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(2640, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.3);
      osc2.stop(ctx.currentTime + 0.3);
    } else {
      // Low dual error buzz (220Hz -> 110Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(160, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    console.debug("Audio play error", e);
  }
}
