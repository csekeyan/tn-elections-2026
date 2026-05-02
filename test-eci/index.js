// Mock ECI - counts hits via KV, returns unique fetch ID per request

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const CORS = { 'Access-Control-Allow-Origin': '*' };

    // /count - show hits
    if (url.pathname === '/count') {
      const count = parseInt(await env.HITS.get('count') || '0');
      const log = JSON.parse(await env.HITS.get('log') || '[]');
      return Response.json({ totalHits: count, log: log.slice(-20) }, { headers: CORS });
    }

    // /reset
    if (url.pathname === '/reset') {
      await env.HITS.put('count', '0');
      await env.HITS.put('log', '[]');
      return Response.json({ reset: true }, { headers: CORS });
    }

    // /data - simulate ECI response, count the hit
    const prev = parseInt(await env.HITS.get('count') || '0');
    const count = prev + 1;
    const now = new Date().toISOString();
    const fetchId = crypto.randomUUID().slice(0, 8);

    // Update KV
    await env.HITS.put('count', String(count));
    const log = JSON.parse(await env.HITS.get('log') || '[]');
    log.push({ hit: count, time: now, id: fetchId });
    if (log.length > 50) log.splice(0, log.length - 50);
    await env.HITS.put('log', JSON.stringify(log));

    // Build response
    const data = {
      totalSeats: 234,
      countingStatus: 'in_progress',
      summary: { declared: 49, counting: 185 },
      _eciHitNumber: count,
      _eciHitTime: now,
      _fetchId: fetchId,
      allianceSummary: [
        { name: 'DMK+', won: 20, leading: 65, total: 85, color: '#c4515f' },
        { name: 'AIADMK+', won: 15, leading: 50, total: 65, color: '#4daa8d' },
        { name: 'TVK+', won: 10, leading: 35, total: 45, color: '#c9a84c' },
        { name: 'NTK', won: 2, leading: 15, total: 17, color: '#8b5e6b' },
        { name: 'Others', won: 2, leading: 20, total: 22, color: '#808080' },
      ],
      constituencies: Array.from({ length: 234 }, (_, i) => ({
        id: i + 1,
        name: `Constituency ${i + 1}`,
        district: `District ${Math.floor(i / 7) + 1}`,
        status: i < 49 ? 'declared' : 'counting',
        totalVotes: 50000 + Math.floor(Math.random() * 100000),
        margin: 500 + Math.floor(Math.random() * 30000),
        roundsCompleted: i < 49 ? 22 : 10 + Math.floor(Math.random() * 12),
        totalRounds: 22,
        candidates: [
          { name: `Leader ${i+1}`, party: ['DMK','AIADMK','TVK','NTK','BJP'][i%5], votes: 30000+Math.floor(Math.random()*50000), status: 'leading', voteShare: 45 },
          { name: `Rival ${i+1}`, party: ['AIADMK','DMK','NTK','TVK','IND'][i%5], votes: 20000+Math.floor(Math.random()*30000), status: 'trailing', voteShare: 35 },
        ],
      })),
    };

    return Response.json(data, { headers: { ...CORS, 'X-ECI-Hit': String(count), 'X-Fetch-Id': fetchId } });
  },
};
