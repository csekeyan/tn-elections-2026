// /api/results - LIVE from ECI with KV cache + thundering herd protection
import { parseConstituencyHtml, buildDashboard } from './_transform.js';

const CACHE_TTL = 30;
const KV_KEY = 'api:results';
const LOCK_KEY = 'api:lock';
const LOCK_TTL = 15;
const ECI_BASE = 'https://results.eci.gov.in/ResultAcGenMay2026';
const TOTAL_ACS = 234;

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.CACHE) return Response.json({ error: 'KV not bound' }, { status: 500 });

  // Check KV cache
  const cached = await env.CACHE.get(KV_KEY, { type: 'json', cacheTtl: CACHE_TTL });
  if (cached && cached._cachedAt) {
    const age = Math.floor((Date.now() - cached._cachedAt) / 1000);
    if (age < CACHE_TTL) {
      return respond(cached, 'HIT', { 'X-Cache-Age': age + 's' });
    }
  }

  // Thundering herd lock
  const lock = await env.CACHE.get(LOCK_KEY, { cacheTtl: LOCK_TTL });
  if (lock) {
    if (cached) return respond(cached, 'STALE-WAIT');
    await new Promise(r => setTimeout(r, 3000));
    const retry = await env.CACHE.get(KV_KEY, { type: 'json', cacheTtl: CACHE_TTL });
    if (retry) return respond(retry, 'RETRY-HIT');
    return Response.json({ error: 'Loading results...' }, { status: 503 });
  }

  await env.CACHE.put(LOCK_KEY, Date.now().toString(), { expirationTtl: LOCK_TTL });

  let data;
  const fetchStart = Date.now();
  try {
    // Fetch all 234 constituency pages in parallel (batches of 30)
    const constituencies = [];
    for (let batch = 0; batch < TOTAL_ACS; batch += 30) {
      const promises = [];
      for (let i = batch; i < Math.min(batch + 30, TOTAL_ACS); i++) {
        const acNo = i + 1;
        const url = `${ECI_BASE}/ConstituencywiseS22${acNo}.htm`;
        promises.push(
          fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'text/html,*/*',
              'Referer': ECI_BASE + '/index.htm',
            },
          })
          .then(r => r.ok ? r.text() : '')
          .then(html => html ? parseConstituencyHtml(html, acNo) : null)
          .catch(() => null)
        );
      }
      const results = await Promise.all(promises);
      constituencies.push(...results.filter(Boolean));
    }

    data = buildDashboard(constituencies);
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
  data._constituenciesFetched = data.constituencies.length;

  context.waitUntil(Promise.all([
    env.CACHE.put(KV_KEY, JSON.stringify(data), { expirationTtl: CACHE_TTL * 3 }),
    env.CACHE.delete(LOCK_KEY),
  ]));

  return respond(data, 'MISS', { 'X-Fetch-Duration': fetchDuration + 'ms' });
}

function respond(data, cacheStatus, extraHeaders = {}) {
  const allDeclared = data.countingStatus === 'completed' || (data.summary && data.summary.counting === 0 && data.summary.declared > 0);
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'X-Cache': cacheStatus,
      'X-Source': data._source || 'eci',
      'X-Poll-Interval': allDeclared ? '300' : '30',
      ...extraHeaders,
    },
  });
}
