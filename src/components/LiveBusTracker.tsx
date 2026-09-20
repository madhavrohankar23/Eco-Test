import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Bus,
  Radio,
  Clock,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  RefreshCw,
  X,
  Compass,
  Calendar,
} from "lucide-react";
import {
  searchLiveBusRoutes,
  formatLiveEta,
  formatLiveEtaShort,
  fetchLiveRouteDetails,
  type LiveBusRoute,
  type LiveBusStop,
  type LiveRouteTelemetry,
  type BusTimetableInfo,
} from "@/lib/liveBus";

// Popular bus numbers in Nagpur (including 100 and 135)
const POPULAR_BUSES = ["1", "5", "10", "12", "16", "24", "72", "100", "135", "176"];

interface LiveBusTrackerProps {
  selectedRoute: LiveBusRoute | null;
  onSelectRoute: (route: LiveBusRoute | null) => void;
  telemetry: LiveRouteTelemetry | null;
  selectedStop: LiveBusStop | null;
  onSelectStop: (stop: LiveBusStop | null) => void;
  isPolling: boolean;
  refreshSecondsRemaining: number;
  onManualRefresh: () => void;
}

export default function LiveBusTracker({
  selectedRoute,
  onSelectRoute,
  telemetry,
  selectedStop,
  onSelectStop,
  isPolling,
  refreshSecondsRemaining,
  onManualRefresh,
}: LiveBusTrackerProps) {
  const [query, setQuery] = useState("");
  const [showTimetable, setShowTimetable] = useState(false);
  const [liveTimetable, setLiveTimetable] = useState<BusTimetableInfo | null>(null);

  const filteredRoutes = useMemo(() => {
    return searchLiveBusRoutes(query, 50);
  }, [query]);

  // Reset stop selection and timetable when route changes
  useEffect(() => {
    onSelectStop(null);
    setShowTimetable(false);
    setLiveTimetable(null);

    if (!selectedRoute) return;

    let isSubscribed = true;
    const loadTimetable = async () => {
      const rid = selectedRoute.route_id;
      try {
        const details = await fetchLiveRouteDetails(rid);
        if (details?.timetable && isSubscribed) {
          setLiveTimetable(details.timetable);
        }
      } catch {
        // ignore
      }
    };
    void loadTimetable();
    return () => {
      isSubscribed = false;
    };
  }, [selectedRoute, onSelectStop]);

  const activeVehiclesCount = telemetry?.vehicles?.length ?? 0;

  // Retrieve scheduled timetable for selected route from Chalo live scheduler
  const timetableInfo = useMemo<BusTimetableInfo | null>(() => {
    return liveTimetable;
  }, [liveTimetable]);

  // Find next upcoming scheduled departure
  const nextDeparture = useMemo(() => {
    if (!timetableInfo || timetableInfo.departureTimes.length === 0) return null;
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    // Find departure later than current time
    for (const timeStr of timetableInfo.departureTimes) {
      // parse "07:30 AM" or "04:15 PM"
      const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
      if (match) {
        let h = parseInt(match[1] || "0", 10);
        const m = parseInt(match[2] || "0", 10);
        const isPm = (match[3] || "").toUpperCase() === "PM";
        if (isPm && h < 12) h += 12;
        if (!isPm && h === 12) h = 0;
        const depMin = h * 60 + m;
        if (depMin >= currentMins) {
          return timeStr;
        }
      }
    }
    return timetableInfo.departureTimes[0]; // fallback to first trip of the morning
  }, [timetableInfo]);

  return (
    <div className="space-y-3.5 text-slate-800 dark:text-slate-100">
      {/* ── 1. Header Banner & Live Status ── */}
      <div className="flex items-center justify-between rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent p-3.5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="relative flex size-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
            <Radio className="size-4 animate-pulse" />
            <span className="absolute -right-0.5 -top-0.5 flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
            </span>
          </div>
          <div>
            <h2 className="text-xs font-bold leading-tight text-foreground">
              Aapli Bus Live Tracking
            </h2>
            <p className="text-[10px] text-muted-foreground">
              Real-time GPS powered by Chalo
            </p>
          </div>
        </div>

        {selectedRoute && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={onManualRefresh}
              title="Refresh GPS now"
              className="flex items-center gap-1 rounded-xl bg-secondary/80 px-2.5 py-1 text-[11px] font-semibold text-foreground transition hover:bg-secondary active:scale-95"
            >
              <RefreshCw className={`size-3 text-indigo-500 ${isPolling ? "animate-spin" : ""}`} />
              <span>{refreshSecondsRemaining}s</span>
            </button>
          </div>
        )}
      </div>

      {/* ── 2. Route Search & Selector (When no route selected) ── */}
      {!selectedRoute ? (
        <div className="space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Bus No (e.g. 100, 135, 1, 72) or Stop / Terminal..."
              className="w-full rounded-2xl border border-border bg-white py-2.5 pl-9 pr-9 text-xs font-medium text-foreground placeholder:text-muted-foreground shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:bg-card"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Popular Bus Number Chips */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Popular City Buses
            </p>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_BUSES.map((bNo) => (
                <button
                  key={bNo}
                  onClick={() => setQuery(bNo)}
                  className={`rounded-xl border px-2.5 py-1 text-xs font-bold transition active:scale-95 ${
                    query === bNo
                      ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                      : "border-border bg-white text-muted-foreground hover:border-indigo-400 hover:text-indigo-600 dark:bg-card"
                  }`}
                >
                  Bus {bNo}
                </button>
              ))}
            </div>
          </div>

          {/* Matching Routes List */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
              <span>Bus Routes ({filteredRoutes.length})</span>
              <span className="text-[10px]">Select route to track live</span>
            </div>

            <div className="max-h-[calc(100vh-320px)] space-y-2 overflow-y-auto pr-0.5">
              {filteredRoutes.map((route) => (
                <div
                  key={route.id}
                  onClick={() => onSelectRoute(route)}
                  className="group flex cursor-pointer items-center justify-between rounded-2xl border border-border bg-white p-3 shadow-xs transition hover:border-indigo-500/40 hover:bg-indigo-50/20 hover:shadow-sm dark:bg-card dark:hover:bg-secondary/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                        BUS {route.display_bus_number || route.bus_number}
                      </span>
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {route.stopsCount} stops
                      </span>
                    </div>

                    <p className="mt-1.5 truncate text-xs font-bold text-foreground group-hover:text-indigo-600 transition">
                      {route.route_name}
                    </p>

                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="truncate">{route.from_terminal}</span>
                      <ArrowRight className="size-2.5 shrink-0" />
                      <span className="truncate">{route.to_terminal}</span>
                    </div>
                  </div>

                  <button className="ml-2 flex size-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white dark:bg-indigo-950/40 dark:text-indigo-400">
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              ))}

              {filteredRoutes.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  <Bus className="mx-auto size-6 text-muted-foreground/40" />
                  <p className="mt-2 font-semibold">No bus route found for &quot;{query}&quot;</p>
                  <p className="mt-0.5 text-[10px]">
                    Try searching by bus number (e.g. 100, 135, 1, 5, 72) or terminal name.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ── 3. Active Route Live Tracking View ── */
        <div className="space-y-3">
          {/* Active Route Header Card */}
          <div className="rounded-2xl border border-indigo-500/30 bg-white p-3.5 shadow-sm dark:bg-card">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                    BUS {selectedRoute.display_bus_number || selectedRoute.bus_number}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      activeVehiclesCount > 0
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        activeVehiclesCount > 0 ? "bg-emerald-500 animate-ping" : "bg-amber-500"
                      }`}
                    />
                    {activeVehiclesCount > 0
                      ? `${activeVehiclesCount} Bus${activeVehiclesCount > 1 ? "es" : ""} Live`
                      : "No Live Bus on Route"}
                  </span>
                </div>

                <h3 className="mt-1.5 text-xs font-bold text-foreground">
                  {selectedRoute.route_name}
                </h3>

                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="truncate">{selectedRoute.from_terminal}</span>
                  <ArrowRight className="size-2.5 shrink-0" />
                  <span className="truncate">{selectedRoute.to_terminal}</span>
                </div>
              </div>

              <button
                onClick={() => onSelectRoute(null)}
                className="rounded-xl border border-border bg-secondary/60 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground active:scale-95"
              >
                Change
              </button>
            </div>

            {/* Active Vehicle Numbers Badge Bar */}
            {activeVehiclesCount > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-2.5">
                <span className="text-[10px] font-semibold text-muted-foreground">Online Buses:</span>
                {telemetry?.vehicles.map((v) => (
                  <span
                    key={v.vehicleId}
                    className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                  >
                    <Bus className="size-2.5" />
                    {v.vNo}
                    {v.isHalted && <span className="text-amber-600 font-normal">(Halted)</span>}
                  </span>
                ))}
              </div>
            ) : (
              /* Fallback banner when no live GPS is available */
              <div className="mt-3 border-t border-border/50 pt-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground">
                    Live GPS is currently offline for this route.
                  </p>
                  <button
                    onClick={() => setShowTimetable(true)}
                    className="flex shrink-0 items-center gap-1 rounded-xl bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs transition hover:bg-indigo-700 active:scale-95"
                  >
                    <Clock className="size-3" />
                    View Timetable
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Timetable Drawer / Modal Preview */}
          {showTimetable && (
            <div className="rounded-2xl border border-indigo-500/40 bg-white p-3.5 shadow-md dark:bg-card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400">
                    <Calendar className="size-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">
                      Scheduled Timetable · Bus {selectedRoute.bus_number}
                    </h4>
                    <p className="text-[10px] text-muted-foreground">
                      {timetableInfo
                        ? `${timetableInfo.tripsPerDay} trips/day · ~${timetableInfo.durationMin} min duration`
                        : "Official scheduled departure frequency"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTimetable(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              {timetableInfo && timetableInfo.departureTimes.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {nextDeparture && (
                    <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <span className="flex items-center gap-1.5 font-bold text-[11px]">
                        <Clock className="size-3" /> Next Scheduled Trip:
                      </span>
                      <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
                        {nextDeparture}
                      </span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Departure Times from {selectedRoute.from_terminal}:
                    </p>
                    <div className="grid max-h-36 grid-cols-4 gap-1.5 overflow-y-auto pr-1">
                      {timetableInfo.departureTimes.map((t, idx) => (
                        <div
                          key={idx}
                          className={`rounded-lg border px-1.5 py-1 text-center text-[10px] font-semibold ${
                            t === nextDeparture
                              ? "border-emerald-500 bg-emerald-100/70 font-bold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                              : "border-border bg-secondary/30 text-muted-foreground"
                          }`}
                        >
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-xl bg-secondary/30 p-3 text-center text-xs text-muted-foreground">
                  <Clock className="mx-auto size-5 text-muted-foreground/60" />
                  <p className="mt-1 font-semibold">Standard 15–20 min Frequency</p>
                  <p className="text-[10px]">
                    Operates daily from 06:00 AM to 10:00 PM across Nagpur city.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Selected Stop Card (when user taps a stop) */}
          {selectedStop && (
            <div className="rounded-2xl border border-indigo-500/40 bg-indigo-50/50 p-3.5 shadow-sm dark:bg-indigo-950/20">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-md bg-indigo-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      #{selectedStop.stop_sequence}
                    </span>
                    <h4 className="text-xs font-bold text-foreground">{selectedStop.name}</h4>
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">Selected Stop</p>
                </div>
                <button
                  onClick={() => onSelectStop(null)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              {/* Stop ETA details */}
              {(() => {
                const etas = telemetry?.stopsEta?.[selectedStop.stop_id];
                if (etas && etas.length > 0) {
                  return (
                    <div className="mt-2.5 space-y-1.5">
                      {etas.map((eta, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-xl bg-white p-2 text-xs shadow-2xs dark:bg-card"
                        >
                          <div className="flex items-center gap-2">
                            <Bus className="size-3.5 text-indigo-600" />
                            <span className="font-bold text-foreground">{eta.vNo}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {eta.isHalted && (
                              <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600">
                                <AlertTriangle className="size-3" /> Halted
                              </span>
                            )}
                            <span className="flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                              <Clock className="size-3" />
                              {formatLiveEta(eta.etaSeconds)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }

                // If no live ETA returned for this stop
                return (
                  <div className="mt-2.5 rounded-xl bg-white/80 p-2.5 text-xs text-muted-foreground dark:bg-card/70">
                    <p className="flex items-center gap-1.5 text-[11px]">
                      <Compass className="size-3 text-indigo-500" />
                      {activeVehiclesCount > 0
                        ? "No live bus approaching this stop right now."
                        : "No active bus on route."}
                    </p>
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() => setShowTimetable(true)}
                        className="flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300"
                      >
                        <Clock className="size-2.5" />
                        View Timetable
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Stop Sequence List */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>Route Stops ({selectedRoute.stopsCount})</span>
              <span className="text-[10px] lowercase font-normal">Tap stop to check ETA</span>
            </div>

            <div className="max-h-[calc(100vh-380px)] space-y-1 overflow-y-auto pr-0.5">
              {selectedRoute.stops.map((stop, idx) => {
                const isSelected = selectedStop?.stop_id === stop.stop_id;
                const isFirst = idx === 0;
                const isLast = idx === selectedRoute.stops.length - 1;
                const stopEtas = telemetry?.stopsEta?.[stop.stop_id];
                const primaryEta = stopEtas?.[0];

                return (
                  <div
                    key={stop.stop_id || idx}
                    onClick={() => onSelectStop(stop)}
                    className={`group flex cursor-pointer items-center justify-between rounded-xl border p-2.5 transition active:scale-98 ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/70 shadow-xs dark:bg-indigo-950/40"
                        : "border-border/60 bg-white hover:border-indigo-400/60 hover:bg-secondary/30 dark:bg-card"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      {/* Stop Sequence Indicator */}
                      <span
                        className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          isFirst
                            ? "bg-emerald-500 text-white"
                            : isLast
                              ? "bg-rose-500 text-white"
                              : isSelected
                                ? "bg-indigo-600 text-white"
                                : "bg-secondary text-muted-foreground group-hover:bg-indigo-100 group-hover:text-indigo-700"
                        }`}
                      >
                        {stop.stop_sequence}
                      </span>

                      <div className="min-w-0">
                        <p
                          className={`truncate text-xs ${
                            isSelected || isFirst || isLast
                              ? "font-bold text-foreground"
                              : "font-medium text-foreground/90"
                          }`}
                        >
                          {stop.name}
                        </p>
                        {(isFirst || isLast) && (
                          <span className="text-[9px] font-semibold text-muted-foreground">
                            {isFirst ? "Start Terminal" : "End Terminal"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Live ETA Badge on Stop: Only show if valid approaching ETA exists */}
                    {primaryEta && primaryEta.etaSeconds >= 0 && (
                      <div className="ml-2 flex shrink-0 items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                        <Clock className="size-2.5" />
                        <span>{formatLiveEtaShort(primaryEta.etaSeconds)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
