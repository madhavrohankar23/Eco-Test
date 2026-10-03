import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, MapPin, Navigation, Bus, TrainFront, Footprints, AlertCircle, ArrowRight, IndianRupee } from "lucide-react";
import { speechService } from "@/lib/voice/speechToText";
import { understandJourneyIntent } from "@/lib/voice/journeyUnderstanding";
import { resolveLocations } from "@/lib/voice/locationResolver";
import { planJourney, enrichWalkLegs, type Journey } from "@/lib/routing";

type State = "IDLE" | "LISTENING" | "PROCESSING" | "SUCCESS" | "ERROR" | "AMBIGUOUS";

export default function VoiceJourneyInput() {
  const [state, setState] = useState<State>("IDLE");
  const [transcript, setTranscript] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  const [originName, setOriginName] = useState("");
  const [destName, setDestName] = useState("");
  
  const [journey, setJourney] = useState<Journey | null>(null);
  
  const stateRef = useRef(state);
  const transcriptRef = useRef("");
  
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    return () => speechService.stop();
  }, []);

  const processTranscript = useCallback(async (text: string) => {
    setState("PROCESSING");
    
    try {
      const intent = await understandJourneyIntent(text);
      if (!intent) {
        setState("ERROR");
        setErrorMsg("Couldn't understand. Try saying naturally: \"Sitabuldi se Dharampeth jana hai\" or \"From Pardi to Medical Square\"");
        return;
      }

      setOriginName(intent.origin);
      setDestName(intent.destination);

      // Resolve locations (now async with online geocoding)
      const resolved = await resolveLocations(intent.origin, intent.destination);
      
      if (resolved.ambiguous || !resolved.origin || !resolved.destination) {
        setState("AMBIGUOUS");
        setErrorMsg(resolved.message || "Could not find exact locations.");
        return;
      }

      setOriginName(resolved.origin.name);
      setDestName(resolved.destination.name);

      // Plan journey
      const originPoint = { lat: resolved.origin.lat, lon: resolved.origin.lon, name: resolved.origin.name };
      const destPoint = { lat: resolved.destination.lat, lon: resolved.destination.lon, name: resolved.destination.name };
      
      const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
      
      // Map voice preference to routing preference
      let pref: string = "balanced";
      if (intent.routePreference) {
        pref = intent.routePreference;
      } else if (intent.preferredMode === "bus") {
        pref = "least_walk";
      } else if (intent.preferredMode === "metro") {
        pref = "fastest";
      }
      
      const raw = await planJourney(originPoint, destPoint, pref as any, nowMin);
      
      if (!raw.journeys || raw.journeys.length === 0) {
        setState("ERROR");
        setErrorMsg("No route available for this journey.");
        return;
      }
      
      const best = raw.journeys[0]!;
      const enriched = await enrichWalkLegs(best, originPoint, destPoint, pref as any);
      
      setJourney(enriched);
      setState("SUCCESS");
    } catch (e) {
      console.error("[VoiceJourney] Error:", e);
      setState("ERROR");
      setErrorMsg("Routing failed unexpectedly. Please try again.");
    }
  }, []);

  const startListening = useCallback(() => {
    setState("LISTENING");
    setTranscript("");
    setErrorMsg("");
    setJourney(null);
    setOriginName("");
    setDestName("");
    transcriptRef.current = "";

    // Auto-stop timer
    const autoStopTimer = setTimeout(() => {
      if (stateRef.current === "LISTENING") {
        speechService.stop();
      }
    }, 8000);

    speechService.start(
      (text, isFinal) => {
        transcriptRef.current = text;
        setTranscript(text);
        
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
        setState("ERROR");
        setErrorMsg(err);
      },
      () => {
        clearTimeout(autoStopTimer);
        const text = transcriptRef.current.trim();
        
        if (!text) {
          setState("ERROR");
          setErrorMsg("No speech detected. Please try again.");
          return;
        }
        
        processTranscript(text);
      }
    );
  }, [processTranscript]);

  const stopListening = () => {
    speechService.stop();
  };

  return (
    <div className="w-full max-w-md mx-auto bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold mb-6 text-foreground flex items-center justify-center gap-2">
          <Mic className="size-5 text-primary" />
          Voice Journey Planner
        </h2>

        <div className="flex justify-center mb-6">
          <button
            onClick={state === "LISTENING" ? stopListening : startListening}
            disabled={state === "PROCESSING"}
            className={`flex items-center justify-center size-20 rounded-full transition-all duration-300 ${
              state === "LISTENING"
                ? "bg-red-500/10 text-red-500 animate-pulse ring-4 ring-red-500/30"
                : state === "PROCESSING"
                  ? "bg-primary/20 text-primary cursor-wait"
                  : "bg-primary text-primary-foreground hover:scale-105 hover:shadow-lg"
            }`}
          >
            {state === "PROCESSING" ? (
              <Loader2 className="size-8 animate-spin" />
            ) : state === "LISTENING" ? (
              <MicOff className="size-8" />
            ) : (
              <Mic className="size-8" />
            )}
          </button>
        </div>

        <div className="min-h-[60px] flex items-center justify-center flex-col">
          {state === "LISTENING" && (
            <p className="text-muted-foreground animate-pulse font-medium">🎤 Listening... speak naturally</p>
          )}
          {state === "PROCESSING" && (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="size-5 animate-spin text-primary" />
              <p className="text-sm font-medium text-primary">Understanding your request...</p>
            </div>
          )}
          
          {(transcript && state !== "SUCCESS" && state !== "IDLE") && (
            <p className="mt-2 text-sm italic text-muted-foreground">"{transcript}"</p>
          )}

          {state === "AMBIGUOUS" && (
            <div className="text-amber-600 bg-amber-500/10 p-3 rounded-xl mt-2 text-sm flex items-start gap-2 text-left">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <p>{errorMsg}</p>
            </div>
          )}

          {state === "ERROR" && (
            <div className="text-red-600 bg-red-500/10 p-3 rounded-xl mt-2 text-sm flex items-start gap-2 text-left">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <p>{errorMsg}</p>
            </div>
          )}
        </div>
      </div>

      {/* Results Section */}
      {state === "SUCCESS" && journey && (
        <div className="bg-secondary/30 p-6 border-t border-border animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/50">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Origin</p>
              <div className="flex items-center gap-1.5 text-sm font-bold truncate">
                <span className="size-2 rounded-full bg-slate-800 dark:bg-white shrink-0" />
                <span className="truncate">{originName}</span>
              </div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground mx-4 shrink-0" />
            <div className="flex-1 min-w-0 text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Destination</p>
              <div className="flex items-center justify-end gap-1.5 text-sm font-bold truncate">
                <span className="truncate">{destName}</span>
                <span className="size-2.5 rounded-full bg-red-500 shrink-0" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-2xl font-black text-foreground">
                {Math.round(journey.totalTimeMin)} <span className="text-sm font-semibold text-muted-foreground">min</span>
              </p>
              <p className="text-xs text-muted-foreground font-medium">
                {(journey.totalDistanceM / 1000).toFixed(1)} km
              </p>
            </div>
            
            <div className="flex flex-col items-end gap-1.5">
              <span className="flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
                <IndianRupee className="size-3" />
                {journey.totalFareRs}
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                {journey.transfers === 0 ? "Direct" : `${journey.transfers} transfer${journey.transfers > 1 ? "s" : ""}`}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {journey.legs.map((leg, i) => (
              <div key={i} className="flex items-center gap-1.5">
                {i > 0 && <ArrowRight className="size-3 text-muted-foreground" />}
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold ${
                  leg.mode === "bus" 
                    ? "bg-[#0d9488]/15 text-[#0d9488]" 
                    : leg.mode === "metro" 
                      ? (leg.line?.toLowerCase().includes("blue") ? "bg-[#00aaff]/15 text-[#0088cc]" : "bg-[#ff6a00]/15 text-[#e05500]")
                      : "bg-slate-500/10 text-slate-500"
                }`}>
                  {leg.mode === "bus" && <Bus className="size-3" />}
                  {leg.mode === "metro" && <TrainFront className="size-3" />}
                  {leg.mode === "walk" && <Footprints className="size-3" />}
                  <span>
                    {leg.mode === "walk" 
                      ? `${Math.round(leg.timeMin)}m` 
                      : leg.mode === "bus" 
                        ? `BUS ${leg.busNumber}` 
                        : leg.line}
                  </span>
                </span>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-border/50 text-center">
            <p className="text-[10px] text-muted-foreground">Voice Journey successfully calculated via real Eco-Move datasets.</p>
          </div>
        </div>
      )}
    </div>
  );
}
