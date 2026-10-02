import type { Journey } from "./routing";
import { getBusFare, getMetroFare, normalizeStopName, findCanonicalMetroStation } from "./fares";
import { normalizeNagpurPlaceName } from "./placesSearch";
import schedulesData from "@/data/bus_schedules.json";
import { formatMinutesToTime } from "./busTimetableService";

export interface VerifiedDatasetInfo {
  type: "bus_fare" | "metro_fare" | "bus_schedule" | "metro_timing";
  busNumber?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  exactFare?: number | undefined;
  source: string;
  scheduleSummary?: {
    routeName: string;
    tripsPerDay: number;
    firstBus: string;
    lastBus: string;
    sampleDepartures: string;
  } | undefined;
}

const rawSchedules = schedulesData as Record<string, any>;

/**
 * Universally extracts bus/metro fare & bus schedule queries against local ground-truth matrices.
 */
export function extractDatasetInfoForQuery(query: string): VerifiedDatasetInfo | null {
  const q = query.trim();
  const lower = q.toLowerCase();

  const isScheduleQuery =
    lower.includes("schedule") ||
    lower.includes("timetable") ||
    lower.includes("timing") ||
    lower.includes("timings") ||
    lower.includes("first bus") ||
    lower.includes("last bus") ||
    lower.includes("frequency") ||
    lower.includes("kab aayegi") ||
    lower.includes("samay");

  const busMatch = lower.match(/(?:bus\s*(?:no\.?|number)?\s*)([0-9a-zA-Z-]+)/i) || lower.match(/([0-9a-zA-Z-]+)\s*number\s*bus/i);
  const busNumber = busMatch && busMatch[1] ? busMatch[1].toUpperCase() : undefined;

  const fromToMatch =
    lower.match(/from\s+([a-zA-Z0-9\s()./,-]+?)\s+to\s+([a-zA-Z0-9\s()./,-]+)/i) ||
    lower.match(/(?:between|se)\s+([a-zA-Z0-9\s()./,-]+?)\s+(?:and|to|se)\s+([a-zA-Z0-9\s()./,-]+)/i);
  const fromStop = fromToMatch && fromToMatch[1] ? fromToMatch[1].trim() : undefined;
  const toStop = fromToMatch && fromToMatch[2] ? fromToMatch[2].trim() : undefined;

  // 1. Bus Schedule Extraction (e.g. "schedule of bus no. 35", "bus 1 timetable")
  if (busNumber && (isScheduleQuery || !fromStop)) {
    const matched: Array<{
      routeName: string;
      tripsPerDay: number;
      firstBus: string;
      lastBus: string;
      sampleDepartures: string;
    }> = [];

    for (const [key, data] of Object.entries(rawSchedules)) {
      if (data && data.busNumber && data.busNumber.toUpperCase() === busNumber) {
        const deps = Array.isArray(data.departures) ? data.departures : [];
        matched.push({
          routeName: data.routeName || key,
          tripsPerDay: deps.length,
          firstBus: deps.length > 0 ? formatMinutesToTime(deps[0]) : "06:00 AM",
          lastBus: deps.length > 0 ? formatMinutesToTime(deps[deps.length - 1]) : "09:30 PM",
          sampleDepartures: deps.slice(0, 6).map((d: number) => formatMinutesToTime(d)).join(", "),
        });
      }
    }

    if (matched.length > 0) {
      return {
        type: "bus_schedule",
        busNumber,
        scheduleSummary: matched[0],
        source: "Aapli Bus Official Timetable Dataset",
      };
    }
  }

  // 2. Bus Fare Extraction (e.g. "fare of bus 207E from Aapli Bus Terminal to Indorama Gate No 3")
  if (busNumber && fromStop && toStop) {
    const busFareRes = getBusFare(busNumber, fromStop, toStop);
    return {
      type: "bus_fare",
      busNumber,
      from: fromStop,
      to: toStop,
      exactFare: busFareRes.fare,
      source: `Aapli Bus ${busNumber} Matrix (${busFareRes.source})`,
    };
  }

  // 3. Metro Fare Extraction (e.g. "fare of metro from Lokmanya Ngr Metro Station to Sitabuldi (Interchange)")
  const isMetroExplicit = lower.includes("metro") || lower.includes("aqua line") || lower.includes("orange line");
  const cFrom = fromStop ? findCanonicalMetroStation(fromStop) : null;
  const cTo = toStop ? findCanonicalMetroStation(toStop) : null;

  if ((isMetroExplicit || (cFrom && cTo)) && fromStop && toStop) {
    const metroFare = getMetroFare(fromStop, toStop);
    return {
      type: "metro_fare",
      from: cFrom || fromStop,
      to: cTo || toStop,
      exactFare: metroFare,
      source: "Nagpur Metro Official Fare Matrix",
    };
  }

  return null;
}

export interface RouteExplainPayload {
  query?: string;
  from?: string;
  to?: string;
  totalTime?: string;
  totalFare?: string;
  totalDistance?: string;
  walkDistance?: string;
  co2Saved?: string;
  transfers?: number;
  legs?: Array<{
    mode: "walk" | "bus" | "metro" | "drive";
    from: string;
    to: string;
    duration: string;
    distance: string;
    lineName: string;
    stopsCount: number;
  }>;
}

export interface RouteExplainResponse {
  explanation?: string;
  output?: string;
  text?: string;
  status?: string;
  generatedAt?: string;
}

export type AiIntentType =
  | "PLAN_ROUTE"
  | "FIND_NEARBY"
  | "TRACK_BUS"
  | "VIEW_TIMETABLE"
  | "GENERAL_ANSWER";

export interface AiSearchIntentResult {
  intent: AiIntentType;
  origin?: string | null | undefined;
  destination?: string | null | undefined;
  preference?: "balanced" | "fastest" | "cheapest" | "least_walk" | "fewest_transfers" | "low_co2" | null | undefined;
  departureTime?: string | null | undefined;
  nearbyLocation?: string | null | undefined;
  nearbyRadiusM?: number | null | undefined;
  nearbyMode?: "all" | "bus" | "metro" | "transit_stops" | string | null | undefined;
  busNumber?: string | null | undefined;
  stopName?: string | null | undefined;
  message: string;
}

// Production & Test n8n Webhook URLs (Single Unified Workflow: Eco-Move Nagpur - Explainable Route AI Agent)
export const N8N_PRODUCTION_WEBHOOK_URL = "https://rohit134.app.n8n.cloud/webhook/explain-route";
export const N8N_TEST_WEBHOOK_URL = "https://rohit134.app.n8n.cloud/webhook-test/explain-route";
export const N8N_WEBHOOK_URL = N8N_PRODUCTION_WEBHOOK_URL;

export const N8N_CHATBOT_PRODUCTION_WEBHOOK_URL = N8N_PRODUCTION_WEBHOOK_URL;
export const N8N_CHATBOT_TEST_WEBHOOK_URL = N8N_TEST_WEBHOOK_URL;
export const N8N_CHATBOT_WEBHOOK_URL = N8N_CHATBOT_PRODUCTION_WEBHOOK_URL;

/**
 * Robust extractor that parses clean markdown text from any n8n or Gemini AI output format.
 * Handles nested JSON objects, text/plain stringified JSON, replyMessage, explanation, etc.
 */
export function extractCleanAiText(data: any): string {
  if (!data) return "";

  // If string, check if it's stringified JSON
  if (typeof data === "string") {
    const trimmed = data.trim();
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        return extractCleanAiText(parsed);
      } catch {
        return data;
      }
    }
    return data;
  }

  // If object or array
  if (typeof data === "object") {
    if (Array.isArray(data) && data.length > 0) {
      return extractCleanAiText(data[0]);
    }

    // Direct text fields from n8n workflows
    if (typeof data.replyMessage === "string" && data.replyMessage.trim()) return data.replyMessage.trim();
    if (typeof data.explanation === "string" && data.explanation.trim()) return data.explanation.trim();
    if (typeof data.output === "string" && data.output.trim()) return data.output.trim();
    if (typeof data.text === "string" && data.text.trim()) return data.text.trim();
    if (typeof data.message === "string" && data.message.trim()) return data.message.trim();
    if (typeof data.response === "string" && data.response.trim()) return data.response.trim();
    if (typeof data.content === "string" && data.content.trim()) return data.content.trim();

    // Check inside nested json or data fields
    if (data.data) return extractCleanAiText(data.data);
    if (data.result) return extractCleanAiText(data.result);

    // Search for first substantial string property
    for (const key of Object.keys(data)) {
      if (
        typeof data[key] === "string" &&
        data[key].trim().length > 10 &&
        key !== "status" &&
        key !== "intent" &&
        key !== "generatedAt"
      ) {
        return data[key].trim();
      }
    }
  }

  return typeof data === "string" ? data : JSON.stringify(data);
}

/**
 * Intelligent local route explanation generator when n8n returns brief acknowledgement or is offline.
 */
export type AiLanguage = "en" | "hi" | "mr";

/**
 * Intelligent localized route explanation generator (English, Hindi, Marathi).
 */
export function generateDetailedRouteExplanation(
  journey: Journey,
  originName: string,
  destinationName: string,
  routeOptionIndex = 0,
  language: AiLanguage = "en"
): string {
  const timeMin = Math.round(journey.totalTimeMin);
  const fareRs = journey.totalFareRs ?? 0;
  const walkM = Math.round(journey.walkDistanceM || 0);
  const transfers = journey.transfers ?? 0;
  const co2Saved = Math.max(0, Math.round(((journey.totalDistanceM || 0) / 1000) * 170 - (journey.co2g || 0)));
  const isFallbackDrive = Boolean(journey.isFallbackDrive || journey.legs?.some((l) => l.mode === "drive"));

  if (isFallbackDrive) {
    const distKm = ((journey.totalDistanceM || 0) / 1000).toFixed(1);
    if (language === "hi") {
      return [
        `📍 **ड्राइविंग फॉलबैक: ${originName} → ${destinationName}**\n`,
        `⏱️ **सफर समय:** ~${timeMin} मिनट | 💰 **अनुमानित ईंधन खर्च:** ~₹${fareRs} | 🚗 **दूरी:** ${distKm} km\n`,
        `ℹ️ **सूचना:** इस समय या इस मार्ग पर कोई सक्रिय सार्वजनिक बस/मेट्रो सेवा उपलब्ध नहीं है।`,
        `\n**मार्गदर्शन (Turn-by-Turn Steps):**`,
        `1. 🚗 **कार या कैब से जाएं:** **${originName}** से **${destinationName}** तक मुख्य सड़क मार्ग से सीधे जाएं (~${distKm} km, ~${timeMin} मिनट)।`,
        `\n💡 **सुझाव (AI Tip):** आप सीधे ओला/उबर कैब बुक करने के लिए ऐप में **Show Available Cab Services** का उपयोग कर सकते हैं।`,
      ].join("\n");
    }
    if (language === "mr") {
      return [
        `📍 **ड्राइव्हिंग फॉलबॅक: ${originName} → ${destinationName}**\n`,
        `⏱️ **प्रवास वेळ:** ~${timeMin} मिनिटे | 💰 **अंदाजे इंधन खर्च:** ~₹${fareRs} | 🚗 **अंतर:** ${distKm} km\n`,
        `ℹ️ **सूचना:** या वेळी किंवा या मार्गावर कोणतीही सार्वजनिक बस/मेट्रो सेवा उपलब्ध नाही.`,
        `\n**मार्गदर्शन (Turn-by-Turn Steps):**`,
        `1. 🚗 **कार/कॅबने प्रवास करा:** **${originName}** ते **${destinationName}** दरम्यान मुख्य रस्त्यावरून थेट प्रवास करा (~${distKm} km, ~${timeMin} मिनिटे).`,
        `\n💡 **सल्ला (AI Tip):** थेट कॅब बुक करण्यासाठी खालील **Show Available Cab Services** पर्यायाचा वापर करा.`,
      ].join("\n");
    }
    return [
      `📍 **Driving Fallback Route: ${originName} → ${destinationName}**\n`,
      `⏱️ **Estimated Drive Time:** ~${timeMin} mins | 💰 **Est. Fuel Cost:** ~₹${fareRs} | 🚗 **Distance:** ${distKm} km\n`,
      `ℹ️ **Notice:** No public transit (bus/metro) is running for this route or time.`,
      `\n**Turn-by-Turn Steps:**`,
      `1. 🚗 **Drive or Book a Cab:** Follow the shortest direct road route from **${originName}** to **${destinationName}** (~${distKm} km, ~${timeMin} mins).`,
      `\n💡 **Travel Tip:** You can also tap **Show Available Cab Services** below to book an Uber or Ola cab immediately.`,
    ].join("\n");
  }
  if (language === "hi") {
    const lines: string[] = [
      `📍 **रूट विकल्प ${routeOptionIndex + 1}: ${originName} → ${destinationName}**\n`,
      `⏱️ **कुल समय:** ~${timeMin} मिनट | 💰 **किराया:** ₹${fareRs} | 🚶 **पैदल:** ${walkM}m | 🔄 **बदलाव (Transfers):** ${transfers}\n`,
      `**कदम-दर-कदम मार्गदर्शन (Turn-by-Turn Steps):**`,
    ];

    (journey.legs || []).forEach((leg, idx) => {
      const legTime = Math.round(leg.timeMin || 1);
      const legDist = Math.round(leg.distanceM || 0);

      if (leg.mode === "walk") {
        lines.push(`${idx + 1}. 🚶 **${leg.from}** से **${leg.to}** तक ~${legDist}m (~${legTime} मिनट) **पैदल चलें**।`);
      } else if (leg.mode === "metro") {
        const lineName = leg.line || "नागपुर मेट्रो";
        const stopsInfo = leg.stops && leg.stops.length > 0 ? ` (${leg.stops.length} स्टेशन)` : "";
        lines.push(
          `${idx + 1}. 🚇 **${leg.from}** पर **मेट्रो (${lineName})** पकड़ें और **${leg.to}** की ओर जाएं${stopsInfo} — ~${legTime} मिनट का सफर।`
        );
      } else if (leg.mode === "bus") {
        const busNum = leg.busNumber ? `बस ${leg.busNumber}` : leg.line || "आपली बस";
        const stopsInfo = leg.stops && leg.stops.length > 0 ? ` (${leg.stops.length} स्टॉप)` : "";
        lines.push(
          `${idx + 1}. 🚌 **${leg.from}** से **${busNum}** में बैठें और **${leg.to}** पर उतरें${stopsInfo} — ~${legTime} मिनट का सफर।`
        );
      }
    });

    lines.push(`\n🌱 **पर्यावरण बचत:** कार के बदले सार्वजनिक परिवहन लेकर आपने ~**${co2Saved}g CO₂** बचाया है!`);
    return lines.join("\n");
  }

  if (language === "mr") {
    const lines: string[] = [
      `📍 **मार्ग पर्याय ${routeOptionIndex + 1}: ${originName} → ${destinationName}**\n`,
      `⏱️ **एकूण वेळ:** ~${timeMin} मिनिटे | 💰 **भाडे:** ₹${fareRs} | 🚶 **पायी चालणे:** ${walkM}m | 🔄 **बदल (Transfers):** ${transfers}\n`,
      `**टप्प्याटप्प्याने मार्गदर्शन (Turn-by-Turn Steps):**`,
    ];

    (journey.legs || []).forEach((leg, idx) => {
      const legTime = Math.round(leg.timeMin || 1);
      const legDist = Math.round(leg.distanceM || 0);

      if (leg.mode === "walk") {
        lines.push(`${idx + 1}. 🚶 **${leg.from}** ते **${leg.to}** पर्यंत ~${legDist}m (~${legTime} मिनिटे) **पायी चाला**.`);
      } else if (leg.mode === "metro") {
        const lineName = leg.line || "नागपूर मेट्रो";
        const stopsInfo = leg.stops && leg.stops.length > 0 ? ` (${leg.stops.length} स्टेशन्स)` : "";
        lines.push(
          `${idx + 1}. 🚇 **${leg.from}** येथून **${leg.to}** कडे जाणाऱ्या **मेट्रो (${lineName})** मध्ये चढा${stopsInfo} — ~${legTime} मिनिटांचा प्रवास.`
        );
      } else if (leg.mode === "bus") {
        const busNum = leg.busNumber ? `बस ${leg.busNumber}` : leg.line || "आपली बस";
        const stopsInfo = leg.stops && leg.stops.length > 0 ? ` (${leg.stops.length} थांबे)` : "";
        lines.push(
          `${idx + 1}. 🚌 **${leg.from}** येथून **${busNum}** पकडा आणि **${leg.to}** येथे उतरा${stopsInfo} — ~${legTime} मिनिटांचा प्रवास.`
        );
      }
    });

    lines.push(`\n🌱 **पर्यावरण फायदा:** स्वतःच्या वाहनाऐवजी सार्वजनिक वाहतूक वापरल्याने ~**${co2Saved}g CO₂** ची बचत होते!`);
    return lines.join("\n");
  }

  // Default: English
  const lines: string[] = [
    `📍 **Route Option ${routeOptionIndex + 1}: ${originName} → ${destinationName}**\n`,
    `⏱️ **Total Duration:** ~${timeMin} mins | 💰 **Fare:** ₹${fareRs} | 🚶 **Walking:** ${walkM}m | 🔄 **Transfers:** ${transfers}\n`,
    `**Turn-by-Turn Steps:**`,
  ];

  (journey.legs || []).forEach((leg, idx) => {
    const legTime = Math.round(leg.timeMin || 1);
    const legDist = Math.round(leg.distanceM || 0);

    if (leg.mode === "walk") {
      lines.push(`${idx + 1}. 🚶 **Walk** ~${legDist}m (~${legTime} mins) from **${leg.from}** to **${leg.to}**.`);
    } else if (leg.mode === "metro") {
      const lineName = leg.line || "Nagpur Metro";
      const stopsInfo = leg.stops && leg.stops.length > 0 ? ` (${leg.stops.length} stations)` : "";
      lines.push(
        `${idx + 1}. 🚇 **Board Metro (${lineName})** at **${leg.from}** toward **${leg.to}**${stopsInfo} — ride for ~${legTime} mins.`
      );
    } else if (leg.mode === "bus") {
      const busNum = leg.busNumber ? `Bus ${leg.busNumber}` : leg.line || "Aapli Bus";
      const stopsInfo = leg.stops && leg.stops.length > 0 ? ` (${leg.stops.length} stops)` : "";
      lines.push(
        `${idx + 1}. 🚌 **Hop on ${busNum}** from **${leg.from}** to **${leg.to}**${stopsInfo} — ~${legTime} mins ride.`
      );
    }
  });

  lines.push(`\n🌱 **Green Savings:** You save ~**${co2Saved}g of CO₂** by traveling via public transit instead of driving a personal car.`);

  return lines.join("\n");
}

/**
 * Intelligent localized multi-route comparative analyst (English, Hindi, Marathi).
 */
export function generateDetailedRouteComparison(
  journeys: Journey[],
  originName: string,
  destinationName: string,
  language: AiLanguage = "en"
): string {
  if (!journeys || journeys.length === 0) return "No route options available to compare.";

  let fastestIdx = 0;
  let cheapestIdx = 0;
  let leastWalkIdx = 0;

  journeys.forEach((j, idx) => {
    const currentFastest = journeys[fastestIdx];
    const currentCheapest = journeys[cheapestIdx];
    const currentLeastWalk = journeys[leastWalkIdx];

    if (currentFastest && j.totalTimeMin < currentFastest.totalTimeMin) fastestIdx = idx;
    if (currentCheapest && (j.totalFareRs ?? 999) < (currentCheapest.totalFareRs ?? 999)) cheapestIdx = idx;
    if (currentLeastWalk && (j.walkDistanceM ?? 99999) < (currentLeastWalk.walkDistanceM ?? 99999)) leastWalkIdx = idx;
  });

  if (language === "hi") {
    const lines: string[] = [
      `📊 **रूट तुलना (${journeys.length} विकल्प)**`,
      `**शुरुआत:** ${originName}  |  **गंतव्य:** ${destinationName}\n`,
    ];

    journeys.forEach((j, idx) => {
      const badges: string[] = [];
      if (idx === fastestIdx) badges.push("⚡ सबसे तेज़");
      if (idx === cheapestIdx) badges.push("💰 सबसे सस्ता");
      if (idx === leastWalkIdx) badges.push("🚶 कम पैदल");
      if ((j.transfers ?? 0) === 0) badges.push("🔄 सीधा सफर");

      const badgeLabel = badges.length > 0 ? ` [${badges.join(" | ")}]` : "";

      const transitParts = j.legs
        .filter((l) => l.mode !== "walk")
        .map((l) => (l.mode === "metro" ? `🚇 ${l.line || "मेट्रो"}` : `🚌 ${l.busNumber ? `बस ${l.busNumber}` : l.line || "बस"}`));

      const transitText = transitParts.length > 0 ? transitParts.join(" + ") : "🚶 सिर्फ पैदल";

      lines.push(`• **विकल्प ${idx + 1}**${badgeLabel}`);
      lines.push(`  ⏱️ **समय:** ${Math.round(j.totalTimeMin)} मिनट | 💰 **किराया:** ₹${j.totalFareRs ?? 0} | 🚶 **पैदल:** ${Math.round(j.walkDistanceM || 0)}m | 🔄 **बदलाव:** ${j.transfers ?? 0}`);
      lines.push(`  🚏 **साधन:** ${transitText}`);
    });

    lines.push(`\n🏆 **AI की सिफारिश:**`);
    const topOption = fastestIdx;
    const bestJ = journeys[topOption] || journeys[0];
    if (bestJ) {
      lines.push(
        `समय और सुविधा के संतुलन के लिए **विकल्प ${topOption + 1}** सबसे उत्तम है! यह **~${Math.round(bestJ.totalTimeMin)} मिनट** में **₹${bestJ.totalFareRs ?? 0}** में पहुँचाता है।`
      );
    }
    return lines.join("\n");
  }

  if (language === "mr") {
    const lines: string[] = [
      `📊 **मार्ग तुलना (${journeys.length} पर्याय)**`,
      `**सुरुवात:** ${originName}  |  **गंतव्य:** ${destinationName}\n`,
    ];

    journeys.forEach((j, idx) => {
      const badges: string[] = [];
      if (idx === fastestIdx) badges.push("⚡ सर्वात जलद");
      if (idx === cheapestIdx) badges.push("💰 सर्वात स्वस्त");
      if (idx === leastWalkIdx) badges.push("🚶 कमी पायी");
      if ((j.transfers ?? 0) === 0) badges.push("🔄 थेट प्रवास");

      const badgeLabel = badges.length > 0 ? ` [${badges.join(" | ")}]` : "";

      const transitParts = j.legs
        .filter((l) => l.mode !== "walk")
        .map((l) => (l.mode === "metro" ? `🚇 ${l.line || "मेट्रो"}` : `🚌 ${l.busNumber ? `बस ${l.busNumber}` : l.line || "बस"}`));

      const transitText = transitParts.length > 0 ? transitParts.join(" + ") : "🚶 फक्त पायी";

      lines.push(`• **पर्याय ${idx + 1}**${badgeLabel}`);
      lines.push(`  ⏱️ **वेळ:** ${Math.round(j.totalTimeMin)} मिनिटे | 💰 **भाडे:** ₹${j.totalFareRs ?? 0} | 🚶 **पायी:** ${Math.round(j.walkDistanceM || 0)}m | 🔄 **बदल:** ${j.transfers ?? 0}`);
      lines.push(`  🚏 **माध्यम:** ${transitText}`);
    });

    lines.push(`\n🏆 **AI शिफारस:**`);
    const topOption = fastestIdx;
    const bestJ = journeys[topOption] || journeys[0];
    if (bestJ) {
      lines.push(
        `जलद आणि सोयीस्कर प्रवासासाठी **पर्याय ${topOption + 1}** सर्वोत्तम आहे! हा **~${Math.round(bestJ.totalTimeMin)} मिनिटांत** **₹${bestJ.totalFareRs ?? 0}** मध्ये पोहोचवतो.`
      );
    }
    return lines.join("\n");
  }

  // Default: English
  const lines: string[] = [
    `📊 **Route Comparison (${journeys.length} Options)**`,
    `**From:** ${originName}  |  **To:** ${destinationName}\n`,
  ];

  journeys.forEach((j, idx) => {
    const badges: string[] = [];
    if (idx === fastestIdx) badges.push("⚡ Fastest");
    if (idx === cheapestIdx) badges.push("💰 Cheapest");
    if (idx === leastWalkIdx) badges.push("🚶 Least Walk");
    if ((j.transfers ?? 0) === 0) badges.push("🔄 Direct");

    const badgeLabel = badges.length > 0 ? ` [${badges.join(" | ")}]` : "";

    const transitParts = j.legs
      .filter((l) => l.mode !== "walk")
      .map((l) => (l.mode === "metro" ? `🚇 ${l.line || "Metro"}` : `🚌 ${l.busNumber ? `Bus ${l.busNumber}` : l.line || "Bus"}`));

    const transitText = transitParts.length > 0 ? transitParts.join(" + ") : "🚶 Walking Only";

    lines.push(`• **Option ${idx + 1}**${badgeLabel}`);
    lines.push(`  ⏱️ **Time:** ${Math.round(j.totalTimeMin)}m | 💰 **Fare:** ₹${j.totalFareRs ?? 0} | 🚶 **Walk:** ${Math.round(j.walkDistanceM || 0)}m | 🔄 **Transfers:** ${j.transfers ?? 0}`);
    lines.push(`  🚏 **Modes:** ${transitText}`);
  });

  lines.push(`\n🏆 **Expert Recommendation:**`);
  const topOption = fastestIdx;
  const bestJ = journeys[topOption] || journeys[0];
  if (bestJ) {
    lines.push(
      `Take **Option ${topOption + 1}** for the best balance of speed and convenience! It reaches in **~${Math.round(bestJ.totalTimeMin)} minutes** for **₹${bestJ.totalFareRs ?? 0}**.`
    );
  }

  return lines.join("\n");
}

// Persistent in-memory caches for generated route explanations and comparisons
const routeExplanationCache = new Map<string, string>();
const routeComparisonCache = new Map<string, string>();

/**
 * Builds a deterministic cache key for a specific journey option and language
 */
export function getRouteExplainCacheKey(
  journey: Journey,
  originName: string,
  destinationName: string,
  routeOptionIndex = 0,
  language: AiLanguage = "en"
): string {
  const modes = (journey.legs || []).map((l) => `${l.mode}_${l.line || l.busNumber || ""}`).join("-");
  const time = Math.round(journey.totalTimeMin || 0);
  const dist = Math.round(journey.totalDistanceM || 0);
  return `${originName.trim().toLowerCase()}__${destinationName.trim().toLowerCase()}__opt${routeOptionIndex}__t${time}_d${dist}__m${modes}__lang_${language}`;
}

/**
 * Builds a deterministic cache key for multi-route comparison and language
 */
export function getRouteCompareCacheKey(
  journeys: Journey[],
  originName: string,
  destinationName: string,
  language: AiLanguage = "en"
): string {
  const journeysSig = (journeys || [])
    .map((j, i) => `opt${i}_${Math.round(j.totalTimeMin)}_${Math.round(j.totalDistanceM || 0)}`)
    .join("__");
  return `compare__${originName.trim().toLowerCase()}__${destinationName.trim().toLowerCase()}__${journeysSig}__lang_${language}`;
}

export function getCachedRouteExplanation(
  journey: Journey,
  originName: string,
  destinationName: string,
  routeOptionIndex = 0,
  language: AiLanguage = "en"
): string | undefined {
  const key = getRouteExplainCacheKey(journey, originName, destinationName, routeOptionIndex, language);
  return routeExplanationCache.get(key);
}

export function setCachedRouteExplanation(
  journey: Journey,
  originName: string,
  destinationName: string,
  routeOptionIndex: number,
  content: string,
  language: AiLanguage = "en"
): void {
  const key = getRouteExplainCacheKey(journey, originName, destinationName, routeOptionIndex, language);
  routeExplanationCache.set(key, content);
}

export function clearCachedRouteExplanation(
  journey: Journey,
  originName: string,
  destinationName: string,
  routeOptionIndex = 0,
  language: AiLanguage = "en"
): void {
  const key = getRouteExplainCacheKey(journey, originName, destinationName, routeOptionIndex, language);
  routeExplanationCache.delete(key);
}

export function getCachedRouteComparison(
  journeys: Journey[],
  originName: string,
  destinationName: string,
  language: AiLanguage = "en"
): string | undefined {
  const key = getRouteCompareCacheKey(journeys, originName, destinationName, language);
  return routeComparisonCache.get(key);
}

export function setCachedRouteComparison(
  journeys: Journey[],
  originName: string,
  destinationName: string,
  content: string,
  language: AiLanguage = "en"
): void {
  const key = getRouteCompareCacheKey(journeys, originName, destinationName, language);
  routeComparisonCache.set(key, content);
}

export function clearCachedRouteComparison(
  journeys: Journey[],
  originName: string,
  destinationName: string,
  language: AiLanguage = "en"
): void {
  const key = getRouteCompareCacheKey(journeys, originName, destinationName, language);
  routeComparisonCache.delete(key);
}

/**
 * Transforms an unformatted single paragraph AI response into a structured multi-line Markdown presentation.
 */
export function structureAiExplanationParagraph(
  text: string,
  journey: Journey,
  originName: string,
  destinationName: string,
  routeOptionIndex: number,
  language: AiLanguage = "en"
): string {
  if (!text) return generateDetailedRouteExplanation(journey, originName, destinationName, routeOptionIndex, language);

  const trimmed = text.trim();
  // If it already has multiple lines with bullet points or numbers, return as is
  const lines = trimmed.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length >= 3 && (trimmed.includes("1.") || trimmed.includes("•") || trimmed.includes("🚶") || trimmed.includes("🚌") || trimmed.includes("🚇"))) {
    return trimmed;
  }

  // Split raw paragraph into sentences
  const sentences = trimmed
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length <= 1) {
    return generateDetailedRouteExplanation(journey, originName, destinationName, routeOptionIndex, language);
  }

  const timeMin = Math.round(journey.totalTimeMin);
  const fareRs = journey.totalFareRs ?? 0;
  const walkM = Math.round(journey.walkDistanceM || 0);
  const transfers = journey.transfers ?? 0;
  const co2Saved = Math.max(0, Math.round(((journey.totalDistanceM || 0) / 1000) * 170 - (journey.co2g || 0)));

  const titleHeader =
    language === "hi"
      ? `📍 **रूट विकल्प ${routeOptionIndex + 1}: ${originName} → ${destinationName}**\n⏱️ **कुल समय:** ~${timeMin} मिनट | 💰 **किराया:** ₹${fareRs} | 🚶 **पैदल:** ${walkM}m | 🔄 **बदलाव:** ${transfers}\n\n**कदम-दर-कदम मार्गदर्शन (Turn-by-Turn Steps):**`
      : language === "mr"
      ? `📍 **मार्ग पर्याय ${routeOptionIndex + 1}: ${originName} → ${destinationName}**\n⏱️ **एकूण वेळ:** ~${timeMin} मिनिटे | 💰 **भाडे:** ₹${fareRs} | 🚶 **पायी:** ${walkM}m | 🔄 **बदल:** ${transfers}\n\n**टप्प्याटप्प्याने मार्गदर्शन (Turn-by-Turn Steps):**`
      : `📍 **Route Option ${routeOptionIndex + 1}: ${originName} → ${destinationName}**\n⏱️ **Total Duration:** ~${timeMin} mins | 💰 **Fare:** ₹${fareRs} | 🚶 **Walking:** ${walkM}m | 🔄 **Transfers:** ${transfers}\n\n**Turn-by-Turn Steps:**`;

  const formattedSteps: string[] = [titleHeader];

  let stepNumber = 1;
  const tips: string[] = [];

  sentences.forEach((sentence) => {
    const sLower = sentence.toLowerCase();
    if (sLower.includes("walk") || sLower.includes("stroll") || sLower.includes("पैदल") || sLower.includes("पायी")) {
      formattedSteps.push(`${stepNumber++}. 🚶 **${language === "hi" ? "पैदल चलें" : language === "mr" ? "पायी चाला" : "Walk"}:** ${sentence}`);
    } else if (sLower.includes("bus") || sLower.includes("बस") || sLower.includes("aapli") || sLower.includes("hop on")) {
      formattedSteps.push(`${stepNumber++}. 🚌 **${language === "hi" ? "बस यात्रा" : language === "mr" ? "बस प्रवास" : "Bus Ride"}:** ${sentence}`);
    } else if (sLower.includes("metro") || sLower.includes("मेट्रो") || sLower.includes("train") || sLower.includes("board")) {
      formattedSteps.push(`${stepNumber++}. 🚇 **${language === "hi" ? "मेट्रो यात्रा" : language === "mr" ? "मेट्रो प्रवास" : "Metro Ride"}:** ${sentence}`);
    } else if (sLower.includes("trip takes") || sLower.includes("keep an eye") || sLower.includes("tip") || sLower.includes("advice") || sLower.includes("note")) {
      tips.push(sentence);
    } else {
      formattedSteps.push(`${stepNumber++}. 📍 ${sentence}`);
    }
  });

  if (tips.length > 0) {
    formattedSteps.push(`\n💡 **${language === "hi" ? "सुझाव (AI Tip)" : language === "mr" ? "सूचना (AI Tip)" : "Travel Tip"}:** ${tips.join(" ")}`);
  }

  const greenLabel =
    language === "hi"
      ? `\n🌱 **पर्यावरण बचत:** आपने सार्वजनिक परिवहन का उपयोग करके ~**${co2Saved}g CO₂** बचाया!`
      : language === "mr"
      ? `\n🌱 **पर्यावरण फायदा:** सार्वजनिक वाहतूक वापरल्याने ~**${co2Saved}g CO₂** ची बचत झाली!`
      : `\n🌱 **Green Savings:** You save ~**${co2Saved}g of CO₂** compared to driving a personal vehicle!`;

  formattedSteps.push(greenLabel);

  return formattedSteps.join("\n");
}

/**
 * Validates whether the AI response is a real, complete multi-route comparison breakdown
 * rather than a single introductory teaser sentence.
 */
export function isValidRouteComparisonText(text: string, optionsCount = 2): boolean {
  if (!text || text.trim().length < 80) return false;
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // If it's just a teaser/preamble intro sentence
  const isPreambleOnly =
    lower.startsWith("i'll compare") ||
    lower.startsWith("i will compare") ||
    lower.startsWith("let me compare") ||
    lower.startsWith("here is a comparison") ||
    lower.startsWith("comparing all") ||
    lower.startsWith("i'm comparing") ||
    lower.startsWith("sure, i'll compare") ||
    lower.startsWith("sure, i can compare") ||
    lower.startsWith("let's compare");

  const lines = trimmed.split("\n").filter((l) => l.trim().length > 0);

  if (isPreambleOnly && lines.length <= 2) {
    return false;
  }

  if (lines.length < 3) {
    return false;
  }

  const hasOptionNumbers =
    (lower.includes("option 1") || lower.includes("विकल्प 1") || lower.includes("पर्याय 1")) &&
    (lower.includes("option 2") || lower.includes("विकल्प 2") || lower.includes("पर्याय 2"));

  const hasMetrics =
    (lower.includes("min") || lower.includes("मिनट") || lower.includes("वेळ")) &&
    (lower.includes("₹") || lower.includes("fare") || lower.includes("किराया") || lower.includes("भाडे"));

  return hasOptionNumbers || hasMetrics || lines.length >= 4;
}

/**
 * Builds payload and sends request to n8n webhook to explain the planned transit route.
 */
export async function explainRouteWithN8n(
  journey: Journey,
  originName: string,
  destinationName: string,
  customWebhookUrl?: string,
  routeOptionIndex = 0,
  language: AiLanguage = "en"
): Promise<string> {
  const cached = getCachedRouteExplanation(journey, originName, destinationName, routeOptionIndex, language);
  if (cached) {
    return cached;
  }

  const fallback = generateDetailedRouteExplanation(journey, originName, destinationName, routeOptionIndex, language);
  const targetUrl = customWebhookUrl?.trim() || N8N_WEBHOOK_URL;

  const langPrompt =
    language === "hi"
      ? "Format with clear Markdown bolding, numbered steps (1. 2. 3.), line breaks, and emojis (🚶, 🚌, 🚇, ⏱️, 💰) in Hindi. Do not return a single continuous paragraph."
      : language === "mr"
      ? "Format with clear Markdown bolding, numbered steps (1. 2. 3.), line breaks, and emojis (🚶, 🚌, 🚇, ⏱️, 💰) in Marathi. Do not return a single continuous paragraph."
      : "Format with clear Markdown bolding, numbered steps (1. 2. 3.), line breaks, and emojis (🚶, 🚌, 🚇, ⏱️, 💰) in English. Do not return a single continuous paragraph.";

  const payload: RouteExplainPayload & {
    routeIndex?: number;
    optionName?: string;
    action?: string;
    language?: string;
  } = {
    action: "EXPLAIN_ROUTE",
    language: language === "hi" ? "Hindi" : language === "mr" ? "Marathi" : "English",
    query: `Explain Route Option ${routeOptionIndex + 1} from ${originName} to ${destinationName}. ${langPrompt}`,
    from: originName || "Source",
    to: destinationName || "Destination",
    routeIndex: routeOptionIndex + 1,
    optionName: `Option ${routeOptionIndex + 1}`,
    totalTime: `${Math.round(journey.totalTimeMin)} mins`,
    totalFare: `₹${journey.totalFareRs ?? 0}`,
    totalDistance: `${((journey.totalDistanceM || 0) / 1000).toFixed(1)} km`,
    walkDistance: `${Math.round(journey.walkDistanceM || 0)}m`,
    co2Saved: `${Math.max(0, Math.round(((journey.totalDistanceM || 0) / 1000) * 170 - (journey.co2g || 0)))}g CO₂`,
    transfers: journey.transfers ?? 0,
    legs: (journey.legs || []).map((leg) => ({
      mode: leg.mode,
      from: leg.from || "Start Point",
      to: leg.to || "End Point",
      duration: `${Math.round(leg.timeMin || 1)} mins`,
      distance: `${Math.round(leg.distanceM || 0)}m`,
      lineName: leg.line || leg.busNumber || (leg.mode === "metro" ? "Nagpur Metro" : leg.mode === "bus" ? "Aapli Bus" : "Walk"),
      stopsCount: leg.stops?.length || 0,
    })),
  };

  try {
    const rawRes = await sendPayloadToN8n(payload, targetUrl);
    const clean = extractCleanAiText(rawRes);
    const rawResult = !clean || clean.length < 80 ? fallback : clean;
    const result = structureAiExplanationParagraph(rawResult, journey, originName, destinationName, routeOptionIndex, language);
    setCachedRouteExplanation(journey, originName, destinationName, routeOptionIndex, result, language);
    return result;
  } catch (err) {
    console.warn("n8n explain request failed, using intelligent fallback:", err);
    setCachedRouteExplanation(journey, originName, destinationName, routeOptionIndex, fallback, language);
    return fallback;
  }
}

/**
 * Comparative AI analysis across multiple route options (Route 1, Route 2, Route 3) with language support.
 */
export async function compareRoutesWithN8n(
  journeys: Journey[],
  originName: string,
  destinationName: string,
  customWebhookUrl?: string,
  language: AiLanguage = "en"
): Promise<string> {
  const cached = getCachedRouteComparison(journeys, originName, destinationName, language);
  if (cached) {
    return cached;
  }

  const fallback = generateDetailedRouteComparison(journeys, originName, destinationName, language);
  const targetUrl = customWebhookUrl?.trim() || N8N_WEBHOOK_URL;

  const langPrompt =
    language === "hi"
      ? "Provide a full side-by-side comparison of all options with timings, fares, and AI recommendation in Hindi (हिंदी में सभी विकल्पों की तुलना करें). Do not return just an introductory sentence."
      : language === "mr"
      ? "Provide a full side-by-side comparison of all options with timings, fares, and AI recommendation in Marathi (मराठीत सर्व पर्यायांची तुलना करा). Do not return just an introductory sentence."
      : "Provide a full side-by-side comparison of all options with timings, fares, and AI recommendation in English. Do not return just an introductory sentence.";

  const payload = {
    action: "COMPARE_ROUTES",
    language: language === "hi" ? "Hindi" : language === "mr" ? "Marathi" : "English",
    query: `Compare all ${journeys.length} route options from ${originName} to ${destinationName}. ${langPrompt}`,
    from: originName,
    to: destinationName,
    optionsCount: journeys.length,
    options: journeys.map((j, idx) => ({
      optionNumber: idx + 1,
      totalTime: `${Math.round(j.totalTimeMin)} mins`,
      totalFare: `₹${j.totalFareRs ?? 0}`,
      walkDistance: `${Math.round(j.walkDistanceM || 0)}m`,
      transfers: j.transfers ?? 0,
      co2Saved: `${Math.max(0, Math.round(((j.totalDistanceM || 0) / 1000) * 170 - (j.co2g || 0)))}g CO₂`,
      modes: j.legs.map((l) => (l.mode === "walk" ? "Walk" : l.line || l.busNumber || l.mode)).join(" → "),
    })),
  };

  try {
    const rawRes = await sendPayloadToN8n(payload, targetUrl);
    const clean = extractCleanAiText(rawRes);
    const isValid = isValidRouteComparisonText(clean, journeys.length);
    const result = isValid ? clean : fallback;
    setCachedRouteComparison(journeys, originName, destinationName, result, language);
    return result;
  } catch (err) {
    console.warn("n8n comparison request failed, using intelligent fallback:", err);
    setCachedRouteComparison(journeys, originName, destinationName, fallback, language);
    return fallback;
  }
}


async function sendPayloadToN8nRaw(payload: any, targetUrl: string): Promise<any> {
  const urlsToTry = [targetUrl];
  if (targetUrl === N8N_PRODUCTION_WEBHOOK_URL) {
    urlsToTry.push(N8N_TEST_WEBHOOK_URL);
  } else if (targetUrl === N8N_TEST_WEBHOOK_URL) {
    urlsToTry.push(N8N_PRODUCTION_WEBHOOK_URL);
  }

  let lastError: any = null;

  for (const url of urlsToTry) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    try {
      console.log("%c🚀 [n8n AI Request]", "color: #ff6d00; font-weight: bold;", `Sending to ${url}`, payload);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/plain, */*",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404 && urlsToTry.length > 1) {
          continue; // Try next URL
        }
        throw new Error(`n8n Webhook returned HTTP status ${response.status} (${response.statusText})`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        console.log("%c✨ [n8n AI Response]", "color: #00c853; font-weight: bold;", data);
        return data;
      } else {
        const textData = await response.text();
        console.log("%c✨ [n8n AI Response]", "color: #00c853; font-weight: bold;", textData);
        try {
          return JSON.parse(textData);
        } catch {
          return textData;
        }
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn("⚠️ n8n request attempt notice:", err);
      lastError = err;
    }
  }

  throw lastError || new Error("Failed to communicate with n8n AI webhook.");
}

async function sendPayloadToN8n(payload: any, targetUrl: string): Promise<string> {
  const raw = await sendPayloadToN8nRaw(payload, targetUrl);
  return extractCleanAiText(raw);
}

/**
 * Fast & smart local natural language intent & entity extractor.
 * Handles live bus tracking, nearby transit radius queries, timetable lookup,
 * and multimodal route planning with preferences & time specs.
 */
export function parseLocalHeuristicQuery(
  rawQuery: string,
  userLocationName = "Your location"
): AiSearchIntentResult {
  const q = rawQuery.trim();
  const lower = q.toLowerCase();

  // 1. Bus Number & Intent Extraction (Live Tracking vs Timetable vs Generic Bus Query)
  const isTracking =
    /\b(?:track\s+(?:bus|vehicle|route)|bus\s+tracking|live\s+bus|bus\s+kahan\s+hai|bus\s+kaha\s+hai|bus\s+kidhar\s+hai|kahan\s+tak\s+pahunchegi|kahan\s+tak\s+pahunchi)\b/i.test(lower) ||
    lower.startsWith("track bus") ||
    lower === "live bus tracking";

  const isSchedule =
    lower.includes("timetable") ||
    lower.includes("time table") ||
    lower.includes("schedule") ||
    lower.includes("timing") ||
    lower.includes("timings") ||
    lower.includes("samay") ||
    lower.includes("kab aayegi") ||
    lower.includes("frequency");

  const isValidBusCode = (str?: string | null): boolean => {
    if (!str) return false;
    const s = str.trim().toLowerCase();
    if (!/\d/.test(s)) return false; // Must contain digits (e.g. 135, 4B, 207E)
    if (["bus", "stop", "station", "stand", "terminal", "fare", "ticket", "route", "pass", "service", "chalo", "tracking", "track", "live", "kholo", "dekhna"].includes(s)) {
      return false;
    }
    return /^[0-9a-z-]+$/i.test(s);
  };

  // Match bus numbers in various conversational formats
  let extractedBusNumber: string | undefined;

  const busPatterns = [
    /\b([0-9a-z-]+)\s*(?:number|no\.?)\s*bus\b/i,
    /\bbus\s*(?:no\.?|number)?\s*([0-9a-z-]+)\b/i,
    /(?:track|locate|schedule|timetable|timings?)\s+(?:bus\s*)?([0-9a-z-]+)\b/i,
    /\b([0-9a-z-]+)\s+ko\s+track\b/i,
    /^bus\s*([0-9a-z-]+)$/i,
  ];

  for (const pattern of busPatterns) {
    const match = lower.match(pattern);
    const candidate = match?.[1];
    if (candidate && isValidBusCode(candidate)) {
      extractedBusNumber = candidate.toUpperCase();
      break;
    }
  }

  // 1A. Schedule / Timetable intent
  if (isSchedule && extractedBusNumber) {
    return {
      intent: "VIEW_TIMETABLE",
      busNumber: extractedBusNumber,
      message: `Opening daily timetable for Bus ${extractedBusNumber}.`,
    };
  }

  // 1B. Live Bus Tracking intent (e.g. "mujhe bus 135 ko track krna hai", "bus 135 track karo", "where is bus 135", "bus 135 live")
  const isFromToRoute =
    lower.includes(" from ") ||
    lower.includes(" to ") ||
    lower.includes(" se ") ||
    lower.includes(" jana hai ") ||
    lower.includes(" jana ") ||
    lower.includes(" pohochna ") ||
    lower.includes(" pahuchna ");

  if (isTracking || (extractedBusNumber && !isFromToRoute) || lower.startsWith("live bus")) {
    return {
      intent: "TRACK_BUS",
      busNumber: extractedBusNumber ?? null,
      message: extractedBusNumber
        ? `Locating live Bus ${extractedBusNumber} on the map.`
        : `Opening Live Bus Tracking.`,
    };
  }

  // 3. Nearby Transit Discovery: e.g. "eternity mall ke 1 km radius me transport stops dilkhao", "find nearest bus stops near dharampeth within 2 km"
  const isNearbyQuery =
    lower.includes("nearest") ||
    lower.includes("nearby") ||
    lower.includes("closest") ||
    lower.includes("near me") ||
    lower.includes("radius") ||
    lower.includes("paas ke") ||
    lower.includes("aas paas") ||
    lower.includes("as paas") ||
    lower.includes("dikhao") ||
    lower.includes("dilkhao") ||
    lower.includes("stops near") ||
    lower.includes("transport stops") ||
    lower.includes("stations near") ||
    /\b\d+\s*(?:km|k|m|meter|meters)\s*(?:radius|range|me|mein|ke andar)?\b/i.test(lower);

  if (isNearbyQuery) {
    let radiusM = 1500;
    const radiusMatch =
      lower.match(/within\s*(\d+(?:\.\d+)?)\s*(km|k|m|meter|meters)?/i) ||
      lower.match(/(\d+(?:\.\d+)?)\s*(km|k|m|meter|meters)\s*(?:radius|range|me|mein|ke andar|within)?/i) ||
      lower.match(/in\s*(\d+(?:\.\d+)?)\s*(km|k|m|meter|meters)?\s*(?:radius|range)?/i);

    if (radiusMatch && radiusMatch[1]) {
      const num = parseFloat(radiusMatch[1]);
      const unit = (radiusMatch[2] || "km").toLowerCase();
      if (unit.startsWith("m") && !unit.startsWith("mi")) {
        radiusM = Math.max(250, Math.min(10000, Math.round(num)));
      } else {
        radiusM = Math.max(250, Math.min(10000, Math.round(num * 1000)));
      }
    }

    // Determine target anchor place
    let nearbyLocation = userLocationName;
    const nearMatch = lower.match(/\b(?:near|around|at|close to|of)\s+([a-zA-Z0-9\s]+?)(?:\s+within|\s+in\s+\d|\s+radius|\s*$)/i);
    const keRadiusMatch = lower.match(/^([a-zA-Z0-9\s]+?)\s+(?:ke\s+)?(?:\d+(?:\.\d+)?\s*(?:km|k|m|meter|meters)\s*(?:radius|range|me|mein|ke andar))/i);
    const aasPaasMatch = lower.match(/^([a-zA-Z0-9\s]+?)\s+(?:ke\s+)?(?:aas\s*paas|paas)/i);

    if (nearMatch && nearMatch[1] && !["me", "here", "my location", "current location"].includes(nearMatch[1].trim())) {
      nearbyLocation = nearMatch[1].trim();
    } else if (keRadiusMatch && keRadiusMatch[1]) {
      nearbyLocation = keRadiusMatch[1].trim();
    } else if (aasPaasMatch && aasPaasMatch[1]) {
      nearbyLocation = aasPaasMatch[1].trim();
    } else if (nearMatch && nearMatch[1]) {
      nearbyLocation = nearMatch[1].trim();
    }

    nearbyLocation = nearbyLocation
      .replace(/^(find|show|give|get|mujhe|dikhao|dilkhao|nearest|nearby|closest|transport|stops|bus stops|metro)\s+/gi, "")
      .replace(/\s+(ke|ka|ki|me|mein)$/gi, "")
      .trim();

    if (["me", "here", "current location", "my location", "mere location", "meri location", "user location"].includes(nearbyLocation.toLowerCase())) {
      nearbyLocation = "Your location";
    }

    let nearbyMode: "all" | "bus" | "metro" = "all";
    if (lower.includes("metro") && !lower.includes("bus")) nearbyMode = "metro";
    if (lower.includes("bus") && !lower.includes("metro")) nearbyMode = "bus";

    return {
      intent: "FIND_NEARBY",
      nearbyLocation: normalizeNagpurPlaceName(nearbyLocation),
      nearbyRadiusM: radiusM,
      nearbyMode,
      message: `Finding transit options within ${radiusM >= 1000 ? `${radiusM / 1000} km` : `${radiusM} m`} of ${nearbyLocation}.`,
    };
  }

  // 4. Multimodal Route Planning: e.g. "mujhe mere location se eternity mall jana hai abhi ke abhi jald se jald"
  let preference: AiSearchIntentResult["preference"] = "balanced";
  if (
    lower.includes("fastest") ||
    lower.includes("faster") ||
    lower.includes("quickest") ||
    lower.includes("quick") ||
    lower.includes("jald se jald") ||
    lower.includes("jaldi se jaldi") ||
    lower.includes("jaldi") ||
    lower.includes("sabse tej") ||
    lower.includes("fast")
  ) {
    preference = "fastest";
  } else if (
    lower.includes("cheapest") ||
    lower.includes("cheaper") ||
    lower.includes("cheap") ||
    lower.includes("lowest fare") ||
    lower.includes("sasta") ||
    lower.includes("sabse sasta") ||
    lower.includes("kam paise")
  ) {
    preference = "cheapest";
  } else if (lower.includes("least walk") || lower.includes("minimum walk") || lower.includes("less walk") || lower.includes("kam chalna")) {
    preference = "least_walk";
  } else if (lower.includes("fewest transfer") || lower.includes("least transfer") || lower.includes("no transfer") || lower.includes("direct") || lower.includes("seedha")) {
    preference = "fewest_transfers";
  } else if (lower.includes("low co2") || lower.includes("eco") || lower.includes("green") || lower.includes("carbon")) {
    preference = "low_co2";
  }

  // Time extraction (e.g. "abhi ke abhi", "abhi", "at 10 am", "10 baje", "right now")
  let departureTime: string | null = null;
  if (
    lower.includes("abhi ke abhi") ||
    lower.includes("abhi") ||
    lower.includes("turant") ||
    lower.includes("right now") ||
    lower.includes("immediately") ||
    lower.includes("just now") ||
    lower.includes("now")
  ) {
    departureTime = "now";
  } else {
    const timeMatch = lower.match(/(?:at|on|by|around)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm|baje|bje)?)/i);
    if (timeMatch && timeMatch[1]) {
      const rawTime = timeMatch[1].trim().toLowerCase().replace(/baje|bje/g, "").trim();
      if (rawTime.includes("pm") || rawTime.includes("am")) {
        const isPm = rawTime.includes("pm");
        const parts = rawTime.replace(/(am|pm)/g, "").trim().split(":");
        let hour = parseInt(parts[0] || "0", 10);
        const min = parts[1] ? parseInt(parts[1], 10) : 0;
        if (isPm && hour < 12) hour += 12;
        if (!isPm && hour === 12) hour = 0;
        departureTime = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
      } else if (rawTime.includes(":")) {
        departureTime = rawTime;
      } else if (parseInt(rawTime, 10) > 0) {
        departureTime = `${rawTime.padStart(2, "0")}:00`;
      }
    }
  }

  // Origin & Destination extraction (English + Hindi/Hinglish patterns)
  let origin: string | null = userLocationName;
  let destination: string | null = null;

  // Check if user specified current location in Hindi/Hinglish
  if (
    lower.includes("mere location") ||
    lower.includes("meri location") ||
    lower.includes("apni location") ||
    lower.includes("my location") ||
    lower.includes("current location") ||
    lower.includes("from here") ||
    lower.includes("from me")
  ) {
    origin = "Your location";
  }

  // Pre-clean for pattern extraction
  const cleanedForRouting = lower
    .replace(/^(i want to go to|how to reach|how to go to|take me to|navigate to|directions to|route to|go to|chalo|mujhe)\s+/i, "")
    .replace(/\s+(in|by|with|as)?\s*(the\s*)?(fastest|cheapest|low co2|least walk|fewest transfers|quickest|best|balanced)(\s+way)?(\s+possible)?(\s+now)?$/gi, "")
    .replace(/\s+(as fast as possible|as quickly as possible|as cheap as possible|fastest way possible|fastest possible|fastest way|right now|immediately|now|today)$/gi, "")
    .trim();

  // Hindi pattern: "X se Y jana hai" / "X se Y" / "mujhe X se Y jana hai"
  const hindiSeJanaMatch = lower.match(/(?:mujhe\s+)?(?:([a-zA-Z0-9\s]+?)\s+se\s+)?([a-zA-Z0-9\s]+?)\s+(?:jana hai|pohochna hai|pahuchna hai|le chalo|jana|pohochna|pahuchna)/i);
  if (hindiSeJanaMatch) {
    if (hindiSeJanaMatch[1]) {
      const origCandidate = hindiSeJanaMatch[1].trim();
      if (["mere location", "meri location", "apni location", "my location", "current location", "me", "here"].includes(origCandidate)) {
        origin = "Your location";
      } else {
        origin = origCandidate;
      }
    }
    if (hindiSeJanaMatch[2]) {
      destination = hindiSeJanaMatch[2].trim();
    }
  }

  if (!destination) {
    const fromToMatch = cleanedForRouting.match(/^from\s+(.+?)\s+to\s+(.+)$/i);
    if (fromToMatch && fromToMatch[1] && fromToMatch[2]) {
      origin = fromToMatch[1].trim();
      destination = fromToMatch[2].trim();
    } else if (cleanedForRouting.includes(" from ")) {
      const parts = cleanedForRouting.split(/\s+from\s+/i);
      destination = parts[0]?.replace(/^to\s+/i, "").trim() || null;
      origin = parts[1]?.trim() || "Your location";
    } else if (cleanedForRouting.startsWith("to ")) {
      destination = cleanedForRouting.replace(/^to\s+/i, "").trim();
    } else {
      destination = cleanedForRouting;
    }
  }

  // Clean destination string if trailing noise or Hindi particles remain
  if (destination) {
    destination = destination
      .replace(/\s+from\s+(my location|your location|current location|here|me|mere location|meri location)/gi, "")
      .replace(/\s+(in|by|with|as)?\s*(the\s*)?(fastest|cheapest|low co2|least walk|fewest transfers|quickest|best|balanced)(\s+way)?(\s+possible)?(\s+now)?/gi, "")
      .replace(/\s+(as fast as possible|as quickly as possible|as cheap as possible|fastest way possible|fastest possible|fastest way|right now|immediately|now|today)/gi, "")
      .replace(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm|baje|bje)?\b/gi, "")
      .replace(/^(mujhe|mere|meri|apni|location|se)\s+/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    destination = normalizeNagpurPlaceName(destination);

    if (destination.length > 0 && !["near me", "nearby", "here", "location"].includes(destination)) {
      const formattedOrigin = origin && ["mere location", "meri location", "apni location", "my location", "current location", "me", "here"].includes(origin.toLowerCase())
        ? "Your location"
        : normalizeNagpurPlaceName(origin || "Your location");

      return {
        intent: "PLAN_ROUTE",
        origin: formattedOrigin,
        destination,
        preference,
        departureTime: departureTime || "now",
        message: `Planning ${preference !== "balanced" ? `${preference} ` : ""}route from ${formattedOrigin || "Your location"} to ${destination}${departureTime && departureTime !== "now" ? ` at ${departureTime}` : " right now"}.`,
      };
    }
  }

  // 5. Fallback general query / transit answer
  return {
    intent: "GENERAL_ANSWER",
    message: q,
  };
}

/**
 * Executes a natural language search query using the n8n AI Agent with seamless local heuristic fallback.
 */
export async function executeAiSearchQuery(
  userQuery: string,
  userLocationName = "Your location",
  customWebhookUrl?: string
): Promise<AiSearchIntentResult> {
  const localFallback = parseLocalHeuristicQuery(userQuery, userLocationName);
  const targetUrl = customWebhookUrl?.trim() || N8N_WEBHOOK_URL;

  try {
    const payload = {
      action: "PARSE_NATURAL_LANGUAGE_COMMAND",
      query: userQuery,
      userLocation: userLocationName,
      fallbackIntent: localFallback.intent,
    };

    const responseData = await sendPayloadToN8nRaw(payload as unknown as RouteExplainPayload, targetUrl);

    // Direct structured JSON response from n8n AI Agent
    if (responseData && typeof responseData === "object") {
      const obj = Array.isArray(responseData) ? responseData[0] : responseData;
      if (obj && obj.intent) {
        return {
          intent: obj.intent,
          origin: obj.origin ?? localFallback.origin,
          destination: obj.destination ?? localFallback.destination,
          preference: obj.preference ?? localFallback.preference,
          departureTime: obj.departureTime ?? localFallback.departureTime,
          nearbyLocation: obj.nearbyLocation ?? localFallback.nearbyLocation,
          nearbyRadiusM: obj.nearbyRadiusM ?? localFallback.nearbyRadiusM,
          nearbyMode: obj.nearbyMode ?? localFallback.nearbyMode,
          busNumber: obj.busNumber ?? localFallback.busNumber,
          stopName: obj.stopName ?? localFallback.stopName,
          message: obj.replyMessage || obj.message || obj.explanation || localFallback.message,
        };
      }
    }

    if (typeof responseData === "string" && responseData.trim()) {
      try {
        const parsed = JSON.parse(responseData);
        if (parsed && typeof parsed === "object" && parsed.intent) {
          return {
            intent: parsed.intent,
            origin: parsed.origin ?? localFallback.origin,
            destination: parsed.destination ?? localFallback.destination,
            preference: parsed.preference ?? localFallback.preference,
            departureTime: parsed.departureTime ?? localFallback.departureTime,
            nearbyLocation: parsed.nearbyLocation ?? localFallback.nearbyLocation,
            nearbyRadiusM: parsed.nearbyRadiusM ?? localFallback.nearbyRadiusM,
            nearbyMode: parsed.nearbyMode ?? localFallback.nearbyMode,
            busNumber: parsed.busNumber ?? localFallback.busNumber,
            stopName: parsed.stopName ?? localFallback.stopName,
            message: parsed.replyMessage || parsed.message || parsed.explanation || localFallback.message,
          };
        }
      } catch {
        // Response was markdown/text from n8n LLM
        if (localFallback.intent !== "GENERAL_ANSWER") {
          return {
            ...localFallback,
            message: responseData.trim(),
          };
        }
        return {
          intent: "GENERAL_ANSWER",
          message: responseData.trim(),
        };
      }
    }
  } catch (err) {
    console.warn("n8n AI query failed, using local intelligence fallback:", err);
  }

  return localFallback;
}

/**
 * Sends free-form transit conversation queries to the dedicated n8n AI Chatbot Agent (Option 1).
 */
export async function askAiTransitChatbot(
  query: string,
  journeyContext?: {
    journey: Journey;
    originName: string;
    destinationName: string;
    routeIndex?: number;
  } | null,
  customWebhookUrl?: string
): Promise<string> {
  const targetUrl = customWebhookUrl?.trim() || N8N_CHATBOT_WEBHOOK_URL;
  const payload: any = {
    action: "CHATBOT_QUERY",
    query,
    timestamp: new Date().toISOString(),
  };

  const verifiedInfo = extractDatasetInfoForQuery(query);
  if (verifiedInfo) {
    payload.verifiedDatasetInfo = verifiedInfo;
    payload.queryType = verifiedInfo.type;
    payload.exactFare = verifiedInfo.exactFare;
    payload.extractedBus = verifiedInfo.busNumber;
    payload.extractedFrom = verifiedInfo.from;
    payload.extractedTo = verifiedInfo.to;
    payload.scheduleSummary = verifiedInfo.scheduleSummary;
  }

  if (journeyContext && journeyContext.journey) {
    const j = journeyContext.journey;
    payload.journeyContext = {
      from: journeyContext.originName,
      to: journeyContext.destinationName,
      routeIndex: (journeyContext.routeIndex ?? 0) + 1,
      totalTime: `${Math.round(j.totalTimeMin)} mins`,
      totalFare: `₹${j.totalFareRs ?? 0}`,
      walkDistance: `${Math.round(j.walkDistanceM || 0)}m`,
      transfers: j.transfers ?? 0,
      legs: (j.legs || []).map((leg) => ({
        mode: leg.mode,
        from: leg.from,
        to: leg.to,
        duration: `${Math.round(leg.timeMin || 1)} mins`,
        distance: `${Math.round(leg.distanceM || 0)}m`,
        lineName: leg.line || leg.busNumber || (leg.mode === "metro" ? "Nagpur Metro" : leg.mode === "bus" ? "Aapli Bus" : "Walk"),
      })),
    };
  }

  // 1. Try dedicated chatbot webhook
  try {
    const rawRes = await sendPayloadToN8n(payload, targetUrl);
    const clean = extractCleanAiText(rawRes);
    if (clean && clean.trim().length > 0) {
      return clean;
    }
  } catch {
    // 2. If dedicated webhook is 404 or down, try standard explain-route webhook as fallback
    if (targetUrl !== N8N_WEBHOOK_URL) {
      try {
        const fallbackRes = await sendPayloadToN8n(payload, N8N_WEBHOOK_URL);
        const clean = extractCleanAiText(fallbackRes);
        if (clean && clean.trim().length > 0) {
          return clean;
        }
      } catch (err) {
        console.warn("Both n8n chatbot webhooks failed, using local transit intelligence:", err);
      }
    }
  }

  // 3. Fallback intelligent response based on local dataset knowledge
  if (verifiedInfo) {
    if (verifiedInfo.type === "bus_schedule" && verifiedInfo.scheduleSummary) {
      const s = verifiedInfo.scheduleSummary;
      return `🚌 **Aapli Bus ${verifiedInfo.busNumber} Daily Timetable & Schedule:**\n• 📍 **Route:** ${s.routeName}\n• ⏱️ **Operating Hours:** ${s.firstBus} to ${s.lastBus}\n• 🔄 **Total Trips:** ${s.tripsPerDay} departures / day\n• 🕒 **Sample Morning Timings:** ${s.sampleDepartures}\n• 📍 **Source:** Verified from Official Nagpur Aapli Bus Timetable Dataset.`;
    } else if (verifiedInfo.type === "bus_fare") {
      return `🚌 **Aapli Bus ${verifiedInfo.busNumber} Official Fare:**\n• **From:** ${verifiedInfo.from}\n• **To:** ${verifiedInfo.to}\n• 💰 **Exact Ticket Fare:** **₹${verifiedInfo.exactFare}**\n• 📍 **Source:** Verified from Nagpur Transit Dataset (${verifiedInfo.source}).`;
    } else if (verifiedInfo.type === "metro_fare") {
      return `🚇 **Nagpur Maha Metro Official Fare:**\n• **From:** ${verifiedInfo.from}\n• **To:** ${verifiedInfo.to}\n• 💰 **Exact Ticket Fare:** **₹${verifiedInfo.exactFare}** (MahaCard Smart Card: ~₹${Math.round((verifiedInfo.exactFare || 20) * 0.9)})\n• 📍 **Source:** Official Maha Metro Pairwise Matrix.`;
    }
  }

  const q = query.toLowerCase();

  if (q.includes("smart card") || q.includes("mahacard") || q.includes("card") || q.includes("pass")) {
    return `💳 **Maha Metro MahaCard & Pass Benefits:**\n• **Discounts:** 10% discount on every metro trip.\n• **Where to Buy:** Available at any Nagpur Metro station ticket counter for ₹150 (includes balance).\n• **Recharge:** Online via Maha Metro App / UPI or at station kiosks.\n• **Senior Citizens:** 33% concession available with senior citizen registration ID.`;
  }

  if (q.includes("airport") || (q.includes("railway") && q.includes("reach"))) {
    return `✈️ **How to reach Airport from Nagpur Railway Station:**\n1. Walk 200m to **Nagpur Railway Station Metro** (Orange Line).\n2. Board Metro towards **Khapri / MIHAN**.\n3. Alight at **Airport Metro Station** or **Airport South Metro Station** (~18 mins, ₹25 fare).\n4. A feeder shuttle/auto is available directly outside the metro station to the departure terminal.`;
  }

  if (q.includes("lift") || q.includes("elevator") || q.includes("elderly") || q.includes("wheelchair")) {
    return `🛗 **Accessibility & Senior Citizen Facilities:**\n• **Nagpur Metro:** 100% accessible with ground-to-concourse and concourse-to-platform elevators (lifts) at all 38+ stations.\n• **Wheelchair ramps & tactile paving** are installed at all station gates.\n• **Aapli Bus:** Reserved senior citizen seating in front seats (Seats 1-4).`;
  }

  return `I am your Nagpur Transit AI Guide. You can ask me about Aapli Bus schedules, Metro lines, ticket fares, smart cards, or directions to any landmark in Nagpur!`;
}

