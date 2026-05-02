// /api/results - Election results with 30s edge cache
// May 4: update fetchLiveResults(), set LIVE_MODE = true, push + deploy

const CACHE_TTL = 30;

// ── Toggle on May 4 ──
const LIVE_MODE = false;
// ──────────────────────

// ECI config - update on May 4
const ECI_BASE = 'https://results.eci.gov.in';
const ECI_PATH = '/ResultAcGenMay2026/partywiseresult-S22.htm';

export async function onRequestGet(context) {
  const { request } = context;
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).origin + '/api/results', { method: 'GET' });

  // Edge cache check
  const cached = await cache.match(cacheKey);
  if (cached) {
    const resp = new Response(cached.body, cached);
    resp.headers.set('X-Cache', 'HIT');
    return resp;
  }

  // Cache miss: fetch data
  let data, source;
  try {
    if (LIVE_MODE) {
      data = await fetchLiveResults();
      source = 'eci';
    } else {
      const origin = new URL(request.url).origin;
      const res = await fetch(origin + '/mock_results.json');
      if (!res.ok) throw new Error(`Mock fetch: ${res.status}`);
      data = await res.json();
      source = 'mock';
    }
  } catch (err) {
    return Response.json(
      { error: err.message, timestamp: new Date().toISOString() },
      { status: 502, headers: { 'Cache-Control': 'no-cache' } }
    );
  }

  data.lastUpdated = new Date().toISOString();
  data._source = source;

  const response = new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${CACHE_TTL}`,
      'X-Cache': 'MISS',
      'X-Source': source,
    },
  });

  context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

// ── THE ONLY FUNCTION TO CHANGE ON MAY 4 ──
async function fetchLiveResults() {
  const res = await fetch(ECI_BASE + ECI_PATH, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,*/*',
      'Referer': ECI_BASE + '/',
    },
  });
  if (!res.ok) throw new Error(`ECI returned ${res.status}`);
  const html = await res.text();

  // Parse ECI response - update based on actual format on May 4
  try { return JSON.parse(html); } catch {}
  const m = html.match(/var\s+data\s*=\s*(\{[\s\S]*?\});/);
  if (m) try { return JSON.parse(m[1]); } catch {}
  throw new Error('ECI parsing not yet implemented. Update on May 4.');
}
