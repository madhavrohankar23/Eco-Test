/**
 * Robust multilingual journey intent extraction.
 * 
 * Handles natural conversational speech in Hindi, English, Marathi, and
 * code-mixed (Hinglish) sentences. No rigid patterns—extracts locations
 * from ANY natural phrasing.
 * 
 * Examples it handles:
 * - "mujhe sitabuldi se ujjawal nagar jana hai kam distance me"
 * - "I want to go from Pardi to Sitabuldi by bus"
 * - "sitabuldi to dharampeth metro se"
 * - "मला पर्डीहून सीताबर्डीला बसने जायचं आहे"
 * - "bus se medical square se lakadganj"
 * - "cheapest way from manish nagar to airport"
 * - "कम दूरी में सदर से इमामवाड़ा जाना है"
 */

import type { VoiceJourneyIntent } from "./voiceTypes";

/* ──────────────── Keyword dictionaries ──────────────── */

/** Words/phrases that signal the user's origin comes AFTER them */
const ORIGIN_PREFIX = [
  // Hindi / Hinglish
  "mujhe", "mujhko", "muje", "mujhey",
  "mai", "main", "me", "hum", "humko",
  "i want", "i wanna", "i need",
  // Marathi
  "mala", "मला", "माला",
  // Hindi unicode
  "मुझे", "मुझको", "हमको", "हमें",
];

/** Directional/separation keywords that mark FROM → TO boundary */
const FROM_MARKERS = [
  // English
  "from",
  // Hindi / Hinglish  
  "se", "sey", "say",
  // Hindi unicode
  "से",
  // Marathi
  "hun", "hoon", "हून", "ून", "पासून",
];

const TO_MARKERS = [
  // English
  "to", "towards", "till", "upto", "until",
  // Hindi / Hinglish
  "tak", "taq", "ko", "ja", "jana", "jaana", "jao", "jaa",
  "pahunchna", "pahunch", "pohochna",
  // Hindi unicode
  "तक", "को", "जाना", "जा", "पहुंचना",
  // Marathi
  "la", "paryant", "kadhe", "ला", "पर्यंत", "कडे",
  "jaycha", "jayche", "jaychay", "jaaychay",
  "जायचं", "जायचे", "जायचंय",
];

/** Words to strip as noise before/after location names */
const NOISE_WORDS = new Set([
  // Fillers
  "um", "uh", "hmm", "like", "please", "kindly", "bhai", "yaar", "bro",
  // Articles
  "the", "a", "an",
  // Verbs/Helpers that aren't locations
  "want", "wanna", "need", "go", "travel", "reach", "get",
  "chahiye", "chahie", "चाहिए", "hai", "he", "hain", "है", "हैं", "ho",
  "aahe", "ahe", "आहे",
  "jaana", "jana", "jao", "jaa", "जाना", "जा", "जाओ",
  "jaycha", "jayche", "jaychay", "जायचं", "जायचे",
  "karna", "karo", "करना", "करो",
  "pohochna", "pahunchna", "pahunch", "पहुंचना",
  // Possessives / pronouns
  "mujhe", "mujhko", "muje", "mai", "main", "me", "i", "mala", "hum",
  "मुझे", "मुझको", "मला", "माला", "हम", "हमें", "हमको",
  // Misc
  "in", "on", "at", "with", "via", "ka", "ki", "ke", "का", "की", "के",
  "cha", "chi", "che", "चा", "ची", "चे",
  "wala", "wali", "wale", "vaala",
  "route", "rasta", "raasta", "रास्ता",
  "kam", "कम", "minimum", "min",
  "distance", "doori", "दूरी", "dur",
  "time", "samay", "समय", "waqt", "jaldi",
  "fast", "quick", "quickly", "jaldi", "जल्दी",
  "sasta", "सस्ता", "cheap",
]);

/** Mode detection keywords */
const BUS_KEYWORDS = ["bus", "बस", "bas", "aapli bus", "aapli", "city bus"];
const METRO_KEYWORDS = ["metro", "मेट्रो", "train", "ट्रेन", "rail"];

/** Preference detection keywords */
const PREF_MAP: { keywords: string[]; pref: VoiceJourneyIntent["routePreference"] }[] = [
  { keywords: ["cheapest", "cheap", "sasta", "sasti", "kam paisa", "कम पैसा", "सस्ता", "सस्ती", "kam kharcha", "budget"], pref: "cheapest" },
  { keywords: ["fastest", "fast", "quick", "jaldi", "jald", "तेज़", "जल्दी", "fatafat", "speed", "tez"], pref: "fastest" },
  { keywords: ["kam distance", "kam doori", "कम दूरी", "short", "shortest", "kam rasta", "minimum distance", "near", "nearby", "nazdeek", "nazdik", "नज़दीक", "closest"], pref: "least_walk" },
  { keywords: ["direct", "seedha", "seedhi", "सीधा", "no transfer", "bina transfer", "no change", "ek bus", "एक बस"], pref: "fewest_transfers" },
  { keywords: ["eco", "green", "low co2", "pollution", "environment", "carbon", "paryavaran", "पर्यावरण"], pref: "low_co2" },
  { keywords: ["walk", "paidal", "पैदल", "walking", "least walk", "kam paidal", "kam walk"], pref: "least_walk" },
];

/* ──────────────── Core NLP extraction ──────────────── */

/**
 * Normalizes transcript for processing. Handles Devanagari + Latin mixed text.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[,!?.;:'"()[\]{}]/g, " ") // strip punctuation
    .replace(/\s+/g, " ")               // collapse whitespace
    .trim();
}

/**
 * Detects preferred transport mode from transcript.
 */
function detectMode(text: string): "bus" | "metro" | null {
  const t = normalize(text);
  if (METRO_KEYWORDS.some(k => t.includes(k))) return "metro";
  if (BUS_KEYWORDS.some(k => t.includes(k))) return "bus";
  return null;
}

/**
 * Detects route preference (cheapest, fastest, etc.) from transcript.
 */
function detectPreference(text: string): VoiceJourneyIntent["routePreference"] {
  const t = normalize(text);
  for (const { keywords, pref } of PREF_MAP) {
    if (keywords.some(k => t.includes(k))) return pref;
  }
  return null;
}

/**
 * Cleans a raw location string by stripping noise words from edges and
 * trimming filler. Keeps the core location name intact.
 */
function cleanLocation(raw: string): string {
  let cleaned = raw.trim();
  
  // Remove transport mode words that might be stuck to location
  cleaned = cleaned.replace(/\b(bus|metro|बस|मेट्रो|train|ट्रेन)\b/gi, " ").trim();
  
  // Remove preference words stuck to location
  cleaned = cleaned.replace(/\b(cheapest|cheap|fastest|fast|sasta|sasti|kam|कम|distance|doori|दूरी|jaldi|जल्दी|tez|quick|shortest|short)\b/gi, " ").trim();
  
  // Remove noise words only from the start and end (not the middle of location names!)
  const tokens = cleaned.split(/\s+/);
  
  // Strip from start
  while (tokens.length > 0 && NOISE_WORDS.has(tokens[0]!)) {
    tokens.shift();
  }
  // Strip from end
  while (tokens.length > 0 && NOISE_WORDS.has(tokens[tokens.length - 1]!)) {
    tokens.pop();
  }
  
  return tokens.join(" ").trim();
}

/**
 * Primary extraction strategy: look for FROM_MARKER ... TO_MARKER patterns.
 * This handles the most common structures:
 *   "X se Y", "from X to Y", "Xहून Yला"
 */
function extractWithMarkers(normalized: string): { origin: string; destination: string } | null {
  const words = normalized.split(/\s+/);
  
  // Strategy 1: Look for "from/se" marker and optional "to/tak" marker
  for (let i = 0; i < words.length; i++) {
    const w = words[i]!;
    
    if (FROM_MARKERS.includes(w)) {
      // Everything before FROM_MARKER is prefix (possibly noise)
      // Everything after FROM_MARKER until TO_MARKER is origin
      // Everything after TO_MARKER is destination
      
      const afterFrom = words.slice(i + 1);
      
      // Look for a TO marker in the remaining words
      let toIdx = -1;
      for (let j = 0; j < afterFrom.length; j++) {
        if (TO_MARKERS.includes(afterFrom[j]!)) {
          toIdx = j;
          break;
        }
        // Also check for a second FROM marker (which acts as TO in "se ... se" pattern is wrong, 
        // but "X se Y ko/tak" is valid)
      }
      
      if (toIdx > 0) {
        const origin = afterFrom.slice(0, toIdx).join(" ");
        const destination = afterFrom.slice(toIdx + 1).join(" ");
        if (origin && destination) {
          return { origin: cleanLocation(origin), destination: cleanLocation(destination) };
        }
      }
      
      // No TO marker found — check if there's another FROM marker acting as separator
      // e.g., "sitabuldi se ujjawal nagar" (implicit destination after origin ends)
      // In this case, treat everything after FROM as: first part = origin, 
      // look for recognizable split point
      
      // Fallback: split remaining words at the midpoint heuristic
      // Actually try to find where origin ends and destination begins
      // by looking for "jana/jaana/go/jaycha" as a boundary
      const VERB_BOUNDARY = ["jana", "jaana", "jao", "jaa", "jaycha", "jayche", 
        "go", "travel", "reach", "pohochna", "pahunchna", "जाना", "जा", "जाओ", "जायचं", "पहुंचना"];
      
      let verbIdx = -1;
      for (let j = 0; j < afterFrom.length; j++) {
        if (VERB_BOUNDARY.includes(afterFrom[j]!)) {
          verbIdx = j;
          break;
        }
      }
      
      if (verbIdx > 0) {
        // Origin is everything from "se" to the verb
        // But wait — in "mujhe sitabuldi se ujjawal nagar jana hai", 
        // "sitabuldi" is before "se", "ujjawal nagar" is between "se" and "jana"
        // So what's before "se" is actually origin, what's after is destination!
        const beforeFrom = words.slice(0, i).join(" ");
        const betweenFromAndVerb = afterFrom.slice(0, verbIdx).join(" ");
        
        if (cleanLocation(beforeFrom) && cleanLocation(betweenFromAndVerb)) {
          return { 
            origin: cleanLocation(beforeFrom), 
            destination: cleanLocation(betweenFromAndVerb) 
          };
        }
      }
    }
  }
  
  return null;
}

/**
 * Strategy 2: Look for "X se Y" where things before "se" is origin and after is destination.
 * This is the most common Hindi/Hinglish pattern.
 */
function extractHindiSePattern(normalized: string): { origin: string; destination: string } | null {
  const words = normalized.split(/\s+/);
  
  for (const marker of FROM_MARKERS) {
    const idx = words.indexOf(marker);
    if (idx <= 0) continue;
    
    // Everything before the marker (stripped of prefix noise) is the origin
    const beforeParts = words.slice(0, idx);
    const afterParts = words.slice(idx + 1);
    
    if (afterParts.length === 0) continue;
    
    const origin = cleanLocation(beforeParts.join(" "));
    const destination = cleanLocation(afterParts.join(" "));
    
    if (origin && destination) {
      return { origin, destination };
    }
  }
  
  return null;
}

/**
 * Strategy 3: "from X to Y" English pattern with flexible word matching.
 */
function extractEnglishPattern(normalized: string): { origin: string; destination: string } | null {
  // "from X to Y"
  const fromToMatch = normalized.match(/\bfrom\s+(.+?)\s+to\s+(.+)/);
  if (fromToMatch) {
    const origin = cleanLocation(fromToMatch[1]!);
    const destination = cleanLocation(fromToMatch[2]!);
    if (origin && destination) return { origin, destination };
  }
  
  // "X to Y" (without from)
  const toMatch = normalized.match(/^(.+?)\s+to\s+(.+)/);
  if (toMatch) {
    const origin = cleanLocation(toMatch[1]!);
    const destination = cleanLocation(toMatch[2]!);
    if (origin && destination) return { origin, destination };
  }
  
  return null;
}

/**
 * Strategy 4: Devanagari Marathi patterns 
 * "Xहून Yला", "X पासून Y पर्यंत/कडे/ला"
 */
function extractMarathiPattern(normalized: string): { origin: string; destination: string } | null {
  // Pattern: Xहून Yला 
  const hunLaMatch = normalized.match(/([\u0900-\u097F\w\s]+?)(?:हून|पासून)\s+([\u0900-\u097F\w\s]+?)(?:ला|कडे|पर्यंत)/);
  if (hunLaMatch) {
    const origin = cleanLocation(hunLaMatch[1]!);
    const destination = cleanLocation(hunLaMatch[2]!);
    if (origin && destination) return { origin, destination };
  }
  
  // Pattern: X से Y  (Hindi unicode)
  const seMatch = normalized.match(/([\u0900-\u097F\w\s]+?)\s*से\s+([\u0900-\u097F\w\s]+?)(?:\s+(?:जाना|जा|तक|को)|$)/);
  if (seMatch) {
    const origin = cleanLocation(seMatch[1]!);
    const destination = cleanLocation(seMatch[2]!);
    if (origin && destination) return { origin, destination };
  }
  
  return null;
}

/**
 * Strategy 5: Smart split — for when no explicit marker is found.
 * Look for two multi-word location-like chunks separated by noise.
 */
function extractSmartSplit(normalized: string): { origin: string; destination: string } | null {
  const words = normalized.split(/\s+/);
  
  // Remove all known noise from start and end
  const cleaned = words.filter(w => !NOISE_WORDS.has(w) && !BUS_KEYWORDS.includes(w) && !METRO_KEYWORDS.includes(w));
  
  if (cleaned.length < 2) return null;
  
  // If we have exactly 2 tokens, they might be origin and destination
  if (cleaned.length === 2) {
    return { origin: cleaned[0]!, destination: cleaned[1]! };
  }
  
  // Try to find a natural break point — look for any remaining "connector" word
  // that isn't a location name
  for (let i = 1; i < cleaned.length; i++) {
    const w = cleaned[i]!;
    if (["to", "se", "tak", "ko", "से", "तक", "को", "la", "ला"].includes(w)) {
      const origin = cleaned.slice(0, i).join(" ");
      const destination = cleaned.slice(i + 1).join(" ");
      if (origin && destination) return { origin, destination };
    }
  }
  
  return null;
}

/* ──────────────── Main export ──────────────── */

/**
 * Extracts structured intent from a voice transcript.
 * Tries multiple strategies in priority order for maximum robustness.
 */
export async function understandJourneyIntent(transcript: string): Promise<VoiceJourneyIntent | null> {
  try {
    if (!transcript || transcript.trim().length < 3) return null;
    
    const normalized = normalize(transcript);
    const mode = detectMode(transcript);
    const routePreference = detectPreference(transcript);
    
    console.log("[VoiceNLU] Input:", transcript);
    console.log("[VoiceNLU] Normalized:", normalized);
    
    // Try strategies in order of specificity
    let result: { origin: string; destination: string } | null = null;
    
    // 1. English "from X to Y"
    result = extractEnglishPattern(normalized);
    if (result?.origin && result?.destination) {
      console.log("[VoiceNLU] Matched via English pattern:", result);
      return { ...result, preferredMode: mode, routePreference };
    }
    
    // 2. Marker-based extraction (handles "se" with "to/tak/jana" etc.)
    result = extractWithMarkers(normalized);
    if (result?.origin && result?.destination) {
      console.log("[VoiceNLU] Matched via marker pattern:", result);
      return { ...result, preferredMode: mode, routePreference };
    }
    
    // 3. Hindi "X se Y" pattern
    result = extractHindiSePattern(normalized);
    if (result?.origin && result?.destination) {
      console.log("[VoiceNLU] Matched via Hindi se pattern:", result);
      return { ...result, preferredMode: mode, routePreference };
    }
    
    // 4. Devanagari Marathi pattern
    result = extractMarathiPattern(normalized);
    if (result?.origin && result?.destination) {
      console.log("[VoiceNLU] Matched via Marathi pattern:", result);
      return { ...result, preferredMode: mode, routePreference };
    }
    
    // 5. Smart split fallback
    result = extractSmartSplit(normalized);
    if (result?.origin && result?.destination) {
      console.log("[VoiceNLU] Matched via smart split:", result);
      return { ...result, preferredMode: mode, routePreference };
    }
    
    console.warn("[VoiceNLU] No pattern matched for:", normalized);
    return null;
  } catch (error) {
    console.error("[VoiceNLU] Journey understanding failed", error);
    return null;
  }
}
