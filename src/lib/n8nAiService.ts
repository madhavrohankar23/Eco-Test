import type { Journey } from "./routing";

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
    mode: "walk" | "bus" | "metro";
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

// User-provided n8n webhook URL
export const N8N_WEBHOOK_URL = "https://rohit134.app.n8n.cloud/webhook-test/explain-route";

/**
 * Builds payload and sends request to n8n webhook to explain the planned transit route.
 */
export async function explainRouteWithN8n(
  journey: Journey,
  originName: string,
  destinationName: string,
  customWebhookUrl?: string
): Promise<string> {
  const targetUrl = customWebhookUrl?.trim() || N8N_WEBHOOK_URL;

  const payload: RouteExplainPayload = {
    from: originName || "Source",
    to: destinationName || "Destination",
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

  return sendPayloadToN8n(payload, targetUrl);
}

/**
 * Sends a conversational transit query from the bottom-right AI Chatbot to n8n.
 */
export async function askAiTransitChatbot(
  userQuery: string,
  journeyContext?: {
    journey: Journey;
    originName: string;
    destinationName: string;
  } | null,
  customWebhookUrl?: string
): Promise<string> {
  const targetUrl = customWebhookUrl?.trim() || N8N_WEBHOOK_URL;

  const payload: RouteExplainPayload = {
    query: userQuery,
    ...(journeyContext
      ? {
          from: journeyContext.originName,
          to: journeyContext.destinationName,
          totalTime: `${Math.round(journeyContext.journey.totalTimeMin)} mins`,
          totalFare: `₹${journeyContext.journey.totalFareRs ?? 0}`,
          transfers: journeyContext.journey.transfers ?? 0,
          legs: (journeyContext.journey.legs || []).map((leg) => ({
            mode: leg.mode,
            from: leg.from,
            to: leg.to,
            duration: `${Math.round(leg.timeMin || 1)} mins`,
            distance: `${Math.round(leg.distanceM || 0)}m`,
            lineName: leg.line || leg.busNumber || (leg.mode === "metro" ? "Nagpur Metro" : "Bus"),
            stopsCount: leg.stops?.length || 0,
          })),
        }
      : {}),
  };

  return sendPayloadToN8n(payload, targetUrl);
}

async function sendPayloadToN8n(payload: RouteExplainPayload, targetUrl: string): Promise<string> {
  const response = await fetch(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/plain, */*",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 404 && targetUrl.includes("webhook-test")) {
      throw new Error(
        "n8n Test Webhook is waiting for a trigger. Please click 'Listen for test event' in your n8n workflow editor, or activate the workflow and use the production webhook URL."
      );
    }
    throw new Error(`n8n Webhook returned HTTP status ${response.status} (${response.statusText})`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    const data = await response.json();
    if (typeof data === "string") return data;
    if (data?.explanation) return String(data.explanation);
    if (data?.output) return String(data.output);
    if (data?.text) return String(data.text);
    if (data?.message) return String(data.message);
    if (data?.response) return String(data.response);
    return JSON.stringify(data, null, 2);
  } else {
    const textData = await response.text();
    return textData;
  }
}
