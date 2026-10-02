import { searchablePlaces, allLines } from "@/lib/routing";
import { NAGPUR_POIS, type NagpurPOI } from "@/lib/nagpurPlaces";

export interface UnifiedPlaceResult {
  id: string;
  name: string;
  subtitle: string;
  lat: number;
  lon: number;
  kind: "metro" | "bus" | "poi" | "online" | "coord";
  categoryLabel?: string | undefined;
  lineName?: string | undefined;
}

// In-memory cache for live online geocoded search queries
const onlineCache = new Map<string, UnifiedPlaceResult[]>();

/**
 * Parses coordinate strings like:
 * - "21.1458, 79.0882"
 * - "21.1458,79.0882"
 * - "21.1458 79.0882"
 * - "lat: 21.100795, lon: 78.990315"
 * - "21.1458° N, 79.0882° E"
 */
export function parseCoordinateInput(input: string): { lat: number; lon: number; formatted: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const coordRegex = /^\s*(?:lat(?:itude)?[:\s]*)?([+-]?\d+(?:\.\d+)?)\s*(?:°?\s*[NSns])?[,\s]+(?:lon(?:gitude)?[:\s]*)?([+-]?\d+(?:\.\d+)?)\s*(?:°?\s*[EWew])?\s*$/i;
  const match = trimmed.match(coordRegex);
  if (!match) return null;

  const lat = parseFloat(match[1] || "");
  const lon = parseFloat(match[2] || "");
  if (isNaN(lat) || isNaN(lon)) return null;

  if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
    return {
      lat,
      lon,
      formatted: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
    };
  }

  return null;
}

/**
 * Normalizes common phonetic typos and vernacular abbreviations for Nagpur places and transit stops.
 */
export function normalizeNagpurPlaceName(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\bsqaure\b|\bsquar\b|\bsq\b|\bsqr\b/gi, "square")
    .replace(/\bchhatrapti\b|\bchhatrpati\b|\bchatrapati\b|\bchatrapti\b|\bchhatrapati chowk\b/gi, "chhatrapati")
    .replace(/\bsitaburdi\b|\bsitabardi\b|\bsitaburdee\b/gi, "sitabuldi")
    .replace(/\bdharmpeth\b|\bdharampet\b/gi, "dharampeth")
    .replace(/\bprajapti\b/gi, "prajapati")
    .replace(/\bwardha rd\b/gi, "wardha road")
    .replace(/\bkhamla sq\b|\bkhamla sqaure\b/gi, "khamla square")
    .replace(/\bmanish ngr\b/gi, "manish nagar")
    .replace(/\bshankar ngr\b/gi, "shankar nagar")
    .replace(/\bmedical sq\b|\bmedical sqaure\b/gi, "medical square")
    .replace(/\blaw clg\b|\blaw college sq\b/gi, "law college square")
    .replace(/\bdr\.?\s*babasaheb\s*ambedkar\s*(?:international)?\s*airport\b|\bnagpur\s*airport\b/gi, "airport")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fast synchronous search across transit stops and curated Nagpur POIs.
 */
export function searchLocalPlaces(q: string, limit = 20): UnifiedPlaceResult[] {
  const query = q.toLowerCase().trim();
  if (!query) return [];
  const normalizedQuery = normalizeNagpurPlaceName(query);

  const results: UnifiedPlaceResult[] = [];
  const seenNames = new Set<string>();

  // Check if query is exact coordinates
  const parsedCoord = parseCoordinateInput(q);
  if (parsedCoord) {
    results.push({
      id: `coord_${parsedCoord.lat}_${parsedCoord.lon}`,
      name: `Coordinates (${parsedCoord.formatted})`,
      subtitle: `Exact GPS Location [Latitude: ${parsedCoord.lat}, Longitude: ${parsedCoord.lon}]`,
      lat: parsedCoord.lat,
      lon: parsedCoord.lon,
      kind: "coord",
      categoryLabel: "GPS Coords",
    });
  }

  // 1. Search curated Nagpur POIs (resorts, malls, lakes, colleges, hospitals, markets, etc.)
  for (const poi of NAGPUR_POIS) {
    const poiLower = poi.name.toLowerCase();
    const poiNormalized = normalizeNagpurPlaceName(poiLower);
    const nameMatch = poiLower.includes(query) || poiLower.includes(normalizedQuery) || poiNormalized.includes(normalizedQuery);
    const kwMatch = poi.keywords.some((k) => k.toLowerCase().includes(query) || normalizeNagpurPlaceName(k.toLowerCase()).includes(normalizedQuery));
    const subMatch = poi.subtitle.toLowerCase().includes(query) || normalizeNagpurPlaceName(poi.subtitle.toLowerCase()).includes(normalizedQuery);

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
      seenNames.add(poiLower);
    }
  }

  // 2. Search transit stops & metro stations
  for (const place of searchablePlaces) {
    const nameLower = place.name.toLowerCase();
    if (seenNames.has(nameLower)) continue;

    const nameNormalized = normalizeNagpurPlaceName(nameLower);
    if (nameLower.includes(query) || nameLower.includes(normalizedQuery) || nameNormalized.includes(normalizedQuery)) {
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

  // Sort by prefix match priority (coords always first)
  return results
    .sort((a, b) => {
      if (a.kind === "coord") return -1;
      if (b.kind === "coord") return 1;
      const aStarts = a.name.toLowerCase().startsWith(query) ? 0 : 1;
      const bStarts = b.name.toLowerCase().startsWith(query) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.name.length - b.name.length;
    })
    .slice(0, limit);
}

/**
 * Helper to map Google Place types to user-friendly UI category labels.
 */
function getCategoryFromGoogleTypes(types: string[] = []): string {
  const t = types.map((x) => x.toLowerCase());
  if (t.some((x) => ["restaurant", "cafe", "food", "bakery", "bar", "meal_takeaway", "meal_delivery", "fast_food_restaurant", "family_restaurant", "indian_restaurant"].includes(x))) {
    return "Restaurant";
  }
  if (t.some((x) => ["hospital", "doctor", "health", "pharmacy", "clinic", "dentist", "medical_lab"].includes(x))) {
    return "Hospital";
  }
  if (t.some((x) => ["school", "university", "college", "secondary_school", "primary_school", "library"].includes(x))) {
    return "College";
  }
  if (t.some((x) => ["shopping_mall", "department_store"].includes(x))) {
    return "Mall";
  }
  if (t.some((x) => ["store", "supermarket", "clothing_store", "grocery_or_supermarket", "convenience_store", "electronics_store", "home_goods_store", "shoe_store", "jewelry_store", "hardware_store", "book_store", "candy_store", "confectionery", "food_store"].includes(x))) {
    return "Shop";
  }
  if (t.some((x) => ["bank", "atm", "finance", "accounting"].includes(x))) {
    return "Bank";
  }
  if (t.some((x) => ["park", "tourist_attraction", "campground", "natural_feature", "amusement_park", "zoo", "garden"].includes(x))) {
    return "Park";
  }
  if (t.some((x) => ["hindu_temple", "church", "mosque", "synagogue", "place_of_worship", "shrine"].includes(x))) {
    return "Temple";
  }
  if (t.some((x) => ["lodging", "hotel", "resort", "motel", "guest_house", "bed_and_breakfast"].includes(x))) {
    return "Hotel";
  }
  if (t.some((x) => ["sublocality", "sublocality_level_1", "sublocality_level_2", "neighborhood", "administrative_area_level_2", "locality", "political", "intersection"].includes(x))) {
    return "Locality";
  }
  if (t.some((x) => ["transit_station", "subway_station", "bus_station", "train_station", "light_rail_station"].includes(x))) {
    return "Transit";
  }
  return "Place";
}

/**
 * Fetch from Google Places API (New) with strict Nagpur boundary restriction (35km circle).
 */
async function fetchGooglePlaces(query: string, signal?: AbortSignal): Promise<UnifiedPlaceResult[]> {
  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) return [];

  const autoUrl = "https://places.googleapis.com/v1/places:autocomplete";
  try {
    const res = await fetch(autoUrl, {
      ...(signal ? { signal } : {}),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey.trim(),
      },
      body: JSON.stringify({
        input: query,
        includedRegionCodes: ["IN"],
        locationRestriction: {
          circle: {
            center: { latitude: 21.1458, longitude: 79.0882 },
            radius: 35000.0, // Strictly bounded within 35 km around Nagpur
          },
        },
      }),
    });

    if (!res.ok) return [];
    const data = (await res.json()) as {
      suggestions?: Array<{
        placePrediction?: {
          place?: string;
          placeId?: string;
          text?: { text?: string };
          structuredFormat?: {
            mainText?: { text?: string };
            secondaryText?: { text?: string };
          };
          types?: string[];
        };
      }>;
    };

    if (!data.suggestions || !data.suggestions.length) return [];

    // Filter predictions within Nagpur region
    const nagpurPredictions = data.suggestions
      .filter((s) => s.placePrediction?.placeId)
      .map((s) => s.placePrediction!)
      .filter((p) => {
        const fullText = (p.text?.text || "").toLowerCase();
        const secondary = (p.structuredFormat?.secondaryText?.text || "").toLowerCase();
        return fullText.includes("nagpur") || secondary.includes("nagpur") || secondary.includes("maharashtra") || !secondary;
      })
      .slice(0, 12);

    if (!nagpurPredictions.length) return [];

    // Resolve coordinates & details for predictions in parallel
    const detailPromises: Promise<UnifiedPlaceResult | null>[] = nagpurPredictions.map(
      async (p): Promise<UnifiedPlaceResult | null> => {
        try {
          const placeId = p.placeId;
          const fullAddress = p.text?.text || "";

          // Method 1: Google Places Details API (New)
          if (placeId && !placeId.startsWith("E")) {
            const detRes = await fetch(
              `https://places.googleapis.com/v1/places/${placeId}?fields=id,displayName,formattedAddress,location,types`,
              {
                ...(signal ? { signal } : {}),
                headers: {
                  "X-Goog-Api-Key": apiKey.trim(),
                  "X-Goog-FieldMask": "id,displayName,formattedAddress,location,types",
                },
              }
            );
            if (detRes.ok) {
              const detData = (await detRes.json()) as {
                id?: string;
                displayName?: { text?: string };
                formattedAddress?: string;
                location?: { latitude?: number; longitude?: number };
                types?: string[];
              };

              const lat = detData.location?.latitude;
              const lon = detData.location?.longitude;
              if (typeof lat === "number" && typeof lon === "number") {
                // Ensure coordinates fall strictly inside Greater Nagpur metropolitan bounds
                if (lat >= 20.65 && lat <= 21.65 && lon >= 78.40 && lon <= 79.70) {
                  const name =
                    p.structuredFormat?.mainText?.text ||
                    detData.displayName?.text ||
                    fullAddress.split(",")[0]?.trim() ||
                    query;
                  const subtitle =
                    p.structuredFormat?.secondaryText?.text ||
                    detData.formattedAddress ||
                    "Nagpur, Maharashtra";
                  const category = getCategoryFromGoogleTypes(detData.types || p.types || []);

                  return {
                    id: `google_${placeId}`,
                    name,
                    subtitle,
                    lat,
                    lon,
                    kind: "online",
                    categoryLabel: category,
                  };
                }
              }
            }
          }

          // Method 2: Google Geocoding fallback by place_id or formatted address
          const geoUrl =
            placeId && !placeId.startsWith("E")
              ? `https://maps.googleapis.com/maps/api/geocode/json?place_id=${placeId}&key=${apiKey.trim()}`
              : `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
                  fullAddress
                )}&bounds=20.70,78.60|21.45,79.45&components=country:IN&key=${apiKey.trim()}`;

          const geoRes = await fetch(geoUrl, signal ? { signal } : undefined);
          if (geoRes.ok) {
            const geoData = (await geoRes.json()) as {
              results?: Array<{
                formatted_address: string;
                geometry: { location: { lat: number; lng: number } };
                types?: string[];
              }>;
            };
            if (geoData.results && geoData.results.length > 0) {
              const first = geoData.results[0];
              if (first) {
                const lat = first.geometry.location.lat;
                const lon = first.geometry.location.lng;
                if (lat >= 20.65 && lat <= 21.65 && lon >= 78.40 && lon <= 79.70) {
                  const name =
                    p.structuredFormat?.mainText?.text ||
                    fullAddress.split(",")[0]?.trim() ||
                    query;
                  const subtitle =
                    p.structuredFormat?.secondaryText?.text ||
                    first.formatted_address ||
                    "Nagpur, Maharashtra";
                  const category = getCategoryFromGoogleTypes(first.types || p.types || []);

                  return {
                    id: `google_${placeId || fullAddress}`,
                    name,
                    subtitle,
                    lat,
                    lon,
                    kind: "online",
                    categoryLabel: category,
                  };
                }
              }
            }
          }

          return null;
        } catch {
          return null;
        }
      }
    );

    const resolved = await Promise.all(detailPromises);
    const validResults: UnifiedPlaceResult[] = [];
    for (const item of resolved) {
      if (item !== null) {
        validResults.push(item);
      }
    }
    return validResults;
  } catch {
    return [];
  }
}

/**
 * Helper to map OpenStreetMap tags/classes to user-friendly category labels.
 */
function getCategoryFromOsm(type?: string, osmClass?: string): string {
  const t = (type || "").toLowerCase();
  const c = (osmClass || "").toLowerCase();

  if (c === "shop" || ["supermarket", "convenience", "clothes", "bakery", "mall", "department_store", "chemist", "jewelry", "general"].includes(t)) {
    return "Shop";
  }
  if (["restaurant", "fast_food", "cafe", "food_court", "bar", "pub", "ice_cream", "dhaba"].includes(t)) {
    return "Restaurant";
  }
  if (["hospital", "clinic", "doctors", "pharmacy", "health_post", "dentist"].includes(t)) {
    return "Hospital";
  }
  if (["college", "university", "school", "kindergarten", "library", "institute"].includes(t)) {
    return "College";
  }
  if (c === "office" || ["commercial", "company", "it", "coworking", "government"].includes(t)) {
    return "Office";
  }
  if (["bank", "atm", "bureau_de_change"].includes(t)) {
    return "Bank";
  }
  if (["hotel", "guest_house", "hostel", "motel", "resort", "lodging"].includes(t)) {
    return "Hotel";
  }
  if (["park", "garden", "playground", "nature_reserve", "pitch", "lake"].includes(t)) {
    return "Park";
  }
  if (["place_of_worship", "temple", "mosque", "church", "shrine", "gurudwara"].includes(t)) {
    return "Temple";
  }
  if (["suburb", "neighbourhood", "residential", "quarter", "city_district", "locality", "village"].includes(t)) {
    return "Locality";
  }
  return "Place";
}

/**
 * Fetch from OpenStreetMap Nominatim API (covers streets, buildings, shops, offices, clinics in Nagpur).
 */
async function fetchNominatimPlaces(query: string, signal?: AbortSignal): Promise<UnifiedPlaceResult[]> {
  const queryStr = query.toLowerCase().includes("nagpur") ? query : `${query}, Nagpur`;
  const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    queryStr
  )}&viewbox=78.60,21.45,79.45,20.75&bounded=0&addressdetails=1&countrycodes=in&limit=12`;

  try {
    const res = await fetch(searchUrl, {
      ...(signal ? { signal } : {}),
      headers: {
        Accept: "application/json",
      },
    });
    if (!res.ok) return [];

    const data = (await res.json()) as Array<{
      place_id: number;
      lat: string;
      lon: string;
      display_name: string;
      name?: string;
      type?: string;
      class?: string;
      address?: {
        road?: string;
        suburb?: string;
        neighbourhood?: string;
        residential?: string;
        city?: string;
        state?: string;
        shop?: string;
        amenity?: string;
        office?: string;
        building?: string;
        commercial?: string;
      };
    }>;

    if (!Array.isArray(data)) return [];

    const results: UnifiedPlaceResult[] = [];
    for (const item of data) {
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);
      if (isNaN(lat) || isNaN(lon)) continue;
      // Scoped to Nagpur Metropolitan Area
      if (lat < 20.65 || lat > 21.65 || lon < 78.4 || lon > 79.7) continue;

      const addr = item.address || {};
      const placeName =
        item.name ||
        addr.shop ||
        addr.amenity ||
        addr.office ||
        addr.building ||
        addr.commercial ||
        item.display_name.split(",")[0]?.trim() ||
        query;

      const subParts = [addr.road, addr.suburb || addr.neighbourhood || addr.residential, addr.city || "Nagpur"]
        .filter(Boolean)
        .filter((val, idx, arr) => arr.indexOf(val) === idx && val !== placeName);

      const subtitle = subParts.length > 0 ? subParts.join(", ") : "Nagpur, Maharashtra";
      const category = getCategoryFromOsm(item.type, item.class);

      results.push({
        id: `nominatim_${item.place_id}`,
        name: placeName,
        subtitle,
        lat,
        lon,
        kind: "online",
        categoryLabel: category,
      });
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * Fetch from Photon Geocoder (fuzzy search for all Nagpur places, streets & shops).
 */
async function fetchPhotonPlaces(query: string, signal?: AbortSignal): Promise<UnifiedPlaceResult[]> {
  const queryStr = query.toLowerCase().includes("nagpur") ? query : `${query} Nagpur`;
  const searchUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
    queryStr
  )}&lat=21.1458&lon=79.0882&limit=12`;

  try {
    const res = await fetch(searchUrl, signal ? { signal } : undefined);
    if (!res.ok) return [];

    const data = (await res.json()) as {
      features?: Array<{
        geometry: { coordinates: [number, number] };
        properties: {
          name?: string;
          street?: string;
          locality?: string;
          district?: string;
          city?: string;
          state?: string;
          type?: string;
          osm_value?: string;
          osm_key?: string;
        };
      }>;
    };

    if (!data.features || !data.features.length) return [];

    const results: UnifiedPlaceResult[] = [];
    for (const f of data.features) {
      const [lon, lat] = f.geometry.coordinates;
      if (lat < 20.65 || lat > 21.65 || lon < 78.4 || lon > 79.7) continue;

      const p = f.properties;
      const name = p.name || p.street || query;
      const parts = [p.street, p.locality, p.city || "Nagpur", p.state]
        .filter(Boolean)
        .filter((val, idx, arr) => arr.indexOf(val) === idx && val !== name);

      const subtitle = parts.length > 0 ? parts.join(", ") : "Nagpur, Maharashtra";
      const category = getCategoryFromOsm(p.osm_value, p.osm_key);

      results.push({
        id: `photon_${lat.toFixed(5)}_${lon.toFixed(5)}`,
        name,
        subtitle,
        lat,
        lon,
        kind: "online",
        categoryLabel: category,
      });
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * Asynchronously fetch live real-world Google Maps style places.
 * Primary: Official Google Places API (New) restricted to Nagpur (35km circle).
 * Fallback: Dual Nominatim + Photon Geocoders.
 */
export async function searchOnlinePlaces(
  q: string,
  signal?: AbortSignal | undefined,
): Promise<UnifiedPlaceResult[]> {
  const query = q.trim();
  if (query.length < 2) return [];

  // If query is valid coordinate, no need for geocoder query
  if (parseCoordinateInput(query)) return [];

  const cacheKey = query.toLowerCase();
  if (onlineCache.has(cacheKey)) {
    return onlineCache.get(cacheKey)!;
  }

  try {
    // 1. Primary: Try Google Places API (New) with strict Nagpur boundary
    const googleResults = await fetchGooglePlaces(query, signal);

    let combined: UnifiedPlaceResult[] = [];

    if (googleResults.length > 0) {
      combined = googleResults;
    } else {
      // 2. Fallback: Run OpenStreetMap Nominatim & Photon in parallel
      const [nominatimResults, photonResults] = await Promise.all([
        fetchNominatimPlaces(query, signal),
        fetchPhotonPlaces(query, signal),
      ]);
      combined = [...nominatimResults, ...photonResults];
    }

    const seen = new Set<string>();
    const deduplicated: UnifiedPlaceResult[] = [];

    for (const place of combined) {
      const key = `${place.name.toLowerCase()}_${place.lat.toFixed(3)}_${place.lon.toFixed(3)}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(place);
      }
    }

    if (onlineCache.size >= 120) {
      const firstKey = onlineCache.keys().next().value;
      if (firstKey !== undefined) onlineCache.delete(firstKey);
    }
    onlineCache.set(cacheKey, deduplicated);
    return deduplicated;
  } catch (err) {
    if (signal?.aborted) return [];
    return [];
  }
}
