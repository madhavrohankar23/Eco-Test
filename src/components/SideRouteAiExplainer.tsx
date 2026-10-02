import { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  Loader2,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RefreshCw,
  Scale,
  X,
  Minimize2,
  Maximize2,
  Bot,
  Route,
  ArrowLeft,
  Languages,
  ShieldAlert,
  Clock,
  IndianRupee,
  Footprints,
  Leaf,
  Trophy,
  Accessibility,
  Car,
} from "lucide-react";
import type { Journey } from "@/lib/routing";
import {
  explainRouteWithN8n,
  compareRoutesWithN8n,
  generateDetailedRouteExplanation,
  generateDetailedRouteComparison,
  getCachedRouteExplanation,
  clearCachedRouteExplanation,
  getCachedRouteComparison,
  clearCachedRouteComparison,
  type AiLanguage,
} from "@/lib/n8nAiService";

interface SideRouteAiExplainerProps {
  journeys: Journey[];
  selectedIndex: number;
  originName: string;
  destinationName: string;
  onSelectJourney?: (index: number) => void;
  onClose?: () => void;
}

type TextSize = "normal" | "large" | "jumbo";

/**
 * Renders bold markdown text (**text**) cleanly into React elements.
 */
function renderFormattedInlineText(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-extrabold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

/**
 * Elderly-Friendly & Accessible Single Route Travel Story.
 * Formats all travel steps into a single cohesive bulleted box, followed by simple stat boxes at the end.
 */
function ElderlyFriendlyRouteExplainer({
  journey,
  originName,
  destinationName,
  selectedIndex,
  language,
  textSize,
  onPlayVoice,
  isSpeaking,
}: {
  journey: Journey;
  originName: string;
  destinationName: string;
  selectedIndex: number;
  language: AiLanguage;
  textSize: TextSize;
  onPlayVoice: () => void;
  isSpeaking: boolean;
}) {
  const timeMin = Math.round(journey.totalTimeMin);
  const fareRs = journey.totalFareRs ?? 0;
  const walkM = Math.round(journey.walkDistanceM || 0);
  const transfers = journey.transfers ?? 0;
  const co2Saved = Math.max(0, Math.round(((journey.totalDistanceM || 0) / 1000) * 170 - (journey.co2g || 0)));

  const isFallbackDrive = Boolean(journey.isFallbackDrive || journey.legs?.some((l) => l.mode === "drive"));

  // Identify transit rides
  const transitLegs = (journey.legs || []).filter((l) => l.mode !== "walk" && l.mode !== "drive");
  const hasMetro = transitLegs.some((l) => l.mode === "metro");

  // Determine senior comfort score (1 to 10)
  let comfortScore = 9.5;
  if (transfers > 1) comfortScore -= (transfers - 1) * 1.5;
  if (walkM > 1000) comfortScore -= 1.0;
  if (walkM > 2000) comfortScore -= 1.5;
  comfortScore = Math.max(6.0, Math.min(10.0, comfortScore));

  const isVeryEasy = comfortScore >= 8.5;

  // Text size classes
  const baseTextClass =
    textSize === "jumbo" ? "text-sm" : textSize === "large" ? "text-[13px]" : "text-[11.5px]";
  const headingTextClass =
    textSize === "jumbo" ? "text-base" : textSize === "large" ? "text-[14px]" : "text-xs";
  const statTextClass =
    textSize === "jumbo" ? "text-lg" : textSize === "large" ? "text-base" : "text-sm";

  // Build bullet points for the single unified instruction box
  const bullets: Array<{ icon: string; text: string }> = [];

  (journey.legs || []).forEach((leg) => {
    const legTime = Math.round(leg.timeMin || 1);
    const legDist = Math.round(leg.distanceM || 0);

    if (leg.mode === "walk") {
      if (language === "hi") {
        bullets.push({
          icon: "🚶",
          text: `**${leg.from}** से **${leg.to}** तक ~${legDist}m (~${legTime} मिनट) **पैदल चलें**।`,
        });
      } else if (language === "mr") {
        bullets.push({
          icon: "🚶",
          text: `**${leg.from}** ते **${leg.to}** पर्यंत ~${legDist}m (~${legTime} मिनिटे) **पायी चाला**.`,
        });
      } else {
        bullets.push({
          icon: "🚶",
          text: `**Walk** ~${legDist}m (~${legTime} mins) from **${leg.from}** to **${leg.to}**.`,
        });
      }
    } else if (leg.mode === "drive") {
      const legDistKm = legDist < 1000 ? `${legDist}m` : `${(legDist / 1000).toFixed(1)} km`;
      if (language === "hi") {
        bullets.push({
          icon: "🚗",
          text: `**${leg.from}** से **${leg.to}** तक सीधे **कार या कैब से जाएं** (~${legDistKm}, ~${legTime} मिनट सफर)। मुख्य सड़क मार्ग से सीधा रास्ता।`,
        });
      } else if (language === "mr") {
        bullets.push({
          icon: "🚗",
          text: `**${leg.from}** ते **${leg.to}** दरम्यान थेट **कार/कॅबने प्रवास करा** (~${legDistKm}, ~${legTime} मिनिटे प्रवास). रस्त्यावरून थेट मार्ग.`,
        });
      } else {
        bullets.push({
          icon: "🚗",
          text: `**Drive or Book a Cab** from **${leg.from}** to **${leg.to}** (~${legDistKm}, ~${legTime} mins direct road route).`,
        });
      }
    } else if (leg.mode === "metro") {
      const lineName = leg.line || "Nagpur Metro";
      const stopsInfo =
        leg.stops && leg.stops.length > 0
          ? ` (${leg.stops.length} ${language === "hi" ? "स्टेशन" : language === "mr" ? "स्थानके" : "stations"})`
          : "";

      if (language === "hi") {
        bullets.push({
          icon: "🚇",
          text: `**${leg.from}** पर **मेट्रो (${lineName})** पकड़ें ➔ **${leg.to}** पर उतरें${stopsInfo}, सफर ~${legTime} मिनट। (लिफ्ट और एसी सुविधा उपलब्ध है)`,
        });
      } else if (language === "mr") {
        bullets.push({
          icon: "🚇",
          text: `**${leg.from}** येथून **मेट्रो (${lineName})** मध्ये चढा ➔ **${leg.to}** येथे उतरा${stopsInfo}, प्रवास ~${legTime} मिनिटे. (लिफ्ट व एसी उपलब्ध आहे)`,
        });
      } else {
        bullets.push({
          icon: "🚇",
          text: `Board **Metro (${lineName})** at **${leg.from}** ➔ Alight at **${leg.to}**${stopsInfo}, ride for ~${legTime} mins. (Elevators & AC available)`,
        });
      }
    } else if (leg.mode === "bus") {
      const busName = leg.busNumber ? `Aapli Bus ${leg.busNumber}` : leg.line || "Aapli Bus";
      const stopsInfo =
        leg.stops && leg.stops.length > 0
          ? ` (${leg.stops.length} ${language === "hi" ? "स्टॉप" : language === "mr" ? "थांबे" : "stops"})`
          : "";

      if (language === "hi") {
        bullets.push({
          icon: "🚌",
          text: `**${leg.from}** से **${busName}** में बैठें ➔ **${leg.to}** पर उतरें${stopsInfo}, सफर ~${legTime} मिनट।`,
        });
      } else if (language === "mr") {
        bullets.push({
          icon: "🚌",
          text: `**${leg.from}** येथून **${busName}** पकडा ➔ **${leg.to}** येथे उतरा${stopsInfo}, प्रवास ~${legTime} मिनिटे.`,
        });
      } else {
        bullets.push({
          icon: "🚌",
          text: `Hop on **${busName}** from **${leg.from}** ➔ Alight at **${leg.to}**${stopsInfo}, ~${legTime} mins ride.`,
        });
      }
    }
  });

  // Helpful tips bullet
  if (isFallbackDrive) {
    if (language === "hi") {
      bullets.push({
        icon: "💡",
        text: `इस समय कोई सार्वजनिक बस/मेट्रो सेवा सक्रिय नहीं है। अनुमानित ईंधन/वाहन खर्च **~₹${fareRs}** है। आप नीचे **Show Available Cab Services** से सीधी कैब बुक कर सकते हैं।`,
      });
    } else if (language === "mr") {
      bullets.push({
        icon: "💡",
        text: `या वेळी कोणतीही सार्वजनिक बस/मेट्रो सेवा सुरू नाही. अंदाजे इंधन/वाहन खर्च **~₹${fareRs}** आहे. आपण खालील **Show Available Cab Services** वरून थेट कॅब बुक करू शकता.`,
      });
    } else {
      bullets.push({
        icon: "💡",
        text: `No scheduled public transit is active right now along this corridor. Estimated fuel cost is **~₹${fareRs}**. You can also book an Uber or Ola cab from the cab panel below.`,
      });
    }
  } else if (language === "hi") {
    bullets.push({
      icon: "💡",
      text: `किराए के लिए **₹${fareRs} खुले पैसे (Cash)** रखें। ${
        hasMetro ? "मेट्रो स्टेशन पर लिफ्ट की सुविधा है।" : ""
      } बस में आगे की सीटें बुजुर्गों के लिए आरक्षित हैं।`,
    });
  } else if (language === "mr") {
    bullets.push({
      icon: "💡",
      text: `भाड्यासाठी **₹${fareRs} सुट्टे पैसे (Cash)** तयार ठेवा. ${
        hasMetro ? "मेट्रो स्थानकांवर लिफ्ट उपलब्ध आहे." : ""
      } बसमध्ये पुढील जागा ज्येष्ठ नागरिकांसाठी राखीव असतात.`,
    });
  } else {
    bullets.push({
      icon: "💡",
      text: `Keep **₹${fareRs} exact change** or Metro card ready. ${
        hasMetro ? "Elevators are available at all Metro stations." : ""
      } Front seats are reserved for senior citizens.`,
    });
  }

  return (
    <div className={`space-y-3.5 animate-in fade-in duration-300 ${baseTextClass}`}>
      {/* ── 1. ALL IN A SINGLE BOX (BULLET POINTS) ── */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-primary/30 bg-background/95 p-4 shadow-sm space-y-3">
        {/* Header inside single box: Title + Voice Audio Button */}
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
          <div className="flex items-center gap-2">
            <div className={`flex size-7 items-center justify-center rounded-xl font-black shadow-xs ${
              isFallbackDrive ? "bg-red-700 text-white" : "bg-primary text-primary-foreground"
            }`}>
              {isFallbackDrive ? <Car className="size-4" /> : <Bot className="size-4" />}
            </div>
            <div>
              <h4 className={`font-black text-foreground leading-tight ${headingTextClass}`}>
                {isFallbackDrive
                  ? language === "hi"
                    ? "ड्राइविंग फॉलबैक गाइड"
                    : language === "mr"
                    ? "ड्राइव्हिंग फॉलबॅक मार्गदर्शिका"
                    : "Driving Fallback Guide"
                  : language === "hi"
                  ? "नागपुर यात्रा गाइड"
                  : language === "mr"
                  ? "नागपूर प्रवास मार्गदर्शिका"
                  : "Nagpur Route Guide"}
              </h4>
              <span className="text-[10px] text-muted-foreground font-semibold">
                {isFallbackDrive
                  ? language === "hi"
                    ? `फॉलबैक विकल्प (${originName} ➔ ${destinationName})`
                    : language === "mr"
                    ? `फॉलबॅक पर्याय (${originName} ➔ ${destinationName})`
                    : `Fallback Option (${originName} ➔ ${destinationName})`
                  : language === "hi"
                  ? `विकल्प ${selectedIndex + 1} (${originName} ➔ ${destinationName})`
                  : language === "mr"
                  ? `पर्याय ${selectedIndex + 1} (${originName} ➔ ${destinationName})`
                  : `Option ${selectedIndex + 1} (${originName} ➔ ${destinationName})`}
              </span>
            </div>
          </div>

          {/* Voice button */}
          <button
            onClick={onPlayVoice}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 font-bold shadow-xs transition-all active:scale-95 text-[11px] ${
              isSpeaking
                ? "bg-rose-500 text-white animate-pulse"
                : isFallbackDrive
                ? "bg-red-700 text-white hover:bg-red-800"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
            title="Voice Guide for Seniors"
          >
            {isSpeaking ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
            <span className="font-extrabold">
              {isSpeaking
                ? language === "hi"
                  ? "रोकें"
                  : language === "mr"
                  ? "थांबवा"
                  : "Stop"
                : language === "hi"
                ? "सुनिए"
                : language === "mr"
                ? "ऐका"
                : "Listen"}
            </span>
          </button>
        </div>

        {/* Short friendly conversational intro */}
        <p className="text-muted-foreground font-medium leading-relaxed">
          {isFallbackDrive ? (
            language === "hi" ? (
              <>
                इस समय या इस मार्ग पर सार्वजनिक बस/मेट्रो सेवा उपलब्ध नहीं है। मुख्य सड़क मार्ग से सीधे{" "}
                <strong className="text-foreground font-black">कार/ड्राइव/कैब फॉलबैक मार्ग</strong> तैयार किया गया है:
              </>
            ) : language === "mr" ? (
              <>
                या वेळी किंवा या मार्गावर सार्वजनिक बस/मेट्रो सेवा उपलब्ध नाही. रस्त्यावरून थेट{" "}
                <strong className="text-foreground font-black">कार/ड्राइव्ह/कॅब फॉलबॅक मार्ग</strong> तयार करण्यात आला आहे:
              </>
            ) : (
              <>
                No public transit (bus/metro) is active for this route or time. A direct{" "}
                <strong className="text-foreground font-black">driving / cab fallback route</strong> is recommended via the road network:
              </>
            )
          ) : language === "hi" ? (
            <>
              यह यात्रा आपके लिए <strong className="text-foreground font-black">आसान और सुरक्षित</strong> है। कृपया नीचे
              दिए गए मुख्य चरणों का पालन करें:
            </>
          ) : language === "mr" ? (
            <>
              हा प्रवास ज्येष्ठ नागरिकांसाठी <strong className="text-foreground font-black">सोयीस्कर व सोपा</strong> आहे.
              खालील टप्प्यांप्रमाणे प्रवास करा:
            </>
          ) : (
            <>
              This journey is <strong className="text-foreground font-black">simple and senior-friendly</strong> with{" "}
              {transitLegs.length} transit ride{transitLegs.length === 1 ? "" : "s"}. Follow the steps below:
            </>
          )}
        </p>

        {/* ── Bullet Points List ── */}
        <ul className="space-y-2.5 pt-1 pl-0.5">
          {bullets.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-foreground leading-relaxed">
              <span className="shrink-0 mt-0.5 text-[13px] select-none">{item.icon}</span>
              <div className="flex-1 font-medium">{renderFormattedInlineText(item.text)}</div>
            </li>
          ))}
        </ul>
      </div>

      {/* ── 2. IN THE END: SIMPLE BOXES OF TOTAL TIME, TOTAL FARE, COMFORT RATING ── */}
      <div className="space-y-2 pt-0.5">
        {/* Metric Boxes Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-background/90 p-2.5 border-2 border-primary/20 shadow-2xs">
            <span className="text-[10px] font-black uppercase text-muted-foreground flex items-center justify-center gap-1">
              <Clock className="size-3.5 text-primary" />
              {language === "hi" ? "कुल समय" : language === "mr" ? "एकूण वेळ" : "Total Time"}
            </span>
            <span className={`block font-black text-foreground mt-0.5 ${statTextClass}`}>
              ~{timeMin} {language === "hi" ? "मिनट" : language === "mr" ? "मि." : "mins"}
            </span>
          </div>

          <div className="rounded-2xl bg-emerald-500/10 p-2.5 border-2 border-emerald-500/30 shadow-2xs">
            <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1">
              <IndianRupee className="size-3.5 text-emerald-600" />
              {isFallbackDrive
                ? language === "hi" ? "अनुमानित ईंधन" : language === "mr" ? "अंदाजे इंधन" : "Est. Fuel"
                : language === "hi" ? "कुल किराया" : language === "mr" ? "एकूण भाडे" : "Total Fare"}
            </span>
            <span className={`block font-black text-emerald-600 dark:text-emerald-400 mt-0.5 ${statTextClass}`}>
              ₹{fareRs}
            </span>
          </div>

          <div className="rounded-2xl bg-amber-500/10 p-2.5 border-2 border-amber-500/30 shadow-2xs">
            <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-300 flex items-center justify-center gap-1">
              {isFallbackDrive ? <Car className="size-3.5 text-amber-600" /> : <Footprints className="size-3.5 text-amber-600" />}
              {isFallbackDrive
                ? language === "hi" ? "सड़क दूरी" : language === "mr" ? "रस्ता अंतर" : "Road Distance"
                : language === "hi" ? "पैदल चलना" : language === "mr" ? "पायी चालणे" : "Walk Distance"}
            </span>
            <span className={`block font-black text-foreground mt-0.5 ${statTextClass}`}>
              {isFallbackDrive ? `${((journey.totalDistanceM || 0) / 1000).toFixed(1)} km` : `${walkM}m`}
            </span>
          </div>
        </div>

        {/* Simple Comfort Rating Box */}
        <div className="flex items-center justify-between rounded-2xl bg-background/90 px-3.5 py-2 border-2 border-border/80 shadow-2xs text-[11px]">
          <div className="flex items-center gap-1.5">
            {isFallbackDrive ? <Car className="size-4 text-red-600" /> : <Accessibility className="size-4 text-emerald-600" />}
            <span className="font-black text-foreground">
              {isFallbackDrive
                ? language === "hi" ? "सीधा सड़क मार्ग (गाड़ी / कैब)" : language === "mr" ? "थेट रस्ता मार्ग (गाडी / कॅब)" : "Direct Road Drive (Car / Cab)"
                : language === "hi"
                ? `सुलभता स्कोर: ${comfortScore.toFixed(1)}/10`
                : language === "mr"
                ? `सुलभता गुण: ${comfortScore.toFixed(1)}/10`
                : `Comfort Rating: ${comfortScore.toFixed(1)}/10`}
            </span>
          </div>

          <span
            className={`rounded-full px-2.5 py-0.5 font-black text-[10px] ${
              isFallbackDrive
                ? "bg-red-500/20 text-red-700 dark:text-red-300"
                : isVeryEasy
                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
            }`}
          >
            {isFallbackDrive
              ? language === "hi"
                ? "🚗 फॉलबैक मार्ग"
                : language === "mr"
                ? "🚗 फॉलबॅक मार्ग"
                : "🚗 Fallback Route"
              : isVeryEasy
              ? language === "hi"
                ? "🟢 बहुत आसान मार्ग"
                : language === "mr"
                ? "🟢 अत्यंत सोपा मार्ग"
                : "🟢 Very Easy Route"
              : language === "hi"
              ? "🟡 सामान्य मार्ग"
              : language === "mr"
              ? "🟡 मध्यम मार्ग"
              : "🟡 Moderate Route"}
          </span>
        </div>

        {/* Eco Green Footprint Pill */}
        <div className={`flex items-center gap-2 rounded-2xl border p-2 text-[10.5px] font-bold shadow-2xs ${
          isFallbackDrive
            ? "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-300"
            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
        }`}>
          {isFallbackDrive ? <Car className="size-3.5 text-amber-600 shrink-0" /> : <Leaf className="size-3.5 text-emerald-600 shrink-0" />}
          <span>
            {isFallbackDrive
              ? language === "hi"
                ? "🚗 सीधा वाहन मार्ग। (दिन में 06:00 AM – 10:30 PM के बीच कार्बन बचत के लिए सार्वजनिक बस/मेट्रो चुनें!)"
                : language === "mr"
                ? "🚗 थेट वाहन मार्ग. (दिवसा 06:00 AM – 10:30 PM दरम्यान कार्बन बचतीसाठी बस/मेट्रो निवडा!)"
                : "🚗 Direct road route. (Choose public transit during regular hours 06:00 AM – 10:30 PM to save emissions!)"
              : language === "hi"
              ? `सार्वजनिक साधन चुनकर आपने ~${co2Saved}g कार्बन (CO₂) बचाया!`
              : language === "mr"
              ? `सार्वजनिक वाहनाने प्रवास करून ~${co2Saved}g कार्बनची बचत झाली!`
              : `Green Choice: You save ~${co2Saved}g of CO₂ vs private car.`}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * High-Contrast, Senior-Friendly Comparison Table for Multi-Route comparison.
 */
function MultiRouteComparisonTable({
  journeys,
  selectedIndex,
  language,
  textSize,
  onSelectJourney,
}: {
  journeys: Journey[];
  selectedIndex: number;
  language: AiLanguage;
  textSize: TextSize;
  onSelectJourney?: (index: number) => void;
}) {
  if (!journeys || journeys.length === 0) return null;

  let fastestIdx = 0;
  let cheapestIdx = 0;
  let leastWalkIdx = 0;

  journeys.forEach((j, idx) => {
    const fJ = journeys[fastestIdx];
    const cJ = journeys[cheapestIdx];
    const lJ = journeys[leastWalkIdx];
    if (fJ && j.totalTimeMin < fJ.totalTimeMin) fastestIdx = idx;
    if (cJ && (j.totalFareRs ?? 999) < (cJ.totalFareRs ?? 999)) cheapestIdx = idx;
    if (lJ && (j.walkDistanceM ?? 99999) < (lJ.walkDistanceM ?? 99999)) leastWalkIdx = idx;
  });

  const baseTextClass =
    textSize === "jumbo" ? "text-sm" : textSize === "large" ? "text-[13px]" : "text-[11.5px]";

  return (
    <div className={`space-y-3.5 animate-in fade-in duration-300 ${baseTextClass}`}>
      {/* ── AI Recommendation Hero Banner ── */}
      <div className="rounded-3xl border-2 border-primary/40 bg-gradient-to-r from-primary/15 via-background to-secondary/30 p-3.5 shadow-md">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="flex size-7 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-2xs font-black">
            <Trophy className="size-4" />
          </div>
          <span className="font-black text-foreground text-xs">
            {language === "hi"
              ? "🏆 बुजुर्गों के लिए सर्वश्रेष्ठ विकल्प:"
              : language === "mr"
              ? "🏆 ज्येष्ठांसाठी सर्वोत्तम शिफारस:"
              : "🏆 Best Senior-Friendly Choice:"}
          </span>
        </div>

        <p className="text-[11.5px] leading-relaxed text-muted-foreground pl-9">
          {language === "hi" ? (
            <>
              गति के लिए <strong className="text-foreground font-black">विकल्प {fastestIdx + 1}</strong> (~
              {Math.round(journeys[fastestIdx]?.totalTimeMin || 0)} मिनट) चुनें। सबसे कम किराए और सीधे सफर के लिए{" "}
              <strong className="text-emerald-600 dark:text-emerald-400 font-black">विकल्प {cheapestIdx + 1}</strong> (₹
              {journeys[cheapestIdx]?.totalFareRs ?? 0}) सबसे उत्तम है!
            </>
          ) : language === "mr" ? (
            <>
              जलद प्रवासासाठी <strong className="text-foreground font-black">पर्याय {fastestIdx + 1}</strong> (~
              {Math.round(journeys[fastestIdx]?.totalTimeMin || 0)} मिनिटे) उत्तम आहे. सर्वात कमी खर्चात थेट प्रवासासाठी{" "}
              <strong className="text-emerald-600 dark:text-emerald-400 font-black">पर्याय {cheapestIdx + 1}</strong> (₹
              {journeys[cheapestIdx]?.totalFareRs ?? 0}) निवडा!
            </>
          ) : (
            <>
              Take <strong className="text-foreground font-black">Option {fastestIdx + 1}</strong> for top speed (~
              {Math.round(journeys[fastestIdx]?.totalTimeMin || 0)} mins) or{" "}
              <strong className="text-emerald-600 dark:text-emerald-400 font-black">Option {cheapestIdx + 1}</strong> (₹
              {journeys[cheapestIdx]?.totalFareRs ?? 0}) for lowest cost!
            </>
          )}
        </p>
      </div>

      {/* ── High-Contrast Comparison Matrix ── */}
      <div className="overflow-hidden rounded-3xl border-2 border-border/80 bg-background shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/70 bg-secondary/70 text-[10.5px] font-black text-foreground uppercase tracking-wider">
                <th className="py-2.5 px-3">
                  {language === "hi" ? "विकल्प" : language === "mr" ? "पर्याय" : "Option"}
                </th>
                <th className="py-2.5 px-2 text-center">
                  {language === "hi" ? "समय" : language === "mr" ? "वेळ" : "Time"}
                </th>
                <th className="py-2.5 px-2 text-center">
                  {language === "hi" ? "किराया" : language === "mr" ? "भाडे" : "Fare"}
                </th>
                <th className="py-2.5 px-2 text-center">
                  {language === "hi" ? "पैदल" : language === "mr" ? "पायी" : "Walk"}
                </th>
                <th className="py-2.5 px-2">
                  {language === "hi" ? "माध्यम" : language === "mr" ? "वाहन" : "Transit"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {journeys.map((j, idx) => {
                const isSelected = idx === selectedIndex;
                const isFastest = idx === fastestIdx;
                const isCheapest = idx === cheapestIdx;
                const isDirect = (j.transfers ?? 0) === 0;

                const transitLegs = j.legs.filter((l) => l.mode !== "walk");
                const transitSummary =
                  transitLegs.length > 0
                    ? transitLegs
                        .map((l) =>
                          l.mode === "metro"
                            ? `🚇 ${l.line || "Metro"}`
                            : `🚌 ${l.busNumber ? `Bus ${l.busNumber}` : l.line || "Bus"}`
                        )
                        .join(" + ")
                    : "🚶 Walk";

                return (
                  <tr
                    key={idx}
                    onClick={() => onSelectJourney?.(idx)}
                    className={`cursor-pointer transition-all ${
                      isSelected
                        ? "bg-primary/20 font-black hover:bg-primary/25 ring-2 ring-primary/50"
                        : "hover:bg-secondary/40"
                    }`}
                  >
                    {/* Option Name & Badges */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`flex size-6 shrink-0 items-center justify-center rounded-xl text-xs font-black shadow-xs ${
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-foreground"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="flex flex-col">
                          <span className="font-black text-foreground">
                            {language === "hi"
                              ? `विकल्प ${idx + 1}`
                              : language === "mr"
                              ? `पर्याय ${idx + 1}`
                              : `Option ${idx + 1}`}
                          </span>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {isFastest && (
                              <span className="rounded-lg bg-amber-500/25 px-1.5 py-0.2 text-[8.5px] font-black text-amber-800 dark:text-amber-300">
                                ⚡ {language === "hi" ? "तेज़" : language === "mr" ? "जलद" : "Fastest"}
                              </span>
                            )}
                            {isCheapest && (
                              <span className="rounded-lg bg-emerald-500/25 px-1.5 py-0.2 text-[8.5px] font-black text-emerald-800 dark:text-emerald-300">
                                💰 {language === "hi" ? "सस्ता" : language === "mr" ? "स्वस्त" : "Cheapest"}
                              </span>
                            )}
                            {isDirect && (
                              <span className="rounded-lg bg-sky-500/25 px-1.5 py-0.2 text-[8.5px] font-black text-sky-800 dark:text-sky-300">
                                🔄 {language === "hi" ? "सीधा" : language === "mr" ? "थेट" : "Direct"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Time */}
                    <td className="py-2.5 px-2 text-center font-black text-foreground whitespace-nowrap">
                      ~{Math.round(j.totalTimeMin)}m
                    </td>

                    {/* Fare */}
                    <td className="py-2.5 px-2 text-center font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      ₹{j.totalFareRs ?? 0}
                    </td>

                    {/* Walk */}
                    <td className="py-2.5 px-2 text-center text-muted-foreground whitespace-nowrap text-[10.5px]">
                      {Math.round(j.walkDistanceM || 0)}m
                    </td>

                    {/* Transit summary */}
                    <td className="py-2.5 px-2 text-[10.5px] text-foreground font-bold truncate max-w-[120px]">
                      {transitSummary}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * Modern AI Typing & Streaming Animation Loader
 * Replaces old round spinner with typewriter phrases, jumping chat dots, and a live drafting skeleton.
 */
function AiTypingLoader({
  mode,
  selectedIndex,
  language,
}: {
  mode: "explain" | "compare";
  selectedIndex: number;
  language: AiLanguage;
}) {
  const phrases = useMemo(() => {
    if (mode === "compare") {
      if (language === "hi") {
        return [
          "सभी विकल्पों की तुलना की जा रही है...",
          "किराया, समय और पैदल दूरी की गणना हो रही है...",
          "बुजुर्गों के लिए सबसे आसान मार्ग चुना जा रहा है...",
          "तुलना तालिका तैयार हो रही है...",
        ];
      }
      if (language === "mr") {
        return [
          "सर्व पर्यायांची तुलना केली जात आहे...",
          "भाडे, वेळ आणि पायी अंतराची गणना सुरू आहे...",
          "ज्येष्ठांसाठी सर्वात सोपा मार्ग निवडला जात आहे...",
          "तुलना तक्ता तयार होत आहे...",
        ];
      }
      return [
        "Comparing all route options side-by-side...",
        "Evaluating total fares, durations & transfers...",
        "Selecting the most accessible travel choice...",
        "Building multi-route comparison table...",
      ];
    } else {
      if (language === "hi") {
        return [
          `विकल्प ${selectedIndex + 1} का सरल विश्लेषण हो रहा है...`,
          "नागपुर बस और मेट्रो समय की जाँच की जा रही है...",
          "पैदल चलने की दूरी और सुविधा जांची जा रही है...",
          "बुजुर्गों के अनुकूल आसान गाइड लिखी जा रही है...",
        ];
      }
      if (language === "mr") {
        return [
          `पर्याय ${selectedIndex + 1} चे सोपे विश्लेषण सुरू आहे...`,
          "नागपूर बस आणि मेट्रो वेळेची तपासणी केली जात आहे...",
          "पायी अंतर आणि सोयीची तपासणी सुरू आहे...",
          "ज्येष्ठांसाठी सोपी मार्गदर्शिका लिहिली जात आहे...",
        ];
      }
      return [
        `Analyzing Route Option ${selectedIndex + 1}...`,
        "Reviewing Nagpur bus schedules & metro lines...",
        "Checking walking distances & accessible transfers...",
        "Drafting senior-friendly step-by-step guidance...",
      ];
    }
  }, [mode, selectedIndex, language]);

  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const currentPhrase = phrases[phraseIndex] || phrases[0] || "";

    if (!isDeleting) {
      if (displayedText.length < currentPhrase.length) {
        timeout = setTimeout(() => {
          setDisplayedText(currentPhrase.slice(0, displayedText.length + 1));
        }, 32);
      } else {
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, 1800);
      }
    } else {
      if (displayedText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayedText(currentPhrase.slice(0, displayedText.length - 1));
        }, 18);
      } else {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayedText, isDeleting, phraseIndex, phrases]);

  return (
    <div className="flex flex-col items-center justify-center py-10 px-2 text-center select-none animate-in fade-in duration-300">
      {/* Typewriter Dynamic Status Headline with blinking cursor */}
      <div className="min-h-[28px] flex items-center justify-center px-1">
        <p className="text-[13.5px] font-extrabold text-foreground flex items-center justify-center text-center">
          <span>{displayedText}</span>
          <span className="inline-block w-1.5 h-4 ml-0.5 bg-primary animate-pulse rounded-xs"></span>
        </p>
      </div>

      {/* Pulsating Typewriter Skeleton Bars inside Inner Box */}
      <div className="mt-4 w-full max-w-[320px] rounded-2xl border border-border/80 bg-white/60 dark:bg-card/60 p-4 shadow-sm backdrop-blur-xs text-left">
        <div className="space-y-2.5">
          <div className="h-2.5 w-full rounded-full bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 animate-pulse"></div>
          <div className="h-2.5 w-4/5 rounded-full bg-gradient-to-r from-primary/15 via-primary/30 to-primary/15 animate-pulse [animation-delay:150ms]"></div>
          <div className="h-2.5 w-3/5 rounded-full bg-gradient-to-r from-primary/10 via-primary/25 to-primary/10 animate-pulse [animation-delay:300ms]"></div>
        </div>
      </div>
    </div>
  );
}

export default function SideRouteAiExplainer({
  journeys,
  selectedIndex,
  originName,
  destinationName,
  onSelectJourney,
  onClose,
}: SideRouteAiExplainerProps) {
  const [mode, setMode] = useState<"explain" | "compare">("explain");
  const [language, setLanguage] = useState<AiLanguage>("en");
  const [textSize, setTextSize] = useState<TextSize>("normal");

  const currentJourney = journeys[selectedIndex] ?? journeys[0];
  const totalOptions = journeys.length;

  const [content, setContent] = useState<string>(() => {
    if (currentJourney && originName && destinationName) {
      const cached = getCachedRouteExplanation(currentJourney, originName, destinationName, selectedIndex, "en");
      if (cached) return cached;
    }
    return "";
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  if (!currentJourney || !originName || !destinationName) return null;

  // Reset to single route explain mode when user clicks a new route option
  useEffect(() => {
    setMode("explain");
  }, [selectedIndex]);

  // Whenever selected index, endpoints, language, or mode changes, auto-load AI response with persistent caching
  useEffect(() => {
    setError(null);
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    if (mode === "compare") {
      const cachedComp = getCachedRouteComparison(journeys, originName, destinationName, language);
      if (cachedComp) {
        setContent(cachedComp);
        setIsLoading(false);
        return;
      }

      let isMounted = true;
      setIsLoading(true);

      const fetchComparison = async () => {
        try {
          const result = await compareRoutesWithN8n(journeys, originName, destinationName, undefined, language);
          if (isMounted) setContent(result);
        } catch {
          if (isMounted) {
            const fallback = generateDetailedRouteComparison(journeys, originName, destinationName, language);
            setContent(fallback);
          }
        } finally {
          if (isMounted) setIsLoading(false);
        }
      };

      void fetchComparison();
      return () => {
        isMounted = false;
      };
    }

    // Single route explain mode: check persistent cache
    const cached = getCachedRouteExplanation(currentJourney, originName, destinationName, selectedIndex, language);
    if (cached) {
      setContent(cached);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const fetchExplanation = async () => {
      try {
        const result = await explainRouteWithN8n(
          currentJourney,
          originName,
          destinationName,
          undefined,
          selectedIndex,
          language
        );
        if (isMounted) {
          setContent(result);
        }
      } catch {
        if (isMounted) {
          const fallback = generateDetailedRouteExplanation(currentJourney, originName, destinationName, selectedIndex, language);
          setContent(fallback);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void fetchExplanation();

    return () => {
      isMounted = false;
    };
  }, [selectedIndex, originName, destinationName, language, mode, currentJourney.totalTimeMin, currentJourney.totalDistanceM]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  /**
   * Triggers side-by-side comparison for all route options with instant caching
   */
  const handleCompareAll = async () => {
    if (isLoading || journeys.length <= 1) return;

    setMode("compare");
    setError(null);
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    const cached = getCachedRouteComparison(journeys, originName, destinationName, language);
    if (cached) {
      setContent(cached);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await compareRoutesWithN8n(journeys, originName, destinationName, undefined, language);
      setContent(result);
    } catch {
      const fallback = generateDetailedRouteComparison(journeys, originName, destinationName, language);
      setContent(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Switches back from Compare mode to current route explanation instantly from cache
   */
  const handleBackToSingleRoute = () => {
    setMode("explain");
    const cached = getCachedRouteExplanation(currentJourney, originName, destinationName, selectedIndex, language);
    if (cached) {
      setContent(cached);
    } else {
      setContent(generateDetailedRouteExplanation(currentJourney, originName, destinationName, selectedIndex, language));
    }
  };

  /**
   * Manually refreshes current AI explanation or comparison (clears cache entry and re-fetches from n8n)
   */
  const handleRefresh = async () => {
    if (isLoading) return;
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    if (mode === "compare") {
      clearCachedRouteComparison(journeys, originName, destinationName, language);
      setIsLoading(true);
      try {
        const result = await compareRoutesWithN8n(journeys, originName, destinationName, undefined, language);
        setContent(result);
      } catch {
        const fallback = generateDetailedRouteComparison(journeys, originName, destinationName, language);
        setContent(fallback);
      } finally {
        setIsLoading(false);
      }
    } else {
      clearCachedRouteExplanation(currentJourney, originName, destinationName, selectedIndex, language);
      setIsLoading(true);
      try {
        const result = await explainRouteWithN8n(
          currentJourney,
          originName,
          destinationName,
          undefined,
          selectedIndex,
          language
        );
        setContent(result);
      } catch {
        const fallback = generateDetailedRouteExplanation(currentJourney, originName, destinationName, selectedIndex, language);
        setContent(fallback);
      } finally {
        setIsLoading(false);
      }
    }
  };

  /**
   * Text-to-Speech audio guide with natural elderly-friendly pacing and language accent
   */
  const handleToggleSpeech = () => {
    if (!window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    let speechText = "";
    if (mode === "explain") {
      const timeMin = Math.round(currentJourney.totalTimeMin);
      const fareRs = currentJourney.totalFareRs ?? 0;
      const isFallback = Boolean(currentJourney.isFallbackDrive || currentJourney.legs.some((l) => l.mode === "drive"));

      if (isFallback) {
        if (language === "hi") {
          speechText = `नमस्ते! इस समय कोई सार्वजनिक बस या मेट्रो सेवा उपलब्ध नहीं है। मुख्य सड़क मार्ग से सीधी कार या कैब की यात्रा लगभग ${timeMin} मिनट की है और अनुमानित खर्च ${fareRs} रुपये है।`;
        } else if (language === "mr") {
          speechText = `नमस्कार! या वेळी कोणतीही सार्वजनिक बस किंवा मेट्रो सेवा उपलब्ध नाही. थेट कार किंवा कॅबचा प्रवास सुमारे ${timeMin} मिनिटांचा आहे आणि अंदाजे खर्च ${fareRs} रुपये आहे.`;
        } else {
          speechText = `Hello! No scheduled public transit is active right now. A direct driving or cab route takes about ${timeMin} minutes with an estimated fuel cost of ${fareRs} rupees.`;
        }
      } else {
        const transitLegs = currentJourney.legs.filter((l) => l.mode !== "walk");
        if (language === "hi") {
          const modesDesc = transitLegs
            .map((l) => (l.mode === "metro" ? `मेट्रो ${l.line || "ब्लू लाइन"}` : `आपली बस ${l.busNumber || ""}`))
            .join(" और फिर ");
          speechText = `नमस्ते! विकल्प ${selectedIndex + 1} का सफर लगभग ${timeMin} मिनट का है। कुल किराया ${fareRs} रुपये लगेगा। आपको ${modesDesc} से यात्रा करनी है।`;
        } else if (language === "mr") {
          const modesDesc = transitLegs
            .map((l) => (l.mode === "metro" ? `मेट्रो ${l.line || "ब्लू लाइन"}` : `आपली बस ${l.busNumber || ""}`))
            .join(" आणि नंतर ");
          speechText = `नमस्कार! पर्याय ${selectedIndex + 1} चा प्रवास सुमारे ${timeMin} मिनिटांचा आहे. एकूण भाडे ${fareRs} रुपये आहे. ${modesDesc} ने प्रवास सुखकर होईल.`;
        } else {
          const modesDesc = transitLegs
            .map((l) => (l.mode === "metro" ? `Metro ${l.line || "Blue Line"}` : `Bus ${l.busNumber || ""}`))
            .join(" and then ");
          speechText = `Hello! Option ${selectedIndex + 1} takes about ${timeMin} minutes and costs ${fareRs} rupees using ${modesDesc}.`;
        }
      }
    } else {
      if (language === "hi") {
        speechText = `सभी ${totalOptions} विकल्पों की तुलना तालिका।`;
      } else if (language === "mr") {
        speechText = `सर्व ${totalOptions} पर्यायांची तुलना तक्ता।`;
      } else {
        speechText = `Comparison overview for all ${totalOptions} available route options.`;
      }
    }

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN";
    utterance.rate = 0.92;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  /**
   * Cycle text size: normal -> large -> jumbo -> normal
   */
  const handleCycleTextSize = () => {
    setTextSize((prev) => (prev === "normal" ? "large" : prev === "large" ? "jumbo" : "normal"));
  };

  /**
   * Copy to clipboard
   */
  const handleCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore copy error
    }
  };

  // If minimized, display a sleek docked floating pill
  if (isMinimized) {
    return (
      <div className="absolute left-[480px] sm:left-[515px] top-4 z-[1000] animate-in fade-in slide-in-from-left-2">
        <button
          onClick={() => setIsMinimized(false)}
          className="group flex items-center gap-2 rounded-2xl border-2 border-primary/40 bg-white/95 px-4 py-2.5 text-xs font-black text-foreground shadow-2xl backdrop-blur-md transition hover:border-primary hover:bg-primary/10 hover:text-primary active:scale-95 dark:bg-card/95"
          title="Open AI Route Explainer Bot"
        >
          <div className="flex size-7 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <Bot className="size-4 animate-bounce" />
          </div>
          <span className="font-extrabold">
            👵 AI Guide ({language.toUpperCase()}): Option {selectedIndex + 1}
          </span>
          <Maximize2 className="size-4 text-muted-foreground transition group-hover:text-primary" />
        </button>
      </div>
    );
  }

  return (
    <aside
      className="absolute left-[480px] sm:left-[515px] top-3 z-[1000] flex w-[370px] sm:w-[410px] max-w-[calc(100vw-530px)] flex-col overflow-hidden rounded-3xl border-2 border-border/90 bg-white/95 shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-left-4 dark:bg-card/95"
      style={{ maxHeight: "calc(100vh - 24px)" }}
    >
      {/* ── Top Header Bar ── */}
      <header className="flex items-center justify-between border-b border-border/70 bg-gradient-to-r from-primary/15 via-background to-amber-500/10 px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-emerald-500 text-primary-foreground shadow-xs">
            <Bot className="size-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-[13px] font-black text-foreground">
                {language === "hi"
                  ? "नागपूर AI साथी"
                  : language === "mr"
                  ? "नागपूर AI मित्र"
                  : "Nagpur AI Transit Mitra"}
              </h3>
            </div>
            <p className="truncate text-[10px] text-muted-foreground font-semibold">
              {mode === "compare"
                ? language === "hi"
                  ? `सभी ${totalOptions} विकल्पों की सरल तुलना`
                  : language === "mr"
                  ? `सर्व ${totalOptions} पर्यायांची सोपी तुलना`
                  : `Comparing all ${totalOptions} options`
                : language === "hi"
                ? `सरल यात्रा मार्गदर्शिका (विकल्प ${selectedIndex + 1})`
                : language === "mr"
                ? `सोपी प्रवास मार्गदर्शिका (पर्याय ${selectedIndex + 1})`
                : `Simple Route Guide (Option ${selectedIndex + 1})`}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Senior Text Size Cycle Button */}
          <button
            onClick={handleCycleTextSize}
            title={`Font Size: ${textSize.toUpperCase()} (Click to toggle)`}
            className={`flex items-center gap-0.5 rounded-xl border px-2 py-1 font-black transition active:scale-95 text-[11px] ${
              textSize !== "normal"
                ? "border-primary bg-primary text-primary-foreground shadow-xs"
                : "border-border bg-white text-muted-foreground hover:text-foreground dark:bg-secondary/40"
            }`}
          >
            <span>A</span>
            <span className="text-[9px]">{textSize === "jumbo" ? "++" : textSize === "large" ? "+" : ""}</span>
          </button>

          {!isLoading && (
            <>
              <button
                onClick={handleCopy}
                title="Copy advice"
                className="flex size-7.5 items-center justify-center rounded-xl border border-border bg-white text-muted-foreground transition hover:text-foreground active:scale-95 dark:bg-secondary/40"
              >
                {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              </button>

              <button
                onClick={handleRefresh}
                title="Regenerate explanation (refetches from AI in selected language)"
                className="flex size-7.5 items-center justify-center rounded-xl border border-border bg-white text-muted-foreground transition hover:text-foreground active:scale-95 dark:bg-secondary/40"
              >
                <RefreshCw className="size-3.5" />
              </button>
            </>
          )}

          <button
            onClick={() => setIsMinimized(true)}
            title="Minimize"
            className="flex size-7.5 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <Minimize2 className="size-4" />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              title="Close AI panel"
              className="flex size-7.5 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <X className="size-4.5" />
            </button>
          )}
        </div>
      </header>

      {/* ── Language Switcher Bar (English | हिंदी | मराठी) ── */}
      <div className="flex items-center justify-between border-b border-border/70 bg-secondary/30 px-3.5 py-1.5 backdrop-blur-xs">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
          <Languages className="size-3.5 text-primary" />
          <span>Language:</span>
        </div>
        <div className="flex items-center gap-1 rounded-2xl bg-background/90 p-0.5 border border-border/70 shadow-2xs">
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={`rounded-xl px-2.5 py-1 text-[11px] font-black transition-all ${
              language === "en"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setLanguage("hi")}
            className={`rounded-xl px-2.5 py-1 text-[11px] font-black transition-all ${
              language === "hi"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            हिंदी
          </button>
          <button
            type="button"
            onClick={() => setLanguage("mr")}
            className={`rounded-xl px-2.5 py-1 text-[11px] font-black transition-all ${
              language === "mr"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            मराठी
          </button>
        </div>
      </div>

      {/* ── Context & Action Strip (Option number & Compare All button) ── */}
      <div className="flex items-center justify-between border-b border-border/60 bg-secondary/20 px-3.5 py-2">
        {mode === "explain" ? (
          <>
            <div className="flex items-center gap-1.5 text-[11.5px] font-black text-foreground truncate">
              <Route className="size-3.5 text-primary shrink-0" />
              <span className="truncate">
                {language === "hi"
                  ? `विकल्प ${selectedIndex + 1} (${totalOptions} में से)`
                  : language === "mr"
                  ? `पर्याय ${selectedIndex + 1} (${totalOptions} पैकी)`
                  : `Option ${selectedIndex + 1} of ${totalOptions}`}
              </span>
            </div>

            {totalOptions > 1 && (
              <button
                onClick={handleCompareAll}
                disabled={isLoading}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-[11px] font-black text-primary-foreground shadow-xs transition hover:bg-primary/90 active:scale-95 disabled:opacity-50"
                title="Compare all available route options side-by-side"
              >
                <Scale className="size-3.5" />
                <span>
                  {language === "hi"
                    ? `तुलना करें (${totalOptions})`
                    : language === "mr"
                    ? `तुलना करा (${totalOptions})`
                    : `Compare (${totalOptions})`}
                </span>
              </button>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5 text-[11.5px] font-black text-primary">
              <Scale className="size-3.5" />
              <span>
                {language === "hi"
                  ? "मल्टी-रूट तुलना तालिका"
                  : language === "mr"
                  ? "मल्टी-मार्ग तुलना तक्ता"
                  : "Multi-Route Comparison"}
              </span>
            </div>

            <button
              onClick={handleBackToSingleRoute}
              className="flex items-center gap-1 rounded-xl border border-border bg-white px-2.5 py-1 text-[11px] font-black text-muted-foreground transition hover:text-foreground active:scale-95 dark:bg-card"
            >
              <ArrowLeft className="size-3" />
              <span>
                {language === "hi"
                  ? `विकल्प ${selectedIndex + 1}`
                  : language === "mr"
                  ? `पर्याय ${selectedIndex + 1}`
                  : `Option ${selectedIndex + 1}`}
              </span>
            </button>
          </>
        )}
      </div>

      {/* ── Scrollable AI Content Stream ── */}
      <div className="flex-1 overflow-y-auto p-3.5 text-xs">
        {isLoading ? (
          <AiTypingLoader
            mode={mode}
            selectedIndex={selectedIndex}
            language={language}
          />
        ) : error ? (
          <div className="rounded-3xl border-2 border-destructive/30 bg-destructive/5 p-4 text-xs text-destructive">
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <ShieldAlert className="size-4" />
              <span>Could not fetch AI advice</span>
            </div>
            <p className="text-[11px] leading-relaxed">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-2.5 rounded-xl bg-destructive/10 px-3 py-1 text-[11px] font-bold text-destructive hover:bg-destructive/20"
            >
              Try Again
            </button>
          </div>
        ) : mode === "compare" ? (
          <MultiRouteComparisonTable
            journeys={journeys}
            selectedIndex={selectedIndex}
            language={language}
            textSize={textSize}
            onSelectJourney={(idx) => {
              onSelectJourney?.(idx);
              setMode("explain");
            }}
          />
        ) : (
          <ElderlyFriendlyRouteExplainer
            journey={currentJourney}
            originName={originName}
            destinationName={destinationName}
            selectedIndex={selectedIndex}
            language={language}
            textSize={textSize}
            onPlayVoice={handleToggleSpeech}
            isSpeaking={isSpeaking}
          />
        )}
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-border/50 bg-secondary/20 px-4 py-2 text-[10px] text-muted-foreground flex items-center justify-between">
        <span className="font-semibold">
          {mode === "compare"
            ? language === "hi"
              ? "विस्तार से देखने के लिए किसी भी विकल्प पर क्लिक करें"
              : language === "mr"
              ? "तपशील पाहण्यासाठी कोणत्याही पर्यायावर क्लिक करा"
              : "Click any row to view full details"
            : language === "hi"
            ? "रूट बदलने के लिए बाईं ओर किसी भी विकल्प पर क्लिक करें"
            : language === "mr"
            ? "मार्ग बदलण्यासाठी डावीकडील पर्यायावर क्लिक करा"
            : "Click any route on left to explain"}
        </span>
        <span className="font-black text-primary uppercase text-[9px] tracking-wider">
          {language === "hi" ? "हिंदी" : language === "mr" ? "मराठी" : "English"}
        </span>
      </footer>
    </aside>
  );
}
