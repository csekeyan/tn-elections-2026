# May 4 Battle Plan — TN Election Results Dashboard

## Key Timezone Facts

| Event | IST | PST (you) | UTC |
|---|---|---|---|
| ECI counting begins | 8:00 AM Sun | 7:30 PM Sat | 02:30 Sun |
| First trends | 8:30 AM | 8:00 PM Sat | 03:00 |
| Initial leads clear | 9:00 AM | 8:30 PM Sat | 03:30 |
| Most seats trending | 11:00 AM | 10:30 PM Sat | 05:30 |
| Majority picture clear | 1:00 PM | 12:30 AM Sun | 07:30 |
| Most declared | 4:00 PM | 3:30 AM Sun | 10:30 |
| All results | 8:00 PM | 7:30 AM Sun | 14:30 |

**Cloudflare paid plan: monthly quota, no daily reset to worry about.**

---

## Saturday May 3 — PREP (Your Evening)

### 3:00 PM PST — Buy & Setup
- [ ] Upgrade Cloudflare to $5 paid plan (Workers Paid)
- [ ] Verify in dashboard: plan shows "Paid"
- [ ] Deploy current code: `npm run build && npx wrangler pages deploy dist/ --project-name tn-elections-2026 --commit-dirty=true`
- [ ] Verify: open https://tn-elections-2026.pages.dev — rotating mock data works
- [ ] Verify: open /cache-test.html — cache HITs working

### 5:00 PM PST (6:30 AM IST Mon) — ECI Recon
- [ ] Open https://results.eci.gov.in in Chrome
- [ ] ECI usually puts up the page structure hours before counting starts
- [ ] Open DevTools > Network tab
- [ ] Look for: XHR/Fetch requests, JSON endpoints, HTML pages
- [ ] Note the EXACT URL pattern. Examples from past elections:
  - `results.eci.gov.in/ResultAcGenMay2026/partywiseresult-S22.htm`
  - `results.eci.gov.in/ResultAcGenMay2026/ConstituencywiseAllS22.htm`
- [ ] Check response format: JSON? HTML table? Script tag with embedded data?
- [ ] Save a sample response to `data/sample_eci_response.txt`

### 5:30 PM PST — Wire Up ECI
- [ ] Copy template: `cp functions/api/results.MAY4.js functions/api/results.js`
- [ ] Edit `functions/api/results.js`:
  - Replace `REPLACE_WITH_ACTUAL_PATH` with real ECI URL
  - If ECI response format differs from what `_transform.js` expects, adjust field names
- [ ] Test locally: `npm run build && npx wrangler pages dev dist/`
- [ ] Open http://localhost:8787 — does real ECI data render?
- [ ] If ECI isn't serving data yet, the function will error — that's fine, we have the mock fallback

### 6:30 PM PST — Deploy Live
- [ ] Deploy: `npm run build && npx wrangler pages deploy dist/ --project-name tn-elections-2026 --commit-dirty=true`
- [ ] Test: `curl https://tn-elections-2026.pages.dev/api/health`
- [ ] Test: `curl https://tn-elections-2026.pages.dev/api/results | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('_source'), len(d.get('constituencies',[])))"`
- [ ] Open the site on phone — check mobile Leaders tab
- [ ] Git push for backup

### 7:00 PM PST — Validation (30 min before counting)
- [ ] Open the site in Chrome, Firefox, Safari, and phone
- [ ] Verify: auto-refresh working, countdown timer visible
- [ ] Verify: all 234 constituencies in table
- [ ] Verify: map loads, clickable
- [ ] Verify: leader sidebars show data
- [ ] Check Cloudflare analytics dashboard — invocations look normal?
- [ ] If ECI data is live: verify numbers match what TV channels show

### 7:30 PM PST (8:00 AM IST) — COUNTING STARTS 🔴
- [ ] Monitor the site for 10 minutes — data updating?
- [ ] Check X-Cache headers: `curl -sI https://tn-elections-2026.pages.dev/api/results | grep X-`
- [ ] If data isn't flowing: check ECI URL, might have changed at the last minute
- [ ] Once confirmed working → START SHARING

---

## Sharing Strategy (after site is confirmed working)

### Immediate (7:45 PM PST)

**LinkedIn** (your network, tech people, Tamil diaspora)
> Live TN Election Results Dashboard — real-time updates for all 234 constituencies.
> Interactive map, alliance tracker, key races. Built on Cloudflare edge.
> https://tn-elections-2026.pages.dev
> #TNElections2026 #TamilNadu #ElectionResults

**Twitter/X** (viral potential)
> Built a live dashboard for TN Election Results 2026 🗳️
> - 234 constituencies, real-time
> - Interactive map
> - Alliance seat tracker
> - Auto-refreshes every 30s
> 
> https://tn-elections-2026.pages.dev
> 
> #TNElections2026 #TamilNadu #ElectionResults2026

**WhatsApp** (Tamil groups, family, friends)
> TN Election Results 2026 - Live Dashboard
> Real-time results for all 234 seats
> Map, charts, candidate details
> https://tn-elections-2026.pages.dev
> Share with your friends!

### Within First Hour (8:00-9:00 PM PST)

**Reddit**
- r/Chennai — "Built a live election results dashboard for TN 2026"
- r/TamilNadu — same
- r/india — "Live TN Election Results Dashboard — open source"
- r/webdev or r/javascript — "Built a real-time election dashboard on Cloudflare Pages (open source)" + link to GitHub

**Tamil Facebook Groups**
- Search for "Tamil Nadu Politics", "Chennai", "TN Elections" groups
- Post with screenshot + link

**Hacker News** (if you want tech attention)
- "Show HN: Real-time TN election dashboard — Cloudflare edge, 30s refresh, open source"
- Link to GitHub repo (HN prefers GitHub links)

**Product Hunt** (optional, next day)
- "TN Election Results 2026 — Real-time dashboard for 234 constituencies"

### Viral Multipliers

1. **Tamil YouTube news channels** — Many small channels cover election results live. DM them the link, they might put it on screen.

2. **Twitter Tamil political accounts** — Quote-tweet trending election hashtags with your dashboard link.

3. **Telegram groups** — Tamil political discussion groups are huge on Telegram.

4. **Instagram Stories** — Screenshot of the dashboard with swipe-up link.

5. **GitHub trending** — Star your own repo, share on Twitter. Indian dev community will pick it up.

---

## Monitoring During Counting

### What to Watch

**Cloudflare Dashboard** (check every 30 min):
- Workers & Pages > tn-elections-2026 > Analytics
- Function invocations count
- Error rate (should be 0%)
- Web Analytics: unique visitors, page views

**Your Site**:
- Open in a tab, watch it refresh
- Cross-check 2-3 numbers against NDTV/Times Now

**If Something Goes Wrong**:

| Problem | Fix |
|---|---|
| ECI URL changed | Check results.eci.gov.in DevTools, update URL, redeploy (2 min) |
| Transform errors (wrong field names) | Check `data/sample_eci_response.txt`, update `_transform.js`, redeploy |
| KV errors / 429s | Already on paid plan — shouldn't happen. Check dashboard. |
| Site down | Check Cloudflare status page. Redeploy. |
| Data doesn't match TV | ECI is the source of truth, TV might lag. If YOUR data lags, check cache TTL. |
| Numbers seem wrong | Check `_transform.js` party mapping. AIADMK vs ADMK? TVK vs VCK? |

---

## Post-Counting (Sunday night / Monday)

- [ ] Once all 234 declared: function auto-sends `X-Poll-Interval: 300` (5 min polls)
- [ ] Update CACHE_TTL to 3600 (1 hour) to save quota
- [ ] Share final results screenshot on social media
- [ ] Check total Cloudflare bill in dashboard
- [ ] Write a "how I built this" blog post (LinkedIn article = great engagement)
- [ ] If bill is < $5 total, downgrade back to free in June
