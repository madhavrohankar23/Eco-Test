import { useState, useEffect, useRef, useMemo } from "react";
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
  onToggleBusStops?: () => void;
  onToggleMetroStations?: () => void;
  showBusStops?: boolean;
  showMetroStations?: boolean;
  selectedPlace?: Point | null;
  onClearSelectedPlace?: () => void;
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

  if (place.categoryLabel === "Lake") {
    return (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600 dark:bg-cyan-950/50 dark:text-cyan-400 shadow-2xs">
        <Trees className="size-4" />
      </div>
    );
  }

  if (place.categoryLabel === "College") {
    return (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 shadow-2xs">
        <GraduationCap className="size-4" />
      </div>
    );
  }

  if (place.categoryLabel === "Hospital") {
    return (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 shadow-2xs">
        <Hospital className="size-4" />
      </div>
    );
  }

  return (
    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 shadow-2xs">
      <MapPin className="size-4 text-rose-500" />
    </div>
  );
}

export default function GoogleMapsSearchBar({
  onSelectPlace,
  onGetDirections,
  onExploreNearby,
  onOpenRailItem,
  onToggleBusStops,
  onToggleMetroStations,
  showBusStops = false,
  showMetroStations = false,
  selectedPlace,
  onClearSelectedPlace,
}: GoogleMapsSearchBarProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [onlineResults, setOnlineResults] = useState<UnifiedPlaceResult[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync input text if selectedPlace changes externally
  useEffect(() => {
    if (selectedPlace?.name) {
      setQuery(selectedPlace.name);
    }
  }, [selectedPlace]);

  // Fast local search results
  const localResults = useMemo(() => {
    if (!query.trim()) return [];
    return searchLocalPlaces(query, 6);
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
    }, 280);

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

    return combined.slice(0, 8);
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
    onClearSelectedPlace?.();
  };

  return (
    <div ref={containerRef} className="absolute left-4 top-4 z-[500] max-w-[420px] w-[calc(100vw-88px)] sm:w-[392px] pointer-events-auto">
      {/* ── 1. GOOGLE MAPS FLOATING PILL SEARCH BAR ── */}
      <div className="group relative flex items-center rounded-full border border-slate-200/90 bg-white/95 px-3.5 py-2 shadow-lg backdrop-blur-md transition-all hover:shadow-xl focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 dark:border-slate-800 dark:bg-card/95">
        <Search className="size-4 shrink-0 text-slate-400 group-focus-within:text-primary transition" />
        
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search Google Maps in Nagpur…"
          className="ml-2.5 flex-1 bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="mr-1.5 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Clear search"
          >
            <X className="size-3.5" />
          </button>
        )}

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

      {/* ── 2. AUTOCOMPLETE SUGGESTIONS DROPDOWN ── */}
      {isOpen && suggestions.length > 0 && (
        <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-2xl backdrop-blur-md dark:border-slate-800 dark:bg-card/95 animate-in fade-in-50 slide-in-from-top-2 duration-150">
          <div className="max-h-72 overflow-y-auto p-1.5">
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
        <button
          type="button"
          onClick={onToggleMetroStations}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer ${
            showMetroStations
              ? "border-metro bg-metro text-white shadow-md"
              : "border-slate-200 bg-white/90 text-slate-700 hover:bg-white dark:border-slate-800 dark:bg-card dark:text-slate-200"
          }`}
        >
          <TrainFront className="size-3.5" />
          <span>Metro Stations</span>
        </button>

        <button
          type="button"
          onClick={onToggleBusStops}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer ${
            showBusStops
              ? "border-bus bg-bus text-white shadow-md"
              : "border-slate-200 bg-white/90 text-slate-700 hover:bg-white dark:border-slate-800 dark:bg-card dark:text-slate-200"
          }`}
        >
          <Bus className="size-3.5" />
          <span>Bus Stops</span>
        </button>

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
