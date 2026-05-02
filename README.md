# Tamil Nadu Election Results 2026 - LIVE Dashboard

Real-time election results dashboard for all 234 Tamil Nadu Assembly constituencies.

**Live URL:** *(will be updated after deployment)*

## Features
- Real-time results auto-refreshing every 30 seconds
- Interactive color-coded map of all 234 constituencies
- Party-wise and alliance-wise seat tracker with majority line
- Searchable, filterable, sortable constituency table
- Constituency detail modal with all candidates and vote bars
- Leader sidebars: Stalin (DMK), Vijay (TVK), EPS (AIADMK), Seeman (NTK)
- Mobile responsive, dark theme, sub-2s load time

## Tech
- Vanilla JS + Vite + TailwindCSS
- Leaflet.js (map) + Chart.js (charts)
- Cloudflare Pages (hosting) + Cloudflare Worker (data proxy)
- Zero backend servers, fully edge-cached

## Data Sources
- Election Commission of India (live on counting day)
- Constituency boundaries: DataMeet / Community maps (CC BY 4.0)
- Candidate data: ECI nomination lists

## Development
```bash
npm install
npm run dev     # Start dev server
npm run build   # Production build → dist/
```

## License
MIT
