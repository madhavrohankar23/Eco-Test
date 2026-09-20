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

/** Creates a Chalo-style live bus vehicle marker with animated pulse, registration badge, and halted warning */
function createLiveBusIcon(vNo: string, isHalted: boolean) {
  return L.divIcon({
    className: "live-bus-vehicle-marker",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%); cursor: pointer;">
        ${
          isHalted
            ? `<div style="margin-bottom: 3px; background: #ffffff; color: #b45309; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 9999px; box-shadow: 0 2px 8px rgba(0,0,0,0.18); border: 1px solid #fef3c7; display: flex; align-items: center; gap: 4px; white-space: nowrap;">
                <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #f59e0b;"></span>
                Bus is halted
              </div>`
            : ""
        }
        <div style="position: relative; width: 34px; height: 34px; border-radius: 50%; background: #0284c7; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.45); border: 2.5px solid white;">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4C2.9 6 1.9 6.8 1.6 7.8L.2 12.8c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2l.8 2.8h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/>
          </svg>
        </div>
        <div style="margin-top: 2px; background: #0f172a; color: #ffffff; font-size: 9px; font-weight: 800; padding: 1px 6px; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.3); white-space: nowrap; letter-spacing: 0.2px;">
          ${vNo}
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
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
                <Tooltip permanent={isSelected}>
                  <div className="text-xs font-semibold">
                    <span className="font-bold text-primary">#{stop.stop_sequence}</span> {stop.name}
                    {isFirst && " (Start)"}
                    {isLast && " (End)"}
                    {primaryEta && primaryEta.etaSeconds >= 0 && (
                      <span className="ml-1 rounded bg-emerald-100 px-1 py-0.5 text-[10px] font-bold text-emerald-700">
                        {formatLiveEta(primaryEta.etaSeconds)}
                      </span>
                    )}
                  </div>
                </Tooltip>

                {isSelected && (
                  <Popup
                    position={[stop.lat, stop.lon]}
                    autoPan={false}
                    eventHandlers={{
                      remove: () => onSelectLiveStop?.(null),
                    }}
                  >
                    <div className="p-1 min-w-[170px] text-slate-800">
                      <div className="flex items-center gap-1 text-xs font-bold text-slate-900">
                        <span>#{stop.stop_sequence}</span>
                        <span>{stop.name}</span>
                      </div>

                      {primaryEta && primaryEta.etaSeconds >= 0 ? (
                        <div className="mt-2 space-y-1 rounded-xl bg-slate-50 p-2 text-xs border border-slate-200/80">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-700">🚌 {primaryEta.vNo}</span>
                            <span className="font-extrabold text-emerald-600">
                              {formatLiveEta(primaryEta.etaSeconds)}
                            </span>
                          </div>
                          {primaryEta.isHalted && (
                            <p className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
                              ⚠️ Bus is halted
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="mt-1.5 rounded-lg bg-slate-50 p-1.5 text-[11px] text-slate-500 border border-slate-200/60">
                          No live bus approaching right now.
                        </div>
                      )}
                    </div>
                  </Popup>
                )}
              </CircleMarker>
            );
          })}

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
