// /api/results - STATIC MODE: serves final results from embedded JSON
// Switch to this when all 234 declared to avoid KV reads

import finalData from './final_results.json';

export async function onRequestGet(context) {
  return new Response(JSON.stringify(finalData), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=86400, max-age=0, must-revalidate',
      'X-Cache': 'STATIC',
      'X-Source': 'final',
      'X-Poll-Interval': '3600',
    },
  });
}

export async function onRequestPost(context) {
  return new Response(JSON.stringify({ error: 'Results finalized, static mode' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
