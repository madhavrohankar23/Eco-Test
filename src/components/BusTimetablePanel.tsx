import { useState, useMemo, useEffect } from "react";
import {
  Bus,
  Clock,
  Calendar,
  X,
  MapPin,
  Timer,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Info,
  Search,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  ListFilter,
  CheckCircle2,
  Share2,
  AlertCircle,
  Navigation,
} from "lucide-react";
import {
  getBusTimetable,
  formatMinutesToTime,
  type BusTimetableRoute,
  type BusTimetableResult,
  type FormattedDeparture,
} from "@/lib/busTimetableService";

interface BusTimetablePanelProps {
  busNumber?: string | undefined;
  routeName?: string | undefined;
  fromStop?: string | undefined;
  toStop?: string | undefined;
  onClose: () => void;
}

export default function BusTimetablePanel({
  busNumber,
  routeName,
  fromStop,
  toStop,
  onClose,
}: BusTimetablePanelProps) {
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<"timetable" | "stops">("timetable");
  const [timeFilter, setTimeFilter] = useState<"all" | "morning" | "afternoon" | "evening" | "night">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"stop" | "origin">("stop");

  // Load timetable dataset with stop-specific offsets and direction ranking
  const timetableResult: BusTimetableResult | null = useMemo(() => {
    return getBusTimetable(busNumber, routeName, fromStop, toStop);
  }, [busNumber, routeName, fromStop, toStop]);

  // Reset selected route index to 0 (the top scored matching direction) when props change
  useEffect(() => {
    setSelectedRouteIdx(0);
    setTimeFilter("all");
    setSearchQuery("");
    setViewMode(fromStop ? "stop" : "origin");
  }, [busNumber, routeName, fromStop, toStop]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const activeRoute: BusTimetableRoute | undefined =
    timetableResult?.matchedRoutes[selectedRouteIdx] || timetableResult?.matchedRoutes[0];

  // Filter departures by time slot and search query
  const filteredDepartures = useMemo(() => {
    if (!activeRoute) return [];

    let list = activeRoute.departures;

    if (timeFilter === "morning") list = activeRoute.timeSlots.morning;
    else if (timeFilter === "afternoon") list = activeRoute.timeSlots.afternoon;
    else if (timeFilter === "evening") list = activeRoute.timeSlots.evening;
    else if (timeFilter === "night") list = activeRoute.timeSlots.night;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (d) =>
          d.formattedTime.toLowerCase().includes(q) ||
          d.originFormattedTime.toLowerCase().includes(q)
      );
    }

    return list;
  }, [activeRoute, timeFilter, searchQuery]);

  if (!timetableResult || !activeRoute) {
    return (
      <div className="fixed inset-y-0 right-0 z-[1300] flex w-[420px] max-w-[calc(100vw-24px)] flex-col border-l border-border bg-background shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-bus/15 text-bus">
              <Bus className="size-4" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Bus Timetable</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <Bus className="size-10 text-muted-foreground/40 mb-3" />
          <h4 className="text-sm font-bold text-foreground">No Timetable Found</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Could not find scheduled timetable data for {busNumber ? `Bus ${busNumber}` : routeName || "this bus"}.
          </p>
          <button
            onClick={onClose}
            className="mt-4 rounded-xl bg-secondary px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary/80"
          >
            Close Panel
          </button>
        </div>
      </div>
    );
  }

  const isStopViewActive = viewMode === "stop" && !!activeRoute.boardingStopName;

  return (
    <>
      {/* ── 1. Backdrop Overlay (on mobile or desktop click-outside) ── */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-[1290] bg-black/40 backdrop-blur-xs transition-opacity duration-300"
      />

      {/* ── 2. Dedicated Right-Hand Side Sliding Timetable Panel ── */}
      <aside className="fixed inset-y-0 right-0 z-[1300] flex w-[430px] max-w-[calc(100vw-16px)] flex-col border-l border-border bg-background shadow-2xl animate-in slide-in-from-right duration-300 font-sans">
        {/* Top Header */}
        <div className="relative border-b border-border bg-green p-4 text-foreground dark:bg-card">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 border border-teal-200 text-teal-700 dark:bg-teal-950/60 dark:border-teal-800 dark:text-teal-300 shadow-xs">
                <Bus className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-extrabold text-teal-800 border border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800">
                    BUS {activeRoute.displayBusNumber}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-semibold">Aapli Bus Nagpur</span>
                </div>
                <h2 className="truncate text-sm font-extrabold text-foreground mt-0.5" title={activeRoute.routeName}>
                  {activeRoute.routeName}
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              title="Close Timetable Panel"
              className="rounded-xl border border-border bg-secondary/60 p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground active:scale-95 shadow-xs"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Direction Switcher (Forward vs Return Routes) */}
          {timetableResult.matchedRoutes.length > 1 && (
            <div className="mt-3 flex gap-1.5 overflow-x-auto no-scrollbar pt-1">
              {timetableResult.matchedRoutes.map((r, idx) => {
                const parts = r.routeName.split(" - ");
                const destName = parts[1] || r.routeName;
                const isMatchingSelection = selectedRouteIdx === idx;
                return (
                  <button
                    key={`route-var-${idx}`}
                    onClick={() => setSelectedRouteIdx(idx)}
                    className={`flex items-center gap-1.5 shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                      isMatchingSelection
                        ? "bg-teal-600 text-white shadow-xs"
                        : "border border-border bg-secondary/50 text-foreground/80 hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <ArrowRight className="size-3" />
                    <span className="truncate max-w-[170px]">To {destName}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Boarding Stop Notice & Time Mode Switcher */}
        {activeRoute.boardingStopName && (
          <div className="border-b border-border bg-emerald-500/10 px-3.5 py-2.5 dark:bg-emerald-950/30">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-foreground min-w-0">
                <MapPin className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="truncate">
                  <span className="text-muted-foreground">Boarding at </span>
                  <strong className="text-emerald-700 dark:text-emerald-300 font-extrabold">{activeRoute.boardingStopName}</strong>
                  {activeRoute.boardingStopOffsetMin > 0 && (
                    <span className="text-[11px] text-muted-foreground ml-1">
                      (+{activeRoute.boardingStopOffsetMin}m from start)
                    </span>
                  )}
                </div>
              </div>

              {/* Toggle: Stop Times vs Origin Times */}
              <div className="flex rounded-lg border border-border/80 bg-background/80 p-0.5 text-[10px] font-bold shrink-0 shadow-2xs">
                <button
                  onClick={() => setViewMode("stop")}
                  className={`rounded-md px-2 py-0.5 transition ${
                    viewMode === "stop"
                      ? "bg-emerald-600 text-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  At Stop
                </button>
                <button
                  onClick={() => setViewMode("origin")}
                  className={`rounded-md px-2 py-0.5 transition ${
                    viewMode === "origin"
                      ? "bg-slate-800 text-white dark:bg-white dark:text-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Terminal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Live Status & Overview Stats Banner */}
        <div className="border-b border-border bg-teal-500/5 p-3.5 dark:bg-teal-950/20">
          {/* Next Bus Highlight */}
          {activeRoute.nextBus && (
            <div
              className={`flex items-center justify-between rounded-xl border px-3 py-2 shadow-xs mb-3 ${
                activeRoute.allTripsFinishedToday
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                  : "border-teal-500/30 bg-teal-500/10 text-teal-800 dark:text-teal-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="relative flex size-2.5">
                  <span
                    className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                      activeRoute.allTripsFinishedToday ? "bg-amber-400" : "bg-teal-400"
                    }`}
                  />
                  <span
                    className={`relative inline-flex size-2.5 rounded-full ${
                      activeRoute.allTripsFinishedToday ? "bg-amber-500" : "bg-teal-500"
                    }`}
                  />
                </span>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wide opacity-85">
                    {activeRoute.allTripsFinishedToday
                      ? "All Trips Completed Today"
                      : isStopViewActive
                      ? `Next Bus at ${activeRoute.boardingStopName}`
                      : "Next Terminal Departure"}
                  </div>
                  <div className="text-sm font-black tracking-tight">
                    {isStopViewActive ? activeRoute.nextBus.formattedTime : activeRoute.nextBus.originFormattedTime}
                    <span className="ml-1.5 text-xs font-semibold opacity-75">
                      {activeRoute.allTripsFinishedToday
                        ? `(First bus tomorrow at ${activeRoute.firstBus})`
                        : activeRoute.nextBus.minutesUntil > 0
                        ? `(in ~${activeRoute.nextBus.minutesUntil} min)`
                        : "(Departing now)"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="rounded-md bg-teal-500/20 px-2 py-1 text-[10px] font-black text-teal-700 dark:text-teal-300">
                  Every ~{activeRoute.frequencyMin} min
                </span>
              </div>
            </div>
          )}

          {/* 4 Metric Stats Grid */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="rounded-xl border border-border bg-card p-2 shadow-xs">
              <div className="text-[10px] font-semibold text-muted-foreground">First Bus</div>
              <div className="mt-0.5 text-xs font-extrabold text-foreground">
                {isStopViewActive ? activeRoute.departures[0]?.formattedTime : activeRoute.firstBus}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-2 shadow-xs">
              <div className="text-[10px] font-semibold text-muted-foreground">Last Bus</div>
              <div className="mt-0.5 text-xs font-extrabold text-foreground">
                {isStopViewActive
                  ? activeRoute.departures[activeRoute.departures.length - 1]?.formattedTime
                  : activeRoute.lastBus}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-2 shadow-xs">
              <div className="text-[10px] font-semibold text-muted-foreground">Duration</div>
              <div className="mt-0.5 text-xs font-extrabold text-foreground">~{activeRoute.durationMin}m</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-2 shadow-xs">
              <div className="text-[10px] font-semibold text-muted-foreground">Daily Trips</div>
              <div className="mt-0.5 text-xs font-extrabold text-foreground">{activeRoute.tripsPerDay}</div>
            </div>
          </div>
        </div>

        {/* View Tabs: Timetable vs Stop Sequence */}
        <div className="flex border-b border-border px-4 pt-2">
          <button
            onClick={() => setActiveTab("timetable")}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition ${
              activeTab === "timetable"
                ? "border-teal-500 text-teal-600 dark:text-teal-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="size-3.5" />
            <span>Timetable</span>
          </button>

          {activeRoute.stops.length > 0 && (
            <button
              onClick={() => setActiveTab("stops")}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition ${
                activeTab === "stops"
                  ? "border-teal-500 text-teal-600 dark:text-teal-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <MapPin className="size-3.5" />
              <span>Route</span>
            </button>
          )}
        </div>

        {/* ── 3. Tab Content 1: Daily Timetable & Time Filters ── */}
        {activeTab === "timetable" && (
          <div className="flex flex-1 flex-col overflow-hidden p-3.5">
            {/* Filter Pills & Search */}
            <div className="space-y-2">
              {/* Time Slot Filters */}
              <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
                {[
                  { id: "all", label: "All", count: activeRoute.departures.length, icon: Calendar },
                  { id: "morning", label: "Morning", count: activeRoute.timeSlots.morning.length, icon: Sunrise },
                  { id: "afternoon", label: "Afternoon", count: activeRoute.timeSlots.afternoon.length, icon: Sun },
                  { id: "evening", label: "Evening", count: activeRoute.timeSlots.evening.length, icon: Sunset },
                  { id: "night", label: "Night", count: activeRoute.timeSlots.night.length, icon: Moon },
                ].map((slot) => {
                  const Icon = slot.icon;
                  return (
                    <button
                      key={slot.id}
                      onClick={() => setTimeFilter(slot.id as any)}
                      className={`flex items-center gap-1 shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                        timeFilter === slot.id
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                          : "border border-border bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="size-3" />
                      <span>{slot.label}</span>
                      <span className="text-[10px] opacity-75">({slot.count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Instant Departure Time Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter departures by time (e.g. 07:30, PM)..."
                  className="w-full rounded-xl border border-border bg-card py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-teal-500 focus:outline-none shadow-xs"
                />
              </div>
            </div>

            {/* Departures Grid */}
            <div className="mt-3 flex-1 overflow-y-auto pr-1">
              {filteredDepartures.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center text-center text-xs text-muted-foreground">
                  <Clock className="size-6 opacity-40 mb-1" />
                  <span>No departures found matching your filter</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {filteredDepartures.map((dep, idx) => {
                    const displayTime = isStopViewActive ? dep.formattedTime : dep.originFormattedTime;
                    return (
                      <div
                        key={`dep-${idx}`}
                        className={`relative rounded-xl border p-2.5 transition ${
                          dep.isNext
                            ? "border-teal-500 bg-teal-500/10 shadow-sm ring-1 ring-teal-500/30 dark:bg-teal-950/40"
                            : dep.isPast
                            ? "border-border/50 bg-secondary/30 opacity-60"
                            : "border-border bg-card hover:border-teal-500/40"
                        }`}
                      >
                        {dep.isNext && (
                          <span className="absolute -top-2 right-2 rounded-full bg-teal-600 px-1.5 py-0.2 text-[9px] font-black text-white uppercase tracking-wider shadow-2xs">
                            Next
                          </span>
                        )}

                        <div className="text-sm font-extrabold text-foreground tabular-nums">
                          {displayTime}
                        </div>

                        {/* Origin Terminal Departure Subtext */}
                        {isStopViewActive && dep.stopOffsetMin > 0 && (
                          <div className="text-[10px] text-muted-foreground truncate" title={`Terminal origin departure: ${dep.originFormattedTime}`}>
                            Start: {dep.originFormattedTime}
                          </div>
                        )}

                        <div className="mt-1 flex items-center justify-between text-[10px]">
                          {dep.isPast ? (
                            <span className="text-muted-foreground font-medium">Departed</span>
                          ) : dep.minutesUntil <= 60 ? (
                            <span className="font-bold text-teal-600 dark:text-teal-400">
                              in ~{dep.minutesUntil}m
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Scheduled</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 4. Tab Content 2: Complete Route Stop Sequence ── */}
        {activeTab === "stops" && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-2.5 flex items-center justify-between text-[11px] font-bold text-muted-foreground">
              <span>{activeRoute.stops.length} Sequential Stops</span>
              <span>Time from Start</span>
            </div>

            <div className="space-y-0.5">
              {activeRoute.stops.map((stopName, sIdx) => {
                const isOrigin = sIdx === 0;
                const isDestination = sIdx === activeRoute.stops.length - 1;
                const isBoardingStop =
                  activeRoute.boardingStopName &&
                  stopName.toLowerCase().trim() === activeRoute.boardingStopName.toLowerCase().trim();

                const offsetMin =
                  activeRoute.stopOffsets?.[sIdx] ??
                  (sIdx === 0 ? 0 : Math.round((sIdx / Math.max(1, activeRoute.stops.length - 1)) * activeRoute.durationMin));

                const nextDepMin = activeRoute.nextBus ? activeRoute.nextBus.minFromMidnight : null;
                const estArrivalTime = nextDepMin !== null ? formatMinutesToTime(nextDepMin + offsetMin) : null;

                return (
                  <div key={`stop-node-${sIdx}`} className="relative flex items-start gap-3 py-2 pl-5">
                    {/* Connecting Spine Line */}
                    {!isDestination && (
                      <div className="absolute left-[7px] top-4.5 bottom-[-6px] w-0.5 bg-border" />
                    )}

                    {/* Stop Node Dot */}
                    <span
                      className={`absolute left-[3px] top-2.5 size-2.5 rounded-full ring-2 ring-background ${
                        isBoardingStop
                          ? "bg-teal-500 ring-teal-400 size-3 -left-[4px]"
                          : isOrigin
                          ? "bg-slate-900 dark:bg-white"
                          : isDestination
                          ? "bg-rose-500"
                          : "bg-muted-foreground/60"
                      }`}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs font-semibold truncate ${
                            isBoardingStop
                              ? "text-teal-700 dark:text-teal-300 font-black"
                              : isOrigin || isDestination
                              ? "font-bold text-foreground"
                              : "text-foreground/90"
                          }`}
                        >
                          {stopName}
                        </span>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isBoardingStop && (
                            <span className="rounded-md bg-teal-500/20 px-1.5 py-0.5 text-[9px] font-black text-teal-700 dark:text-teal-300">
                              Your Stop
                            </span>
                          )}
                          {isOrigin && (
                            <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                              Origin
                            </span>
                          )}
                          {isDestination && (
                            <span className="rounded-md bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-bold text-rose-600 dark:text-rose-400">
                              Terminus
                            </span>
                          )}

                          {/* Time to reach badge (e.g. 0m, +2m, +6m, +16m...) */}
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold shrink-0 shadow-2xs ${
                              isBoardingStop
                                ? "bg-teal-500/20 text-teal-800 dark:text-teal-200 font-extrabold border border-teal-400/40"
                                : isOrigin
                                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-extrabold"
                                : "bg-secondary text-foreground/80 border border-border"
                            }`}
                          >
                            {sIdx === 0 ? "0 min" : `+${offsetMin} min`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center text-[10px] text-muted-foreground mt-0.5">
                        <div className="flex items-center gap-1.5">
                          <span>Stop {sIdx + 1}</span>
                          {estArrivalTime && (
                            <>
                              <span>|</span>
                              <span className="font-semibold text-foreground/80">
                                {isOrigin ? "Departs" : "Arrives"} ~{estArrivalTime}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-border bg-secondary/20 p-3 text-center text-[11px] text-muted-foreground">
          <span>Timetable data from official Nagpur Aapli Bus schedule records • Total {activeRoute.tripsPerDay} departures daily</span>
        </div>
      </aside>
    </>
  );
}
