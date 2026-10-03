export interface VoiceJourneyIntent {
  origin: string;
  destination: string;
  preferredMode: "bus" | "metro" | null;
  /** Maps to the app's Preference type (balanced, fastest, cheapest, least_walk, etc.) */
  routePreference: "balanced" | "fastest" | "cheapest" | "least_walk" | "fewest_transfers" | "low_co2" | null;
}

export interface VoiceError {
  type: "MICROPHONE_DENIED" | "NO_SPEECH" | "ASR_FAILURE" | "LLM_FAILURE" | "NOT_FOUND" | "AMBIGUOUS";
  message: string;
}
