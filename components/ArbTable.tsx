"use client";

import React, { useState, useMemo } from "react";
import {
  ArrowUpDown,
  ExternalLink,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Filter,
  Search,
  ChevronDown,
  Zap,
} from "lucide-react";
import {
  UnifiedMarket,
  SortField,
  SortDirection,
  FilterConfig,
} from "@/types";
import {
  formatPrice,
  formatSpreadPercent,
  formatVolume,
} from "@/utils/fetcher";

interface ArbTableProps {
  markets: UnifiedMarket[];
  isLoading: boolean;
  usedDummy: boolean;
  error: string | null;
  onRefresh: () => void;
  lastUpdated: Date | null;
}

export default function ArbTable({
  markets,
  isLoading,
  usedDummy,
  error,
  onRefresh,
  lastUpdated,
}: ArbTableProps) {
  const [sortField, setSortField] = useState<SortField>("spreadPercent");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filters, setFilters] = useState<FilterConfig>({
    minSpread: 0,
    showOnlyArbitrage: false,
    searchQuery: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Filter and sort markets
  const processedMarkets = useMemo(() => {
    let result = [...markets];

    // Apply filters
    if (filters.showOnlyArbitrage) {
      result = result.filter((m) => m.hasArbitrage);
    }
    if (filters.minSpread > 0) {
      result = result.filter((m) => m.spreadPercent >= filters.minSpread);
    }
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter((m) => m.eventName.toLowerCase().includes(query));
    }

    // Apply sort
    result.sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sortField) {
        case "eventName":
          aVal = a.eventName;
          bVal = b.eventName;
          break;
        case "polyPrice":
          aVal = a.polyPrice ?? -1;
          bVal = b.polyPrice ?? -1;
          break;
        case "kalshiPrice":
          aVal = a.kalshiPrice ?? -1;
          bVal = b.kalshiPrice ?? -1;
          break;
        case "spread":
          aVal = a.spread;
          bVal = b.spread;
          break;
        case "spreadPercent":
          aVal = a.spreadPercent;
          bVal = b.spreadPercent;
          break;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortDirection === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return result;
  }, [markets, sortField, sortDirection, filters]);

  // Count arbitrage opportunities
  const arbCount = markets.filter((m) => m.hasArbitrage).length;

  const SortHeader = ({
    field,
    children,
    className = "",
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) => (
    <th
      className={`px-3 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200 transition-colors select-none ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown
          size={12}
          className={
            sortField === field ? "text-emerald-400" : "text-gray-600"
          }
        />
      </div>
    </th>
  );

  const getPriceColor = (
    price: number | null,
    otherPrice: number | null,
    isCheaper: boolean
  ) => {
    if (price === null) return "text-gray-500";
    if (otherPrice === null) return "text-gray-300";
    if (isCheaper) return "text-emerald-400";
    return "text-gray-300";
  };

  const getSpreadBg = (percent: number) => {
    if (percent >= 5) return "bg-emerald-500/20 text-emerald-400";
    if (percent >= 3) return "bg-yellow-500/15 text-yellow-400";
    if (percent >= 1) return "bg-gray-700/50 text-gray-300";
    return "bg-gray-800/30 text-gray-500";
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case "high":
        return (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">
            HIGH
          </span>
        );
      case "medium":
        return (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-500 font-medium">
            MED
          </span>
        );
      default:
        return (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-500 font-medium">
            LOW
          </span>
        );
    }
  };

  return (
    <div className="w-full">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 px-1">
        <div className="flex items-center gap-3">
          {arbCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              <Zap size={14} className="text-emerald-400" />
              <span className="text-sm font-mono text-emerald-400">
                {arbCount} ARB{arbCount !== 1 ? "S" : ""}
              </span>
            </div>
          )}
          {usedDummy && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-yellow-500/10 border border-yellow-500/20">
              <AlertTriangle size={14} className="text-yellow-500" />
              <span className="text-xs text-yellow-500">DEMO DATA</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              type="text"
              placeholder="Search markets..."
              value={filters.searchQuery}
              onChange={(e) =>
                setFilters({ ...filters, searchQuery: e.target.value })
              }
              className="pl-9 pr-3 py-2 text-sm bg-gray-900/50 border border-gray-800 rounded-lg text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gray-700 w-48"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
              showFilters
                ? "bg-gray-800 border-gray-700 text-gray-200"
                : "bg-gray-900/50 border-gray-800 text-gray-400 hover:text-gray-300"
            }`}
          >
            <Filter size={14} />
            <ChevronDown
              size={14}
              className={`transition-transform ${showFilters ? "rotate-180" : ""}`}
            />
          </button>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-900/50 border border-gray-800 rounded-lg text-gray-400 hover:text-gray-200 hover:border-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={isLoading ? "animate-spin" : ""}
            />
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="mb-4 p-4 bg-gray-900/30 border border-gray-800/50 rounded-lg">
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input
                type="checkbox"
                checked={filters.showOnlyArbitrage}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    showOnlyArbitrage: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-emerald-500 focus:ring-emerald-500/20"
              />
              Show only arbitrage (&gt;5%)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Min Spread:</span>
              <select
                value={filters.minSpread}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    minSpread: parseFloat(e.target.value),
                  })
                }
                className="px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded text-gray-300 focus:outline-none"
              >
                <option value={0}>All</option>
                <option value={1}>≥1%</option>
                <option value={3}>≥3%</option>
                <option value={5}>≥5%</option>
                <option value={10}>≥10%</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-400" />
          <span className="text-sm text-red-400">{error}</span>
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto rounded-lg border border-gray-800/50 bg-gray-950/50">
        <table className="w-full">
          <thead className="bg-gray-900/50 border-b border-gray-800/50">
            <tr>
              <SortHeader field="eventName" className="min-w-[280px]">
                Market
              </SortHeader>
              <SortHeader field="polyPrice" className="w-28">
                Polymarket
              </SortHeader>
              <SortHeader field="kalshiPrice" className="w-28">
                Kalshi
              </SortHeader>
              <SortHeader field="spreadPercent" className="w-24">
                Spread
              </SortHeader>
              <th className="px-3 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider w-20">
                Match
              </th>
              <th className="px-3 py-3 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider w-28">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/30">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-3 py-4">
                    <div className="h-4 bg-gray-800/50 rounded w-3/4"></div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="h-4 bg-gray-800/50 rounded w-12"></div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="h-4 bg-gray-800/50 rounded w-12"></div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="h-4 bg-gray-800/50 rounded w-16"></div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="h-4 bg-gray-800/50 rounded w-10"></div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="h-6 bg-gray-800/50 rounded w-20 ml-auto"></div>
                  </td>
                </tr>
              ))
            ) : processedMarkets.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-12 text-center">
                  <div className="text-gray-500 text-sm">
                    No markets found matching your filters
                  </div>
                </td>
              </tr>
            ) : (
              processedMarkets.map((market) => (
                <tr
                  key={market.id}
                  className={`hover:bg-gray-800/20 transition-colors ${
                    market.hasArbitrage ? "bg-emerald-500/[0.02]" : ""
                  }`}
                >
                  {/* Market Name */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {market.hasArbitrage && (
                        <TrendingUp
                          size={14}
                          className="text-emerald-400 flex-shrink-0"
                        />
                      )}
                      <span
                        className="text-sm text-gray-200 truncate max-w-[260px]"
                        title={market.eventName}
                      >
                        {market.eventName}
                      </span>
                    </div>
                    {market.polyVolume && (
                      <div className="mt-1 text-[10px] text-gray-600 font-mono">
                        VOL: {formatVolume(market.polyVolume)}
                      </div>
                    )}
                  </td>

                  {/* Polymarket Price */}
                  <td className="px-3 py-3">
                    <div className="flex flex-col">
                      <span
                        className={`font-mono text-sm ${getPriceColor(
                          market.polyPrice,
                          market.kalshiPrice,
                          market.polyPrice !== null &&
                            market.kalshiPrice !== null &&
                            market.polyPrice < market.kalshiPrice
                        )}`}
                      >
                        {formatPrice(market.polyPrice)}
                      </span>
                      {market.urlPoly && (
                        <a
                          href={market.urlPoly}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-gray-600 hover:text-gray-400 flex items-center gap-1 mt-0.5"
                        >
                          <ExternalLink size={9} />
                          view
                        </a>
                      )}
                    </div>
                  </td>

                  {/* Kalshi Price */}
                  <td className="px-3 py-3">
                    <div className="flex flex-col">
                      <span
                        className={`font-mono text-sm ${getPriceColor(
                          market.kalshiPrice,
                          market.polyPrice,
                          market.kalshiPrice !== null &&
                            market.polyPrice !== null &&
                            market.kalshiPrice < market.polyPrice
                        )}`}
                      >
                        {formatPrice(market.kalshiPrice)}
                      </span>
                      {market.urlKalshi && (
                        <a
                          href={market.urlKalshi}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-gray-600 hover:text-gray-400 flex items-center gap-1 mt-0.5"
                        >
                          <ExternalLink size={9} />
                          view
                        </a>
                      )}
                    </div>
                  </td>

                  {/* Spread */}
                  <td className="px-3 py-3">
                    {market.polyPrice !== null &&
                    market.kalshiPrice !== null ? (
                      <span
                        className={`inline-block font-mono text-sm px-2 py-0.5 rounded ${getSpreadBg(
                          market.spreadPercent
                        )}`}
                      >
                        {formatSpreadPercent(market.spreadPercent)}
                      </span>
                    ) : (
                      <span className="text-gray-600 text-sm">—</span>
                    )}
                  </td>

                  {/* Match Confidence */}
                  <td className="px-3 py-3">
                    {getConfidenceBadge(market.matchConfidence)}
                  </td>

                  {/* Action */}
                  <td className="px-3 py-3 text-right">
                    {market.hasArbitrage && market.arbitrageDirection ? (
                      <button
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-colors"
                        onClick={() => {
                          const url =
                            market.arbitrageDirection === "buy_poly"
                              ? market.urlPoly
                              : market.urlKalshi;
                          if (url) window.open(url, "_blank");
                        }}
                      >
                        <Zap size={11} />
                        ARB THIS
                      </button>
                    ) : (
                      <button
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-gray-700/50 bg-gray-800/30 text-gray-500 cursor-not-allowed"
                        disabled
                      >
                        NO ARB
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between px-1">
        <div className="text-[11px] text-gray-600">
          {processedMarkets.length} market{processedMarkets.length !== 1 ? "s" : ""}{" "}
          {filters.showOnlyArbitrage || filters.minSpread > 0
            ? "(filtered)"
            : ""}
        </div>
        {lastUpdated && (
          <div className="text-[11px] text-gray-600">
            Updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}
