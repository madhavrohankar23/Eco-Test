import React, { useState, useRef, useEffect } from "react";
import { Layers, TrainFront, Bus, Check, Globe, Map as MapIcon } from "lucide-react";

export type MapStyleType = "carto" | "roadmap";

interface GoogleMapsLayersFABProps {
  showMetroStations: boolean;
  onToggleMetroStations: () => void;
  showBusStops: boolean;
  onToggleBusStops: () => void;
  mapStyle?: MapStyleType;
  onSelectMapStyle?: (style: MapStyleType) => void;
}

export default function GoogleMapsLayersFAB({
  showMetroStations,
  onToggleMetroStations,
  showBusStops,
  onToggleBusStops,
  mapStyle = "carto",
  onSelectMapStyle,
}: GoogleMapsLayersFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsHovered(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 250);
  };

  const isExpanded = isOpen || isHovered;
  const isGoogleMap = mapStyle === "roadmap";
  const isCartoMap = !isGoogleMap;
  const activeCount = (showMetroStations ? 1 : 0) + (showBusStops ? 1 : 0);

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="fixed bottom-5 right-24 z-[1190] flex items-center flex-row-reverse select-none"
    >
      {/* ── 1. MAIN TRIGGER BUTTON (Google Maps Style Layers FAB) ── */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`group relative flex size-12 shrink-0 items-center justify-center rounded-2xl border backdrop-blur-xl shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer z-10 ${
          isExpanded
            ? "border-primary bg-primary text-primary-foreground shadow-primary/30 ring-2 ring-primary/40"
            : activeCount > 0
            ? "border-primary/60 bg-white/95 text-primary dark:border-primary/50 dark:bg-slate-900/95 shadow-md"
            : "border-slate-200/90 bg-white/95 text-slate-700 hover:bg-white dark:border-slate-800/90 dark:bg-slate-900/95 dark:text-slate-200"
        }`}
        title="Map Layers (Google Maps, Carto, Metro, Bus)"
        aria-label="Toggle Map Layers"
      >
        <Layers
          className={`size-5 transition-transform duration-300 ${
            isExpanded ? "rotate-90 scale-110" : "group-hover:rotate-12"
          }`}
        />

        {/* Active layers count badge */}
        {activeCount > 0 && !isExpanded && (
          <span className="absolute -top-1.5 -right-1.5 flex size-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-black text-white shadow-xs animate-in zoom-in-50">
            {activeCount}
          </span>
        )}
      </button>

      {/* ── 2. HORIZONTAL EXPANDABLE LAYERS DOCK (Google Maps Style) ── */}
      <div
        className={`mr-2.5 flex items-center transition-all duration-300 ease-out origin-right ${
          isExpanded
            ? "max-w-[420px] opacity-100 translate-x-0 pointer-events-auto"
            : "max-w-0 opacity-0 translate-x-4 pointer-events-none overflow-hidden"
        }`}
      >
        <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-2xl backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-900/95">
          {/* Carto Map Basemap Button */}
          <button
            type="button"
            onClick={() => onSelectMapStyle?.("carto")}
            className={`group/carto relative flex w-[72px] flex-col items-center rounded-xl p-1.5 transition-all duration-200 cursor-pointer ${
              isCartoMap
                ? "bg-blue-500/10 ring-2 ring-blue-500 shadow-xs dark:bg-blue-950/30"
                : "hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
            }`}
            title="Switch to Carto Voyager Map"
          >
            {isCartoMap && (
              <div className="absolute top-1 right-1 flex size-3.5 items-center justify-center rounded-full bg-blue-500 text-white shadow-xs">
                <Check className="size-2 stroke-[3]" />
              </div>
            )}

            <div
              className={`flex size-10 items-center justify-center rounded-xl transition-all duration-200 ${
                isCartoMap
                  ? "bg-blue-500 text-white shadow-md shadow-blue-500/30 scale-105"
                  : "bg-blue-100/80 text-blue-600 border border-blue-200/60 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/40 group-hover/carto:scale-105"
              }`}
            >
              <MapIcon className="size-5" />
            </div>

            <span
              className={`mt-1 text-[11px] font-semibold tracking-tight transition-colors text-center ${
                isCartoMap
                  ? "font-bold text-blue-600 dark:text-blue-400"
                  : "text-slate-700 dark:text-slate-300"
              }`}
            >
              Carto Map
            </span>
          </button>

          {/* Google Map Button */}
          <button
            type="button"
            onClick={() => onSelectMapStyle?.("roadmap")}
            className={`group/gmap relative flex w-[72px] flex-col items-center rounded-xl p-1.5 transition-all duration-200 cursor-pointer ${
              isGoogleMap
                ? "bg-emerald-500/10 ring-2 ring-emerald-500 shadow-xs dark:bg-emerald-950/30"
                : "hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
            }`}
            title="Switch to Google Maps standard view"
          >
            {isGoogleMap && (
              <div className="absolute top-1 right-1 flex size-3.5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs">
                <Check className="size-2 stroke-[3]" />
              </div>
            )}

            <div
              className={`flex size-10 items-center justify-center rounded-xl transition-all duration-200 ${
                isGoogleMap
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/30 scale-105"
                  : "bg-emerald-100/80 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900/40 group-hover/gmap:scale-105"
              }`}
            >
              <Globe className="size-5" />
            </div>

            <span
              className={`mt-1 text-[11px] font-semibold tracking-tight transition-colors text-center ${
                isGoogleMap
                  ? "font-bold text-emerald-600 dark:text-emerald-400"
                  : "text-slate-700 dark:text-slate-300"
              }`}
            >
              Google Map
            </span>
          </button>

          {/* Elegant Vertical Divider */}
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700/80 mx-0.5" />

          {/* Metro Stations Layer Card */}
          <button
            type="button"
            onClick={onToggleMetroStations}
            className={`group/metro relative flex w-[72px] flex-col items-center rounded-xl p-1.5 transition-all duration-200 cursor-pointer ${
              showMetroStations
                ? "bg-orange-500/10 ring-2 ring-orange-500 shadow-xs dark:bg-orange-950/30"
                : "hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
            }`}
            title="Toggle Nagpur Metro Stations (Aqua & Orange Lines)"
          >
            {/* Active Check Badge */}
            {showMetroStations && (
              <div className="absolute top-1 right-1 flex size-3.5 items-center justify-center rounded-full bg-orange-500 text-white shadow-xs">
                <Check className="size-2 stroke-[3]" />
              </div>
            )}

            {/* Metro Icon Tile */}
            <div
              className={`flex size-10 items-center justify-center rounded-xl transition-all duration-200 ${
                showMetroStations
                  ? "bg-orange-500 text-white shadow-md shadow-orange-500/30 scale-105"
                  : "bg-orange-100/80 text-orange-600 border border-orange-200/60 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-900/40 group-hover/metro:scale-105"
              }`}
            >
              <TrainFront className="size-5" />
            </div>

            {/* Label */}
            <span
              className={`mt-1 text-[11px] font-semibold tracking-tight transition-colors text-center ${
                showMetroStations
                  ? "font-bold text-orange-600 dark:text-orange-400"
                  : "text-slate-700 dark:text-slate-300"
              }`}
            >
              Metro
            </span>
          </button>

          {/* Bus Stops Layer Card */}
          <button
            type="button"
            onClick={onToggleBusStops}
            className={`group/bus relative flex w-[72px] flex-col items-center rounded-xl p-1.5 transition-all duration-200 cursor-pointer ${
              showBusStops
                ? "bg-teal-500/10 ring-2 ring-teal-600 shadow-xs dark:bg-teal-950/30"
                : "hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
            }`}
            title="Toggle Aapli Bus Stops Network"
          >
            {/* Active Check Badge */}
            {showBusStops && (
              <div className="absolute top-1 right-1 flex size-3.5 items-center justify-center rounded-full bg-teal-600 text-white shadow-xs">
                <Check className="size-2 stroke-[3]" />
              </div>
            )}

            {/* Bus Icon Tile */}
            <div
              className={`flex size-10 items-center justify-center rounded-xl transition-all duration-200 ${
                showBusStops
                  ? "bg-teal-600 text-white shadow-md shadow-teal-600/30 scale-105"
                  : "bg-teal-100/80 text-teal-700 border border-teal-200/60 dark:bg-teal-950/50 dark:text-teal-400 dark:border-teal-900/40 group-hover/bus:scale-105"
              }`}
            >
              <Bus className="size-5" />
            </div>

            {/* Label */}
            <span
              className={`mt-1 text-[11px] font-semibold tracking-tight transition-colors text-center ${
                showBusStops
                  ? "font-bold text-teal-700 dark:text-teal-400"
                  : "text-slate-700 dark:text-slate-300"
              }`}
            >
              Bus Stops
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
