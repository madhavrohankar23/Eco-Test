import { useState, useRef, useEffect } from "react";
import {
  Bot,
  Sparkles,
  X,
  Send,
  Loader2,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RotateCcw,
  Minimize2,
  Maximize2,
  MessageSquare,
  HelpCircle,
  Route,
  Navigation,
} from "lucide-react";
import type { Journey } from "@/lib/routing";
import { askAiTransitChatbot, N8N_WEBHOOK_URL } from "@/lib/n8nAiService";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  time: string;
}

interface AiTransitChatbotProps {
  currentJourney?: Journey | null | undefined;
  originName?: string | null | undefined;
  destinationName?: string | null | undefined;
}

const INITIAL_WELCOME_MESSAGE = `👋 **Namaste! I'm your Nagpur Transit Guide.**

Ask me anything about:
• 🚇 Nagpur Metro routes, stations & tokens
• 🚌 Aapli Bus frequencies & stops
• 📍 Step-by-step route explanations
• 💡 City transit tips & shortcuts

How can I help you travel today?`;

export default function AiTransitChatbot({
  currentJourney,
  originName,
  destinationName,
}: AiTransitChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-msg",
      role: "assistant",
      text: INITIAL_WELCOME_MESSAGE,
      time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    },
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeakingId, setIsSpeakingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isLoading]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setIsSpeakingId(null);
      }
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? inputVal).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text,
      time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal("");
    setIsLoading(true);

    try {
      const journeyCtx =
        currentJourney && originName && destinationName
          ? {
              journey: currentJourney,
              originName,
              destinationName,
            }
          : null;

      const aiResponseText = await askAiTransitChatbot(text, journeyCtx);

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        text: aiResponseText,
        time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        text: `⚠️ **Could not reach n8n AI Agent.**\n${err?.message || "Please check your n8n workflow."}`,
        time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSpeech = (msgId: string, text: string) => {
    if (!window.speechSynthesis) return;

    if (isSpeakingId === msgId) {
      window.speechSynthesis.cancel();
      setIsSpeakingId(null);
      return;
    }

    const cleanText = text
      .replace(/[*#_`>~]/g, "")
      .replace(/•/g, "")
      .replace(/👋|📍|🚶|🚌|🔄|🚇|💡|🌱|🌟|⚠️/g, "");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeakingId(null);
    utterance.onerror = () => setIsSpeakingId(null);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeakingId(msgId);
  };

  const handleCopy = async (msgId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(msgId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Ignore copy errors
    }
  };

  const handleClearChat = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeakingId(null);
    setMessages([
      {
        id: "welcome-msg",
        role: "assistant",
        text: INITIAL_WELCOME_MESSAGE,
        time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <>
      {/* ── 1. Floating Bottom-Right Chat Button ── */}
      <div className="fixed bottom-5 right-5 z-[1200]">
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:bg-black active:scale-95 dark:border dark:border-white/20 dark:bg-white dark:text-slate-950"
            title="Ask Nagpur AI Transit Guide"
          >
            {/* Pulsing Ripple Effect */}
            <span className="absolute -inset-0.5 animate-ping rounded-full bg-emerald-500/30 opacity-75 duration-1000" />

            <div className="relative flex size-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
              <Sparkles className="size-4 animate-spin-slow" />
            </div>

            <div className="relative text-left pr-1">
              <div className="text-[12px] font-extrabold leading-tight tracking-tight flex items-center gap-1.5">
                <span>AI Transit Guide</span>
                <span className="flex size-2 rounded-full bg-emerald-400" />
              </div>
              <div className="text-[10px] text-slate-300 font-medium dark:text-slate-600">
                Ask route & metro questions
              </div>
            </div>
          </button>
        ) : null}
      </div>

      {/* ── 2. Floating Chatbot Window ── */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 z-[1200] flex h-[540px] w-[375px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-3xl border border-border/80 bg-background/95 shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 bg-slate-950 px-4 py-3 text-white dark:bg-card">
            <div className="flex items-center gap-2.5">
              <div className="relative flex size-8 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
                <Bot className="size-4" />
                <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full border-2 border-slate-950 bg-emerald-400 dark:border-card" />
              </div>
              <div>
                <h3 className="text-xs font-bold leading-tight flex items-center gap-1.5">
                  <span>Eco-Move AI Guide</span>
                  <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-extrabold text-emerald-400">
                    Online
                  </span>
                </h3>
                <p className="text-[10.5px] text-slate-300 dark:text-muted-foreground">
                  Powered by n8n & Gemini AI
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearChat}
                title="Clear chat history"
                className="rounded-lg p-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white dark:text-muted-foreground dark:hover:text-foreground"
              >
                <RotateCcw className="size-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Minimize chat"
                className="rounded-lg p-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white dark:text-muted-foreground dark:hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Quick Context Strip (if a route is active) */}
          {currentJourney && originName && destinationName && (
            <div className="flex items-center justify-between border-b border-border/40 bg-secondary/30 px-3.5 py-1.5 text-[11px] font-medium text-foreground">
              <div className="flex items-center gap-1.5 truncate">
                <Route className="size-3.5 text-primary shrink-0" />
                <span className="truncate">
                  {originName} → {destinationName}
                </span>
              </div>
              <button
                onClick={() =>
                  handleSendMessage("Can you explain my currently planned transit route step-by-step in friendly words?")
                }
                className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary transition hover:bg-primary/20"
              >
                Explain Route
              </button>
            </div>
          )}

          {/* Messages Stream */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-xs">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              const isSpeaking = isSpeakingId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`relative max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed shadow-xs ${
                      isUser
                        ? "bg-slate-950 text-white dark:bg-primary dark:text-primary-foreground rounded-br-xs"
                        : "border border-border/70 bg-card text-foreground rounded-bl-xs whitespace-pre-line"
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Message Action Bar (Timestamp, Audio, Copy) */}
                  <div className="mt-1 flex items-center gap-2 px-1 text-[10px] text-muted-foreground">
                    <span>{msg.time}</span>

                    {!isUser && msg.id !== "welcome-msg" && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleSpeech(msg.id, msg.text)}
                          title={isSpeaking ? "Stop Audio" : "Listen to audio response"}
                          className="text-muted-foreground hover:text-foreground transition"
                        >
                          {isSpeaking ? (
                            <VolumeX className="size-3 text-amber-500" />
                          ) : (
                            <Volume2 className="size-3" />
                          )}
                        </button>
                        <button
                          onClick={() => handleCopy(msg.id, msg.text)}
                          title="Copy response"
                          className="text-muted-foreground hover:text-foreground transition"
                        >
                          {copiedId === msg.id ? (
                            <Check className="size-3 text-emerald-500" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* AI Typing Indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <div className="flex size-6 items-center justify-center rounded-lg bg-secondary text-primary">
                  <Bot className="size-3.5" />
                </div>
                <div className="flex items-center gap-1 rounded-2xl border border-border/70 bg-card px-3 py-2">
                  <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-primary" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="flex gap-1.5 overflow-x-auto px-3 py-1.5 border-t border-border/30 bg-secondary/10 no-scrollbar">
            <button
              onClick={() => handleSendMessage("How do I buy Nagpur Metro tickets or smart cards?")}
              className="shrink-0 rounded-full border border-border bg-card px-2.5 py-1 text-[10.5px] font-medium text-muted-foreground transition hover:border-primary hover:text-foreground"
            >
              🚇 Metro Tickets
            </button>
            <button
              onClick={() => handleSendMessage("What are the timings and pass rates for Aapli Bus?")}
              className="shrink-0 rounded-full border border-border bg-card px-2.5 py-1 text-[10.5px] font-medium text-muted-foreground transition hover:border-primary hover:text-foreground"
            >
              🚌 Aapli Bus Pass
            </button>
            <button
              onClick={() => handleSendMessage("How does Sitabuldi Interchange station work?")}
              className="shrink-0 rounded-full border border-border bg-card px-2.5 py-1 text-[10.5px] font-medium text-muted-foreground transition hover:border-primary hover:text-foreground"
            >
              🔄 Sitabuldi Interchange
            </button>
          </div>

          {/* Input Area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSendMessage();
            }}
            className="flex items-center gap-2 border-t border-border/60 bg-background p-2.5"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Ask anything about Nagpur transit..."
              disabled={isLoading}
              className="flex-1 rounded-xl border border-border bg-secondary/30 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />

            <button
              type="submit"
              disabled={!inputVal.trim() || isLoading}
              className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white transition hover:bg-black active:scale-95 disabled:opacity-40 dark:bg-primary dark:text-primary-foreground"
            >
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-3.5" />}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
