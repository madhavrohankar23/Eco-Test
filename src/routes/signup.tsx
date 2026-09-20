import React, { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Mail, Lock, User, CheckCircle2, Circle, AlertCircle, Loader2, Eye, EyeOff, Leaf, Phone, ArrowRight, Sparkles } from "lucide-react";
import { useAuth, DEMO_CREDENTIALS } from "../context/AuthContext";

export const Route = createFileRoute("/signup")({
  component: SignupComponent,
});

function SignupComponent() {
  const { signUpWithEmail, signInWithGoogle, signOut, loginAsDemoUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuickDemoAccess = () => {
    setIsLoading(true);
    setError("");
    try {
      loginAsDemoUser();
      navigate({ to: "/app" });
    } catch {
      setError("Demo access error");
    } finally {
      setIsLoading(false);
    }
  };

  const hasUppercase = /[A-Z]/.test(formData.password);
  const hasLowercase = /[a-z]/.test(formData.password);
  const hasNumber = /[0-9]/.test(formData.password);
  const hasSpecial = /[^A-Za-z0-9]/.test(formData.password);
  const hasMinLength = formData.password.length >= 8;

  const criteria = [
    { label: "Uppercase letter", met: hasUppercase },
    { label: "Lowercase letter", met: hasLowercase },
    { label: "Number", met: hasNumber },
    { label: "Special character (e.g. !?<>@#$%)", met: hasSpecial },
    { label: "8 characters or more", met: hasMinLength },
  ];

  const allCriteriaMet = hasUppercase && hasLowercase && hasNumber && hasSpecial && hasMinLength;
  const passwordsMatch =
    formData.password.length > 0 &&
    formData.confirmPassword.length > 0 &&
    formData.password === formData.confirmPassword;

  const isFormValid =
    formData.fullName.trim().length > 0 &&
    formData.mobile.trim().length >= 10 &&
    formData.email.trim().length > 0 &&
    allCriteriaMet &&
    passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsLoading(true);
    setError("");

    try {
      const result = await signUpWithEmail(
        formData.email.trim(),
        formData.password,
        formData.fullName.trim(),
        formData.mobile.trim()
      );

      if (result && typeof result === "object" && "error" in result && result.error) {
        throw result.error;
      }

      // Explicitly sign out so the user must manually enter their credentials on the login screen
      await signOut();

      // Redirect to login with confirmation details
      navigate({
        to: "/login",
        search: { registered: "true", email: formData.email.trim() },
      });
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String(err.message) : undefined;
      setError(msg || "Registration failed. Please try again or use the Demo Account.");
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
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 text-xs font-semibold mb-3">
              <Leaf className="h-3.5 w-3.5 text-emerald-600" />
              Join Eco Move
            </div>
            <h2 className="text-2xl font-bold text-foreground">Create Account</h2>
            <p className="text-muted-foreground text-sm mt-1">Start planning smart multimodal trips</p>
          </div>

          {/* ⚡ Quick Demo Shortcut */}
          <div className="mb-5 p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500 animate-pulse flex-shrink-0" />
              <div className="text-[11px] leading-tight">
                <span className="font-semibold text-amber-800 dark:text-amber-300">Evaluating or testing?</span>
                <span className="text-muted-foreground block">Skip registration with Demo Account</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleQuickDemoAccess}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg shadow-sm transition active:scale-95 whitespace-nowrap cursor-pointer"
            >
              1-Click Demo ⚡
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Google OAuth Sign Up Button */}
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
                setError(msg || "Failed to sign up with Google.");
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
                Or register with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Rohit Sharma"
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-input bg-background/50 focus:bg-background focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition outline-none"
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                Mobile Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  type="tel"
                  name="mobile"
                  required
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-input bg-background/50 focus:bg-background focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition outline-none"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-input bg-background/50 focus:bg-background focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  value={formData.password}
                  onChange={(e) => {
                    handleChange(e);
                    setPasswordTouched(true);
                  }}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2 rounded-xl border border-input bg-background/50 focus:bg-background focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition outline-none"
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
            {passwordTouched && (
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

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2 rounded-xl border border-input bg-background/50 focus:bg-background focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formData.confirmPassword && !passwordsMatch && (
                <p className="text-xs text-destructive mt-1">Passwords do not match.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !isFormValid}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-emerald-500/25 transition duration-200 flex items-center justify-center gap-2 mt-3 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}