import React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../context/AuthContext";
import { Lock, LogIn, Leaf, ShieldAlert } from "lucide-react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-xs text-muted-foreground font-medium animate-pulse">
          Verifying Nagpur Connect credentials...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white relative">
        <div className="w-full max-w-md bg-white/10 dark:bg-card/20 backdrop-blur-2xl p-8 rounded-3xl border border-white/20 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-400">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-white">Sign In Required</h2>
          <p className="text-sm text-slate-300 mb-6 leading-relaxed">
            Please sign in to your Eco-Move account to access the Nagpur live interactive map, multimodal routing, and saved trips.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              to="/login"
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-emerald-500/30 transition hover:scale-[1.02] active:scale-[0.98]"
            >
              <LogIn className="h-4 w-4" />
              Sign In to Continue
            </Link>
            <Link
              to="/"
              className="w-full inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-slate-200 text-sm font-medium py-3 rounded-xl transition"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
