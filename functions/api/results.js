// /api/results - Election results with 30s KV cache
// cache.put() doesn't work on .pages.dev, so we use KV instead

const CACHE_TTL = 30; // seconds
const KV_KEY = 'api:results';

// ── May 4: set true, update UPSTREAM_URL ──
const LIVE_MODE = true;
const UPSTREAM_URL = 'https://tn-eci-mock.csekeyan.workers.dev/data';

export async function onRequestGet(context) {
  const { env } = context;

  // Check KV cache
  if (env.CACHE) {
    const cached = await env.CACHE.get(KV_KEY, { type: 'json', cacheTtl: CACHE_TTL });
    if (cached && cached._cachedAt) {
      const age = Math.floor((Date.now() - cached._cachedAt) / 1000);
      if (age < CACHE_TTL) {
        return Response.json(cached, {
          headers: {
            'Content-Type': 'application/json',
            'X-Cache': 'HIT',
            'X-Cache-Age': String(age) + 's',
            'X-Source': cached._source || 'unknown',
          },
        });
      }
    }
  }

  // Cache miss: fetch upstream
  let data;
  const fetchStart = Date.now();
  try {
    const res = await fetch(UPSTREAM_URL);
    if (!res.ok) throw new Error(`Upstream ${res.status}`);
    data = await res.json();
  } catch (err) {
    // If upstream fails but we have stale cache, serve it
    if (env.CACHE) {
      const stale = await env.CACHE.get(KV_KEY, { type: 'json' });
      if (stale) {
        return Response.json(stale, {
          headers: {
            'Content-Type': 'application/json',
            'X-Cache': 'STALE',
            'X-Error': err.message,
          },
        });
      }
    }
    return Response.json(
      { error: err.message, timestamp: new Date().toISOString() },
      { status: 502, headers: { 'Cache-Control': 'no-cache' } }
    );
  }

  const fetchDuration = Date.now() - fetchStart;
  data.lastUpdated = new Date().toISOString();
  data._source = LIVE_MODE ? 'eci' : 'mock';
  data._fetchDuration = fetchDuration + 'ms';
  data._cachedAt = Date.now();

  // Store in KV (async, don't block response)
  if (env.CACHE) {
    context.waitUntil(
      env.CACHE.put(KV_KEY, JSON.stringify(data), { expirationTtl: CACHE_TTL * 2 })
    );
  }

  return Response.json(data, {
    headers: {
      'Content-Type': 'application/json',
      'X-Cache': 'MISS',
      'X-Source': data._source,
      'X-Fetch-Duration': fetchDuration + 'ms',
    },
  });
}
