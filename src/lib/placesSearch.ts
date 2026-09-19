import { searchablePlaces, allLines } from "@/lib/routing";
import { NAGPUR_POIS, type NagpurPOI } from "@/lib/nagpurPlaces";

export interface UnifiedPlaceResult {
  id: string;
  name: string;
  subtitle: string;
  lat: number;
  lon: number;
  kind: "metro" | "bus" | "poi" | "online";
  categoryLabel?: string | undefined;
  lineName?: string | undefined;
}

// In-memory cache for live online geocoded search queries
const onlineCache = new Map<string, UnifiedPlaceResult[]>();

/**
 * Fast synchronous search across transit stops and curated Nagpur POIs.
 */
export function searchLocalPlaces(q: string, limit = 8): UnifiedPlaceResult[] {
  const query = q.toLowerCase().trim();
  if (!query) return [];

  const results: UnifiedPlaceResult[] = [];
  const seenNames = new Set<string>();

  // 1. Search curated Nagpur POIs (resorts, malls, lakes, colleges, etc.)
  for (const poi of NAGPUR_POIS) {
    const nameMatch = poi.name.toLowerCase().includes(query);
    const kwMatch = poi.keywords.some((k) => k.toLowerCase().includes(query));
    const subMatch = poi.subtitle.toLowerCase().includes(query);

    if (nameMatch || kwMatch || subMatch) {
      results.push({
        id: poi.id,
        name: poi.name,
        subtitle: poi.subtitle,
        lat: poi.lat,
        lon: poi.lon,
        kind: "poi",
        categoryLabel: poi.category,
      });
      seenNames.add(poi.name.toLowerCase());
    }
  }

  // 2. Search transit stops & metro stations
  for (const place of searchablePlaces) {
    const nameLower = place.name.toLowerCase();
    if (seenNames.has(nameLower)) continue;

    if (nameLower.includes(query)) {
      const isMetro = place.modes.includes("metro");
      const isBus = place.modes.includes("bus");
      const isBoth = isMetro && isBus;

      let lineName: string | undefined;
      if (isMetro) {
        const parentLine = allLines.find(
          (l) =>
            l.mode === "metro" &&
            l.points.some(
              (p: { lat: number; lon: number }) =>
                Math.abs(p.lat - place.lat) < 0.0005 && Math.abs(p.lon - place.lon) < 0.0005,
            ),
        );
        lineName = parentLine?.name;
      }

      results.push({
        id: `transit_${place.id}`,
        name: place.name,
        subtitle: isBoth
          ? "Metro & Bus Interchange · Nagpur"
          : isMetro
            ? "Nagpur Metro Rail Station"
            : `Aapli Bus Stop (${place.routes} routes)`,
        lat: place.lat,
        lon: place.lon,
        kind: isMetro ? "metro" : "bus",
        categoryLabel: isBoth ? "Interchange" : isMetro ? "Metro Station" : "Bus Stop",
        lineName,
      });
      seenNames.add(nameLower);
    }
  }

  // Sort by prefix match priority
  return results
    .sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(query) ? 0 : 1;
      const bStarts = b.name.toLowerCase().startsWith(query) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.name.length - b.name.length;
    })
    .slice(0, limit);
}

/**
 * Asynchronously fetch live real-world Google Maps style places from Photon/OSM Geocoder
 * scoped specifically around Nagpur (lat: ~21.1458, lon: ~79.0882).
 */
export async function searchOnlinePlaces(
  q: string,
  signal?: AbortSignal | undefined,
): Promise<UnifiedPlaceResult[]> {
  const query = q.trim();
  if (query.length < 2) return [];

  const cacheKey = query.toLowerCase();
  if (onlineCache.has(cacheKey)) {
    return onlineCache.get(cacheKey)!;
  }

  // Scoped search around Nagpur
  const searchUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
    query.includes("nagpur") ? query : `${query} Nagpur`
  )}&lat=21.1458&lon=79.0882&limit=6`;

  try {
    const res = await fetch(searchUrl, signal ? { signal } : undefined);
    if (!res.ok) return [];

    const data = (await res.json()) as {
      features?: Array<{
        geometry: { coordinates: [number, number] }; // [lon, lat]
        properties: {
          name?: string;
          street?: string;
          locality?: string;
          district?: string;
          city?: string;
          state?: string;
          type?: string;
          osm_value?: string;
        };
      }>;
    };

    if (!data.features || !data.features.length) return [];

    const onlineResults: UnifiedPlaceResult[] = [];
    const seenNames = new Set<string>();

    for (const f of data.features) {
      const [lon, lat] = f.geometry.coordinates;
      // Filter results to broader Nagpur region
      if (lat < 20.7 || lat > 21.6 || lon < 78.5 || lon > 79.6) continue;

      const p = f.properties;
      const name = p.name || p.street || query;
      const nameLower = name.toLowerCase();

      // Dedup by name+coordinates: two distinct places with the same name (e.g. two
      // 'Sitabuldi' stops at different locations) should both appear in results.
      const dedupKey = nameLower + "|" + lat.toFixed(3) + "|" + lon.toFixed(3);
      if (seenNames.has(dedupKey)) continue;
      seenNames.add(dedupKey);

      // Build readable subtitle (e.g. "Dharampeth, Nagpur, Maharashtra")
      const parts = [p.street, p.locality, p.city || "Nagpur", p.state]
        .filter(Boolean)
        .filter((val, idx, arr) => arr.indexOf(val) === idx && val !== name);

      const subtitle = parts.length > 0 ? parts.join(", ") : "Nagpur, Maharashtra";

      let category = "Place";
      if (p.osm_value) {
        category = p.osm_value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      }

      onlineResults.push({
        id: `online_${lat.toFixed(5)}_${lon.toFixed(5)}`,
        name,
        subtitle,
        lat,
        lon,
        kind: "online",
        categoryLabel: category,
      });
    }

    // Cap cache to 50 entries to avoid unbounded memory growth in long sessions
    if (onlineCache.size >= 50) {
      const firstKey = onlineCache.keys().next().value;
      if (firstKey !== undefined) onlineCache.delete(firstKey);
    }
    onlineCache.set(cacheKey, onlineResults);
    return onlineResults;
  } catch (err) {
    if (signal?.aborted) return [];
    return [];
  }
}
