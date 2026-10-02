import React, { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, Leaf, Phone, CheckCircle2, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { z } from "zod";

const loginSearchSchema = z.object({
  registered: z.string().optional(),
  email: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: (search) => loginSearchSchema.parse(search),
  component: LoginComponent,
});

function LoginComponent() {
  const { signInWithEmail, signInWithPhone, signInWithGoogle, loginAsDemoUser, resendSignupOtp } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState(search.email ?? "");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendStatus, setResendStatus] = useState("");
  const [isResending, setIsResending] = useState(false);

  const handleResendVerification = async () => {
    if (!email.trim()) return;
    setIsResending(true);
    setResendStatus("");
    try {
      const res = await resendSignupOtp(email.trim());
      if (res && typeof res === "object" && "error" in res && res.error) {
        throw res.error;
      }
      setResendStatus("Verification email sent! Please check your inbox and spam folder.");
    } catch {
      setResendStatus("Could not resend email. Please try again later.");
    } finally {
      setIsResending(false);
    }
  };

  const handleDirectDemoLogin = () => {
    setIsLoading(true);
    setError("");
    try {
      loginAsDemoUser();
      navigate({ to: "/app" });
    } catch {
      setError("Demo login error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    const contact = loginMethod === "email" ? email : mobile;
    if (!contact || !password) {
      setError("Please fill in all fields.");
      setIsLoading(false);
      return;
    }

    try {
      let result: { error?: { message?: string } } | null | unknown;
      if (loginMethod === "email") {
        result = await signInWithEmail(email.trim(), password);
      } else {
        result = await signInWithPhone(mobile.trim(), password);
      }

      if (result && typeof result === "object" && "error" in result && result.error) {
        throw result.error;
      }

      navigate({ to: "/app" });
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String(err.message) : undefined;
      setError(msg || "Login failed. Please check your credentials or use 1-Click Demo Sign In.");
    } finally {
      setIsLoading(false);
    }
  };

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  })();

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
          
          {/* Success Banner if redirected from Sign Up */}
          {search.registered === "true" && (
            <div className="mb-5 p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-800 dark:text-emerald-300 text-sm flex items-start gap-2.5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-xs uppercase tracking-wide">Account Created Successfully!</p>
                <p className="text-xs mt-0.5 text-emerald-700/90 dark:text-emerald-400/90 leading-relaxed">
                  Please enter your password below to sign in to your new account.
                </p>
              </div>
            </div>
          )}

          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 text-xs font-semibold mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {greeting}
            </div>
            <h2 className="text-2xl font-bold text-foreground">Welcome Back</h2>
            <p className="text-muted-foreground text-sm mt-1">Sign in to your Eco Move account</p>
          </div>

          {/* ⚡ 1-Click Sign In Button */}
          <button
            type="button"
            onClick={handleDirectDemoLogin}
            disabled={isLoading}
            className="w-full mb-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-2.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer text-sm"
            title="Sign in immediately in 1 click"
          >
            <Sparkles className="h-4 w-4 text-amber-100 animate-pulse" />
            <span>1-Click Sign In</span>
            <span className="text-[11px] font-semibold bg-white/20 px-2 py-0.5 rounded-full text-white">⚡ Instant</span>
          </button>

          {error && (
            <div className="mb-5 p-3.5 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm space-y-2">
              <p>{error}</p>
              {error.toLowerCase().includes("not confirmed") && (
                <div className="pt-2 border-t border-destructive/20 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Haven't verified yet?</span>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={isResending || !email.trim()}
                    className="text-xs font-bold text-primary hover:underline cursor-pointer disabled:opacity-50"
                  >
                    {isResending ? "Resending..." : "Resend Verification Link"}
                  </button>
                </div>
              )}
            </div>
          )}

          {resendStatus && (
            <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span>{resendStatus}</span>
            </div>
          )}

          {/* Google OAuth Sign In Button */}
          <button
            type="button"
            onClick={async () => {
              setIsLoading(true);
              setError("");
              try {
                const result = await signInWithGoogle();
                if (result && typeof result === "object" && "error" in result && result.error) {
                  throw result.error;
                }
              } catch (err) {
                const msg = err && typeof err === "object" && "message" in err ? String(err.message) : undefined;
                setError(msg || "Failed to sign in with Google.");
                setIsLoading(false);
              }
            }}
            className="w-full bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-accent/40 text-foreground font-semibold py-2.5 px-4 rounded-xl border border-input shadow-sm transition flex items-center justify-center gap-2.5 cursor-pointer text-sm mb-4"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white/95 dark:bg-card/95 px-2 text-muted-foreground font-medium text-[10px]">
                Or continue with credentials
              </span>
            </div>
          </div>

          {/* Toggle Login Method */}
          <div className="grid grid-cols-2 gap-2 bg-muted/60 p-1 rounded-2xl mb-4 border border-border">
            <button
              type="button"
              onClick={() => {
                setLoginMethod("email");
                setError("");
              }}
              className={`py-2 text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2 ${
                loginMethod === "email"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mail className="h-4 w-4" />
              Email
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMethod("phone");
                setError("");
              }}
              className={`py-2 text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2 ${
                loginMethod === "phone"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Phone className="h-4 w-4" />
              Mobile
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {loginMethod === "email" ? (
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
            ) : (
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                  Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background/50 focus:bg-background focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-input bg-background/50 focus:bg-background focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-500/25 transition duration-200 flex items-center justify-center gap-2 mt-2 disabled:opacity-70 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="font-semibold text-primary hover:underline">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}