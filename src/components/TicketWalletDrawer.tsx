import React, { useState, useEffect } from "react";
import {
  X,
  Ticket as TicketIcon,
  Sparkles,
  TrainFront,
  Bus,
  Clock,
  ArrowRight,
  QrCode,
  Trash2,
  Plus,
  ShieldCheck,
  Leaf,
} from "lucide-react";
import {
  type IssuedTicket,
  getStoredTickets,
  saveIssuedTicket,
} from "@/lib/ticketing";
import { fetchUserTickets, deleteUserTicket } from "@/services/ticketService";
import { useAuth } from "@/context/AuthContext";
import DigitalTicketPass from "./DigitalTicketPass";

interface TicketWalletDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBookModal: () => void;
}

export default function TicketWalletDrawer({
  isOpen,
  onClose,
  onOpenBookModal,
}: TicketWalletDrawerProps) {
  const { user } = useAuth();
  const userId = user?.id || "guest";
  const [tickets, setTickets] = useState<IssuedTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<IssuedTicket | null>(null);

  const loadTickets = async () => {
    const list = await fetchUserTickets(userId);
    setTickets(list);
  };

  useEffect(() => {
    if (isOpen) {
      loadTickets();
    }
  }, [isOpen, userId]);

  const activeTickets = tickets.filter(
    (t) => t.status === "active" && t.currentLegStep !== "completed"
  );
  const pastTickets = tickets.filter(
    (t) => t.status !== "active" || t.currentLegStep === "completed"
  );

  const handleClearHistory = async () => {
    if (confirm("Are you sure you want to clear past ticket history?")) {
      for (const t of pastTickets) {
        await deleteUserTicket(userId, t.id);
      }
      setTickets(activeTickets);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[1040] flex justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative flex h-full w-full max-w-md flex-col bg-card border-l border-border shadow-2xl animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-emerald-500/10 via-card to-card px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
                <TicketIcon className="size-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-foreground">My Wallet</h4>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              title="Close Wallet"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Quick Action: Book New */}
            <button
              onClick={() => {
                onClose();
                onOpenBookModal();
              }}
              className="w-full flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-3.5 transition hover:border-emerald-500 hover:bg-emerald-500/15 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-600 text-white">
                  <Plus className="size-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-foreground">Book Smart Transit Pass</p>
                  <p className="text-[10px] text-emerald-600 font-semibold">12% OFF on Eco-Move Exclusive</p>
                </div>
              </div>
              <ArrowRight className="size-4 text-emerald-600" />
            </button>

            {/* Active Tickets Section */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active Tickets ({activeTickets.length})
                </span>
              </div>

              {activeTickets.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-6 text-center text-muted-foreground">
                  <TicketIcon className="mx-auto size-8 opacity-40 mb-2" />
                  <p className="text-xs font-medium">No active tickets right now</p>
                  <p className="text-[10px] text-muted-foreground">Book a Metro or Aapli Bus pass for your trip</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activeTickets.map((ticket) => {
                    const isEco = ticket.category === "exclusive_eco";
                    return (
                      <div
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className={`relative overflow-hidden rounded-2xl border p-3.5 transition hover:scale-[1.01] hover:shadow-lg cursor-pointer ${
                          isEco
                            ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-card to-card"
                            : ticket.mode === "metro"
                            ? "border-blue-500/40 bg-gradient-to-br from-blue-500/10 via-card to-card"
                            : "border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-card to-card"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={`flex size-6 items-center justify-center rounded-lg text-white ${
                                isEco
                                  ? "bg-emerald-600"
                                  : ticket.mode === "metro"
                                  ? "bg-blue-600"
                                  : "bg-amber-600"
                              }`}
                            >
                              {isEco ? (
                                <Sparkles className="size-3.5" />
                              ) : ticket.mode === "metro" ? (
                                <TrainFront className="size-3.5" />
                              ) : (
                                <Bus className="size-3.5" />
                              )}
                            </div>
                            <span className="text-xs font-bold text-foreground truncate max-w-[180px]">
                              {ticket.title}
                            </span>
                          </div>

                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-600">
                            🟢 ACTIVE
                          </span>
                        </div>

                        {/* Corridor */}
                        <div className="mt-2.5 flex items-center justify-between text-xs font-semibold text-foreground">
                          <span className="truncate max-w-[140px]">{ticket.source}</span>
                          <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[140px] text-right">{ticket.destination}</span>
                        </div>

                        {/* Footer details */}
                        <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2 text-[10px] text-muted-foreground">
                          <span className="font-mono font-bold text-foreground">{ticket.id}</span>
                          <span className="flex items-center gap-1 font-bold text-primary">
                            <QrCode className="size-3" /> View QR Pass
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Past Tickets History */}
            {pastTickets.length > 0 && (
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">
                    Completed & Past Passes ({pastTickets.length})
                  </span>
                  <button
                    onClick={handleClearHistory}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition cursor-pointer"
                  >
                    <Trash2 className="size-3" /> Clear
                  </button>
                </div>

                <div className="space-y-2 opacity-85">
                  {pastTickets.map((ticket) => {
                    const isTicketCompleted =
                      ticket.currentLegStep === "completed" || ticket.status === "used";
                    return (
                      <div
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className="rounded-2xl border border-border bg-secondary/30 p-3 transition hover:bg-secondary/50 hover:opacity-100 cursor-pointer"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {ticket.category === "exclusive_eco" ? (
                              <Sparkles className="size-3.5 text-emerald-600 shrink-0" />
                            ) : ticket.mode === "metro" ? (
                              <TrainFront className="size-3.5 text-blue-600 shrink-0" />
                            ) : (
                              <Bus className="size-3.5 text-amber-500 shrink-0" />
                            )}
                            <span className="font-semibold text-foreground truncate max-w-[190px]">
                              {ticket.source} ➔ {ticket.destination}
                            </span>
                          </div>

                          {isTicketCompleted ? (
                            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                              🔘 COMPLETED
                            </span>
                          ) : (
                            <span className="rounded-full bg-secondary border border-border px-2 py-0.5 text-[9px] font-bold text-muted-foreground uppercase">
                              {ticket.status}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/40 pt-1.5">
                          <span className="font-mono">{ticket.id}</span>
                          <div className="flex items-center gap-2">
                            <span>{new Date(ticket.bookingTime).toLocaleDateString()}</span>
                            <span className="font-bold text-foreground">₹{ticket.finalFare}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Selected Ticket Modal */}
      {selectedTicket && (
        <DigitalTicketPass
          ticket={selectedTicket}
          onClose={() => {
            setSelectedTicket(null);
            loadTickets();
          }}
        />
      )}
    </>
  );
}
