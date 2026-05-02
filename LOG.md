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
