import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  X,
  CreditCard,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Smartphone,
  Sparkles,
  Leaf,
  IndianRupee,
  Building2,
  Zap,
  Lock,
  Clock,
  RefreshCw,
} from "lucide-react";
import {
  type PaymentMethod,
  generateTransactionRef,
} from "@/lib/ticketing";

interface DummyPaymentModalProps {
  finalAmount: number;
  discountSaved: number;
  passengerCount: number;
  itemTitle: string;
  source: string;
  destination: string;
  onPaymentSuccess: (method: PaymentMethod, txnRef: string) => void;
  onCancel: () => void;
}

export default function DummyPaymentModal({
  finalAmount,
  discountSaved,
  passengerCount,
  itemTitle,
  source,
  destination,
  onPaymentSuccess,
  onCancel,
}: DummyPaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("upi");
  const [upiIdInput, setUpiIdInput] = useState("nagpur.commuter@okaxis");
  const [isProcessing, setIsProcessing] = useState(false);
  const [mahaCardBalance] = useState(240);

  // Locked / Unlocked QR State & 4-Minute Timer
  const [isQrUnlocked, setIsQrUnlocked] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [qrTimeLeft, setQrTimeLeft] = useState(240); // 4 minutes = 240 seconds

  // Generate Real UPI Payment QR Code
  useEffect(() => {
    const upiPayload = `upi://pay?pa=nagpur.transit@sbi&pn=EcoMove%20Nagpur&am=${finalAmount}&cu=INR&tn=EcoMove%20Transit%20Ticket%20${encodeURIComponent(
      source
    )}%20to%20${encodeURIComponent(destination)}`;

    QRCode.toDataURL(upiPayload, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("UPI QR Generation Error:", err));
  }, [finalAmount, source, destination]);

  // 4-Minute Countdown Timer
  useEffect(() => {
    if (!isQrUnlocked || qrTimeLeft <= 0) return;
    const interval = setInterval(() => {
      setQrTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isQrUnlocked, qrTimeLeft]);

  const handleProcessPayment = (method: PaymentMethod = selectedMethod) => {
    setIsProcessing(true);

    // Simulate realistic 1.6 second gateway authorization
    setTimeout(() => {
      const txnRef = generateTransactionRef();
      setIsProcessing(false);
      onPaymentSuccess(method, txnRef);
    }, 1600);
  };

  return (
    <div className="fixed inset-0 z-[1150] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-border/80 bg-card shadow-2xl shadow-black/40">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-primary/10 via-card to-card px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <CreditCard className="size-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Checkout</h2>
            </div>
          </div>

          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="rounded-xl p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-40"
            title="Cancel payment"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Journey & Bill Summary */}
          <div className="rounded-2xl border border-border/80 bg-secondary/30 p-4 space-y-2.5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-primary">
                  {itemTitle}
                </span>
                <h4 className="text-xs font-bold text-foreground">
                  {source} ➔ {destination}
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  {passengerCount} Passenger{passengerCount > 1 ? "s" : ""}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Total Payable</span>
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-tight">
                  ₹{finalAmount}
                </p>
              </div>
            </div>

            {discountSaved > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                <span className="flex items-center gap-1">
                  <Leaf className="size-3.5 text-emerald-600" /> Eco-Move Special Discount
                </span>
                <span>Saved ₹{discountSaved}</span>
              </div>
            )}
          </div>

          {/* Payment Method Tabs */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-foreground">Choose Payment Method</span>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSelectedMethod("upi")}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition cursor-pointer ${
                  selectedMethod === "upi"
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Smartphone className="size-5" />
                <span className="text-[11px]">UPI / QR</span>
              </button>

              <button
                onClick={() => setSelectedMethod("mahacard")}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition cursor-pointer ${
                  selectedMethod === "mahacard"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 font-bold shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary"
                }`}
              >
                <CreditCard className="size-5" />
                <span className="text-[11px]">MahaCard</span>
              </button>

              <button
                onClick={() => setSelectedMethod("card")}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition cursor-pointer ${
                  selectedMethod === "card"
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Building2 className="size-5" />
                <span className="text-[11px]">Cards / Net Banking</span>
              </button>
            </div>
          </div>

          {/* Payment Method Details */}
          {selectedMethod === "upi" && (
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Scan QR code or enter your UPI ID</span>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Fastest
                </span>
              </div>

              {/* Locked / Open QR Code Display Card */}
              <div className="flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-secondary/15 p-4 shadow-inner text-center">
                {!isQrUnlocked ? (
                  <div
                    onClick={() => {
                      setIsQrUnlocked(true);
                      setQrTimeLeft(240);
                    }}
                    className="relative flex size-44 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-primary/40 bg-card/60 p-3 transition hover:border-primary hover:bg-primary/5 active:scale-98 group shadow-sm"
                  >
                    {/* Background blurred QR silhouette */}
                    {qrDataUrl && (
                      <img
                        src={qrDataUrl}
                        alt="QR Code Preview"
                        className="absolute inset-0 size-full object-contain filter blur-md opacity-20 scale-110 pointer-events-none"
                      />
                    )}

                    {/* Center Lock Badge */}
                    <div className="relative z-10 flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform">
                      <Lock className="size-5" />
                    </div>

                    <div className="relative z-10 mt-2.5 text-center">
                      <span className="mt-1 inline-block rounded-full bg-primary/15 text-primary text-[10px] font-bold px-2 py-0.5">
                        Tap to Open QR
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="relative flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200">
                    {/* Real Open QR Code Container */}
                    <div className="relative flex size-44 items-center justify-center overflow-hidden rounded-2xl border border-border bg-white p-2.5 shadow-md">
                      {qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt="Scan UPI QR Code"
                          className="size-full object-contain"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-xs text-muted-foreground animate-pulse">
                          Generating UPI QR...
                        </div>
                      )}
                    </div>

                    {/* Merchant & 4-Minute Countdown Timer */}
                    <div className="mt-2.5 text-center space-y-0.5">
                      <p className="text-[11px] font-semibold text-muted-foreground flex items-center justify-center gap-1">
                        <Clock className="size-3 text-primary" />
                        <span>Complete this action within</span>
                        <span
                          className={`font-mono font-bold ml-0.5 ${
                            qrTimeLeft < 60
                              ? "text-rose-600 animate-pulse"
                              : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {Math.floor(qrTimeLeft / 60)}:{String(qrTimeLeft % 60).padStart(2, "0")}
                        </span>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Instructions & Supported UPI Apps */}
              <div className="space-y-1.5">
                <p className="text-[11px] text-muted-foreground">
                  Scan this QR code using any of the <strong>50+ UPI apps</strong>.
                </p>

                {/* UPI Brand Logos / Badges */}
                <div className="grid grid-cols-5 gap-1.5 py-1">
                  {/* Amazon Pay (Official Wikimedia Commons SVG) */}
                  <div className="flex h-7 items-center justify-center rounded-lg border border-border bg-card px-1.5 shadow-2xs">
                    <svg viewBox="0 0 176.515 33.863" className="h-3.5 w-auto max-w-full" fill="none">
                      {/* Orange Smile Arc */}
                      <path d="M 69.652 26.489 C 63.129 31.303 53.672 33.863 45.528 33.863 C 34.115 33.863 23.837 29.644 16.059 22.621 C 15.449 22.069 15.993 21.316 16.727 21.743 C 25.118 26.626 35.496 29.567 46.213 29.567 C 53.443 29.567 61.391 28.066 68.704 24.964 C 69.807 24.497 70.732 25.691 69.652 26.489 Z" fill="#F79C34" fillRule="evenodd"/>
                      {/* Orange Arrowhead */}
                      <path d="M 72.367 23.389 C 71.532 22.321 66.852 22.883 64.749 23.135 C 64.112 23.212 64.013 22.655 64.587 22.252 C 68.321 19.629 74.44 20.386 75.151 21.265 C 75.867 22.15 74.962 28.285 71.464 31.212 C 70.925 31.662 70.413 31.422 70.652 30.828 C 71.44 28.861 73.202 24.459 72.367 23.389 Z" fill="#F79C34" fillRule="evenodd"/>
                      {/* amazon pay letterforms */}
                      <path d="M 64.897 3.724 L 64.897 1.176 C 64.899 0.788 65.191 0.53 65.543 0.531 L 76.965 0.53 C 77.33 0.53 77.624 0.795 77.624 1.173 L 77.624 3.358 C 77.62 3.725 77.311 4.203 76.764 4.962 L 70.847 13.41 C 73.043 13.359 75.366 13.688 77.362 14.809 C 77.812 15.062 77.933 15.437 77.968 15.804 L 77.968 18.523 C 77.968 18.898 77.558 19.331 77.126 19.106 C 73.611 17.264 68.946 17.063 65.058 19.128 C 64.661 19.34 64.246 18.912 64.246 18.537 L 64.246 15.952 C 64.246 15.539 64.254 14.831 64.671 14.201 L 71.525 4.367 L 65.557 4.366 C 65.192 4.366 64.899 4.106 64.897 3.724 Z" fill="currentColor" fillRule="evenodd"/>
                      <path d="M 23.233 19.641 L 19.758 19.641 C 19.427 19.62 19.163 19.372 19.136 19.054 L 19.139 1.219 C 19.139 0.863 19.439 0.578 19.81 0.578 L 23.046 0.577 C 23.384 0.594 23.656 0.85 23.677 1.176 L 23.677 3.504 L 23.743 3.504 C 24.586 1.252 26.175 0.201 28.316 0.201 C 30.489 0.201 31.852 1.252 32.825 3.504 C 33.668 1.252 35.582 0.201 37.625 0.201 C 39.085 0.201 40.674 0.802 41.647 2.153 C 42.75 3.655 42.524 5.831 42.524 7.745 L 42.52 19 C 42.52 19.355 42.221 19.641 41.85 19.641 L 38.38 19.641 C 38.03 19.619 37.756 19.343 37.756 19.001 L 37.755 9.546 C 37.755 8.796 37.82 6.92 37.657 6.207 C 37.398 5.005 36.62 4.667 35.615 4.667 C 34.771 4.667 33.895 5.23 33.538 6.13 C 33.181 7.032 33.214 8.532 33.214 9.546 L 33.214 19 C 33.214 19.355 32.914 19.641 32.544 19.641 L 29.073 19.641 C 28.724 19.619 28.449 19.343 28.449 19.001 L 28.445 9.546 C 28.445 7.557 28.77 4.631 26.305 4.631 C 23.807 4.631 23.905 7.482 23.905 9.546 L 23.903 19 C 23.903 19.355 23.603 19.641 23.233 19.641 Z" fill="currentColor" fillRule="evenodd"/>
                      <path d="M 87.488 3.842 C 84.926 3.842 84.764 7.331 84.764 9.508 C 84.764 11.685 84.732 16.339 87.457 16.339 C 90.149 16.339 90.279 12.586 90.279 10.297 C 90.279 8.796 90.213 6.994 89.759 5.568 C 89.37 4.329 88.591 3.842 87.488 3.842 Z M 87.457 0.201 C 92.614 0.201 95.403 4.631 95.403 10.26 C 95.403 15.7 92.322 20.017 87.457 20.017 C 82.396 20.017 79.639 15.588 79.639 10.072 C 79.639 4.517 82.428 0.201 87.457 0.201 Z" fill="currentColor" fillRule="evenodd"/>
                      <path d="M 102.092 19.641 L 98.629 19.641 C 98.282 19.619 98.006 19.343 98.006 19.001 L 98 1.16 C 98.03 0.833 98.318 0.578 98.668 0.578 L 101.891 0.577 C 102.195 0.593 102.445 0.799 102.509 1.076 L 102.509 3.804 L 102.574 3.804 C 103.548 1.364 104.909 0.201 107.309 0.201 C 108.866 0.201 110.391 0.764 111.364 2.303 C 112.272 3.729 112.272 6.13 112.272 7.857 L 112.272 19.08 C 112.234 19.396 111.95 19.641 111.606 19.641 L 108.123 19.641 C 107.801 19.621 107.542 19.384 107.504 19.08 L 107.504 9.397 C 107.504 7.445 107.732 4.592 105.331 4.592 C 104.488 4.592 103.709 5.155 103.32 6.018 C 102.833 7.107 102.768 8.195 102.768 9.397 L 102.768 19 C 102.762 19.355 102.462 19.641 102.092 19.641 Z" fill="currentColor" fillRule="evenodd"/>
                      <path d="M 59.294 19.597 C 59.065 19.803 58.734 19.817 58.474 19.678 C 57.32 18.719 57.113 18.276 56.482 17.362 C 54.575 19.305 53.224 19.888 50.753 19.888 C 47.828 19.888 45.552 18.082 45.552 14.472 C 45.552 11.651 47.081 9.733 49.258 8.793 C 51.143 7.965 53.776 7.815 55.792 7.589 L 55.792 7.138 C 55.792 6.309 55.857 5.333 55.369 4.618 C 54.946 3.978 54.134 3.715 53.419 3.715 C 52.093 3.715 50.916 4.394 50.626 5.801 C 50.565 6.114 50.337 6.425 50.023 6.441 L 46.654 6.076 C 46.37 6.011 46.054 5.783 46.135 5.349 C 46.9 1.32 50.498 0.064 53.768 0.03 L 54.026 0.03 C 55.7 0.051 57.838 0.51 59.14 1.759 C 60.831 3.339 60.667 5.445 60.667 7.74 L 60.667 13.153 C 60.667 14.782 61.344 15.496 61.979 16.373 C 62.202 16.69 62.251 17.065 61.968 17.297 C 61.258 17.892 59.997 18.987 59.304 19.605 L 59.294 19.597 Z M 55.792 11.125 C 55.792 12.479 55.824 13.607 55.142 14.811 C 54.589 15.788 53.711 16.39 52.736 16.39 C 51.404 16.39 50.624 15.375 50.624 13.87 C 50.624 10.91 53.278 10.372 55.792 10.372 L 55.792 11.125 Z" fill="currentColor" fillRule="evenodd"/>
                      <path d="M 13.743 19.597 C 13.513 19.803 13.181 19.817 12.922 19.678 C 11.767 18.719 11.56 18.276 10.93 17.362 C 9.022 19.305 7.672 19.888 5.201 19.888 C 2.276 19.888 0 18.082 0 14.472 C 0 11.651 1.527 9.733 3.706 8.793 C 5.591 7.965 8.224 7.815 10.239 7.589 L 10.239 7.138 C 10.239 6.309 10.305 5.333 9.817 4.618 C 9.394 3.978 8.581 3.715 7.867 3.715 C 6.541 3.715 5.362 4.394 5.074 5.801 C 5.014 6.114 4.785 6.425 4.47 6.441 L 1.102 6.076 C 0.817 6.011 0.501 5.783 0.583 5.349 C 1.346 1.32 4.945 0.064 8.216 0.03 L 8.474 0.03 C 10.148 0.051 12.286 0.51 13.588 1.759 C 15.278 3.339 15.115 5.445 15.115 7.74 L 15.115 13.153 C 15.115 14.782 15.792 15.496 16.427 16.373 C 16.648 16.69 16.699 17.065 16.416 17.297 C 15.706 17.892 14.444 18.987 13.751 19.605 L 13.743 19.597 Z M 10.239 11.125 C 10.239 12.479 10.272 13.607 9.589 14.811 C 9.037 15.788 8.159 16.39 7.183 16.39 C 5.851 16.39 5.071 15.375 5.071 13.87 C 5.071 10.91 7.726 10.372 10.239 10.372 L 10.239 11.125 Z" fill="currentColor" fillRule="evenodd"/>
                      <path d="M 159.773 26.039 C 159.773 25.587 159.773 25.181 159.773 24.729 C 159.773 24.356 159.956 24.099 160.345 24.122 C 161.071 24.225 162.098 24.328 162.827 24.178 C 163.779 23.98 164.462 23.305 164.866 22.38 C 165.435 21.078 165.812 20.028 166.05 19.339 L 158.821 1.431 C 158.699 1.127 158.663 0.563 159.27 0.563 L 161.797 0.563 C 162.279 0.563 162.475 0.869 162.583 1.169 L 167.824 15.715 L 172.827 1.169 C 172.929 0.871 173.134 0.563 173.612 0.563 L 175.995 0.563 C 176.598 0.563 176.564 1.126 176.444 1.431 L 169.273 19.898 C 168.345 22.356 167.109 26.271 164.325 26.951 C 162.929 27.316 161.168 27.184 160.134 26.751 C 159.873 26.62 159.773 26.27 159.773 26.039 Z" fill="currentColor" fillRule="evenodd"/>
                      <path d="M 156.402 18.55 C 156.402 18.883 156.129 19.156 155.794 19.156 L 154.012 19.156 C 153.627 19.156 153.364 18.878 153.315 18.55 L 153.136 17.337 C 152.317 18.03 151.312 18.639 150.222 19.063 C 148.126 19.877 145.71 20.012 143.662 18.754 C 142.181 17.845 141.395 16.068 141.395 14.235 C 141.395 12.817 141.832 11.411 142.801 10.39 C 144.094 8.995 145.968 8.31 148.231 8.31 C 149.598 8.31 151.554 8.471 152.977 8.936 L 152.977 6.495 C 152.977 4.013 151.932 2.939 149.177 2.939 C 147.071 2.939 145.46 3.257 143.218 3.954 C 142.859 3.966 142.649 3.693 142.649 3.36 L 142.649 1.968 C 142.649 1.634 142.934 1.311 143.243 1.213 C 144.844 0.515 147.112 0.08 149.523 0 C 152.666 0 156.402 0.709 156.402 5.543 L 156.402 18.55 Z M 152.977 14.986 L 152.977 11.303 C 151.781 10.976 149.802 10.84 149.036 10.84 C 147.826 10.84 146.501 11.126 145.809 11.871 C 145.292 12.417 145.058 13.201 145.058 13.959 C 145.058 14.939 145.397 15.922 146.189 16.408 C 147.109 17.033 148.536 16.957 149.877 16.576 C 151.166 16.21 152.376 15.563 152.977 14.986 Z" fill="currentColor" fillRule="evenodd"/>
                      <path d="M 130.127 2.994 C 134.081 2.994 135.158 6.103 135.158 9.663 C 135.18 12.063 134.739 14.203 133.496 15.428 C 132.566 16.345 131.527 16.595 129.963 16.595 C 128.571 16.595 126.74 15.869 125.372 14.858 L 125.372 4.679 C 126.796 3.585 128.613 2.994 130.127 2.994 Z M 124.766 26.678 L 122.379 26.678 C 122.045 26.678 121.772 26.405 121.772 26.072 C 121.772 17.782 121.772 9.491 121.772 1.201 C 121.772 0.868 122.045 0.595 122.379 0.595 L 124.206 0.595 C 124.59 0.595 124.853 0.873 124.902 1.201 L 125.094 2.504 C 126.805 0.985 129.008 0.011 131.107 0.011 C 136.986 0.011 138.919 4.855 138.919 9.892 C 138.919 15.281 135.962 19.611 130.961 19.611 C 128.855 19.611 126.886 18.834 125.372 17.484 L 125.372 26.072 C 125.372 26.405 125.099 26.678 124.766 26.678 Z" fill="currentColor" fillRule="evenodd"/>
                    </svg>
                  </div>

                  {/* BHIM UPI (Official Wikimedia Commons SVG) */}
                  <div className="flex h-7 items-center justify-center rounded-lg border border-border bg-card px-1.5 shadow-2xs">
                    <svg viewBox="0 0 32.17 7.96" className="h-3.5 w-auto max-w-full" fill="none">
                      {/* Saffron & Green Official Arrows */}
                      <path d="m0 0 4.462-8.881-9.392-8.88z" fill="#f47920" transform="matrix(.35277777 0 0 -.35277777 29.48358 .009974)"/>
                      <path d="m0 0 4.466-8.881-9.388-8.88z" fill="#008c44" transform="matrix(.35277777 0 0 -.35277777 30.587739 .009974)"/>
                      {/* BHIM Main Letters */}
                      <path d="m0 0c-.343-.722-1.036-1.245-1.863-1.35h-.612-12l1.015 3.632h9.259 2.856.618c.464-.115.828-.482.934-.947.014-.105.023-.21.023-.319 0-.055-.003-.11-.008-.164-.001-.023-.001-.045-.003-.068zm-11.478 9.387h9.25 2.897.61c.35-.086.643-.314.813-.619.062-.214.097-.439.097-.671 0-.126-.012-.247-.031-.368l-.033-.116-.123-.444c-.328-.773-1.052-1.336-1.918-1.441h-.588-11.995zm13.288-13.678c.438.337.727.754.866 1.251l1.485 5.322c.136.484.076.89-.177 1.218s-.627.492-1.121.492c.494 0 .961.168 1.401.505.437.337.725.747.86 1.231l1.483 5.315c.145.517.096.943-.145 1.282-.241.338-.618.508-1.131.508h-19.37l-4.922-17.63h19.371c.494 0 .961.169 1.4.506" fill="currentColor" transform="matrix(.35277777 0 0 -.35277777 7.06808 4.555754)"/>
                      <path d="m0 0-1.947-7.081h-13.974l1.948 7.081h-3.474l-4.835-17.57h3.475l1.941 7.05h13.972l-1.939-7.05h3.475l4.834 17.57z" fill="currentColor" transform="matrix(.35277777 0 0 -.35277777 16.557589 .034104)"/>
                      <path d="m0 0h-3.498l4.864 17.566h3.497z" fill="currentColor" transform="matrix(.35277777 0 0 -.35277777 18.140289 6.252135)"/>
                      <path d="m0 0-14.513-12.3-5.062 8.413-2.34 3.887h-.063l-1.102-3.992-3.732-13.523h3.475l2.616 9.479 5.543-9.502 9.176 8.41-2.301-8.387h3.476l3.391 12.293 1.442 5.222z" fill="currentColor" transform="matrix(.35277777 0 0 -.35277777 28.43664 .049594)"/>
                      {/* Subtitle: Bharat Interface for Money */}
                      <g fill="currentColor" opacity="0.85">
                        <path d="m0 0h.171c.213 0 .371.028.473.083.101.055.168.147.199.277.034.143.016.243-.051.3-.068.058-.216.086-.442.086h-.171zm-.274-1.148h.154c.156 0 .274.005.355.017.08.012.147.032.2.063.063.034.117.081.161.138.044.058.074.121.091.192.019.083.018.155-.003.217-.022.061-.062.109-.122.143-.038.021-.083.035-.135.045-.053.009-.123.014-.214.014h-.135-.154zm-.524-.354.622 2.6h.695c.197 0 .341-.01.431-.031.09-.019.162-.053.218-.099.071-.059.119-.137.143-.233.024-.095.022-.202-.005-.317-.035-.139-.095-.255-.185-.348-.091-.092-.204-.157-.342-.194.155-.023.265-.093.329-.207.065-.114.077-.258.035-.432-.025-.105-.069-.206-.13-.299-.062-.096-.136-.176-.224-.243-.092-.072-.197-.123-.316-.153-.119-.029-.31-.044-.573-.044z" transform="matrix(.35277777 0 0 -.35277777 .287798 7.385575)"/>
                        <path d="m0 0 .622 2.6h.447l-.229-.959h1.353l.23.959h.448l-.622-2.6h-.448l.303 1.263h-1.355l-.302-1.263z" transform="matrix(.35277777 0 0 -.35277777 1.199688 7.915445)"/>
                        <path d="m0 0h.768l-.14.593c-.008.038-.014.081-.02.131-.005.048-.01.103-.013.164-.03-.057-.057-.111-.086-.159-.029-.049-.057-.095-.084-.136zm.993-1.021-.151.669h-1.091l-.48-.669h-.47l1.98 2.702.685-2.702z" transform="matrix(.35277777 0 0 -.35277777 2.917079 7.555085)"/>
                        <path d="m0 0h.081c.237 0 .4.025.491.077.09.053.151.146.183.277.034.144.016.245-.053.303-.069.059-.217.088-.442.088h-.081zm-.106-.329-.279-1.163h-.419l.622 2.599h.624c.183 0 .323-.011.418-.033.096-.022.173-.06.232-.112.07-.063.117-.145.139-.243.023-.1.02-.208-.008-.327-.05-.208-.143-.371-.278-.49-.134-.117-.308-.188-.522-.212l.665-1.182h-.506l-.638 1.163z" transform="matrix(.35277777 0 0 -.35277777 4.219679 7.389025)"/>
                        <path d="m0 0h.768l-.14.593c-.008.038-.015.081-.02.131-.005.048-.01.103-.013.164-.03-.057-.058-.111-.086-.159-.03-.049-.058-.095-.084-.136zm.993-1.021-.151.669h-1.091l-.48-.669h-.47l1.98 2.702.684-2.702z" transform="matrix(.35277777 0 0 -.35277777 5.398239 7.555085)"/>
                        <path d="m0 0-.537-2.241h-.447l.536 2.241h-.732l.086.358h1.907l-.085-.358z" transform="matrix(.35277777 0 0 -.35277777 6.845859 7.124785)"/>
                        <path d="m0 0 .622 2.6h.447l-.622-2.6z" transform="matrix(.35277777 0 0 -.35277777 8.267309 7.915445)"/>
                        <path d="m0 0 .646 2.702 1.369-1.589c.037-.045.074-.092.11-.143.037-.051.074-.109.113-.172l.431 1.802h.414l-.646-2.701-1.397 1.618c-.038.044-.072.089-.105.138-.034.049-.064.1-.091.153l-.433-1.808z" transform="matrix(.35277777 0 0 -.35277777 9.062437 7.915445)"/>
                        <path d="m0 0-.536-2.241h-.447l.536 2.241h-.732l.086.358h1.906l-.084-.358z" transform="matrix(.35277777 0 0 -.35277777 11.066818 7.124785)"/>
                        <path d="m0 0 .622 2.6h1.536l-.086-.359h-1.089l-.156-.652h1.089l-.089-.371h-1.089l-.201-.84h1.089l-.09-.378z" transform="matrix(.35277777 0 0 -.35277777 11.665549 7.915445)"/>
                        <path d="m0 0h.081c.237 0 .4.025.491.077.09.053.151.146.183.277.034.144.016.245-.053.303-.069.059-.217.088-.442.088h-.081zm-.106-.329-.279-1.163h-.419l.622 2.599h.624c.183 0 .323-.011.418-.033.096-.022.173-.06.232-.112.07-.063.117-.145.139-.243.023-.1.02-.208-.008-.327-.05-.208-.143-.371-.278-.49-.134-.117-.308-.188-.522-.212l.665-1.182h-.506l-.638 1.163z" transform="matrix(.35277777 0 0 -.35277777 13.082519 7.389025)"/>
                        <path d="m0 0 .622 2.6h1.536l-.086-.359h-1.089l-.154-.648h1.089l-.089-.371h-1.089l-.293-1.222z" transform="matrix(.35277777 0 0 -.35277777 13.969998 7.915445)"/>
                        <path d="m0 0h.767l-.14.593c-.008.038-.014.081-.02.131-.005.048-.01.103-.013.164-.029-.057-.057-.111-.086-.159-.029-.049-.057-.095-.084-.136zm.993-1.021-.152.669h-1.091l-.479-.669h-.471l1.98 2.702.685-2.702z" transform="matrix(.35277777 0 0 -.35277777 15.336309 7.555085)"/>
                        <path d="m0 0c-.103.102-.218.178-.347.229-.129.05-.27.077-.425.077-.301 0-.569-.092-.801-.275-.232-.181-.383-.418-.452-.708-.068-.28-.031-.511.109-.694s.35-.274.63-.274c.162 0 .324.028.484.083.16.054.322.136.484.247l-.115-.479c-.14-.081-.286-.143-.437-.183s-.31-.06-.475-.06c-.211 0-.397.033-.56.098s-.297.161-.403.288c-.104.124-.171.27-.204.439-.031.168-.024.349.021.539.046.191.125.369.237.537.112.167.252.315.419.442s.347.223.539.29c.192.065.392.098.598.098.161 0 .31-.022.446-.067.136-.044.262-.111.379-.201z" transform="matrix(.35277777 0 0 -.35277777 17.276589 7.221245)"/>
                        <path d="m0 0 .622 2.6h1.536l-.086-.359h-1.089l-.155-.652h1.089l-.089-.371h-1.089l-.201-.84h1.089l-.091-.378z" transform="matrix(.35277777 0 0 -.35277777 17.716538 7.915445)"/>
                        <path d="m0 0 .622 2.6h1.536l-.086-.359h-1.089l-.155-.648h1.089l-.089-.371h-1.089l-.292-1.222z" transform="matrix(.35277777 0 0 -.35277777 19.670248 7.915445)"/>
                        <path d="m0 0c.032.131.036.256.014.374-.023.118-.07.224-.143.316-.071.091-.162.162-.272.21-.111.049-.234.075-.37.075-.134 0-.269-.025-.403-.074-.134-.048-.26-.118-.377-.211-.117-.09-.215-.196-.294-.314-.078-.118-.133-.244-.165-.376-.031-.132-.036-.256-.013-.373.022-.117.069-.222.142-.314s.165-.164.275-.211c.11-.049.233-.074.37-.074.134 0 .267.025.4.074.133.047.258.119.377.211.117.092.216.197.294.315.079.117.135.241.165.372m.467 0c-.044-.185-.122-.359-.236-.524-.112-.164-.254-.311-.425-.44-.173-.13-.357-.228-.551-.297-.194-.068-.39-.103-.585-.103-.198 0-.379.035-.542.104-.163.07-.299.168-.406.296-.11.129-.181.275-.215.438-.033.164-.028.339.017.526.044.186.122.36.235.525.112.165.254.312.426.443.17.129.353.226.547.294.195.068.391.101.59.101s.378-.033.54-.101c.161-.068.296-.165.406-.294.109-.132.18-.281.214-.446s.029-.338-.015-.522" transform="matrix(.35277777 0 0 -.35277777 21.73386 7.458635)"/>
                        <path d="m0 0h.081c.236 0 .4.025.49.077.09.053.152.146.183.277.034.144.017.245-.053.303-.069.059-.217.088-.442.088h-.081zm-.107-.329-.279-1.163h-.419l.622 2.599h.624c.183 0 .323-.011.418-.033.096-.022.173-.06.233-.112.069-.063.116-.145.138-.243.023-.1.02-.208-.008-.327-.05-.208-.143-.371-.277-.49-.134-.117-.309-.188-.523-.212l.665-1.182h-.506l-.638 1.163z" transform="matrix(.35277777 0 0 -.35277777 22.664699 7.389025)"/>
                        <path d="m0 0c0 .02.005.075.016.167.007.075.014.138.018.188-.025-.059-.055-.119-.09-.177-.035-.06-.075-.12-.122-.182l-1.051-1.385-.382 1.413c-.017.059-.029.115-.037.169-.009.055-.016.109-.02.162-.014-.054-.032-.112-.055-.171-.022-.06-.049-.122-.081-.188l-.601-1.28h-.412l1.298 2.71.42-1.641c.006-.026.015-.069.027-.13.01-.06.024-.134.039-.223.045.074.108.169.192.284.023.03.039.054.051.071l1.186 1.639.017-2.71h-.415z" transform="matrix(.35277777 0 0 -.35277777 25.272649 7.462405)"/>
                        <path d="m0 0c.031.131.036.256.014.374-.023.118-.071.224-.144.316-.071.091-.162.162-.272.21-.111.049-.234.075-.369.075s-.27-.025-.404-.074c-.134-.048-.26-.118-.377-.211-.117-.09-.215-.196-.293-.314-.079-.118-.134-.244-.166-.376-.031-.132-.036-.256-.013-.373.022-.117.069-.222.143-.314.072-.092.164-.164.275-.211.109-.049.233-.074.37-.074.133 0 .266.025.399.074.133.047.258.119.377.211.117.092.216.197.295.315.079.117.134.241.165.372m.466 0c-.044-.185-.122-.359-.236-.524-.112-.164-.253-.311-.425-.44-.172-.13-.356-.228-.551-.297-.194-.068-.389-.103-.585-.103-.198 0-.379.035-.542.104-.163.07-.299.168-.405.296-.111.129-.182.275-.215.438-.034.164-.028.339.016.526.044.186.123.36.235.525s.254.312.426.443c.17.129.354.226.548.294s.391.101.59.101.378-.033.539-.101c.161-.068.297-.165.407-.294.108-.132.179-.281.213-.446.035-.165.029-.338-.015-.522" transform="matrix(.35277777 0 0 -.35277777 26.895278 7.458635)"/><path d="m0 0 .646 2.702 1.37-1.589c.036-.045.073-.092.11-.143.036-.051.074-.109.112-.172l.432 1.802h.413l-.645-2.701-1.398 1.618c-.038.044-.072.089-.105.138-.034.049-.063.1-.091.153l-.433-1.808z" transform="matrix(.35277777 0 0 -.35277777 27.54193 7.915445)"/><path d="m0 0 .622 2.6h1.536l-.086-.359h-1.089l-.156-.652h1.089l-.089-.371h-1.089l-.201-.84h1.089l-.09-.378z" transform="matrix(.35277777 0 0 -.35277777 29.043668 7.915445)"/><path d="m0 0 .285 1.19-.59 1.41h.47l.366-.882c.008-.024.019-.053.031-.089.011-.037.023-.077.035-.119.026.041.054.08.083.117.028.036.056.069.085.102l.801.871h.448l-1.285-1.41-.286-1.19z" transform="matrix(.35277777 0 0 -.35277777 30.385878 7.915445)"/>
                      </g>
                    </svg>
                  </div>

                  {/* Google Pay */}
                  <div className="flex h-7 items-center justify-center gap-1 rounded-lg border border-border bg-card px-1.5 shadow-2xs">
                    <svg viewBox="0 0 24 24" className="size-3.5 shrink-0">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.43 7.35 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.57 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                    </svg>
                    <span className="font-bold text-[10px] text-foreground">GPay</span>
                  </div>

                  {/* Paytm */}
                  <div className="flex h-7 items-center justify-center rounded-lg border border-border bg-card px-1.5 shadow-2xs">
                    <span className="font-black text-[11px] tracking-tight text-[#002e6e] dark:text-[#00b9f5]">
                      Pay<span className="text-[#00b9f5]">tm</span>
                    </span>
                  </div>

                  {/* PhonePe */}
                  <div className="flex h-7 items-center justify-center gap-1 rounded-lg border border-border bg-card px-1.5 shadow-2xs">
                    <div className="flex size-3.5 items-center justify-center rounded-full bg-[#5f259f] text-white text-[9px] font-bold shrink-0">
                      पे
                    </div>
                    <span className="font-bold text-[9px] text-[#5f259f] dark:text-purple-400">PhonePe</span>
                  </div>
                </div>
              </div>

              {/* UPI VPA / ID Entry Section */}
              <div className="pt-2 border-t border-border">
                <label className="text-[10px] text-muted-foreground font-medium">UPI VPA / ID</label>
                <input
                  type="text"
                  value={upiIdInput}
                  onChange={(e) => setUpiIdInput(e.target.value)}
                  placeholder="name@okaxis"
                  className="mt-1 w-full rounded-xl border border-border bg-secondary/30 px-3 py-2 text-xs font-mono font-medium focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          )}

          {selectedMethod === "mahacard" && (
            <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/80 via-teal-950/80 to-slate-900 p-4 text-white space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-400">
                  Maha Metro • RuPay NCMC
                </span>
                <Zap className="size-4 text-emerald-300" />
              </div>

              <div className="py-2">
                <span className="text-[10px] text-white/60">Card Number</span>
                <p className="font-mono text-sm tracking-wider font-bold">8120 •••• •••• 4912</p>
              </div>

              <div className="flex items-center justify-between border-t border-white/10 pt-2 text-xs">
                <div>
                  <span className="text-[10px] text-white/60">Card Balance</span>
                  <p className="font-bold text-emerald-300">₹{mahaCardBalance}.00</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-white/60">Deduction</span>
                  <p className="font-bold text-white">-₹{finalAmount}.00</p>
                </div>
              </div>
            </div>
          )}

          {selectedMethod === "card" && (
            <div className="rounded-2xl border border-border bg-card p-4 space-y-2.5 text-xs">
              <span className="font-bold text-foreground">Select NetBanking / Debit Card:</span>
              <div className="grid grid-cols-2 gap-2">
                {["State Bank of India", "HDFC Bank", "ICICI Bank", "Bank of Maharashtra"].map((bank) => (
                  <button
                    key={bank}
                    className="rounded-xl border border-border bg-secondary/30 p-2 text-left text-xs font-medium hover:border-primary hover:bg-secondary"
                  >
                    {bank}
                  </button>
                ))}
              </div>
            </div>
          )}

      


          {/* Pay Button */}
          <button
            onClick={() => handleProcessPayment()}
            disabled={isProcessing || (selectedMethod === "upi" && !isQrUnlocked)}
            className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 px-4 text-sm font-bold shadow-xl transition active:scale-98 cursor-pointer ${
              isProcessing || (selectedMethod === "upi" && !isQrUnlocked)
                ? "bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-60 shadow-none pointer-events-none"
                : "bg-gradient-to-r from-emerald-600 via-teal-600 to-primary text-white shadow-emerald-500/20 hover:brightness-110 active:scale-98"
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Authorizing Payment...</span>
              </>
            ) : selectedMethod === "upi" && !isQrUnlocked ? (
              <>
                <Lock className="size-4" />
                <span>Unlock QR to Pay (₹{finalAmount})</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                <span>Pay (₹{finalAmount})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
