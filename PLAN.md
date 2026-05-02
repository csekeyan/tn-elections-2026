# Tamil Nadu Election Results 2026 - LIVE Dashboard

> Master Plan & Continuation Guide
> Created: 2026-05-01 21:50 PDT
> Owner: Karthikeyan Gopal (kgnmzn@)
> Counting Day: 2026-05-04 (Sunday)

---

## Quick Resume Guide

If starting a new session, tell Aki:
> "Read /Users/kgnmzn/Desktop/AI/Experiments/TN_Elections/PLAN.md and LOG.md, then continue building from where we left off."

Check LOG.md for the latest completed step and current status.

---

## 1. Project Overview

Real-time Tamil Nadu Assembly Election Results dashboard. 234 constituencies.
Static site + edge-cached data proxy. Zero backend servers. Scales to millions for free.

### Goals
- Sub-1-second page load
- Auto-refresh every 30 seconds
- Interactive color-coded TN map
- Drill-down: State -> District -> Constituency
- Search/filter constituencies
- Mobile-first responsive design
- 100% free hosting

---

## 2. Architecture

```
[ECI / Backup Sources]
        |
        v (every 30s)
[Cloudflare Worker] -- caches JSON response (30s TTL)
        |
        v
[Cloudflare Pages] -- static HTML/JS/CSS (global CDN)
        |
        v
[User Browser] -- all rendering happens client-side
```

### Tech Stack
| Component | Technology | Reason |
|-----------|-----------|--------|
| Build tool | Vite | Fast builds, hot reload |
| Framework | Vanilla JS (no React) | Minimal bundle, fast load |
| Styling | TailwindCSS | Rapid development, responsive |
| Maps | Leaflet.js | Lightweight, touch-friendly |
| Charts | Chart.js | Simple, performant |
| Map data | GeoJSON (DataMeet/custom) | TN 234 constituency boundaries |
| Data proxy | Cloudflare Worker | Edge-cached, free 100K req/day |
| Hosting | Cloudflare Pages | Free, unlimited bandwidth, global CDN |
| Domain | *.pages.dev (free) | No cost |

---

## 3. Directory Structure

```
TN_Elections/
├── PLAN.md                    # This file - master plan
├── LOG.md                     # Change log - updated after every change
├── DOCS.md                    # Technical documentation
├── README.md                  # Public-facing readme
│
├── src/                       # Source code
│   ├── index.html             # Main entry point
│   ├── css/
│   │   └── style.css          # TailwindCSS + custom styles
│   ├── js/
│   │   ├── app.js             # Main app initialization
│   │   ├── data.js            # Data fetching + polling logic
│   │   ├── map.js             # Leaflet map rendering
│   │   ├── charts.js          # Chart.js visualizations
│   │   ├── search.js          # Constituency search/filter
│   │   ├── constituency.js    # Constituency detail view
│   │   └── utils.js           # Shared utilities
│   └── assets/
│       ├── tn-constituencies.geojson  # TN map boundaries
│       ├── candidates.json     # Pre-populated candidate data
│       ├── parties.json        # Party colors, names, alliance info
│       └── images/             # Party logos, fallback avatars
│
├── worker/                    # Cloudflare Worker (data proxy)
│   ├── index.js               # Worker script
│   └── wrangler.toml          # Worker config
│
├── data/                      # Static data preparation
│   ├── scrape_candidates.py   # Script to fetch candidate list from ECI
│   ├── prepare_geojson.py     # Script to clean/validate GeoJSON
│   └── mock_results.json      # Mock data for development/testing
│
├── vite.config.js             # Vite configuration
├── tailwind.config.js         # Tailwind configuration
├── package.json               # Dependencies
└── .gitignore
```

---

## 4. Step-by-Step Build Plan

### PHASE 1: Foundation (May 1 evening)

#### Step 1.1: Project Setup
- [ ] Initialize npm project
- [ ] Install dependencies: vite, tailwindcss, leaflet, chart.js
- [ ] Configure Vite for static site build
- [ ] Configure TailwindCSS
- [ ] Create directory structure
- [ ] Create .gitignore
- [ ] Initialize git repo

#### Step 1.2: Get Map Data
- [ ] Find TN assembly constituency GeoJSON from DataMeet GitHub
- [ ] Download and validate it has all 234 constituencies
- [ ] Clean up properties (standardize constituency names, IDs)
- [ ] If DataMeet doesn't have it, find alternative sources
- [ ] Validate GeoJSON renders correctly with Leaflet

#### Step 1.3: Prepare Static Data
- [ ] Create parties.json with all major parties, colors, alliance groupings
  - DMK alliance (DMK, Congress, VCK, CPI, CPI-M, IUML, MDMK, etc.)
  - ADMK alliance (ADMK, PMK, etc.)
  - NTK (Naam Tamilar Katchi)
  - BJP alliance (BJP, etc.)
  - Others
- [ ] Create mock_results.json with realistic fake data for all 234 seats
- [ ] Gather candidate data (scrape from ECI or MyNeta if available)

#### Step 1.4: Build HTML Shell
- [ ] Create index.html with responsive layout
- [ ] Header: "TN Election Results 2026 LIVE"
- [ ] Hero section: Big numbers (seats won, leading, total)
- [ ] Sections: Alliance summary, Map, Constituency list
- [ ] Footer: Data source attribution, refresh indicator
- [ ] Mobile-first CSS

### PHASE 2: Core Features (May 2)

#### Step 2.1: Data Layer
- [ ] Build data.js - fetches results JSON (mock for now)
- [ ] Implement 30-second auto-refresh with visual countdown
- [ ] Data normalization: map ECI data format to our internal format
- [ ] Event system: data updates trigger UI re-renders
- [ ] Offline/error handling: show "last updated" time, retry logic

#### Step 2.2: Dashboard Charts
- [ ] Alliance-wise seat count (horizontal stacked bar)
- [ ] Party-wise seat count (bar chart)
- [ ] Vote share pie/donut chart
- [ ] Won vs Leading vs Trailing breakdown
- [ ] All charts update on data refresh

#### Step 2.3: Interactive Map
- [ ] Render TN map with Leaflet + GeoJSON
- [ ] Color each constituency by leading party color
- [ ] Tooltip on hover: constituency name, leading candidate, margin
- [ ] Click to open constituency detail panel
- [ ] Legend showing party colors
- [ ] Zoom controls, fit-to-bounds
- [ ] District boundaries as overlay (thicker lines)

#### Step 2.4: Constituency Search & List
- [ ] Search bar with instant filter (fuzzy match)
- [ ] Filter by: district, party, status (won/leading/trailing)
- [ ] Sortable table: Constituency, District, Leading, Party, Margin
- [ ] Click row to expand detail view
- [ ] Virtual scrolling or pagination for performance

#### Step 2.5: Constituency Detail View
- [ ] Modal or slide-in panel
- [ ] All candidates: name, party, votes, vote share, photo
- [ ] Bar chart showing vote distribution
- [ ] Status badge: Counting, Leading, Won
- [ ] Round-wise trend (if data available)

### PHASE 3: Polish & Deploy (May 3)

#### Step 3.1: UI Polish
- [ ] Dark theme (election night feel)
- [ ] Animations: number counters, progress bars
- [ ] Loading skeleton screens
- [ ] Print-friendly styles
- [ ] Social share meta tags (Open Graph)
- [ ] Favicon, touch icons

#### Step 3.2: Performance
- [ ] Lighthouse audit: target 95+ on all metrics
- [ ] Lazy load map tiles
- [ ] Minimize bundle size (tree-shake unused chart types)
- [ ] Compress GeoJSON (simplify polygons if needed)
- [ ] Service worker for offline resilience

#### Step 3.3: Cloudflare Worker (Data Proxy)
- [ ] Create Cloudflare account (if needed)
- [ ] Write worker script:
  - Fetches from ECI API
  - Caches response for 30 seconds
  - Adds CORS headers
  - Returns cached JSON to frontend
- [ ] Deploy worker
- [ ] Test with ECI endpoint (or mock endpoint)

#### Step 3.4: Deploy to Cloudflare Pages
- [ ] Push code to GitHub repo
- [ ] Connect GitHub repo to Cloudflare Pages
- [ ] Configure build command: `npm run build`
- [ ] Configure output directory: `dist`
- [ ] Verify deployment works
- [ ] Test on mobile devices

#### Step 3.5: Pre-launch
- [ ] Write LinkedIn post #1 (preview + bookmark CTA)
- [ ] Create shareable preview image (screenshot of dashboard)
- [ ] Test with mock data end-to-end
- [ ] Prepare for data source switch

### PHASE 4: Launch Day (May 4)

#### Step 4.1: Go Live (6 AM IST)
- [ ] Check ECI results page is up
- [ ] Identify live API endpoints (inspect network tab on results.eci.gov.in)
- [ ] Update Cloudflare Worker with real endpoints
- [ ] Verify data flowing correctly
- [ ] Monitor for errors

#### Step 4.2: Promote
- [ ] LinkedIn post #2 with live link
- [ ] Share on Twitter/X
- [ ] WhatsApp status + groups

---

## 5. Data Format Specification

### Internal Results JSON Format
```json
{
  "lastUpdated": "2026-05-04T08:30:00+05:30",
  "totalSeats": 234,
  "countingStatus": "in_progress",
  "summary": {
    "declared": 12,
    "counting": 222
  },
  "alliances": [
    {
      "name": "DMK+",
      "parties": ["DMK", "INC", "VCK", "CPI", "CPIM", "IUML", "MDMK"],
      "won": 5,
      "leading": 120,
      "total": 125
    }
  ],
  "constituencies": [
    {
      "id": 1,
      "name": "Gummidipoondi",
      "district": "Tiruvallur",
      "status": "counting",
      "totalVotes": 45000,
      "roundsCompleted": 5,
      "totalRounds": 20,
      "candidates": [
        {
          "name": "Candidate Name",
          "party": "DMK",
          "votes": 25000,
          "voteShare": 55.5,
          "status": "leading",
          "photo": "url_or_null"
        }
      ]
    }
  ]
}
```

---

## 6. Party Colors & Alliances

| Party | Color | Alliance |
|-------|-------|----------|
| DMK | #E30613 (Red) | DMK+ |
| INC | #19AAED (Sky Blue) | DMK+ |
| VCK | #0000FF (Blue) | DMK+ |
| CPI | #FF0000 (Red) | DMK+ |
| CPI-M | #CC0000 (Dark Red) | DMK+ |
| ADMK | #00FF00 (Green) | ADMK+ |
| PMK | #FFFF00 (Yellow) | ADMK+ |
| BJP | #FF9933 (Saffron) | BJP+ |
| NTK | #8B0000 (Dark Red) | NTK |
| TVK | #FFD700 (Gold) | TVK+ |
| Others | #808080 (Gray) | Others |

Note: Alliance compositions for 2026 may differ. Update once confirmed.

---

## 7. ECI Data Source Notes

### How ECI publishes results
- URL pattern: `results.eci.gov.in/ResultAcXXX/` where XXX changes per election
- They serve HTML pages with embedded JSON data
- Key endpoints (patterns from past elections):
  - `partywiseresult-S22.htm` (S22 = Tamil Nadu state code)
  - `candidateswise-S2201.htm` (S2201 = first constituency)
  - `constituencywise-AllS22.htm` (all constituencies)
- Data is typically embedded in `<script>` tags or fetched via XHR

### Backup data sources
1. NDTV: `https://www.ndtv.com/elections/` (has JSON API)
2. News18: election results API
3. India Today: election results API
4. Manual entry as last resort

### Discovery strategy (May 3 evening / May 4 morning)
1. Open results.eci.gov.in in Chrome
2. Open DevTools > Network tab
3. Filter by XHR/Fetch
4. Identify JSON endpoints
5. Note the URL pattern and response format
6. Update Cloudflare Worker accordingly

---

## 8. GeoJSON Source Options

1. **DataMeet** (primary): https://github.com/datameet/maps
   - Has Indian assembly constituency boundaries
   - May need filtering for TN only

2. **Hindustan Times** open data (backup)

3. **Community India Maps** (backup)

4. **Generate from ECI shapefiles** (last resort)
   - ECI sometimes publishes boundary data
   - Would need ogr2ogr to convert

---

## 9. Hosting Setup Instructions

### Cloudflare Pages (Frontend)
1. Go to https://pages.cloudflare.com/
2. Sign up with email (free)
3. Connect GitHub repository
4. Build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
5. Deploy
6. Get URL: `tn-elections-2026.pages.dev` (or similar)

### Cloudflare Worker (Data Proxy)
1. In Cloudflare dashboard, go to Workers & Pages
2. Create new Worker
3. Paste worker script
4. Set up route/custom domain if needed
5. Free tier: 100,000 requests/day (more than enough with caching)

### Alternative: No Worker Needed Initially
- For development, fetch mock data from static JSON
- On launch day, can fetch directly from ECI (if CORS allows)
- Or use a simple Cloudflare Worker as CORS proxy
- If ECI blocks: use client-side fetch with no-cors + JSONP (unlikely to work)
- Most reliable: Cloudflare Worker as proxy

---

## 10. Quality Checklist

### Before Launch
- [ ] All 234 constituencies render on map
- [ ] Colors match party correctly
- [ ] Search finds any constituency by name
- [ ] Mobile layout works (test on phone)
- [ ] Auto-refresh works without memory leaks
- [ ] Error states handled gracefully
- [ ] Load time under 2 seconds
- [ ] Social share cards render correctly (og:image, og:title)

### Performance Targets
- First Contentful Paint: < 1s
- Largest Contentful Paint: < 2s
- Total bundle size: < 500KB (excluding map tiles)
- GeoJSON: < 2MB (simplify if larger)

---

## 11. Continuation Notes for New Sessions

When resuming work in a new Aki session:

1. **Read these files first:**
   - `PLAN.md` (this file) - understand the full plan
   - `LOG.md` - see what's been done, find the last completed step
   - `DOCS.md` - technical decisions and patterns used

2. **Check project state:**
   ```bash
   cd /Users/kgnmzn/Desktop/AI/Experiments/TN_Elections
   cat LOG.md | tail -50  # Recent changes
   ls -la src/             # What files exist
   npm run dev             # Does it run?
   ```

3. **Continue from the next unchecked step in Phase list above**

4. **After every change:**
   - Update LOG.md with what was done
   - Update PLAN.md checkboxes if a step is complete
   - Test the change works

5. **Key commands:**
   ```bash
   cd /Users/kgnmzn/Desktop/AI/Experiments/TN_Elections
   npm run dev          # Start dev server
   npm run build        # Production build
   npx wrangler dev     # Test Cloudflare Worker locally
   ```

