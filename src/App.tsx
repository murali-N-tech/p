import React, { useState, useEffect } from "react";
import { 
  FileText, ShieldCheck, Cpu, Share2, AlertTriangle, 
  LineChart, Eye, Bell, Activity, Shield, Menu, X,
  User as UserIcon, LogOut
} from "lucide-react";

import AuthPage from "./components/AuthPage.tsx";
import ProfilePage from "./components/ProfilePage.tsx";
import StatementProfiling from "./components/StatementProfiling.tsx";
import PrePaymentRiskCheck from "./components/PrePaymentRiskCheck.tsx";
import FraudDetection from "./components/FraudDetection.tsx";
import NetworkGraph from "./components/NetworkGraph.tsx";
import FraudRings from "./components/FraudRings.tsx";
import FraudHeatmap from "./components/FraudHeatmap.tsx";
import Explainability from "./components/Explainability.tsx";
import FraudAlerts from "./components/FraudAlerts.tsx";
import SystemMonitor from "./components/SystemMonitor.tsx";

import { User } from "./types";

type PageID = 
  | "My Profile"
  | "Statement Profiling"
  | "Pre-Payment Risk Check"
  | "Fraud Detection"
  | "Fraud Network Graph"
  | "Fraud Rings"
  | "Fraud Heatmap"
  | "Explainability"
  | "Fraud Alerts"
  | "System Monitor";

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem("upi_guard_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [activePage, setActivePage] = useState<PageID>("My Profile");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleAuth = (u: User) => {
    setUser(u);
    localStorage.setItem("upi_guard_user", JSON.stringify(u));
    setActivePage("My Profile");
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("upi_guard_user");
  };

  // If not logged in, show auth page
  if (!user) {
    return <AuthPage onAuth={handleAuth} />;
  }

  const menuItems = [
    { id: "My Profile", label: "My Profile", icon: UserIcon },
    { id: "Statement Profiling", label: "Statement Profiling", icon: FileText },
    { id: "Pre-Payment Risk Check", label: "Pre-Payment Risk Check", icon: ShieldCheck },
    { id: "Fraud Detection", label: "Fraud Detection", icon: Cpu },
    { id: "Fraud Network Graph", label: "Fraud Network Graph", icon: Share2 },
    { id: "Fraud Rings", label: "Fraud Rings", icon: AlertTriangle },
    { id: "Fraud Heatmap", label: "Fraud Heatmap", icon: LineChart },
    { id: "Explainability", label: "Explainability", icon: Eye },
    { id: "Fraud Alerts", label: "Fraud Alerts", icon: Bell },
    { id: "System Monitor", label: "System Monitor", icon: Activity },
  ] as const;

  const renderActivePage = () => {
    switch (activePage) {
      case "My Profile":
        return <ProfilePage user={user} />;
      case "Statement Profiling":
        return <StatementProfiling />;
      case "Pre-Payment Risk Check":
        return <PrePaymentRiskCheck />;
      case "Fraud Detection":
        return <FraudDetection />;
      case "Fraud Network Graph":
        return <NetworkGraph />;
      case "Fraud Rings":
        return <FraudRings />;
      case "Fraud Heatmap":
        return <FraudHeatmap />;
      case "Explainability":
        return <Explainability />;
      case "Fraud Alerts":
        return <FraudAlerts />;
      case "System Monitor":
        return <SystemMonitor />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col font-sans" id="main-app-shell">
      
      {/* Upper Navigation bar */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600/10 text-indigo-400 rounded-lg border border-indigo-500/20">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Edge AI UPI Behaviour Risk System
            </h1>
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block font-mono">
              PRE-PAYMENT THREAT MITIGATION ENGINE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* User Info */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-semibold text-white">{user.name}</div>
              <div className="text-[10px] text-slate-500 font-mono">{user.email}</div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20 flex items-center justify-center">
              <span className="text-sm font-bold text-indigo-400">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
            title="Sign Out"
            id="logout-btn"
          >
            <LogOut className="h-5 w-5" />
          </button>

          {/* Mobile menu triggers */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row relative">
        
        {/* Left Navigation Menu Sidebar (Desktop) */}
        <aside className="hidden lg:block w-72 bg-slate-900 border-r border-slate-800 p-6 space-y-2 shrink-0">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-4 px-3">
            Analytic Modules
          </div>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive 
                      ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20" 
                      : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border border-transparent"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Floating Side Drawer (Mobile Overlay) */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-20 bg-slate-950/80 backdrop-blur-sm">
            <aside className="w-72 h-full bg-slate-900 p-6 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                    Analytic Modules
                  </span>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <nav className="space-y-1">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activePage === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActivePage(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                          isActive 
                            ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20" 
                            : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border border-transparent"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="text-[10px] text-slate-600 font-mono text-center">
                Edge UPI Secure Guard v1.0.0
              </div>
            </aside>
          </div>
        )}

        {/* Core Main Panel Frame */}
        <main className="flex-1 p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full overflow-y-auto">
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
}
