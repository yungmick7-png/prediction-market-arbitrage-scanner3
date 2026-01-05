# 🎯 ArbScanner - Prediction Market Arbitrage Scanner

A DefiLlama-inspired, minimalist dark-mode dashboard for detecting arbitrage opportunities between **Polymarket** and **Kalshi** prediction markets.

![ArbScanner Preview](preview.png)

## Features

- 📊 **Real-time Odds Comparison** - Side-by-side pricing from Polymarket & Kalshi
- 🔍 **Smart Matching Algorithm** - Keyword-based event matching with confidence scores
- ⚡ **Arbitrage Detection** - Highlights spreads >5% as opportunities
- 🎨 **DefiLlama Aesthetic** - Industrial, data-dense, monospace numbers
- 🔄 **Auto-refresh** - Updates every 60 seconds
- 📱 **Responsive Design** - Works on mobile and desktop

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Language:** TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/arb-scanner.git
cd arb-scanner

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
arb-scanner/
├── app/
│   ├── globals.css      # Global styles + Tailwind
│   ├── layout.tsx       # Root layout with fonts
│   └── page.tsx         # Main page component
├── components/
│   └── ArbTable.tsx     # Arbitrage data table
├── types/
│   └── index.ts         # TypeScript interfaces
├── utils/
│   └── fetcher.ts       # API fetchers + matching logic
├── tailwind.config.ts   # Tailwind configuration
├── tsconfig.json        # TypeScript config
└── package.json
```

## API Data Sources

### Polymarket (Gamma API)
- **Endpoint:** `https://gamma-api.polymarket.com/events`
- **Filter:** Political/election events
- **Price Format:** Decimal (0.55) → Converted to cents (55¢)

### Kalshi (Trade API v2)
- **Endpoint:** `https://api.elections.kalshi.com/trade-api/v2/events`
- **Filter:** Active markets, political category
- **Price Format:** Already in cents (55)

## Matching Algorithm

The `normalizeAndMatch()` function uses:

1. **Keyword Extraction** - Parses event names for key terms
2. **Jaccard Similarity** - Measures keyword overlap
3. **Key Term Boost** - Extra weight for political terms (Trump, Biden, etc.)
4. **Confidence Scoring** - High (≥60%), Medium (≥40%), Low (<40%)

## Arbitrage Logic

```typescript
// Spread calculation
spread = Math.abs(polyPrice - kalshiPrice)
spreadPercent = (spread / avgPrice) * 100

// Arbitrage threshold
hasArbitrage = spreadPercent > 5%
```

## Customization

### Change Theme Colors

Edit `tailwind.config.ts`:

```typescript
colors: {
  background: "#0a0a0a",  // Main background
  card: "#111111",        // Card backgrounds
  emerald: { ... }        // Accent color
}
```

### Add More Data Sources

1. Add types to `types/index.ts`
2. Create fetcher function in `utils/fetcher.ts`
3. Update `normalizeAndMatch()` to include new source

## Known Limitations

- APIs may rate-limit or block requests (fallback to demo data)
- Matching algorithm is heuristic-based (not 100% accurate)
- No real-time WebSocket updates (polling every 60s)

## Disclaimer

⚠️ This tool is for **informational purposes only**. Always verify prices directly on trading platforms. Prediction market arbitrage involves risks including:

- Liquidity differences
- Trading fees
- Settlement timing
- Regulatory considerations

**Not financial advice.**

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Pull requests welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

---

Built with ☕ and TypeScript
