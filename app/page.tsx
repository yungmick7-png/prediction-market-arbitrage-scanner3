"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  Github,
  Twitter,
  BarChart3,
  Shield,
  Zap,
} from "lucide-react";
import ArbTable from "@/components/ArbTable";
import { UnifiedMarket } from "@/types";
import { fetchAllMarkets, getDummyData } from "@/utils/fetcher";

export default function Home() {
  const [markets, setMarkets] = useState<UnifiedMarket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [usedDummy, setUsedDummy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadMarkets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchAllMarkets();
      setMarkets(result.markets);
      setUsedDummy(result.usedDummy);
      setError(result.error);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to load markets:", err);
      // Fall back to dummy data on error
      setMarkets(getDummyData());
      setUsedDummy(true);
      setError(err instanceof Error ? err.message : "Failed to fetch data");
      setLastUpdated(new Date());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMarkets();
    // Auto-refresh every 60 seconds
    const interval = setInterval(loadMarkets, 60000);
    return () => clearInterval(interval);
  }, [loadMarkets]);

  // Calculate stats
  const arbOpportunities = markets.filter((m) => m.hasArbitrage).length;
  const avgSpread =
    markets.length > 0
      ? markets.reduce((sum, m) => sum + m.spreadPercent, 0) / markets.length
      : 0;
  const matchedMarkets = markets.filter(
    (m) => m.polyPrice !== null && m.kalshiPrice !== null
  ).length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800/50 bg-[#0d0d0d]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Activity size={18} className="text-emerald-400" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-gray-100 tracking-tight">
                  ArbScanner
                </h1>
                <p className="text-[10px] text-gray-500 -mt-0.5">
                  Prediction Market Arbitrage
                </p>
              </div>
            </div>

            {/* Nav Links */}
            <nav className="hidden sm:flex items-center gap-6">
              <a
                href="#"
                className="text-xs text-emerald-400 font-medium border-b border-emerald-400/50 pb-0.5"
              >
                Markets
              </a>
              <a
                href="#"
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Analytics
              </a>
              <a
                href="#"
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Alerts
              </a>
              <a
                href="#"
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Docs
              </a>
            </nav>

            {/* Social Links */}
            <div className="flex items-center gap-2">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <Github size={16} />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <Twitter size={16} />
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-gray-900/30 border border-gray-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={14} className="text-gray-500" />
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                Markets
              </span>
            </div>
            <div className="text-2xl font-mono font-semibold text-gray-200">
              {markets.length}
            </div>
          </div>

          <div className="bg-gray-900/30 border border-gray-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={14} className="text-gray-500" />
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                Matched
              </span>
            </div>
            <div className="text-2xl font-mono font-semibold text-gray-200">
              {matchedMarkets}
            </div>
          </div>

          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={14} className="text-emerald-400" />
              <span className="text-[10px] text-emerald-400/70 uppercase tracking-wider">
                Arb Opps
              </span>
            </div>
            <div className="text-2xl font-mono font-semibold text-emerald-400">
              {arbOpportunities}
            </div>
          </div>

          <div className="bg-gray-900/30 border border-gray-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity size={14} className="text-gray-500" />
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                Avg Spread
              </span>
            </div>
            <div className="text-2xl font-mono font-semibold text-gray-200">
              {avgSpread.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mb-6 p-4 bg-gray-900/20 border border-gray-800/30 rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h2 className="text-sm font-medium text-gray-300 mb-1">
                Cross-Platform Arbitrage Detection
              </h2>
              <p className="text-xs text-gray-500">
                Comparing odds between Polymarket and Kalshi for political
                prediction markets. Green prices indicate the cheaper platform.
                Spreads above 5% are flagged as arbitrage opportunities.
              </p>
            </div>
            <div className="flex items-center gap-4 text-[10px]">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                <span className="text-gray-400">Cheaper</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500/50"></div>
                <span className="text-gray-400">&gt;5% = Arb</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <span className="text-gray-400">3-5%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Table */}
        <ArbTable
          markets={markets}
          isLoading={isLoading}
          usedDummy={usedDummy}
          error={error}
          onRefresh={loadMarkets}
          lastUpdated={lastUpdated}
        />

        {/* Disclaimer */}
        <div className="mt-8 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-lg">
          <p className="text-[11px] text-yellow-500/70 leading-relaxed">
            <strong className="text-yellow-500">⚠️ Disclaimer:</strong> This
            tool is for informational purposes only. Always verify prices
            directly on the platforms before trading. Prediction market
            arbitrage involves risks including liquidity, fees, settlement
            timing, and regulatory considerations. Not financial advice.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-800/30 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-gray-600" />
              <span className="text-xs text-gray-600">
                ArbScanner © 2024 — Open Source
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-gray-700">
                Data from Polymarket & Kalshi APIs
              </span>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] text-gray-600">Live</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
