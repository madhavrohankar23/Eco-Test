import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Gift,
  Sparkles,
  Trophy,
  Copy,
  Check,
  Lock,
  ChevronRight,
  ExternalLink,
  Award,
  Zap,
  Tag,
  ArrowRight,
  PartyPopper,
  Flame,
  Clock,
  RotateCcw,
} from "lucide-react";
import { claimUserRewardMilestone, fetchUserEcoStats } from "../services/ecoRewardsService";

export interface RewardMilestone {
  id: string;
  targetCo2Kg: number;
  tierName: string;
  tierBadge: string;
  brandName: string;
  brandCategory: "food" | "transit" | "entertainment" | "shopping" | "wellness";
  brandColor: string;
  brandBgColor: string;
  brandLogo: string;
  rewardTitle: string;
  rewardDescription: string;
  couponCode: string;
  validUntil: string;
  terms: string;
}

export const REWARD_MILESTONES: RewardMilestone[] = [
  {
    id: "reward_5kg",
    targetCo2Kg: 5,
    tierName: "Eco Starter",
    tierBadge: "🌱 Tier 1",
    brandName: "Cafe Coffee Day / Haldiram's",
    brandCategory: "food",
    brandColor: "from-amber-500 to-orange-600",
    brandBgColor: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40",
    brandLogo: "☕",
    rewardTitle: "Flat ₹50 OFF on Coffee & Snacks",
    rewardDescription: "Enjoy fresh snacks or hot coffee at any Nagpur outlet.",
    couponCode: "ECOBREW50",
    validUntil: "31 Dec 2026",
    terms: "Valid on min order of ₹150 at participating outlets in Nagpur.",
  },
  {
    id: "reward_15kg",
    targetCo2Kg: 15,
    tierName: "Green Voyager",
    tierBadge: "🚌 Tier 2",
    brandName: "Aapli Bus / Chalo Mobility",
    brandCategory: "transit",
    brandColor: "from-indigo-500 to-blue-600",
    brandBgColor: "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/40",
    brandLogo: "🚌",
    rewardTitle: "₹40 OFF on Aapli Bus Monthly Pass",
    rewardDescription: "Direct cashback discount on your next Chalo bus pass recharge.",
    couponCode: "CHALOECOM40",
    validUntil: "31 Dec 2026",
    terms: "Applicable on Aapli Bus city pass in Nagpur via Chalo App.",
  },
  {
    id: "reward_30kg",
    targetCo2Kg: 30,
    tierName: "Metro Champion",
    tierBadge: "🚇 Tier 3",
    brandName: "Maha Metro Nagpur",
    brandCategory: "transit",
    brandColor: "from-cyan-500 to-teal-600",
    brandBgColor: "bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800/40",
    brandLogo: "🚇",
    rewardTitle: "20% Cashback on Metro Card Top-Up",
    rewardDescription: "Get instant bonus balance on your Maha Card smart transit pass.",
    couponCode: "METROGREEN20",
    validUntil: "31 Dec 2026",
    terms: "Valid on smart card recharge at any Nagpur Metro ticket counter.",
  },
  {
    id: "reward_50kg",
    targetCo2Kg: 50,
    tierName: "Earth Guardian",
    tierBadge: "🌿 Tier 4",
    brandName: "Zomato / Swiggy Green",
    brandCategory: "food",
    brandColor: "from-emerald-500 to-green-600",
    brandBgColor: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40",
    brandLogo: "🥗",
    rewardTitle: "Flat ₹100 OFF on Green Dining",
    rewardDescription: "Enjoy delicious healthy dining delivered to your doorstep.",
    couponCode: "ECOFEAST100",
    validUntil: "31 Dec 2026",
    terms: "Valid on orders above ₹299 across all restaurants in Nagpur.",
  },
  {
    id: "reward_75kg",
    targetCo2Kg: 75,
    tierName: "Climate Hero",
    tierBadge: "⭐ Tier 5",
    brandName: "BookMyShow / PVR Cinepolis",
    brandCategory: "entertainment",
    brandColor: "from-rose-500 to-pink-600",
    brandBgColor: "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40",
    brandLogo: "🎬",
    rewardTitle: "₹150 OFF on Movie Tickets",
    rewardDescription: "Catch the latest blockbusters at Eternity Mall, VR Mall, or Cinepolis.",
    couponCode: "CINEGREEN150",
    validUntil: "31 Dec 2026",
    terms: "Valid on minimum booking of 2 tickets across Nagpur cinemas.",
  },
  {
    id: "reward_100kg",
    targetCo2Kg: 100,
    tierName: "Zero-Carbon Legend",
    tierBadge: "👑 Tier 6",
    brandName: "Decathlon Sports Nagpur",
    brandCategory: "shopping",
    brandColor: "from-purple-500 to-violet-600",
    brandBgColor: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/40",
    brandLogo: "🚲",
    rewardTitle: "Flat ₹250 OFF on Cycling & Eco Gear",
    rewardDescription: "Upgrade your urban commuting gear or bicycle accessories.",
    couponCode: "DECATHLON250",
    validUntil: "31 Dec 2026",
    terms: "Valid in-store at Decathlon Nagpur on minimum purchase of ₹999.",
  },
];

// Lightweight Confetti Particle Canvas Generator
function triggerConfettiPopper() {
  const count = 75;
  const colors = ["#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6", "#fbbf24"];
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.inset = "0";
  container.style.pointerEvents = "none";
  container.style.zIndex = "99999";
  container.style.overflow = "hidden";
  document.body.appendChild(container);

  const particles: Array<{
    el: HTMLElement;
    x: number;
    y: number;
    vx: number;
    vy: number;
    rot: number;
    vRot: number;
    color: string;
    size: number;
    opacity: number;
  }> = [];

  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    const isRibbon = Math.random() > 0.5;
    const size = Math.random() * 8 + 6;
    const color = colors[Math.floor(Math.random() * colors.length)] || "#10b981";

    el.style.position = "absolute";
    el.style.width = isRibbon ? `${size * 2}px` : `${size}px`;
    el.style.height = `${size}px`;
    el.style.backgroundColor = color;
    el.style.borderRadius = isRibbon ? "2px" : "50%";
    el.style.transformOrigin = "center center";

    container.appendChild(el);

    const angle = (Math.PI * (Math.random() * 0.8 + 0.1)) + Math.PI; // Upward spray
    const speed = Math.random() * 14 + 10;

    particles.push({
      el,
      x: window.innerWidth / 2 + (Math.random() * 80 - 40),
      y: window.innerHeight * 0.65,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rot: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 18,
      color,
      size,
      opacity: 1,
    });
  }

  let frame = 0;
  const animate = () => {
    frame++;
    let alive = false;
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.45; // Gravity
      p.vx *= 0.98; // Air resistance
      p.rot += p.vRot;
      p.opacity -= 0.012;

      if (p.opacity > 0) {
        alive = true;
        p.el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) rotate(${p.rot}deg)`;
        p.el.style.opacity = String(p.opacity);
      } else {
        p.el.style.display = "none";
      }
    }

    if (alive && frame < 120) {
      requestAnimationFrame(animate);
    } else {
      container.remove();
    }
  };

  requestAnimationFrame(animate);
}

// ── Interactive HTML5 Scratch Foil Card ──
interface ScratchCardModalProps {
  milestone: RewardMilestone;
  onClose: () => void;
  onScratched: (milestoneId: string) => void;
  isAlreadyScratched: boolean;
}

export function ScratchCardModal({
  milestone,
  onClose,
  onScratched,
  isAlreadyScratched,
}: ScratchCardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRevealed, setIsRevealed] = useState(isAlreadyScratched);
  const [copied, setCopied] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [scratchPercent, setScratchPercent] = useState(isAlreadyScratched ? 100 : 0);

  // Initialize metallic foil canvas
  useEffect(() => {
    if (isAlreadyScratched) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Rich metallic silver-emerald holographic foil gradient
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, "#cbd5e1");
    grad.addColorStop(0.25, "#e2e8f0");
    grad.addColorStop(0.5, "#a7f3d0"); // subtle emerald sparkle
    grad.addColorStop(0.75, "#f1f5f9");
    grad.addColorStop(1, "#94a3b8");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Add glitter pattern overlay
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? "rgba(255, 255, 255, 0.4)" : "rgba(16, 185, 129, 0.25)";
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 2 + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Centered foil label & instructions
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 15px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🎁 SCRATCH TO REVEAL 🎁", width / 2, height / 2 - 12);

    ctx.fillStyle = "#475569";
    ctx.font = "11px system-ui, -apple-system, sans-serif";
    ctx.fillText("Rub or drag your finger here", width / 2, height / 2 + 14);
  }, [isAlreadyScratched]);

  // Scratch action handler
  const scratch = useCallback(
    (clientX: number, clientY: number) => {
      if (isRevealed) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.fill();

      // Check scratched percentage occasionally
      if (Math.random() > 0.4) {
        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const pixels = imgData.data;
          let transparent = 0;
          for (let i = 3; i < pixels.length; i += 16) {
            if (pixels[i] === 0) transparent++;
          }
          const totalSampled = pixels.length / 16;
          const pct = Math.round((transparent / totalSampled) * 100);
          setScratchPercent(pct);

          if (pct >= 38 && !isRevealed) {
            handleCompleteReveal();
          }
        } catch {
          // ignore context errors
        }
      }
    },
    [isRevealed]
  );

  const handleCompleteReveal = () => {
    if (isRevealed) return;
    setIsRevealed(true);
    setScratchPercent(100);
    triggerConfettiPopper();
    onScratched(milestone.id);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(milestone.couponCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Mouse & Touch events
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDrawing(true);
    scratch(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDrawing) scratch(e.clientX, e.clientY);
  };

  const handleMouseUp = () => setIsDrawing(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDrawing(true);
    const touch = e.touches[0];
    if (touch) scratch(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDrawing) {
      const touch = e.touches[0];
      if (touch) scratch(touch.clientX, touch.clientY);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-card border border-border/80 p-5 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="size-4" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                {milestone.tierBadge}
              </p>
              <h3 className="text-sm font-black text-foreground">{milestone.tierName} Reward</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>

        {/* Scratch Area Container */}
        <div className="relative mx-auto my-2 aspect-[16/10] w-full max-w-[280px] overflow-hidden rounded-2xl border-2 border-dashed border-emerald-500/40 bg-gradient-to-br from-emerald-50 via-teal-50 to-green-100 p-4 shadow-inner dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-green-900/20 flex flex-col items-center justify-center text-center select-none">
          {/* Revealed Underlying Voucher Content */}
          <div className="flex flex-col items-center justify-center">
            <span className="text-3xl mb-1">{milestone.brandLogo}</span>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{milestone.brandName}</p>
            <p className="mt-0.5 text-base font-black text-foreground leading-tight px-2">
              {milestone.rewardTitle}
            </p>

            {/* Voucher Code Chip */}
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-background/90 px-3 py-1.5 border border-emerald-500/30 shadow-sm">
              <span className="font-mono text-sm font-black tracking-widest text-emerald-700 dark:text-emerald-300">
                {milestone.couponCode}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 text-[10px] font-bold transition cursor-pointer"
              >
                {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                {copied ? "COPIED" : "COPY"}
              </button>
            </div>
          </div>

          {/* Interactive Scratch Canvas Overlay */}
          {!isRevealed && (
            <canvas
              ref={canvasRef}
              width={280}
              height={175}
              className="absolute inset-0 size-full cursor-crosshair rounded-2xl touch-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
            />
          )}
        </div>

        {/* Scratch Progress & Helper Buttons */}
        {!isRevealed ? (
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-[11px] text-muted-foreground">Scratched: {scratchPercent}%</span>
            <button
              type="button"
              onClick={handleCompleteReveal}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Zap className="size-3" /> Instant Reveal
            </button>
          </div>
        ) : (
          <div className="mt-3 text-center">
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center justify-center gap-1">
              <PartyPopper className="size-3.5" /> Voucher Unlocked & Active!
            </p>
          </div>
        )}

        {/* Details & Validity info */}
        <div className="mt-4 rounded-xl bg-secondary/50 p-2.5 text-[11px] text-muted-foreground space-y-1">
          <div className="flex items-center justify-between font-medium">
            <span>Valid Until:</span>
            <span className="text-foreground font-semibold">{milestone.validUntil}</span>
          </div>
          <p className="text-[10px] leading-relaxed opacity-80">{milestone.terms}</p>
        </div>

        {/* Close / Action Button */}
        <div className="mt-4 flex gap-2">
          {isRevealed && (
            <button
              type="button"
              onClick={handleCopyCode}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Code Copied to Clipboard!" : "Copy Voucher Code"}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className={`font-semibold py-2 px-3 rounded-xl text-xs border border-border text-foreground hover:bg-secondary transition cursor-pointer ${
              !isRevealed ? "w-full bg-secondary" : ""
            }`}
          >
            {isRevealed ? "Done" : "Scratch Later"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Green Rewards Section Component for Carbon Panel ──
export interface GreenRewardsProps {
  totalCo2SavedKg: number;
  userId?: string;
}

export function GreenRewardsSection({ totalCo2SavedKg, userId = "" }: GreenRewardsProps) {
  // Persisted state of claimed/scratched vouchers
  const [claimedIds, setClaimedIds] = useState<string[]>([]);
  const [activeScratchMilestone, setActiveScratchMilestone] = useState<RewardMilestone | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Load user-specific claimed reward IDs on mount / user change
  useEffect(() => {
    let isSubscribed = true;
    fetchUserEcoStats(userId).then((stats) => {
      if (isSubscribed) {
        setClaimedIds(stats.claimedRewardIds);
      }
    });
    return () => {
      isSubscribed = false;
    };
  }, [userId]);

  // Sync claimed rewards to Supabase and user-scoped storage
  const handleMarkScratched = async (milestoneId: string) => {
    setClaimedIds((prev) => (prev.includes(milestoneId) ? prev : [...prev, milestoneId]));
    const updated = await claimUserRewardMilestone(userId, milestoneId);
    setClaimedIds(updated);
  };

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Find currently unlocked vs locked milestones
  const readyToScratchCount = REWARD_MILESTONES.filter(
    (m) => totalCo2SavedKg >= m.targetCo2Kg && !claimedIds.includes(m.id)
  ).length;

  return (
    <div className="space-y-3">
      {/* Rewards Header Card */}
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-green-500/10 p-3.5 dark:border-emerald-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm">
              <Gift className="size-4" />
            </span>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Green Rewards & Vouchers
              </h4>
              <p className="text-[10px] text-muted-foreground">
                Earn brand discounts for every CO₂ milestone you complete!
              </p>
            </div>
          </div>
          {readyToScratchCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black text-white animate-pulse shadow-sm">
              <Sparkles className="size-3" /> {readyToScratchCount} Ready!
            </span>
          )}
        </div>
      </div>

      {/* Rewards List */}
      <div className="space-y-2.5">
        {REWARD_MILESTONES.map((milestone) => {
          const isUnlocked = totalCo2SavedKg >= milestone.targetCo2Kg;
          const isClaimed = claimedIds.includes(milestone.id);
          const isReadyToScratch = isUnlocked && !isClaimed;
          const progressPct = Math.min(100, Math.round((totalCo2SavedKg / milestone.targetCo2Kg) * 100));

          return (
            <div
              key={milestone.id}
              className={`relative overflow-hidden rounded-2xl border p-3 transition-all duration-200 ${
                isReadyToScratch
                  ? "border-emerald-500 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-green-500/15 shadow-md ring-2 ring-emerald-500/30"
                  : isClaimed
                  ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                  : "border-border/80 bg-card/60 opacity-85"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Brand Logo / Icon */}
                <div className="flex items-start gap-2.5">
                  <span className="flex size-9 flex-shrink-0 items-center justify-center rounded-xl bg-background border border-border text-lg shadow-sm">
                    {milestone.brandLogo}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded">
                        {milestone.tierBadge}
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {milestone.brandName}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-bold text-foreground leading-snug">
                      {milestone.rewardTitle}
                    </p>
                  </div>
                </div>

                {/* Right Action Button / Status */}
                <div className="flex-shrink-0">
                  {isReadyToScratch ? (
                    <button
                      type="button"
                      onClick={() => setActiveScratchMilestone(milestone)}
                      className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-[11px] px-2.5 py-1.5 shadow-sm active:scale-95 transition cursor-pointer animate-bounce"
                    >
                      <Sparkles className="size-3 text-amber-200" /> Scratch 🎁
                    </button>
                  ) : isClaimed ? (
                    <button
                      type="button"
                      onClick={() => setActiveScratchMilestone(milestone)}
                      className="flex items-center gap-1 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-[10px] px-2 py-1 border border-border transition cursor-pointer"
                    >
                      View Code
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-secondary/80 px-2 py-1 rounded-lg">
                      <Lock className="size-3" /> {milestone.targetCo2Kg} kg
                    </div>
                  )}
                </div>
              </div>

              {/* Claimed Code Bar OR Lock Progress Bar */}
              {isClaimed ? (
                <div className="mt-2.5 flex items-center justify-between rounded-xl bg-background/90 px-2.5 py-1.5 border border-emerald-500/20 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <Tag className="size-3 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-mono font-bold text-foreground">{milestone.couponCode}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(milestone.couponCode, milestone.id)}
                    className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    {copiedCodeId === milestone.id ? (
                      <span className="flex items-center gap-0.5 text-emerald-600">
                        <Check className="size-3" /> COPIED!
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5">
                        <Copy className="size-3" /> Copy
                      </span>
                    )}
                  </button>
                </div>
              ) : !isUnlocked ? (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Progress to unlock</span>
                    <span>
                      {totalCo2SavedKg.toFixed(1)} / {milestone.targetCo2Kg} kg ({progressPct}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-emerald-500/70 transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Active Scratch Card Modal */}
      {activeScratchMilestone && (
        <ScratchCardModal
          milestone={activeScratchMilestone}
          onClose={() => setActiveScratchMilestone(null)}
          onScratched={handleMarkScratched}
          isAlreadyScratched={claimedIds.includes(activeScratchMilestone.id)}
        />
      )}
    </div>
  );
}
