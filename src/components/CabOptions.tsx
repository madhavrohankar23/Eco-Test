import { useState, useMemo, useEffect, useRef } from "react";
import PlaceSearch, { type Point } from "./PlaceSearch";
import {
  Car,
  Clock,
  Navigation2,
  Users,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  LocateFixed,
  Fuel,
  Info,
  ChevronRight,
  ArrowRight,
  Zap,
  Repeat,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import {
  findUberCabOptions,
  fetchUberNearbyVehicles,
  fetchUberProductPricing,
  type UberProductEstimate,
  type UberNearbyVehicle,
  type UberCabSearchResponse,
} from "@/lib/uberApi";

interface CabOptionsProps {
  origin: Point | null;
  destination: Point | null;
  onSelectOrigin: (point: Point | null) => void;
  onSelectDestination: (point: Point | null) => void;
  onSearchResults: (results: UberCabSearchResponse | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  picking?: "origin" | "destination" | "cab_origin" | "cab_destination" | null;
  onStartPicking?: (target: "cab_origin" | "cab_destination") => void;
  onLocate?: (target: "cab_origin" | "cab_destination") => void;
  locating?: boolean;
}

export default function CabOptions({
  origin,
  destination,
  onSelectOrigin,
  onSelectDestination,
  onSearchResults,
  isLoading,
  setIsLoading,
  picking,
  onStartPicking,
  onLocate,
  locating,
}: CabOptionsProps) {
  const [cabData, setCabData] = useState<UberCabSearchResponse | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<"all" | "car" | "auto" | "bike">("all");
  const [selectedProduct, setSelectedProduct] = useState<UberProductEstimate | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Reference to track active abort controller
  const abortControllerRef = useRef<AbortController | null>(null);

  // Keep reference to latest onSearchResults callback
  const onSearchResultsRef = useRef(onSearchResults);
  useEffect(() => {
    onSearchResultsRef.current = onSearchResults;
  }, [onSearchResults]);

  // Keep reference to current cabData for safe polling updates
  const cabDataRef = useRef(cabData);
  useEffect(() => {
    cabDataRef.current = cabData;
  }, [cabData]);

  // Search Cabs Handler
  const handleSearchCabs = async (targetOrigin?: Point | null, targetDest?: Point | null) => {
    const pOrigin = targetOrigin ?? origin;
    const pDest = targetDest ?? destination;

    if (!pOrigin || !pDest) {
      setErrorMsg("Please select both a pickup location and a dropoff destination.");
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await findUberCabOptions(
        pOrigin.lat,
        pOrigin.lon,
        pDest.lat,
        pDest.lon,
        controller.signal
      );

      if (!isMountedRef.current) return;

      setCabData(response);
      onSearchResultsRef.current?.(response);

      if (response.products && response.products.length > 0) {
        setSelectedProduct(response.products[0] || null);
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      if (err?.name !== "AbortError") {
        console.error("Error finding cabs:", err);
        setErrorMsg("Unable to retrieve Uber cab options right now. Please try again.");
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  // Auto-search cabs on landing / coordinate change if both origin & destination are present
  const lastSearchedRef = useRef<string>("");
  useEffect(() => {
    if (!origin || !destination) return;
    const key = `${origin.lat.toFixed(5)},${origin.lon.toFixed(5)}->${destination.lat.toFixed(5)},${destination.lon.toFixed(5)}`;
    if (lastSearchedRef.current !== key) {
      lastSearchedRef.current = key;
      void handleSearchCabs(origin, destination);
    }
  }, [origin?.lat, origin?.lon, destination?.lat, destination?.lon]);

  // Continuous 4-Second Live Polling Loop for Vehicles & Dynamic Updates
  useEffect(() => {
    if (!origin || !destination || !cabData) return;

    const pollAbortController = new AbortController();

    const interval = setInterval(async () => {
      try {
        const [updatedVehicles, updatedProducts] = await Promise.all([
          fetchUberNearbyVehicles(origin.lat, origin.lon, pollAbortController.signal),
          fetchUberProductPricing(origin.lat, origin.lon, destination.lat, destination.lon, pollAbortController.signal),
        ]);

        if (!isMountedRef.current || pollAbortController.signal.aborted) return;

        const currentData = cabDataRef.current;
        if (!currentData) return;

        const updated: UberCabSearchResponse = {
          ...currentData,
          nearbyVehicles: updatedVehicles.length > 0 ? updatedVehicles : currentData.nearbyVehicles,
          products: updatedProducts.length > 0 ? updatedProducts : currentData.products,
        };

        setCabData(updated);
        onSearchResultsRef.current?.(updated);
      } catch {
        // Silently ignore aborted/failed poll cycles
      }
    }, 4000);

    return () => {
      pollAbortController.abort();
      clearInterval(interval);
    };
  }, [origin?.lat, origin?.lon, destination?.lat, destination?.lon, cabData !== null]);

  // Unmount Cleanup: Abort any active in-flight requests
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Filter vehicles by selected category for map visualization
  const filteredVehicles = useMemo(() => {
    if (!cabData?.nearbyVehicles) return [];
    if (selectedCategory === "all") return cabData.nearbyVehicles;
    return cabData.nearbyVehicles.filter((v) => {
      if (selectedCategory === "auto") return v.vehicleCategory === "auto";
      if (selectedCategory === "bike") return v.vehicleCategory === "bike";
      if (selectedCategory === "car") return v.vehicleCategory === "car" || v.vehicleCategory === "premier";
      return true;
    });
  }, [cabData?.nearbyVehicles, selectedCategory]);

  // Synchronize category-filtered vehicles and cab data to parent map layer
  useEffect(() => {
    if (!cabData) return;
    onSearchResultsRef.current?.({
      ...cabData,
      nearbyVehicles: filteredVehicles,
    });
  }, [cabData, filteredVehicles]);

  // Filter products by selected category
  const filteredProducts = useMemo(() => {
    if (!cabData?.products) return [];
    if (selectedCategory === "all") return cabData.products;

    return cabData.products.filter((p) => {
      const name = p.displayName.toLowerCase();
      if (selectedCategory === "auto") return name.includes("auto") || name.includes("tuktuk");
      if (selectedCategory === "bike") {
        return name.includes("bike") || name.includes("moto") || name.includes("parcel") || name.includes("courier") || name.includes("connect");
      }
      if (selectedCategory === "car") {
        return !name.includes("auto") && !name.includes("tuktuk") && !name.includes("bike") && !name.includes("moto") && !name.includes("parcel") && !name.includes("courier") && !name.includes("connect");
      }
      return true;
    });
  }, [cabData, selectedCategory]);

  // Calculate clock arrival time (e.g., "7:15 PM")
  const calculateArrivalTime = (tripDurationSec: number) => {
    const now = new Date();
    const arrivalDate = new Date(now.getTime() + tripDurationSec * 1000);
    return arrivalDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  };

  // Deep link URL to Uber Official Rider Website with pickup and dropoff pre-set
  const getUberDeepLink = (prod?: UberProductEstimate) => {
    if (!origin || !destination) return "https://www.uber.com/in/en/rider-home/";
    const pickupLat = origin.lat;
    const pickupLng = origin.lon;
    const pickupName = encodeURIComponent(origin.name || "Pickup");
    const dropLat = destination.lat;
    const dropLng = destination.lon;
    const dropName = encodeURIComponent(destination.name || "Destination");

    return `https://m.uber.com/looking?pickup[latitude]=${pickupLat}&pickup[longitude]=${pickupLng}&pickup[formatted_address]=${pickupName}&destination[latitude]=${dropLat}&destination[longitude]=${dropLng}&destination[formatted_address]=${dropName}`;
  };

  return (
    <div className="space-y-4 text-slate-800 dark:text-slate-100 font-sans">
      {/* ── 1. Top Feature Banner & Live Indicator (Ultra-Premium Uber Dark Theme) ── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-neutral-950 via-slate-950 to-neutral-900 p-3.5 text-white shadow-lg">
        {/* Subtle accent glow */}
        <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-emerald-500/10 blur-xl" />

        <div className="relative flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-black font-black text-xs tracking-tight shadow-md">
              Uber
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-bold leading-tight text-white flex items-center gap-1.5">
                <span>Cab Options & Fare Estimates</span>
              </h2>
              <p className="truncate text-[11px] text-neutral-300 font-normal mt-0.5">
                Live Uber Go, Auto, Premier & Bike pricing
              </p>
            </div>
          </div>

          {cabData && (
            <button
              onClick={() => void handleSearchCabs()}
              disabled={isLoading}
              title="Refresh Cab Fares"
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-white/20 active:scale-95 backdrop-blur-sm shadow-xs"
            >
              <RefreshCw className={`size-3 text-emerald-400 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Source & Destination Search Inputs ── */}
      <div
        onKeyDown={(e) => {
          if (e.key === "Enter" && origin && destination && !isLoading) {
            void handleSearchCabs();
          }
        }}
        className="relative rounded-2xl border border-border/80 bg-secondary/20 p-3 shadow-inner"
      >
        {/* Connected Dots Decorator */}
        <div className="pointer-events-none absolute left-6 top-8 flex flex-col items-center">
          <span className="size-2.5 rounded-full border-2 border-black bg-white dark:border-white" />
          <span className="my-1 h-8 w-0.5 bg-border" />
          <span className="size-2.5 rounded-full bg-emerald-600" />
        </div>

        <div className="space-y-2.5 pl-7 pr-8">
          <PlaceSearch
            label="Pickup Location"
            placeholder="Choose pickup point or tap map"
            value={origin}
            onChange={onSelectOrigin}
            dot="bg-black dark:bg-white"
            isPickingMap={picking === "cab_origin"}
            onFocus={() => onStartPicking?.("cab_origin")}
            onLocate={() => onLocate?.("cab_origin")}
            locating={locating}
          />
          <PlaceSearch
            label="Dropoff Destination"
            placeholder="Choose destination or tap map"
            value={destination}
            onChange={onSelectDestination}
            dot="bg-emerald-600"
            isPickingMap={picking === "cab_destination"}
            onFocus={() => onStartPicking?.("cab_destination")}
            onLocate={() => onLocate?.("cab_destination")}
            locating={locating}
          />
        </div>

        {/* Swap / Switch Button */}
        <button
          type="button"
          onClick={() => {
            const temp = origin;
            onSelectOrigin(destination);
            onSelectDestination(temp);
          }}
          title="Swap pickup and dropoff"
          className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-xl border border-border bg-white p-2 text-muted-foreground shadow-sm transition hover:bg-secondary hover:text-foreground active:scale-95 dark:bg-card"
        >
          <Repeat className="size-4 rotate-90" />
        </button>
      </div>

      {picking && (
        <p className="text-center text-xs text-muted-foreground animate-in fade-in">
          <MapPin className="mr-1 inline-block size-3 animate-pulse text-black dark:text-white" />
          Click anywhere on the map to drop the{" "}
          <span className="font-semibold text-foreground">
            {picking === "cab_origin" ? "pickup" : "dropoff"}
          </span>{" "}
          pin. Press <kbd className="rounded border border-border bg-secondary px-1 font-mono text-[10px]">Esc</kbd> to cancel.
        </p>
      )}

      {errorMsg && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {errorMsg}
        </p>
      )}

      {/* ── 3. Find Cabs Action Button ── */}
      <button
        onClick={() => void handleSearchCabs()}
        disabled={isLoading || !origin || !destination}
        className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-xs font-bold shadow-md transition active:scale-98 ${
          !origin || !destination
            ? "cursor-not-allowed bg-secondary text-muted-foreground opacity-60"
            : "bg-black text-white hover:bg-neutral-850 dark:bg-white dark:text-black dark:hover:bg-slate-200"
        }`}
      >
        {isLoading ? (
          <>
            <RefreshCw className="size-4 animate-spin" />
            <span>Finding Available Uber Cabs...</span>
          </>
        ) : (
          <>
            <Car className="size-4" />
            <span>Find Cabs & Live Fares</span>
          </>
        )}
      </button>

      {/* ── 4. Cab Results View (Matching Uber Web UI) ── */}
      {cabData && (
        <div className="space-y-3 pt-1">
          {/* Header */}
          <div className="border-b border-border/60 pb-2">
            <h3 className="text-sm font-extrabold text-foreground tracking-tight">
              Choose a ride
            </h3>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pt-1">
            {(
              [
                { id: "all", label: "All Rides" },
                { id: "car", label: "Cars" },
                { id: "auto", label: "Autos" },
                { id: "bike", label: "Bikes & Parcel" },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-xl border px-3 py-1 text-[11px] font-bold transition active:scale-95 ${
                  selectedCategory === cat.id
                    ? "border-black bg-black text-white shadow-xs dark:border-white dark:bg-white dark:text-black"
                    : "border-border bg-white text-muted-foreground hover:border-slate-400 hover:text-foreground dark:bg-card"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Product Cards List */}
          <div className="max-h-[calc(100vh-420px)] space-y-2 overflow-y-auto pr-0.5">
            {filteredProducts.map((prod, idx) => {
              const isSelected = selectedProduct?.displayName === prod.displayName;
              const arrivalTimeStr = calculateArrivalTime(prod.estimatedTripTime);

              return (
                <div
                  key={`${prod.displayName}-${idx}`}
                  onClick={() => setSelectedProduct(prod)}
                  className={`group relative flex cursor-pointer items-center justify-between rounded-2xl border p-3 transition-all active:scale-98 ${
                    isSelected
                      ? "border-2 border-black bg-slate-50/90 shadow-md ring-1 ring-black/10 dark:border-white dark:bg-card dark:ring-white/20"
                      : "border-border/80 bg-white hover:border-slate-400 hover:bg-secondary/20 dark:bg-card/70"
                  }`}
                >
                  {/* Left: Product Image & Details */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative flex size-14 shrink-0 items-center justify-center rounded-xl bg-secondary/30 p-1">
                      {prod.productImageUrl ? (
                        <img
                          src={prod.productImageUrl}
                          alt={prod.displayName}
                          className="size-12 object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <Car className="size-8 text-foreground" />
                      )}
                    </div>

                    <div className="min-w-0">
                      {/* Name + Capacity Icon */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="truncate text-sm font-bold text-foreground">
                          {prod.displayName}
                        </h4>
                        <span className="flex items-center gap-0.5 rounded-md bg-secondary/80 px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                          <Users className="size-2.5" />
                          <span>{prod.capacity}</span>
                        </span>
                      </div>

                      {/* ETA & Drop-off Clock Arrival Time */}
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <span className="font-bold text-foreground">
                          {prod.etaInMin} min away
                        </span>
                        <span>•</span>
                        <span>
                          {arrivalTimeStr}
                        </span>
                      </div>

                      {/* Badges / Description */}
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        {prod.badge && (
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-bold ${
                              prod.badge.includes("Faster")
                                ? "bg-sky-50 text-sky-700 border border-sky-200/60 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/40"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/40"
                            }`}
                          >
                            {prod.badge}
                          </span>
                        )}

                        {prod.detailedDescription && !prod.badge && (
                          <p className="truncate text-[10.5px] text-muted-foreground">
                            {prod.detailedDescription}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Fare Range */}
                  <div className="ml-3 text-right shrink-0">
                    <div className="text-sm font-extrabold text-foreground tracking-tight">
                      {prod.fare}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                <Car className="mx-auto size-6 text-muted-foreground/40" />
                <p className="mt-2 font-semibold">No rides found in this category</p>
              </div>
            )}
          </div>

          {/* ── 5. Big Primary Action CTA Button (Redirects to Official Uber with source & destination set) ── */}
          <div className="pt-1">
            <a
              href={getUberDeepLink(selectedProduct || undefined)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-sm font-extrabold text-white shadow-lg transition hover:bg-neutral-850 active:scale-98 dark:bg-white dark:text-black dark:hover:bg-slate-200"
            >
              <span>Request a Cab</span>
              <ArrowRight className="size-4" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
