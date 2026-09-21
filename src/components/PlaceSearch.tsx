import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Building2,
  Bus,
  Compass,
  Crosshair,
  GraduationCap,
  Hospital,
  Hotel,
  Loader2,
  LocateFixed,
  MapPin,
  Palmtree,
  ShoppingBag,
  Sparkles,
  TrainFront,
  Trees,
  X,
} from "lucide-react";
import {
  searchLocalPlaces,
  searchOnlinePlaces,
  parseCoordinateInput,
  type UnifiedPlaceResult,
} from "@/lib/placesSearch";

export interface Point {
  lat: number;
  lon: number;
  name: string;
}

function PlaceIcon({ place }: { place: UnifiedPlaceResult }) {
  if (place.kind === "coord") {
    return (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600 shadow-xs dark:text-emerald-400">
        <Crosshair className="size-4" />
      </div>
    );
  }

  if (place.kind === "metro") {
    const isBlue = (place.lineName ?? place.name).toLowerCase().includes("blue");
    return (
      <div
        className="flex size-7 shrink-0 items-center justify-center rounded-lg shadow-xs"
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
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-bus/15 text-bus shadow-xs">
        <Bus className="size-4" />
      </div>
    );
  }

  if (place.categoryLabel === "Mall") {
    return (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-pink-500/15 text-pink-600 shadow-xs dark:text-pink-400">
        <ShoppingBag className="size-4" />
      </div>
    );
  }

  if (place.categoryLabel === "Resort") {
    return (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-teal-500/15 text-teal-600 shadow-xs dark:text-teal-400">
        <Palmtree className="size-4" />
      </div>
    );
  }

  if (place.categoryLabel === "Lake") {
    return (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-600 shadow-xs dark:text-cyan-400">
        <Trees className="size-4" />
      </div>
    );
  }

  if (place.categoryLabel === "College") {
    return (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 text-purple-600 shadow-xs dark:text-purple-400">
        <GraduationCap className="size-4" />
      </div>
    );
  }

  if (place.categoryLabel === "Hospital") {
    return (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600 shadow-xs dark:text-rose-400">
        <Hospital className="size-4" />
      </div>
    );
  }

  if (place.categoryLabel === "Transit") {
    return (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 shadow-xs dark:text-blue-400">
        <Compass className="size-4" />
      </div>
    );
  }

  return (
    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground shadow-xs">
      <MapPin className="size-4 text-primary" />
    </div>
  );
}

export default function PlaceSearch({
  value,
  onChange,
  placeholder,
  dot,
  onFocus,
  isPickingMap = false,
  onLocate,
  locating = false,
}: {
  label?: string | undefined;
  value: Point | null;
  onChange: (p: Point | null) => void;
  placeholder: string;
  dot: string;
  onFocus?: (() => void) | undefined;
  isPickingMap?: boolean | undefined;
  onLocate?: (() => void) | undefined;
  locating?: boolean | undefined;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [onlineResults, setOnlineResults] = useState<UnifiedPlaceResult[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Synchronous instant local results (POIs + bus stops + metro stations + parsed coords)
  const localResults = useMemo<UnifiedPlaceResult[]>(() => searchLocalPlaces(q, 8), [q]);
  const parsedCoord = useMemo(() => parseCoordinateInput(q), [q]);

  // Debounced live online geocoding
  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 2 || parsedCoord) {
      setOnlineResults([]);
      setIsSearchingOnline(false);
      return;
    }

    setIsSearchingOnline(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const fetched = await searchOnlinePlaces(trimmed, controller.signal);
        setOnlineResults(fetched);
      } finally {
        setIsSearchingOnline(false);
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, parsedCoord]);

  // Merge and deduplicate local + online results
  const combinedResults = useMemo<UnifiedPlaceResult[]>(() => {
    const list: UnifiedPlaceResult[] = [...localResults];
    const seen = new Set(localResults.map((r) => r.name.toLowerCase()));

    for (const online of onlineResults) {
      const nameLower = online.name.toLowerCase();
      if (!seen.has(nameLower)) {
        seen.add(nameLower);
        list.push(online);
      }
    }
    return list.slice(0, 8);
  }, [localResults, onlineResults]);

  const activePlaceholder = isPickingMap
    ? "Type place or coordinates (e.g. 21.1458, 79.0882)…"
    : `${placeholder} (or enter lat, lon)`;

  const handleSelect = (item: UnifiedPlaceResult) => {
    onChange({ lat: item.lat, lon: item.lon, name: item.name });
    setQ("");
    setOpen(false);
  };

  const handleSelectCoordinate = (coords: { lat: number; lon: number; formatted: string }) => {
    onChange({
      lat: coords.lat,
      lon: coords.lon,
      name: `Location (${coords.formatted})`,
    });
    setQ("");
    setOpen(false);
  };

  const handleClear = () => {
    setQ("");
    onChange(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (parsedCoord) {
        e.preventDefault();
        handleSelectCoordinate(parsedCoord);
      } else if (combinedResults.length > 0 && combinedResults[0]) {
        e.preventDefault();
        handleSelect(combinedResults[0]);
      }
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        {/* Coloured dot on the left */}
        <span
          className="absolute left-3 top-1/2 size-2.5 -translate-y-1/2 rounded-full"
          style={{ background: dot }}
        />

        <Input
          ref={inputRef}
          className={`pl-8 pr-14 transition-all rounded-xl border-border bg-white text-xs font-medium dark:bg-card ${
            isPickingMap
              ? "ring-2 ring-primary/40 ring-offset-0 focus-visible:ring-primary/60"
              : parsedCoord
              ? "border-emerald-500 ring-2 ring-emerald-500/20"
              : "hover:border-primary/40"
          }`}
          placeholder={activePlaceholder}
          value={value ? value.name : q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            if (value) onChange(null);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setOpen(true);
            onFocus?.();
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 200)}
        />

        {/* Right action icons (Clear button, Coordinate badge, & Online search spinner) */}
        <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
          {parsedCoord && (
            <span
              title="Coordinates detected"
              className="flex items-center gap-0.5 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
            >
              <Crosshair className="size-2.5" />
              <span>GPS</span>
            </span>
          )}

          {isSearchingOnline && (
            <Loader2 className="size-3.5 animate-spin text-primary opacity-80" />
          )}

          {(value || q) && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              title="Clear input"
            >
              <X className="size-3.5" />
            </button>
          )}

          {isPickingMap && (
            <span className="pointer-events-none">
              <MapPin className="size-3.5 animate-pulse text-primary" />
            </span>
          )}
        </div>
      </div>

      {/* ── Google Maps Style Autocomplete Dropdown ── */}
      {open && !value && (
        <div className="absolute left-0 right-0 z-[1005] mt-1.5 max-h-72 overflow-y-auto rounded-2xl border border-border/80 bg-white/98 p-1.5 shadow-2xl backdrop-blur-md dark:bg-popover/98 animate-in fade-in zoom-in-95">
          {/* 1. Parsed Coordinate Direct Action Item */}
          {parsedCoord && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelectCoordinate(parsedCoord)}
              className="flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition bg-emerald-500/10 hover:bg-emerald-500/20 group active:scale-[0.99] border border-emerald-500/30 mb-1.5 shadow-xs"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                <Crosshair className="size-4 animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-800 dark:text-emerald-300">
                    Use Exact Coordinates: {parsedCoord.formatted}
                  </span>
                  <span className="text-[9px] font-extrabold text-white bg-emerald-600 px-1.5 py-0.5 rounded shadow-2xs">
                    Press Enter ↵
                  </span>
                </div>
                <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 font-medium mt-0.5">
                  Lat: {parsedCoord.lat}, Lon: {parsedCoord.lon} • Tap to set as point
                </p>
              </div>
            </button>
          )}

          {/* 2. "Your location" Recommendation */}
          {onLocate && !parsedCoord && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onLocate();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition hover:bg-primary/10 group active:scale-[0.99] border-b border-border/50 mb-1"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary group-hover:bg-primary group-hover:text-white transition shadow-xs">
                {locating ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <LocateFixed className="size-3.5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary group-hover:text-primary">
                    Your location
                  </span>
                  <span className="text-[9px] font-semibold text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">
                    GPS
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {locating ? "Acquiring GPS coordinates…" : "Use current device location"}
                </p>
              </div>
            </button>
          )}

          {/* Header */}
          <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/30 pb-1">
            <span className="flex items-center gap-1">
              <Sparkles className="size-3 text-primary" />
              {parsedCoord ? "Coordinate Match" : "Suggested Places or Coordinates"}
            </span>
            {isSearchingOnline && (
              <span className="flex items-center gap-1 text-[9px] lowercase font-normal">
                <Loader2 className="size-2.5 animate-spin text-primary" /> searching…
              </span>
            )}
          </div>

          {combinedResults.length === 0 && !isSearchingOnline && !parsedCoord && (
            <div className="px-4 py-4 text-center text-xs text-muted-foreground">
              <MapPin className="mx-auto size-4 text-muted-foreground/50 mb-1" />
              <p className="font-semibold text-foreground">No matching places or coordinates</p>
              <p className="text-[10px] mt-0.5">Enter place name or paste coordinates like "21.1458, 79.0882"</p>
            </div>
          )}

          <ul className="space-y-0.5 pt-1">
            {combinedResults.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-secondary/70 active:scale-[0.99]"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(r)}
                >
                  <PlaceIcon place={r} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-xs font-bold text-foreground">
                        {r.name}
                      </span>
                      {r.categoryLabel && (
                        <span className="shrink-0 rounded-md bg-secondary px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                          {r.categoryLabel}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground mt-0.5">
                      {r.subtitle}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
