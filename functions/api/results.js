// /api/results - Election results with KV cache + thundering herd protection
// 30s TTL, paid plan

const CACHE_TTL = 30; // seconds
const KV_KEY = 'api:results';
const LOCK_KEY = 'api:lock';
const LOCK_TTL = 15;

const LIVE_MODE = true;
const UPSTREAM_URL = 'https://tn-eci-mock.csekeyan.workers.dev/data';

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.CACHE) return Response.json({ error: 'KV not bound' }, { status: 500 });

  // Check KV cache (edge-cached, free within cacheTtl window)
  const cached = await env.CACHE.get(KV_KEY, { type: 'json', cacheTtl: CACHE_TTL });
  if (cached && cached._cachedAt) {
    const age = Math.floor((Date.now() - cached._cachedAt) / 1000);
    if (age < CACHE_TTL) {
      return respond(cached, 'HIT', {
        'X-Cache-Age': age + 's',
        'Cache-Control': `public, max-age=${Math.max(1, CACHE_TTL - age)}`,
      });
    }
  }

  // Thundering herd: only one request fetches at a time
  const lock = await env.CACHE.get(LOCK_KEY, { cacheTtl: LOCK_TTL });
  if (lock) {
    if (cached) return respond(cached, 'STALE-WAIT', { 'Cache-Control': 'public, max-age=5' });
    await new Promise(r => setTimeout(r, 2000));
    const retry = await env.CACHE.get(KV_KEY, { type: 'json', cacheTtl: CACHE_TTL });
    if (retry) return respond(retry, 'RETRY-HIT');
    return Response.json({ error: 'Loading...' }, { status: 503 });
  }

  // Acquire lock, fetch, cache
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
    context.waitUntil(env.CACHE.delete(LOCK_KEY));
    if (cached) return respond(cached, 'STALE-ERROR', { 'X-Error': err.message });
    return Response.json({ error: err.message }, { status: 502 });
  }

  const fetchDuration = Date.now() - fetchStart;
  data.lastUpdated = new Date().toISOString();
  data._source = LIVE_MODE ? 'eci' : 'mock';
  data._fetchDuration = fetchDuration + 'ms';
  data._cachedAt = Date.now();

  context.waitUntil(Promise.all([
    env.CACHE.put(KV_KEY, JSON.stringify(data), { expirationTtl: CACHE_TTL * 3 }),
    env.CACHE.delete(LOCK_KEY),
  ]));

  return respond(data, 'MISS', {
    'X-Fetch-Duration': fetchDuration + 'ms',
    'Cache-Control': `public, max-age=${CACHE_TTL}`,
  });
}

function respond(data, cacheStatus, extraHeaders = {}) {
  // Adaptive polling hint: if all results declared, tell browser to slow down
  const allDeclared = data.countingStatus === 'completed' || (data.summary && data.summary.counting === 0);
  const pollHint = allDeclared ? 300 : 30;

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'X-Cache': cacheStatus,
      'X-Source': data._source || 'unknown',
      'X-Poll-Interval': String(pollHint),
      ...extraHeaders,
    },
  });
}
