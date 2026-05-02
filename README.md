# Tamil Nadu Election Results 2026 — Live Dashboard

Real-time election results dashboard for all 234 Tamil Nadu Assembly constituencies. Built for speed, built for scale, built for the people of Tamil Nadu.

**Live:** [tn-elections-2026.pages.dev](https://tn-elections-2026.pages.dev)

![Dashboard Preview](https://img.shields.io/badge/status-live-brightgreen) ![Seats](https://img.shields.io/badge/constituencies-234-blue) ![Cache](https://img.shields.io/badge/cache-30s%20edge-orange)

---

## Features

- **Interactive map** of all 234 constituencies, color-coded by leading party. Click any constituency for full candidate breakdown.
- **Alliance seat tracker** with animated majority line at 118 seats.
- **Majority Watch** — live distance-to-majority counter with progress bar.
- **Key Races to Watch** — horizontal scrollable cards for the tightest contests (margin < 2,000 votes).
- **Searchable constituency table** — filter by district, party, status. Sort by any column.
- **Party-wise charts** — seats bar chart and vote share doughnut.
- **Leader sidebars** — Stalin (DMK), Vijay (TVK, dual-seat), EPS (AIADMK), Seeman (NTK) with live seat status.
- **Mobile Leaders tab** — 4th tab appears on mobile (where sidebars are hidden), shows all leader cards in a responsive grid.
- **Count-up animations** — stat card numbers animate smoothly on every data refresh.
- **Auto-refresh** every 30 seconds with countdown timer.
- **Dark theme**, DM Sans typography, fully responsive.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User's Browser                           │
│  Static HTML/CSS/JS loads from Cloudflare CDN (<100ms)      │
│  JS calls /api/results every 30s                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Cloudflare Pages (Edge Network)                 │
│                                                             │
│  Static Assets     │  Pages Functions (/api/*)              │
│  index.html        │                                        │
│  JS/CSS bundles    │  /api/results                          │
│  images, GeoJSON   │    ├─ Check KV cache (< 30s old?)      │
│  mock_results.json │    │   YES → return cached JSON (~5ms) │
│                    │    │   NO  → fetch from ECI            │
│                    │    │         transform to JSON          │
│                    │    │         store in KV                │
│                    │    │         return fresh JSON          │
│                    │    │                                    │
│                    │  /api/health                            │
│                    │    └─ Returns status, mode, cache TTL   │
└────────────────────┴────────────────────────────────────────┘
                       │
                       │ (once per 30s, on cache miss)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           Election Commission of India                      │
│           results.eci.gov.in                                │
│           (raw HTML/JSON constituency data)                  │
└─────────────────────────────────────────────────────────────┘
```

### Why this works at scale

- **ECI is hit at most 2 times per minute**, regardless of how many users are on the site.
- **Cloudflare KV** stores the transformed JSON with a 30s TTL. Every request within that window gets the cached response in ~5ms.
- **Static assets** (HTML, JS, CSS, images, GeoJSON) are served from Cloudflare's CDN edge — no origin server involved.
- **Zero backend servers.** The entire stack is serverless: Cloudflare Pages for static files, Pages Functions for the API, KV for caching.
- **Graceful degradation:** If ECI goes down, the function serves the last known good data from KV (`X-Cache: STALE`). Users never see an error page.

### Data flow on counting day

1. User opens the site. Static assets load from CDN (<100ms).
2. JavaScript calls `/api/results`. Gets cached JSON from KV (~5ms). Renders dashboard.
3. Every 30 seconds, JS polls again. If the KV cache expired, the Pages Function fetches fresh data from ECI, transforms it (party names → abbreviations, alliance mapping, margin calculation), stores in KV, returns JSON.
4. The UI animates the transition: numbers count up, bars shift, map recolors, new key races appear.

**User-perceived latency: under 50ms for every refresh.** The heavy ECI fetch + transform happens server-side, invisibly.

## Project Structure

```
├── src/                          # Frontend source (Vite)
│   ├── index.html                # Single page — header, stats, alliance bar, tabs, sidebars
│   ├── css/style.css             # Dark theme, responsive, all component styles
│   └── js/
│       ├── app.js                # Main: stats, alliance bar, majority watch, key races,
│       │                         #       leader sidebars, table, tab switching, animations
│       ├── data.js               # Polling: fetches /api/results (prod) or mock (dev)
│       ├── map.js                # Leaflet map with GeoJSON, tooltips, click-to-detail
│       ├── charts.js             # Chart.js — party seats bar + vote share doughnut
│       └── constituency.js       # Modal: full candidate breakdown for a single seat
│
├── public/                       # Static assets (copied to dist/ on build)
│   ├── mock_results.json         # Mock data for all 234 constituencies
│   ├── parties.json              # Party colors, alliance mappings
│   ├── tn-constituencies.geojson # Boundary polygons for 234 ACs
│   ├── images/leaders/           # Stalin, Vijay, EPS, Seeman photos
│   └── images/parties/           # DMK, AIADMK, TVK, NTK, BJP logos
│
├── functions/                    # Cloudflare Pages Functions (API)
│   └── api/
│       ├── results.js            # /api/results — KV-cached proxy to ECI
│       ├── results.MAY4.js       # Template for live ECI integration
│       ├── _transform.js         # ECI → dashboard JSON transformer
│       └── health.js             # /api/health — status check
│
├── data/                         # Data pipeline tools
│   └── transform_eci.py          # Python version of ECI transformer (for testing)
│
├── test-eci/                     # Mock ECI worker (for cache/load testing)
│   ├── index.js                  # 5 rotating election phases, KV hit counter
│   └── wrangler.toml
│
├── vite.config.js                # Vite build config
├── wrangler.jsonc                # Cloudflare Pages config + KV bindings
└── LOG.md                        # Full build log and decisions
```

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Vanilla JS + Vite | Zero-framework, fast builds, tree-shaking |
| Map | Leaflet.js + GeoJSON | Interactive constituency map with custom styling |
| Charts | Chart.js | Party seats bar chart, vote share doughnut |
| Hosting | Cloudflare Pages | Global CDN, static assets + serverless functions |
| API Cache | Cloudflare KV | 30s TTL response cache, ~5ms reads |
| Data Source | ECI (results.eci.gov.in) | Official Election Commission live data |
| Font | DM Sans | Clean, modern, good tabular number support |

## Development

```bash
# Install dependencies
npm install

# Local dev (hot-reload, uses mock data)
npm run dev

# Local dev with API (tests Pages Functions + KV cache)
npm run build && npx wrangler pages dev dist/

# Deploy to Cloudflare Pages
npm run build && npx wrangler pages deploy dist/ --project-name tn-elections-2026

# Run the mock ECI server (for cache/load testing)
cd test-eci && npx wrangler deploy -c wrangler.toml
```

### Testing the cache

Open `/cache-test.html` on the deployed site. It fires requests and shows:
- **X-Cache HIT/MISS** for each request
- **Upstream ECI hit count** (via KV counter on the mock server)
- Proof that thousands of users share one cached response

### Switching to live ECI data

On counting day, one file change:

```bash
cp functions/api/results.MAY4.js functions/api/results.js
# Edit: replace ECI_URL with the real endpoint
# Deploy:
npm run build && npx wrangler pages deploy dist/ --project-name tn-elections-2026
```

## Design Decisions

- **No framework (React/Vue/Svelte).** For a read-only dashboard with 30s refresh cycles, vanilla JS is faster to load, simpler to debug, and has zero hydration overhead. The entire JS bundle is 25KB gzipped.
- **KV over Cache API.** Cloudflare's `cache.put()` doesn't work on `.pages.dev` subdomains. KV is reliable everywhere and gives us explicit TTL control.
- **Alliance-first, not party-first.** Tamil Nadu elections are fought on alliance lines. The UI groups results by alliance (DMK+, AIADMK+, TVK+, NTK) rather than individual parties.
- **Muted party colors.** Saturated party colors cause eye strain on a data-dense dark dashboard. We use desaturated variants that still read clearly.
- **Server-side transform.** The ECI data format is messy (HTML tables, inconsistent field names). We parse and normalize it server-side so the frontend always gets clean, predictable JSON.

## Data Sources & Credits

- **Election data:** [Election Commission of India](https://results.eci.gov.in)
- **Constituency boundaries:** [DataMeet Community Maps](https://github.com/datameet) (CC BY 4.0)
- **Leader photos:** Wikipedia (CC BY-SA / public domain)
- **Party logos:** Official party sources

## License

MIT — use it, fork it, build on it.
