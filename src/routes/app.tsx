import ProtectedRoute from "../components/ProtectedRoute";


import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../context/AuthContext";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import PlaceSearch, { type Point } from "@/components/PlaceSearch";
import { Button } from "@/components/ui/button";
import {
  IndianRupee,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Bus,
  Calendar,
  Clock,
  Compass,
  Footprints,
  History,
  Info,
  Leaf,
  Loader2,
  LocateFixed,
  MapPin,
  Menu,
  Navigation2,
  Radio,
  Repeat,
  Route as RouteIcon,
  Smartphone,
  Sparkles,
  Timer,
  TrainFront,
  Trash2,
  X,
  Zap,
  Sprout,
  TrendingDown,
  Fuel,
  Wind,
  User,
  LogOut,
  Car,
  Ticket,
} from "lucide-react";
import TicketBookingModal from "@/components/TicketBookingModal";
import TicketWalletDrawer from "@/components/TicketWalletDrawer";
import {
  getActiveTickets,
  convertJourneyLegsToTransitLegs,
  type IssuedTicket,
  type TransitMode,
  type TransitLegItem,
} from "@/lib/ticketing";
import {
  fetchUserSavedJourneys,
  addUserSavedJourney,
  deleteUserSavedJourney,
} from "@/services/savedJourneysService";
import {
  fetchUserRecentJourneys,
  recordUserRecentJourney,
  clearUserRecentJourneys,
  type RecentJourneyRecord,
} from "@/services/recentJourneysService";
import { fetchUserEcoStats, type UserEcoStats } from "@/services/ecoRewardsService";
import { fetchUserTickets } from "@/services/ticketService";
import {
  planJourney,
  enrichWalkLegs,
  planFallbackDrivingJourney,
  networkStats,
  searchPlaces,
  type Journey,
  type Preference,
  PARAMS,
} from "@/lib/routing";
import { findNearby, fmtNearbyDist, type NearbyStop, type NearbyResult } from "@/lib/nearby";
import { findNearestPOIs, fetchLiveNearbyPOIs, fetchNagpurWidePOIs, type NearbyPoiResult } from "@/lib/nagpurPlaces";
import LiveBusTracker from "@/components/LiveBusTracker";
import CabOptions from "@/components/CabOptions";
import SideRouteAiExplainer from "@/components/SideRouteAiExplainer";
import AiTransitChatbot from "@/components/AiTransitChatbot";
import BusTimetablePanel from "@/components/BusTimetablePanel";
import GoogleMapsSearchBar from "@/components/GoogleMapsSearchBar";
import GoogleMapsLayersFAB, { type MapStyleType } from "@/components/GoogleMapsLayersFAB";
import MaterialTimePicker from "@/components/MaterialTimePicker";
import { GreenRewardsSection } from "@/components/GreenRewardsPanel";
import type { UberCabSearchResponse } from "@/lib/uberApi";
import {
  fetchLiveRouteInfo,
  fetchLiveRouteDetails,
  searchLiveBusRoutes,
  type LiveBusRoute,
  type LiveBusStop,
  type LiveRouteTelemetry,
} from "@/lib/liveBus";
import { executeAiSearchQuery } from "@/lib/n8nAiService";
import { searchLocalPlaces, searchOnlinePlaces, normalizeNagpurPlaceName } from "@/lib/placesSearch";

// MapView uses Leaflet which accesses `window` — must be client-only (no SSR)
const MapView = lazy(() =>
  import("@/components/MapView").then((m) => ({ default: m.default }))
);

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Eco-Move Nagpur" },
      {
        name: "description",
        content:
          "Plan multimodal journeys across Nagpur with buses, metro and walking connections. Fastest, least-walk, fewest-transfer and low-CO2 routes on an interactive map.",
      },
      { property: "og:title", content: "Eco-Move Nagpur" },
      {
        property: "og:description",
        content:
          "Graph-based last-mile public transport routing for Nagpur: walk, bus, metro and transfers in one plan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <Planner />
    </ProtectedRoute>
  ),
});

const PREFS: { id: Preference; label: string; icon: typeof Zap }[] = [
  { id: "balanced", label: "Best", icon: Sparkles },
  { id: "fastest", label: "Fastest", icon: Zap },
  { id: "cheapest", label: "Cheapest", icon: IndianRupee },
  { id: "least_walk", label: "Least walk", icon: Footprints },
  { id: "fewest_transfers", label: "Few transfers", icon: Repeat },
  { id: "low_co2", label: "Low CO₂", icon: Leaf },
];

const fmtDist = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`);
const fmtTime = (min: number) => {
  const t = Math.round(min);
  return t < 60 ? `${t} min` : `${Math.floor(t / 60)} h ${t % 60} min`;
};

function ModeIcon({ mode, line, className = "size-3.5" }: { mode: string; line?: string | undefined; className?: string | undefined }) {
  if (mode === "drive") return <Car className={`${className} text-red-700 dark:text-red-400`} />;
  if (mode === "bus") return <Bus className={className} />;
  if (mode === "metro") {
    const isBlue = (line ?? "").toLowerCase().includes("blue");
    const color = isBlue ? "#0088cc" : "#e05500";
    return <TrainFront className={className} style={{ color }} />;
  }
  return <Footprints className={className} />;
}

function ModeDot({ mode, line }: { mode: string; line?: string | undefined }) {
  let color = "bg-walk";
  if (mode === "drive") color = "bg-red-700";
  else if (mode === "bus") color = "bg-bus";
  else if (mode === "metro") {
    color = (line ?? "").toLowerCase().includes("blue") ? "bg-[#00aaff]" : "bg-[#ff6a00]";
  }
  return <span className={`size-3 shrink-0 rounded-full ring-4 ring-background ${color}`} />;
}

function JourneyCard({
  journey,
  active,
  onClick,
  index,
  onSelectBusTimetable,
}: {
  journey: Journey;
  active: boolean;
  onClick: () => void;
  index: number;
  onSelectBusTimetable?: (bus: {
    busNumber?: string | undefined;
    routeName?: string | undefined;
    fromStop?: string | undefined;
    toStop?: string | undefined;
  }) => void;
}) {
  const [openFreq, setOpenFreq] = useState<number | null>(null);

  // If this is a fallback driving journey (no public transit available)
  if (journey.isFallbackDrive || journey.legs[0]?.mode === "drive") {
    return (
      <div
        onClick={onClick}
        className={`cursor-pointer rounded-2xl border p-4 transition-all ${
          active
            ? "border-red-600 bg-red-500/10 shadow-md ring-1 ring-red-500/30 dark:bg-red-950/20"
            : "border-red-300 dark:border-red-900/40 bg-card hover:border-red-500/40 hover:shadow-sm"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="flex items-center gap-1 rounded-md bg-red-700 text-white px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                <Car className="size-3" /> Driving Fallback
              </span>
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                No Public Transit
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black tracking-tight text-foreground">
                {fmtTime(journey.totalTimeMin)}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">{fmtDist(journey.totalDistanceM)}</span>
            </div>
            {journey.departureTimeStr && journey.arrivalTimeStr && (
              <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-red-700 dark:text-red-400">
                <Clock className="size-3 shrink-0" />
                <span>
                  {journey.departureTimeStr} – {journey.arrivalTimeStr}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="flex items-center gap-0.5 rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-extrabold text-red-700 dark:text-red-300 shadow-2xs">
              <IndianRupee className="size-3" />
              ~{journey.totalFareRs ?? 0} fuel
            </span>
            <span className="rounded-full bg-red-100 dark:bg-red-950/60 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:text-red-400">
              Direct Road
            </span>
          </div>
        </div>

        {/* Fallback Driving Route Description */}
        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-red-800 dark:text-red-300 bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20">
          <Car className="size-3.5 shrink-0" />
          <span>Shortest direct driving path via municipal road network</span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-2xl border p-4 transition-all ${
        active
          ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/30"
          : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Option {index + 1}
          </span>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {fmtTime(journey.totalTimeMin)}
            </span>
            <span className="text-xs text-muted-foreground">{fmtDist(journey.totalDistanceM)}</span>
          </div>
          {journey.departureTimeStr && journey.arrivalTimeStr && (
            <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-primary">
              <Clock className="size-3 shrink-0" />
              <span>
                {journey.departureTimeStr} – {journey.arrivalTimeStr}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-extrabold text-emerald-700 dark:text-emerald-300 shadow-2xs">
            <IndianRupee className="size-3" />
            {journey.totalFareRs ?? 0}
          </span>
          {journey.transfers === 0 ? (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              Direct
            </span>
          ) : (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {journey.transfers} transfer{journey.transfers > 1 ? "s" : ""}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">
            walk {fmtDist(journey.walkDistanceM)}
          </span>
        </div>
      </div>

      {/* Legs summary bar */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {journey.legs.map((leg, i) => {
          const isBus = leg.mode === "bus";
          const isMetro = leg.mode === "metro";
          const isTransit = isBus || isMetro;
          const hasFreq = isTransit && (leg.frequencyMin ?? 0) > 0;
          const isOpen = openFreq === i;
          const isBlueMetro = isMetro && (leg.line ?? "").toLowerCase().includes("blue");
          const isOrangeMetro = isMetro && !isBlueMetro;

          return (
            <div key={i} className="relative flex items-center gap-1.5">
              {i > 0 && <ArrowRight className="size-3 text-muted-foreground" />}
              <span
                onClick={(e) => {
                  if (isBus && onSelectBusTimetable) {
                    e.stopPropagation();
                    onSelectBusTimetable({
                      busNumber: leg.busNumber,
                      routeName: leg.line,
                      fromStop: leg.from,
                      toStop: leg.to,
                    });
                    return;
                  }
                  if (hasFreq) {
                    e.stopPropagation();
                    setOpenFreq((cur) => (cur === i ? null : i));
                  }
                }}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  isBlueMetro
                    ? "border border-[#00aaff]/30 bg-[#00aaff]/15 text-[#0088cc] hover:bg-[#00aaff]/25"
                    : isOrangeMetro
                      ? "border border-[#ff6a00]/30 bg-[#ff6a00]/15 text-[#e05500] hover:bg-[#ff6a00]/25"
                      : isBus
                        ? "border border-bus/30 bg-bus/15 text-bus hover:bg-bus/25 active:scale-95 shadow-2xs font-semibold"
                        : "bg-secondary text-muted-foreground"
                } ${hasFreq || isBus ? "cursor-pointer select-none" : ""}`}
                title={
                  isBus
                    ? `Click to view Bus ${leg.busNumber || ""} daily timetable & schedule`
                    : hasFreq
                      ? "Click to view departure frequency"
                      : undefined
                }
              >
                <ModeIcon mode={leg.mode} line={leg.line} />
                <span className="max-w-[120px] truncate">
                  {isBus && leg.busNumber
                    ? `Bus ${leg.busNumber}`
                    : leg.line ?? `${Math.round(leg.timeMin)}m`}
                </span>
                {isBus ? (
                  <Calendar className="size-2.5 opacity-80 text-teal-600 dark:text-teal-400 ml-0.5 shrink-0" />
                ) : hasFreq ? (
                  <Timer className={`size-2.5 opacity-70 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                ) : null}
              </span>

              {/* Click-to-reveal Frequency Popover (for Metro) */}
              {isOpen && hasFreq && !isBus && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-1.5 text-[11px] font-medium text-popover-foreground shadow-lg animate-in fade-in zoom-in-95"
                >
                  <div className="flex items-center gap-1 text-primary">
                    <Timer className="size-3" />
                    <span>Every ~{leg.frequencyMin} min</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">avg frequency</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Itinerary({
  journey,
  origin,
  destination,
  onSelectBusTimetable,
}: {
  journey: Journey;
  origin: string;
  destination: string;
  onSelectBusTimetable?: (bus: {
    busNumber?: string | undefined;
    routeName?: string | undefined;
    fromStop?: string | undefined;
    toStop?: string | undefined;
  }) => void;
}) {
  const [openStopsIndex, setOpenStopsIndex] = useState<number | null>(null);

  const getTheme = (leg: Journey["legs"][number]) => {
    if (leg.mode === "metro") {
      const isBlue = (leg.line ?? "").toLowerCase().includes("blue");
      if (isBlue) {
        return {
          dotBg: "bg-[#00aaff]",
          lineBg: "bg-[#00aaff]",
          borderColor: "#00aaff50",
          bgColor: "#00aaff0c",
          textColor: "#0088cc",
          Icon: TrainFront,
        };
      }
      return {
        dotBg: "bg-[#ff6a00]",
        lineBg: "bg-[#ff6a00]",
        borderColor: "#ff6a0050",
        bgColor: "#ff6a000c",
        textColor: "#e05500",
        Icon: TrainFront,
      };
    }
    if (leg.mode === "drive") {
      return {
        dotBg: "bg-[#991b1b]",
        lineBg: "bg-[#991b1b]",
        borderColor: "#991b1b50",
        bgColor: "#991b1b0c",
        textColor: "#991b1b",
        Icon: Car,
      };
    }
    if (leg.mode === "bus") {
      return {
        dotBg: "bg-[#0d9488]",
        lineBg: "bg-[#0d9488]",
        borderColor: "#0d948850",
        bgColor: "#0d94880c",
        textColor: "#0d9488",
        Icon: Bus,
      };
    }
    return {
      dotBg: "bg-[#64748b]",
      lineBg: "border-l-2 border-dashed border-slate-300 dark:border-slate-600",
      borderColor: "transparent",
      bgColor: "transparent",
      textColor: "#64748b",
      Icon: Footprints,
    };
  };

  return (
    <div className="relative pt-1">
      {/* ── 1. Origin Node ── */}
      <div className="relative pb-4 pl-7">
        {/* Continuous Connecting Line to Next Item */}
        <div className="absolute bottom-[-4px] left-[10px] top-3 w-0.5 border-l-2 border-dashed border-slate-300 dark:border-slate-600" />
        {/* Origin Dot */}
        <span className="absolute left-[5px] top-1 z-10 size-3 rounded-full bg-[#0f172a] ring-4 ring-background dark:bg-white" />
        <div className="text-xs font-bold text-foreground leading-tight">{origin}</div>
      </div>

      {/* ── 2. Journey Legs ── */}
      {journey.legs.map((leg, i) => {
        const theme = getTheme(leg);
        const Icon = theme.Icon;

        if (leg.mode === "walk") {
          return (
            <div key={i} className="relative pb-4 pl-7">
              {/* Continuous Dashed Line */}
              <div className="absolute bottom-[-4px] left-[10px] top-2 w-0.5 border-l-2 border-dashed border-slate-300 dark:border-slate-600" />
              {/* Walk Dot */}
              <span className="absolute left-[6px] top-1.5 z-10 size-2.5 rounded-full bg-[#64748b] ring-2 ring-background" />

              {/* Walk Text Row (Matching Image 2) */}
              <div className="flex flex-col gap-0.5 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Footprints className="size-3.5 shrink-0 text-slate-500" />
                  <span className="font-bold text-foreground">Walk {fmtDist(leg.distanceM)}</span>
                  <span>({Math.round(leg.timeMin)} min)</span>
                  <span className="truncate">to {leg.to}</span>
                </div>
                {leg.departureTimeStr && leg.arrivalTimeStr && (
                  <div className="text-[11px] font-semibold text-muted-foreground pl-5">
                    {leg.departureTimeStr} – {leg.arrivalTimeStr}
                  </div>
                )}
              </div>
            </div>
          );
        }

        if (leg.mode === "drive") {
          return (
            <div key={i} className="relative pb-4 pl-7">
              {/* Solid Red Connecting Line */}
              <div className="absolute bottom-[-4px] left-[10px] top-2.5 w-0.5 bg-red-700" />
              {/* Drive Dot */}
              <span className="absolute left-[4px] top-2 z-10 size-3.5 rounded-full ring-4 ring-background bg-red-700 text-white flex items-center justify-center text-[8px]" />

              {/* Driving Fallback Card */}
              <div className="rounded-2xl border p-3.5 shadow-sm border-red-500/30 bg-red-500/5 dark:bg-red-950/20">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-red-700 text-white shadow-xs">
                      <Car className="size-4" />
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-xs text-red-800 dark:text-red-300">
                          Drive via Shortest Road
                        </span>
                        <span className="rounded-full bg-red-100 dark:bg-red-950 px-1.5 py-0.2 text-[9px] font-bold text-red-700 dark:text-red-400">
                          Direct
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {fmtDist(leg.distanceM)} (~{Math.round(leg.timeMin)} min drive)
                      </div>
                    </div>
                  </div>

                  {leg.departureTimeStr && leg.arrivalTimeStr && (
                    <div className="text-right text-[11px] font-bold text-red-700 dark:text-red-400">
                      {leg.departureTimeStr} – {leg.arrivalTimeStr}
                    </div>
                  )}
                </div>

                <div className="mt-2.5 space-y-1 text-xs border-t border-red-500/20 pt-2 text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Estimated Fuel / Vehicle Cost:</span>
                    <span className="font-bold text-foreground">₹{leg.fareRs}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span>Road Distance:</span>
                    <span className="font-medium text-foreground">{fmtDist(leg.distanceM)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        // Bus / Metro Transit Leg Card
        return (
          <div key={i} className="relative pb-4 pl-7">
            {/* Solid Colored Spine Line */}
            <div
              className={`absolute bottom-[-4px] left-[10px] top-2.5 w-0.5 ${theme.lineBg}`}
            />
            {/* Transit Step Colored Dot */}
            <span
              className={`absolute left-[4px] top-2 z-10 size-3.5 rounded-full ring-4 ring-background ${theme.dotBg}`}
            />

            {/* Transit Step Card (Matching Image 2) */}
            <div
              className="rounded-2xl border p-3.5 shadow-sm transition hover:shadow-md"
              style={{
                borderColor: theme.borderColor,
                backgroundColor: theme.bgColor,
              }}
            >
              {/* Row 1: Line Name & Icon (left) + Frequency (right) */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Icon className="size-4" style={{ color: theme.textColor }} />
                  {leg.mode === "bus" && leg.busNumber && (
                    <button
                      type="button"
                      onClick={() =>
                        onSelectBusTimetable?.({
                          busNumber: leg.busNumber,
                          routeName: leg.line,
                          fromStop: leg.from,
                          toStop: leg.to,
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-md bg-teal-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white shadow-xs transition hover:bg-teal-700 active:scale-95 cursor-pointer"
                      title="Click to view full bus timetable"
                    >
                      <span>BUS {leg.busNumber}</span>
                      <Calendar className="size-2.5 opacity-80" />
                    </button>
                  )}
                  <span className="text-xs font-bold" style={{ color: theme.textColor }}>
                    {leg.line ?? leg.mode}
                  </span>
                  {leg.fareRs !== undefined && (
                    <span className="flex items-center gap-0.5 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300">
                      <IndianRupee className="size-2.5" />
                      {leg.fareRs}
                    </span>
                  )}
                </div>
                {leg.frequencyRating === "high" ? (
                  <span className="flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400">
                    🔥 Every ~{leg.frequencyMin || 10}m
                  </span>
                ) : leg.frequencyRating === "low" ? (
                  <span className="flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                    ⚠️ {leg.tripsPerDay ? `${leg.tripsPerDay} trips/day` : "Low freq"}
                  </span>
                ) : leg.frequencyMin ? (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Timer className="size-3" />
                    <span>every {leg.frequencyMin} min</span>
                  </span>
                ) : null}
              </div>

              {/* Row 2: Board at ... Get down at ... */}
              <p className="mt-2 text-xs text-foreground leading-relaxed">
                <span className="text-muted-foreground">Board at </span>
                <span className="font-bold">{leg.from}</span>
                <span className="text-muted-foreground"> · Get down at </span>
                <span className="font-bold">{leg.to}</span>
              </p>

              {/* Exact scheduled times */}
              {(leg.departureTimeStr || leg.arrivalTimeStr) && (
                <div className="mt-2 flex items-center justify-between flex-wrap gap-1 text-[11px] pt-1.5 border-t border-border/40">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Clock className="size-3 text-primary shrink-0" />
                    <span>Departs: <strong className="text-primary">{leg.departureTimeStr}</strong> · Arrives: <strong>{leg.arrivalTimeStr}</strong></span>
                  </div>
                  {leg.nextDepartures && leg.nextDepartures.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      Next: {leg.nextDepartures.join(", ")}
                    </span>
                  )}
                </div>
              )}

              {/* Row 3: Stops count · Distance · Time */}
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {leg.stops && leg.stops.length > 1 && (
                  <>
                    <span>{leg.stops.length - 1} stops</span>
                    <span>·</span>
                  </>
                )}
                <span>{fmtDist(leg.distanceM)}</span>
                <span>·</span>
                <span>{Math.round(leg.timeMin)} min</span>
              </div>

              {/* Row 4: Intermediate Stops Collapsible */}
              {leg.stops && leg.stops.length > 2 && (
                <div className="mt-2 border-t border-border/40 pt-1.5">
                  <button
                    type="button"
                    onClick={() => setOpenStopsIndex((prev) => (prev === i ? null : i))}
                    className="flex items-center gap-1 text-[11px] font-bold transition hover:underline"
                    style={{ color: theme.textColor }}
                  >
                    <span className="text-[9px]">{openStopsIndex === i ? "▼" : "▶"}</span>
                    <span>{openStopsIndex === i ? "Hide intermediate stops" : "Show intermediate stops"}</span>
                  </button>

                  {openStopsIndex === i && (
                    <ul className="mt-1.5 space-y-0.5 border-l-2 pl-2.5 text-[11px] text-muted-foreground animate-in fade-in duration-200"
                      style={{ borderColor: theme.borderColor }}
                    >
                      {leg.stops.slice(1, -1).map((s, idx) => (
                        <li key={idx} className="py-0.5">• {s}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Row 5: View Full Daily Bus Timetable Action Button */}
              {leg.mode === "bus" && (
                <button
                  type="button"
                  onClick={() =>
                    onSelectBusTimetable?.({
                      busNumber: leg.busNumber,
                      routeName: leg.line,
                      fromStop: leg.from,
                      toStop: leg.to,
                    })
                  }
                  className="mt-2.5 flex w-full items-center justify-between rounded-xl border border-teal-500/25 bg-teal-500/10 px-3 py-1.5 text-xs font-bold text-teal-700 dark:text-teal-300 transition hover:bg-teal-500/20 active:scale-98 cursor-pointer shadow-2xs"
                >
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-teal-600 dark:text-teal-400" />
                    <span>View Bus Timetable ({leg.tripsPerDay ? `${leg.tripsPerDay} trips/day` : "All schedules"})</span>
                  </span>
                  <span className="text-[11px] opacity-80 flex items-center gap-0.5 font-semibold">
                    Open <ArrowRight className="size-3" />
                  </span>
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* ── 3. Destination Node ── */}
      <div className="relative pl-7">
        {/* Destination Red Dot */}
        <span className="absolute left-[4px] top-0.5 z-10 size-3.5 rounded-full bg-[#dc2626] ring-4 ring-background" />
        <div className="text-xs font-bold text-foreground leading-tight">{destination}</div>
      </div>
    </div>
  );
}

// ─── Google Maps Saved Places & Popular Routes ──────────────────────────────

interface SavedPlaceItem {
  id: string;
  name: string;
  category: string;
  desc: string;
  lat: number;
  lon: number;
  iconText: string;
  iconBg: string;
}

const POPULAR_SAVED_PLACES: SavedPlaceItem[] = [
  {
    id: "sitabuldi",
    name: "Sitabuldi Interchange",
    category: "Metro & Bus Terminal",
    desc: "Central interchange connecting Blue & Orange lines",
    lat: 21.1414,
    lon: 79.0825,
    iconText: "ST",
    iconBg: "bg-blue-600",
  },
  {
    id: "airport",
    name: "Dr. Babasaheb Ambedkar Airport",
    category: "Airport & Metro Station",
    desc: "Nagpur International Airport on Wardha Road",
    lat: 21.0864,
    lon: 79.0638,
    iconText: "AIR",
    iconBg: "bg-amber-600",
  },
  {
    id: "railway-station",
    name: "Nagpur Railway Station",
    category: "Main Railway Junction",
    desc: "Central railway hub with metro access",
    lat: 21.1528,
    lon: 79.0886,
    iconText: "NGP",
    iconBg: "bg-emerald-600",
  },
  {
    id: "futala",
    name: "Futala Lake Waterfront",
    category: "Lake & Recreation",
    desc: "Iconic recreational promenade in West Nagpur",
    lat: 21.1542,
    lon: 79.0435,
    iconText: "FUT",
    iconBg: "bg-cyan-600",
  },
  {
    id: "dharampeth",
    name: "Dharampeth Market",
    category: "Shopping & Dining",
    desc: "Major commercial hub with transit access",
    lat: 21.1418,
    lon: 79.0601,
    iconText: "DHP",
    iconBg: "bg-purple-600",
  },
  {
    id: "dream-valley",
    name: "Dream Valley Resort",
    category: "Hingna Destination",
    desc: "Popular destination spot in Hingna, Digdoh",
    lat: 21.1006,
    lon: 78.9903,
    iconText: "DVR",
    iconBg: "bg-teal-600",
  },
  {
    id: "indira-maidan",
    name: "Indira Maidan",
    category: "Public Sports Ground",
    desc: "Cultural & sports ground in East Nagpur",
    lat: 21.1480,
    lon: 79.1250,
    iconText: "IND",
    iconBg: "bg-rose-600",
  },
];

interface PopularRoutePreset {
  id: string;
  title: string;
  badge: string;
  from: { name: string; lat: number; lon: number };
  to: { name: string; lat: number; lon: number };
}

const POPULAR_ROUTE_PRESETS: PopularRoutePreset[] = [
  {
    id: "sitabuldi-airport",
    title: "Eco-Move Nagpur",
    badge: "Metro (Orange Line)",
    from: { name: "Sitabuldi (Interchange)", lat: 21.1414, lon: 79.0825 },
    to: { name: "Airport", lat: 21.0864, lon: 79.0638 },
  },
  {
    id: "pardi-jaitala",
    title: "Eco-Move Nagpur",
    badge: "Bus Route 72B",
    from: { name: "Pardi", lat: 21.1497, lon: 79.1578 },
    to: { name: "Jaitala", lat: 21.1012, lon: 79.0256 },
  },
  {
    id: "dharampeth-prajapati",
    title: "Eco-Move Nagpur",
    badge: "Metro (Blue Line)",
    from: { name: "Dharampeth College", lat: 21.1395, lon: 79.0558 },
    to: { name: "Prajapati Nagar", lat: 21.1503, lon: 79.1490 },
  },
];

export interface SavedJourneyItem {
  id: string;
  savedAt: number | string;
  origin: Point;
  destination: Point;
  preference?: Preference;
  totalTimeMin: number;
  totalFareRs?: number;
  totalDistanceM: number;
  transitDistanceM?: number;
  transfers: number;
  walkDistanceM: number;
  co2g: number;
  legs: { mode: string; line?: string | undefined; busNumber?: string | undefined; timeMin: number; from?: string; to?: string }[];
}

// ─────────────────────────────────────────────────────────────────────────────

function Planner() {
  const { user, profile, signOut } = useAuth();
  const userId = user?.id || "guest";
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  
  const [origin, setOrigin] = useState<Point | null>(null);
  const [destination, setDestination] = useState<Point | null>(null);
  const [pref, setPref] = useState<Preference>("balanced");
  const [departureTime, setDepartureTime] = useState<string>("now");

  // User-scoped Database States
  const [savedJourneys, setSavedJourneys] = useState<SavedJourneyItem[]>([]);
  const [recentJourneys, setRecentJourneys] = useState<RecentJourneyRecord[]>([]);
  const [userEcoStats, setUserEcoStats] = useState<UserEcoStats>({
    userId: "",
    totalCo2SavedKg: 0,
    greenTripsCount: 0,
    claimedRewardIds: [],
    updatedAt: new Date().toISOString(),
  });

  const getDepartureMinutes = () => {
    if (departureTime === "now" || !departureTime) {
      const now = new Date();
      return now.getHours() * 60 + now.getMinutes();
    }
    const [hStr, mStr] = departureTime.split(":");
    const h = parseInt(hStr ?? "0", 10);
    const m = parseInt(mStr ?? "0", 10);
    // Guard against NaN from partial input (e.g. user types "07" with no colon)
    return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
  };
  const [picking, setPicking] = useState<"origin" | "destination" | "cab_origin" | "cab_destination" | null>(null);
  const [showNetwork, setShowNetwork] = useState(false);
  const [showBusStops, setShowBusStops] = useState(false);
  const [showMetroStations, setShowMetroStations] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyleType>("carto");
  const [selected, setSelected] = useState(0);
  const [result, setResult] = useState<{ journeys: Journey[]; error?: string } | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [selectedBusTimetable, setSelectedBusTimetable] = useState<{
    busNumber?: string | undefined;
    routeName?: string | undefined;
    fromStop?: string | undefined;
    toStop?: string | undefined;
  } | null>(null);
  // Cancellation token: each plan() call mints a new token. A newer call marks the
  // previous token as cancelled so stale setResult calls are silently discarded.
  const planTokenRef = useRef<{ cancelled: boolean }>({ cancelled: false });
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  // Digital Smart Tickets & Wallet State
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isWalletDrawerOpen, setIsWalletDrawerOpen] = useState(false);
  const [activeTicketsCount, setActiveTicketsCount] = useState(0);
  const [ticketModalPreFill, setTicketModalPreFill] = useState<{
    from?: string | undefined;
    to?: string | undefined;
    mode?: TransitMode | undefined;
    legs?: TransitLegItem[] | undefined;
    isLockedRoute?: boolean | undefined;
  }>({});

  const refreshActiveTicketsCount = async () => {
    const list = await fetchUserTickets(userId);
    const active = list.filter((t) => t.status === "active" && t.currentLegStep !== "completed");
    setActiveTicketsCount(active.length);
  };

  // Load all user-specific database assets when user session changes
  useEffect(() => {
    let isSubscribed = true;

    const loadUserData = async () => {
      const [saved, recents, eco, tickets] = await Promise.all([
        fetchUserSavedJourneys(userId),
        fetchUserRecentJourneys(userId),
        fetchUserEcoStats(userId),
        fetchUserTickets(userId),
      ]);

      if (isSubscribed) {
        setSavedJourneys(saved);
        setRecentJourneys(recents);
        setUserEcoStats(eco);
        const active = tickets.filter(
          (t) => t.status === "active" && t.currentLegStep !== "completed"
        );
        setActiveTicketsCount(active.length);
      }
    };

    void loadUserData();

    const interval = setInterval(refreshActiveTicketsCount, 4000);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [userId]);

  const handleOpenTicketBookingWithRoute = (preFill?: {
    from?: string | undefined;
    to?: string | undefined;
    mode?: TransitMode | undefined;
    legs?: TransitLegItem[] | undefined;
    isLockedRoute?: boolean | undefined;
  } | undefined) => {
    if (preFill) {
      setTicketModalPreFill(preFill);
    } else {
      const transitLegs: TransitLegItem[] = journey
        ? convertJourneyLegsToTransitLegs(journey.legs)
        : [];

      setTicketModalPreFill({
        from: origin?.name,
        to: destination?.name,
        mode:
          journey?.legs.some((l) => l.mode === "metro") && journey?.legs.some((l) => l.mode === "bus")
            ? "combo"
            : journey?.legs.some((l) => l.mode === "metro")
            ? "metro"
            : journey?.legs.some((l) => l.mode === "bus")
            ? "bus"
            : "combo",
        legs: transitLegs.length > 0 ? transitLegs : undefined,
        isLockedRoute: Boolean(journey && transitLegs.length > 0),
      });
    }
    setIsTicketModalOpen(true);
  };

  // Automatically clear planned route recommendations and map polylines when source or destination is cleared
  useEffect(() => {
    if (!origin || !destination) {
      setResult(null);
      setSelected(0);
      setSelectedBusTimetable(null);
    }
  }, [origin, destination]);

  // Google Maps Style Navigation Rail state (Initial load starts with search bar over map)
  const [cardOpen, setCardOpen] = useState(false);
  const [activeRailItem, setActiveRailItem] = useState<"nearby" | "directions" | "live" | "cabs" | "saved" | "recents" | "stats" | "eco">("directions");

  // Google Maps Floating Search Bar selected location
  const [searchedLocation, setSearchedLocation] = useState<{
    lat: number;
    lon: number;
    name: string;
    subtitle?: string | undefined;
  } | null>(null);

  // Nearby POI state (Restaurants & Hospitals)
  const [activePoiCategory, setActivePoiCategory] = useState<"Restaurant" | "Hospital" | null>(null);
  const [poiMarkers, setPoiMarkers] = useState<NearbyPoiResult[]>([]);

  const handleTogglePoiCategory = (category: "Restaurant" | "Hospital") => {
    if (activePoiCategory === category) {
      setActivePoiCategory(null);
      setPoiMarkers([]);
      return;
    }

    let refLat = 21.1458;
    let refLon = 79.0882;
    if (origin && typeof origin.lat === "number" && !isNaN(origin.lat)) {
      refLat = origin.lat;
      refLon = origin.lon;
    } else if (searchedLocation && typeof searchedLocation.lat === "number") {
      refLat = searchedLocation.lat;
      refLon = searchedLocation.lon;
    }

    // 1. Instant local results for snappy response
    const initialResults = findNearestPOIs(refLat, refLon, category, 25);
    setPoiMarkers(initialResults);
    setActivePoiCategory(category);

    // 2. Fetch 60–100+ accurate real-world Google Places across all zones of Nagpur in parallel
    fetchNagpurWidePOIs(refLat, refLon, category).then((liveGoogleResults) => {
      if (liveGoogleResults.length > 0) {
        setPoiMarkers(liveGoogleResults);
      }
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const liveLat = pos.coords.latitude;
          const liveLon = pos.coords.longitude;
          if (!origin || origin.name !== "Your location") {
            setOrigin({ lat: liveLat, lon: liveLon, name: "Your location" });
          }
          fetchNagpurWidePOIs(liveLat, liveLon, category).then((liveResults) => {
            if (liveResults.length > 0) {
              setPoiMarkers(liveResults);
            }
          });
        },
        (err) => {
          console.warn("Geolocation for POI discovery:", err);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  // Standalone Uber Cab Options state
  const [cabOrigin, setCabOrigin] = useState<Point | null>(null);
  const [cabDestination, setCabDestination] = useState<Point | null>(null);
  const [cabSearchResults, setCabSearchResults] = useState<UberCabSearchResponse | null>(null);
  const [isCabLoading, setIsCabLoading] = useState(false);

  // Healthy API Management: Flush all cab details and pending data whenever switching away from Cabs
  useEffect(() => {
    if (activeRailItem !== "cabs") {
      setCabSearchResults(null);
      setCabOrigin(null);
      setCabDestination(null);
      setIsCabLoading(false);
    }
  }, [activeRailItem]);

  // Nearby Transit state
  const [nearbyRadiusM, setNearbyRadiusM] = useState(2500);
  const [nearbyAnchor, setNearbyAnchor] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [nearbyLocating, setNearbyLocating] = useState(false);
  const [nearbyLocError, setNearbyLocError] = useState<string | null>(null);

  // Live Bus Tracking state (powered by Chalo API)
  const LIVE_BUS_REFRESH_INTERVAL_SEC = 5; // <--- Change this number to adjust auto-refresh seconds (e.g. 5, 10, 15)
  const [selectedLiveRoute, setSelectedLiveRoute] = useState<LiveBusRoute | null>(null);
  const [liveBusSearchQuery, setLiveBusSearchQuery] = useState("");
  const [liveTelemetry, setLiveTelemetry] = useState<LiveRouteTelemetry | null>(null);
  const [selectedLiveStop, setSelectedLiveStop] = useState<LiveBusStop | null>(null);
  const [isLivePolling, setIsLivePolling] = useState(false);
  const [liveRefreshCountdown, setLiveRefreshCountdown] = useState(LIVE_BUS_REFRESH_INTERVAL_SEC);

  // Dynamically enrich selectedLiveRoute with Chalo's real-time stop coordinates and road polyline
  useEffect(() => {
    if (!selectedLiveRoute || selectedLiveRoute.isLiveEnriched) return;

    let isSubscribed = true;
    const loadDynamicRoute = async () => {
      const rid = selectedLiveRoute.route_id;
      try {
        const details = await fetchLiveRouteDetails(rid);
        if (details && details.stops.length > 0 && isSubscribed) {
          setSelectedLiveRoute((prev) => {
            if (!prev || prev.id !== selectedLiveRoute.id) return prev;
            return {
              ...prev,
              route_id: rid,
              stops: details.stops.map((s) => ({
                ...s,
                bus_number: prev.display_bus_number || prev.bus_number,
              })),
              stopsCount: details.stops.length,
              polyline: details.polyline,
              isLiveEnriched: true,
            };
          });
        }
      } catch {
        // ignore
      }
    };

    void loadDynamicRoute();
    return () => {
      isSubscribed = false;
    };
  }, [selectedLiveRoute]);

  // Auto-refresh polling for Live Bus Tracking
  useEffect(() => {
    if (activeRailItem !== "live" || !selectedLiveRoute) {
      setLiveTelemetry(null);
      setLiveRefreshCountdown(LIVE_BUS_REFRESH_INTERVAL_SEC);
      return;
    }

    let isSubscribed = true;
    const stopIds = selectedLiveRoute.stops.map((s) => s.stop_id);

    const poll = async () => {
      if (!isSubscribed) return;
      setIsLivePolling(true);
      try {
        const data = await fetchLiveRouteInfo(selectedLiveRoute.route_id, stopIds);
        if (isSubscribed) {
          setLiveTelemetry(data);
          setLiveRefreshCountdown(LIVE_BUS_REFRESH_INTERVAL_SEC);
        }
      } finally {
        if (isSubscribed) setIsLivePolling(false);
      }
    };

    // Initial fetch immediately
    void poll();

    // 1-second countdown interval with auto-refresh polling cycle
    const interval = setInterval(() => {
      setLiveRefreshCountdown((prev) => {
        if (prev <= 1) {
          void poll();
          return LIVE_BUS_REFRESH_INTERVAL_SEC;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [activeRailItem, selectedLiveRoute]);

  const handleManualLiveRefresh = async () => {
    if (!selectedLiveRoute) return;
    setIsLivePolling(true);
    try {
      const stopIds = selectedLiveRoute.stops.map((s) => s.stop_id);
      const data = await fetchLiveRouteInfo(selectedLiveRoute.route_id, stopIds);
      setLiveTelemetry(data);
      setLiveRefreshCountdown(LIVE_BUS_REFRESH_INTERVAL_SEC);
    } finally {
      setIsLivePolling(false);
    }
  };

  const nearbyResults = useMemo<NearbyResult>(
    () => (nearbyAnchor ? findNearby(nearbyAnchor, nearbyRadiusM) : { busStops: [], metroStations: [] }),
    [nearbyAnchor, nearbyRadiusM],
  );
  const nearbyMarkers = useMemo(
    () => [...nearbyResults.busStops, ...nearbyResults.metroStations],
    [nearbyResults],
  );

  // Guard: Leaflet requires the browser DOM — never render the map during SSR
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const handleGetLocation = (target: "origin" | "destination" | "cab_origin" | "cab_destination" = "origin") => {
    if (!navigator.geolocation) {
      setLocError("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const point: Point = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          name: "Your location",
        };
        if (target === "origin") {
          setOrigin(point);
        } else if (target === "destination") {
          setDestination(point);
        } else if (target === "cab_origin") {
          setCabOrigin(point);
        } else if (target === "cab_destination") {
          setCabDestination(point);
        }
        setPicking(null);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocError("Location access denied. Please allow it in your browser settings.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setLocError("Location unavailable. Try again or search manually.");
        } else {
          setLocError("Could not get your location. Please try again.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

    /** Plan a journey: fast local search first (< 50ms), then enrich selected journeys with ORS.
   *
   * @param overrideOrigin      - Optional origin point (bypasses state)
   * @param overrideDestination - Optional destination point (bypasses state)
   * @param overridePref        - Optional preference to use immediately. Pass this from
   *                              preference chip onClick handlers because setPref() is async
   *                              and the closure still holds the OLD pref value when plan()
   *                              is called in the same event handler.
   */
  const plan = async (overrideOrigin?: Point, overrideDestination?: Point, overridePref?: Preference) => {
    const o = overrideOrigin ?? origin;
    const d = overrideDestination ?? destination;
    if (!o || !d) return;

    // --- Race-condition guard ---
    // Cancel any previously in-flight plan() by marking its token stale.
    // Any stale setResult() calls will check this flag and silently discard their update.
    const prevToken = planTokenRef.current;
    prevToken.cancelled = true;
    const token = { cancelled: false };
    planTokenRef.current = token;
    // ----------------------------

    const activePref = overridePref ?? pref;

    setSelected(0);
    setIsPlanning(true);
    setEnriching(false);

    try {
      const depMin = getDepartureMinutes();
      // 1. Fast local graph search completes immediately (< 50ms)
      const raw = await planJourney(o, d, activePref, depMin);

      // Discard if a newer plan() call already started
      if (token.cancelled) return;

      setIsPlanning(false);
      setResult(raw);

      if (!raw.journeys.length) {
        // Fallback: When NO public transport route is available, compute shortest driving road route!
        setIsPlanning(true);
        const fallbackDrive = await planFallbackDrivingJourney(o, d, departureTime);
        if (token.cancelled) return;
        setIsPlanning(false);
        setResult({
          journeys: [fallbackDrive],
          ...(raw.error ? { error: raw.error } : {}),
        });
        return;
      }

      setEnriching(true);
      // 2. Enrich walking legs with real ORS street polylines & exact walking metrics
      const enriched = await Promise.all(
        raw.journeys.map((j) => enrichWalkLegs(j, o, d, activePref)),
      );

      // Discard if a newer plan() call superseded this one during enrichment
      if (token.cancelled) return;

      setResult({ ...raw, journeys: enriched });

      // Automatically record in user-scoped recent history
      if (o && d && enriched.length > 0) {
        void recordUserRecentJourney(userId, o, d).then((rec) => {
          if (rec) {
            setRecentJourneys((prev) => [rec, ...prev.filter((r) => r.id !== rec.id)].slice(0, 10));
          }
        });
      }
    } finally {
      if (!token.cancelled) {
        setIsPlanning(false);
        setEnriching(false);
      }
    }
  };

  /** Triggered by "Navigate / Go" in Nearby panel */
  const handleNavigateToNearby = (stop: NearbyStop) => {
    if (!nearbyAnchor) return;
    const newOrigin: Point = { lat: nearbyAnchor.lat, lon: nearbyAnchor.lon, name: nearbyAnchor.name };
    const newDest: Point = { lat: stop.lat, lon: stop.lon, name: stop.name };
    setOrigin(newOrigin);
    setDestination(newDest);
    setActiveRailItem("directions");
    setCardOpen(true);
    setResult(null);
    plan(newOrigin, newDest);
  };

  /** Handle selecting a saved landmark */
  const handleSelectSavedPlace = (place: SavedPlaceItem, mode: "nearby" | "origin" | "destination") => {
    const point: Point = { lat: place.lat, lon: place.lon, name: place.name };
    if (mode === "nearby") {
      setNearbyAnchor(point);
      setActiveRailItem("nearby");
      setCardOpen(true);
    } else if (mode === "origin") {
      setOrigin(point);
      setActiveRailItem("directions");
      setCardOpen(true);
    } else {
      setDestination(point);
      setActiveRailItem("directions");
      setCardOpen(true);
    }
  };

  /** Handle selecting a preset commuter route */
  const handleSelectRoutePreset = (preset: PopularRoutePreset) => {
    setOrigin(preset.from);
    setDestination(preset.to);
    setActiveRailItem("directions");
    setCardOpen(true);
    setResult(null);
    plan(preset.from, preset.to);
  };

  /** Resolves natural language place names to geographic coordinates */
  const resolvePlaceCoordinates = async (name: string): Promise<Point | null> => {
    if (!name || !name.trim()) return null;
    const trimmed = name.trim();
    const lower = trimmed.toLowerCase();
    if ([
      "me", "here", "current location", "your location", "my location",
      "mere location", "meri location", "apni location", "user location",
      "mere location se", "meri location se"
    ].includes(lower)) {
      if (origin) return origin;
      return { lat: 21.1458, lon: 79.0882, name: "Your location" };
    }

    // 1. Check local indexed transit stops & POIs (with raw & normalized name)
    const local = searchLocalPlaces(trimmed, 4);
    if (local.length > 0 && local[0]) {
      return { lat: local[0].lat, lon: local[0].lon, name: local[0].name };
    }

    const normalized = normalizeNagpurPlaceName(trimmed);
    if (normalized && normalized !== lower) {
      const localNorm = searchLocalPlaces(normalized, 4);
      if (localNorm.length > 0 && localNorm[0]) {
        return { lat: localNorm[0].lat, lon: localNorm[0].lon, name: localNorm[0].name };
      }
    }

    // 2. Try online geocoding
    try {
      const online = await searchOnlinePlaces(trimmed);
      if (online.length > 0 && online[0]) {
        return { lat: online[0].lat, lon: online[0].lon, name: online[0].name };
      }
      if (normalized && normalized !== lower) {
        const onlineNorm = await searchOnlinePlaces(normalized);
        if (onlineNorm.length > 0 && onlineNorm[0]) {
          return { lat: onlineNorm[0].lat, lon: onlineNorm[0].lon, name: onlineNorm[0].name };
        }
      }
    } catch {
      // ignore
    }

    // 3. Fallback to searchablePlaces in routing
    const fallback = searchPlaces(trimmed, 4);
    if (fallback.length > 0 && fallback[0]) {
      return { lat: fallback[0].lat, lon: fallback[0].lon, name: fallback[0].name };
    }
    if (normalized && normalized !== lower) {
      const fallbackNorm = searchPlaces(normalized, 4);
      if (fallbackNorm.length > 0 && fallbackNorm[0]) {
        return { lat: fallbackNorm[0].lat, lon: fallbackNorm[0].lon, name: fallbackNorm[0].name };
      }
    }

    return null;
  };

  /** AI-powered voice & natural language command orchestrator */
  const handleAiSearchCommand = async (userQuery: string) => {
    const userLocName = origin?.name || "Your location";
    const aiResult = await executeAiSearchQuery(userQuery, userLocName);

    if (aiResult.intent === "PLAN_ROUTE") {
      let destPoint: Point | null = null;
      if (aiResult.destination) {
        destPoint = await resolvePlaceCoordinates(aiResult.destination);
      }

      const isCurrentLocOrigin = !aiResult.origin || [
        "me", "here", "your location", "current location", "my location",
        "mere location", "meri location", "apni location", "user location",
        "mere location se", "meri location se"
      ].includes(aiResult.origin.toLowerCase().trim());

      let origPoint: Point | null = origin;
      if (!isCurrentLocOrigin && aiResult.origin) {
        origPoint = await resolvePlaceCoordinates(aiResult.origin);
      } else if (!origPoint) {
        origPoint = { lat: 21.1458, lon: 79.0882, name: "Your location" };
      }

      // If user requested current location, attempt live GPS fetch in background to pin exact coordinates
      if (isCurrentLocOrigin && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const livePoint: Point = {
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
              name: "Your location",
            };
            setOrigin(livePoint);
            if (destPoint) {
              plan(livePoint, destPoint, aiResult.preference || pref);
            }
          },
          () => {},
          { enableHighAccuracy: true, timeout: 6000 }
        );
      }

      if (destPoint) {
        setDestination(destPoint);
        if (origPoint) setOrigin(origPoint);
        if (aiResult.preference) {
          setPref(aiResult.preference);
        }

        // Set departureTime: "now" if abhi / immediate / now
        const rawTime = (aiResult.departureTime || "now").toLowerCase().trim();
        if (["now", "abhi", "abhi ke abhi", "current", "immediate", "right now"].includes(rawTime)) {
          setDepartureTime("now");
        } else {
          setDepartureTime(aiResult.departureTime || "now");
        }

        setActiveRailItem("directions");
        setCardOpen(true);
        setSearchedLocation(null);
        setResult(null);
        if (origPoint) {
          plan(origPoint, destPoint, aiResult.preference || pref);
        }
        return {
          success: true,
          message: `🎯 ${aiResult.message}\nRouting: ${origPoint?.name || "Your location"} ➔ ${destPoint.name} (${aiResult.preference || "fastest"})${aiResult.departureTime && aiResult.departureTime !== "now" ? ` at ${aiResult.departureTime}` : " (Now)"}.`,
          intent: "PLAN_ROUTE",
        };
      } else {
        return {
          success: false,
          message: `⚠️ Could not find location "${aiResult.destination}". Please try searching another place in Nagpur.`,
          intent: "PLAN_ROUTE",
        };
      }
    } else if (aiResult.intent === "FIND_NEARBY") {
      let anchorPoint: Point | null = null;
      if (
        aiResult.nearbyLocation &&
        !["me", "your location", "current location", "my location", "here"].includes(aiResult.nearbyLocation.toLowerCase())
      ) {
        anchorPoint = await resolvePlaceCoordinates(aiResult.nearbyLocation);
      } else if (origin) {
        anchorPoint = origin;
      } else {
        anchorPoint = { lat: 21.1458, lon: 79.0882, name: "Your location" };
      }

      if (anchorPoint) {
        setNearbyAnchor(anchorPoint);
        if (aiResult.nearbyRadiusM) {
          setNearbyRadiusM(aiResult.nearbyRadiusM);
        }
        setActiveRailItem("nearby");
        setCardOpen(true);
        setSearchedLocation(null);
        return {
          success: true,
          message: `📍 ${aiResult.message}\nDisplaying nearby transit within ${((aiResult.nearbyRadiusM || 1500) / 1000).toFixed(1)} km of ${anchorPoint.name}.`,
          intent: "FIND_NEARBY",
        };
      } else {
        return {
          success: false,
          message: `⚠️ Could not find location "${aiResult.nearbyLocation}". Please try searching another place in Nagpur.`,
          intent: "FIND_NEARBY",
        };
      }
    } else if (aiResult.intent === "TRACK_BUS") {
      const busNum = aiResult.busNumber;
      if (busNum) {
        setLiveBusSearchQuery(busNum);
        const matchingRoutes = searchLiveBusRoutes(busNum, 10);
        if (matchingRoutes.length > 0 && matchingRoutes[0]) {
          const targetRoute = matchingRoutes[0];
          setSelectedLiveRoute(targetRoute);
          setSelectedLiveStop(null);
          setActiveRailItem("live");
          setCardOpen(true);
          setSearchedLocation(null);
          return {
            success: true,
            message: `🚌 ${aiResult.message}\nLive tracking Bus ${targetRoute.bus_number}: ${targetRoute.route_name}.`,
            intent: "TRACK_BUS",
          };
        } else {
          setSelectedLiveRoute(null);
          setActiveRailItem("live");
          setCardOpen(true);
          setSearchedLocation(null);
          return {
            success: true,
            message: `🚌 Switched to Live Bus Tracking for Bus ${busNum}.`,
            intent: "TRACK_BUS",
          };
        }
      } else {
        setActiveRailItem("live");
        setCardOpen(true);
        setSearchedLocation(null);
        return {
          success: true,
          message: "🚌 Switched to Live Bus Tracking.",
          intent: "TRACK_BUS",
        };
      }
    } else if (aiResult.intent === "VIEW_TIMETABLE") {
      const busNum = aiResult.busNumber;
      if (busNum) {
        setSelectedBusTimetable({
          busNumber: busNum,
          routeName: `Bus ${busNum}`,
        });
        return {
          success: true,
          message: `📅 ${aiResult.message}\nViewing timetable for Bus ${busNum}.`,
          intent: "VIEW_TIMETABLE",
        };
      }
    }

    return {
      success: true,
      message: aiResult.message || "I am your Eco-Move AI transit assistant. Ask me to plan routes, find nearby stops, track buses, or view timetables.",
      intent: aiResult.intent,
    };
  };

  /** Acquire GPS for the nearby anchor */
  const useLocationForNearby = () => {
    if (!navigator.geolocation) {
      setNearbyLocError("Geolocation not supported by your browser.");
      return;
    }
    setNearbyLocating(true);
    setNearbyLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNearbyAnchor({ lat: pos.coords.latitude, lon: pos.coords.longitude, name: "Your location" });
        setNearbyLocating(false);
      },
      () => {
        setNearbyLocating(false);
        setNearbyLocError("Could not get your location. Try tapping the map instead.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const journey = useMemo(() => result?.journeys[selected] ?? null, [result, selected]);

  const isCurrentJourneySaved = useMemo(() => {
    if (!origin || !destination || !journey) return false;
    return savedJourneys.some(
      (s) =>
        s.origin.name === origin.name &&
        s.destination.name === destination.name &&
        Math.abs(s.totalTimeMin - journey.totalTimeMin) < 0.1,
    );
  }, [savedJourneys, origin, destination, journey]);

  const toggleSaveCurrentJourney = async () => {
    if (!origin || !destination || !journey) return;
    const existing = savedJourneys.find(
      (s) =>
        s.origin.name === origin.name &&
        s.destination.name === destination.name &&
        Math.abs(s.totalTimeMin - journey.totalTimeMin) < 0.1,
    );

    if (existing) {
      setSavedJourneys((prev) => prev.filter((s) => s.id !== existing.id));
      await deleteUserSavedJourney(userId, existing.id);
    } else {
      const added = await addUserSavedJourney(userId, {
        origin,
        destination,
        preference: pref,
        totalTimeMin: journey.totalTimeMin,
        totalDistanceM: journey.totalDistanceM,
        transfers: journey.transfers,
        walkDistanceM: journey.walkDistanceM,
        co2g: journey.co2g,
        totalFareRs: journey.totalFareRs,
        legs: journey.legs.map((l) => ({
          mode: l.mode,
          line: l.line,
          busNumber: l.busNumber,
          timeMin: l.timeMin,
        })),
      });
      if (added) {
        setSavedJourneys((prev) => [added, ...prev.filter((s) => s.id !== added.id)]);
      }
    }
  };

  const removeSavedJourney = async (id: string) => {
    setSavedJourneys((prev) => prev.filter((s) => s.id !== id));
    await deleteUserSavedJourney(userId, id);
  };

  const handleSelectSavedJourney = (item: SavedJourneyItem) => {
    setOrigin(item.origin);
    setDestination(item.destination);
    if (item.preference) {
      setPref(item.preference);
    }
    setActiveRailItem("directions");
    setCardOpen(true);
    setResult(null);
    // Pass item.preference directly — setPref() is async and the closure would still hold the old value.
    void plan(item.origin, item.destination, item.preference || pref);
  };

  const handleMapClick = (p: { lat: number; lon: number }) => {
    // In nearby mode, map click updates search anchor
    if (cardOpen && activeRailItem === "nearby") {
      setNearbyAnchor({ ...p, name: `${p.lat.toFixed(4)}, ${p.lon.toFixed(4)}` });
      return;
    }
    if (!picking) return;
    const point = { ...p, name: `Pin ${p.lat.toFixed(4)}, ${p.lon.toFixed(4)}` };
    if (picking === "origin") setOrigin(point);
    else if (picking === "destination") setDestination(point);
    else if (picking === "cab_origin") setCabOrigin(point);
    else if (picking === "cab_destination") setCabDestination(point);
    setPicking(null);
  };

  const swap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const handleRedirectToCabs = () => {
    if (origin) setCabOrigin({ ...origin });
    if (destination) setCabDestination({ ...destination });
    setActiveRailItem("cabs");
    setCardOpen(true);
  };

  // Press Escape to cancel map-pin picking mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPicking(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleRailClick = (item: "nearby" | "directions" | "live" | "cabs" | "saved" | "recents" | "stats" | "eco" | "tickets") => {
    if (item === "tickets") {
      handleOpenTicketBookingWithRoute();
      return;
    }
    if (activeRailItem === item && cardOpen) {
      // Toggle card if clicking active
      setCardOpen(false);
    } else {
      setActiveRailItem(item);
      setCardOpen(true);
    }
  };

  return (
    <main className="relative flex h-screen w-screen overflow-hidden bg-background">
      {/* ── 1. GOOGLE MAPS VERTICAL ICON RAIL (FAR LEFT) ── */}
      <aside className="z-[1002] flex h-screen w-18 shrink-0 flex-col items-center border-r border-border bg-white py-3 shadow-md dark:bg-card">
        {/* Top Hamburger Menu Button */}
        <button
          onClick={() => setCardOpen((prev) => !prev)}
          className={`flex size-11 items-center justify-center rounded-2xl transition hover:bg-secondary active:scale-95 ${
            cardOpen ? "text-primary" : "text-foreground"
          }`}
          title={cardOpen ? "Collapse card" : "Open card"}
        >
          <Menu className="size-5" />
        </button>

        {/* Vertical Feature Buttons */}
        <div className="mt-4 flex flex-col items-center gap-4">
         
          {/* Directions Button */}
          <button
            onClick={() => handleRailClick("directions")}
            className={`group flex flex-col items-center gap-1 text-[10px] font-medium transition ${
              activeRailItem === "directions" && cardOpen
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div
              className={`flex size-10 items-center justify-center rounded-2xl transition ${
                activeRailItem === "directions" && cardOpen
                  ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30"
                  : "bg-secondary/60 group-hover:bg-secondary group-hover:shadow-sm"
              }`}
            >
              <RouteIcon className="size-5" />
            </div>
            <span>Routes</span>
          </button>

          {/* Nearby Transit Button (Google Maps 'Ask Maps' / Transit style) */}
          <button
            onClick={() => handleRailClick("nearby")}
            className={`group flex flex-col items-center gap-1 text-[10px] font-medium transition ${
              activeRailItem === "nearby" && cardOpen
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div
              className={`flex size-10 items-center justify-center rounded-2xl transition ${
                activeRailItem === "nearby" && cardOpen
                  ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30"
                  : "bg-secondary/60 group-hover:bg-secondary group-hover:shadow-sm"
              }`}
            >
              <Compass className="size-5" />
            </div>
            <span>Nearby</span>
          </button>

          {/* Live Bus Tracking Button (Real-time GPS via Chalo API) */}
          <button
            onClick={() => handleRailClick("live")}
            className={`group relative flex flex-col items-center gap-1 text-[10px] font-medium transition ${
              activeRailItem === "live" && cardOpen
                ? "text-indigo-600"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div
              className={`relative flex size-10 items-center justify-center rounded-2xl transition ${
                activeRailItem === "live" && cardOpen
                  ? "bg-indigo-600 text-white shadow-md ring-2 ring-indigo-500/30"
                  : "bg-secondary/60 group-hover:bg-secondary group-hover:shadow-sm"
              }`}
            >
              <Radio className="size-5" />
              <span className="absolute -right-0.5 -top-0.5 flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
            </div>
            <span>Know your Bus</span>
          </button>

          {/* Digital Smart Tickets & Pass Button */}
          <button
            onClick={() => handleRailClick("tickets")}
            className={`group relative flex flex-col items-center gap-1 text-[10px] font-medium transition cursor-pointer ${
              isTicketModalOpen || isWalletDrawerOpen
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Book Transit Pass (12% Off)"
          >
            <div
              className={`flex size-10 items-center justify-center rounded-2xl transition ${
                isTicketModalOpen || isWalletDrawerOpen
                  ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30"
                  : "bg-secondary/60 group-hover:bg-secondary group-hover:shadow-sm"
              }`}
            >
              <Ticket className="size-5" />
              {activeTicketsCount > 0 && (
                <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-card">
                  {activeTicketsCount}
                </span>
              )}
            </div>
            <span>Tickets</span>
          </button>

          {/* Standalone Uber Cabs Button */}
          <button
            onClick={() => handleRailClick("cabs")}
            className={`group relative flex flex-col items-center gap-1 text-[10px] font-medium transition ${
              activeRailItem === "cabs" && cardOpen
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div
              className={`flex size-10 items-center justify-center rounded-2xl transition ${
                activeRailItem === "cabs" && cardOpen
                  ? "bg-black text-white shadow-md ring-2 ring-black/30 dark:bg-white dark:text-black"
                  : "bg-secondary/60 group-hover:bg-secondary group-hover:shadow-sm"
              }`}
            >
              <Car className="size-5" />
            </div>
            <span>Cabs</span>
          </button>

          {/* Saved Places Button */}
          <button
            onClick={() => handleRailClick("saved")}
            className={`group flex flex-col items-center gap-1 text-[10px] font-medium transition ${
              activeRailItem === "saved" && cardOpen
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div
              className={`flex size-10 items-center justify-center rounded-2xl transition ${
                activeRailItem === "saved" && cardOpen
                  ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30"
                  : "bg-secondary/60 group-hover:bg-secondary group-hover:shadow-sm"
              }`}
            >
              <Bookmark className="size-5" />
            </div>
            <span>Saved</span>
          </button>

          {/* Recents Button */}
          <button
            onClick={() => handleRailClick("recents")}
            className={`group flex flex-col items-center gap-1 text-[10px] font-medium transition ${
              activeRailItem === "recents" && cardOpen
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div
              className={`flex size-10 items-center justify-center rounded-2xl transition ${
                activeRailItem === "recents" && cardOpen
                  ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30"
                  : "bg-secondary/60 group-hover:bg-secondary group-hover:shadow-sm"
              }`}
            >
              <History className="size-5" />
            </div>
            <span>Recents</span>
          </button>

          {/* Transit Stats Button */}
          <button
            onClick={() => handleRailClick("stats")}
            className={`group flex flex-col items-center gap-1 text-[10px] font-medium transition ${
              activeRailItem === "stats" && cardOpen
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div
              className={`flex size-10 items-center justify-center rounded-2xl transition ${
                activeRailItem === "stats" && cardOpen
                  ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30"
                  : "bg-secondary/60 group-hover:bg-secondary group-hover:shadow-sm"
              }`}
            >
              <Sparkles className="size-5" />
            </div>
            <span>Network</span>
          </button>


            {/* Eco / Carbon Saved */}
            <button
              onClick={() => handleRailClick("eco")}
              className={`group flex flex-col items-center gap-1 text-[10px] font-medium transition ${
                activeRailItem === "eco" && cardOpen
                  ? "text-emerald-600"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div
                className={`flex size-10 items-center justify-center rounded-2xl transition ${
                  activeRailItem === "eco" && cardOpen
                    ? "bg-emerald-500 text-white shadow-md ring-2 ring-emerald-400/40"
                    : "bg-secondary/60 group-hover:bg-secondary group-hover:shadow-sm"
                }`}
              >
                <Sprout className="size-5" />
              </div>
              <span>Eco</span>
            </button>        </div>

        {/* Divider */}
        <div className="my-3 w-8 border-t border-border" />

        {/* Quick Shortcut Thumbnail Chips (Nagpur Landmarks) */}
        <div className="flex flex-1 flex-col items-center gap-3 overflow-y-auto py-1">
          {POPULAR_SAVED_PLACES.slice(0, 3).map((place) => (
            <button
              key={place.id}
              onClick={() => handleSelectSavedPlace(place, "nearby")}
              className="group flex flex-col items-center gap-1"
              title={`Explore ${place.name}`}
            >
              <div
                className={`flex size-9 items-center justify-center rounded-xl text-[10px] font-bold text-white shadow-sm transition group-hover:scale-105 ${place.iconBg}`}
              >
                {place.iconText}
              </div>
              <span className="max-w-[54px] truncate text-[9px] font-medium text-muted-foreground group-hover:text-foreground">
                {place.name.split(" ")[0]}
              </span>
            </button>
          ))}
        </div>

        {/* Profile & Account Button with Logout Popover */}
        <div className="relative mt-auto flex flex-col items-center pt-2 pb-2">
          <button
            onClick={() => setProfileOpen((prev) => !prev)}
            className={`group flex flex-col items-center gap-1 text-[10px] font-medium transition ${
              profileOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
            title="User Profile & Settings"
          >
            <div
              className={`flex size-10 items-center justify-center rounded-2xl transition shadow-sm ${
                profileOpen
                  ? "bg-emerald-600 text-white ring-2 ring-emerald-500/40"
                  : "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 group-hover:scale-105"
              }`}
            >
              {user ? (
                <span className="font-bold text-xs">
                  {((user.user_metadata?.["full_name"] as string | undefined) ?? user.email ?? "U")[0]?.toUpperCase()}
                </span>
              ) : (
                <User className="size-5" />
              )}
            </div>
            <span className="text-[10px]">Profile</span>
          </button>

          {/* Profile Popover Menu */}
          {profileOpen && (
            <div className="absolute bottom-1 left-16 z-[1050] w-72 rounded-3xl border border-border bg-white/95 p-4 shadow-2xl backdrop-blur-xl dark:bg-card/95 animate-in fade-in slide-in-from-left-2 duration-200">
              {/* User Identity Header */}
              <div className="flex items-center gap-3 border-b border-border pb-3 mb-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black text-base shadow-md shadow-emerald-500/20">
                  {((profile?.fullName ?? user?.user_metadata?.["full_name"] as string | undefined) ?? user?.email ?? "U")[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-xs text-foreground truncate">
                      {profile?.fullName || (user?.user_metadata?.["full_name"] as string | undefined) || "Nagpur Commuter"}
                    </p>
                    <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.2 text-[9px] font-extrabold text-emerald-700 dark:text-emerald-300 shrink-0">
                      🌱 Eco Tier
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {profile?.email || user?.email || profile?.phone || user?.phone || "Logged in"}
                  </p>
                </div>
              </div>

              {/* User Mobility Stats Summary (Database Isolated) */}
              <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-2xl border border-border/80 bg-secondary/30 p-2.5 text-center">
                <div className="rounded-xl bg-card p-1.5 shadow-2xs">
                  <span className="text-[9px] font-bold uppercase text-muted-foreground">Saved Routes</span>
                  <p className="text-xs font-black text-foreground">{savedJourneys.length}</p>
                </div>
                <div className="rounded-xl bg-card p-1.5 shadow-2xs">
                  <span className="text-[9px] font-bold uppercase text-muted-foreground">CO₂ Saved</span>
                  <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                    {userEcoStats.totalCo2SavedKg.toFixed(1)} kg
                  </p>
                </div>
                <div className="rounded-xl bg-card p-1.5 shadow-2xs">
                  <span className="text-[9px] font-bold uppercase text-muted-foreground">Green Trips</span>
                  <p className="text-xs font-black text-foreground">{userEcoStats.greenTripsCount}</p>
                </div>
                <div className="rounded-xl bg-card p-1.5 shadow-2xs">
                  <span className="text-[9px] font-bold uppercase text-muted-foreground">Active Passes</span>
                  <p className="text-xs font-black text-primary">{activeTicketsCount}</p>
                </div>
              </div>

              <div className="space-y-1">
                {/* My Transit Wallet */}
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    setIsWalletDrawerOpen(true);
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20 transition cursor-pointer border border-emerald-500/20 shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <Ticket className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <span>My Wallet</span>
                  </div>
                  {activeTicketsCount > 0 && (
                    <span className="rounded-full bg-emerald-600 px-1.5 py-0.2 text-[9px] font-bold text-white shadow-sm">
                      {activeTicketsCount} Active
                    </span>
                  )}
                </button>

                <Link
                  to="/"
                  onClick={() => setProfileOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary transition"
                >
                  <Leaf className="size-4 text-emerald-600" />
                  <span>Home / Landing Page</span>
                </Link>

                <button
                  onClick={async () => {
                    setProfileOpen(false);
                    await signOut();
                    navigate({ to: "/" });
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition cursor-pointer"
                >
                  <LogOut className="size-4" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── 2. GOOGLE MAPS FLOATING / DOCKED WHITE CARD ── */}
      {cardOpen && (
        <section className="absolute left-20 top-3 z-[1001] flex h-[calc(100vh-24px)] w-[390px] flex-col overflow-hidden rounded-3xl border border-border/60 bg-white/95 shadow-2xl backdrop-blur-md transition-all duration-300 dark:bg-card/95 sm:w-[420px]">
          {/* Top Mode Bar */}
          <header className="flex items-center justify-between border-b border-border bg-gradient-to-r from-primary/5 via-card to-card px-4 py-3">
            <div className="flex items-center gap-2">
              <span
                className={`flex size-7 items-center justify-center rounded-xl text-white shadow-sm ${
                  activeRailItem === "live"
                    ? "bg-indigo-600"
                    : activeRailItem === "cabs"
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "bg-primary"
                }`}
              >
{activeRailItem === "nearby" ? (
  <Compass className="size-4" />
) : activeRailItem === "live" ? (
  <Radio className="size-4" />
) : activeRailItem === "cabs" ? (
  <Car className="size-4" />
) : activeRailItem === "saved" ? (
  <Bookmark className="size-4" />
) : activeRailItem === "recents" ? (
  <History className="size-4" />
) : activeRailItem === "eco" ? (
  <Sprout className="size-4" />
) : activeRailItem === "stats" ? (
  <Sparkles className="size-4" />
) : activeRailItem === "directions" ? (
  <RouteIcon className="size-4" />
) : null}
</span>

<div>
  <h1 className="text-sm font-bold tracking-tight text-foreground">
    {activeRailItem === "nearby"
      ? "Nearby Transit"
      : activeRailItem === "live"
      ? "Live Bus Tracking"
      : activeRailItem === "cabs"
      ? "Cab Options & Fares"
      : activeRailItem === "saved"
      ? "Saved Places"
      : activeRailItem === "recents"
      ? "Commuter Routes"
      : activeRailItem === "stats"
      ? "Nagpur Network"
      : activeRailItem === "directions"
      ? "Plan your Journey for"
      : activeRailItem === "eco"
      ? "Carbon Saved & Rewards"
      : "Journey Planner"}
  </h1>

  <p className="text-[10px] text-muted-foreground">
    {activeRailItem === "nearby"
      ? "Bus stops & Metro within coverage radius"
      : activeRailItem === "live"
      ? "Real-time Aapli Bus GPS & live ETAs (Chalo)"
      : activeRailItem === "cabs"
      ? "Live Uber Go, Auto, Premier & Bike estimates"
      : activeRailItem === "saved"
      ? "Popular destinations in Nagpur"
      : activeRailItem === "recents"
      ? "Instant 1-click commuter trips"
      : activeRailItem === "stats"
      ? "Metro & Bus multimodal stats"
      : activeRailItem === "directions"
      ? "Bus | Metro | Walk"
      : activeRailItem === "eco"
      ? "Track your carbon savings & green rewards"
      : "Plan your multimodal journey"}
  </p>
</div>
            </div>
            <button
              onClick={() => setCardOpen(false)}
              className="rounded-xl p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              title="Close card"
            >
              <X className="size-4" />
            </button>
          </header>

          {/* Card Body by Selected Feature */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* ── FEATURE 1: NEARBY TRANSIT ── */}
            {activeRailItem === "nearby" && (
              <div className="space-y-3.5">
                {/* Radius Filter Pills */}
                <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/30 p-2">
                  <span className="text-[11px] font-semibold text-muted-foreground">Search Radius:</span>
                  <div className="flex gap-1.5">
                    {[1000, 2500, 5000].map((r) => (
                      <button
                        key={r}
                        onClick={() => setNearbyRadiusM(r)}
                        className={`rounded-xl px-2.5 py-1 text-xs font-bold transition ${
                          nearbyRadiusM === r
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-white text-muted-foreground hover:bg-secondary dark:bg-card"
                        }`}
                      >
                        {r >= 1000 ? `${r / 1000} km` : `${r} m`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* If No Anchor: GPS & Map Tap */}
                {!nearbyAnchor && (
                  <div className="space-y-2.5">
                    <button
                      onClick={useLocationForNearby}
                      disabled={nearbyLocating}
                      className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-60"
                    >
                      {nearbyLocating ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <LocateFixed className="size-4" />
                      )}
                      {nearbyLocating ? "Getting current location…" : "Use my current location"}
                    </button>

                    {nearbyLocError && (
                      <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                        {nearbyLocError}
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="h-px flex-1 bg-border" />
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">or tap map</span>
                      <span className="h-px flex-1 bg-border" />
                    </div>

                    <div className="flex items-start gap-2.5 rounded-2xl border border-border bg-secondary/30 p-3.5 text-xs text-muted-foreground">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-[#7c3aed]" />
                      <div>
                        <p className="font-semibold text-foreground">Click anywhere on the map</p>
                        <p className="mt-0.5 text-[11px]">
                          A purple anchor and {nearbyRadiusM >= 1000 ? `${nearbyRadiusM / 1000} km` : `${nearbyRadiusM} m`} search radius circle will be drawn around your point!
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* If Anchor is Set: Results */}
                {nearbyAnchor && (
                  <div className="space-y-3">
                    {/* Selected Location Badge */}
                    <div className="flex items-center justify-between rounded-2xl border border-[#7c3aed]/30 bg-[#7c3aed]/10 px-3.5 py-2.5">
                      <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-[#7c3aed]">
                        <MapPin className="size-4 shrink-0" />
                        <span className="truncate">{nearbyAnchor.name}</span>
                        <span className="rounded-md bg-[#7c3aed]/20 px-1.5 py-0.5 text-[10px]">
                          {nearbyRadiusM >= 1000 ? `${nearbyRadiusM / 1000} km` : `${nearbyRadiusM} m`} radius
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setNearbyAnchor(null);
                          setNearbyLocError(null);
                        }}
                        title="Change location"
                        className="ml-2 shrink-0 rounded-md p-1 text-[#7c3aed] transition hover:bg-[#7c3aed]/20"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>

                    {/* Empty State */}
                    {nearbyResults.busStops.length === 0 && nearbyResults.metroStations.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-border p-6 text-center">
                        <Navigation2 className="mx-auto size-6 text-muted-foreground/50" />
                        <p className="mt-2 text-sm font-medium text-muted-foreground">No stops found in this radius</p>
                        <p className="mt-1 text-xs text-muted-foreground">Try expanding to 5 km or tapping another location</p>
                      </div>
                    )}

                    {/* Nearest Bus Stops */}
                    {nearbyResults.busStops.length > 0 && (
                      <section>
                        <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-bus">
                          <span className="flex items-center gap-1.5">
                            <Bus className="size-3.5" /> Bus Stops ({nearbyResults.busStops.length})
                          </span>
                          <span className="text-[10px] text-muted-foreground lowercase">sorted by distance</span>
                        </div>
                        <div className="space-y-1.5">
                          {nearbyResults.busStops.map((s) => (
                            <div
                              key={s.id}
                              className="flex items-center justify-between rounded-2xl border border-bus/20 bg-bus/5 p-3 transition hover:border-bus/40 hover:bg-bus/10"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold text-foreground">{s.name}</p>
                                <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                  <Footprints className="size-3 shrink-0" />
                                  <span className="font-medium text-foreground">{fmtNearbyDist(s.distM)}</span>
                                  <span>•</span>
                                  <span>{s.walkMin} min walk</span>
                                </p>
                              </div>
                              <button
                                onClick={() => handleNavigateToNearby(s)}
                                className="ml-2 flex shrink-0 items-center gap-1 rounded-xl bg-bus px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-bus/90 active:scale-95"
                                title="Navigate from Selected Location to this Bus Stop"
                              >
                                <ArrowRight className="size-3" /> Go
                              </button>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Nearest Metro Stations */}
                    {nearbyResults.metroStations.length > 0 && (
                      <section>
                        <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-metro">
                          <span className="flex items-center gap-1.5">
                            <TrainFront className="size-3.5" /> Metro Stations ({nearbyResults.metroStations.length})
                          </span>
                          <span className="text-[10px] text-muted-foreground lowercase">sorted by distance</span>
                        </div>
                        <div className="space-y-1.5">
                          {nearbyResults.metroStations.map((s) => (
                            <div
                              key={s.id}
                              className="flex items-center justify-between rounded-2xl border border-metro/20 bg-metro/5 p-3 transition hover:border-metro/40 hover:bg-metro/10"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold text-foreground">{s.name}</p>
                                <div className="mt-1 flex items-center gap-1.5">
                                  {s.lineName && (
                                    <span
                                      className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
                                      style={{
                                        backgroundColor: s.lineName.includes("Blue") ? "#00aaff20" : "#ff6a0020",
                                        color: s.lineName.includes("Blue") ? "#0088cc" : "#e05500",
                                      }}
                                    >
                                      {s.lineName}
                                    </span>
                                  )}
                                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                    <Footprints className="size-3 shrink-0" />
                                    <span className="font-medium text-foreground">{fmtNearbyDist(s.distM)}</span>
                                    <span>•</span>
                                    <span>{s.walkMin} min walk</span>
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleNavigateToNearby(s)}
                                className="ml-2 flex shrink-0 items-center gap-1 rounded-xl bg-metro px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-metro/90 active:scale-95"
                                title="Navigate from Selected Location to this Metro Station"
                              >
                                <ArrowRight className="size-3" /> Go
                              </button>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── FEATURE 1B: LIVE BUS TRACKING (CHALO API) ── */}
            {activeRailItem === "live" && (
              <LiveBusTracker
                selectedRoute={selectedLiveRoute}
                onSelectRoute={setSelectedLiveRoute}
                telemetry={liveTelemetry}
                selectedStop={selectedLiveStop}
                onSelectStop={setSelectedLiveStop}
                isPolling={isLivePolling}
                refreshSecondsRemaining={liveRefreshCountdown}
                onManualRefresh={handleManualLiveRefresh}
                onSelectBusTimetable={(bus) => setSelectedBusTimetable(bus)}
                searchQuery={liveBusSearchQuery}
                onSearchQueryChange={setLiveBusSearchQuery}
              />
            )}

            {/* ── FEATURE 1C: STANDALONE UBER CAB OPTIONS ── */}
            {activeRailItem === "cabs" && (
              <CabOptions
                origin={cabOrigin}
                destination={cabDestination}
                onSelectOrigin={setCabOrigin}
                onSelectDestination={setCabDestination}
                onSearchResults={setCabSearchResults}
                isLoading={isCabLoading}
                setIsLoading={setIsCabLoading}
                picking={picking}
                onStartPicking={setPicking}
                onLocate={handleGetLocation}
                locating={locating}
              />
            )}

            {/* ── FEATURE 2: ROUTE PLANNER / DIRECTIONS ── */}
            {activeRailItem === "directions" && (
              <div className="space-y-4">
                {/* Search Inputs (Google Maps 2-Row Connected Search Style) */}
                <div className="relative rounded-2xl border border-border/80 bg-secondary/20 p-3 shadow-inner">
                  {/* Connected Dots Decorator */}
                  <div className="pointer-events-none absolute left-6 top-8 flex flex-col items-center">
                    <span className="size-2.5 rounded-full border-2 border-primary bg-white" />
                    <span className="my-1 h-8 w-0.5 bg-border" />
                    <span className="size-2.5 rounded-full bg-destructive" />
                  </div>

                  <div className="space-y-2.5 pl-7">
                    <PlaceSearch
                      label="Source"
                      placeholder="Choose starting point or GPS"
                      value={origin}
                      onChange={setOrigin}
                      dot="bg-primary"
                      isPickingMap={picking === "origin"}
                      onFocus={() => setPicking("origin")}
                      onLocate={() => handleGetLocation("origin")}
                      locating={locating}
                    />

                    <PlaceSearch
                      label="Destination"
                      placeholder="Choose destination or tap map"
                      value={destination}
                      onChange={setDestination}
                      dot="bg-destructive"
                      isPickingMap={picking === "destination"}
                      onFocus={() => setPicking("destination")}
                      onLocate={() => handleGetLocation("destination")}
                      locating={locating}
                    />
                  </div>

                  {/* Swap Button */}
                  <button
                    type="button"
                    onClick={swap}
                    title="Swap origin and destination"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-xl border border-border bg-white p-2 text-muted-foreground shadow-sm transition hover:bg-secondary hover:text-foreground active:scale-95 dark:bg-card"
                  >
                    <Repeat className="size-4 rotate-90" />
                  </button>
                </div>

                {locError && (
                  <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    {locError}
                  </p>
                )}

                {/* Preference Mode Pills (Google Maps Transport Modes Style) */}
                <div className="flex flex-wrap gap-1.5">
                  {PREFS.map((p) => {
                    const Icon = p.icon;
                    const active = pref === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          setPref(p.id);
                          // Pass p.id directly — setPref() is async (React state),
                          // so plan() would read the OLD pref from the closure otherwise.
                          if (origin && destination) void plan(undefined, undefined, p.id);
                        }}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                          active
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border bg-white text-muted-foreground hover:border-primary/40 hover:text-foreground dark:bg-card"
                        }`}
                      >
                        <Icon className="size-3.5" />
                        {p.label}
                      </button>
                    );
                  })}
                </div>

                {/* ── Departure Time Selector (Material / Crane Clock UI) ── */}
                <MaterialTimePicker
                  value={departureTime}
                  onChange={(val) => setDepartureTime(val)}
                />

                {/* Plan Button & Save Route Button */}
                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full rounded-2xl shadow-md"
                    onClick={() => void plan()}
                    disabled={!origin || !destination || enriching || isPlanning}
                  >
                    <RouteIcon className="size-4" /> Plan journey
                  </Button>

                  {/* ── Save Journey to Favorites Button ── */}
                  <button
                    type="button"
                    onClick={toggleSaveCurrentJourney}
                    disabled={!journey}
                    className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-3.5 py-2.5 text-xs font-bold transition-all shadow-sm active:scale-95 ${
                      !journey
                        ? "cursor-not-allowed border-border/60 bg-secondary/30 text-muted-foreground opacity-50"
                        : isCurrentJourneySaved
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
                          : "border-primary/40 bg-primary/5 text-primary hover:border-primary hover:bg-primary/10"
                    }`}
                    title={
                      !journey
                        ? "Plan a journey first to save it"
                        : isCurrentJourneySaved
                          ? "Click to remove this route from Favorites"
                          : "Save this route to Favorites in the Saved tab"
                    }
                  >
                    {isCurrentJourneySaved ? (
                      <>
                        <BookmarkCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Saved to Favorites ⭐ (Click to remove)</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="size-4" />
                        <span>Save route to Favorites</span>
                      </>
                    )}
                  </button>
                </div>

                {isPlanning && (
                  <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-primary">
                    <Loader2 className="size-4 animate-spin" />
                    Finding best routes...
                  </p>
                )}

                {enriching && !isPlanning && (
                  <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin text-primary" />
                    Enriching walking legs with ORS road routes…
                  </p>
                )}

                {picking && (
                  <p className="text-center text-xs text-muted-foreground">
                    <MapPin className="mr-1 inline-block size-3 animate-pulse text-primary" />
                    Click anywhere on the map to drop the{" "}
                    <span className="font-semibold text-foreground">{picking}</span> pin.
                    Press <kbd className="rounded border border-border bg-secondary px-1 font-mono text-[10px]">Esc</kbd> to cancel.
                  </p>
                )}



                {/* Results Section */}
                <div className="space-y-3 pt-2">
                  {!result && !isPlanning && (
                    <div className="rounded-2xl border border-dashed border-border bg-secondary/20 p-5 text-center">
                      <RouteIcon className="mx-auto size-6 text-muted-foreground/60" />
                      <p className="mt-2 text-sm font-semibold">Ready to route</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Select a source and destination to find the fastest combination of walk, bus, and metro!
                      </p>
                    </div>
                  )}

                  {result?.error && (
                    <div className="space-y-2.5">
                      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3.5 text-xs text-destructive">
                        {result.error}
                      </div>

                      {/* Show Available Cab Services Button */}
                      <button
                        type="button"
                        onClick={handleRedirectToCabs}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-4 py-3 text-xs font-bold text-white shadow-md transition hover:bg-slate-900 active:scale-98 dark:bg-white dark:text-black dark:hover:bg-slate-200"
                      >
                        <Car className="size-4" />
                        <span>Show Available Cab Services</span>
                        <ArrowRight className="size-3.5" />
                      </button>
                    </div>
                  )}

                  {result && result.journeys.length > 0 && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        {result.journeys.map((j, i) => (
                          <JourneyCard
                            key={i}
                            journey={j}
                            index={i}
                            active={i === selected}
                            onClick={() => setSelected(i)}
                            onSelectBusTimetable={(bus) => setSelectedBusTimetable(bus)}
                          />
                        ))}
                      </div>

                      {journey && (
                        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                            <Stat icon={Clock} label="Total time" value={fmtTime(journey.totalTimeMin)} />
                            <Stat icon={IndianRupee} label="Total Fare" value={`₹${journey.totalFareRs ?? 0}`} />
                            <Stat icon={RouteIcon} label="Distance" value={fmtDist(journey.totalDistanceM)} />
                            <Stat icon={Footprints} label="Walking" value={fmtDist(journey.walkDistanceM)} />
                            <Stat icon={Repeat} label="Transfers" value={String(journey.transfers)} />
                            <Stat icon={Leaf} label="CO₂ (transit)" value={`${Math.round(journey.co2g)} g`} />
                            <Stat
                              icon={Sparkles}
                              label="CO₂ saved vs car"
                              value={`${Math.max(0, Math.round((journey.totalDistanceM / 1000) * 170 - journey.co2g))} g`}
                            />
                          </div>

                          {/* 🎟️ Buy Digital Smart Pass Banner */}
                          <div className="mb-4 rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 p-3.5 shadow-sm">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                                  <Ticket className="size-5" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <h4 className="text-s font-bold text-foreground">
                                      Buy Digital Pass
                                    </h4>
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  const transitLegs: TransitLegItem[] = convertJourneyLegsToTransitLegs(journey.legs);

                                  handleOpenTicketBookingWithRoute({
                                    from: origin?.name,
                                    to: destination?.name,
                                    mode:
                                      journey.legs.some((l) => l.mode === "metro") &&
                                      journey.legs.some((l) => l.mode === "bus")
                                        ? "combo"
                                        : journey.legs.some((l) => l.mode === "metro")
                                        ? "metro"
                                        : "bus",
                                    legs: transitLegs.length > 0 ? transitLegs : undefined,
                                    isLockedRoute: true,
                                  });
                                }}
                                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-emerald-600/25 transition hover:brightness-110 active:scale-95 cursor-pointer"
                              >
                                <span>Book Now</span>
                                <ArrowRight className="size-3.5" />
                              </button>
                            </div>
                          </div>

                          <Itinerary
                            journey={journey}
                            origin={origin?.name ?? "Source"}
                            destination={destination?.name ?? "Destination"}
                            onSelectBusTimetable={(bus) => setSelectedBusTimetable(bus)}
                          />
                        </section>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── FEATURE 3: SAVED PLACES & ROUTES ── */}
            {activeRailItem === "saved" && (
              <div className="space-y-4">
                {/* ── Section A: User Saved Custom Routes ── */}
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h2 className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <Bookmark className="size-3.5 text-primary" />
                      <span>Your Saved Routes ({savedJourneys.length})</span>
                    </h2>
                    {savedJourneys.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">Saved in browser</span>
                    )}
                  </div>

                  {savedJourneys.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-secondary/20 p-4 text-center">
                      <Bookmark className="mx-auto size-5 text-muted-foreground/60" />
                      <p className="mt-1.5 text-xs font-semibold text-foreground">No saved routes yet</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Plan any journey in Directions and tap &quot;Save route to Favorites&quot; to access it anytime here!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {savedJourneys.map((saved) => (
                        <div
                          key={saved.id}
                          className="rounded-2xl border border-border bg-white p-3.5 shadow-sm transition hover:border-primary/40 hover:shadow-md dark:bg-card"
                        >
                          {/* Route Origin -> Destination Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                <span className="truncate">{saved.origin.name}</span>
                                <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                                <span className="truncate">{saved.destination.name}</span>
                              </div>
                              <div className="mt-1 flex items-baseline gap-2 text-xs">
                                <span className="text-sm font-bold text-primary">
                                  {fmtTime(saved.totalTimeMin)}
                                </span>
                                <span className="text-muted-foreground">{fmtDist(saved.totalDistanceM)}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  • {saved.transfers === 0 ? "Direct" : `${saved.transfers} transfer${saved.transfers > 1 ? "s" : ""}`}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => removeSavedJourney(saved.id)}
                              title="Delete saved route"
                              className="rounded-lg p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive active:scale-90"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>

                          {/* Legs Chips Summary */}
                          <div className="mt-2.5 flex flex-wrap items-center gap-1">
                            {saved.legs.map((leg, li) => {
                              const isBlue = (leg.line ?? "").toLowerCase().includes("blue");
                              const isOrange = leg.mode === "metro" && !isBlue;
                              const isBus = leg.mode === "bus";
                              return (
                                <span
                                  key={li}
                                  onClick={(e) => {
                                    if (isBus) {
                                      e.stopPropagation();
                                      setSelectedBusTimetable({
                                        busNumber: leg.busNumber,
                                        routeName: leg.line,
                                      });
                                    }
                                  }}
                                  title={isBus ? `Click to view Bus ${leg.busNumber || ""} daily timetable` : undefined}
                                  className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                                    isBlue
                                      ? "border border-[#00aaff]/30 bg-[#00aaff]/15 text-[#0088cc]"
                                      : isOrange
                                        ? "border border-[#ff6a00]/30 bg-[#ff6a00]/15 text-[#e05500]"
                                        : isBus
                                          ? "border border-bus/30 bg-bus/15 text-bus hover:bg-bus/25 active:scale-95 cursor-pointer"
                                          : "bg-secondary text-muted-foreground"
                                  }`}
                                >
                                  <ModeIcon mode={leg.mode} line={leg.line} className="size-2.5" />
                                  <span className="max-w-[90px] truncate">
                                    {isBus && leg.busNumber
                                      ? `Bus ${leg.busNumber}`
                                      : leg.line ?? `${Math.round(leg.timeMin)}m`}
                                  </span>
                                </span>
                              );
                            })}
                          </div>

                          {/* Action Button */}
                          <div className="mt-3 flex justify-end border-t border-border/50 pt-2">
                            <button
                              onClick={() => handleSelectSavedJourney(saved)}
                              className="flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-95"
                            >
                              <RouteIcon className="size-3" /> Load & Plan Route
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* ── Section B: Popular Nagpur Landmarks ── */}
                <section className="space-y-2.5 border-t border-border pt-2">
                  <h2 className="text-xs font-bold text-foreground">
                    📍 Popular Nagpur Destinations
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Key multimodal transit interchanges and tourist spots:
                  </p>
                  <div className="space-y-2">
                    {POPULAR_SAVED_PLACES.map((place) => (
                      <div
                        key={place.id}
                        className="rounded-2xl border border-border bg-white p-3 shadow-sm transition hover:border-primary/40 dark:bg-secondary/30"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex size-9 shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-sm text-xs ${place.iconBg}`}
                          >
                            {place.iconText}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-xs font-bold text-foreground">{place.name}</h3>
                            <p className="text-[10px] font-semibold text-primary">{place.category}</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{place.desc}</p>
                          </div>
                        </div>
                        <div className="mt-2.5 flex items-center gap-1.5 border-t border-border/50 pt-2">
                          <button
                            onClick={() => handleSelectSavedPlace(place, "nearby")}
                            className="flex items-center gap-1 rounded-xl bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary transition hover:bg-primary/20"
                          >
                            <Compass className="size-3" /> Nearby
                          </button>
                          <button
                            onClick={() => handleSelectSavedPlace(place, "origin")}
                            className="rounded-xl bg-secondary/80 px-2.5 py-1 text-[11px] font-semibold text-foreground transition hover:bg-secondary"
                          >
                            Set Origin
                          </button>
                          <button
                            onClick={() => handleSelectSavedPlace(place, "destination")}
                            className="rounded-xl bg-secondary/80 px-2.5 py-1 text-[11px] font-semibold text-foreground transition hover:bg-secondary"
                          >
                            Set Dest
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* ── FEATURE 4: RECENTS & POPULAR ROUTES ── */}
            {activeRailItem === "recents" && (
              <div className="space-y-4">
                {/* Section A: User's Recent Trips (Database Isolated) */}
                {recentJourneys.length > 0 && (
                  <section className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h2 className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <History className="size-3.5 text-primary" />
                        <span>Your Recent Trips ({recentJourneys.length})</span>
                      </h2>
                      <button
                        onClick={async () => {
                          if (confirm("Clear your recent trip history?")) {
                            setRecentJourneys([]);
                            await clearUserRecentJourneys(userId);
                          }
                        }}
                        className="text-[10px] font-semibold text-muted-foreground hover:text-destructive transition"
                      >
                        Clear History
                      </button>
                    </div>

                    <div className="space-y-2">
                      {recentJourneys.map((rec) => (
                        <div
                          key={rec.id}
                          className="flex items-center justify-between rounded-2xl border border-border bg-white p-3 shadow-sm transition hover:border-primary/40 dark:bg-secondary/30"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground truncate">
                              <span className="truncate">{rec.origin.name}</span>
                              <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                              <span className="truncate">{rec.destination.name}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(rec.createdAt).toLocaleDateString("en-IN", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setOrigin(rec.origin);
                              setDestination(rec.destination);
                              setActiveRailItem("directions");
                              setCardOpen(true);
                              setResult(null);
                              void plan(rec.origin, rec.destination);
                            }}
                            className="flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-95 shrink-0"
                          >
                            <RouteIcon className="size-3" /> Plan
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Section B: Nagpur Popular Commuter Routes */}
                <section className="space-y-2.5 border-t border-border pt-2">
                  <h2 className="text-xs font-bold text-foreground">
                    ⚡ Nagpur Frequent Corridors
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Instant 1-click multimodal routing across major arterial routes:
                  </p>
                  <div className="space-y-2">
                    {POPULAR_ROUTE_PRESETS.map((preset) => (
                      <div
                        key={preset.id}
                        className="flex items-center justify-between rounded-2xl border border-border bg-white p-3.5 shadow-sm transition hover:border-primary/40 dark:bg-secondary/30"
                      >
                        <div>
                          <h3 className="text-xs font-bold text-foreground">{preset.title}</h3>
                          <span className="mt-1 inline-block rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                            {preset.badge}
                          </span>
                        </div>
                        <button
                          onClick={() => handleSelectRoutePreset(preset)}
                          className="flex items-center gap-1 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-95"
                        >
                          <RouteIcon className="size-3.5" /> Plan
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* 🌱 FEATURE 6: ECO / CARBON SAVED PANEL 🌱 */}
            {activeRailItem === "eco" && (
              <EcoCarbonPanel
                savedJourneys={savedJourneys}
                userId={userId}
                userEcoStats={userEcoStats}
              />
            )}

            {/* ── FEATURE 5: NETWORK STATS ── */}
            {activeRailItem === "stats" && (
              <div className="space-y-3.5 text-xs">
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <h3 className="font-bold text-primary">Nagpur Multimodal Network</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Connecting Nagpur Metro Rail & Aapli Bus with ORS pedestrian shortest-path walking routes.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-2xl border border-border bg-secondary/30 p-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Metro Lines</p>
                    <p className="mt-1 text-base font-bold text-metro">{networkStats.metroLines} Lines</p>
                    <p className="text-[10px] text-muted-foreground">Orange & Blue corridors</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-secondary/30 p-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Bus Routes</p>
                    <p className="mt-1 text-base font-bold text-bus">{networkStats.busRoutes} Routes</p>
                    <p className="text-[10px] text-muted-foreground">Aapli Bus network</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
                  <h4 className="font-bold text-foreground">Metro Line Brand Palette</h4>
                  <div className="mt-2.5 space-y-2 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 font-semibold">
                        <span className="size-2.5 rounded-full bg-[#ff6a00]" />
                        Orange Line
                      </span>
                      <span className="text-muted-foreground">Automotive Sq ⇄ Khapri</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 font-semibold">
                        <span className="size-2.5 rounded-full bg-[#00aaff]" />
                        Blue Line
                      </span>
                      <span className="text-muted-foreground">Prajapati Nagar ⇄ Lokmanya Nagar</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── 2B. AI ROUTE EXPLAINER BOT (Positioned directly to the right of the Route Planner) ── */}
      {cardOpen && activeRailItem === "directions" && result && result.journeys.length > 0 && origin && destination && (
        <SideRouteAiExplainer
          journeys={result.journeys}
          selectedIndex={selected}
          originName={origin.name}
          destinationName={destination.name}
          onSelectJourney={(idx) => setSelected(idx)}
        />
      )}

      {/* ── 3. INTERACTIVE MAP VIEW ── */}
      <div className="relative h-screen flex-1">
        {/* ── GOOGLE MAPS FLOATING PILL SEARCH BAR OVERLAY (Visible when left sidebar is closed) ── */}
        {!cardOpen && (
          <GoogleMapsSearchBar
            onSelectPlace={(place, subtitle) => {
              setSearchedLocation({
                lat: place.lat,
                lon: place.lon,
                name: place.name,
                subtitle,
              });
            }}
            onGetDirections={(destinationPoint) => {
              setDestination(destinationPoint);
              setActiveRailItem("directions");
              setCardOpen(true);
            }}
            onExploreNearby={(place) => {
              setNearbyAnchor({
                lat: place.lat,
                lon: place.lon,
                name: place.name,
              });
              setActiveRailItem("nearby");
              setCardOpen(true);
            }}
            onOpenRailItem={(item) => {
              if (item === "nearby" && searchedLocation) {
                setNearbyAnchor({
                  lat: searchedLocation.lat,
                  lon: searchedLocation.lon,
                  name: searchedLocation.name || "Selected Location",
                });
              }
              setActiveRailItem(item);
              setCardOpen(true);
            }}
            onToggleBusStops={() => setShowBusStops((v) => !v)}
            onToggleMetroStations={() => setShowMetroStations((v) => !v)}
            showBusStops={showBusStops}
            showMetroStations={showMetroStations}
            selectedPlace={searchedLocation}
            onClearSelectedPlace={() => setSearchedLocation(null)}
            onAiCommand={handleAiSearchCommand}
            onSelectPoiCategory={handleTogglePoiCategory}
            activePoiCategory={activePoiCategory}
            onClearPoiCategory={() => {
              setActivePoiCategory(null);
              setPoiMarkers([]);
            }}
            poiCount={poiMarkers.length}
            onOpenTickets={() => handleOpenTicketBookingWithRoute()}
          />
        )}

        {isMounted ? (
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Loading Google Maps…
              </div>
            }
          >
            <MapView
              journey={activeRailItem === "directions" ? journey : null}
              origin={activeRailItem === "directions" ? origin : null}
              destination={activeRailItem === "directions" ? destination : null}
              showNetwork={showNetwork}
              showBusStops={showBusStops}
              showMetroStations={showMetroStations}
              mapStyle={mapStyle}
              picking={
                activeRailItem === "directions"
                  ? (picking === "origin" || picking === "destination" ? picking : null)
                  : activeRailItem === "cabs"
                  ? (picking === "cab_origin" || picking === "cab_destination" ? picking : null)
                  : null
              }
              onMapClick={handleMapClick}
              isCurrentLocation={
                activeRailItem === "directions"
                  ? origin?.name === "Your location"
                  : cabOrigin?.name === "Your location"
              }
              nearbyMode={cardOpen && activeRailItem === "nearby"}
              nearbyAnchor={activeRailItem === "nearby" ? nearbyAnchor : null}
              nearbyRadiusM={nearbyRadiusM}
              nearbyMarkers={activeRailItem === "nearby" ? nearbyMarkers : []}
              liveRoute={activeRailItem === "live" ? selectedLiveRoute : null}
              liveTelemetry={activeRailItem === "live" ? liveTelemetry : null}
              selectedLiveStop={activeRailItem === "live" ? selectedLiveStop : null}
              onSelectLiveStop={setSelectedLiveStop}
              onSelectBusTimetable={(bus) => setSelectedBusTimetable(bus)}
              nearbyCabs={activeRailItem === "cabs" ? (cabSearchResults?.nearbyVehicles || []) : []}
              cabOrigin={activeRailItem === "cabs" ? cabOrigin : null}
              cabDestination={activeRailItem === "cabs" ? cabDestination : null}
              cabPolyline={activeRailItem === "cabs" ? (cabSearchResults?.polyline || []) : []}
              cabOriginName={activeRailItem === "cabs" ? cabOrigin?.name : undefined}
              cabDestinationName={activeRailItem === "cabs" ? cabDestination?.name : undefined}
              searchedLocation={searchedLocation}
              onDirectionsToSearchedLocation={(loc) => {
                setDestination(loc);
                setActiveRailItem("directions");
                setCardOpen(true);
              }}
              poiMarkers={poiMarkers}
              activePoiCategory={activePoiCategory}
              onDirectionsToPoi={(poi) => {
                setDestination(poi);
                setActiveRailItem("directions");
                setCardOpen(true);
                setActivePoiCategory(null);
                setPoiMarkers([]);
              }}
            />
          </Suspense>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Loading Google Maps…
          </div>
        )}
      </div>

      {/* ── 4. FLOATING GOOGLE MAPS LAYERS BUTTON (Bottom-Right, Left of Chatbot) ── */}
      <GoogleMapsLayersFAB
        showMetroStations={showMetroStations}
        onToggleMetroStations={() => setShowMetroStations((v) => !v)}
        showBusStops={showBusStops}
        onToggleBusStops={() => setShowBusStops((v) => !v)}
        mapStyle={mapStyle}
        onSelectMapStyle={setMapStyle}
      />

      {/* ── 5. FLOATING AI TRANSIT CHATBOT (Bottom-Right Corner) ── */}
      <AiTransitChatbot
        currentJourney={activeRailItem === "directions" ? journey : null}
        originName={origin?.name}
        destinationName={destination?.name}
        selectedJourneyIndex={selected}
      />

      {/* ── 5. DEDICATED BUS TIMETABLE PANEL (Right-Hand Side Drawer) ── */}
      {selectedBusTimetable && (
        <BusTimetablePanel
          {...selectedBusTimetable}
          onClose={() => setSelectedBusTimetable(null)}
        />
      )}

      {/* ── 6. DIGITAL SMART TICKET BOOKING MODAL ── */}
      <TicketBookingModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        initialFrom={ticketModalPreFill.from}
        initialTo={ticketModalPreFill.to}
        initialMode={ticketModalPreFill.mode}
        initialLegs={ticketModalPreFill.legs}
        isLockedRoute={ticketModalPreFill.isLockedRoute}
        onTicketPurchased={() => {
          refreshActiveTicketsCount();
        }}
      />

      {/* ── 7. TRANSIT WALLET & ACTIVE PASSES DRAWER ── */}
      <TicketWalletDrawer
        isOpen={isWalletDrawerOpen}
        onClose={() => setIsWalletDrawerOpen(false)}
        onOpenBookModal={() => {
          setTicketModalPreFill({ isLockedRoute: false });
          setIsTicketModalOpen(true);
        }}
      />
    </main>
  );
}

// ============================================================
//  EcoCarbonPanel - Full Carbon Saved intelligence panel
// ============================================================

const ECO_FACTS = [
  { icon: "🌳", label: "Trees Equivalent", compute: (co2kg: number) => ({ value: (co2kg / 21).toFixed(1), unit: "trees", fact: "An average tree absorbs ~21 kg CO₂ per year. You've protected that many!" }) },
  { icon: "⛽", label: "Petrol Saved", compute: (co2kg: number) => ({ value: (co2kg / 2.31).toFixed(1), unit: "litres", fact: "Every litre of petrol burned produces ~2.31 kg CO₂. You skipped that!" }) },
  { icon: "💨", label: "Air Purified", compute: (co2kg: number) => ({ value: (co2kg * 1000 / 2.5).toFixed(0), unit: "m³ air", fact: "PM2.5 emissions from cars pollute huge volumes. Transit-riding keeps the air cleaner!" }) },
  { icon: "🏠", label: "Home Energy Days", compute: (co2kg: number) => ({ value: (co2kg / 5).toFixed(1), unit: "days", fact: "An average Indian household emits ~5 kg CO₂/day. You've offset several!" }) },
  { icon: "🌊", label: "Ocean Protection", compute: (co2kg: number) => ({ value: (co2kg / 0.5).toFixed(0), unit: "hours", fact: "Rising CO₂ causes ocean acidification. Every gram you save helps marine life survive." }) },
  { icon: "☀️", label: "Solar Panels Needed", compute: (co2kg: number) => ({ value: Math.max(0, (30 - co2kg / 5)).toFixed(1), unit: "panel-days extra", fact: "At 2 kWh/day offset, a solar panel saves ~1 kg CO₂/day. Transit riding closes the gap!" }) },
];

const DID_YOU_KNOW_CARDS = [
  { emoji: "🚌", title: "One bus = 40 cars", body: "A full Aapli Bus carries ~40 passengers. That replaces up to 40 individual car trips, slashing emissions by 95% per person!" },
  { emoji: "🚇", title: "Metro: Zero Tailpipe", body: "Nagpur Metro runs on electricity. If powered by renewables, each metro ride emits ZERO direct CO₂ — cleaner than walking!" },
  { emoji: "🌱", title: "Nagpur's Green Pledge", body: "Nagpur Metro aims to be carbon-neutral by 2030. Every ride you take today funds solar panels on metro stations!" },
  { emoji: "🦋", title: "The Butterfly Effect", body: "If every Nagpur commuter chose transit once a week, we'd collectively save ~18,000 tonnes of CO₂ per year — equal to planting 850,000 trees!" },
  { emoji: "🔥", title: "Petrol Price Secret", body: "India spends ₹2+ lakh crore importing crude oil yearly. Public transport reduces demand, keeping fuel prices lower for everyone." },
  { emoji: "🏙️", title: "City Air Quality", body: "Vehicles cause 40% of Nagpur's air pollution. Each bus/metro trip you take reduces particulate matter, lowering asthma risk for you and your neighbours." },
];

function EcoCarbonPanel({
  savedJourneys,
  userId = "",
  userEcoStats,
}: {
  savedJourneys: SavedJourneyItem[];
  userId?: string;
  userEcoStats?: UserEcoStats;
}) {
  const computedCo2Saved_g = savedJourneys.reduce((sum, j) => {
    // Estimated car emission for same distance vs actual transit CO₂
    const distKm = j.totalDistanceM / 1000;
    const carCo2g = distKm * 170; // avg car: 170g CO₂/km
    return sum + Math.max(0, carCo2g - j.co2g);
  }, 0);

  const totalCo2Saved_kg = Math.max(
    computedCo2Saved_g / 1000,
    userEcoStats?.totalCo2SavedKg || 0
  );
  const totalTransitKm = savedJourneys.reduce((sum, j) => sum + j.totalDistanceM / 1000, 0);
  const totalRides = Math.max(savedJourneys.length, userEcoStats?.greenTripsCount || 0);

  // Rotating "did you know" card based on time
  const [factIdx, setFactIdx] = useState(0);
  const [didYouKnowIdx, setDidYouKnowIdx] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setFactIdx((i) => (i + 1) % ECO_FACTS.length);
        setDidYouKnowIdx((i) => (i + 1) % DID_YOU_KNOW_CARDS.length);
        setAnimating(false);
      }, 300);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const currentFact = ECO_FACTS[factIdx]!;
  const factResult = currentFact.compute(totalCo2Saved_kg);
  const didYouKnow = DID_YOU_KNOW_CARDS[didYouKnowIdx]!;

  const hasData = totalRides > 0 || totalCo2Saved_kg > 0;

  return (
    <div className="space-y-3">
      {/* Header Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 p-4 text-white shadow-lg">
        <div className="absolute -right-6 -top-6 size-24 rounded-full bg-white/10" />
        <div className="absolute -bottom-4 -left-4 size-16 rounded-full bg-white/10" />
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <Sprout className="size-5" />
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Your Carbon Impact</span>
          </div>
          {hasData ? (
            <>
              <p className="mt-2 text-3xl font-black tabular-nums">{totalCo2Saved_kg.toFixed(2)} kg</p>
              <p className="text-[11px] opacity-80">CO₂ saved vs driving alone</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-white/20 px-2.5 py-1.5 backdrop-blur-sm">
                  <p className="text-[10px] font-semibold opacity-70">TOTAL RIDES</p>
                  <p className="text-base font-black">{totalRides}</p>
                </div>
                <div className="rounded-xl bg-white/20 px-2.5 py-1.5 backdrop-blur-sm">
                  <p className="text-[10px] font-semibold opacity-70">KM BY TRANSIT</p>
                  <p className="text-base font-black">{totalTransitKm.toFixed(1)} km</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 text-lg font-bold opacity-90">Plan your first trip!</p>
              <p className="mt-1 text-[11px] opacity-70">Save a journey to start tracking your carbon footprint savings vs driving.</p>
            </>
          )}
        </div>
      </div>

      {hasData ? (
        <>
          {/* Rotating Equivalence Card */}
          <div
            className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 dark:border-emerald-900/50 dark:bg-emerald-950/30 transition-all duration-300"
            style={{ opacity: animating ? 0 : 1, transform: animating ? 'translateY(4px)' : 'translateY(0)' }}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl leading-none">{currentFact.icon}</span>
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">That's equivalent to…</p>
                <p className="mt-0.5 text-xl font-black tabular-nums text-emerald-700 dark:text-emerald-300">
                  {factResult.value} <span className="text-sm font-semibold">{factResult.unit}</span>
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{factResult.fact}</p>
              </div>
            </div>
          </div>

          {/* Progress bar: toward next milestone */}
          {(() => {
            const milestones = [5, 15, 30, 50, 75, 100];
            const nextMilestone = milestones.find(m => m > totalCo2Saved_kg) ?? 100;
            const prevMilestone = milestones[milestones.indexOf(nextMilestone) - 1] ?? 0;
            const progress = ((totalCo2Saved_kg - prevMilestone) / (nextMilestone - prevMilestone)) * 100;
            return (
              <div className="rounded-2xl border border-border bg-card p-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-foreground">Next Milestone Goal</p>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                    {nextMilestone} kg CO₂
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-500 transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.max(2, progress))}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {(nextMilestone - totalCo2Saved_kg).toFixed(2)} kg more to unlock next reward voucher!
                </p>
              </div>
            );
          })()}

          {/* 🎁 Green Rewards & Milestone Scratch Cards */}
          <GreenRewardsSection totalCo2SavedKg={totalCo2Saved_kg} userId={userId} />
        </>
      ) : (
        /* Show preview rewards even before first trip so user sees motivation */
        <GreenRewardsSection totalCo2SavedKg={0} userId={userId} />
      )}

      {/* Did You Know rotating card */}
      <div
        className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-3.5 dark:border-blue-900/40 dark:from-blue-950/30 dark:to-cyan-950/20 transition-all duration-300"
        style={{ opacity: animating ? 0 : 1 }}
      >
        <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">💡 Did you know?</p>
        <div className="mt-2 flex items-start gap-2">
          <span className="text-xl leading-none">{didYouKnow.emoji}</span>
          <div>
            <p className="text-[12px] font-bold text-foreground">{didYouKnow.title}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{didYouKnow.body}</p>
          </div>
        </div>
        <div className="mt-2.5 flex justify-center gap-1">
          {DID_YOU_KNOW_CARDS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${i === didYouKnowIdx ? 'w-4 bg-blue-500' : 'w-1 bg-blue-200'}`}
            />
          ))}
        </div>
      </div>

      {/* Quick eco actions */}
      <div className="rounded-2xl border border-border bg-card p-3.5">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Quick Actions</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2 text-[11px]">
            <div className="flex items-center gap-2">
              <TrendingDown className="size-3.5 text-emerald-500" />
              <span className="font-medium">Total CO₂ (transit)</span>
            </div>
            <span className="font-bold tabular-nums text-muted-foreground">
              {(savedJourneys.reduce((s, j) => s + j.co2g, 0) / 1000).toFixed(2)} kg
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2 text-[11px]">
            <div className="flex items-center gap-2">
              <Fuel className="size-3.5 text-orange-500" />
              <span className="font-medium">Petrol not burned</span>
            </div>
            <span className="font-bold tabular-nums text-muted-foreground">
              {(totalCo2Saved_kg / 2.31).toFixed(1)} L
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2 text-[11px]">
            <div className="flex items-center gap-2">
              <Wind className="size-3.5 text-sky-500" />
              <span className="font-medium">Trees equivalent</span>
            </div>
            <span className="font-bold tabular-nums text-muted-foreground">
              {(totalCo2Saved_kg / 21).toFixed(2)} trees/year
            </span>
          </div>
        </div>
      </div>

      <p className="text-center text-[10px] text-muted-foreground">
        Based on avg car emission of 170g CO₂/km vs your transit journeys
      </p>
    </div>
  );
}


function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Clock;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-secondary/60 px-3 py-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3" /> {label}
      </div>
      <div className="mt-0.5 text-sm font-bold tabular-nums">{value}</div>
    </div>
  );
}


