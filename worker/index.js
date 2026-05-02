// Cloudflare Worker: Election Results API
// /api/results - returns dashboard JSON with 30s edge cache
// May 4: only change fetchLiveResults() to parse real ECI data

const CACHE_TTL = 30;
const GITHUB_PAGES = 'https://csekeyan.github.io/tn-elections-2026';

// ── Toggle this on May 4 ──
const LIVE_MODE = false;
// ──────────────────────────

// ECI config - update these on May 4 when counting starts
const ECI_BASE = 'https://results.eci.gov.in';
const ECI_PATH = '/ResultAcGenMay2026/partywiseresult-S22.htm';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    // Health check
    if (url.pathname === '/api/health') {
      return Response.json({
        status: 'ok',
        mode: LIVE_MODE ? 'live' : 'mock',
        cacheTTL: CACHE_TTL,
        timestamp: new Date().toISOString(),
      }, { headers: CORS });
    }

    // Main API
    if (url.pathname === '/api/results') {
      return handleResults(request, ctx);
    }

    // Everything else: 404
    return new Response('Not found. Try /api/results', { status: 404, headers: CORS });
  },
};

async function handleResults(request, ctx) {
  // Check edge cache
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).origin + '/api/results');
  const cached = await cache.match(cacheKey);

  if (cached) {
    const resp = new Response(cached.body, cached);
    Object.entries(CORS).forEach(([k, v]) => resp.headers.set(k, v));
    resp.headers.set('X-Cache', 'HIT');
    return resp;
  }

  // Cache miss: fetch data
  let data;
  let source;
  try {
    if (LIVE_MODE) {
      data = await fetchLiveResults();
      source = 'eci';
    } else {
      data = await fetchMockResults();
      source = 'mock';
    }
  } catch (err) {
    return Response.json(
      { error: err.message, timestamp: new Date().toISOString() },
      { status: 502, headers: { ...CORS, 'Cache-Control': 'no-cache' } }
    );
  }

  // Stamp metadata
  data.lastUpdated = new Date().toISOString();
  data._source = source;

  const response = new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${CACHE_TTL}`,
      ...CORS,
      'X-Cache': 'MISS',
      'X-Source': source,
      'X-Timestamp': new Date().toISOString(),
    },
  });

  // Store in edge cache
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

// ── Mock: serve from GitHub Pages ──
async function fetchMockResults() {
  const res = await fetch(GITHUB_PAGES + '/mock_results.json', {
    headers: { 'User-Agent': 'TN-Elections-Worker/1.0' },
  });
  if (!res.ok) throw new Error(`Mock fetch failed: ${res.status}`);
  return res.json();
}

// ── Live: fetch from ECI and transform ──
// THIS IS THE ONLY FUNCTION TO UPDATE ON MAY 4
async function fetchLiveResults() {
  // Step 1: Fetch the main results page from ECI
  const res = await fetch(ECI_BASE + ECI_PATH, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,*/*',
      'Referer': ECI_BASE + '/',
    },
  });

  if (!res.ok) throw new Error(`ECI returned ${res.status}`);
  const html = await res.text();

  // Step 2: Parse ECI response into dashboard format
  // The exact parsing depends on what ECI serves. Options:
  //   A) JSON embedded in <script> tags
  //   B) HTML tables
  //   C) Direct JSON endpoint
  //
  // Try JSON first, then script extraction, then table parsing
  return parseECIResponse(html);
}

function parseECIResponse(html) {
  // Try direct JSON
  try { return JSON.parse(html); } catch {}

  // Try embedded JSON in script tags (common ECI pattern)
  const scriptMatch = html.match(/var\s+data\s*=\s*(\{[\s\S]*?\});/);
  if (scriptMatch) {
    try { return JSON.parse(scriptMatch[1]); } catch {}
  }

  // Try extracting from HTML tables (ECI constituency-wise pages)
  // This is the most likely format based on Delhi 2025 analysis
  return parseECITables(html);
}

function parseECITables(html) {
  // Placeholder: on May 4, inspect actual ECI HTML and write parser
  // The Python transformer (data/transform_eci.py) has the logic,
  // this is the JS equivalent for the Worker
  throw new Error('ECI HTML table parsing not yet implemented. Update on May 4.');
}
