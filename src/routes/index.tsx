import React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import WhyNagpurConnect from "../components/WhyNagpurConnect";
import HowItWorks from "../components/HowItWorks";
import { Leaf, ArrowRight, MapPin, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Eco-Move Nagpur | Smart Multimodal Transit Planner" },
      {
        name: "description",
        content:
          "Plan seamless journeys across Nagpur with Aapli Bus, Orange & Blue Metro, and pedestrian routing.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-emerald-500 selection:text-white">
      <Navbar visible />
      <Hero showContent />
      <WhyNagpurConnect />
      <HowItWorks />

      {/* Call to Action Banner */}
      <section className="py-20 bg-gradient-to-br from-emerald-600 via-teal-700 to-blue-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 to-transparent"></div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="h-4 w-4 text-amber-300" />
            Ready for your daily commute?
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
            Experience Nagpur's Green Transit Revolution
          </h2>
          <p className="text-base sm:text-lg text-white/85 max-w-2xl mx-auto mb-10 leading-relaxed">
            Find the quickest metro transfers, optimal bus connections, and track your carbon emission savings with every trip.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/app"
              className="inline-flex items-center justify-center gap-2.5 bg-white text-emerald-800 font-bold px-8 py-4 rounded-2xl shadow-xl hover:bg-white/95 hover:shadow-2xl transition hover:-translate-y-0.5 text-base"
            >
              Launch Journey Planner
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 bg-emerald-900/60 hover:bg-emerald-900/80 text-white font-semibold px-6 py-4 rounded-2xl border border-white/20 backdrop-blur-md transition hover:-translate-y-0.5 text-base"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-xl text-white shadow-md">
              <Leaf className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">Eco-Move Nagpur</p>
              <p className="text-xs text-muted-foreground">Multimodal Green Urban Mobility</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/app" className="hover:text-primary transition">
              Live Map
            </Link>
            <Link to="/login" className="hover:text-primary transition">
              Sign In
            </Link>
            <Link to="/signup" className="hover:text-primary transition">
              Sign Up
            </Link>
          </div>

          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Eco-Move Nagpur. FYP Project.
          </p>
        </div>
      </footer>
    </div>
  );
}
