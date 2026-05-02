// /api/results - Election results with KV cache + thundering herd protection
// Free tier safe: ~30 reads/day (edge-cached), ~720 writes/day (1 per cycle)

const CACHE_TTL = 120; // seconds
const KV_KEY = 'api:results';
const LOCK_KEY = 'api:lock';
const LOCK_TTL = 15; // seconds - prevents parallel fetches

// ── May 4: set true, update UPSTREAM_URL ──
const LIVE_MODE = true;
const UPSTREAM_URL = 'https://tn-eci-mock.csekeyan.workers.dev/data';

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.CACHE) {
    return Response.json({ error: 'KV not bound' }, { status: 500 });
  }

  // Step 1: Check KV cache (edge-cached for CACHE_TTL seconds, free)
  const cached = await env.CACHE.get(KV_KEY, { type: 'json', cacheTtl: CACHE_TTL });
  if (cached && cached._cachedAt) {
    const age = Math.floor((Date.now() - cached._cachedAt) / 1000);
    if (age < CACHE_TTL) {
      return respond(cached, 'HIT', { 'X-Cache-Age': age + 's' });
    }
    // Data is stale. But DON'T fetch yet — check if someone else is already fetching.
  }

  // Step 2: Thundering herd protection — only one request fetches at a time
  const lock = await env.CACHE.get(LOCK_KEY, { cacheTtl: LOCK_TTL });
  if (lock) {
    // Another request is already fetching. Return stale data if we have it.
    if (cached) return respond(cached, 'STALE-WAIT', { 'X-Lock': 'true' });
    // No stale data and locked — wait briefly and retry once
    await new Promise(r => setTimeout(r, 2000));
    const retry = await env.CACHE.get(KV_KEY, { type: 'json', cacheTtl: CACHE_TTL });
    if (retry) return respond(retry, 'RETRY-HIT');
    return Response.json({ error: 'Data not available yet' }, { status: 503 });
  }

  // Step 3: We're the chosen one. Set lock, fetch, cache, release.
  await env.CACHE.put(LOCK_KEY, Date.now().toString(), { expirationTtl: LOCK_TTL });

  let data;
  const fetchStart = Date.now();
  try {
    const res = await fetch(UPSTREAM_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/json,*/*',
      },
    });
    if (!res.ok) throw new Error(`Upstream ${res.status}`);
    data = await res.json();
  } catch (err) {
    // Release lock on failure
    context.waitUntil(env.CACHE.delete(LOCK_KEY));
    if (cached) return respond(cached, 'STALE-ERROR', { 'X-Error': err.message });
    return Response.json({ error: err.message }, { status: 502 });
  }

  const fetchDuration = Date.now() - fetchStart;
  data.lastUpdated = new Date().toISOString();
  data._source = LIVE_MODE ? 'eci' : 'mock';
  data._fetchDuration = fetchDuration + 'ms';
  data._cachedAt = Date.now();

  // Store in KV and release lock (async, don't block response)
  context.waitUntil(Promise.all([
    env.CACHE.put(KV_KEY, JSON.stringify(data), { expirationTtl: CACHE_TTL * 3 }),
    env.CACHE.delete(LOCK_KEY),
  ]));

  return respond(data, 'MISS', { 'X-Fetch-Duration': fetchDuration + 'ms' });
}

function respond(data, cacheStatus, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'X-Cache': cacheStatus,
      'X-Source': data._source || 'unknown',
      ...extraHeaders,
    },
  });
}
