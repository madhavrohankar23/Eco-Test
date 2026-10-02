import React, { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Clock, Leaf, MapPin, Route } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Hero({ showContent = true }: { showContent?: boolean }) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Autoplay notice:", err);
        });
      }
    }
  }, []);

  return (
    <div className="relative isolate overflow-hidden min-h-screen flex items-center justify-center font-sans">
      {/* Background Video */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover scale-105"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster="/auth.png"
        >
          <source src="/background.mp4" type="video/mp4" />
          <source src="/background.mp4.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Multi-layer overlay */}
      <div
        className={`absolute inset-0 z-10 transition-all duration-[1500ms] ease-out pointer-events-none ${
          showContent ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <div
            className={`transition-all duration-700 ease-out delay-100 ${
              showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/80 backdrop-blur-md border border-emerald-100 shadow-lg shadow-emerald-100/30 mb-8">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-sm font-semibold text-emerald-700 tracking-wide">
                Sustainable Urban Mobility
              </span>
            </div>
          </div>

          {/* Headline */}
          <div
            className={`transition-all duration-700 ease-out delay-300 ${
              showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <h1
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold leading-[0.95] tracking-tight mb-6"
              style={{ textShadow: "0 4px 30px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3)" }}
            >
              <span className="text-white block">Move Smarter.</span>
              <span
                className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-300 to-orange-300 block mt-1"
                style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.3))" }}
              >
                Connect Better.
              </span>
            </h1>
          </div>

          {/* Subtext */}
          <div
            className={`transition-all duration-700 ease-out delay-500 ${
              showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <p
              className="text-base sm:text-lg md:text-xl text-white max-w-2xl mb-12 leading-relaxed font-medium"
              style={{ textShadow: "0 2px 15px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.2)" }}
            >
              Plan seamless journeys across Nagpur with multimodal transportation, smarter routes, and sustainable travel insights.
            </p>
          </div>

          {/* CTA Button (Single Blue Pill Button redirecting user) */}
          <div
            className={`flex justify-center mb-16 transition-all duration-700 ease-out delay-700 ${
              showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <Link
              to={user ? "/app" : "/login"}
              className="group relative inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-nagpur-blue-primary to-blue-600 text-white text-lg font-semibold px-8 py-4 rounded-2xl shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-0.5"
            >
              Plan Your Journey
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Floating Stat Cards */}
          <div
            className={`grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full max-w-3xl transition-all duration-700 ease-out delay-1000 ${
              showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-lg shadow-black/5 text-center group hover:bg-white hover:shadow-xl transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center mx-auto mb-2.5 group-hover:scale-110 transition-transform">
                <Route className="h-5 w-5 text-nagpur-blue-primary" />
              </div>
              <p className="text-xs font-semibold text-nagpur-text-secondary uppercase tracking-wider">
                Routes
              </p>
              <p className="text-lg font-bold text-nagpur-navy">Multimodal</p>
            </div>

            <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-lg shadow-black/5 text-center group hover:bg-white hover:shadow-xl transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center mx-auto mb-2.5 group-hover:scale-110 transition-transform">
                <Leaf className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="text-xs font-semibold text-nagpur-text-secondary uppercase tracking-wider">
                Carbon
              </p>
              <p className="text-lg font-bold text-nagpur-navy">-65% CO₂</p>
            </div>

            <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-lg shadow-black/5 text-center group hover:bg-white hover:shadow-xl transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center mx-auto mb-2.5 group-hover:scale-110 transition-transform">
                <Clock className="h-5 w-5 text-nagpur-orange" />
              </div>
              <p className="text-xs font-semibold text-nagpur-text-secondary uppercase tracking-wider">
                Saved
              </p>
              <p className="text-lg font-bold text-nagpur-navy">20 min</p>
            </div>

            <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-lg shadow-black/5 text-center group hover:bg-white hover:shadow-xl transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center mx-auto mb-2.5 group-hover:scale-110 transition-transform">
                <MapPin className="h-5 w-5 text-purple-600" />
              </div>
              <p className="text-xs font-semibold text-nagpur-text-secondary uppercase tracking-wider">
                Coverage
              </p>
              <p className="text-lg font-bold text-nagpur-navy">All Nagpur</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
