import { createFileRoute, Link } from "@tanstack/react-router";
import VoiceJourneyInput from "@/components/VoiceJourneyInput";
import { ArrowLeft, Leaf } from "lucide-react";

export const Route = createFileRoute("/voice")({
  component: VoiceJourneyPage,
});

function VoiceJourneyPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            to="/app"
            className="flex size-9 items-center justify-center rounded-xl transition hover:bg-secondary active:scale-95 text-foreground"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Leaf className="size-4" />
            </div>
            <h1 className="text-lg font-black tracking-tight text-foreground">
              Eco-Move Voice
            </h1>
          </div>
        </div>
      </header>
      
      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center justify-center relative">
        {/* Background glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="w-full max-w-xl text-center mb-8 z-10">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground mb-4">
            Just say where you want to go.
          </h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Our smart multilingual AI understands English, Hindi, and Marathi journey requests instantly.
          </p>
        </div>
        
        <div className="w-full z-10">
          <VoiceJourneyInput />
        </div>
        
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-muted-foreground z-10">
          <span className="bg-secondary/50 px-3 py-1.5 rounded-full">"Mujhe Sadar se Medical Square jana hai"</span>
          <span className="bg-secondary/50 px-3 py-1.5 rounded-full">"Dharampeth to Lakadganj by bus"</span>
          <span className="bg-secondary/50 px-3 py-1.5 rounded-full">"Cheapest way from Manish Nagar to Airport"</span>
          <span className="bg-secondary/50 px-3 py-1.5 rounded-full">"कम दूरी में सदर से इमामवाड़ा"</span>
        </div>
      </div>
    </main>
  );
}
