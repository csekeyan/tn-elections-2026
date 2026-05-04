// /api/results - GET reads from KV, POST writes to KV (from local scraper)
const KV_KEY = 'api:results';
const WRITE_TOKEN = 'tn2026live';

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.CACHE) return jsonResponse({ error: 'KV not bound' }, 500);

  try {
    const raw = await env.CACHE.get(KV_KEY, { type: 'text' });
    if (!raw) {
      return jsonResponse({
        totalSeats: 234,
        countingStatus: 'not_started',
        summary: { declared: 0, counting: 0, notStarted: 234 },
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
      }, 200, { 'X-Cache': 'EMPTY', 'X-Poll-Interval': '60' });
    }

    const data = JSON.parse(raw);
    const allDeclared = data.countingStatus === 'completed';
    return new Response(raw, {
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': 'HIT',
        'X-Source': data._source || 'eci-local',
        'X-Poll-Interval': allDeclared ? '300' : '30',
      },
    });
  } catch (e) {
    return jsonResponse({ error: e.message }, 500);
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;
  if (!env.CACHE) return jsonResponse({ error: 'KV not bound' }, 500);

  const url = new URL(request.url);
  const token = url.searchParams.get('token') || request.headers.get('X-Token');
  if (token !== WRITE_TOKEN) return jsonResponse({ error: 'unauthorized' }, 401);

  try {
    const body = await request.text();
    await env.CACHE.put(KV_KEY, body);
    const data = JSON.parse(body);
    return jsonResponse({
      ok: true,
      size: body.length,
      constituencies: data._constituenciesFetched || 0,
      status: data.countingStatus,
    });
  } catch (e) {
    return jsonResponse({ error: e.message }, 500);
  }
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}
