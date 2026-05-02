# TN Election Results 2026 - Change Log

> Updated after every change. Most recent entries at top.
> Read this first when resuming in a new session.

---

## Current Status: LIVE ON TWO PLATFORMS + RESEARCH DONE
## Last Completed Step: Deep research + architecture planned + social posts drafted
## Next Step: ECI endpoint discovery (May 3 evening) + Worker proxy activation

---

## LIVE URLs
| Platform | URL | Short URL | Bandwidth |
|----------|-----|-----------|-----------|
| Cloudflare | https://tn-elections-2026.56karthicute.workers.dev/ | TBD | Unlimited |
| GitHub Pages | https://csekeyan.github.io/tn-elections-2026/ | TBD | 100GB/month |

## GitHub
- Repo: https://github.com/csekeyan/tn-elections-2026
- Token: stored in .github-token (gitignored)
- Auto-deploys on push to main (both platforms)

---

## Log Entries

### 2026-05-02 00:30 PDT - Research + Architecture + Social Posts
- Deep research done on election dashboards (NYT, Indian Express, NDTV, TOI)
- ECI data source analysis: results.eci.gov.in not active yet (404s on all patterns)
  - Will go live May 3 evening or May 4 morning
  - ECI blocks server-side requests (403) - needs browser-like headers
  - Past patterns: ResultAcXXX/constituencywise-AllS22.htm, partywiseresult-S22.htm
- Alternative sources identified: Indian Express has data API, TOI has CDN JSON
- Architecture for live data: Cloudflare Worker proxy (already deployed on same domain)
- Social posts drafted for LinkedIn and Twitter
- UX improvement plan created based on research

### 2026-05-02 00:20 PDT - Both Deployments Live
- Cloudflare Workers: LIVE
- GitHub Pages: LIVE
- Base path auto-detection working (GitHub Actions vs Cloudflare)
- All images fixed with import.meta.env.BASE_URL

### Previous entries... (see git history)

---

## Live Data Architecture (for May 4)

### How it works:
```
User Browser (every 30s)
    → fetches /api/results from our Cloudflare Worker
    → Worker checks Cache API (30s TTL)
    → If MISS: Worker fetches from ECI (with browser headers)
    → Worker transforms ECI HTML/JSON to our format
    → Caches response, returns with CORS
    → Browser renders new data
```

### Key facts:
- Worker is ALREADY deployed at same domain (tn-elections-2026.56karthicute.workers.dev)
- Just need to add /api/results route handler
- ECI hit only once per 30 seconds regardless of user count
- All users get cached response (near-zero latency)
- Free tier: 100K Worker requests/day (more than enough)

### What we need on May 3/4:
1. Open results.eci.gov.in in browser
2. DevTools > Network > find JSON/XHR endpoints
3. Note URL pattern and response format
4. Update Worker to fetch from those endpoints
5. Update data.js to fetch from /api/results
6. Push → auto-deploys → live in 30 seconds

---

## Dev Commands
```bash
cd /Users/kgnmzn/Desktop/AI/Experiments/TN_Elections
npm run dev          # Local dev server
npm run build        # Production build
# Push to deploy (both platforms):
TOKEN=$(cat .github-token)
git remote set-url origin https://csekeyan:${TOKEN}@github.com/csekeyan/tn-elections-2026.git
git push
git remote set-url origin https://github.com/csekeyan/tn-elections-2026.git
```

## Session: May 2, 2026 ~1:00 AM (Late Night)

### Changes Made
1. **Majority Watch widget** - Added between alliance bar and tabs
   - Shows leading alliance name, Won+Leading breakdown, distance to 118 majority
   - Progress bar fills toward majority threshold
   - Auto-updates every refresh cycle

2. **Key Races to Watch** - Horizontal scrollable card strip
   - Filters constituencies with margin < 2,000
   - Shows top 10 closest contests, sorted by margin ascending
   - Each card: constituency name, district, top 2 candidates with party badges, margin
   - Click opens constituency detail modal
   - Mock data only has 2 close races; real data will have many more

3. **Number count-up animations** on stat cards
   - Ease-out cubic animation, 600ms duration
   - Subtle scale pulse during animation
   - Also animates the Majority Watch distance number

4. **Key Races border fix** - Added padding-top:4px to scroll container so hover translateY(-2px) doesn't clip top border

5. **Map tooltip fix** - Changed Leaflet tooltip direction from 'top' to 'auto' so tooltips auto-flip below cursor for northern constituencies near map edge

6. **Vijay photo replaced** - User provided high-quality TVK political poster image (692x1000 PNG)

7. **NTK logo replaced** - User provided green circular logo with farmer/plough symbol, saved as ntk.png, updated app.js reference from .svg to .png

### Files Modified
- `src/js/app.js` - Added renderMajorityWatch(), renderKeyRaces(), animateNumber(), animateStatCards(); wired into onUpdate; updated NTK logo path
- `src/css/style.css` - Added .majority-watch, .key-race-card, .key-races-scroll, animation keyframes, responsive rules
- `src/js/map.js` - Changed tooltip direction to 'auto'
- `src/index.html` - Added #majorityWatch and #keyRaces placeholder divs (done in prior session)
- `public/images/leaders/vijay.jpg` - Replaced with TVK poster image
- `public/images/parties/ntk.png` - New NTK logo from user

### NOT yet pushed to GitHub/Cloudflare
All changes are local only. Need to push to deploy.

### Worker + Data Pipeline
- Rewrote `worker/index.js`: clean /api/results with 30s edge cache, /api/health endpoint
  - `LIVE_MODE = false` serves mock_results.json from GitHub Pages
  - `LIVE_MODE = true` fetches from ECI (update `fetchLiveResults()` on May 4)
- Rewrote `src/js/data.js`: uses Worker API in production, local mock in dev, fallback to local mock if worker down
- Worker deploy failed (Cloudflare OAuth didn't complete). Need `cd worker && npx wrangler deploy` tomorrow.

### Git Push
- All changes pushed to GitHub main (1a96c55)
- GitHub Pages will auto-deploy
- Worker NOT yet deployed (needs wrangler auth)
