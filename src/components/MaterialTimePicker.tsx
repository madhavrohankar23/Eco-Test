import React, { useState, useEffect, useRef, useCallback } from "react";
import { Clock, X } from "lucide-react";

interface MaterialTimePickerProps {
  /** Value is either "now" or "HH:mm" (24hr format e.g. "14:30") */
  value: string;
  /** Callback when user confirms a new time ("HH:mm") or resets to "now" */
  onChange: (val: string) => void;
  /** Optional custom trigger className */
  className?: string;
}

/**
 * Converts "HH:mm" 24h or "now" to 12h representation { hour: 1-12, minute: 0-59, period: "AM" | "PM" }
 */
function parseInitialTime(val: string): { hour: number; minute: number; period: "AM" | "PM" } {
  const d = new Date();
  let h = d.getHours();
  let m = d.getMinutes();

  if (val && val !== "now" && val.includes(":")) {
    const parts = val.split(":");
    if (parts[0] !== undefined && parts[1] !== undefined) {
      const parsedH = parseInt(parts[0], 10);
      const parsedM = parseInt(parts[1], 10);
      if (!isNaN(parsedH) && !isNaN(parsedM)) {
        h = parsedH;
        m = parsedM;
      }
    }
  }

  const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return { hour: hour12, minute: m, period };
}

/**
 * Formats a 24hr "HH:mm" string or "now" to a friendly 12h string (e.g. "11:45 PM")
 */
export function formatTime12h(val: string): string {
  if (!val || val === "now") return "--:--";
  const parts = val.split(":");
  if (parts.length < 2 || parts[0] === undefined || parts[1] === undefined) return val;
  const h24 = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h24) || isNaN(m)) return val;

  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const mStr = m.toString().padStart(2, "0");
  return `${h12}:${mStr} ${period}`;
}

export default function MaterialTimePicker({
  value,
  onChange,
  className = "",
}: MaterialTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"hour" | "minute">("hour");

  const [selectedHour, setSelectedHour] = useState<number>(11);
  const [selectedMinute, setSelectedMinute] = useState<number>(45);
  const [selectedPeriod, setSelectedPeriod] = useState<"AM" | "PM">("PM");

  const dialRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);

  // Initialize dialog state whenever dialog opens
  useEffect(() => {
    if (isOpen) {
      const parsed = parseInitialTime(value);
      setSelectedHour(parsed.hour);
      setSelectedMinute(parsed.minute);
      setSelectedPeriod(parsed.period);
      setMode("hour");
    }
  }, [isOpen, value]);

  // Handle angle calculation from pointer position
  const handlePointerAngle = useCallback(
    (clientX: number, clientY: number, isFinal: boolean = false) => {
      if (!dialRef.current) return;
      const rect = dialRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = clientX - centerX;
      const dy = clientY - centerY;

      // Calculate angle in degrees from top (12 o'clock = 0 deg)
      let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (deg < 0) deg += 360;

      if (mode === "hour") {
        // 12 sectors, each 30 deg
        const rawHour = Math.round(deg / 30) % 12;
        const hour = rawHour === 0 ? 12 : rawHour;
        setSelectedHour(hour);

        if (isFinal) {
          // Smooth transition to minute selection upon hour pick
          setTimeout(() => {
            setMode("minute");
          }, 180);
        }
      } else {
        // 60 minutes, each 6 deg
        const minute = Math.round(deg / 6) % 60;
        setSelectedMinute(minute);
      }
    },
    [mode]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handlePointerAngle(e.clientX, e.clientY, false);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    handlePointerAngle(e.clientX, e.clientY, false);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      handlePointerAngle(e.clientX, e.clientY, true);
    }
  };

  const handleConfirm = () => {
    let h24 = selectedHour % 12;
    if (selectedPeriod === "PM") {
      h24 += 12;
    }
    const hStr = h24.toString().padStart(2, "0");
    const mStr = selectedMinute.toString().padStart(2, "0");
    onChange(`${hStr}:${mStr}`);
    setIsOpen(false);
  };

  const handleResetNow = () => {
    onChange("now");
  };

  // Dial geometry
  const DIAL_RADIUS = 110;
  const NUM_RADIUS = 82;

  // Active angle and coordinate
  const currentAngleDeg =
    mode === "hour"
      ? (selectedHour % 12) * 30 - 90
      : (selectedMinute / 60) * 360 - 90;

  const currentAngleRad = (currentAngleDeg * Math.PI) / 180;
  const thumbX = DIAL_RADIUS + NUM_RADIUS * Math.cos(currentAngleRad);
  const thumbY = DIAL_RADIUS + NUM_RADIUS * Math.sin(currentAngleRad);

  return (
    <>
      {/* ── TRIGGER BAR (Matching Image 2) ── */}
      <div
        className={`flex items-center justify-between rounded-full border border-border/70 bg-white/95 dark:bg-card/95 px-4 py-2 shadow-xs transition hover:border-emerald-500/40 ${className}`}
      >
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
            Depart at
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Middle Pill Button for picking time */}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/90 px-3.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs hover:border-emerald-500/50 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30 transition cursor-pointer"
            title="Choose departure time"
          >
            <span>{value === "now" ? "--:--" : formatTime12h(value)}</span>
            <Clock className="size-3 text-slate-400 dark:text-slate-500" />
          </button>

          {/* Right Live Now Pill Button */}
          <button
            type="button"
            onClick={handleResetNow}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
              value === "now"
                ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-extrabold border border-emerald-500/20"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50/80 dark:hover:bg-slate-700 border border-transparent"
            }`}
            title={value === "now" ? "Live schedule active" : "Reset to Live Now"}
          >
            <span className="relative flex h-2.5 w-2.5 items-center justify-center">
              {value === "now" && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gradient-to-tr from-emerald-600 via-emerald-400 to-emerald-300 shadow-xs"></span>
            </span>
            <span>Live Now</span>
          </button>
        </div>
      </div>

      {/* ── MATERIAL / CRANE TIME PICKER MODAL (Matching Image 1) ── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-[310px] rounded-[28px] bg-[#edf4ea] dark:bg-[#18231c] p-6 shadow-2xl border border-emerald-900/10 dark:border-emerald-800/30 select-none animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header label */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#607361] dark:text-emerald-400/80">
                SELECT TIME
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-black/5 hover:text-slate-600 dark:hover:bg-white/5 transition"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {/* Time Display Header Row */}
            <div className="mt-3 flex items-center justify-between gap-1.5">
              {/* Hour Box */}
              <button
                type="button"
                onClick={() => setMode("hour")}
                className={`flex h-16 w-20 items-center justify-center rounded-2xl text-4xl font-extrabold transition-all cursor-pointer ${
                  mode === "hour"
                    ? "bg-[#c8f8a6] text-[#13381b] shadow-xs scale-102 ring-2 ring-emerald-600/30"
                    : "bg-[#dce7db] text-slate-700 hover:bg-[#d2ded1] dark:bg-[#233127] dark:text-slate-200"
                }`}
              >
                {selectedHour}
              </button>

              {/* Colon */}
              <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-200 px-0.5">
                :
              </span>

              {/* Minute Box */}
              <button
                type="button"
                onClick={() => setMode("minute")}
                className={`flex h-16 w-20 items-center justify-center rounded-2xl text-4xl font-extrabold transition-all cursor-pointer ${
                  mode === "minute"
                    ? "bg-[#c8f8a6] text-[#13381b] shadow-xs scale-102 ring-2 ring-emerald-600/30"
                    : "bg-[#dce7db] text-slate-700 hover:bg-[#d2ded1] dark:bg-[#233127] dark:text-slate-200"
                }`}
              >
                {selectedMinute.toString().padStart(2, "0")}
              </button>

              {/* AM / PM Toggle Box */}
              <div className="flex h-16 w-12 flex-col overflow-hidden rounded-xl border border-[#cbd8c8] dark:border-slate-700 divide-y divide-[#cbd8c8] dark:divide-slate-700 bg-white/60 dark:bg-slate-800/60 ml-1">
                <button
                  type="button"
                  onClick={() => setSelectedPeriod("AM")}
                  className={`flex h-1/2 items-center justify-center text-xs font-extrabold transition cursor-pointer ${
                    selectedPeriod === "AM"
                      ? "bg-[#bbf2f6] text-[#0d4e56]"
                      : "text-slate-500 hover:bg-black/5 dark:text-slate-400 dark:hover:bg-white/5"
                  }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPeriod("PM")}
                  className={`flex h-1/2 items-center justify-center text-xs font-extrabold transition cursor-pointer ${
                    selectedPeriod === "PM"
                      ? "bg-[#bbf2f6] text-[#0d4e56]"
                      : "text-slate-500 hover:bg-black/5 dark:text-slate-400 dark:hover:bg-white/5"
                  }`}
                >
                  PM
                </button>
              </div>
            </div>

            {/* Circular Clock Dial */}
            <div
              ref={dialRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="relative mx-auto mt-6 h-[220px] w-[220px] rounded-full bg-[#e3ece0] dark:bg-[#202d24] shadow-inner select-none cursor-pointer touch-none"
            >
              {/* Center Dot & Hand Line SVG */}
              <svg
                className="absolute inset-0 pointer-events-none"
                width="220"
                height="220"
              >
                {/* Hand line */}
                <line
                  x1={DIAL_RADIUS}
                  y1={DIAL_RADIUS}
                  x2={thumbX}
                  y2={thumbY}
                  stroke="#27682a"
                  strokeWidth="2"
                />
                {/* Center Pivot Dot */}
                <circle
                  cx={DIAL_RADIUS}
                  cy={DIAL_RADIUS}
                  r="3.5"
                  fill="#27682a"
                />
              </svg>

              {/* Numbers on the Dial */}
              {mode === "hour"
                ? Array.from({ length: 12 }, (_, i) => i + 1).map((h) => {
                    const angleDeg = h * 30 - 90;
                    const angleRad = (angleDeg * Math.PI) / 180;
                    const x = DIAL_RADIUS + NUM_RADIUS * Math.cos(angleRad);
                    const y = DIAL_RADIUS + NUM_RADIUS * Math.sin(angleRad);
                    const isSelected = selectedHour === h;

                    return (
                      <div
                        key={`hour-${h}`}
                        className={`absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center text-xs font-bold pointer-events-none transition-colors ${
                          isSelected
                            ? "text-transparent"
                            : "text-slate-800 dark:text-slate-200"
                        }`}
                        style={{ left: `${x}px`, top: `${y}px` }}
                      >
                        {h}
                      </div>
                    );
                  })
                : Array.from({ length: 12 }, (_, i) => i * 5).map((m) => {
                    const angleDeg = (m / 60) * 360 - 90;
                    const angleRad = (angleDeg * Math.PI) / 180;
                    const x = DIAL_RADIUS + NUM_RADIUS * Math.cos(angleRad);
                    const y = DIAL_RADIUS + NUM_RADIUS * Math.sin(angleRad);
                    const isSelected = selectedMinute === m;

                    return (
                      <div
                        key={`min-${m}`}
                        className={`absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center text-xs font-bold pointer-events-none transition-colors ${
                          isSelected
                            ? "text-transparent"
                            : "text-slate-800 dark:text-slate-200"
                        }`}
                        style={{ left: `${x}px`, top: `${y}px` }}
                      >
                        {m.toString().padStart(2, "0")}
                      </div>
                    );
                  })}

              {/* Active Selection Thumb Disc */}
              <div
                className="absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#27682a] text-xs font-extrabold text-white shadow-md pointer-events-none transition-all duration-75"
                style={{ left: `${thumbX}px`, top: `${thumbY}px` }}
              >
                {mode === "hour"
                  ? selectedHour
                  : selectedMinute.toString().padStart(2, "0")}
              </div>
            </div>

            {/* Bottom Action Buttons */}
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold uppercase text-[#27682a] hover:bg-[#27682a]/10 dark:text-emerald-400 dark:hover:bg-emerald-400/10 transition cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="rounded-xl px-4 py-2 text-xs font-bold uppercase text-[#27682a] hover:bg-[#27682a]/10 dark:text-emerald-400 dark:hover:bg-emerald-400/10 transition cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
