import React, { useState, useEffect, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Mail,
  Lock,
  User,
  CheckCircle2,
  Circle,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Leaf,
  Phone,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  ArrowLeft,
  Check,
  KeyRound,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Route = createFileRoute("/signup")({
  component: SignupComponent,
});

function SignupComponent() {
  const {
    signUpWithEmail,
    verifyEmailOtp,
    resendSignupOtp,
    signInWithGoogle,
    loginAsDemoUser,
    user,
  } = useAuth();
  const navigate = useNavigate();

  // Step 1: "form" | Step 2: "verify_otp" | Step 3: "verified_success"
  const [step, setStep] = useState<"form" | "verify_otp" | "verified_success">("form");

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
  const [successInfo, setSuccessInfo] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);

  // OTP State (6 digits)
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(45);
  const [isResending, setIsResending] = useState(false);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // If user clicks the email verification link in another tab or same window, auto-redirect
  useEffect(() => {
    if (user && step === "verify_otp") {
      setStep("verified_success");
      const t = setTimeout(() => {
        navigate({ to: "/app" });
      }, 1500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [user, step, navigate]);

  // Resend cooldown timer
  useEffect(() => {
    if (step !== "verify_otp" || resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, resendCooldown]);

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

  // Form Submission -> Triggers Email Verification OTP / Link
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsLoading(true);
    setError("");
    setSuccessInfo("");

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

      // Transition to OTP / Email verification screen
      setStep("verify_otp");
      setResendCooldown(45);
      setSuccessInfo(
        `Verification code sent to ${formData.email.trim()}. Please check your inbox and spam folder.`
      );

      // Auto focus first OTP input on next tick
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String(err.message) : undefined;
      setError(msg || "Registration failed. Please check your details or use Demo Account.");
    } finally {
      setIsLoading(false);
    }
  };

  // OTP Input Handlers
  const handleOtpDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, "");
    const lastChar = clean.slice(-1);

    const newDigits = [...otpDigits];
    newDigits[index] = lastChar;
    setOtpDigits(newDigits);
    setError("");

    if (lastChar && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otpDigits[index] && index > 0) {
        otpInputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasteData) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < pasteData.length; i++) {
      newDigits[i] = pasteData[i] || "";
    }
    setOtpDigits(newDigits);
    setError("");

    const focusIdx = Math.min(pasteData.length, 5);
    otpInputsRef.current[focusIdx]?.focus();
  };

  const fullOtpCode = otpDigits.join("");
  const isOtpComplete = fullOtpCode.length === 6;

  // Verify OTP Action
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isOtpComplete) return;

    setIsLoading(true);
    setError("");
    setSuccessInfo("");

    try {
      const result = await verifyEmailOtp(formData.email.trim(), fullOtpCode);

      if (result && typeof result === "object" && "error" in result && result.error) {
        throw result.error;
      }

      setStep("verified_success");
      setTimeout(() => {
        navigate({ to: "/app" });
      }, 1500);
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String(err.message) : undefined;
      setError(
        msg || "Invalid or expired verification code. Please check your inbox or resend code."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP Action
  const handleResendCode = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setError("");
    setSuccessInfo("");

    try {
      const res = await resendSignupOtp(formData.email.trim());
      if (res && typeof res === "object" && "error" in res && res.error) {
        throw res.error;
      }
      setResendCooldown(45);
      setSuccessInfo("A new verification code and link have been dispatched to your email!");
      setOtpDigits(["", "", "", "", "", ""]);
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String(err.message) : undefined;
      setError(msg || "Could not resend email. Please wait a moment and try again.");
    } finally {
      setIsResending(false);
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
          {/* ========================================================================= */}
          {/* STEP 1: INITIAL REGISTRATION FORM */}
          {/* ========================================================================= */}
          {step === "form" && (
            <>
              <div className="text-center mb-5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 text-xs font-semibold mb-3">
                  <Leaf className="h-3.5 w-3.5 text-emerald-600" />
                  Join Eco Move
                </div>
                <h2 className="text-2xl font-bold text-foreground">Create Account</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Start planning smart multimodal trips in Nagpur
                </p>
              </div>

              {/* ⚡ Quick Demo Shortcut */}
              <div className="mb-5 p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500 animate-pulse flex-shrink-0" />
                  <div className="text-[11px] leading-tight">
                    <span className="font-semibold text-amber-800 dark:text-amber-300">
                      Evaluating or testing?
                    </span>
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
                    Or register with verified email
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
                    Email Address (OTP will be sent here)
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
                  <p className="text-[10px] text-muted-foreground mt-1">
                    🔒 Verification code & link will be sent to prevent fake registrations.
                  </p>
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
                          <span
                            className={
                              c.met
                                ? "text-emerald-700 dark:text-emerald-400 font-medium"
                                : "text-muted-foreground"
                            }
                          >
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
                      Sending Verification Code...
                    </>
                  ) : (
                    <>
                      Continue & Verify Email
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
            </>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: EMAIL OTP & CONFIRMATION LINK VERIFICATION */}
          {/* ========================================================================= */}
          {step === "verify_otp" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="text-center mb-5">
                <div className="relative mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center mb-3 text-emerald-600 dark:text-emerald-400 shadow-inner">
                  <Mail className="w-7 h-7 animate-pulse" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-card flex items-center justify-center">
                    <KeyRound className="w-2.5 h-2.5 text-white" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-foreground">Verify Your Email</h2>
                <p className="text-muted-foreground text-xs mt-1">
                  We've sent a 6-digit confirmation code and verification link to:
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                  <Mail className="w-3 h-3" />
                  <span>{formData.email}</span>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successInfo && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-600" />
                  <span>{successInfo}</span>
                </div>
              )}

              {/* Action Buttons: 1-Click Open Email & Verify */}
              <div className="space-y-3">
                <a
                  href={
                    formData.email.includes("@gmail.com") || formData.email.includes("raisoni.net")
                      ? "https://mail.google.com"
                      : formData.email.includes("@outlook.com") || formData.email.includes("@hotmail.com")
                      ? "https://outlook.live.com"
                      : "https://mail.google.com"
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-emerald-500/25 transition duration-200 flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                  <span>Open Email Inbox & Click Link</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>

                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white/95 dark:bg-card/95 px-2 text-muted-foreground font-medium text-[10px]">
                      Or enter 6-digit code below
                    </span>
                  </div>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-3">
                  {/* 6-Digit OTP Input Grid */}
                  <div>
                    <div className="flex items-center justify-center gap-2 sm:gap-2.5" onPaste={handleOtpPaste}>
                      {otpDigits.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => {
                            otpInputsRef.current[index] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(index, e)}
                          className={`w-10 h-11 sm:w-11 sm:h-12 text-center text-lg font-bold rounded-xl border transition outline-none ${
                            digit
                              ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20"
                              : "border-input bg-background/50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !isOtpComplete}
                    className="w-full bg-secondary hover:bg-secondary/80 text-foreground font-semibold py-2.5 rounded-xl border border-border transition flex items-center justify-center gap-2 text-xs disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Verifying Code...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                        Verify
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Resend & Verification Link Options */}
              <div className="mt-5 pt-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Didn't receive the email?</span>
                  {resendCooldown > 0 ? (
                    <span className="font-semibold text-muted-foreground">
                      Resend in {resendCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={isResending}
                      className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {isResending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      Resend Code / Link
                    </button>
                  )}
                </div>

                {/* Go Back / Change Email */}
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("form");
                      setError("");
                      setSuccessInfo("");
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Incorrect email address? Edit details</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: VERIFIED SUCCESS CELEBRATION */}
          {/* ========================================================================= */}
          {step === "verified_success" && (
            <div className="text-center py-6 animate-in zoom-in-95 duration-300">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
                <Check className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Email Verified!</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Your account is confirmed and protected.
              </p>
              <div className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Redirecting to your Eco Move account...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}