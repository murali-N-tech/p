import React, { useState, useEffect, useCallback } from "react";
import {
  Upload, FileText, AlertCircle, CheckCircle2,
  TrendingUp, DollarSign, Calendar, Activity,
  Clock, ShoppingBag, CreditCard, Hash,
  RefreshCw, ChevronDown, ChevronUp, User as UserIcon
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from "recharts";
import { User, BehaviorProfile, StatementTransaction } from "../types";

interface ProfilePageProps {
  user: User;
}

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#818cf8", "#6d28d9", "#7c3aed", "#4f46e5"];

export default function ProfilePage({ user }: ProfilePageProps) {
  const [file, setFile] = useState<File | null>(null);
  const [retainSource, setRetainSource] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const [profile, setProfile] = useState<BehaviorProfile | null>(null);
  const [transactions, setTransactions] = useState<StatementTransaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [showAllTxns, setShowAllTxns] = useState(false);
  const [txnSortField, setTxnSortField] = useState<"timestamp" | "amount">("timestamp");
  const [txnSortDir, setTxnSortDir] = useState<"asc" | "desc">("desc");

  const fetchProfileData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [profileRes, txnsRes] = await Promise.all([
        fetch(`/api/profiles/${user.id}`),
        fetch(`/api/user-transactions/${user.id}`),
      ]);

      if (profileRes.ok) {
        const p = await profileRes.json();
        setProfile(p);
      } else {
        setProfile(null);
      }

      if (txnsRes.ok) {
        const txns = await txnsRes.json();
        setTransactions(txns);
      }
    } catch {
      // Silent fail on initial load
    } finally {
      setLoadingData(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadError(null);
      setUploadSuccess(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setUploadError("Please select a PDF or CSV statement file");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    setWarnings([]);

    const formData = new FormData();
    formData.append("user_id", user.id);
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
        setUploadSuccess(`Successfully extracted ${result.transactions_extracted} transactions from your statement.`);
        setWarnings(result.warnings || []);
        setFile(null);
        // Refresh profile data
        await fetchProfileData();
      } else {
        setUploadError("Could not extract transactions from the uploaded file.");
      }
    } catch (err: any) {
      setUploadError(err.message || "An unexpected error occurred.");
    } finally {
      setUploading(false);
    }
  };

  // Sort transactions
  const sortedTransactions = [...transactions].sort((a, b) => {
    if (txnSortField === "amount") {
      return txnSortDir === "asc" ? a.amount - b.amount : b.amount - a.amount;
    }
    return txnSortDir === "asc"
      ? new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      : new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const visibleTxns = showAllTxns ? sortedTransactions : sortedTransactions.slice(0, 10);

  const toggleSort = (field: "timestamp" | "amount") => {
    if (txnSortField === field) {
      setTxnSortDir(txnSortDir === "asc" ? "desc" : "asc");
    } else {
      setTxnSortField(field);
      setTxnSortDir("desc");
    }
  };

  // Chart data helpers
  const getMerchantFreqData = () => {
    if (!profile?.merchant_frequency) return [];
    return Object.entries(profile.merchant_frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
  };

  const getMonthlyData = () => {
    if (!profile?.monthly_totals) return [];
    return Object.entries(profile.monthly_totals)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({ month, total: Math.round(total) }));
  };

  const getHourlyData = () => {
    if (!profile?.hourly_distribution) return [];
    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      count: profile.hourly_distribution[String(i)] || 0,
    }));
  };

  const getStatusPieData = () => {
    const successCount = transactions.filter(t => t.status === "SUCCESS" || t.status === "SUCCESSFUL").length;
    const failedCount = transactions.filter(t => t.status === "FAILED" || t.status === "FAILURE").length;
    const otherCount = transactions.length - successCount - failedCount;
    return [
      { name: "Success", value: successCount },
      { name: "Failed", value: failedCount },
      ...(otherCount > 0 ? [{ name: "Other", value: otherCount }] : []),
    ].filter(d => d.value > 0);
  };

  const formatDate = (ts: string) => {
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
        " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return ts;
    }
  };

  const memberSince = (() => {
    try {
      return new Date(user.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
    } catch {
      return user.created_at;
    }
  })();

  return (
    <div className="space-y-8 animate-fade-in" id="profile-page-container">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">My Profile</h1>
        <p className="text-slate-400">View your account details, upload UPI statements, and explore your extracted transaction history.</p>
      </div>

      {/* User Info + Upload Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* User Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit" id="user-info-card">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20 flex items-center justify-center shadow-lg shadow-indigo-500/10">
              <UserIcon className="h-7 w-7 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{user.name}</h2>
              <p className="text-sm text-slate-400">{user.email}</p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between p-3 bg-slate-950/60 rounded-xl">
              <span className="text-slate-500">User ID</span>
              <span className="text-white font-mono text-xs">{user.id}</span>
            </div>
            <div className="flex justify-between p-3 bg-slate-950/60 rounded-xl">
              <span className="text-slate-500">Member Since</span>
              <span className="text-white">{memberSince}</span>
            </div>
            <div className="flex justify-between p-3 bg-slate-950/60 rounded-xl">
              <span className="text-slate-500">Statements Analyzed</span>
              <span className="text-white font-semibold">{transactions.length > 0 ? "✓" : "—"}</span>
            </div>
            <div className="flex justify-between p-3 bg-slate-950/60 rounded-xl">
              <span className="text-slate-500">Total Transactions</span>
              <span className="text-indigo-400 font-bold">{transactions.length}</span>
            </div>
          </div>
        </div>

        {/* Upload Card */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6" id="upload-card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-white">Upload UPI Statement</h2>
            {profile && (
              <button
                onClick={fetchProfileData}
                className="text-xs text-slate-400 hover:text-indigo-400 transition flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" /> Refresh
              </button>
            )}
          </div>

          <form onSubmit={handleUpload} className="space-y-4">
            <div className="border border-dashed border-slate-700 rounded-xl p-8 bg-slate-950/40 hover:bg-slate-950/60 transition cursor-pointer text-center relative group">
              <input
                type="file"
                accept=".pdf,.csv"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="profile-file-input"
              />
              <Upload className="mx-auto h-10 w-10 text-slate-600 group-hover:text-indigo-400 mb-3 transition" />
              <p className="text-sm font-medium text-slate-300">
                {file ? file.name : "Drop your UPI statement here or click to browse"}
              </p>
              <p className="text-xs text-slate-500 mt-1">Supports PDF & CSV • Real data extraction • No mock data</p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  id="retain-source"
                  type="checkbox"
                  checked={retainSource}
                  onChange={(e) => setRetainSource(e.target.checked)}
                  className="h-4 w-4 bg-slate-950 border border-slate-800 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="retain-source" className="text-xs text-slate-400">
                  Retain original file on server
                </label>
              </div>

              <button
                type="submit"
                disabled={uploading || !file}
                className="py-2.5 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-slate-700 disabled:to-slate-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/15 transition-all text-sm flex items-center gap-2"
                id="profile-upload-btn"
              >
                {uploading ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    Analyze Statement
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Success / Error / Warnings */}
          {uploadSuccess && (
            <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-3.5 flex items-start gap-2.5 text-sm">
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{uploadSuccess}</span>
            </div>
          )}
          {uploadError && (
            <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3.5 flex items-start gap-2.5 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}
          {warnings.map((w, i) => (
            <div key={i} className="mt-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loadingData && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-slate-400">Loading your data...</span>
        </div>
      )}

      {/* Profile Analytics */}
      {!loadingData && profile && (
        <div className="space-y-6" id="profile-analytics">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Total Transactions"
              value={String(profile.transaction_count)}
              sub="Extracted from statements"
              icon={<Activity className="h-4 w-4 text-indigo-400" />}
            />
            <MetricCard
              label="Average Amount"
              value={`₹${profile.avg_amount.toLocaleString("en-IN")}`}
              sub="Mean transaction size"
              icon={<DollarSign className="h-4 w-4 text-emerald-400" />}
            />
            <MetricCard
              label="Peak Amount"
              value={`₹${profile.max_amount.toLocaleString("en-IN")}`}
              sub="Historical maximum"
              icon={<TrendingUp className="h-4 w-4 text-rose-400" />}
            />
            <MetricCard
              label="Most Active Hour"
              value={profile.most_active_hour !== null ? `${profile.most_active_hour}:00` : "—"}
              sub="Recurring peak timing"
              icon={<Clock className="h-4 w-4 text-amber-400" />}
            />
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Night Transactions"
              value={String(profile.night_transactions)}
              sub={`${profile.transaction_count ? Math.round((profile.night_transactions / profile.transaction_count) * 100) : 0}% of total`}
              icon={<Calendar className="h-4 w-4 text-violet-400" />}
            />
            <MetricCard
              label="Weekend Activity"
              value={String(profile.weekend_transactions)}
              sub="Saturday & Sunday"
              icon={<Calendar className="h-4 w-4 text-sky-400" />}
            />
            <MetricCard
              label="Daily Average"
              value={String(profile.average_daily_transactions)}
              sub="Transactions per day"
              icon={<Activity className="h-4 w-4 text-teal-400" />}
            />
            <MetricCard
              label="Failed Payments"
              value={String(profile.failed_transactions)}
              sub={`${profile.transaction_count ? Math.round((profile.failed_transactions / profile.transaction_count) * 100) : 0}% failure rate`}
              icon={<AlertCircle className="h-4 w-4 text-red-400" />}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Merchant Frequency */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-indigo-400" />
                Merchant Frequency
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getMerchantFreqData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} angle={-30} textAnchor="end" height={60} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "12px" }}
                      labelStyle={{ color: "#fff" }}
                    />
                    <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly Volume */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-rose-400" />
                Monthly UPI Volume
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getMonthlyData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "12px" }}
                      labelStyle={{ color: "#fff" }}
                      formatter={(value: any) => [`₹${Number(value).toLocaleString("en-IN")}`, "Volume"]}
                    />
                    <Line type="monotone" dataKey="total" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 4, fill: "#f43f5e" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Hourly Distribution */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-400" />
                Hourly Activity
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getHourlyData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="hour" stroke="#64748b" fontSize={9} tickLine={false} interval={2} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "12px" }}
                      labelStyle={{ color: "#fff" }}
                    />
                    <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Transaction Status Pie */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-400" />
                Transaction Status
              </h3>
              <div className="h-64 flex items-center justify-center">
                {getStatusPieData().length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getStatusPieData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {getStatusPieData().map((_, idx) => (
                          <Cell key={idx} fill={["#10b981", "#ef4444", "#6b7280"][idx] || "#6366f1"} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "12px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-slate-500 text-sm">No data</span>
                )}
              </div>
            </div>
          </div>

          {/* Known UPI IDs & Favorite Merchants */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-base font-semibold text-white mb-3">Favorite Merchants</h3>
              <div className="flex flex-wrap gap-2">
                {profile.favorite_merchants.length > 0
                  ? profile.favorite_merchants.map((m, i) => (
                      <span key={i} className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-lg text-xs font-medium">
                        {m}
                      </span>
                    ))
                  : <span className="text-slate-500 text-sm">No merchant data</span>}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-base font-semibold text-white mb-3">Known UPI IDs</h3>
              <div className="flex flex-wrap gap-2">
                {profile.known_upi_ids.length > 0
                  ? profile.known_upi_ids.map((id, i) => (
                      <span key={i} className="px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 text-violet-300 rounded-lg text-xs font-mono">
                        {id}
                      </span>
                    ))
                  : <span className="text-slate-500 text-sm">No UPI IDs recorded</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Extracted Transactions Table */}
      {!loadingData && transactions.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden" id="transactions-table">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Hash className="h-4 w-4 text-indigo-400" />
              Extracted Transactions
              <span className="ml-2 px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-md text-xs font-mono">
                {transactions.length}
              </span>
            </h3>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
              100% Original Data from PDF/CSV
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-slate-500 bg-slate-950/50">
                  <th className="text-left py-3 px-4">#</th>
                  <th
                    className="text-left py-3 px-4 cursor-pointer hover:text-slate-300 transition select-none"
                    onClick={() => toggleSort("timestamp")}
                  >
                    <span className="flex items-center gap-1">
                      Date/Time
                      {txnSortField === "timestamp" && (txnSortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </span>
                  </th>
                  <th
                    className="text-right py-3 px-4 cursor-pointer hover:text-slate-300 transition select-none"
                    onClick={() => toggleSort("amount")}
                  >
                    <span className="flex items-center justify-end gap-1">
                      Amount
                      {txnSortField === "amount" && (txnSortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </span>
                  </th>
                  <th className="text-left py-3 px-4">Merchant</th>
                  <th className="text-left py-3 px-4">UPI ID</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Ref #</th>
                  <th className="text-left py-3 px-4">Source</th>
                </tr>
              </thead>
              <tbody>
                {visibleTxns.map((tx, idx) => (
                  <tr
                    key={idx}
                    className="border-t border-slate-800/50 hover:bg-slate-800/20 transition-colors"
                  >
                    <td className="py-3 px-4 text-slate-500 font-mono text-xs">{idx + 1}</td>
                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">{formatDate(tx.timestamp)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-white whitespace-nowrap">
                      ₹{tx.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-[180px] truncate">{tx.merchant}</td>
                    <td className="py-3 px-4 text-indigo-300 font-mono text-xs">{tx.upi_id || "—"}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${
                          tx.status === "SUCCESS" || tx.status === "SUCCESSFUL"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : tx.status === "FAILED" || tx.status === "FAILURE"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-yellow-500/10 text-yellow-400"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-xs">{tx.reference_number || "—"}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-slate-800 text-slate-400">
                        {tx.source_type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Show More / Less */}
          {transactions.length > 10 && (
            <div className="p-4 border-t border-slate-800 text-center">
              <button
                onClick={() => setShowAllTxns(!showAllTxns)}
                className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition flex items-center gap-1 mx-auto"
              >
                {showAllTxns ? (
                  <>
                    <ChevronUp className="h-4 w-4" /> Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" /> Show All {transactions.length} Transactions
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loadingData && transactions.length === 0 && !profile && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-16 text-center">
          <FileText className="h-16 w-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Statement Uploaded Yet</h3>
          <p className="text-slate-400 max-w-md mx-auto text-sm">
            Upload your UPI or bank statement (PDF/CSV) above to build your behavior profile and see all your extracted transaction data.
          </p>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{sub}</div>
    </div>
  );
}
