// Cloudflare Worker: ECI Results Proxy
// Fetches live results from ECI, caches for 30 seconds, serves with CORS

const CACHE_TTL = 30; // seconds
const ECI_BASE = 'https://results.eci.gov.in';

// These paths will be updated on May 3/4 when ECI publishes the results page
// Check results.eci.gov.in, open DevTools > Network, find the JSON endpoints
let ECI_ENDPOINTS = {
  // Pattern from past elections - actual paths change each election
  allConstituencies: '/ResultAc498/constituencywise-AllS22.htm',
  partyWise: '/ResultAcXXX/partywiseresult-S22.htm',
};

// For now, serve our mock data (switch to ECI on May 4)
const USE_MOCK = true;
const MOCK_DATA_URL = null; // Set to the Pages URL + /mock_results.json when deployed

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only handle /api/results
    if (url.pathname !== '/api/results') {
      return new Response('Not found', { status: 404 });
    }

    // Check cache first
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), request);
    let response = await cache.match(cacheKey);

    if (response) {
      // Return cached with CORS
      const newResponse = new Response(response.body, response);
      Object.entries(corsHeaders).forEach(([k, v]) => newResponse.headers.set(k, v));
      newResponse.headers.set('X-Cache', 'HIT');
      return newResponse;
    }

    // Cache miss: fetch from source
    let data;
    try {
      if (USE_MOCK) {
        // During development/pre-election: serve mock data
        // This will be replaced with real ECI fetch on May 4
        data = { error: 'Mock mode - deploy with Pages URL set', timestamp: new Date().toISOString() };
      } else {
        // LIVE MODE: Fetch from ECI
        const eciResponse = await fetch(ECI_BASE + ECI_ENDPOINTS.allConstituencies, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Referer': ECI_BASE + '/',
          },
        });

        if (!eciResponse.ok) {
          throw new Error(`ECI returned ${eciResponse.status}`);
        }

        const html = await eciResponse.text();

        // ECI embeds data in script tags or serves JSON directly
        // Parse strategy depends on the actual format (to be determined May 3/4)
        // Option A: Response is JSON directly
        // Option B: HTML with embedded JSON in <script> tags
        // Option C: HTML table that needs parsing

        // Try JSON first
        try {
          data = JSON.parse(html);
        } catch {
          // Extract JSON from HTML script tags
          const jsonMatch = html.match(/var\s+\w+\s*=\s*(\[[\s\S]*?\]);/);
          if (jsonMatch) {
            data = JSON.parse(jsonMatch[1]);
          } else {
            data = { raw: html.substring(0, 5000), error: 'Could not parse ECI response' };
          }
        }
      }
    } catch (err) {
      data = { error: err.message, timestamp: new Date().toISOString() };
    }

    // Build response
    response = new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
        ...corsHeaders,
        'X-Cache': 'MISS',
        'X-Timestamp': new Date().toISOString(),
      },
    });

    // Store in cache
    ctx.waitUntil(cache.put(cacheKey, response.clone()));

    return response;
  },
};
