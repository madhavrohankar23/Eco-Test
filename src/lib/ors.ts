/**
 * OpenRouteService (ORS) API client - foot-walking profile, shortest path.
 * Includes OpenStreetMap foot router fallback when ORS quota is exceeded,
 * rate-limit protection, persistent caching, and seamless street-following geometry.
 */

export interface WalkRouteResult {
  /** Actual road distance in metres */
  distanceM: number;
  /** Actual walk duration in minutes */
  timeMin: number;
  /** Ordered polyline coords following real roads */
  path: { lat: number; lon: number }[];
}

const ORS_BASE = "https://api.openrouteservice.org/v2/directions/foot-walking/geojson";

/** In-memory cache: key = "lon1,lat1|lon2,lat2" */
const memoryCache = new Map<string, WalkRouteResult>();

/** Rate limit cooldown timestamp (ms) - stops spamming if 429/403 received */
let orsDisabledUntil = 0;

function cacheKey(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
): string {
  return `${from.lon.toFixed(5)},${from.lat.toFixed(5)}|${to.lon.toFixed(5)},${to.lat.toFixed(5)}`;
}

/** Try to get from localStorage cache if available */
function getPersistentCache(key: string): WalkRouteResult | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(`ors_${key}`);
    if (raw) return JSON.parse(raw);
  } catch {
    return null;
  }
  return null;
}

/** Save to localStorage cache */
function setPersistentCache(key: string, result: WalkRouteResult) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(`ors_${key}`, JSON.stringify(result));
  } catch {
    // localStorage may be full or disabled in private browsing
  }
}

/**
 * Fallback pedestrian routing using OpenStreetMap routed-foot service.
 * Free, requires no API key, and follows real pedestrian street paths in Nagpur.
 */
async function fetchOsmFootRoute(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
): Promise<WalkRouteResult | null> {
  const urls = [
    `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${from.lon.toFixed(6)},${from.lat.toFixed(6)};${to.lon.toFixed(6)},${to.lat.toFixed(6)}?overview=full&geometries=geojson`,
    `https://router.project-osrm.org/route/v1/foot/${from.lon.toFixed(6)},${from.lat.toFixed(6)};${to.lon.toFixed(6)},${to.lat.toFixed(6)}?overview=full&geometries=geojson`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "EcoMoveNagpur/1.0" },
      });
      if (!res.ok) continue;
      const data = await res.json();
      const route = data?.routes?.[0];
      if (!route || !route.geometry?.coordinates) continue;

      const coords: [number, number][] = route.geometry.coordinates;
      if (!coords || coords.length < 2) continue;

      return {
        distanceM: route.distance,
        timeMin: route.duration / 60,
        path: coords.map(([lon, lat]) => ({ lat, lon })),
      };
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Fetch the shortest pedestrian route from ORS or OSM Foot Router.
 * Returns street-following polyline coordinates with multi-tier fallback.
 */
export async function walkRoute(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
): Promise<WalkRouteResult | null> {
  // Skip trivially short legs (< 15 m)
  const dx = Math.abs(from.lat - to.lat) + Math.abs(from.lon - to.lon);
  if (dx < 0.00015) {
    return {
      distanceM: 15,
      timeMin: 0.2,
      path: [{ lat: from.lat, lon: from.lon }, { lat: to.lat, lon: to.lon }],
    };
  }

  const key = cacheKey(from, to);
  
  // 1. Check in-memory cache
  const cachedMem = memoryCache.get(key);
  if (cachedMem) return cachedMem;

  // 2. Check localStorage cache
  const cachedLocal = getPersistentCache(key);
  if (cachedLocal) {
    memoryCache.set(key, cachedLocal);
    return cachedLocal;
  }

  // 3. Try ORS if not in quota cooldown
  if (Date.now() >= orsDisabledUntil) {
    const envMeta = typeof import.meta !== "undefined" ? (import.meta.env as Record<string, string | undefined>) : undefined;
    const envProc = typeof process !== "undefined" && process.env ? (process.env as Record<string, string | undefined>) : undefined;
    const apiKey =
      envMeta?.["VITE_ORS_API_KEY"] ||
      envProc?.["VITE_ORS_API_KEY"] ||
      "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjU4ODhiYjRlNWFkODQzNjFiYTJkY2NkZDMxM2I3YzRjIiwiaCI6Im11cm11cjY0In0=";

    if (apiKey && apiKey !== "your_ors_api_key_here") {
      const body = {
        coordinates: [
          [from.lon, from.lat],
          [to.lon, to.lat],
        ],
        preference: "shortest",
        geometry_simplify: false,
        instructions: false,
      };

      try {
        const res = await fetch(ORS_BASE, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: apiKey,
          },
          body: JSON.stringify(body),
        });

        if (res.status === 429 || res.status === 403) {
          // Quota exceeded or rate limited - disable ORS for 10 minutes and use OSM
          orsDisabledUntil = Date.now() + 600000;
        } else if (res.ok) {
          const data = (await res.json()) as {
            features: Array<{
              geometry: { coordinates: [number, number][] };
              properties: { summary: { distance: number; duration: number } };
            }>;
          };

          const feature = data.features?.[0];
          if (feature) {
            const { distance, duration } = feature.properties.summary;
            const coords = feature.geometry.coordinates;

            const result: WalkRouteResult = {
              distanceM: distance,
              timeMin: duration / 60,
              path: coords.map(([lon, lat]) => ({ lat, lon })),
            };

            memoryCache.set(key, result);
            setPersistentCache(key, result);
            return result;
          }
        }
      } catch {
        // Network error, proceed to fallback
      }
    }
  }

  // 4. Secondary Fallback: OpenStreetMap Foot Router
  const osmResult = await fetchOsmFootRoute(from, to);
  if (osmResult) {
    memoryCache.set(key, osmResult);
    setPersistentCache(key, osmResult);
    return osmResult;
  }

  return null;
}

export interface DriveRouteResult {
  /** Actual road distance in metres */
  distanceM: number;
  /** Actual drive duration in minutes */
  timeMin: number;
  /** Ordered polyline coords following real roads */
  path: { lat: number; lon: number }[];
}

const driveMemoryCache = new Map<string, DriveRouteResult>();

function haversineDistM(p1: { lat: number; lon: number }, p2: { lat: number; lon: number }): number {
  const R = 6371000;
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLon = ((p2.lon - p1.lon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Fallback driving router using OpenStreetMap / OSRM routed-car service.
 * Free, fast, and follows real vehicular roads in Nagpur.
 */
export async function driveRoute(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
): Promise<DriveRouteResult | null> {
  const dx = Math.abs(from.lat - to.lat) + Math.abs(from.lon - to.lon);
  if (dx < 0.00015) {
    return {
      distanceM: 20,
      timeMin: 0.1,
      path: [{ lat: from.lat, lon: from.lon }, { lat: to.lat, lon: to.lon }],
    };
  }

  const key = `drive_${from.lon.toFixed(5)},${from.lat.toFixed(5)}|${to.lon.toFixed(5)},${to.lat.toFixed(5)}`;
  if (driveMemoryCache.has(key)) {
    return driveMemoryCache.get(key)!;
  }

  const urls = [
    `https://router.project-osrm.org/route/v1/driving/${from.lon.toFixed(6)},${from.lat.toFixed(6)};${to.lon.toFixed(6)},${to.lat.toFixed(6)}?overview=full&geometries=geojson`,
    `https://routing.openstreetmap.de/routed-car/route/v1/driving/${from.lon.toFixed(6)},${from.lat.toFixed(6)};${to.lon.toFixed(6)},${to.lat.toFixed(6)}?overview=full&geometries=geojson`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "EcoMoveNagpur/1.0" },
      });
      if (!res.ok) continue;
      const data = await res.json();
      const route = data?.routes?.[0];
      if (!route || !route.geometry?.coordinates) continue;

      const coords: [number, number][] = route.geometry.coordinates;
      if (!coords || coords.length < 2) continue;

      // OSRM provides raw free-flow highway speed duration without urban signals or traffic delays.
      // Calibrate to realistic Nagpur urban traffic speed (~25-27 km/h with signals).
      const distKm = route.distance / 1000;
      const realisticCityDurationMin = Math.max(2, Math.round((distKm / 26) * 60) + 1);
      const scaledOsrmMin = Math.round((route.duration * 1.85) / 60);
      const finalDriveTimeMin = Math.max(realisticCityDurationMin, scaledOsrmMin);

      const result: DriveRouteResult = {
        distanceM: route.distance,
        timeMin: finalDriveTimeMin,
        path: coords.map(([lon, lat]) => ({ lat, lon })),
      };

      driveMemoryCache.set(key, result);
      return result;
    } catch {
      continue;
    }
  }

  // Fallback straight-line road estimate if network router is unavailable
  const hDist = haversineDistM(from, to);
  const roadDistM = Math.round(hDist * 1.35);
  const estDriveMin = Math.max(2, Math.round((roadDistM / 1000 / 26) * 60) + 1);
  const fallbackResult: DriveRouteResult = {
    distanceM: roadDistM,
    timeMin: estDriveMin,
    path: [{ lat: from.lat, lon: from.lon }, { lat: to.lat, lon: to.lon }],
  };
  return fallbackResult;
}

/**
 * Clears the in-memory route cache.
 */
export function clearWalkCache() {
  memoryCache.clear();
  driveMemoryCache.clear();
}
