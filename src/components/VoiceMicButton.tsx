import { Mic, MicOff, Loader2 } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { speechService } from "@/lib/voice/speechToText";
import { understandJourneyIntent } from "@/lib/voice/journeyUnderstanding";
import { resolveLocations } from "@/lib/voice/locationResolver";
import type { Point } from "./PlaceSearch";
import type { Preference } from "@/lib/routing";

export function VoiceMicButton({ 
  onSuccess, 
  onError, 
  onMessage 
}: { 
  onSuccess: (origin: Point, dest: Point, pref?: Preference) => void;
  onError: (msg: string) => void;
  onMessage: (msg: string | null) => void;
}) {
  const [state, setState] = useState<"IDLE" | "LISTENING" | "PROCESSING">("IDLE");
  const transcriptRef = useRef("");
  const stateRef = useRef(state);
  
  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    return () => speechService.stop();
  }, []);

  const processTranscript = useCallback(async (text: string) => {
    console.log("[VoiceMic] Processing transcript:", text);
    setState("PROCESSING");
    onMessage("Understanding your request...");
    
    try {
      // Step 1: Understand intent
      const intent = await understandJourneyIntent(text);
      if (!intent) {
        setState("IDLE");
        onError("Couldn't understand. Try: \"Sitabuldi se Dharampeth jana hai\" or \"From Pardi to Medical Square\"");
        onMessage(null);
        return;
      }

      console.log("[VoiceMic] Intent:", intent);
      onMessage(`Finding "${intent.origin}" → "${intent.destination}"...`);
      
      // Step 2: Resolve locations (now async with online geocoding fallback)
      const resolved = await resolveLocations(intent.origin, intent.destination);
      
      if (resolved.ambiguous || !resolved.origin || !resolved.destination) {
        setState("IDLE");
        onError(resolved.message || "Could not find those locations in Nagpur.");
        onMessage(null);
        return;
      }

      console.log("[VoiceMic] Resolved:", resolved.origin.name, "→", resolved.destination.name);

      const originPoint: Point = { 
        lat: resolved.origin.lat, 
        lon: resolved.origin.lon, 
        name: resolved.origin.name 
      };
      const destPoint: Point = { 
        lat: resolved.destination.lat, 
        lon: resolved.destination.lon, 
        name: resolved.destination.name 
      };
      
      // Map voice preference to app preference
      let preference: Preference | undefined;
      if (intent.routePreference) {
        preference = intent.routePreference;
      } else if (intent.preferredMode === "bus") {
        preference = "least_walk";
      } else if (intent.preferredMode === "metro") {
        preference = "fastest";
      }
      
      setState("IDLE");
      onMessage(null);
      onSuccess(originPoint, destPoint, preference);
    } catch (err) {
      console.error("[VoiceMic] Processing error:", err);
      setState("IDLE");
      onError("Something went wrong processing your voice input.");
      onMessage(null);
    }
  }, [onSuccess, onError, onMessage]);

  const handleToggle = useCallback(() => {
    if (state === "LISTENING") {
      speechService.stop();
      // When we stop, onEnd fires which triggers processing
      return;
    }
    
    if (state === "PROCESSING") return; // Don't interrupt processing
    
    setState("LISTENING");
    onMessage("🎤 Listening... speak naturally");
    transcriptRef.current = "";
    
    // Auto-stop after 8 seconds if user doesn't manually stop
    const autoStopTimer = setTimeout(() => {
      if (stateRef.current === "LISTENING") {
        console.log("[VoiceMic] Auto-stopping after timeout");
        speechService.stop();
      }
    }, 8000);
    
    speechService.start(
      (text, isFinal) => {
        transcriptRef.current = text;
        onMessage(`🎤 "${text}"`);
        
        // If we got a final result, auto-stop after a brief pause
        if (isFinal) {
          clearTimeout(autoStopTimer);
          setTimeout(() => {
            if (stateRef.current === "LISTENING") {
              speechService.stop();
            }
          }, 1200);
        }
      },
      (err) => {
        clearTimeout(autoStopTimer);
        setState("IDLE");
        onError(`Voice Error: ${err}`);
        onMessage(null);
      },
      () => {
        clearTimeout(autoStopTimer);
        const text = transcriptRef.current.trim();
        console.log("[VoiceMic] Speech ended with transcript:", text);
        
        if (!text) {
          setState("IDLE");
          onError("No speech detected. Please try speaking again.");
          onMessage(null);
          return;
        }
        
        // Process the transcript
        processTranscript(text);
      }
    );
  }, [state, onMessage, onError, processTranscript]);

  if (state === "PROCESSING") {
    return (
      <button disabled className="rounded-xl border border-border bg-primary/10 p-2 text-primary shadow-sm transition flex items-center justify-center">
        <Loader2 className="size-4 animate-spin" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      title="Voice Journey Planning — speak in Hindi, English, or Marathi"
      className={`rounded-xl border border-border p-2 shadow-sm transition active:scale-95 ${
        state === "LISTENING" 
          ? "bg-red-500/10 text-red-500 ring-2 ring-red-500/30 animate-pulse" 
          : "bg-white text-muted-foreground hover:bg-secondary hover:text-foreground dark:bg-card"
      }`}
    >
      {state === "LISTENING" ? <MicOff className="size-4" /> : <Mic className="size-4" />}
    </button>
  );
}
