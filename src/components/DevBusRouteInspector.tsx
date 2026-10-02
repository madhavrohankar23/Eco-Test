import { useState, useEffect, useMemo } from "react";
import { Polyline, CircleMarker, Tooltip, useMap } from "react-leaflet";
import { Bus, Search, X, MapPin, Layers } from "lucide-react";

export interface DevStop {
  seq: number;
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export interface DevRoute {
  route_id: string;
  bus_number: string;
  route_name: string;
  label: string;
  stopsCount: number;
  stops: DevStop[];
  polyline: [number, number][];
}

function FitRoute({ polyline }: { polyline: [number, number][] | null }) {
  const map = useMap();
  useEffect(() => {
    if (polyline && polyline.length > 1) {
      map.fitBounds(polyline, { padding: [60, 60] });
    }
  }, [polyline, map]);
  return null;
}

/**
 * Top-right interactive Dev Route Inspector tool.
 * Reads public/data/devRoutes.json on demand (compiled from network_dev.json & lineGeometries_dev.json).
 */
export default function DevBusRouteInspector() {
  const [isOpen, setIsOpen] = useState(false);
  const [routes, setRoutes] = useState<DevRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedRoute, setSelectedRoute] = useState<DevRoute | null>(null);

  // Lazy fetch compiled dev routes on first open
  useEffect(() => {
    if (isOpen && routes.length === 0 && !loading) {
      setLoading(true);
      fetch("/data/devRoutes.json")
        .then((res) => res.json())
        .then((data: DevRoute[]) => {
          setRoutes(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load dev routes:", err);
          setLoading(false);
        });
    }
  }, [isOpen, routes.length, loading]);

  const filteredRoutes = useMemo(() => {
    if (!query.trim()) return routes.slice(0, 50);
    const q = query.toLowerCase().trim();
    return routes
      .filter((r) => {
        const matchBusNo = r.bus_number.toLowerCase().includes(q);
        const matchName = r.route_name.toLowerCase().includes(q);
        const matchLabel = r.label.toLowerCase().includes(q);
        return matchBusNo || matchName || matchLabel;
      })
      .slice(0, 50);
  }, [routes, query]);

  return (
    <>
      {/* ── MAP OVERLAYS (Rendered inside Leaflet MapContainer) ── */}
      {selectedRoute && (
        <>
          {/* Real road curved path from lineGeometries_dev.json */}
          <Polyline
            positions={selectedRoute.polyline}
            pathOptions={{
              color: "#7c3aed",
              weight: 5.5,
              opacity: 0.95,
            }}
          >
            <Tooltip sticky>
              <div className="text-xs font-semibold">
                {selectedRoute.label} ({selectedRoute.stopsCount} stops)
              </div>
            </Tooltip>
          </Polyline>

          {/* All bus stops from network_dev.json */}
          {selectedRoute.stops.map((stop, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === selectedRoute.stops.length - 1;
            const color = isFirst ? "#16a34a" : isLast ? "#dc2626" : "#7c3aed";
            const radius = isFirst || isLast ? 8 : 5.5;

            return (
              <CircleMarker
                key={`dev-stop-${stop.id || idx}-${stop.seq}`}
                center={[stop.lat, stop.lon]}
                radius={radius}
                pathOptions={{
                  color: "#ffffff",
                  fillColor: color,
                  fillOpacity: 1,
                  weight: 2,
                }}
              >
                <Tooltip permanent={isFirst || isLast}>
                  <div className="text-xs font-medium">
                    <span className="font-bold text-primary">#{stop.seq}</span> {stop.name}
                    {isFirst && " (Start Terminal)"}
                    {isLast && " (End Terminal)"}
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}

          <FitRoute polyline={selectedRoute.polyline} />
        </>
      )}

      {/* ── FLOATING UI CONTROL (Rendered at Top-Right Corner) ── */}
      <div className="absolute top-4 right-4 z-[1001] flex flex-col items-end gap-2 pointer-events-auto">
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-white/95 px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-lg backdrop-blur-md border border-slate-200/80 transition-all hover:bg-slate-50 hover:shadow-xl hover:border-indigo-400"
          >
            <Bus className="h-4 w-4 text-indigo-600" />
            <span>Bus Route Inspector</span>
            <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
              Dev
            </span>
          </button>
        ) : (
          <div className="w-80 md:w-96 rounded-2xl bg-white/95 p-3.5 shadow-2xl backdrop-blur-md border border-slate-200/90 text-slate-900 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                  <Bus className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">
                    Bus Route Inspector
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    network_dev & lineGeometries_dev
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative mt-2.5">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Bus No. (e.g. 1, 5, 72B) or Route..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-7 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                autoFocus
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Selected Route Info Card */}
            {selectedRoute && (
              <div className="mt-2.5 rounded-xl border border-indigo-200 bg-indigo-50/70 p-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    {selectedRoute.bus_number && (
                      <span className="inline-block rounded-md bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                        BUS {selectedRoute.bus_number}
                      </span>
                    )}
                    <h5 className="mt-1 text-xs font-bold text-slate-900 leading-snug">
                      {selectedRoute.route_name}
                    </h5>
                  </div>
                  <button
                    onClick={() => setSelectedRoute(null)}
                    className="text-[11px] font-semibold text-indigo-700 hover:underline"
                  >
                    Clear
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-600">
                  <span className="flex items-center gap-1 font-medium">
                    <MapPin className="h-3 w-3 text-indigo-600" />
                    {selectedRoute.stopsCount} Stops
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <Layers className="h-3 w-3 text-indigo-600" />
                    {selectedRoute.polyline.length} GPS Vertices
                  </span>
                </div>
                {selectedRoute.stops.length > 0 && (
                  <div className="mt-1.5 text-[10px] text-slate-500 line-clamp-1">
                    <span className="font-semibold text-slate-700">Terminals:</span>{" "}
                    {selectedRoute.stops[0]?.name} ➔{" "}
                    {selectedRoute.stops[selectedRoute.stops.length - 1]?.name}
                  </div>
                )}
              </div>
            )}

            {/* Results List */}
            <div className="mt-2 max-h-56 overflow-y-auto space-y-1 pr-0.5">
              {loading ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  Loading 900+ routes database…
                </div>
              ) : filteredRoutes.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No bus route matching "{query}"
                </div>
              ) : (
                filteredRoutes.map((r) => {
                  const isSelected = selectedRoute?.route_id === r.route_id || selectedRoute?.label === r.label;
                  return (
                    <button
                      key={r.route_id || r.label}
                      onClick={() => setSelectedRoute(r)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                        isSelected
                          ? "bg-indigo-600 text-white font-semibold shadow-xs"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {r.bus_number ? (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-indigo-100 text-indigo-800"
                            }`}
                          >
                            {r.bus_number}
                          </span>
                        ) : (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            BUS
                          </span>
                        )}
                        <span className="truncate">{r.route_name}</span>
                      </div>
                      <span
                        className={`text-[10px] ml-2 shrink-0 ${
                          isSelected ? "text-indigo-100" : "text-slate-400"
                        }`}
                      >
                        {r.stopsCount} stops
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
