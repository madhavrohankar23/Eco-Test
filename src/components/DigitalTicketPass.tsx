import React, { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import {
  X,
  Sparkles,
  TrainFront,
  Bus,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Share2,
  ArrowRight,
  Leaf,
  ScanLine,
  Users,
  Repeat,
  Radio,
  FileText,
  Image as ImageIcon,
  Loader2,
  Download,
  ChevronDown,
  Check,
} from "lucide-react";
import {
  type IssuedTicket,
  simulateGateScan,
  playTurnstileBeep,
} from "@/lib/ticketing";
import { downloadTicketPDF, downloadTicketPNG } from "@/lib/ticketExporter";

interface DigitalTicketPassProps {
  ticket: IssuedTicket;
  onClose: () => void;
  onViewWallet?: () => void;
}

export default function DigitalTicketPass({
  ticket: initialTicket,
  onClose,
  onViewWallet,
}: DigitalTicketPassProps) {
  const [currentTicket, setCurrentTicket] = useState<IssuedTicket>(initialTicket);
  const [passTimeLeftStr, setPassTimeLeftStr] = useState<string>("23:59:59");
  const [interchangeTimeLeftStr, setInterchangeTimeLeftStr] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [lastGateFeedback, setLastGateFeedback] = useState<{
    gateName: string;
    message: string;
    nextMediumText: string;
    isComplete: boolean;
  } | null>(null);
  const [isScanningGate, setIsScanningGate] = useState(false);

  // Share & Export State
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isExporting, setIsExporting] = useState<"pdf" | "png" | null>(null);
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState<string | null>(null);
  const passCardRef = useRef<HTMLDivElement>(null);

  const isCompleted = currentTicket.currentLegStep === "completed" || currentTicket.status === "used";

  // Generate Real QR Code containing full ticket and security payload
  useEffect(() => {
    const payloadData = {
      transitAuthority: "Nagpur Smart City Transit (Eco-Move)",
      ticketId: currentTicket.id,
      passType: currentTicket.title,
      from: currentTicket.source,
      to: currentTicket.destination,
      route: currentTicket.lineOrRouteName,
      transitStages: (currentTicket.legs || []).map(
        (l, i) => `${i + 1}. ${l.mode === "metro" ? "Metro" : "Bus"} ${l.lineOrRoute}: ${l.from} ➔ ${l.to}`
      ),
      passengers: currentTicket.totalPassengers,
      farePaid: `₹${currentTicket.finalFare}`,
      discountSaved: `₹${currentTicket.discountAmount}`,
      bookingTime: currentTicket.bookingTime,
      validUntil: currentTicket.validUntil,
      status: isCompleted ? "COMPLETED" : "ACTIVE",
      transactionRef: currentTicket.transactionRef,
      securityToken: `NAG-SEC-${currentTicket.id}-${currentTicket.transactionRef}`,
    };

    const qrText = JSON.stringify(payloadData, null, 2);

    QRCode.toDataURL(qrText, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 280,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((url) => {
        setQrCodeDataUrl(url);
      })
      .catch((err) => {
        console.error("QR Code generation error:", err);
      });
  }, [currentTicket, isCompleted]);

  // Live ticking countdown timers (24h pass validity & 2h interchange window)
  useEffect(() => {
    if (isCompleted) {
      setPassTimeLeftStr("COMPLETED");
      setInterchangeTimeLeftStr(currentTicket.interchangeValidUntil ? "COMPLETED" : null);
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const expiry = new Date(currentTicket.validUntil).getTime();
      const passDiff = expiry - now;

      if (passDiff <= 0) {
        setPassTimeLeftStr("EXPIRED");
      } else {
        const hours = Math.floor(passDiff / (1000 * 60 * 60));
        const mins = Math.floor((passDiff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((passDiff % (1000 * 60)) / 1000);
        setPassTimeLeftStr(
          `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
        );
      }

      // Interchange 2-Hour Window
      if (currentTicket.interchangeValidUntil) {
        const interchangeExpiry = new Date(currentTicket.interchangeValidUntil).getTime();
        const interDiff = interchangeExpiry - now;
        if (interDiff <= 0) {
          setInterchangeTimeLeftStr("EXPIRED");
        } else {
          const iHours = Math.floor(interDiff / (1000 * 60 * 60));
          const iMins = Math.floor((interDiff % (1000 * 60 * 60)) / (1000 * 60));
          const iSecs = Math.floor((interDiff % (1000 * 60)) / 1000);
          setInterchangeTimeLeftStr(
            `${String(iHours).padStart(2, "0")}:${String(iMins).padStart(2, "0")}:${String(iSecs).padStart(2, "0")}`
          );
        }
      } else {
        setInterchangeTimeLeftStr(null);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [currentTicket.validUntil, currentTicket.interchangeValidUntil, isCompleted]);

  const legs = currentTicket.legs && currentTicket.legs.length > 0 ? currentTicket.legs : [
    {
      id: "leg-0",
      mode: currentTicket.mode === "metro" ? "metro" : "bus",
      lineOrRoute: currentTicket.lineOrRouteName,
      from: currentTicket.source,
      to: currentTicket.destination,
      fare: currentTicket.finalFare,
    },
  ];

  const currentLegIndex = currentTicket.currentLegIndex ?? 0;
  const currentLeg = legs[currentLegIndex] || legs[0]!;

  const handleSimulateTurnstileTap = () => {
    setIsScanningGate(true);
    playTurnstileBeep(true);

    setTimeout(() => {
      const result = simulateGateScan(currentTicket.id);
      setIsScanningGate(false);
      if (result.success && result.updatedTicket) {
        setCurrentTicket(result.updatedTicket);
        setLastGateFeedback({
          gateName: result.gateName,
          message: result.message,
          nextMediumText: result.nextMediumText,
          isComplete: result.isComplete,
        });
      }
    }, 600);
  };

  // ── SHARE AS PNG ACTION (Instant PNG Download & Share) ──
  const handleSharePNG = async () => {
    if (!passCardRef.current || isExporting) return;
    setIsExporting("png");
    try {
      await downloadTicketPNG(passCardRef.current, currentTicket);
      setDownloadSuccessMsg(`Downloaded EcoMove_Pass_${currentTicket.id}.png`);
      setTimeout(() => setDownloadSuccessMsg(null), 4000);
      setShowShareMenu(false);
    } catch (err) {
      console.error("PNG export error:", err);
    } finally {
      setIsExporting(null);
    }
  };

  // ── SHARE AS PDF ACTION (Instant PDF Download & Share) ──
  const handleSharePDF = async () => {
    if (!passCardRef.current || isExporting) return;
    setIsExporting("pdf");
    try {
      await downloadTicketPDF(passCardRef.current, currentTicket);
      setDownloadSuccessMsg(`Downloaded EcoMove_Pass_${currentTicket.id}.pdf`);
      setTimeout(() => setDownloadSuccessMsg(null), 4000);
      setShowShareMenu(false);
    } catch (err) {
      console.error("PDF export error:", err);
    } finally {
      setIsExporting(null);
    }
  };

  const isEcoExclusive = currentTicket.category === "exclusive_eco";

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex max-h-[94vh] w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-b from-card to-background shadow-2xl shadow-black/40">
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          className="absolute right-3.5 top-3.5 z-20 rounded-full bg-black/40 p-2 text-white/90 backdrop-blur-md transition hover:bg-black/70 hover:text-white cursor-pointer"
          title="Close Ticket"
        >
          <X className="size-4" />
        </button>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {/* ── PRINTABLE & EXPORTABLE TICKET CARD CONTAINER ── */}
          <div
            ref={passCardRef}
            className="space-y-3.5 bg-card p-3 rounded-3xl border border-border/70 shadow-sm"
          >
            {/* Top Brand & Pass Header */}
            <div
              className={`relative overflow-hidden rounded-2xl p-4 text-white shadow-lg ${
                isEcoExclusive
                  ? "bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-900 ring-2 ring-emerald-400/40"
                  : currentTicket.mode === "metro"
                  ? "bg-gradient-to-br from-indigo-600 via-blue-700 to-indigo-950 ring-2 ring-blue-400/30"
                  : "bg-gradient-to-br from-amber-600 via-orange-700 to-amber-950 ring-2 ring-amber-400/30"
              }`}
            >
              {/* Dynamic Security Hologram Wave */}
              <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.3)_50%,transparent_75%)] bg-[length:250%_250%] animate-pulse" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-white/20 backdrop-blur-md">
                    {isEcoExclusive ? (
                      <Sparkles className="size-4 text-emerald-200" />
                    ) : currentTicket.mode === "metro" ? (
                      <TrainFront className="size-4 text-blue-200" />
                    ) : (
                      <Bus className="size-4 text-amber-200" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-black tracking-wider uppercase">
                      {isEcoExclusive
                        ? "Eco-Move Exclusive Pass"
                        : currentTicket.mode === "metro"
                        ? "Maha Metro Smart Ticket"
                        : "Aapli Bus Digital Ticket"}
                    </h3>
                  </div>
                </div>

                {isCompleted ? (
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white border border-white/30 shadow-sm flex items-center gap-1">
                    <CheckCircle2 className="size-3" /> COMPLETED
                  </span>
                ) : (
                  isEcoExclusive && (
                    <span className="rounded-full bg-emerald-400/30 px-2 py-0.5 text-[10px] font-bold text-emerald-100 border border-emerald-300/40 shadow-sm">
                      12% OFF
                    </span>
                  )
                )}
              </div>

              {/* Source to Destination Corridor */}
              <div className="mt-3.5 flex items-center justify-between rounded-xl bg-black/25 p-3 backdrop-blur-md border border-white/10">
                <div className="flex-1 min-w-0 pr-2">
                  <span className="text-[9px] uppercase tracking-wider text-white/70 font-semibold">FROM</span>
                  <p className="truncate text-xs font-bold leading-tight">{currentTicket.source}</p>
                </div>

                <div className="flex flex-col items-center px-1">
                  <ArrowRight className="size-4 text-white/80" />
                  <span className="text-[8px] text-white/60 font-mono">
                    {legs.length > 1 ? `${legs.length} LEGS` : "DIRECT"}
                  </span>
                </div>

                <div className="flex-1 min-w-0 pl-2 text-right">
                  <span className="text-[9px] uppercase tracking-wider text-white/70 font-semibold">TO</span>
                  <p className="truncate text-xs font-bold leading-tight">{currentTicket.destination}</p>
                </div>
              </div>

              {/* Line / Route Details */}
              <div className="mt-2 flex items-center justify-between text-[11px] text-white/90">
                <span className="font-medium truncate max-w-[200px]">{currentTicket.lineOrRouteName}</span>
                <span className="font-mono font-bold">{currentTicket.id}</span>
              </div>
            </div>

            {/* ── MULTI-STAGE TRANSIT JOURNEY PROGRESS STEPPER ── */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-foreground">
                <span>Transfers ({legs.length})</span>
                <span className="text-[10px] text-emerald-600 font-semibold">
                  {currentTicket.currentLegStep === "completed"
                    ? "🎉 Completed"
                    : `Stage ${currentLegIndex + 1} of ${legs.length}`}
                </span>
              </div>

              <div className="space-y-1.5">
                {legs.map((leg, idx) => {
                  const isActive = idx === currentLegIndex && currentTicket.currentLegStep !== "completed";
                  const isPassed = idx < currentLegIndex || currentTicket.currentLegStep === "completed";

                  return (
                    <div
                      key={leg.id || idx}
                      className={`flex items-center justify-between rounded-xl p-2 text-xs transition ${
                        isActive
                          ? "bg-primary/15 border border-primary/40 font-bold text-foreground shadow-sm"
                          : isPassed
                          ? "bg-emerald-500/10 text-muted-foreground line-through"
                          : "bg-card border border-border text-muted-foreground opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`flex size-6 shrink-0 items-center justify-center rounded-lg text-white ${
                            leg.mode === "metro" ? "bg-blue-600" : "bg-amber-500"
                          }`}
                        >
                          {leg.mode === "metro" ? <TrainFront className="size-3.5" /> : <Bus className="size-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[11px] text-foreground">
                            {leg.mode === "metro" ? `Metro ${leg.lineOrRoute}` : `Bus ${leg.lineOrRoute}`}
                          </p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {leg.from} ➔ {leg.to}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        {isPassed ? (
                          <span className="text-[10px] font-bold text-emerald-600">✅ Done</span>
                        ) : isActive ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-primary animate-pulse">
                            <Radio className="size-3" />
                            {currentTicket.currentLegStep === "metro_in_transit" ? "In Transit" : "Current"}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Next</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Interactive QR Code Card */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-white p-4 shadow-md dark:bg-card">
              {/* Laser QR Container */}
              <div className="relative flex size-44 items-center justify-center overflow-hidden rounded-2xl border border-border bg-white p-2.5 shadow-inner">
                {/* Laser Scanning Line (only while active) */}
                {!isCompleted && (
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_8px_#10b981] animate-[bounce_2.5s_infinite] z-10" />
                )}

                {/* Real Generated QR Code */}
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt={`Pass QR Code ${currentTicket.id}`}
                    className={`size-full object-contain transition-all duration-300 ${
                      isCompleted ? "filter blur-[2.5px] opacity-20 select-none pointer-events-none" : ""
                    }`}
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-xs text-muted-foreground animate-pulse">
                    Generating QR...
                  </div>
                )}

                {/* Frosted Completed Overlay */}
                {isCompleted && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-2 text-center bg-card/80 backdrop-blur-[2px] rounded-2xl border border-border/80 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex size-10 items-center justify-center rounded-full bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 mb-1.5 border border-emerald-500/30 shadow-inner">
                      <CheckCircle2 className="size-5" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-wider text-foreground">
                      Journey Completed
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      Pass Used & Checked Out
                    </span>
                  </div>
                )}
              </div>

              {/* Countdown Timers */}
              <div className="mt-2.5 flex flex-col items-center gap-1 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Clock className="size-3.5 text-primary" />
                  <span>{isCompleted ? "Pass Status:" : "Pass Validity (24h):"}</span>
                  <span
                    className={`font-mono font-bold ${
                      isCompleted
                        ? "text-muted-foreground uppercase"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {passTimeLeftStr}
                  </span>
                </div>

                {interchangeTimeLeftStr && (
                  <div
                    className={`flex items-center gap-1.5 font-semibold text-[11px] rounded-lg px-2 py-0.5 ${
                      isCompleted
                        ? "bg-secondary text-muted-foreground"
                        : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    <Repeat className="size-3" />
                    <span>2h Interchange Window:</span>
                    <span className="font-mono font-bold">{interchangeTimeLeftStr}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Ticket Breakdown */}
            <div className="space-y-1.5 rounded-2xl border border-border/80 bg-secondary/30 p-3 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Booking Time</span>
                <span className="font-medium text-foreground">
                  {new Date(currentTicket.bookingTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="size-3" /> Passengers
                </span>
                <span className="font-semibold text-foreground">
                  {currentTicket.totalPassengers} Passenger{currentTicket.totalPassengers > 1 ? "s" : ""}
                  {currentTicket.passengers.student > 0 ? ` (${currentTicket.passengers.student} Stu)` : ""}
                  {currentTicket.passengers.senior > 0 ? ` (${currentTicket.passengers.senior} Sen)` : ""}
                </span>
              </div>

              <div className="my-1 border-t border-dashed border-border" />

              <div className="flex items-center justify-between font-bold">
                <span className="text-foreground">Total Fare Paid</span>
                <div className="flex items-center gap-1.5">
                  {currentTicket.discountAmount > 0 && (
                    <span className="text-[11px] text-muted-foreground line-through">
                      ₹{currentTicket.standardBaseFare}
                    </span>
                  )}
                  <span className="text-sm text-emerald-600 dark:text-emerald-400">₹{currentTicket.finalFare}</span>
                </div>
              </div>

              {currentTicket.discountAmount > 0 && (
                <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl px-2.5 py-1">
                  <span className="flex items-center gap-1">
                    <Leaf className="size-3 text-emerald-600" /> Eco Discount Saved
                  </span>
                  <span>-₹{currentTicket.discountAmount} ({currentTicket.discountPercent}%)</span>
                </div>
              )}
            </div>

            {/* Official Pass Verification Stamp */}
            <div className="flex items-center justify-between px-1 pt-1 text-[10px] text-muted-foreground font-mono">
              <span className="flex items-center gap-1 font-sans font-bold text-foreground">
                <ShieldCheck className="size-3.5 text-emerald-600" /> Nagpur Smart Transit Verified
              </span>
              <span>{currentTicket.id}</span>
            </div>
          </div>

          {/* Gate Scan Feedback */}
          {lastGateFeedback && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-200 animate-in zoom-in-95 duration-200">
              <div className="flex items-start gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                <div>
                  <p>{lastGateFeedback.message}</p>
                  {lastGateFeedback.nextMediumText && (
                    <p className="mt-1 text-[11px] font-semibold text-primary">
                      {lastGateFeedback.nextMediumText}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Gate Validator Simulator Button */}
          {currentTicket.currentLegStep !== "completed" ? (
            <button
              onClick={handleSimulateTurnstileTap}
              disabled={isScanningGate}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-primary py-3 px-4 text-xs font-bold text-white shadow-lg shadow-primary/25 transition hover:brightness-110 active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              <ScanLine className={`size-4 ${isScanningGate ? "animate-spin" : ""}`} />
              <span>
                {isScanningGate
                  ? "Scanning at Gate..."
                  : currentLeg.mode === "bus"
                  ? `Check in Bus ${currentLeg.lineOrRoute}`
                  : currentTicket.currentLegStep === "metro_in_transit"
                  ? `Tap Metro Exit Gate at ${currentLeg.to}`
                  : `Tap Metro Entry Gate at ${currentLeg.from}`}
              </span>
            </button>
          ) : (
            <div className="rounded-2xl bg-emerald-600/15 border border-emerald-500/40 p-3 text-center text-xs font-bold text-emerald-700 dark:text-emerald-300">
              🎉 Full Journey Completed!
            </div>
          )}

          {/* ── DOWNLOAD SUCCESS NOTIFICATION ── */}
          {downloadSuccessMsg && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/15 p-3 text-xs font-bold text-emerald-800 dark:text-emerald-200 animate-in zoom-in-95 duration-200 shadow-sm">
              <Check className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{downloadSuccessMsg}</span>
            </div>
          )}

          {/* ── EXPANDABLE DOWNLOAD OPTIONS DRAWER / POPOVER ── */}
          {showShareMenu && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Download className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  Choose Download Format
                </span>
                <button
                  onClick={() => setShowShareMenu(false)}
                  className="text-muted-foreground hover:text-foreground text-xs p-1 cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {/* Download as PDF Button */}
                <button
                  type="button"
                  onClick={handleSharePDF}
                  disabled={isExporting !== null}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-card p-3 text-xs font-medium text-foreground transition hover:bg-rose-500/10 hover:border-rose-500 active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <div className="flex size-8 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
                    {isExporting === "pdf" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <FileText className="size-4" />
                    )}
                  </div>
                  <span className="font-bold text-[11px]">Download as PDF</span>
                </button>

                {/* Download as PNG Button */}
                <button
                  type="button"
                  onClick={handleSharePNG}
                  disabled={isExporting !== null}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-card p-3 text-xs font-medium text-foreground transition hover:bg-emerald-500/10 hover:border-emerald-500 active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    {isExporting === "png" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ImageIcon className="size-4" />
                    )}
                  </div>
                  <span className="font-bold text-[11px]">Download as PNG</span>
                </button>
              </div>
            </div>
          )}

          {/* Secondary Actions */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowShareMenu((prev) => !prev)}
              disabled={isExporting !== null}
              className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold transition active:scale-98 cursor-pointer ${
                showShareMenu
                  ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "border-border bg-card text-foreground hover:bg-secondary"
              }`}
            >
              {isExporting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Downloading {isExporting.toUpperCase()}...</span>
                </>
              ) : (
                <>
                  <Download className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Download Pass</span>
                  <ChevronDown className={`size-3 transition-transform ${showShareMenu ? "rotate-180" : ""}`} />
                </>
              )}
            </button>

            {onViewWallet ? (
              <button
                onClick={onViewWallet}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card py-2.5 text-xs font-medium text-foreground transition hover:bg-secondary cursor-pointer"
              >
                <span>View All Passes</span>
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card py-2.5 text-xs font-medium text-foreground transition hover:bg-secondary cursor-pointer"
              >
                <span>Done</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
