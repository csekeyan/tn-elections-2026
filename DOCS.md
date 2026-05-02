# TN Election Results 2026 - Technical Documentation

> Updated whenever technical decisions are made or patterns established.

---

## Architecture Decisions

### ADR-001: No Framework (Vanilla JS)
- **Decision:** Use vanilla JavaScript instead of React/Vue/Svelte
- **Reason:** Smallest possible bundle size. Election results are mostly data display, not interactive forms. Vanilla JS with DOM manipulation is sufficient and loads faster.
- **Trade-off:** More manual DOM work, but the app is simple enough that this is manageable.

### ADR-002: Cloudflare Pages over Vercel/Netlify
- **Decision:** Host on Cloudflare Pages
- **Reason:** Only platform with truly unlimited bandwidth on free tier. Vercel and Netlify both cap at 100GB. For a potentially viral election site, unlimited is critical.

### ADR-003: Cloudflare Worker as Data Proxy
- **Decision:** Use a Cloudflare Worker to proxy ECI data
- **Reason:** ECI doesn't set CORS headers. Browser can't fetch directly. Worker fetches from ECI, caches for 30s, serves to our frontend with proper CORS. Free tier (100K requests/day) is sufficient because of caching.

### ADR-004: Client-Side Rendering
- **Decision:** All rendering happens in the browser
- **Reason:** With cached JSON data from the Worker, the browser can render everything. No SSR needed. This means the "server" (Cloudflare Pages) serves only static files, which is infinitely scalable.

### ADR-005: Dark Theme
- **Decision:** Dark theme as default (election night feel)
- **Reason:** Most election result viewing happens in the evening/night. Dark theme is easier on eyes, looks more dramatic, and is on-trend.

---

## Data Flow

```
1. Cloudflare Worker runs on a schedule OR on-demand:
   - Fetches latest data from ECI (results.eci.gov.in)
   - Caches response in Cloudflare Cache API (30s TTL)
   - Returns JSON with CORS headers

2. Browser (our static site):
   - On load: fetches data from Worker endpoint
   - Every 30 seconds: re-fetches data
   - On data change: re-renders affected UI components
   - Map colors, charts, tables all update reactively
```

---

## File Patterns

### Data Update Pattern
```javascript
// data.js exposes a simple event-based system
DataService.onUpdate((data) => {
  updateDashboard(data);
  updateMap(data);
  updateTable(data);
});
DataService.startPolling(30000); // 30 second interval
```

### Map Rendering Pattern
```javascript
// map.js uses Leaflet with GeoJSON
// Each feature's style is determined by the leading party
function getConstituencyStyle(feature) {
  const result = getResultForConstituency(feature.properties.id);
  return {
    fillColor: getPartyColor(result.leadingParty),
    fillOpacity: 0.7,
    weight: 1,
    color: '#333'
  };
}
```

---

## Known Issues & Workarounds

(None yet - will be populated as we build)

---

## URLs & Resources

| Resource | URL |
|----------|-----|
| Cloudflare Pages | TBD after deployment |
| Cloudflare Worker | TBD after deployment |
| GitHub Repo | TBD |
| ECI Results | https://results.eci.gov.in/ (active on counting day) |
| DataMeet Maps | https://github.com/datameet/maps |
| TN Constituency List | https://www.eci.gov.in/ |

