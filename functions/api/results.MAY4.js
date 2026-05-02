// /api/results - LIVE VERSION (copy to results.js on May 4)
// Only 2 things to update: ECI_URL and the fetch/transform logic

import { transformECIJson } from './_transform.js';

const CACHE_TTL = 30;
const KV_KEY = 'api:results';

// ── UPDATE THIS on May 4 ──
const ECI_URL = 'https://results.eci.gov.in/REPLACE_WITH_ACTUAL_PATH';
// Example patterns from past elections:
//   /ResultAcGenMay2026/partywiseresult-S22.htm
//   /ResultAcGenMay2026/constituencywiseAllS22.htm

export async function onRequestGet(context) {
  const { env } = context;

  // Check KV cache
  if (env.CACHE) {
    const cached = await env.CACHE.get(KV_KEY, { type: 'json', cacheTtl: CACHE_TTL });
    if (cached && cached._cachedAt) {
      const age = Math.floor((Date.now() - cached._cachedAt) / 1000);
      if (age < CACHE_TTL) {
        return Response.json(cached, {
          headers: { 'X-Cache': 'HIT', 'X-Cache-Age': age + 's' },
        });
      }
    }
  }

  // Cache miss: fetch from ECI
  let data;
  const fetchStart = Date.now();
  try {
    const res = await fetch(ECI_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/json,*/*',
        'Referer': 'https://results.eci.gov.in/',
      },
    });
    if (!res.ok) throw new Error(`ECI returned ${res.status}`);

    const raw = await res.text();

    // Try JSON first, fall back to HTML transform
    try {
      const json = JSON.parse(raw);
      data = transformECIJson(json);
    } catch {
      // If ECI returns HTML, you'll need to adjust transformECIHtml
      // or extract embedded JSON from script tags:
      const scriptMatch = raw.match(/var\s+\w+\s*=\s*(\{[\s\S]*?\});/);
      if (scriptMatch) {
        data = transformECIJson(JSON.parse(scriptMatch[1]));
      } else {
        throw new Error('Cannot parse ECI response. Check format in DevTools.');
      }
    }
  } catch (err) {
    // Serve stale cache if upstream fails
    if (env.CACHE) {
      const stale = await env.CACHE.get(KV_KEY, { type: 'json' });
      if (stale) return Response.json(stale, { headers: { 'X-Cache': 'STALE', 'X-Error': err.message } });
    }
    return Response.json({ error: err.message }, { status: 502 });
  }

  data.lastUpdated = new Date().toISOString();
  data._source = 'eci';
  data._fetchDuration = (Date.now() - fetchStart) + 'ms';
  data._cachedAt = Date.now();

  if (env.CACHE) {
    context.waitUntil(env.CACHE.put(KV_KEY, JSON.stringify(data), { expirationTtl: CACHE_TTL * 2 }));
  }

  return Response.json(data, {
    headers: { 'X-Cache': 'MISS', 'X-Source': 'eci', 'X-Fetch-Duration': data._fetchDuration },
  });
}
