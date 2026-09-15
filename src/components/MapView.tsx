import DevBusRouteInspector from "./DevBusRouteInspector";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Circle,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { useEffect } from "react";
import "leaflet/dist/leaflet.css";
import type { Journey } from "@/lib/routing";
import { allLines, busStops, metroStations } from "@/lib/routing";
import type { NearbyStop } from "@/lib/nearby";

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
    const pts = journey.legs.flatMap((l) => l.path.map((p) => [p.lat, p.lon] as [number, number]));
    if (pts.length > 1) map.fitBounds(pts, { padding: [40, 40] });
  }, [journey, map]);
  return null;
}

/** Smoothly fly to the user's GPS position when it's first acquired. */
function FlyToLocation({ pos }: { pos: { lat: number; lon: number } }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([pos.lat, pos.lon], Math.max(map.getZoom(), 15), { duration: 1.2 });
  }, [pos.lat, pos.lon, map]);
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
              positions={(l.geometry ?? l.points).map((p) => [p.lat, p.lon] as [number, number])}
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
              positions={(l.geometry ?? l.points).map((p) => [p.lat, p.lon] as [number, number])}
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
            (l) => l.mode === "metro" && l.points.some((p) => p.lat === s.lat && p.lon === s.lon),
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
          positions={leg.path.map((p) => [p.lat, p.lon] as [number, number])}
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
          <FlyToLocation pos={nearbyAnchor} />
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
