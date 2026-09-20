import DevBusRouteInspector from "./DevBusRouteInspector";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Circle,
  Tooltip,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Journey } from "@/lib/routing";
import { allLines, busStops, metroStations } from "@/lib/routing";
import type { NearbyStop } from "@/lib/nearby";
import type { LiveBusRoute, LiveRouteTelemetry, LiveBusStop } from "@/lib/liveBus";
import { formatLiveEta } from "@/lib/liveBus";

const MODE_COLOR: Record<string, string> = {
  walk: "#64748b",
  bus: "#0d9488",
  metro: "#e07a1f", // fallback only
};




/**
 * Nagpur Metro brand colours per line name.
 * "Blue Line" → cyan-blue  |  "Orange Line" → deep orange
 */
const METRO_LINE_COLOR: Record<string, string> = {
  "Blue Line":   "#00aaff",
  "Orange Line": "#ff6a00",
};

/** Returns the correct colour for any line (metro lines use per-name colour). */
function lineColor(mode: string, name: string): string {
  if (mode === "metro") return METRO_LINE_COLOR[name] ?? MODE_COLOR["metro"] ?? "#e07a1f";
  if (mode === "bus") return MODE_COLOR["bus"] ?? "#0d9488";
  return MODE_COLOR["walk"] ?? "#64748b";
}

function Fit({ journey }: { journey: Journey | null }) {
  const map = useMap();
  useEffect(() => {
    if (!journey) return;
    const pts = journey.legs.flatMap((l) => l.path.map((p: { lat: number; lon: number }) => [p.lat, p.lon] as [number, number]));
    if (pts.length > 1) map.fitBounds(pts, { padding: [40, 40] });
  }, [journey, map]);
  return null;
}

/** Fits the camera bounds to the selected live bus route polyline */
function FitLiveRoute({ route }: { route: LiveBusRoute | null }) {
  const map = useMap();
  useEffect(() => {
    if (!route || !route.polyline || route.polyline.length === 0) return;
    map.fitBounds(route.polyline, { padding: [60, 60], maxZoom: 15 });
  }, [route, map]);
  return null;
}

/** Smoothly centers on the selected stop in live bus tracking */
function FlyToLiveStop({ stop }: { stop: LiveBusStop | null }) {
  const map = useMap();
  useEffect(() => {
    if (!stop) return;
    map.flyTo([stop.lat, stop.lon], 16, { duration: 0.8 });
  }, [stop, map]);
  return null;
}

/** Smoothly fly to the position and adjust zoom level when radius changes. */
function FlyToLocation({ pos, radiusM }: { pos: { lat: number; lon: number }; radiusM?: number }) {
  const map = useMap();
  useEffect(() => {
    let targetZoom = 15;
    if (radiusM) {
      if (radiusM >= 5000) targetZoom = 12;
      else if (radiusM >= 2500) targetZoom = 13;
      else targetZoom = 14;
    }
    map.flyTo([pos.lat, pos.lon], targetZoom, { duration: 1.0 });
  }, [pos.lat, pos.lon, radiusM, map]);
  return null;
}

function ClickHandler({
  onClick,
}: {
  onClick?: ((p: { lat: number; lon: number }) => void) | undefined;
}) {
  useMapEvents({
    click(e) {
      onClick?.({ lat: e.latlng.lat, lon: e.latlng.lng });
    },
  });
  return null;
}

/** Creates a live bus vehicle marker with exact uploaded transit bus icon (image.svg), light blue pin background, and registration badge */
function createLiveBusIcon(vNo: string, isHalted: boolean) {
  return L.divIcon({
    className: "live-bus-vehicle-divicon",
    html: `
      <div class="live-bus-marker-container">
        ${
          isHalted
            ? `<div class="live-bus-halted-badge">
                <span class="live-bus-dot-halted"></span>
                <span>Halted</span>
              </div>`
            : ""
        }
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <div class="live-bus-pulse-ring"></div>
          <div class="live-bus-pin" style="${isHalted ? "background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); box-shadow: 0 4px 14px rgba(217, 119, 6, 0.45);" : "background: linear-gradient(135deg, #38bdf8 0%, #00a2ea 100%);"}">
            <svg width="27" height="27" viewBox="0 0 128 128" fill="black" stroke="black" stroke-width="0.9" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" d="M106.17 35.75C108.57 36.61 111.02 35.92 112.79 38.37C114.79 41.13 114.79 56.87 112.79 59.63C111.02 62.07 108.56 61.39 106.17 62.25C104.52 71.35 108.54 91.45 104.84 98.69C103.25 101.79 99.4 102.2 98.23 104.06C96.59 106.67 99.19 109.82 95.5 111.7C93.43 112.75 80.72 112.34 79.12 110.71C77.4 108.96 78.15 106.22 77.83 104.01C68.64 104.01 59.45 104.01 50.25 104.01C49.6 106.27 50.65 108.8 48.86 110.7C46.98 112.7 33.31 112.7 31.29 110.87C29.12 108.91 31.25 105.62 29.63 103.89C27.64 101.76 24.72 101.73 23.16 98.7C19.46 91.47 23.47 71.34 21.83 62.25C19.43 61.39 16.98 62.07 15.21 59.63C13.21 56.89 13.21 41.11 15.2 38.37C16.98 35.92 19.43 36.61 21.83 35.75C22.91 29.78 20.18 22.92 25.56 18.38C30.17 14.49 37.9 16 43.5 16C57.28 16 71.06 16 84.83 16C90.36 16 97.61 14.62 102.26 18.23C107.89 22.61 105.09 29.8 106.17 35.75ZM101.82 32C102.67 27.75 102.47 22.1 97.86 20.28C94.14 18.81 84.8 20 80.5 20C68.83 20 57.17 20 45.5 20C41.13 20 34.21 18.68 30.14 20.28C25.52 22.1 25.33 27.75 26.18 32C51.39 32 76.61 32 101.82 32ZM47.54 24.08C52.97 22.7 67.77 24 74.17 24C76.09 24 82.17 22.91 81.94 26.16C81.74 29.05 76.05 28 74.17 28C67.77 28 52.97 29.3 47.54 27.92C45.61 27.43 45.61 24.57 47.54 24.08ZM61.99 36.17C53.7 34.99 44.56 36 36.17 36C33.91 36 28.76 35.05 26.93 36.44C25.24 37.71 26 50.13 26 52.83C26 57.45 24.37 65.74 27.21 69.63C29.24 72.41 32.8 72 35.83 72C41.96 72 56.9 73.23 61.99 71.75C61.99 59.89 61.99 48.03 61.99 36.17ZM66.01 71.83C73.67 72.92 82.09 72 89.83 72C92.95 72 96.94 72.73 99.63 70.79C102.23 68.9 102 65.69 102 62.83C102 56.72 102 50.61 102 44.5C102 42.46 102.97 37.5 100.88 36.29C98.85 35.11 94.17 36 91.83 36C85.28 36 71.73 34.59 66.01 36.25C66.01 48.11 66.01 59.97 66.01 71.83ZM21.98 40.17C20.67 39.98 19.07 39.73 18.29 41.11C17.69 42.15 17.69 55.86 18.29 56.88C19.09 58.26 20.66 58.02 21.98 57.83C21.98 51.94 21.98 46.06 21.98 40.17ZM106.02 57.83C107.35 58.02 108.91 58.25 109.71 56.88C110.3 55.86 110.3 42.14 109.71 41.12C108.91 39.74 107.34 39.98 106.02 40.17C106.02 46.06 106.02 51.94 106.02 57.83ZM26.5 74.24C25.54 75.96 26 78.55 26 80.5C26 85.28 23.93 95.57 28.37 98.79C32.2 101.56 46.68 100 51.83 100C63.72 100 75.61 100 87.5 100C91.5 100 97.76 101.3 100.64 97.8C103.25 94.62 102 88.35 102 84.5C102 81.61 102.91 76.77 101.5 74.23C97.53 77.48 89.96 76 85.17 76C71.28 76 57.39 76 43.5 76C38.58 76 30.57 77.57 26.5 74.24ZM34.56 81.12C39.99 79.97 51.69 83.58 51.98 90.5C52.05 92.07 51.99 93.5 50.86 94.7C48.47 97.25 33.46 96.72 31.21 93.63C28.56 90.01 29.49 82.2 34.56 81.12ZM90.26 81.14C97.1 80.01 100.57 88.41 96.79 93.63C94.2 97.2 88.29 96 84.5 96C82.08 96 78.98 96.61 77.12 94.71C75.96 93.53 75.96 92.06 76.02 90.5C76.29 83.32 84.64 82.08 90.26 81.14ZM55.54 82.08C59.94 80.96 65.95 81.98 70.5 82C72.05 82 74.37 82.25 73.91 84.46C73.52 86.29 71.19 86 69.83 86C66.29 86 58.34 87.01 55.29 85.84C53.54 85.17 53.75 82.54 55.54 82.08ZM47.83 91.75C48.61 86.69 42.92 86.64 39.43 85.78C37.86 85.39 35.06 84.09 34.17 86.31C31.19 93.73 44.1 93.09 47.83 91.75ZM80.17 91.75C81.91 92.38 84.29 92 86.17 92C90.23 92 96.08 92.49 93.85 86.29C93.05 84.05 90.06 85.27 88.51 85.7C85 86.69 79.34 86.57 80.17 91.75ZM57.54 90.08C59.8 89.51 72.64 88.96 71.91 92.46C71.5 94.42 59.17 94.56 57.29 93.84C55.54 93.17 55.75 90.54 57.54 90.08ZM45.94 104.02C41.98 104.02 38.02 104.02 34.06 104.02C34.06 105.34 34.06 106.66 34.06 107.98C38.02 107.98 41.98 107.98 45.94 107.98C45.94 106.66 45.94 105.34 45.94 104.02ZM93.94 104.02C89.99 104.02 86.03 104.02 82.07 104.02C82.07 105.34 82.07 106.66 82.07 107.98C86.03 107.98 89.99 107.98 93.94 107.98C93.94 106.66 93.94 105.34 93.94 104.02Z" />
            </svg>
          </div>
        </div>
        <div class="live-bus-plate-badge">
          <span class="${isHalted ? "live-bus-dot-halted" : "live-bus-dot-live"}"></span>
          <span>${vNo}</span>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

export default function MapView({
  journey,
  origin,
  destination,
  showNetwork,
  showBusStops,
  showMetroStations,
  picking,
  onMapClick,
  isCurrentLocation,
  nearbyMode = false,
  nearbyAnchor,
  nearbyRadiusM = 2500,
  nearbyMarkers = [],
  liveRoute = null,
  liveTelemetry = null,
  selectedLiveStop = null,
  onSelectLiveStop,
}: {
  journey: Journey | null;
  origin?: { lat: number; lon: number } | null;
  destination?: { lat: number; lon: number } | null;
  showNetwork: boolean;
  showBusStops: boolean;
  showMetroStations: boolean;
  picking?: "origin" | "destination" | null;
  onMapClick?: ((p: { lat: number; lon: number }) => void) | undefined;
  /** When true, the origin pin is rendered as a pulsing blue GPS dot */
  isCurrentLocation?: boolean;
  /** When true, map cursor is crosshair and nearby click handler is active */
  nearbyMode?: boolean;
  /** The pinned anchor for nearby search */
  nearbyAnchor?: { lat: number; lon: number; name: string } | null;
  /** Radius in metres for nearby search circle */
  nearbyRadiusM?: number;
  /** Nearby transit stops to show as map markers */
  nearbyMarkers?: NearbyStop[];
  /** Live bus tracking: currently selected route */
  liveRoute?: LiveBusRoute | null;
  /** Live bus tracking: real-time telemetry from Chalo */
  liveTelemetry?: LiveRouteTelemetry | null;
  /** Live bus tracking: currently inspected stop */
  selectedLiveStop?: LiveBusStop | null;
  /** Callback when a stop along the live bus route is tapped */
  onSelectLiveStop?: ((stop: LiveBusStop | null) => void) | undefined;
}) {
    const cartoApiKey = (import.meta.env as Record<string, string | undefined>)["VITE_CARTO_API_KEY"] || "cb1_3m87_1_9a62d04449bdddc8bb5b8466";
  const cartoTileUrl = cartoApiKey
    ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${cartoApiKey}`
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png";

  return (
    <div className="relative h-full w-full" style={{ cursor: (picking || nearbyMode) ? "crosshair" : undefined }}>
    <MapContainer
      center={[21.1458, 79.0882]}
      zoom={13}
      preferCanvas={true}
      className="h-full w-full"
      scrollWheelZoom
      style={{ background: "#eef2f4" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url={cartoTileUrl}
        subdomains={["a", "b", "c", "d"]}
        maxZoom={20}
      />

      {/* <TileLayer
        attribution='&copy; <a href="https://maps.google.com" target="_blank">Google Maps</a>'
        url="https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
        subdomains={["0", "1", "2", "3"]}
        maxZoom={21}
      /> */}

            {/* Metro Line Polylines — ONLY shown when Metro toggle is clicked */}
      {showMetroStations &&
        allLines
          .filter((l) => l.mode === "metro")
          .map((l) => (
            <Polyline
              key={l.id}
              positions={(l.geometry ?? l.points).map((p: { lat: number; lon: number }) => [p.lat, p.lon] as [number, number])}
              pathOptions={{
                color: lineColor(l.mode, l.name),
                weight: 4.5,
                opacity: 0.85,
              }}
            >
              <Tooltip sticky>{l.name}</Tooltip>
            </Polyline>
          ))}

      {/* Bus Route Polylines — shown only when Bus Stops toggle is on */}
      {showBusStops &&
        allLines
          .filter((l) => l.mode === "bus")
          .map((l) => (
            <Polyline
              key={l.id}
              positions={(l.geometry ?? l.points).map((p: { lat: number; lon: number }) => [p.lat, p.lon] as [number, number])}
              pathOptions={{
                color: lineColor(l.mode, l.name),
                weight: 2,
                opacity: 0.35,
              }}
            >
              <Tooltip sticky>{l.name}</Tooltip>
            </Polyline>
          ))}

      {/* Bus stop dots overlay */}
      {showBusStops &&
        busStops.map((s) => (
          <CircleMarker
            key={`bus-stop-${s.id}`}
            center={[s.lat, s.lon]}
            radius={4}
            pathOptions={{
              color: MODE_COLOR["bus"] ?? "#0d9488",
              fillColor: MODE_COLOR["bus"] ?? "#0d9488",
              fillOpacity: 0.7,
              weight: 1,
            }}
          >
            <Tooltip>{s.name}</Tooltip>
          </CircleMarker>
        ))}

      {/* Metro station dots — colour matches their line */}
      {showMetroStations &&
        metroStations.map((s) => {
          // Determine which metro line this station belongs to
          const parentLine = allLines.find(
            (l) => l.mode === "metro" && l.points.some((p: { lat: number; lon: number }) => p.lat === s.lat && p.lon === s.lon),
          );
          const color = parentLine ? (METRO_LINE_COLOR[parentLine.name] ?? MODE_COLOR["metro"] ?? "#e07a1f") : MODE_COLOR["metro"] ?? "#e07a1f";
          return (
            <CircleMarker
              key={`metro-stn-${s.id}`}
              center={[s.lat, s.lon]}
              radius={6}
              pathOptions={{
                color,
                fillColor: "#ffffff",
                fillOpacity: 1,
                weight: 2,
              }}
            >
              <Tooltip>{s.name}</Tooltip>
            </CircleMarker>
          );
        })}

      {/* Active journey polylines — metro legs use per-line brand colour */}
      {journey?.legs.map((leg, i) => (
        <Polyline
          key={i}
          positions={leg.path.map((p: { lat: number; lon: number }) => [p.lat, p.lon] as [number, number])}
          pathOptions={{
            color: leg.mode === "metro" ? (lineColor("metro", leg.line ?? "")) : MODE_COLOR[leg.mode],
            weight: leg.mode === "walk" ? 4 : 6,
            dashArray: leg.mode === "walk" ? "2 8" : undefined,
            opacity: 0.95,
          }}
        />
      ))}

      {/* Active journey boarding and alighting stop markers */}
        {journey?.legs
          .filter((l) => l.mode !== "walk")
          .flatMap((leg, li) => {
            const startPt = leg.path[0];
            const endPt = leg.path[leg.path.length - 1];
            const pts = [
              { pt: startPt, label: `Board: ${leg.from} (${leg.line ?? leg.mode})`, isStart: true },
              { pt: endPt, label: `Alight: ${leg.to}`, isStart: false },
            ].filter((x): x is { pt: { lat: number; lon: number }; label: string; isStart: boolean } => x.pt != null);

            return pts.map(({ pt: p, label }, pi) => (
              <CircleMarker
                key={`stn-${li}-${pi}`}
                center={[p.lat, p.lon]}
                radius={6}
                pathOptions={{
                  color: leg.mode === "metro" ? lineColor("metro", leg.line ?? "") : MODE_COLOR[leg.mode]!,
                  fillColor: "#ffffff",
                  fillOpacity: 1,
                  weight: 3,
                }}
              >
                <Tooltip>{label}</Tooltip>
              </CircleMarker>
            ));
          })}

        {/* Origin pin — blue pulsing dot for GPS location, dark dot otherwise */}
      {origin && isCurrentLocation && (
        <>
          {/* Outer accuracy ring */}
          <CircleMarker
            center={[origin.lat, origin.lon]}
            radius={18}
            pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.12, weight: 0 }}
          />
          {/* Blue GPS dot */}
          <CircleMarker
            center={[origin.lat, origin.lon]}
            radius={8}
            pathOptions={{ color: "#ffffff", fillColor: "#2563eb", fillOpacity: 1, weight: 2.5 }}
          >
            <Tooltip>Your location</Tooltip>
          </CircleMarker>
          <FlyToLocation pos={origin} />
        </>
      )}
      {origin && !isCurrentLocation && (
        <CircleMarker
          center={[origin.lat, origin.lon]}
          radius={8}
          pathOptions={{ color: "#0f172a", fillColor: "#0f172a", fillOpacity: 1, weight: 2 }}
        >
          <Tooltip>Source</Tooltip>
        </CircleMarker>
      )}
      {destination && (
        <CircleMarker
          center={[destination.lat, destination.lon]}
          radius={8}
          pathOptions={{ color: "#dc2626", fillColor: "#dc2626", fillOpacity: 1, weight: 2 }}
        >
          <Tooltip>Destination</Tooltip>
        </CircleMarker>
      )}

      {/* Nearby anchor pin & search radius coverage circle */}
      {nearbyAnchor && (
        <>
          <Circle
            center={[nearbyAnchor.lat, nearbyAnchor.lon]}
            radius={nearbyRadiusM}
            pathOptions={{
              color: "#7c3aed",
              fillColor: "#7c3aed",
              fillOpacity: 0.08,
              weight: 1.8,
              dashArray: "6, 8",
            }}
          />
          <CircleMarker
            center={[nearbyAnchor.lat, nearbyAnchor.lon]}
            radius={18}
            pathOptions={{ color: "#7c3aed", fillColor: "#7c3aed", fillOpacity: 0.18, weight: 0 }}
          />
          <CircleMarker
            center={[nearbyAnchor.lat, nearbyAnchor.lon]}
            radius={7}
            pathOptions={{ color: "#ffffff", fillColor: "#7c3aed", fillOpacity: 1, weight: 2.5 }}
          >
            <Tooltip permanent={false}>{nearbyAnchor.name}</Tooltip>
          </CircleMarker>
          <FlyToLocation pos={nearbyAnchor} radiusM={nearbyRadiusM} />
        </>
      )}

      {/* Nearby transit markers */}
      {nearbyMarkers.map((s) => {
        const color =
          s.mode === "metro"
            ? (METRO_LINE_COLOR[s.lineName ?? ""] ?? MODE_COLOR["metro"] ?? "#e07a1f")
            : MODE_COLOR["bus"] ?? "#0d9488";
        return (
          <CircleMarker
            key={`nearby-${s.id}`}
            center={[s.lat, s.lon]}
            radius={s.mode === "metro" ? 8 : 6}
            pathOptions={{
              color,
              fillColor: "#ffffff",
              fillOpacity: 1,
              weight: 2.5,
            }}
          >
            <Tooltip>
              {s.name}
              {s.lineName ? ` · ${s.lineName}` : ""} · {s.distM < 1000 ? `${s.distM} m` : `${(s.distM / 1000).toFixed(1)} km`}
            </Tooltip>
          </CircleMarker>
        );
      })}

      {/* ── LIVE BUS TRACKING MAP OVERLAY ── */}
      {liveRoute && (
        <>
          {/* 1. Live Route Street-Level Polyline */}
          <Polyline
            positions={liveRoute.polyline}
            pathOptions={{
              color: "#0f172a",
              weight: 5.5,
              opacity: 0.95,
              lineCap: "round",
              lineJoin: "round",
            }}
          >
            <Tooltip sticky>
              <div className="text-xs font-bold">
                BUS {liveRoute.bus_number}: {liveRoute.route_name}
              </div>
            </Tooltip>
          </Polyline>

          {/* 2. All Sequenced Stops along Route */}
          {liveRoute.stops.map((stop, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === liveRoute.stops.length - 1;
            const isSelected = selectedLiveStop?.stop_id === stop.stop_id;
            const stopEtas = liveTelemetry?.stopsEta?.[stop.stop_id];
            const primaryEta = stopEtas?.[0];

            const color = isFirst ? "#16a34a" : isLast ? "#dc2626" : isSelected ? "#0284c7" : "#0f172a";
            const radius = isFirst || isLast ? 8 : isSelected ? 7 : 5;

            return (
              <CircleMarker
                key={`live-stop-${stop.stop_id || idx}`}
                center={[stop.lat, stop.lon]}
                radius={radius}
                eventHandlers={{
                  click: () => onSelectLiveStop?.(stop),
                }}
                pathOptions={{
                  color,
                  fillColor: isSelected ? "#0284c7" : "#ffffff",
                  fillOpacity: 1,
                  weight: isSelected ? 3 : 2,
                }}
              >
                <Tooltip direction="top" offset={[0, -8]}>
                  <div className="font-sans text-slate-900 min-w-[150px] space-y-1">
                    {/* Header: #47 BUS STOP */}
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-extrabold text-sky-800">
                        #{stop.stop_sequence}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        BUS STOP {isFirst ? "(Start)" : isLast ? "(End)" : ""}
                      </span>
                    </div>

                    {/* Stop Name Title */}
                    <div className="text-xs font-bold leading-snug text-slate-900">
                      {stop.name}
                    </div>

                    {/* Live Vehicle & ETA info */}
                    {primaryEta && primaryEta.etaSeconds >= 0 ? (
                      <div className="mt-1.5 rounded-lg border border-slate-200/80 bg-slate-50/80 p-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-800 shadow-2xs">
                            <span>🚌</span>
                            <span>{primaryEta.vNo}</span>
                          </div>
                          {primaryEta.dist > 0 && (
                            <span className="text-[10px] font-medium text-slate-500">
                              {primaryEta.dist < 1000 ? `${primaryEta.dist}m` : `${(primaryEta.dist / 1000).toFixed(1)}km`}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-1 font-bold text-sky-600">
                          <span className="text-[11px] font-extrabold">((•</span>
                          <span className="text-[11px] font-extrabold">{formatLiveEta(primaryEta.etaSeconds)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] font-medium text-slate-400">
                        Tap stop to check schedule
                      </div>
                    )}
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}

          {/* 3. Dedicated Chalo-style Popup Card for Selected Bus Stop */}
          {selectedLiveStop && (
            <Popup
              key={`live-stop-popup-${selectedLiveStop.stop_id}-${selectedLiveStop.lat}-${selectedLiveStop.lon}`}
              position={[selectedLiveStop.lat, selectedLiveStop.lon]}
              autoPan={true}
              offset={[0, -10]}
              eventHandlers={{
                remove: () => onSelectLiveStop?.(null),
              }}
            >
              <div className="min-w-[210px] max-w-[260px] p-1 font-sans text-slate-900">
                {/* Header: Stop Sequence & Title */}
                <div className="border-b border-slate-100 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-extrabold text-sky-800">
                      #{selectedLiveStop.stop_sequence}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Bus Stop
                    </span>
                  </div>
                  <h4 className="mt-1 text-sm font-bold leading-snug text-slate-900">
                    {selectedLiveStop.name}
                  </h4>
                </div>

                {/* Approaching Vehicles & ETAs (Exact Chalo Format) */}
                {(() => {
                  const etas = liveTelemetry?.stopsEta?.[selectedLiveStop.stop_id];
                  if (etas && etas.length > 0) {
                    return (
                      <div className="mt-2 space-y-2">
                        {etas.map((etaItem, i) => (
                          <div
                            key={`eta-card-${etaItem.vNo}-${i}`}
                            className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-2 text-xs shadow-2xs"
                          >
                            {/* Vehicle Pill */}
                            <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1 font-mono text-xs font-bold text-slate-800 shadow-2xs">
                              <span className="text-xs">🚌</span>
                              <span>{etaItem.vNo}</span>
                            </div>

                            {/* Chalo Live Signal & ETA */}
                            <div className="mt-1.5 flex items-center justify-between">
                              <div className="flex items-center gap-1.5 font-bold text-sky-600">
                                <span className="text-xs font-extrabold">((•</span>
                                <span className="text-xs font-extrabold">{formatLiveEta(etaItem.etaSeconds)}</span>
                              </div>

                              {etaItem.dist > 0 && (
                                <span className="text-[10px] font-medium text-slate-500">
                                  {etaItem.dist < 1000 ? `${etaItem.dist}m away` : `${(etaItem.dist / 1000).toFixed(1)}km`}
                                </span>
                              )}
                            </div>

                            {etaItem.isHalted && (
                              <div className="mt-1 text-[10px] font-bold text-amber-600">
                                ⚠️ Bus is halted
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  }

                  return (
                    <div className="mt-2 rounded-xl border border-slate-200/70 bg-slate-50 p-2.5 text-center text-xs text-slate-500">
                      <p className="font-semibold text-slate-700">No live bus approaching now</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">Scheduled route service available</p>
                    </div>
                  );
                })()}
              </div>
            </Popup>
          )}

          {/* 3. Live Moving Bus Vehicle Markers from Chalo Telemetry */}
          {liveTelemetry?.vehicles?.map((v) => (
            <Marker
              key={`live-v-${v.vehicleId}`}
              position={[v.lat, v.lon]}
              icon={createLiveBusIcon(v.vNo, v.isHalted)}
            >
              <Tooltip>
                <div className="text-xs font-semibold">
                  <div className="font-bold">🚌 Vehicle {v.vNo}</div>
                  <div className="text-[10px] text-slate-500">
                    Status: {v.isHalted ? "⚠️ Halted" : "🟢 In Transit"}
                  </div>
                  {v.etaSeconds !== undefined && v.etaSeconds >= 0 && (
                    <div className="text-[10px] text-emerald-600 font-bold">
                      Next Stop ETA: {formatLiveEta(v.etaSeconds)}
                    </div>
                  )}
                </div>
              </Tooltip>
            </Marker>
          ))}

          <FitLiveRoute route={liveRoute} />
          <FlyToLiveStop stop={selectedLiveStop} />
        </>
      )}

      <DevBusRouteInspector />
      <ClickHandler onClick={onMapClick} />
      <Fit journey={journey} />
    </MapContainer>

    {/* Metro line legend */}
    <div className="pointer-events-none absolute bottom-7 right-2 z-[1000] flex flex-col gap-1">
      {Object.entries(METRO_LINE_COLOR).map(([name, color]) => (
        <div
          key={name}
          className="flex items-center gap-1.5 rounded-md bg-white/90 px-2 py-1 text-[11px] font-semibold shadow-sm backdrop-blur-sm"
          style={{ borderLeft: `3px solid ${color}` }}
        >
          <span className="inline-block h-1.5 w-5 rounded-full" style={{ background: color }} />
          {name}
        </div>
      ))}
    </div>
    </div>
  );
}
