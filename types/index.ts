// ============================================
// PREDICTION MARKET ARBITRAGE SCANNER - TYPES
// ============================================

// Polymarket API Types (Gamma API)
export interface PolymarketOutcome {
  value: string;
  price: number;
}

export interface PolymarketMarket {
  id: string;
  question: string;
  slug: string;
  conditionId: string;
  outcomePrices: string; // JSON string of prices like "[0.55, 0.45]"
  outcomes: string; // JSON string like '["Yes", "No"]'
  groupItemTitle?: string;
  active: boolean;
  closed: boolean;
  volume: string;
  liquidity: string;
}

export interface PolymarketEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  markets: PolymarketMarket[];
  tags?: string[];
  category?: string;
}

// Kalshi API Types (Trade API v2)
export interface KalshiMarket {
  ticker: string;
  event_ticker: string;
  title: string;
  subtitle?: string;
  status: "active" | "closed" | "settled";
  yes_bid: number; // Price in cents
  yes_ask: number;
  no_bid: number;
  no_ask: number;
  last_price: number;
  volume: number;
  open_interest: number;
  result?: string;
}

export interface KalshiEvent {
  event_ticker: string;
  title: string;
  category: string;
  sub_title?: string;
  markets: KalshiMarket[];
  status: string;
}

export interface KalshiEventsResponse {
  events: KalshiEvent[];
  cursor?: string;
}

export interface PolymarketEventsResponse {
  events?: PolymarketEvent[];
  data?: PolymarketEvent[];
}

// Unified Market Interface for Arbitrage Detection
export interface UnifiedMarket {
  id: string;
  eventName: string;
  normalizedName: string; // For matching
  polyPrice: number | null; // In cents (0-100)
  kalshiPrice: number | null; // In cents (0-100)
  spread: number; // Absolute difference
  spreadPercent: number; // Percentage
  urlPoly: string | null;
  urlKalshi: string | null;
  polyVolume: string | null;
  kalshiVolume: number | null;
  matchConfidence: "high" | "medium" | "low";
  hasArbitrage: boolean;
  arbitrageDirection: "buy_poly" | "buy_kalshi" | null;
}

// Normalized market data before matching
export interface NormalizedPolyMarket {
  id: string;
  eventName: string;
  normalizedName: string;
  price: number; // In cents
  url: string;
  volume: string;
  keywords: string[];
}

export interface NormalizedKalshiMarket {
  ticker: string;
  eventName: string;
  normalizedName: string;
  price: number; // In cents
  url: string;
  volume: number;
  keywords: string[];
}

// API Fetch Status
export type FetchStatus = "idle" | "loading" | "success" | "error";

export interface ApiState<T> {
  data: T | null;
  status: FetchStatus;
  error: string | null;
  lastUpdated: Date | null;
}

// Table sorting
export type SortDirection = "asc" | "desc";
export type SortField = "eventName" | "polyPrice" | "kalshiPrice" | "spread" | "spreadPercent";

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

// Filter options
export interface FilterConfig {
  minSpread: number;
  showOnlyArbitrage: boolean;
  searchQuery: string;
}
