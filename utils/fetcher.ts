// ============================================
// API FETCHERS & ARBITRAGE MATCHING LOGIC
// ============================================

import {
  PolymarketEvent,
  KalshiEvent,
  KalshiEventsResponse,
  NormalizedPolyMarket,
  NormalizedKalshiMarket,
  UnifiedMarket,
} from "@/types";

// ============================================
// CONSTANTS
// ============================================

const POLYMARKET_API = "https://gamma-api.polymarket.com/events";
const KALSHI_API = "https://api.elections.kalshi.com/trade-api/v2/events";

const POLITICAL_KEYWORDS = [
  "trump",
  "biden",
  "harris",
  "president",
  "election",
  "republican",
  "democrat",
  "senate",
  "congress",
  "governor",
  "vote",
  "electoral",
  "primary",
  "nominee",
  "vance",
  "walz",
  "cabinet",
  "inauguration",
  "popular vote",
  "swing state",
];

// ============================================
// POLYMARKET FETCHER
// ============================================

export async function fetchPolymarketEvents(): Promise<PolymarketEvent[]> {
  try {
    const response = await fetch(
      `${POLYMARKET_API}?active=true&closed=false&limit=100`,
      {
        headers: {
          Accept: "application/json",
        },
        next: { revalidate: 60 },
      }
    );

    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status}`);
    }

    const data = await response.json();

    const events: PolymarketEvent[] = Array.isArray(data)
      ? data
      : data.events || data.data || [];

    return events.filter((event) => {
      const text = `${event.title} ${event.description || ""} ${event.slug}`.toLowerCase();
      const tags = (event.tags || []).map((t) => t.toLowerCase());

      const hasPoliticalKeyword = POLITICAL_KEYWORDS.some(
        (kw) => text.includes(kw) || tags.some((tag) => tag.includes(kw))
      );

      const isPoliticalCategory =
        event.category?.toLowerCase().includes("politic") ||
        tags.includes("politics") ||
        tags.includes("elections");

      return hasPoliticalKeyword || isPoliticalCategory;
    });
  } catch (error) {
    console.error("Failed to fetch Polymarket events:", error);
    throw error;
  }
}

// ============================================
// KALSHI FETCHER
// ============================================

export async function fetchKalshiEvents(): Promise<KalshiEvent[]> {
  try {
    const response = await fetch(`${KALSHI_API}?status=open&limit=100`, {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(`Kalshi API error: ${response.status}`);
    }

    const data: KalshiEventsResponse = await response.json();
    const events = data.events || [];

    return events.filter((event) => {
      const text = `${event.title} ${event.sub_title || ""} ${event.category}`.toLowerCase();

      return (
        POLITICAL_KEYWORDS.some((kw) => text.includes(kw)) ||
        event.category?.toLowerCase().includes("politic")
      );
    });
  } catch (error) {
    console.error("Failed to fetch Kalshi events:", error);
    throw error;
  }
}

// ============================================
// NORMALIZATION FUNCTIONS
// ============================================

function extractKeywords(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const compounds: string[] = [];
  if (normalized.includes("trump")) compounds.push("trump");
  if (normalized.includes("biden")) compounds.push("biden");
  if (normalized.includes("harris")) compounds.push("harris");
  if (normalized.includes("president") || normalized.includes("presidential"))
    compounds.push("president");
  if (normalized.includes("election")) compounds.push("election");
  if (normalized.includes("2024")) compounds.push("2024");
  if (normalized.includes("2025")) compounds.push("2025");
  if (normalized.includes("win") || normalized.includes("winner"))
    compounds.push("winner");

  return Array.from(new Set([...normalized, ...compounds]));
}

function normalizeEventName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizePolymarketEvents(
  events: PolymarketEvent[]
): NormalizedPolyMarket[] {
  const markets: NormalizedPolyMarket[] = [];

  for (const event of events) {
    for (const market of event.markets || []) {
      if (market.closed || !market.active) continue;

      let yesPrice = 0;
      try {
        const prices = JSON.parse(market.outcomePrices || "[]");
        const outcomes = JSON.parse(market.outcomes || '["Yes", "No"]');

        const yesIndex = outcomes.findIndex(
          (o: string) => o.toLowerCase() === "yes"
        );
        yesPrice = yesIndex >= 0 ? parseFloat(prices[yesIndex]) : parseFloat(prices[0]);
        yesPrice = Math.round(yesPrice * 100);
      } catch {
        yesPrice = 50;
      }

      const eventName = market.groupItemTitle || market.question || event.title;

      markets.push({
        id: market.id,
        eventName,
        normalizedName: normalizeEventName(eventName),
        price: yesPrice,
        url: `https://polymarket.com/event/${event.slug}`,
        volume: market.volume || "0",
        keywords: extractKeywords(eventName),
      });
    }
  }

  return markets;
}

export function normalizeKalshiEvents(
  events: KalshiEvent[]
): NormalizedKalshiMarket[] {
  const markets: NormalizedKalshiMarket[] = [];

  for (const event of events) {
    for (const market of event.markets || []) {
      if (market.status !== "active") continue;

      const yesPrice = market.yes_bid || market.last_price || 50;
      const eventName = market.title || event.title;

      markets.push({
        ticker: market.ticker,
        eventName,
        normalizedName: normalizeEventName(eventName),
        price: yesPrice,
        url: `https://kalshi.com/markets/${market.ticker}`,
        volume: market.volume || 0,
        keywords: extractKeywords(eventName),
      });
    }
  }

  return markets;
}

// ============================================
// MATCHING ALGORITHM
// ============================================

function calculateMatchScore(
  poly: NormalizedPolyMarket,
  kalshi: NormalizedKalshiMarket
): number {
  const polyKeywords = poly.keywords;
  const kalshiKeywords = kalshi.keywords;

  // Count matching keywords
  let matches = 0;
  for (let i = 0; i < polyKeywords.length; i++) {
    if (kalshiKeywords.includes(polyKeywords[i])) matches++;
  }

  // Calculate Jaccard similarity
  const unionSet = new Set([...polyKeywords, ...kalshiKeywords]);
  const unionSize = unionSet.size;
  const jaccard = matches / unionSize;

  // Boost for key political terms
  const keyTerms = ["trump", "biden", "harris", "president", "2024", "winner"];
  let keyTermBoost = 0;
  for (let i = 0; i < keyTerms.length; i++) {
    const term = keyTerms[i];
    if (polyKeywords.includes(term) && kalshiKeywords.includes(term)) {
      keyTermBoost += 0.15;
    }
  }

  return Math.min(jaccard + keyTermBoost, 1);
}

function getMatchConfidence(score: number): "high" | "medium" | "low" {
  if (score >= 0.6) return "high";
  if (score >= 0.4) return "medium";
  return "low";
}

export function normalizeAndMatch(
  polyMarkets: NormalizedPolyMarket[],
  kalshiMarkets: NormalizedKalshiMarket[]
): UnifiedMarket[] {
  const unifiedMarkets: UnifiedMarket[] = [];
  const usedKalshi = new Set<string>();

  for (const poly of polyMarkets) {
    let bestMatch: NormalizedKalshiMarket | null = null;
    let bestScore = 0;

    for (const kalshi of kalshiMarkets) {
      if (usedKalshi.has(kalshi.ticker)) continue;

      const score = calculateMatchScore(poly, kalshi);
      if (score > bestScore && score >= 0.3) {
        bestScore = score;
        bestMatch = kalshi;
      }
    }

    if (bestMatch && bestScore >= 0.3) {
      usedKalshi.add(bestMatch.ticker);

      const spread = Math.abs(poly.price - bestMatch.price);
      const avgPrice = (poly.price + bestMatch.price) / 2;
      const spreadPercent = avgPrice > 0 ? (spread / avgPrice) * 100 : 0;

      unifiedMarkets.push({
        id: `${poly.id}-${bestMatch.ticker}`,
        eventName: poly.eventName,
        normalizedName: poly.normalizedName,
        polyPrice: poly.price,
        kalshiPrice: bestMatch.price,
        spread,
        spreadPercent,
        urlPoly: poly.url,
        urlKalshi: bestMatch.url,
        polyVolume: poly.volume,
        kalshiVolume: bestMatch.volume,
        matchConfidence: getMatchConfidence(bestScore),
        hasArbitrage: spreadPercent > 5,
        arbitrageDirection:
          spreadPercent > 3
            ? poly.price < bestMatch.price
              ? "buy_poly"
              : "buy_kalshi"
            : null,
      });
    } else {
      unifiedMarkets.push({
        id: poly.id,
        eventName: poly.eventName,
        normalizedName: poly.normalizedName,
        polyPrice: poly.price,
        kalshiPrice: null,
        spread: 0,
        spreadPercent: 0,
        urlPoly: poly.url,
        urlKalshi: null,
        polyVolume: poly.volume,
        kalshiVolume: null,
        matchConfidence: "low",
        hasArbitrage: false,
        arbitrageDirection: null,
      });
    }
  }

  for (const kalshi of kalshiMarkets) {
    if (!usedKalshi.has(kalshi.ticker)) {
      unifiedMarkets.push({
        id: kalshi.ticker,
        eventName: kalshi.eventName,
        normalizedName: kalshi.normalizedName,
        polyPrice: null,
        kalshiPrice: kalshi.price,
        spread: 0,
        spreadPercent: 0,
        urlPoly: null,
        urlKalshi: kalshi.url,
        polyVolume: null,
        kalshiVolume: kalshi.volume,
        matchConfidence: "low",
        hasArbitrage: false,
        arbitrageDirection: null,
      });
    }
  }

  return unifiedMarkets.sort((a, b) => b.spreadPercent - a.spreadPercent);
}

// ============================================
// DUMMY DATA
// ============================================

export function getDummyData(): UnifiedMarket[] {
  return [
    {
      id: "dummy-1",
      eventName: "Trump wins 2024 Presidential Election",
      normalizedName: "trump wins 2024 presidential election",
      polyPrice: 52,
      kalshiPrice: 58,
      spread: 6,
      spreadPercent: 10.9,
      urlPoly: "https://polymarket.com/event/presidential-election-winner-2024",
      urlKalshi: "https://kalshi.com/markets/PRES-2024",
      polyVolume: "125000000",
      kalshiVolume: 45000000,
      matchConfidence: "high",
      hasArbitrage: true,
      arbitrageDirection: "buy_poly",
    },
    {
      id: "dummy-2",
      eventName: "Harris wins 2024 Presidential Election",
      normalizedName: "harris wins 2024 presidential election",
      polyPrice: 47,
      kalshiPrice: 41,
      spread: 6,
      spreadPercent: 13.6,
      urlPoly: "https://polymarket.com/event/presidential-election-winner-2024",
      urlKalshi: "https://kalshi.com/markets/PRES-2024",
      polyVolume: "98000000",
      kalshiVolume: 38000000,
      matchConfidence: "high",
      hasArbitrage: true,
      arbitrageDirection: "buy_kalshi",
    },
    {
      id: "dummy-3",
      eventName: "Republicans win Senate majority",
      normalizedName: "republicans win senate majority",
      polyPrice: 78,
      kalshiPrice: 75,
      spread: 3,
      spreadPercent: 3.9,
      urlPoly: "https://polymarket.com/event/senate-control-2024",
      urlKalshi: "https://kalshi.com/markets/SENATE-2024",
      polyVolume: "45000000",
      kalshiVolume: 12000000,
      matchConfidence: "high",
      hasArbitrage: false,
      arbitrageDirection: "buy_kalshi",
    },
    {
      id: "dummy-4",
      eventName: "Democrats win House majority",
      normalizedName: "democrats win house majority",
      polyPrice: 32,
      kalshiPrice: 35,
      spread: 3,
      spreadPercent: 8.9,
      urlPoly: "https://polymarket.com/event/house-control-2024",
      urlKalshi: "https://kalshi.com/markets/HOUSE-2024",
      polyVolume: "28000000",
      kalshiVolume: 8500000,
      matchConfidence: "high",
      hasArbitrage: true,
      arbitrageDirection: "buy_poly",
    },
    {
      id: "dummy-5",
      eventName: "Trump wins Pennsylvania",
      normalizedName: "trump wins pennsylvania",
      polyPrice: 54,
      kalshiPrice: 52,
      spread: 2,
      spreadPercent: 3.8,
      urlPoly: "https://polymarket.com/event/pennsylvania-2024",
      urlKalshi: "https://kalshi.com/markets/PA-2024",
      polyVolume: "18000000",
      kalshiVolume: 5200000,
      matchConfidence: "medium",
      hasArbitrage: false,
      arbitrageDirection: null,
    },
    {
      id: "dummy-6",
      eventName: "Trump wins Georgia",
      normalizedName: "trump wins georgia",
      polyPrice: 58,
      kalshiPrice: 55,
      spread: 3,
      spreadPercent: 5.3,
      urlPoly: "https://polymarket.com/event/georgia-2024",
      urlKalshi: "https://kalshi.com/markets/GA-2024",
      polyVolume: "15000000",
      kalshiVolume: 4800000,
      matchConfidence: "medium",
      hasArbitrage: true,
      arbitrageDirection: "buy_kalshi",
    },
    {
      id: "dummy-7",
      eventName: "Trump wins Michigan",
      normalizedName: "trump wins michigan",
      polyPrice: 48,
      kalshiPrice: 51,
      spread: 3,
      spreadPercent: 6.1,
      urlPoly: "https://polymarket.com/event/michigan-2024",
      urlKalshi: "https://kalshi.com/markets/MI-2024",
      polyVolume: "14000000",
      kalshiVolume: 4200000,
      matchConfidence: "medium",
      hasArbitrage: true,
      arbitrageDirection: "buy_poly",
    },
    {
      id: "dummy-8",
      eventName: "Trump wins Arizona",
      normalizedName: "trump wins arizona",
      polyPrice: 56,
      kalshiPrice: 54,
      spread: 2,
      spreadPercent: 3.6,
      urlPoly: "https://polymarket.com/event/arizona-2024",
      urlKalshi: "https://kalshi.com/markets/AZ-2024",
      polyVolume: "12000000",
      kalshiVolume: 3800000,
      matchConfidence: "medium",
      hasArbitrage: false,
      arbitrageDirection: null,
    },
    {
      id: "dummy-9",
      eventName: "Electoral college tie (269-269)",
      normalizedName: "electoral college tie",
      polyPrice: 1,
      kalshiPrice: 2,
      spread: 1,
      spreadPercent: 66.7,
      urlPoly: "https://polymarket.com/event/electoral-tie-2024",
      urlKalshi: "https://kalshi.com/markets/EC-TIE-2024",
      polyVolume: "2000000",
      kalshiVolume: 450000,
      matchConfidence: "high",
      hasArbitrage: true,
      arbitrageDirection: "buy_poly",
    },
    {
      id: "dummy-10",
      eventName: "Trump wins popular vote",
      normalizedName: "trump wins popular vote",
      polyPrice: 38,
      kalshiPrice: 42,
      spread: 4,
      spreadPercent: 10.0,
      urlPoly: "https://polymarket.com/event/popular-vote-2024",
      urlKalshi: "https://kalshi.com/markets/POPVOTE-2024",
      polyVolume: "8500000",
      kalshiVolume: 2800000,
      matchConfidence: "high",
      hasArbitrage: true,
      arbitrageDirection: "buy_poly",
    },
    {
      id: "dummy-11",
      eventName: "Biden drops out before election",
      normalizedName: "biden drops out before election",
      polyPrice: 95,
      kalshiPrice: 94,
      spread: 1,
      spreadPercent: 1.1,
      urlPoly: "https://polymarket.com/event/biden-dropout",
      urlKalshi: "https://kalshi.com/markets/BIDEN-DROP",
      polyVolume: "35000000",
      kalshiVolume: 15000000,
      matchConfidence: "high",
      hasArbitrage: false,
      arbitrageDirection: null,
    },
    {
      id: "dummy-12",
      eventName: "Third party candidate gets >5% votes",
      normalizedName: "third party candidate votes",
      polyPrice: 8,
      kalshiPrice: 12,
      spread: 4,
      spreadPercent: 40.0,
      urlPoly: "https://polymarket.com/event/third-party-2024",
      urlKalshi: "https://kalshi.com/markets/3RD-PARTY-2024",
      polyVolume: "3200000",
      kalshiVolume: 980000,
      matchConfidence: "medium",
      hasArbitrage: true,
      arbitrageDirection: "buy_poly",
    },
    {
      id: "dummy-13",
      eventName: "Trump wins Wisconsin",
      normalizedName: "trump wins wisconsin",
      polyPrice: 49,
      kalshiPrice: 47,
      spread: 2,
      spreadPercent: 4.2,
      urlPoly: "https://polymarket.com/event/wisconsin-2024",
      urlKalshi: "https://kalshi.com/markets/WI-2024",
      polyVolume: "11000000",
      kalshiVolume: 3500000,
      matchConfidence: "medium",
      hasArbitrage: false,
      arbitrageDirection: null,
    },
    {
      id: "dummy-14",
      eventName: "Trump wins Nevada",
      normalizedName: "trump wins nevada",
      polyPrice: 53,
      kalshiPrice: 50,
      spread: 3,
      spreadPercent: 5.8,
      urlPoly: "https://polymarket.com/event/nevada-2024",
      urlKalshi: "https://kalshi.com/markets/NV-2024",
      polyVolume: "9500000",
      kalshiVolume: 2900000,
      matchConfidence: "medium",
      hasArbitrage: true,
      arbitrageDirection: "buy_kalshi",
    },
    {
      id: "dummy-15",
      eventName: "Trump wins North Carolina",
      normalizedName: "trump wins north carolina",
      polyPrice: 62,
      kalshiPrice: 60,
      spread: 2,
      spreadPercent: 3.3,
      urlPoly: "https://polymarket.com/event/north-carolina-2024",
      urlKalshi: "https://kalshi.com/markets/NC-2024",
      polyVolume: "10500000",
      kalshiVolume: 3200000,
      matchConfidence: "medium",
      hasArbitrage: false,
      arbitrageDirection: null,
    },
  ];
}

// ============================================
// MAIN FETCH FUNCTION
// ============================================

export async function fetchAllMarkets(): Promise<{
  markets: UnifiedMarket[];
  usedDummy: boolean;
  error: string | null;
}> {
  try {
    const [polyEvents, kalshiEvents] = await Promise.all([
      fetchPolymarketEvents(),
      fetchKalshiEvents(),
    ]);

    const polyMarkets = normalizePolymarketEvents(polyEvents);
    const kalshiMarkets = normalizeKalshiEvents(kalshiEvents);

    const unifiedMarkets = normalizeAndMatch(polyMarkets, kalshiMarkets);

    if (unifiedMarkets.length < 3) {
      return {
        markets: getDummyData(),
        usedDummy: true,
        error: "Limited API data - showing demo data",
      };
    }

    return {
      markets: unifiedMarkets,
      usedDummy: false,
      error: null,
    };
  } catch (error) {
    console.error("API fetch failed, using dummy data:", error);
    return {
      markets: getDummyData(),
      usedDummy: true,
      error: error instanceof Error ? error.message : "Failed to fetch data",
    };
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function formatPrice(price: number | null): string {
  if (price === null) return "—";
  return `${price}¢`;
}

export function formatSpread(spread: number): string {
  return spread.toFixed(1);
}

export function formatSpreadPercent(percent: number): string {
  return `${percent.toFixed(1)}%`;
}

export function formatVolume(volume: string | number | null): string {
  if (volume === null) return "—";
  const num = typeof volume === "string" ? parseFloat(volume) : volume;
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}
