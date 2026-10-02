import React, { useState, useMemo, useEffect } from "react";
import {
  X,
  Sparkles,
  TrainFront,
  Bus,
  Users,
  IndianRupee,
  Leaf,
  Tag,
  Plus,
  Trash2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
  Repeat,
  Search,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Lock,
} from "lucide-react";
import {
  type TicketCategory,
  type TransitMode,
  type PassengerBreakdown,
  type IssuedTicket,
  type TransitLegItem,
  type BusRouteSummary,
  NAGPUR_METRO_LINES,
  getAvailableBusRoutes,
  calculateMultiLegFareSummary,
  generateTicketId,
  saveIssuedTicket,
} from "@/lib/ticketing";
import { useAuth } from "@/context/AuthContext";
import { saveUserTicket } from "@/services/ticketService";
import { recordTripCo2Savings } from "@/services/ecoRewardsService";
import { sendTicketConfirmationEmail } from "@/services/emailService";
import DummyPaymentModal from "./DummyPaymentModal";
import DigitalTicketPass from "./DigitalTicketPass";

interface SearchableBusPickerProps {
  disabled?: boolean;
  selectedRouteNumber: string;
  onSelectRoute: (routeNumber: string) => void;
  busRoutes: BusRouteSummary[];
}

function SearchableBusPicker({
  disabled = false,
  selectedRouteNumber,
  onSelectRoute,
  busRoutes,
}: SearchableBusPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedRoute = useMemo(() => {
    if (!selectedRouteNumber) return null;
    return (
      busRoutes.find((r) => r.busNumber === selectedRouteNumber) ||
      busRoutes.find((r) => r.busNumber.toLowerCase() === selectedRouteNumber.toLowerCase()) ||
      busRoutes.find(
        (r) => r.busNumber.replace(/[^0-9]/g, "") === selectedRouteNumber.replace(/[^0-9]/g, "")
      ) ||
      null
    );
  }, [busRoutes, selectedRouteNumber]);

  const filteredRoutes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return busRoutes.slice(0, 18);
    }
    return busRoutes
      .filter((r) => {
        const matchNum = r.busNumber.toLowerCase().includes(q);
        const matchFrom = r.from.toLowerCase().includes(q);
        const matchTo = r.to.toLowerCase().includes(q);
        const matchStops = r.stops.some((s) => s.toLowerCase().includes(q));
        return matchNum || matchFrom || matchTo || matchStops;
      })
      .slice(0, 35);
  }, [busRoutes, query]);

  return (
    <div className="space-y-1 relative">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-medium text-muted-foreground">Select Bus Route</label>
        {selectedRoute && !disabled && !isOpen && (
          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setQuery("");
            }}
            className="text-[10px] font-semibold text-primary hover:underline cursor-pointer flex items-center gap-1"
          >
            <Search className="size-2.5" /> Search & Change Bus
          </button>
        )}
      </div>

      {/* Selected Bus Card Preview */}
      {selectedRoute && !isOpen ? (
        <div
          onClick={() => {
            if (!disabled) {
              setIsOpen(true);
              setQuery("");
            }
          }}
          className={`flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 transition ${
            disabled ? "opacity-95 cursor-default" : "hover:border-amber-500/60 hover:bg-amber-500/15 cursor-pointer"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500 text-white font-bold text-xs shrink-0 shadow-sm">
              <Bus className="size-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-foreground">Bus {selectedRoute.busNumber}</span>
                <span className="text-[10px] text-muted-foreground font-mono">({selectedRoute.stopsCount} stops)</span>
              </div>
              <p className="truncate text-[10px] text-muted-foreground">
                {selectedRoute.from} ⇄ {selectedRoute.to}
              </p>
            </div>
          </div>

          {!disabled && (
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 shrink-0 ml-2">
              Change ▾
            </span>
          )}
        </div>
      ) : (
        /* Search Box & Dropdown */
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 size-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              disabled={disabled}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder="Search bus number (e.g. 135, 35, 1)"
              className="w-full rounded-xl border border-border bg-card pl-8 pr-8 py-2 text-xs font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Search Dropdown Menu */}
          {isOpen && (
            <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-2xl border border-border bg-card p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between border-b border-border/50 mb-1">
                <span>{query ? `Matching Buses (${filteredRoutes.length})` : "Nagpur Bus Routes (Search above)"}</span>
                {selectedRoute && (
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="text-primary text-[10px] lowercase hover:underline cursor-pointer"
                  >
                    done
                  </button>
                )}
              </div>

              {filteredRoutes.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No bus routes found matching "{query}".
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filteredRoutes.map((r) => {
                    const isSelected = selectedRouteNumber === r.busNumber;
                    return (
                      <button
                        key={`route-opt-${r.busNumber}-${r.from}`}
                        type="button"
                        onClick={() => {
                          onSelectRoute(r.busNumber);
                          setIsOpen(false);
                          setQuery("");
                        }}
                        className={`w-full text-left flex items-center justify-between rounded-xl px-2.5 py-1.5 transition cursor-pointer ${
                          isSelected
                            ? "bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-100"
                            : "hover:bg-secondary text-foreground"
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs">Bus {r.busNumber}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {r.stopsCount} stops
                            </span>
                          </div>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {r.from} ⇄ {r.to}
                          </p>
                        </div>
                        {isSelected && (
                          <span className="text-[10px] font-bold text-amber-600 shrink-0">✓ Selected</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface TicketBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFrom?: string | undefined;
  initialTo?: string | undefined;
  initialMode?: TransitMode | undefined;
  initialLegs?: TransitLegItem[] | undefined;
  isLockedRoute?: boolean | undefined;
  onTicketPurchased?: ((ticket: IssuedTicket) => void) | undefined;
}

export default function TicketBookingModal({
  isOpen,
  onClose,
  initialFrom,
  initialTo,
  initialMode = "combo",
  initialLegs,
  isLockedRoute = false,
  onTicketPurchased,
}: TicketBookingModalProps) {
  const { user, profile } = useAuth();
  const userId = user?.id || "guest";

  // Ticket Category State
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory>(
    initialMode === "metro"
      ? "standard_metro"
      : initialMode === "bus"
      ? "standard_bus"
      : "exclusive_eco"
  );

  const busRoutes = useMemo(() => getAvailableBusRoutes(), []);

  // All Metro Stations
  const allMetroStations = useMemo(() => {
    const set = new Set<string>();
    NAGPUR_METRO_LINES.forEach((l) => l.stations.forEach((s) => set.add(s)));
    return Array.from(set);
  }, []);

  // Up to 4 Transit Segments - Start with unselected placeholders on fresh open
  const [legs, setLegs] = useState<TransitLegItem[]>(() => {
    if (initialLegs && initialLegs.length > 0) {
      return initialLegs.slice(0, 4);
    }
    if (initialMode === "metro") {
      return [
        {
          id: "leg-metro-1",
          mode: "metro",
          lineOrRoute: "Aqua Line",
          from: "",
          to: "",
          fare: 0,
        },
      ];
    }
    if (initialMode === "bus") {
      return [
        {
          id: "leg-bus-1",
          mode: "bus",
          lineOrRoute: "",
          from: "",
          to: "",
          fare: 0,
        },
      ];
    }
    // Default 2-leg multimodal starter with empty placeholders
    return [
      {
        id: "leg-1",
        mode: "metro",
        lineOrRoute: "Aqua Line",
        from: "",
        to: "",
        fare: 0,
      },
      {
        id: "leg-2",
        mode: "bus",
        lineOrRoute: "",
        from: "",
        to: "",
        fare: 0,
      },
    ];
  });

  // Category determination for locked mode
  const allowedCategory: TicketCategory = useMemo(() => {
    const hasMetro = legs.some((l) => l.mode === "metro");
    const hasBus = legs.some((l) => l.mode === "bus");
    if (hasMetro && hasBus) return "exclusive_eco";
    if (legs.length > 1) return "exclusive_eco";
    if (hasMetro) return "standard_metro";
    return "standard_bus";
  }, [legs]);

  // Re-sync if initialLegs changes when opening from journey planner
  useEffect(() => {
    if (initialLegs && initialLegs.length > 0) {
      setLegs(initialLegs.slice(0, 4));
      const hasMetro = initialLegs.some((l) => l.mode === "metro");
      const hasBus = initialLegs.some((l) => l.mode === "bus");
      if (initialLegs.length > 1 || (hasMetro && hasBus)) {
        setSelectedCategory("exclusive_eco");
      } else if (initialLegs[0]?.mode === "metro") {
        setSelectedCategory("standard_metro");
      } else {
        setSelectedCategory("standard_bus");
      }
    }
  }, [initialLegs, isOpen]);

  useEffect(() => {
    if (isLockedRoute) {
      setSelectedCategory(allowedCategory);
    }
  }, [isLockedRoute, allowedCategory]);

  // Passenger state
  const [passengers, setPassengers] = useState<PassengerBreakdown>({
    adult: 1,
    student: 0,
    senior: 0,
  });

  // Flow modals
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [issuedTicket, setIssuedTicket] = useState<IssuedTicket | null>(null);

  // Add a new leg (up to 4)
  const handleAddLeg = (modeType: "metro" | "bus") => {
    if (isLockedRoute || legs.length >= 4) return;
    const newId = `leg-${Date.now()}`;
    if (modeType === "metro") {
      setLegs((prev) => [
        ...prev,
        {
          id: newId,
          mode: "metro",
          lineOrRoute: "Orange Line",
          from: "",
          to: "",
          fare: 0,
        },
      ]);
    } else {
      setLegs((prev) => [
        ...prev,
        {
          id: newId,
          mode: "bus",
          lineOrRoute: "",
          from: "",
          to: "",
          fare: 0,
        },
      ]);
    }
    // If multiple legs, auto-select Eco-Move Exclusive
    if (legs.length + 1 > 1) {
      setSelectedCategory("exclusive_eco");
    }
  };

  const handleRemoveLeg = (idx: number) => {
    if (isLockedRoute || legs.length <= 1) return;
    setLegs((prev) => prev.filter((_, i) => i !== idx));
  };

  // Drag and drop reordering state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleReorderLegs = (fromIndex: number, toIndex: number) => {
    if (isLockedRoute || fromIndex === toIndex) return;
    setLegs((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      if (moved) {
        updated.splice(toIndex, 0, moved);
      }
      return updated;
    });
  };

  const handleMoveLeg = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= legs.length) return;
    handleReorderLegs(index, targetIndex);
  };

  const handleUpdateLeg = (idx: number, updates: Partial<TransitLegItem>) => {
    if (isLockedRoute) return;
    setLegs((prev) => {
      const copy = [...prev];
      if (copy[idx]) {
        copy[idx] = { ...copy[idx]!, ...updates };
      }
      return copy;
    });
  };

  // Dynamic Fare Calculation for all legs
  const fareSummary = useMemo(() => {
    return calculateMultiLegFareSummary({
      category: selectedCategory,
      legs,
      passengers,
    });
  }, [selectedCategory, legs, passengers]);

  const totalPassengerCount =
    passengers.adult + passengers.student + passengers.senior;

  const isEcoPassMultiLeg = selectedCategory !== "exclusive_eco" || legs.length >= 2;

  const areLegsComplete =
    legs.length > 0 &&
    legs.every((l) => {
      if (l.mode === "metro") {
        return Boolean(l.from && l.to);
      } else {
        return Boolean(l.lineOrRoute && l.from && l.to);
      }
    });

  const isFormValid =
    areLegsComplete &&
    isEcoPassMultiLeg &&
    totalPassengerCount > 0 &&
    fareSummary.finalTotalFare > 0;

  const handleProceedToPayment = () => {
    if (!isFormValid) return;
    setIsPaymentOpen(true);
  };

  const handlePaymentSuccess = (paymentMethod: any, txnRef: string) => {
    const now = new Date();
    // Metro tickets and Eco passes valid 24 Hours, Single Bus tickets valid 2 Hours
    const validityHours = selectedCategory === "standard_bus" && legs.length === 1 ? 2 : 24;
    const expiry = new Date(now.getTime() + validityHours * 60 * 60 * 1000);

    const firstLeg = legs[0]!;
    const lastLeg = legs[legs.length - 1]!;
    const sourceName = firstLeg.from;
    const destinationName = lastLeg.to;

    let routeDescription = "";
    if (legs.length === 1) {
      routeDescription =
        firstLeg.mode === "metro"
          ? `Maha Metro (${firstLeg.lineOrRoute})`
          : `Aapli Bus (Route ${firstLeg.lineOrRoute})`;
    } else {
      routeDescription = legs
        .map((l) => (l.mode === "metro" ? `Metro ${l.lineOrRoute}` : `Bus ${l.lineOrRoute}`))
        .join(" ➔ ");
    }

    const updatedLegsWithFares: TransitLegItem[] = legs.map((l, i) => ({
      ...l,
      fare: fareSummary.legFares[i] ?? l.fare,
    }));

    const ticket: IssuedTicket = {
      id: generateTicketId(),
      category: selectedCategory,
      mode: legs.some((l) => l.mode === "metro") && legs.some((l) => l.mode === "bus") ? "combo" : legs[0]?.mode || "combo",
      title:
        selectedCategory === "exclusive_eco"
          ? "Eco-Move Exclusive Pass"
          : legs[0]?.mode === "metro"
          ? "Maha Metro Smart Ticket"
          : "Aapli Bus Digital Ticket",
      source: sourceName,
      destination: destinationName,
      viaInterchange: legs.length > 1 ? "Sitabuldi Interchange" : undefined,
      lineOrRouteName: routeDescription,
      legs: updatedLegsWithFares,
      currentLegIndex: 0,
      currentLegStep: "not_started",
      bookingTime: now.toISOString(),
      validUntil: expiry.toISOString(),
      passengers: { ...passengers },
      totalPassengers: totalPassengerCount,
      standardBaseFare: fareSummary.standardTotal,
      discountAmount: fareSummary.totalDiscountAmount,
      discountPercent: selectedCategory === "exclusive_eco" ? 12 : 0,
      finalFare: fareSummary.finalTotalFare,
      co2SavedKg: fareSummary.co2SavedKg,
      greenPointsEarned: fareSummary.greenPointsEarned,
      paymentMethod,
      transactionRef: txnRef,
      qrPayload: `ECO_NAGPUR_PASS:${Date.now()}:${sourceName}->${destinationName}`,
      status: "active",
      gateScans: [],
    };

    saveIssuedTicket(ticket);
    void saveUserTicket(userId, ticket);

    if (ticket.co2SavedKg && ticket.co2SavedKg > 0) {
      void recordTripCo2Savings(userId, ticket.co2SavedKg);
    }

    // Automatically send confirmation email to user's registered email
    const registeredEmail = user?.email || profile?.email;
    const userName = profile?.fullName || (user?.user_metadata?.["full_name"] as string) || "Nagpur Commuter";
    if (registeredEmail) {
      void sendTicketConfirmationEmail({
        recipientEmail: registeredEmail,
        userName,
        ticket,
      });
    }

    setIssuedTicket(ticket);
    setIsPaymentOpen(false);
    if (onTicketPurchased) {
      onTicketPurchased(ticket);
    }
  };

  if (!isOpen) return null;

  if (issuedTicket) {
    return (
      <DigitalTicketPass
        ticket={issuedTicket}
        onClose={() => {
          setIssuedTicket(null);
          onClose();
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex max-h-[94vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-border/80 bg-card shadow-2xl shadow-black/40">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-card px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">Buy Tickets / Pass</h2>
                {isLockedRoute && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-2 py-0.2 text-[9px] font-extrabold">
                    <ShieldCheck className="size-2.5" /> Planned Route
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            title="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Category Selector Tabs */}
          <div className="grid grid-cols-3 gap-2">
            {/* Mode 1: Eco-Move Exclusive Combo Pass */}
            <button
              disabled={isLockedRoute && allowedCategory !== "exclusive_eco"}
              onClick={() => {
                setSelectedCategory("exclusive_eco");
                if (legs.length === 1) {
                  if (legs[0]?.mode === "metro") {
                    setLegs([
                      legs[0],
                      {
                        id: "leg-bus-combo",
                        mode: "bus",
                        lineOrRoute: "",
                        from: "",
                        to: "",
                        fare: 0,
                      },
                    ]);
                  } else {
                    setLegs([
                      legs[0]!,
                      {
                        id: "leg-metro-combo",
                        mode: "metro",
                        lineOrRoute: "Aqua Line",
                        from: "",
                        to: "",
                        fare: 0,
                      },
                    ]);
                  }
                }
              }}
              className={`relative flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition ${
                isLockedRoute && allowedCategory !== "exclusive_eco"
                  ? "border-border/60 bg-secondary/30 opacity-70 cursor-not-allowed pointer-events-none"
                  : selectedCategory === "exclusive_eco"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold shadow-sm ring-2 ring-emerald-400/30 cursor-pointer"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary cursor-pointer"
              }`}
            >
              <span className="absolute -top-2 right-2 rounded-full bg-emerald-600 px-1.5 py-0.2 text-[8px] font-black text-white uppercase tracking-wider shadow-sm">
                12% OFF
              </span>
              <Sparkles className="size-5 text-emerald-500" />
              <span className="text-[11px] font-bold text-foreground/90 leading-tight">Eco Pass (Exclusive)</span>
              {isLockedRoute && allowedCategory !== "exclusive_eco" && (
                <span className="flex items-center gap-1 rounded-md bg-secondary/80 px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground border border-border/50">
                  <Lock className="size-2.5" /> Locked
                </span>
              )}
            </button>

            {/* Mode 2: Maha Metro Pass */}
            <button
              disabled={isLockedRoute && allowedCategory !== "standard_metro"}
              onClick={() => {
                setSelectedCategory("standard_metro");
                const existingMetro = legs.find((l) => l.mode === "metro");
                if (existingMetro) {
                  setLegs([existingMetro]);
                } else {
                  setLegs([
                    {
                      id: "leg-single-metro",
                      mode: "metro",
                      lineOrRoute: "Aqua Line",
                      from: "",
                      to: "",
                      fare: 0,
                    },
                  ]);
                }
              }}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition ${
                isLockedRoute && allowedCategory !== "standard_metro"
                  ? "border-border/60 bg-secondary/30 opacity-70 cursor-not-allowed pointer-events-none"
                  : selectedCategory === "standard_metro"
                  ? "border-blue-500 bg-blue-500/10 text-blue-600 font-bold shadow-sm ring-2 ring-blue-400/30 cursor-pointer"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary cursor-pointer"
              }`}
            >
              <TrainFront className="size-5 text-blue-500" />
              <span className="text-[11px] font-bold text-foreground/90 leading-tight">Metro</span>
              {isLockedRoute && allowedCategory !== "standard_metro" && (
                <span className="flex items-center gap-1 rounded-md bg-secondary/80 px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground border border-border/50">
                  <Lock className="size-2.5" /> Locked
                </span>
              )}
            </button>

            {/* Mode 3: Aapli Bus Pass */}
            <button
              disabled={isLockedRoute && allowedCategory !== "standard_bus"}
              onClick={() => {
                setSelectedCategory("standard_bus");
                const existingBus = legs.find((l) => l.mode === "bus");
                if (existingBus) {
                  setLegs([existingBus]);
                } else {
                  setLegs([
                    {
                      id: "leg-single-bus",
                      mode: "bus",
                      lineOrRoute: "",
                      from: "",
                      to: "",
                      fare: 0,
                    },
                  ]);
                }
              }}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition ${
                isLockedRoute && allowedCategory !== "standard_bus"
                  ? "border-border/60 bg-secondary/30 opacity-70 cursor-not-allowed pointer-events-none"
                  : selectedCategory === "standard_bus"
                  ? "border-amber-500 bg-amber-500/10 text-amber-600 font-bold shadow-sm ring-2 ring-amber-400/30 cursor-pointer"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary cursor-pointer"
              }`}
            >
              <Bus className="size-5 text-amber-500" />
              <span className="text-[11px] font-bold text-foreground/90 leading-tight">Bus</span>
              {isLockedRoute && allowedCategory !== "standard_bus" && (
                <span className="flex items-center gap-1 rounded-md bg-secondary/80 px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground border border-border/50">
                  <Lock className="size-2.5" /> Locked
                </span>
              )}
            </button>
          </div>

          {/* Validity & Interchange Badges */}
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-200">
            <div className="flex items-center gap-1.5">
              <Clock className="size-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">
                {selectedCategory === "standard_bus" ? "Ticket Validity: 2 Hours" : "Pass Validity: 24 Hours"}
              </span>
            </div>
            {selectedCategory === "exclusive_eco" && (
              <div className="flex items-center gap-1 text-[11px] bg-emerald-600/15 rounded-lg px-2 py-0.5 font-bold text-emerald-900 dark:text-emerald-100">
                <Repeat className="size-3" />
                <span>Interchange: 2 Hrs</span>
              </div>
            )}
          </div>

          {/* Transit Segments List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                {selectedCategory === "exclusive_eco" ? (
                  <span>
                    Add a Transfer ({legs.length}/4)
                    {legs.length > 1 && !isLockedRoute && (
                      <span className="ml-1.5 text-[10px] font-medium text-muted-foreground">
                        (drag to reorder)
                      </span>
                    )}
                  </span>
                ) : selectedCategory === "standard_metro" ? (
                  <span>Metro Journey Details</span>
                ) : (
                  <span>Bus Route & Stops</span>
                )}
              </span>

              {isLockedRoute ? (
                <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="size-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Route Locked from Journey</span>
                </div>
              ) : (
                /* Only display Add Leg buttons for Multimodal Eco Pass */
                selectedCategory === "exclusive_eco" && legs.length < 4 && (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAddLeg("metro")}
                      className="flex items-center gap-1 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 text-blue-700 dark:text-blue-300 px-2.5 py-1 text-[11px] font-bold transition cursor-pointer"
                    >
                      <Plus className="size-3" /> Metro Leg
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddLeg("bus")}
                      className="flex items-center gap-1 rounded-xl bg-amber-600/15 hover:bg-amber-600/25 text-amber-700 dark:text-amber-300 px-2.5 py-1 text-[11px] font-bold transition cursor-pointer"
                    >
                      <Plus className="size-3" /> Bus Leg
                    </button>
                  </div>
                )
              )}
            </div>

            {/* Eco Pass Multi-Transfer Notice */}
            {selectedCategory === "exclusive_eco" && legs.length < 2 && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in duration-150">
                <Sparkles className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="font-bold text-[11px] text-foreground">
                    Eco Pass Requires More Than 1 Transfer (2+ Legs)
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Single Metro or Bus trips use standard single booking. Add at least 1 more Metro or Bus transfer below to qualify for the Eco Pass & exclusive 12% discount.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleAddLeg(legs[0]?.mode === "metro" ? "bus" : "metro")}
                      className="rounded-xl bg-emerald-600 px-3 py-1 text-[10px] font-bold text-white shadow-sm hover:bg-emerald-700 transition cursor-pointer"
                    >
                      + Add {legs[0]?.mode === "metro" ? "Bus" : "Metro"} Leg
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(legs[0]?.mode === "metro" ? "standard_metro" : "standard_bus")}
                      className="rounded-xl bg-card border border-border px-2.5 py-1 text-[10px] font-semibold text-foreground hover:bg-secondary transition cursor-pointer"
                    >
                      Switch to Single {legs[0]?.mode === "metro" ? "Maha Metro" : "Aapli Bus"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {legs.map((leg, index) => {
              const currentLegFare = fareSummary.legFares[index] ?? leg.fare;
              const isDraggable = !isLockedRoute && selectedCategory === "exclusive_eco" && legs.length > 1;
              const isDragging = draggedIndex === index;
              const isDragOver = dragOverIndex === index && draggedIndex !== index;

              return (
                <div
                  key={leg.id || index}
                  draggable={isDraggable}
                  onDragStart={(e) => {
                    if (!isDraggable) return;
                    setDraggedIndex(index);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", String(index));
                  }}
                  onDragOver={(e) => {
                    if (!isDraggable) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dragOverIndex !== index) {
                      setDragOverIndex(index);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverIndex === index) {
                      setDragOverIndex(null);
                    }
                  }}
                  onDrop={(e) => {
                    if (!isDraggable) return;
                    e.preventDefault();
                    if (draggedIndex !== null && draggedIndex !== index) {
                      handleReorderLegs(draggedIndex, index);
                    }
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                  onDragEnd={() => {
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                  className={`relative rounded-2xl border transition-all duration-150 p-3.5 space-y-2.5 shadow-sm ${
                    isDragging
                      ? "opacity-35 scale-[0.98] border-dashed border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/5"
                      : isDragOver
                      ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-400/40 scale-[1.01]"
                      : "border-border bg-secondary/20 hover:border-border/80"
                  }`}
                >
                  {/* Leg Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isDraggable && (
                        <div
                          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition p-0.5 rounded touch-none"
                          title="Drag to rearrange sequence"
                        >
                          <GripVertical className="size-4" />
                        </div>
                      )}
                      {selectedCategory === "exclusive_eco" && (
                        <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-background text-[10px] font-black">
                          {index + 1}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                        {leg.mode === "metro" ? (
                          <TrainFront className="size-4 text-blue-600" />
                        ) : (
                          <Bus className="size-4 text-amber-500" />
                        )}
                        <span>{leg.mode === "metro" ? "Metro" : "Bus"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="rounded-xl bg-foreground/10 px-2 py-0.5 text-xs font-bold text-foreground">
                        ₹{currentLegFare}
                      </span>

                      {/* Quick Up / Down Reorder Controls */}
                      {isDraggable && (
                        <div className="flex items-center rounded-lg border border-border bg-card p-0.5 shadow-2xs">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMoveLeg(index, "up")}
                            className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-25 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                            title="Move Up in sequence"
                          >
                            <ChevronUp className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === legs.length - 1}
                            onClick={() => handleMoveLeg(index, "down")}
                            className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-25 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                            title="Move Down in sequence"
                          >
                            <ChevronDown className="size-3.5" />
                          </button>
                        </div>
                      )}

                      {!isLockedRoute && selectedCategory === "exclusive_eco" && legs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLeg(index)}
                          className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition cursor-pointer"
                          title="Remove Leg"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Leg Content */}
                  {leg.mode === "metro" ? (
                    <div className="space-y-2">
                      {/* Origin & Destination Dropdowns */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-medium text-muted-foreground">Boarding Station</label>
                          <select
                            disabled={isLockedRoute}
                            value={leg.from}
                            onChange={(e) => {
                              const fromVal = e.target.value;
                              const toVal = leg.to;
                              const aquaStations = NAGPUR_METRO_LINES.find((l) => l.id === "aqua")?.stations || [];
                              const orangeStations = NAGPUR_METRO_LINES.find((l) => l.id === "orange")?.stations || [];
                              let lineName = "Maha Metro";
                              const fromAqua = aquaStations.includes(fromVal);
                              const toAqua = aquaStations.includes(toVal);
                              const fromOrange = orangeStations.includes(fromVal);
                              const toOrange = orangeStations.includes(toVal);
                              if (fromAqua && toAqua) lineName = "Aqua Line";
                              else if (fromOrange && toOrange) lineName = "Orange Line";
                              else if ((fromAqua && toOrange) || (fromOrange && toAqua)) lineName = "Aqua Line ➔ Orange Line";
                              else if (fromAqua) lineName = "Aqua Line";
                              else if (fromOrange) lineName = "Orange Line";

                              handleUpdateLeg(index, { from: fromVal, lineOrRoute: lineName });
                            }}
                            className={`mt-1 w-full rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none ${
                              isLockedRoute ? "opacity-95 bg-secondary/30 cursor-default" : ""
                            }`}
                          >
                            <option value="">-- Choose Boarding Station --</option>
                            {!allMetroStations.includes(leg.from) && leg.from && (
                              <option value={leg.from}>{leg.from}</option>
                            )}
                            <optgroup label="Aqua Line (East-West)">
                              {NAGPUR_METRO_LINES.find((l) => l.id === "aqua")?.stations.map((st) => (
                                <option key={`metro-aqua-from-${index}-${st}`} value={st}>
                                  {st}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Orange Line (North-South)">
                              {NAGPUR_METRO_LINES.find((l) => l.id === "orange")?.stations.map((st) => (
                                <option key={`metro-orange-from-${index}-${st}`} value={st}>
                                  {st}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-medium text-muted-foreground">Alighting Station</label>
                          <select
                            disabled={isLockedRoute}
                            value={leg.to}
                            onChange={(e) => {
                              const fromVal = leg.from;
                              const toVal = e.target.value;
                              const aquaStations = NAGPUR_METRO_LINES.find((l) => l.id === "aqua")?.stations || [];
                              const orangeStations = NAGPUR_METRO_LINES.find((l) => l.id === "orange")?.stations || [];
                              let lineName = "Maha Metro";
                              const fromAqua = aquaStations.includes(fromVal);
                              const toAqua = aquaStations.includes(toVal);
                              const fromOrange = orangeStations.includes(fromVal);
                              const toOrange = orangeStations.includes(toVal);
                              if (fromAqua && toAqua) lineName = "Aqua Line";
                              else if (fromOrange && toOrange) lineName = "Orange Line";
                              else if ((fromAqua && toOrange) || (fromOrange && toAqua)) lineName = "Aqua Line ➔ Orange Line";
                              else if (toAqua) lineName = "Aqua Line";
                              else if (toOrange) lineName = "Orange Line";

                              handleUpdateLeg(index, { to: toVal, lineOrRoute: lineName });
                            }}
                            className={`mt-1 w-full rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none ${
                              isLockedRoute ? "opacity-95 bg-secondary/30 cursor-default" : ""
                            }`}
                          >
                            <option value="">-- Choose Alighting Station --</option>
                            {!allMetroStations.includes(leg.to) && leg.to && (
                              <option value={leg.to}>{leg.to}</option>
                            )}
                            <optgroup label="Aqua Line (East-West)">
                              {NAGPUR_METRO_LINES.find((l) => l.id === "aqua")?.stations.map((st) => (
                                <option key={`metro-aqua-to-${index}-${st}`} value={st}>
                                  {st}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Orange Line (North-South)">
                              {NAGPUR_METRO_LINES.find((l) => l.id === "orange")?.stations.map((st) => (
                                <option key={`metro-orange-to-${index}-${st}`} value={st}>
                                  {st}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Searchable Bus Route Picker */}
                      <SearchableBusPicker
                        disabled={isLockedRoute}
                        selectedRouteNumber={leg.lineOrRoute}
                        onSelectRoute={(routeNo) => {
                          handleUpdateLeg(index, {
                            lineOrRoute: routeNo,
                            from: "",
                            to: "",
                          });
                        }}
                        busRoutes={busRoutes}
                      />

                      {/* Bus Stops */}
                      {(() => {
                        const foundRoute =
                          busRoutes.find((r) => r.busNumber === leg.lineOrRoute) ||
                          busRoutes.find((r) => r.busNumber.toLowerCase() === leg.lineOrRoute.toLowerCase()) ||
                          busRoutes.find(
                            (r) => r.busNumber.replace(/[^0-9]/g, "") === leg.lineOrRoute.replace(/[^0-9]/g, "")
                          );
                        const stops = foundRoute?.stops || [];
                        const fromInStops = stops.includes(leg.from);
                        const toInStops = stops.includes(leg.to);

                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-medium text-muted-foreground">Boarding Stop</label>
                              <select
                                disabled={isLockedRoute || !foundRoute}
                                value={leg.from}
                                onChange={(e) => handleUpdateLeg(index, { from: e.target.value })}
                                className={`mt-1 w-full rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground focus:border-primary focus:outline-none disabled:opacity-50 ${
                                  isLockedRoute ? "opacity-95 bg-secondary/30 cursor-default" : ""
                                }`}
                              >
                                <option value="">
                                  {foundRoute ? "-- Choose Boarding Stop --" : "-- Select Bus First --"}
                                </option>
                                {!fromInStops && leg.from && (
                                  <option value={leg.from}>{leg.from}</option>
                                )}
                                {stops.map((st) => (
                                  <option key={`bus-from-${index}-${st}`} value={st}>
                                    {st}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] font-medium text-muted-foreground">Drop-off Stop</label>
                              <select
                                disabled={isLockedRoute || !foundRoute}
                                value={leg.to}
                                onChange={(e) => handleUpdateLeg(index, { to: e.target.value })}
                                className={`mt-1 w-full rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground focus:border-primary focus:outline-none disabled:opacity-50 ${
                                  isLockedRoute ? "opacity-95 bg-secondary/30 cursor-default" : ""
                                }`}
                              >
                                <option value="">
                                  {foundRoute ? "-- Choose Drop-off Stop --" : "-- Select Bus First --"}
                                </option>
                                {!toInStops && leg.to && (
                                  <option value={leg.to}>{leg.to}</option>
                                )}
                                {stops.map((st) => (
                                  <option key={`bus-to-${index}-${st}`} value={st}>
                                    {st}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Passenger Selector & Concessions */}
          <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Users className="size-3.5 text-primary" /> Passenger Count
            </span>

            <div className="grid grid-cols-3 gap-2">
              {/* Adults */}
              <div className="flex flex-col items-center rounded-xl border border-border bg-secondary/30 p-2.5">
                <span className="text-[11px] font-bold text-foreground">Adult</span>
                <span className="text-[9px] text-muted-foreground">Standard Fare</span>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPassengers((p) => ({ ...p, adult: Math.max(0, p.adult - 1) }))}
                    className="size-6 rounded-lg bg-card border border-border font-bold text-xs hover:bg-secondary cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-bold text-xs">{passengers.adult}</span>
                  <button
                    type="button"
                    onClick={() => setPassengers((p) => ({ ...p, adult: p.adult + 1 }))}
                    className="size-6 rounded-lg bg-card border border-border font-bold text-xs hover:bg-secondary cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Students (25% off) */}
              <div className="flex flex-col items-center rounded-xl border border-border bg-secondary/30 p-2.5">
                <span className="text-[11px] font-bold text-foreground">Student</span>
                <span className="text-[9px] text-emerald-600 font-semibold">25% OFF</span>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPassengers((p) => ({ ...p, student: Math.max(0, p.student - 1) }))}
                    className="size-6 rounded-lg bg-card border border-border font-bold text-xs hover:bg-secondary cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-bold text-xs">{passengers.student}</span>
                  <button
                    type="button"
                    onClick={() => setPassengers((p) => ({ ...p, student: p.student + 1 }))}
                    className="size-6 rounded-lg bg-card border border-border font-bold text-xs hover:bg-secondary cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Senior Citizens (50% off) */}
              <div className="flex flex-col items-center rounded-xl border border-border bg-secondary/30 p-2.5">
                <span className="text-[11px] font-bold text-foreground">Senior</span>
                <span className="text-[9px] text-emerald-600 font-semibold">50% OFF</span>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPassengers((p) => ({ ...p, senior: Math.max(0, p.senior - 1) }))}
                    className="size-6 rounded-lg bg-card border border-border font-bold text-xs hover:bg-secondary cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-bold text-xs">{passengers.senior}</span>
                  <button
                    type="button"
                    onClick={() => setPassengers((p) => ({ ...p, senior: p.senior + 1 }))}
                    className="size-6 rounded-lg bg-card border border-border font-bold text-xs hover:bg-secondary cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Fare Summary & Eco Savings Card */}
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-card to-card p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Standard Fare ({totalPassengerCount} pax):</span>
              <span className="font-medium text-foreground">₹{fareSummary.standardTotal}</span>
            </div>

            {fareSummary.concessionDiscountAmount > 0 && (
              <div className="flex items-center justify-between text-xs text-emerald-600">
                <span>Student / Senior Concession:</span>
                <span>-₹{fareSummary.concessionDiscountAmount}</span>
              </div>
            )}

            {selectedCategory === "exclusive_eco" && legs.length < 2 ? (
              <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-medium">
                <span className="flex items-center gap-1">
                  <Tag className="size-3" /> Eco 12% Discount:
                </span>
                <span className="text-[11px] font-semibold">Requires 2+ transfers (Add leg above)</span>
              </div>
            ) : fareSummary.ecoDiscountAmount > 0 ? (
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-600">
                <span className="flex items-center gap-1">
                  <Tag className="size-3" /> Eco-Move 12% Exclusive Discount:
                </span>
                <span>-₹{fareSummary.ecoDiscountAmount}</span>
              </div>
            ) : null}

            <div className="border-t border-border pt-2 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-foreground">Total Payable Amount</span>
              </div>

              <div className="text-right">
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  ₹{fareSummary.finalTotalFare}
                </span>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between rounded-xl bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200">
              <span className="flex items-center gap-1">
                <Leaf className="size-3 text-emerald-600" /> Green Impact:
              </span>
              <span>{fareSummary.co2SavedKg} kg CO₂ saved • +{fareSummary.greenPointsEarned} pts</span>
            </div>
          </div>

          {/* Proceed Button */}
          <button
            type="button"
            onClick={handleProceedToPayment}
            disabled={!isFormValid}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-primary py-3.5 px-4 text-sm font-bold text-white shadow-xl shadow-emerald-500/25 transition hover:brightness-110 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {selectedCategory === "exclusive_eco" && legs.length < 2 ? (
              <span>👉 Add at least 1 more transfer (2+ legs) for Eco Pass</span>
            ) : !areLegsComplete ? (
              <span>👉 Choose Boarding & Alighting Points to Proceed</span>
            ) : isFormValid ? (
              <>
                <span>Proceed to Pay ₹{fareSummary.finalTotalFare}</span>
                <Sparkles className="size-4" />
              </>
            ) : (
              <span>👉 Choose Valid Route to Proceed</span>
            )}
          </button>
        </div>
      </div>

      {/* Payment Gateway Modal */}
      {isPaymentOpen && (
        <DummyPaymentModal
          finalAmount={fareSummary.finalTotalFare}
          discountSaved={fareSummary.totalDiscountAmount}
          passengerCount={totalPassengerCount}
          itemTitle={
            selectedCategory === "exclusive_eco"
              ? "Eco-Move Exclusive Pass"
              : legs[0]?.mode === "metro"
              ? "Maha Metro Smart Ticket"
              : "Aapli Bus Ticket"
          }
          source={legs[0]?.from || ""}
          destination={legs[legs.length - 1]?.to || ""}
          onPaymentSuccess={handlePaymentSuccess}
          onCancel={() => setIsPaymentOpen(false)}
        />
      )}
    </div>
  );
}
