import React, { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, ArrowRight, Loader2, Leaf, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordComponent,
});

function ForgotPasswordComponent() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setError("");

    try {
      const result = await resetPassword(email.trim());
      if (result && typeof result === "object" && "error" in result && result.error) {
        throw result.error;
      }
      setIsSuccess(true);
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String(err.message) : undefined;
      setError(msg || "Failed to send password reset email.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative bg-cover bg-center"
      style={{ backgroundImage: "url('/auth.png')" }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

      {/* Floating Logo Top-Left */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          to="/"
          className="inline-flex items-center gap-2.5 bg-white/95 dark:bg-card/95 border border-white/80 dark:border-white/10 rounded-xl shadow-lg px-4 py-2 hover:scale-105 transition"
        >
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-1.5 rounded-lg shadow-md">
            <Leaf className="h-4 w-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xs text-foreground leading-tight tracking-tight">
              Eco Move
            </span>
            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] leading-tight">
              Nagpur
            </span>
          </div>
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-md my-8">
        <div className="bg-white/95 dark:bg-card/95 backdrop-blur-2xl rounded-3xl shadow-2xl p-6 sm:p-8 border border-white/80 dark:border-white/10">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center mx-auto mb-3 text-primary">
              <Mail className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Reset Password</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Enter your email and we'll send you a password reset link
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isSuccess ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Reset Link Sent!</h3>
              <p className="text-sm text-muted-foreground">
                We've sent a password reset link to <strong className="text-foreground">{email}</strong>.
                Please check your inbox.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl shadow-md hover:bg-primary/90 transition"
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background/50 focus:bg-background focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-500/25 transition duration-200 flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending Link...
                  </>
                ) : (
                  <>
                    Send Reset Link
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <div className="pt-3 text-center">
                <Link to="/login" className="text-sm font-semibold text-primary hover:underline">
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
