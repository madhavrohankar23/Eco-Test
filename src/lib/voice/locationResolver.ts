import { searchLocalPlaces, searchOnlinePlaces, type UnifiedPlaceResult } from "@/lib/placesSearch";

export interface ResolvedLocations {
  origin: UnifiedPlaceResult | null;
  destination: UnifiedPlaceResult | null;
  ambiguous: boolean;
  message?: string;
}

/**
 * Common aliases/transliterations that the speech recognizer might produce
 * for Nagpur locations. Maps spoken variants → searchable canonical name.
 */
const LOCATION_ALIASES: Record<string, string> = {
  // Sitabuldi variants
  "sitabuldi": "sitabuldi",
  "sitaburdi": "sitabuldi",
  "seetabuldi": "sitabuldi",
  "sita buldi": "sitabuldi",
  "sitabardi": "sitabuldi",
  "सीताबर्डी": "sitabuldi",
  "सिताबर्डी": "sitabuldi",
  
  // Pardi variants  
  "pardi": "pardi",
  "parti": "pardi",
  "paardi": "pardi",
  "पर्डी": "pardi",
  "पारडी": "pardi",
  
  // Dharampeth variants
  "dharampeth": "dharampeth",
  "dharampet": "dharampeth",
  "dharam peth": "dharampeth",
  "धरमपेठ": "dharampeth",
  
  // Medical Square / Medical College area
  "medical": "medical square",
  "medical square": "medical square",
  "medical college": "medical college",
  "मेडिकल": "medical square",
  
  // Common areas
  "sadar": "sadar",
  "saddar": "sadar",
  "सदर": "sadar",
  
  "lakadganj": "lakadganj",
  "lakad ganj": "lakadganj",
  "लकडगंज": "lakadganj",
  
  "manish nagar": "manish nagar",
  "manishnagar": "manish nagar",
  "मनीष नगर": "manish nagar",
  
  "ganeshpeth": "ganeshpeth",
  "ganesh peth": "ganeshpeth",
  "गणेशपेठ": "ganeshpeth",
  
  "itwari": "itwari",
  "itwary": "itwari",
  "इतवारी": "itwari",
  
  "cotton market": "cotton market",
  "kapas market": "cotton market",
  "कपास मार्केट": "cotton market",
  
  "nagpur station": "nagpur railway station",
  "nagpur railway station": "nagpur railway station",
  "railway station": "nagpur railway station",
  "station": "nagpur railway station",
  "नागपुर स्टेशन": "nagpur railway station",
  
  "airport": "airport",
  "dr ambedkar airport": "airport",
  "एयरपोर्ट": "airport",
  "हवाईअड्डा": "airport",
  
  "ujjawal nagar": "ujjwal nagar",
  "ujjwal nagar": "ujjwal nagar",
  "ujwal nagar": "ujjwal nagar",
  "उज्वल नगर": "ujjwal nagar",
  "उज्ज्वल नगर": "ujjwal nagar",
  
  // Imambada / Imamwada
  "imamwada": "imamwada",
  "imam wada": "imamwada",
  "imambada": "imamwada",
  "इमामवाड़ा": "imamwada",
  
  // Ambazari
  "ambazari": "ambazari",
  "अंबाझरी": "ambazari",
  
  // Hingna
  "hingna": "hingna",
  "हिंगणा": "hingna",
  
  // Wardha Road
  "wardha road": "wardha road",
  "वर्धा रोड": "wardha road",
  
  // Butibori
  "butibori": "butibori",
  "बुटीबोरी": "butibori",
  
  // Zero Mile
  "zero mile": "zero mile",
  "ज़ीरो माइल": "zero mile",
};

/**
 * Resolve a spoken location name to a place using multiple fallbacks:
 *  1. Direct local search
 *  2. Alias normalization + local search
 *  3. Fuzzy matching with local places
 *  4. Online geocoding (Photon / OSM)
 */
async function resolveOneName(spokenName: string): Promise<UnifiedPlaceResult | null> {
  const name = spokenName.toLowerCase().trim();
  if (!name) return null;

  // 1. Direct local search
  const directResults = searchLocalPlaces(name, 5);
  if (directResults.length > 0) {
    return directResults[0]!;
  }

  // 2. Try aliases
  const aliased = LOCATION_ALIASES[name];
  if (aliased && aliased !== name) {
    const aliasResults = searchLocalPlaces(aliased, 5);
    if (aliasResults.length > 0) {
      return aliasResults[0]!;
    }
  }

  // 3. Try individual words (for multi-word inputs where only part matches)
  const words = name.split(/\s+/);
  if (words.length > 1) {
    // Try each word
    for (const word of words) {
      if (word.length < 3) continue;
      const wordResults = searchLocalPlaces(word, 3);
      if (wordResults.length > 0) {
        return wordResults[0]!;
      }
    }
    // Try pairs of consecutive words
    for (let i = 0; i < words.length - 1; i++) {
      const pair = `${words[i]} ${words[i + 1]}`;
      const pairResults = searchLocalPlaces(pair, 3);
      if (pairResults.length > 0) {
        return pairResults[0]!;
      }
    }
  }

  // 4. Try alias lookup on individual words
  for (const word of words) {
    const wordAlias = LOCATION_ALIASES[word];
    if (wordAlias) {
      const aliasResults = searchLocalPlaces(wordAlias, 3);
      if (aliasResults.length > 0) {
        return aliasResults[0]!;
      }
    }
  }

  // 5. Online geocoding fallback (for any location in Nagpur)
  try {
    const onlineResults = await searchOnlinePlaces(name);
    if (onlineResults.length > 0) {
      return onlineResults[0]!;
    }
  } catch (e) {
    console.warn("[LocationResolver] Online geocoding failed for:", name, e);
  }

  return null;
}

/**
 * Resolves both origin and destination names to actual geocoded places.
 * Uses local data first, falls back to online geocoding for any Nagpur location.
 */
export async function resolveLocations(originName: string, destName: string): Promise<ResolvedLocations> {
  console.log("[LocationResolver] Resolving:", { originName, destName });

  const [origin, destination] = await Promise.all([
    resolveOneName(originName),
    resolveOneName(destName),
  ]);

  console.log("[LocationResolver] Resolved:", { 
    origin: origin?.name || "NOT FOUND", 
    destination: destination?.name || "NOT FOUND" 
  });

  if (!origin && !destination) {
    return {
      origin: null,
      destination: null,
      ambiguous: true,
      message: `Could not find "${originName}" or "${destName}" in Nagpur. Please try saying the location names more clearly.`,
    };
  }

  if (!origin) {
    return {
      origin: null,
      destination,
      ambiguous: true,
      message: `Could not find "${originName}" in Nagpur. Please try saying the origin more clearly.`,
    };
  }

  if (!destination) {
    return {
      origin,
      destination: null,
      ambiguous: true,
      message: `Could not find "${destName}" in Nagpur. Please try saying the destination more clearly.`,
    };
  }

  return {
    origin,
    destination,
    ambiguous: false,
  };
}
