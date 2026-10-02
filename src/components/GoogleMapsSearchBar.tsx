import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Search,
  X,
  Navigation,
  TrainFront,
  Bus,
  Compass,
  MapPin,
  Trees,
  ShoppingBag,
  Hospital,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Bookmark,
  Radio,
  Car,
  Mic,
  MicOff,
  Loader2,
  Bot,
  Volume2,
  Check,
  Store,
  Utensils,
  Building2,
  Landmark,
  Building,
} from "lucide-react";
import {
  searchLocalPlaces,
  searchOnlinePlaces,
  type UnifiedPlaceResult,
} from "@/lib/placesSearch";
import type { Point } from "@/components/PlaceSearch";

interface GoogleMapsSearchBarProps {
  onSelectPlace: (point: Point, subtitle?: string) => void;
  onGetDirections: (destination: Point) => void;
  onExploreNearby?: (place: Point) => void;
  onOpenRailItem?: (item: "nearby" | "live" | "cabs" | "saved" | "recents") => void;
  onSelectPoiCategory?: (category: "Restaurant" | "Hospital") => void;
  activePoiCategory?: "Restaurant" | "Hospital" | null;
  onClearPoiCategory?: () => void;
  poiCount?: number;
  onToggleBusStops?: () => void;
  onToggleMetroStations?: () => void;
  showBusStops?: boolean;
  showMetroStations?: boolean;
  selectedPlace?: Point | null;
  onClearSelectedPlace?: () => void;
  onOpenTickets?: () => void;
  onAiCommand?: (query: string) => Promise<{ success: boolean; message: string; intent?: string } | void>;
}

function PlaceIcon({ place }: { place: UnifiedPlaceResult }) {
  if (place.kind === "metro") {
    const isBlue = (place.lineName ?? place.name).toLowerCase().includes("blue");
    return (
      <div
        className="flex size-7 shrink-0 items-center justify-center rounded-lg shadow-2xs"
        style={{
          backgroundColor: isBlue ? "#00aaff20" : "#ff6a0020",
          color: isBlue ? "#0088cc" : "#e05500",
        }}
      >
        <TrainFront className="size-4" />
      </div>
    );
  }

  if (place.kind === "bus") {
    return (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400 shadow-2xs">
        <Bus className="size-4" />
      </div>
    );
  }

  if (place.categoryLabel === "Mall") {
    return (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-pink-50 text-pink-600 dark:bg-pink-950/50 dark:text-pink-400 shadow-2xs">
        <ShoppingBag className="size-4" />
      </div>
    );
  }

  if (place.categoryLabel === "Shop" || place.categoryLabel === "Store") {
    return (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 shadow-2xs">
        <Store className="size-4" />
      </div>
    );
  }

  if (place.categoryLabel === "Restaurant" || place.categoryLabel === "Cafe") {
    return (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400 shadow-2xs">
        <Utensils className="size-4" />
      </div>
    );
  }

  if (place.categoryLabel === "Office" || place.categoryLabel === "IT Park") {
    return (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 shadow-2xs">
        <Building2 className="size-4" />
      </div>
    );
  }

  if (place.categoryLabel === "Bank") {
    return (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 shadow-2xs">
        <Landmark className="size-4" />
      </div>
    );
  }

  if (place.categoryLabel === "Lake" || place.categoryLabel === "Park") {
    return (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600 dark:bg-cyan-950/50 dark:text-cyan-400 shadow-2xs">
        <Trees className="size-4" />
      </div>
    );
  }

  if (place.categoryLabel === "College" || place.categoryLabel === "School") {
    return (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 shadow-2xs">
        <GraduationCap className="size-4" />
      </div>
    );
  }

  if (place.categoryLabel === "Hospital" || place.categoryLabel === "Clinic") {
    return (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 shadow-2xs">
        <Hospital className="size-4" />
      </div>
    );
  }

  if (place.categoryLabel === "Locality") {
    return (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 shadow-2xs">
        <Building className="size-4" />
      </div>
    );
  }

  return (
    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 shadow-2xs">
      <MapPin className="size-4 text-rose-500" />
    </div>
  );
}

// Helper for browser Text-to-Speech (AI Voice Assistant speaking back)
function speakWithBrowserVoice(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel(); // cancel any active speech
    const clean = text
      .replace(/[*#_`]/g, "")
      .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
      .replace(/\n+/g, " ")
      .trim();
    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = "en-IN";
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((v) => v.lang.includes("en-IN") || v.lang.includes("en_IN")) ||
      voices.find((v) => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha"))) ||
      voices.find((v) => v.lang.startsWith("en"));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("Speech synthesis notice:", err);
  }
}

export default function GoogleMapsSearchBar({
  onSelectPlace,
  onGetDirections,
  onExploreNearby,
  onOpenRailItem,
  onSelectPoiCategory,
  activePoiCategory,
  onClearPoiCategory,
  poiCount = 0,
  onToggleBusStops,
  onToggleMetroStations,
  showBusStops = false,
  showMetroStations = false,
  selectedPlace,
  onClearSelectedPlace,
  onOpenTickets,
  onAiCommand,
}: GoogleMapsSearchBarProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [onlineResults, setOnlineResults] = useState<UnifiedPlaceResult[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiResponse, setAiResponse] = useState<{ message: string; intent?: string | undefined } | null>(null);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const isListeningActiveRef = useRef<boolean>(false);
  const transcriptBufferRef = useRef<string>("");
  const silenceTimerRef = useRef<any>(null);
  const maxSessionTimerRef = useRef<any>(null);

  // Sync input text if selectedPlace changes externally
  useEffect(() => {
    if (selectedPlace?.name) {
      setQuery(selectedPlace.name);
    }
  }, [selectedPlace]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isListeningActiveRef.current = false;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (maxSessionTimerRef.current) clearTimeout(maxSessionTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  // Fast local search results
  const localResults = useMemo(() => {
    if (!query.trim()) return [];
    return searchLocalPlaces(query, 20);
  }, [query]);

  // Online geocoding search debounce
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setOnlineResults([]);
      return;
    }

    let isSubscribed = true;
    const timeout = setTimeout(async () => {
      try {
        const results = await searchOnlinePlaces(query);
        if (isSubscribed) {
          setOnlineResults(results);
        }
      } catch {
        // ignore
      }
    }, 180);

    return () => {
      isSubscribed = false;
      clearTimeout(timeout);
    };
  }, [query]);

  // Combined deduplicated suggestions
  const suggestions = useMemo(() => {
    const seen = new Set<string>();
    const combined: UnifiedPlaceResult[] = [];

    for (const r of localResults) {
      const key = `${r.name.toLowerCase()}_${r.lat.toFixed(4)}_${r.lon.toFixed(4)}`;
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(r);
      }
    }

    for (const r of onlineResults) {
      const key = `${r.name.toLowerCase()}_${r.lat.toFixed(4)}_${r.lon.toFixed(4)}`;
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(r);
      }
    }

    return combined.slice(0, 20);
  }, [localResults, onlineResults]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChoosePlace = (place: UnifiedPlaceResult) => {
    const point: Point = {
      lat: place.lat,
      lon: place.lon,
      name: place.name,
    };
    setQuery(place.name);
    setIsOpen(false);
    onSelectPlace(point, place.subtitle);
  };

  const handleTriggerAi = useCallback(
    async (textToProcess?: string) => {
      const text = (textToProcess ?? query).trim();
      if (!text || !onAiCommand) return;
      setIsAiProcessing(true);
      setIsOpen(false);
      try {
        const result = await onAiCommand(text);
        if (result && result.message) {
          setAiResponse({ message: result.message, intent: result.intent });
          if (!isVoiceMuted) {
            speakWithBrowserVoice(result.message);
          }
        }
      } catch (err: any) {
        setAiResponse({ message: err?.message || "Failed to process command with AI.", intent: "ERROR" });
      } finally {
        setIsAiProcessing(false);
      }
    },
    [query, onAiCommand, isVoiceMuted]
  );

  const stopVoiceRecognition = useCallback(
    (submit = true) => {
      isListeningActiveRef.current = false;
      setIsListening(false);

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (maxSessionTimerRef.current) clearTimeout(maxSessionTimerRef.current);

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }

      if (submit) {
        const captured = transcriptBufferRef.current.trim() || query.trim();
        if (captured) {
          handleTriggerAi(captured);
        }
      }
    },
    [handleTriggerAi, query]
  );

  // Web Speech API Voice Recognition with persistent listening, auto-reconnect, and live interim words
  const startVoiceRecognition = async () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setAiResponse({
        message:
          "🎙️ Voice speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge, or type your query in the search bar.",
        intent: "ERROR",
      });
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      transcriptBufferRef.current = "";
      isListeningActiveRef.current = true;
      setIsListening(true);
      setIsOpen(false);
      setAiResponse(null);

      const recognition = new SpeechRecognition();
      // Use continuous mode if supported, fallback cleanly
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = navigator.language || "en-IN"; // Dynamic browser language preference with Indian English fallback

      // Safety timeout: 25 seconds max session if user opens mic and stays idle
      if (maxSessionTimerRef.current) clearTimeout(maxSessionTimerRef.current);
      maxSessionTimerRef.current = setTimeout(() => {
        if (isListeningActiveRef.current) {
          stopVoiceRecognition(true);
        }
      }, 25000);

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let fullTranscript = "";
        for (let i = 0; i < event.results.length; ++i) {
          const trans = event.results[i][0]?.transcript;
          if (trans) {
            fullTranscript += (fullTranscript ? " " : "") + trans.trim();
          }
        }

        const trimmed = fullTranscript.trim();
        if (trimmed) {
          setQuery(trimmed);
          transcriptBufferRef.current = trimmed;

          // Auto-submit after 2.0 seconds of silence once words are spoken
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            if (isListeningActiveRef.current) {
              stopVoiceRecognition(true);
            }
          }, 2000);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition notice:", event.error);
        if (event.error === "no-speech") {
          // Normal pause in speech — keep listening
          return;
        }

        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          isListeningActiveRef.current = false;
          setIsListening(false);
          setAiResponse({
            message:
              "🎙️ Microphone access is blocked. Please click the 🔒 icon in your browser URL bar to allow microphone permission.",
            intent: "ERROR",
          });
        } else if (event.error === "network") {
          isListeningActiveRef.current = false;
          setIsListening(false);
          setAiResponse({
            message:
              "🎙️ Speech recognition service was unable to reach the speech server. If using Brave Browser, enable Google Speech in settings (or use Chrome/Edge). You can also type or click any sample command below.",
            intent: "ERROR",
          });
        } else if (event.error === "audio-capture") {
          isListeningActiveRef.current = false;
          setIsListening(false);
          setAiResponse({
            message:
              "🎙️ No microphone was detected. Please check your microphone connection in Windows sound settings.",
            intent: "ERROR",
          });
        }
      };

      recognition.onend = () => {
        // If still actively listening and no hard error occurred, restart session seamlessly
        if (isListeningActiveRef.current) {
          try {
            recognition.start();
          } catch (e) {
            console.warn("Speech recognition restart notice:", e);
          }
        } else {
          setIsListening(false);
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          if (maxSessionTimerRef.current) clearTimeout(maxSessionTimerRef.current);

          const captured = transcriptBufferRef.current.trim();
          if (captured) {
            handleTriggerAi(captured);
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error("Speech recognition start failed:", err);
      isListeningActiveRef.current = false;
      setIsListening(false);
      setAiResponse({
        message: `🎙️ Microphone error: ${err?.message || "Please check mic permissions."}`,
        intent: "ERROR",
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const qLower = query.toLowerCase().trim();
      const isNaturalLanguage =
        qLower.includes("go to") ||
        qLower.includes("take me") ||
        qLower.includes("how to") ||
        qLower.includes("reach") ||
        qLower.includes("track") ||
        qLower.includes("nearest") ||
        qLower.includes("nearby") ||
        qLower.includes("bus") ||
        qLower.includes("timetable") ||
        qLower.includes("schedule") ||
        qLower.includes("fastest") ||
        qLower.includes("cheapest") ||
        qLower.includes("from ") ||
        query.trim().split(" ").length >= 4;

      if (isNaturalLanguage && onAiCommand) {
        handleTriggerAi(query);
      } else if (suggestions.length > 0 && suggestions[0]) {
        handleChoosePlace(suggestions[0]);
      } else if (query.trim()) {
        handleTriggerAi(query);
      }
    }
  };

  const handleDirectionsClick = () => {
    if (selectedPlace) {
      onGetDirections(selectedPlace);
      return;
    }

    if (suggestions.length > 0) {
      const top = suggestions[0];
      if (top) {
        handleChoosePlace(top);
        onGetDirections({ lat: top.lat, lon: top.lon, name: top.name });
        return;
      }
    }

    // Default fallback to open directions panel
    onGetDirections({
      lat: 21.1458,
      lon: 79.0882,
      name: query.trim() || "Destination",
    });
  };

  const handleClear = () => {
    setQuery("");
    setAiResponse(null);
    onClearSelectedPlace?.();
  };

  return (
    <div ref={containerRef} className="absolute left-4 top-4 z-[500] max-w-[440px] w-[calc(100vw-88px)] sm:w-[410px] pointer-events-auto">
      {/* ── 1. GOOGLE MAPS FLOATING PILL SEARCH BAR ── */}
      <div className="group relative flex items-center rounded-full border border-slate-200/90 bg-white/95 px-3 py-1.5 shadow-lg backdrop-blur-md transition-all hover:shadow-xl focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 dark:border-slate-800 dark:bg-card/95">
        <Search className="size-4 shrink-0 text-slate-400 group-focus-within:text-primary transition ml-1" />
        
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search place or speak/type AI command…"
          className="ml-2.5 flex-1 bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 min-w-0"
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="mr-1 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Clear search"
          >
            <X className="size-3.5" />
          </button>
        )}

        {/* ── Voice Recognition (Microphone) Button ── */}
        <button
          type="button"
          onClick={() => (isListening ? stopVoiceRecognition(false) : startVoiceRecognition())}
          className={`mr-1 rounded-full p-1.5 transition cursor-pointer ${
            isListening
              ? "bg-rose-500 text-white animate-pulse shadow-md ring-2 ring-rose-400/50"
              : "text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          }`}
          title={isListening ? "Listening... Click to cancel" : "Speak to AI (Voice Search)"}
          aria-label="Voice Search"
        >
          <Mic className="size-4" />
        </button>

        {/* ── AI Sparkles Command Trigger Button ── */}
        <button
          type="button"
          onClick={() => handleTriggerAi(query)}
          disabled={isAiProcessing || !query.trim()}
          className="mr-1.5 rounded-full p-1.5 text-purple-600 transition hover:bg-purple-50 hover:text-purple-700 disabled:opacity-30 dark:text-purple-400 dark:hover:bg-purple-950/50 cursor-pointer"
          title="Ask AI Transit Agent"
          aria-label="Ask AI"
        >
          {isAiProcessing ? (
            <Loader2 className="size-4 animate-spin text-purple-600 dark:text-purple-400" />
          ) : (
            <Sparkles className="size-4" />
          )}
        </button>

        <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />

        {/* ── Google Maps Blue/Teal Directions Diamond Arrow Button ── */}
        <button
          type="button"
          onClick={handleDirectionsClick}
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition hover:bg-primary/90 hover:scale-105 active:scale-95 cursor-pointer"
          title="Directions / Route Planner"
          aria-label="Directions"
        >
          <Navigation className="size-4 rotate-45" />
        </button>
      </div>

      {/* ── Visual Listening Indicator Banner with Live Equalizer ── */}
      {isListening && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-2xl border border-rose-300 bg-rose-50/95 p-2.5 shadow-xl backdrop-blur-md dark:border-rose-900/50 dark:bg-rose-950/90 dark:text-rose-200 animate-in fade-in-50 slide-in-from-top-1">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Animated sound wave bars */}
            <div className="flex items-end gap-0.5 h-4 px-1 shrink-0">
              <span className="w-1 rounded-full bg-rose-500 animate-[pulse_0.8s_ease-in-out_infinite] h-2" />
              <span className="w-1 rounded-full bg-rose-500 animate-[pulse_0.6s_ease-in-out_infinite_0.1s] h-4" />
              <span className="w-1 rounded-full bg-rose-500 animate-[pulse_0.9s_ease-in-out_infinite_0.2s] h-3" />
              <span className="w-1 rounded-full bg-rose-500 animate-[pulse_0.7s_ease-in-out_infinite_0.3s] h-4" />
              <span className="w-1 rounded-full bg-rose-500 animate-[pulse_0.8s_ease-in-out_infinite_0.15s] h-2" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Listening
                </p>
                <span className="rounded bg-rose-200/70 px-1 py-0.2 text-[9px] font-semibold text-rose-800 dark:bg-rose-900 dark:text-rose-300">
                  🇮🇳 en-IN
                </span>
              </div>
              <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100 mt-0.5">
                {query.trim() ? `"${query}"` : 'Speak your command, e.g. "Go to Itwari fastest way"'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => stopVoiceRecognition(true)}
              className="flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95 cursor-pointer"
              title="Submit Speech Command"
            >
              <Check className="size-3.5" />
              <span>Done</span>
            </button>
            <button
              type="button"
              onClick={() => stopVoiceRecognition(false)}
              className="rounded-xl bg-rose-100 p-1.5 text-rose-700 transition hover:bg-rose-200 dark:bg-rose-900/60 dark:text-rose-300 cursor-pointer"
              title="Cancel"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── AI Processing Banner ── */}
      {isAiProcessing && (
        <div className="mt-2 flex items-center gap-2.5 rounded-2xl border border-purple-200/90 bg-purple-50/95 px-3.5 py-2.5 text-xs font-semibold text-purple-800 shadow-xl backdrop-blur-md dark:border-purple-900/50 dark:bg-purple-950/90 dark:text-purple-200 animate-in fade-in-50 slide-in-from-top-1">
          <Sparkles className="size-4 animate-spin text-purple-600 dark:text-purple-400 shrink-0" />
          <span className="truncate">AI Transit Agent is interpreting your command…</span>
        </div>
      )}

      {/* ── AI Response / Feedback Card ── */}
      {aiResponse && !isAiProcessing && (
        <div className="mt-2 rounded-2xl border border-purple-200/90 bg-white/95 p-3.5 shadow-xl backdrop-blur-md dark:border-purple-900/50 dark:bg-card/95 animate-in fade-in-50 slide-in-from-top-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-400">
              <Bot className="size-4 shrink-0" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider">AI Assistant Response</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => speakWithBrowserVoice(aiResponse.message)}
                className="rounded-md p-1 text-purple-600 transition hover:bg-purple-100 dark:text-purple-400 dark:hover:bg-purple-900/50 cursor-pointer"
                title="Speak Out Loud"
                aria-label="Speak Out Loud"
              >
                <Volume2 className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setAiResponse(null)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
          <p className="mt-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
            {aiResponse.message}
          </p>
        </div>
      )}

      {/* ── Quick Voice / AI Sample Prompt Suggestions (Shown when search is focused & empty) ── */}
      {isOpen && !query.trim() && (
        <div className="mt-2 overflow-hidden rounded-2xl border border-purple-200/80 bg-white/95 p-3 shadow-xl backdrop-blur-md dark:border-purple-900/40 dark:bg-card/95 animate-in fade-in-50 slide-in-from-top-1">
          <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-400 text-[11px] font-bold">
            <Sparkles className="size-3.5" />
            <span>Try speaking or asking the AI Transit Assistant:</span>
          </div>
          <div className="mt-2 flex flex-col gap-1.5">
            {[
              "Go to Chhatrapati Square from my location in fastest way at 10 am",
              "Take me from Sitabuldi to Hingna by cheapest way possible at 11 am",
              "Find nearest transport options near me within 1 km",
              "Track bus 135",
              "Show timetable for bus 35",
            ].map((promptText) => (
              <button
                key={promptText}
                type="button"
                onClick={() => {
                  setQuery(promptText);
                  handleTriggerAi(promptText);
                }}
                className="flex items-center gap-2 rounded-xl bg-purple-50/80 px-2.5 py-1.5 text-left text-xs font-medium text-purple-900 transition hover:bg-purple-100 hover:scale-[1.01] active:scale-[0.99] dark:bg-purple-950/40 dark:text-purple-200 dark:hover:bg-purple-900/50 cursor-pointer"
              >
                <Mic className="size-3.5 shrink-0 text-purple-600 dark:text-purple-400" />
                <span className="truncate">&quot;{promptText}&quot;</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 2. AUTOCOMPLETE SUGGESTIONS DROPDOWN ── */}
      {isOpen && suggestions.length > 0 && (
        <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-2xl backdrop-blur-md dark:border-slate-800 dark:bg-card/95 animate-in fade-in-50 slide-in-from-top-2 duration-150">
          <div className="max-h-80 sm:max-h-96 overflow-y-auto p-1.5">
            {suggestions.map((place) => (
              <div
                key={place.id}
                onClick={() => handleChoosePlace(place)}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-xl p-2.5 transition hover:bg-slate-100 dark:hover:bg-slate-800/70"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <PlaceIcon place={place} />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                      {place.name}
                    </p>
                    <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {place.subtitle}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChoosePlace(place);
                    onGetDirections({ lat: place.lat, lon: place.lon, name: place.name });
                  }}
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition hover:bg-primary hover:text-white"
                  title="Route here"
                >
                  <Navigation className="size-3.5 rotate-45" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 3. QUICK GOOGLE MAPS CATEGORY CHIPS ── */}
      <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">

        {/* ── Nearby CHIP ── */}
        <button
          type="button"
          onClick={() => {
            if (selectedPlace && onExploreNearby) {
              onExploreNearby(selectedPlace);
            } else {
              onOpenRailItem?.("nearby");
            }
          }}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-white hover:text-purple-600 active:scale-95 dark:border-slate-800 dark:bg-card dark:text-slate-200 cursor-pointer"
        >
          <Compass className="size-3.5 text-purple-600" />
          <span>Nearby</span>
        </button>

        {/* ── RESTAURANTS CHIP ── */}
        <button
          type="button"
          onClick={() => onSelectPoiCategory?.("Restaurant")}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer ${
            activePoiCategory === "Restaurant"
              ? "border-orange-500 bg-orange-500 text-white shadow-orange-500/25 ring-2 ring-orange-400"
              : "border-slate-200 bg-white/90 text-slate-700 hover:bg-white hover:text-orange-600 dark:border-slate-800 dark:bg-card dark:text-slate-200"
          }`}
        >
          <Utensils className={`size-3.5 ${activePoiCategory === "Restaurant" ? "text-white" : "text-orange-500"}`} />
          <span>Restaurants</span>
        </button>

        {/* ── HOSPITALS CHIP ── */}
        <button
          type="button"
          onClick={() => onSelectPoiCategory?.("Hospital")}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer ${
            activePoiCategory === "Hospital"
              ? "border-rose-500 bg-rose-500 text-white shadow-rose-500/25 ring-2 ring-rose-400"
              : "border-slate-200 bg-white/90 text-slate-700 hover:bg-white hover:text-rose-600 dark:border-slate-800 dark:bg-card dark:text-slate-200"
          }`}
        >
          <Hospital className={`size-3.5 ${activePoiCategory === "Hospital" ? "text-white" : "text-rose-500"}`} />
          <span>Hospitals</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenRailItem?.("live")}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-white hover:text-indigo-600 active:scale-95 dark:border-slate-800 dark:bg-card dark:text-slate-200 cursor-pointer"
        >
          <Radio className="size-3.5 text-indigo-500" />
          <span>Know your Bus</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenRailItem?.("cabs")}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-white hover:text-black active:scale-95 dark:border-slate-800 dark:bg-card dark:text-slate-200 cursor-pointer"
        >
          <Car className="size-3.5 text-black dark:text-white" />
          <span>Cabs</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenRailItem?.("saved")}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-white hover:text-primary active:scale-95 dark:border-slate-800 dark:bg-card dark:text-slate-200 cursor-pointer"
        >
          <Bookmark className="size-3.5 text-amber-500" />
          <span>Saved Places</span>
        </button>
      </div>

      {/* ── Active POI Banner / Filter Indicator ── */}
      {activePoiCategory && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-2xl border border-slate-200/90 bg-white/95 px-3.5 py-2 text-xs shadow-md backdrop-blur-md dark:border-slate-800 dark:bg-card/95 animate-in fade-in-50 duration-200">
          <div className="flex items-center gap-2">
            <span className={`flex size-6 shrink-0 items-center justify-center rounded-lg ${activePoiCategory === "Restaurant" ? "bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400" : "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"}`}>
              {activePoiCategory === "Restaurant" ? <Utensils className="size-3.5" /> : <Hospital className="size-3.5" />}
            </span>
            <div className="min-w-0">
              <p className="truncate font-bold text-slate-900 dark:text-slate-100">
                {activePoiCategory === "Restaurant" ? "Nearest Restaurants in Nagpur" : "Nearest Hospitals in Nagpur"}
              </p>
              <p className="truncate text-[10px] text-slate-500">
                {poiCount > 0 ? `${poiCount} locations displayed on map · Tap any pin to route` : "Searching nearest locations..."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClearPoiCategory}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
          >
            <X className="size-3" />
            <span>Clear</span>
          </button>
        </div>
      )}

      {/* ── 4. FLOATING PLACE PREVIEW CARD (When a place is selected on Map) ── */}
      {selectedPlace && (
        <div className="mt-3 rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-card/95 animate-in fade-in-50 duration-200">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  📍 Pinned Location
                </span>
              </div>
              <h3 className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                {selectedPlace.name}
              </h3>
              <p className="text-[11px] font-mono text-slate-500">
                {selectedPlace.lat.toFixed(5)}, {selectedPlace.lon.toFixed(5)}
              </p>
            </div>

            <button
              type="button"
              onClick={onClearSelectedPlace}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-2.5">
            <button
              type="button"
              onClick={() => onGetDirections(selectedPlace)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-95 cursor-pointer"
            >
              <Navigation className="size-3.5 rotate-45" />
              <span>Directions</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onExploreNearby) {
                  onExploreNearby(selectedPlace);
                } else {
                  onOpenRailItem?.("nearby");
                }
              }}
              className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-700 shadow-sm transition hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300 cursor-pointer"
            >
              <Compass className="size-3.5 text-purple-600 dark:text-purple-400" />
              <span>Nearby</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
