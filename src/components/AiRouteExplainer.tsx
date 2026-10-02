import { useState, useEffect } from "react";
import {
  Sparkles,
  Loader2,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RefreshCw,
  Bot,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Journey } from "@/lib/routing";
import { explainRouteWithN8n, N8N_WEBHOOK_URL } from "@/lib/n8nAiService";

interface AiRouteExplainerProps {
  journey: Journey;
  originName: string;
  destinationName: string;
}

export default function AiRouteExplainer({
  journey,
  originName,
  destinationName,
}: AiRouteExplainerProps) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState(N8N_WEBHOOK_URL);
  const [showConfig, setShowConfig] = useState(false);

  // Clear previous explanation when journey or endpoints change
  useEffect(() => {
    setExplanation(null);
    setError(null);
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [journey.totalTimeMin, journey.totalDistanceM, originName, destinationName]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleFetchExplanation = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await explainRouteWithN8n(journey, originName, destinationName, webhookUrl);
      setExplanation(result);
    } catch (err: any) {
      setError(err?.message || "Failed to reach n8n AI Agent. Please verify your n8n webhook status.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!explanation) return;
    try {
      await navigator.clipboard.writeText(explanation);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard write failure
    }
  };

  const handleToggleSpeech = () => {
    if (!window.speechSynthesis || !explanation) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Clean markdown characters for pleasant speech narration
    const cleanText = explanation
      .replace(/[*#_`>~]/g, "")
      .replace(/•/g, "")
      .replace(/📍|🚶|🌱|⚡|💡|🏆|⚖️/g, "");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/5 via-background to-secondary/20 p-4 shadow-sm transition-all dark:border-primary/30">
      {/* Background Accent Blur */}
      <div className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-primary/10 blur-2xl" />

      {/* Header */}
      <div className="relative flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="size-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold leading-tight text-foreground flex items-center gap-1.5">
              <span>AI Transit Guide (n8n)</span>
              <span className="rounded-full bg-primary/15 px-1.5 py-0.2 text-[9.5px] font-extrabold text-primary">
                Gemini AI
              </span>
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Natural language route breakdown & advice
            </p>
          </div>
        </div>

        {/* Action button if already loaded */}
        {explanation && !isLoading && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleToggleSpeech}
              title={isSpeaking ? "Stop Voice Narration" : "Listen to Route Audio Guide"}
              className={`flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition active:scale-95 ${
                isSpeaking
                  ? "border-amber-500 bg-amber-500 text-white shadow-sm dark:border-amber-400"
                  : "border-border bg-white text-muted-foreground hover:text-foreground dark:bg-card"
              }`}
            >
              {isSpeaking ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5 text-primary" />}
              <span className="text-[11px]">{isSpeaking ? "Stop" : "Listen"}</span>
            </button>

            <button
              onClick={handleCopy}
              title="Copy explanation"
              className="flex items-center gap-1 rounded-xl border border-border bg-white p-1.5 text-muted-foreground transition hover:text-foreground active:scale-95 dark:bg-card"
            >
              {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
            </button>

            <button
              onClick={handleFetchExplanation}
              title="Regenerate explanation"
              className="flex items-center gap-1 rounded-xl border border-border bg-white p-1.5 text-muted-foreground transition hover:text-foreground active:scale-95 dark:bg-card"
            >
              <RefreshCw className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main Trigger Button (when no explanation generated yet) */}
      {!explanation && !isLoading && !error && (
        <div className="mt-3">
          <button
            onClick={handleFetchExplanation}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 px-4 text-xs font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-98"
          >
            <Sparkles className="size-3.5 transition group-hover:rotate-12" />
            <span>Explain This Route with AI</span>
          </button>
        </div>
      )}

      {/* AI Typing Indicator */}
      {isLoading && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 py-3 px-3.5 text-xs text-primary font-bold shadow-xs">
          <div className="flex items-center gap-2">
            <Bot className="size-4 text-primary animate-pulse" />
            <span>AI Agent is typing route explanation...</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></span>
            <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></span>
            <span className="size-1.5 rounded-full bg-primary animate-bounce"></span>
          </div>
        </div>
      )}

      {/* Error Message with n8n troubleshooting info */}
      {error && !isLoading && (
        <div className="mt-3 space-y-2">
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            <div className="flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">n8n Webhook Error</p>
                <p className="text-[11px] leading-relaxed text-destructive/90">{error}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              onClick={handleFetchExplanation}
              className="flex items-center gap-1.5 rounded-xl bg-destructive px-3 py-1.5 text-xs font-bold text-destructive-foreground transition hover:bg-destructive/90 active:scale-95"
            >
              <RefreshCw className="size-3" />
              <span>Retry Request</span>
            </button>

            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
            >
              <span>Webhook Settings</span>
              {showConfig ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </button>
          </div>
        </div>
      )}

      {/* Optional Webhook URL Configuration Form */}
      {showConfig && (
        <div className="mt-3 rounded-xl border border-border bg-card p-2.5 text-xs space-y-1.5">
          <label className="text-[10.5px] font-bold text-foreground block">
            Active n8n Webhook URL:
          </label>
          <input
            type="text"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://...app.n8n.cloud/webhook-test/explain-route"
            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="text-[10px] text-muted-foreground">
            💡 For active production workflows, change <code className="font-mono text-primary">/webhook-test/</code> to <code className="font-mono text-primary">/webhook/</code>.
          </p>
        </div>
      )}

      {/* Generated Natural Language AI Explanation */}
      {explanation && !isLoading && (
        <div className="mt-3 space-y-2">
          <div className="rounded-xl border border-primary/15 bg-white/80 dark:bg-card/80 p-3.5 shadow-xs backdrop-blur-sm">
            <div className="text-xs leading-relaxed text-foreground whitespace-pre-line font-medium">
              {explanation}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
