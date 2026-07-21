import React, { useState } from "react";
import { Upload, AlertCircle, FileText, CheckCircle2, TrendingUp, DollarSign, Calendar, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { BehaviorProfile } from "../types";

export default function StatementProfiling() {
  const [userId, setUserId] = useState("");
  const [retainSource, setRetainSource] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<BehaviorProfile | null>(null);
  const [extractedCount, setExtractedCount] = useState<number>(0);
  const [warnings, setWarnings] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) {
      setError("Please provide a User ID");
      return;
    }
    if (!file) {
      setError("Please upload a CSV or PDF statement file");
      return;
    }

    setLoading(true);
    setError(null);
    setProfile(null);
    setWarnings([]);

    const formData = new FormData();
    formData.append("user_id", userId.trim());
    formData.append("retain_source", String(retainSource));
    formData.append("file", file);

    try {
      const res = await fetch("/api/statement/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Upload failed");
      }

      const result = await res.json();
      if (result.profile) {
        setProfile(result.profile);
        setExtractedCount(result.transactions_extracted);
        setWarnings(result.warnings || []);
      } else {
        setError("Could not extract any transactions from the uploaded file.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Format data for charts
  const getFrequencyData = () => {
    if (!profile || !profile.merchant_frequency) return [];
    return Object.entries(profile.merchant_frequency).map(([name, count]) => ({
      name,
      count,
    }));
  };

  const getMonthlyData = () => {
    if (!profile || !profile.monthly_totals) return [];
    return Object.entries(profile.monthly_totals).map(([month, total]) => ({
      month,
      total,
    }));
  };

  return (
    <div className="space-y-8 animate-fade-in" id="statement-profiling-container">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Statement Profiling</h1>
        <p className="text-slate-400">
          Upload a UPI or bank statement (PDF/CSV) to extract transactional features and synthesize a personalized payment behavior profile.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Form Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-fit" id="upload-card">
          <h2 className="text-xl font-semibold text-white mb-4">Generate Behaviour Profile</h2>
          
          <form onSubmit={handleUpload} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">User ID</label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="e.g. user_123"
                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center">
              <input
                id="retain"
                type="checkbox"
                checked={retainSource}
                onChange={(e) => setRetainSource(e.target.checked)}
                className="h-4 w-4 bg-slate-950 border border-slate-800 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="retain" className="ml-2 block text-sm text-slate-300">
                Retain original statement file on server
              </label>
            </div>

            <div className="border border-dashed border-slate-800 rounded-lg p-6 bg-slate-950/50 hover:bg-slate-950 transition cursor-pointer text-center relative">
              <input
                type="file"
                accept=".pdf,.csv"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="mx-auto h-12 w-12 text-slate-500 mb-2" />
              <p className="text-sm font-medium text-slate-300">
                {file ? file.name : "Click to select or drag PDF / CSV"}
              </p>
              <p className="text-xs text-slate-500 mt-1">PDF bank statement or CSV up to 10MB</p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-medium rounded-lg shadow-sm transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Generate Behaviour Profile
                </>
              )}
            </button>
          </form>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {profile ? (
            <div className="space-y-6 animate-fade-in" id="profile-results">
              {/* Warnings / Success Message */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-white">Profile Successfully Compiled</h3>
                  <p className="text-slate-300 text-sm mt-0.5">
                    Behavior profile generated for <strong className="text-white">{profile.user_id}</strong> based on {extractedCount} extracted transactions.
                  </p>
                </div>
              </div>

              {warnings.map((w, i) => (
                <div key={i} className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <span>{w}</span>
                </div>
              ))}

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="metrics-grid">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Transactions</span>
                    <Activity className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">{profile.transaction_count}</div>
                  <div className="text-xs text-slate-500 mt-1">Total analyzed rows</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Average Ticket</span>
                    <DollarSign className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">₹{profile.avg_amount}</div>
                  <div className="text-xs text-slate-500 mt-1">Mean txn size</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Peak Ticket</span>
                    <TrendingUp className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">₹{profile.max_amount}</div>
                  <div className="text-xs text-slate-500 mt-1">Historical maximum</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Active Hour</span>
                    <Calendar className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {profile.most_active_hour !== null ? `${profile.most_active_hour}:00` : "-"}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Most recurring timing</div>
                </div>
              </div>

              {/* Behavior Breakdown Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Favorite Merchants Bar Chart */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-base font-semibold text-white mb-4">Merchant Frequency</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getFrequencyData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px" }}
                          labelStyle={{ color: "#fff" }}
                        />
                        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Monthly Totals Line Chart */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-base font-semibold text-white mb-4">Monthly UPI Volume</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={getMonthlyData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px" }}
                          labelStyle={{ color: "#fff" }}
                        />
                        <Line type="monotone" dataKey="total" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Auxiliary Insights */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-base font-semibold text-white mb-3">Profile Auxiliary Parameters</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-300">
                  <div className="p-3 bg-slate-950 rounded-lg">
                    <span className="text-slate-500 block mb-1">Weekend / Night Ratio</span>
                    <span className="font-semibold text-white">
                      {Math.round((profile.night_transactions / profile.transaction_count) * 100)}% Night
                    </span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg">
                    <span className="text-slate-500 block mb-1">Average Daily Activity</span>
                    <span className="font-semibold text-white">{profile.average_daily_transactions} txs/day</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg">
                    <span className="text-slate-500 block mb-1">Failed Payments Rate</span>
                    <span className="font-semibold text-white">
                      {profile.failed_transactions} / {profile.transaction_count} ({Math.round((profile.failed_transactions / profile.transaction_count) * 100)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center h-full flex flex-col justify-center items-center">
              <FileText className="h-16 w-16 text-slate-700 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-1">No Profile Loaded</h3>
              <p className="text-slate-400 max-w-md text-sm">
                Provide a User ID and upload their UPI statement file on the left panel to compile and display the behavior dashboard.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
