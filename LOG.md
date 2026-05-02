# TN Election Results 2026 - Change Log

> Updated after every change. Most recent entries at top.
> Read this first when resuming in a new session.

---

## Current Status: LIVE ON TWO PLATFORMS
## Last Completed Step: Both deployments live + validated
## Next Step: ECI live data integration (May 3-4)

---

## LIVE URLs
| Platform | URL | Short URL | Bandwidth |
|----------|-----|-----------|-----------|
| Cloudflare | https://tn-elections-2026.56karthicute.workers.dev/ | https://tinyurl.com/2c2w8a7c | Unlimited |
| GitHub Pages | https://csekeyan.github.io/tn-elections-2026/ | https://tinyurl.com/28uccns2 | 100GB/month |

**Share the Cloudflare TinyURL for viral traffic:** https://tinyurl.com/2c2w8a7c

## GitHub
- Repo: https://github.com/csekeyan/tn-elections-2026
- Token: stored in .github-token (gitignored)
- Auto-deploys on push to main (both GitHub Pages via Actions + Cloudflare)

---

## Log Entries

### 2026-05-02 00:20 PDT - Both Deployments Live + Validated
- Cloudflare Workers: LIVE at tn-elections-2026.56karthicute.workers.dev
  - All assets verified: HTML, CSS, JS, JSON, GeoJSON, images (all 200)
  - Unlimited bandwidth, global CDN
  - Auto-rebuilds on git push
- GitHub Pages: LIVE at csekeyan.github.io/tn-elections-2026/
  - Also all assets verified (200)
  - 100GB/month bandwidth
  - Auto-deploys via GitHub Actions
- TinyURLs created for sharing
- Base path fix: auto-detects GitHub Actions (subpath) vs Cloudflare (root)
  - Uses GITHUB_ACTIONS env var in vite.config.js
- Fixed Cloudflare issues:
  - Vite upgraded to v6 (Wrangler requirement)
  - Added plugins:[] to vite config
  - Created wrangler.jsonc with assets.directory
- Fixed image paths: use import.meta.env.BASE_URL for leader/party images

### 2026-05-01 23:32 PDT - Vijay Dual Constituency
- Vijay shows both Perambur (AC 12) + Trichy East (AC 141)
- Refactored buildLeaderCard for multi-seat support

### 2026-05-01 23:28 PDT - HD Leader Photos
- Wikipedia 500px photos: Stalin, Vijay, EPS, Seeman
- Hero-style cards with gradient overlay + party symbol badge

### 2026-05-01 23:15 PDT - Sidebar v3: Local Images + Rival Info
- Downloaded leader photos + party symbols locally
- Each card shows leader vs closest rival with votes
- Changed W/L labels to Won/Lead everywhere

### 2026-05-01 22:50 PDT - v2 Polish
- Muted modern colors, DM Sans font
- Map: TN only, no tile layer
- Charts: fixed sizing, inline labels
- Leader sidebars: 4 top leaders

### 2026-05-01 22:40 PDT - Phase 1 Complete
- Full dashboard: stats, alliance bar, map, table, charts, modal
- 234 constituencies, 936 candidates, mock data

### 2026-05-01 21:50 PDT - Project Initialized
- Created PLAN.md, LOG.md, DOCS.md

---

## Remaining Tasks

### Before May 4 (Priority Order)
1. [ ] **ECI Live Data** - Discover endpoints (May 3 evening), build transformer
2. [ ] **Data polling strategy** - Either:
   - (a) Cloudflare Worker as proxy (best, already have worker/index.js)
   - (b) GitHub Actions cron to fetch + push mock_results.json every 30s
   - (c) Direct client-side fetch if ECI allows CORS
3. [ ] **Social sharing** - LinkedIn post, Twitter, WhatsApp card
4. [ ] **OG image** - Screenshot for social share preview

### Nice-to-haves
- [ ] Loading skeleton screens
- [ ] Number count-up animations
- [ ] Service worker for offline resilience
- [ ] Custom domain ($3-5 .in domain)

---

## Dev Commands
```bash
cd /Users/kgnmzn/Desktop/AI/Experiments/TN_Elections
npm run dev          # Local dev server
npm run build        # Production build → dist/
# Push to deploy:
TOKEN=$(cat .github-token)
git remote set-url origin https://csekeyan:${TOKEN}@github.com/csekeyan/tn-elections-2026.git
git push
git remote set-url origin https://github.com/csekeyan/tn-elections-2026.git
```
