import React, { useState, useEffect } from "react";
import { Search, AlertTriangle, ShieldCheck, HelpCircle, MapPin, Landmark, Scan, Phone, XCircle, CheckCircle, Ban } from "lucide-react";
import { PersonalizedAssessment } from "../types";

export default function PrePaymentRiskCheck() {
  const [scannerInput, setScannerInput] = useState("");
  const [userId, setUserId] = useState(() => {
    try {
      const stored = localStorage.getItem("upi_guard_user");
      return stored ? JSON.parse(stored).id : "";
    } catch {
      return "";
    }
  });
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<PersonalizedAssessment | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  const handleScannerInput = (val: string) => {
    setScannerInput(val);
    const trimmed = val.trim();
    if (!trimmed) return;

    // Is it a UPI QR string?
    if (trimmed.toLowerCase().startsWith("upi://pay")) {
      try {
        const url = new URL(trimmed);
        const pa = url.searchParams.get("pa"); // Payee VPA
        const pn = url.searchParams.get("pn"); // Payee Name
        const am = url.searchParams.get("am"); // Amount
        
        if (pa) setUpiId(pa);
        if (pn) setMerchant(decodeURIComponent(pn));
        if (am) setAmount(am);
        return;
      } catch (e) {
        // ignore parse error
      }
    }

    // Is it a phone number?
    if (/^\d{10}$/.test(trimmed)) {
      setUpiId(`${trimmed}@upi`);
      setMerchant("Unknown Phone Contact");
      return;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim() || (!merchant.trim() && !upiId.trim()) || !amount) {
      setError("Please fill out all required fields (User ID, Merchant/UPI, Amount).");
      return;
    }

    setLoading(true);
    setError(null);
    setAssessment(null);

    const payload = {
      user_id: userId.trim(),
      merchant: merchant.trim() || upiId.trim(),
      amount: parseFloat(amount),
      timestamp: new Date().toISOString(),
      upi_id: upiId.trim() || null,
      location: location.trim() || null,
      scanner_input: scannerInput.trim() || null
    };

    try {
      const res = await fetch("/api/personalized-risk-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Risk check failed. Ensure backend is running.");
      }

      const data = await res.json();
      setAssessment(data);
      setShowOverlay(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showOverlay && assessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className={`max-w-md w-full rounded-2xl p-8 border shadow-2xl ${assessment.risk_level === 'HIGH' ? 'bg-rose-950 border-rose-500/50 shadow-rose-900/20' : 'bg-slate-900 border-emerald-500/50 shadow-emerald-900/20'}`}>
            {assessment.risk_level === "HIGH" ? (
              <div className="text-center space-y-6">
                <div className="mx-auto w-24 h-24 bg-rose-500 rounded-full flex items-center justify-center animate-pulse">
                  <Ban className="h-12 w-12 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-white">TRANSACTION BLOCKED</h2>
                  <p className="text-rose-400 font-semibold mt-2">{assessment.reasons[0]}</p>
                </div>
                <div className="bg-rose-500/10 p-4 rounded-xl border border-rose-500/20 text-left">
                  <ul className="space-y-3 text-rose-200 text-sm">
                    {assessment.reasons.map((r, i) => (
                      <li key={i} className="flex gap-3"><XCircle className="h-5 w-5 shrink-0 text-rose-500" /> {r}</li>
                    ))}
                  </ul>
                </div>
                <button onClick={() => setShowOverlay(false)} className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl transition-colors">
                  ABORT PAYMENT
                </button>
              </div>
            ) : (
              <div className="text-center space-y-6">
                <div className="mx-auto w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <ShieldCheck className="h-12 w-12 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-white">SAFE TO PAY</h2>
                  <p className="text-emerald-400 font-semibold mt-2">Verified against Historical Behavior</p>
                </div>
                <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 text-left text-sm text-emerald-200 space-y-3">
                    <div className="flex gap-3"><CheckCircle className="h-5 w-5 shrink-0 text-emerald-500"/> <span>Risk Score: <strong className="text-white">{assessment.risk_score}/100</strong> ({assessment.risk_level})</span></div>
                    {assessment.reasons.map((r, i) => (
                      <li key={i} className="flex gap-3 list-none"><CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" /> <span>{r}</span></li>
                    ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowOverlay(false)} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors">
                    CANCEL
                  </button>
                  <button onClick={() => setShowOverlay(false)} className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-500/20">
                    PAY ₹{amount}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    <div className="space-y-8 animate-fade-in" id="personalized-risk-container">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Personalized Pre-Payment Risk</h1>
        <p className="text-slate-400">
          Evaluates transactions before payment execution by cross-referencing user behavioral historical models extracted from statements.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Check Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-fit" id="check-form-card">
          <h2 className="text-xl font-semibold text-white mb-4">Run Risk Check</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-3 mb-2">
              <label className="block text-sm font-semibold text-indigo-300 flex items-center gap-2">
                <Scan className="h-4 w-4" />
                Scan QR Code or Enter Phone
              </label>
              <input
                type="text"
                value={scannerInput}
                onChange={(e) => handleScannerInput(e.target.value)}
                placeholder="Paste UPI URI (upi://pay?...) or 10-digit phone number"
                className="w-full px-4 py-2 bg-slate-900 border border-indigo-500/30 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
              />
              <p className="text-xs text-indigo-400/70 leading-relaxed">
                Automatically extracts UPI ID, Amount, and Merchant details. Simulates scanning a QR code or selecting a phone contact before paying.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">User ID *</label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="e.g. user_1"
                required
                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Merchant / Recipient *</label>
              <input
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="e.g. Amazon Pay"
                required
                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Amount (INR) *</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="₹ Amount"
                required
                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">UPI ID (Optional)</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. merchant@paytm"
                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Location (Optional)</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Mumbai, Maharashtra"
                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-bold rounded-lg shadow-sm transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Scan className="h-5 w-5" />
                  PROCEED TO PAY
                </>
              )}
            </button>
          </form>
        </div>

        {/* Evaluation Output */}
        <div className="lg:col-span-2 space-y-6">
          {assessment ? (
            <div className="space-y-6 animate-fade-in" id="assessment-result">
              {/* Risk Score Summary Banner */}
              <div
                className={`border rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 ${
                  assessment.risk_level === "HIGH"
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                    : assessment.risk_level === "MEDIUM"
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                }`}
              >
                <div className="flex items-start gap-4">
                  {assessment.risk_level === "HIGH" || assessment.risk_level === "MEDIUM" ? (
                    <AlertTriangle className="h-12 w-12 shrink-0 mt-1" />
                  ) : (
                    <ShieldCheck className="h-12 w-12 shrink-0 mt-1" />
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-white">Assessment: {assessment.risk_level} RISK</h3>
                    <p className="text-slate-300 text-sm mt-1">
                      {assessment.profile_available 
                        ? `Payment behaviour matched with profile of ${userId}.`
                        : "Compiled without baseline. Assessment is a general risk model."}
                    </p>
                  </div>
                </div>

                <div className="text-center shrink-0">
                  <div className="text-xs text-slate-400 uppercase font-semibold">UPI Risk Score</div>
                  <div className="text-5xl font-black text-white mt-1">{assessment.risk_score}</div>
                  <div className="text-xs text-slate-400 mt-1">out of 100</div>
                </div>
              </div>

              {/* Reasons Breakdown */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-indigo-400" />
                  Evaluation Reasons
                </h3>
                <ul className="space-y-3">
                  {assessment.reasons.map((reason, index) => (
                    <li key={index} className="flex gap-3 text-sm text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-900">
                      <span className="text-indigo-400 font-semibold">{index + 1}.</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Historical Comparison */}
              {assessment.profile_available && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Landmark className="h-5 w-5 text-indigo-400" />
                    Comparison with Behavior Profile
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-800 text-sm">
                        <span className="text-slate-400">Average Transaction size</span>
                        <span className="font-semibold text-white">₹{assessment.comparison.average_amount}</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-slate-800 text-sm">
                        <span className="text-slate-400">Maximum Single size</span>
                        <span className="font-semibold text-white">₹{assessment.comparison.max_amount}</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-slate-800 text-sm">
                        <span className="text-slate-400">Most active Hour</span>
                        <span className="font-semibold text-white">
                          {assessment.comparison.most_active_hour !== null ? `${assessment.comparison.most_active_hour}:00` : "-"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-800 text-sm">
                        <span className="text-slate-400">Daily average Transactions</span>
                        <span className="font-semibold text-white">{assessment.comparison.average_daily_transactions}</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-slate-800 text-sm">
                        <span className="text-slate-400">Amount multiple of average</span>
                        <span className="font-semibold text-indigo-400">
                          {assessment.comparison.amount_multiple !== undefined ? `${assessment.comparison.amount_multiple}x` : "-"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-slate-800 text-sm">
                        <span className="text-slate-400">Same-Day Projected Velocity</span>
                        <span className="font-semibold text-white">{assessment.comparison.projected_daily_transactions} txs</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Geographic Parameters */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-indigo-400" />
                  <div>
                    <span className="text-slate-400 text-xs block uppercase">Target Location</span>
                    <span className="text-sm font-semibold text-white">{assessment.location || "Not Provided"}</span>
                  </div>
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  Verified via Edge Geolocation API
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center h-full flex flex-col justify-center items-center">
              <ShieldCheck className="h-16 w-16 text-slate-700 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-1">Payment Simulation Ready</h3>
              <p className="text-slate-400 max-w-md text-sm">
                Enter transaction details or paste a simulated UPI QR string, then click 'PROCEED TO PAY'. The transaction will be intercepted in real-time to prevent fraud.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
