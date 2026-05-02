# TN Election Results 2026 - Change Log

> Updated after every change. Most recent entries at top.
> Read this first when resuming in a new session.

---

## Current Status: PHASE 1 COMPLETE + v2 Polish Applied
## Last Completed Step: Production build + git repo + Worker script ready
## Next Step: Phase 2 - Performance polish, mobile testing, then Phase 3 deployment

---

## Log Entries

### 2026-05-01 23:36 PDT - Build + Git + Worker Ready for Deploy
- Production build: 2.0MB total (7KB HTML, 15KB CSS, 21KB JS, 1.4MB GeoJSON, 332KB images)
- GeoJSON simplified: reduced coordinate precision to 4 decimals, stripped extra props (10% smaller)
- Git repo initialized, initial commit made (35 files)
- Cloudflare Worker script written (worker/index.js + wrangler.toml)
  - Caches ECI data for 30s via Cloudflare Cache API
  - CORS headers for browser access
  - Mock mode (pre-election) + live mode (May 4) switch
  - Parse strategy for ECI HTML/JSON responses
- README.md created for GitHub repo
- READY TO DEPLOY: just needs GitHub remote + Cloudflare Pages connection


### 2026-05-01 23:32 PDT - Vijay Dual Constituency + Multi-Seat Support
- Vijay now shows both constituencies:
  - Perambur (AC 12, Chennai) - primary
  - Trichy East (AC 141, Tiruchirappalli) - second
- Refactored buildLeaderCard into 3 functions:
  - getSeatResult() - extracts result data for any AC
  - buildSeatBlock() - renders one constituency block (reusable)
  - buildLeaderCard() - assembles the full card
- Each seat block is independently clickable (opens that constituency modal)
- Other leaders (Stalin, EPS, Seeman) unchanged (single seat)
- leader.seats array used for multi-seat, fallback to leader.acNo for single


### 2026-05-01 23:28 PDT - HD Wikipedia Photos for Leaders
- Re-downloaded leader photos from Wikipedia at 500px resolution (clean headshots)
  - stalin.jpg: 500x663, 50KB - clear face-forward portrait
  - vijay.jpg: 500x625, 95KB - dramatic close-up
  - eps.jpg: 500x625, 46KB - clean formal photo
  - seeman.jpg: cropped to face+shoulders from full-body speech photo, 90KB
- Removed infographic crops (had overlaid text/symbols)
- Photo hero section height increased to 180px (was 150px)
- Gradient overlay reduced to 50% (was 60%) so more face visible
- Removed brightness filter for true-color display


### 2026-05-01 23:22 PDT - Dramatic Leader Cards with Infographic Photos
- Extracted leader photos from KG's ChatGPT infographic (cropped with Pillow)
  - stalin.jpg (21KB), vijay.jpg (20KB), eps.jpg (20KB), seeman.jpg (22KB)
  - Photos include party context (flags, symbols visible in background)
- New card layout: hero-style photo covering top half of card
  - Photo with gradient overlay (party color fading up)
  - Leader name + role overlaid on photo (white text with shadow)
  - Party symbol badge in bottom-right corner of photo
- Below photo: constituency result with rival
  - Shows both leader and closest rival with party badges + votes
  - Margin bar for visual comparison
- Alliance overall section at bottom with Won/Lead counts
- Changed all 'Ahead' to 'Lead' per KG's request (stat cards, legend, sidebar)
- Widened sidebar to 210px (was 190px) for bigger photos


### 2026-05-01 23:15 PDT - Sidebar v3: Local Images + Rival + Labels Fixed
- Downloaded leader photos locally (public/images/leaders/):
  - stalin.jpg (32KB), vijay.jpg (43KB), eps.jpg (29KB), seeman.jpg (53KB)
- Downloaded party symbols locally (public/images/parties/):
  - dmk.png (Rising Sun), aiadmk.png (Two Leaves), tvk.png (Whistle), ntk.svg (placeholder)
- Each sidebar card now shows:
  - Leader photo with party symbol overlaid (bottom-right, white bg, rounded)
  - Their constituency: leader votes + closest rival (name, party badge, votes)
  - Margin bar (visual width proportional to margin)
  - LEADING/TRAILING/WON status
- Fixed confusing labels: "W:" and "L:" changed to "Won" and "Ahead" everywhere
  - Stat cards, alliance legend, sidebar cards all now say "Won X . Ahead Y"
  - "L" no longer used (was ambiguous with Lost)


### 2026-05-01 23:07 PDT - Sidebar: 4 Leaders Only
- Left sidebar: M.K. Stalin (Kolathur, AC 13) + Vijay (Perambur, AC 12)
- Right sidebar: E.K. Palaniswami (Edappadi, AC 86) + Seeman (Karaikudi, AC 184)
- Each card shows: photo, name, role, party badge overlay on photo
- Personal constituency: name, LEADING/TRAILING status, margin (+/-)
- Alliance overall: total seats, won/leading breakdown
- Cards are clickable (opens constituency detail modal)
- Updated CSS: wider cards (166px), more spacing, cleaner layout

### 2026-05-01 22:50 PDT - v2 Polish: All 4 Corrections Applied

**1. Colors & Font:**
- Switched from bright saturated to muted modern palette:
  - DMK: #c4515f (muted rose), AIADMK: #4daa8d (muted teal)
  - TVK: #c9a84c (muted gold), NTK: #8b5e6b (muted mauve)
  - BJP: #d4874d (muted amber), INC: #5b9bd5 (muted blue)
- Background: deeper navy (#0b0f19), cards: #151c28
- Accent: #6c8cff (muted periwinkle), green: #6ee7a0 (soft mint)
- Font: DM Sans (from Google Fonts) - modern geometric sans
- Updated tailwind.config.js with DM Sans as default

**2. Map: TN Only**
- Removed tile layer entirely (no CartoDB, no world map)
- Map background is just the dark CSS (#0b0f19)
- Set maxBounds to TN bounding box with viscosity 1.0
- Only constituency polygons render - clean, focused
- Leaflet tooltip styled dark to match theme

**3. Charts Fixed:**
- Wrapped canvases in .chart-container with fixed 340px height
- Bar chart: shows "N seats" label at end of each bar (custom afterDraw plugin)
- Doughnut chart: shows % inside each slice (custom afterDraw plugin)
- Disabled tooltip on bar chart (data visible inline)
- Both charts use same DM Sans font
- No more expanding/resizing on hover

**4. Leader Sidebars:**
- Added left sidebar: DMK+ alliance leaders (all 7 parties)
- Added right sidebar: AIADMK+, TVK+, NTK leaders
- Each leader card: photo (from Wikipedia), name, party badge, seat count
- Photos have circular crop, fallback shows party initial in colored circle
- Cards show live seat counts that update with data
- Sidebars are sticky, hidden on screens < 1100px
- Responsive: shrink at 1400px, hide at 1100px

### 2026-05-01 22:40 PDT - Phase 1 Complete: Foundation Built
(see previous entries for full Phase 1 details)

### 2026-05-01 22:30 PDT - Data Acquisition
- GeoJSON: 234 features, 38 districts (from sharath-rajendran05)
- Candidates: 936 across all parties (from same source)
- Mock results: realistic distribution

### 2026-05-01 21:50 PDT - Project Initialized
- Created PLAN.md, LOG.md, DOCS.md

---

## Dev Server
- **URL:** http://localhost:5180/
- **Start:** cd /Users/kgnmzn/Desktop/AI/Experiments/TN_Elections && npx vite --host --port 5180

## Files Changed in v2
- src/assets/parties.json (+ public/parties.json) - muted colors, leader images
- src/css/style.css - complete rewrite
- src/js/map.js - TN-only, no tiles
- src/js/charts.js - fixed sizing, inline labels
- src/js/app.js - sidebar rendering
- src/js/constituency.js - refined modal
- src/index.html - sidebar layout, DM Sans, fixed chart containers
- tailwind.config.js - DM Sans font

## Remaining
- [ ] Test mobile responsiveness
- [ ] Performance: simplify GeoJSON if > 1.5MB
- [ ] Cloudflare Worker for data proxy
- [ ] Deploy to Cloudflare Pages
- [ ] Social share image
- [ ] LinkedIn/Twitter posts
- [ ] Discover ECI live endpoints (May 3-4)
