import React, { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Lock, ArrowRight, Loader2, Leaf, AlertCircle, CheckCircle2, Circle, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Route = createFileRoute("/update-password")({
  component: UpdatePasswordComponent,
});

function UpdatePasswordComponent() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const hasMinLength = password.length >= 8;

  const criteria = [
    { label: "Uppercase letter", met: hasUppercase },
    { label: "Lowercase letter", met: hasLowercase },
    { label: "Number", met: hasNumber },
    { label: "Special character (e.g. !?<>@#$%)", met: hasSpecial },
    { label: "8 characters or more", met: hasMinLength },
  ];

  const allCriteriaMet = hasUppercase && hasLowercase && hasNumber && hasSpecial && hasMinLength;
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allCriteriaMet || !passwordsMatch) return;

    setIsLoading(true);
    setError("");

    try {
      const result = await updatePassword(password);
      if (result && typeof result === "object" && "error" in result && result.error) {
        throw result.error;
      }
      setIsSuccess(true);
      setTimeout(() => {
        navigate({ to: "/login" });
      }, 2000);
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String(err.message) : undefined;
      setError(msg || "Failed to update password.");
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
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mx-auto mb-3 text-emerald-600">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Set New Password</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Create a strong new password for your account
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
              <h3 className="text-lg font-bold text-foreground">Password Updated!</h3>
              <p className="text-sm text-muted-foreground">
                Your password has been successfully reset. Redirecting to login...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                  New Password
                </label>
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

              {/* Password Validation Checklist */}
              {password.length > 0 && (
                <div className="bg-muted/40 rounded-xl p-3 border border-border space-y-1.5">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Password Requirements:
                  </p>
                  <div className="grid grid-cols-1 gap-1">
                    {criteria.map((c, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs">
                        {c.met ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className={c.met ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-muted-foreground"}>
                          {c.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-input bg-background/50 focus:bg-background focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="text-xs text-destructive mt-1">Passwords do not match.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || !allCriteriaMet || !passwordsMatch}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-emerald-500/25 transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  <>
                    Update Password
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
