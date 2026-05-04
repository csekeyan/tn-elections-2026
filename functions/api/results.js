// /api/results - Election results with KV cache + thundering herd protection
// PRE-LIVE: returns zeros until ECI data is wired up

const CACHE_TTL = 30;
const KV_KEY = 'api:results';
const LOCK_KEY = 'api:lock';
const LOCK_TTL = 15;

// ── Set true and update URL when ECI is live ──
const LIVE_MODE = false;
const UPSTREAM_URL = '';

export async function onRequestGet(context) {
  const { env } = context;

  // PRE-LIVE: return zero state
  if (!LIVE_MODE) {
    return Response.json({
      totalSeats: 234,
      countingStatus: 'waiting',
      summary: { declared: 0, counting: 0 },
      allianceSummary: [
        { name: 'DMK+', won: 0, leading: 0, total: 0 },
        { name: 'AIADMK+', won: 0, leading: 0, total: 0 },
        { name: 'TVK+', won: 0, leading: 0, total: 0 },
        { name: 'NTK', won: 0, leading: 0, total: 0 },
        { name: 'Others', won: 0, leading: 0, total: 0 },
      ],
      constituencies: [],
      lastUpdated: new Date().toISOString(),
      _source: 'waiting',
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': 'PRE-LIVE',
        'X-Poll-Interval': '30',
      },
    });
  }

  if (!env.CACHE) return Response.json({ error: 'KV not bound' }, { status: 500 });

  const cached = await env.CACHE.get(KV_KEY, { type: 'json', cacheTtl: CACHE_TTL });
  if (cached && cached._cachedAt) {
    const age = Math.floor((Date.now() - cached._cachedAt) / 1000);
    if (age < CACHE_TTL) {
      return respond(cached, 'HIT', { 'X-Cache-Age': age + 's', 'Cache-Control': `public, max-age=${Math.max(1, CACHE_TTL - age)}` });
    }
  }

  const lock = await env.CACHE.get(LOCK_KEY, { cacheTtl: LOCK_TTL });
  if (lock) {
    if (cached) return respond(cached, 'STALE-WAIT', { 'Cache-Control': 'public, max-age=5' });
    await new Promise(r => setTimeout(r, 2000));
    const retry = await env.CACHE.get(KV_KEY, { type: 'json', cacheTtl: CACHE_TTL });
    if (retry) return respond(retry, 'RETRY-HIT');
    return Response.json({ error: 'Loading...' }, { status: 503 });
  }

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
  data._source = 'eci';
  data._fetchDuration = fetchDuration + 'ms';
  data._cachedAt = Date.now();

  context.waitUntil(Promise.all([
    env.CACHE.put(KV_KEY, JSON.stringify(data), { expirationTtl: CACHE_TTL * 3 }),
    env.CACHE.delete(LOCK_KEY),
  ]));

  return respond(data, 'MISS', { 'X-Fetch-Duration': fetchDuration + 'ms', 'Cache-Control': `public, max-age=${CACHE_TTL}` });
}

function respond(data, cacheStatus, extraHeaders = {}) {
  const allDeclared = data.countingStatus === 'completed' || (data.summary && data.summary.counting === 0 && data.summary.declared > 0);
  const pollHint = allDeclared ? 300 : 30;
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'X-Cache': cacheStatus, 'X-Source': data._source || 'unknown', 'X-Poll-Interval': String(pollHint), ...extraHeaders },
  });
}
