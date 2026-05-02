// ECI → Dashboard JSON transformer
// Port of data/transform_eci.py

const PARTY_MAP = {
  'Dravida Munnetra Kazhagam': 'DMK',
  'Indian National Congress': 'INC',
  'Viduthalai Chiruthaigal Katchi': 'VCK',
  'Communist Party of India': 'CPI',
  'Communist Party of India (Marxist)': 'CPI(M)',
  'Indian Union Muslim League': 'IUML',
  'All India Anna Dravida Munnetra Kazhagam': 'AIADMK',
  'Bharatiya Janata Party': 'BJP',
  'Pattali Makkal Katchi': 'PMK',
  'Desiya Murpokku Dravida Kazhagam': 'DMDK',
  'Naam Tamilar Katchi': 'NTK',
  'Tamilaga Vettri Kazhagam': 'TVK',
  'Amma Makkal Munnetra Kazhagam': 'AMMK',
};

const ALLIANCE_MAP = {
  DMK: 'DMK+', INC: 'DMK+', VCK: 'DMK+', CPI: 'DMK+',
  'CPI(M)': 'DMK+', IUML: 'DMK+', MDMK: 'DMK+',
  AIADMK: 'AIADMK+', BJP: 'AIADMK+', PMK: 'AIADMK+', DMDK: 'AIADMK+',
  TVK: 'TVK+', NTK: 'NTK',
};

function getPartyAbbr(fullName) {
  if (PARTY_MAP[fullName]) return PARTY_MAP[fullName];
  if (fullName.includes('Independent')) return 'IND';
  return fullName.slice(0, 4).toUpperCase();
}

function getAlliance(party) {
  return ALLIANCE_MAP[party] || 'Others';
}

// Transform ECI JSON format to dashboard format
export function transformECIJson(eciData) {
  const allianceCounts = {};
  const constituencies = [];
  let declared = 0;

  const results = eciData.constituencywise_results || eciData.results || eciData || [];
  const resultList = Array.isArray(results) ? results : Object.values(results);

  for (const constData of resultList) {
    const vd = constData.voting_data || constData;
    const acNo = parseInt(vd.constituency_no || vd.ac_no || vd.id || 0);
    const acName = vd.constituency || vd.ac_name || vd.name || `AC-${acNo}`;
    const district = vd.district || vd.dist_name || '';
    const status = vd.status === 'Result Declared' || vd.declared ? 'declared' : 'counting';
    if (status === 'declared') declared++;

    const tally = vd.voting_tally || vd.candidates || vd.tally || [];
    const candidates = tally.map(c => {
      const evm = parseInt(String(c.evm_votes || c.votes || 0).replace(/,/g, ''));
      const postal = parseInt(String(c.postal_votes || 0).replace(/,/g, ''));
      const total = evm + postal;
      return {
        name: c.candidate || c.name || '',
        party: getPartyAbbr(c.party || ''),
        votes: total,
        status: 'trailing',
        voteShare: 0,
      };
    }).sort((a, b) => b.votes - a.votes);

    const totalVotes = candidates.reduce((s, c) => s + c.votes, 0);
    candidates.forEach((c, i) => {
      c.voteShare = totalVotes > 0 ? Math.round(c.votes / totalVotes * 1000) / 10 : 0;
      c.status = i === 0 ? (status === 'declared' ? 'won' : 'leading') : 'trailing';
    });

    const margin = candidates.length > 1 ? candidates[0].votes - candidates[1].votes : 0;
    const leaderAlliance = candidates.length > 0 ? getAlliance(candidates[0].party) : 'Others';

    if (!allianceCounts[leaderAlliance]) allianceCounts[leaderAlliance] = { won: 0, leading: 0 };
    if (status === 'declared') allianceCounts[leaderAlliance].won++;
    else allianceCounts[leaderAlliance].leading++;

    constituencies.push({
      id: acNo, name: acName, district, status, totalVotes, margin,
      roundsCompleted: parseInt(vd.rounds_completed || vd.round || 0),
      totalRounds: parseInt(vd.total_rounds || 22),
      candidates,
    });
  }

  const allianceOrder = ['DMK+', 'AIADMK+', 'TVK+', 'NTK', 'Others'];
  const allianceSummary = allianceOrder.map(name => {
    const c = allianceCounts[name] || { won: 0, leading: 0 };
    return { name, won: c.won, leading: c.leading, total: c.won + c.leading };
  });

  return {
    totalSeats: 234,
    countingStatus: declared === 234 ? 'completed' : 'in_progress',
    summary: { declared, counting: 234 - declared },
    allianceSummary,
    constituencies,
  };
}

// Transform ECI HTML (constituency-wise pages with tables)
export function transformECIHtml(html) {
  const constituencies = [];
  // ECI HTML has tables with candidate rows
  // Pattern: <tr> <td>candidate</td> <td>party</td> <td>evm_votes</td> <td>postal</td> <td>total</td> </tr>
  const tableMatch = html.match(/<table[^>]*class="[^"]*table[^"]*"[^>]*>([\s\S]*?)<\/table>/gi);
  if (!tableMatch) throw new Error('No tables found in ECI HTML');

  // Parse each table row
  const rows = html.matchAll(/<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/gi);

  for (const row of rows) {
    const name = row[1].replace(/<[^>]+>/g, '').trim();
    const party = row[2].replace(/<[^>]+>/g, '').trim();
    const votes = parseInt(row[5].replace(/<[^>]+>/g, '').replace(/,/g, '').trim()) || 0;
    if (name && party && votes > 0) {
      constituencies.push({ name, party: getPartyAbbr(party), votes });
    }
  }

  // This is a basic parser. On May 4, inspect actual HTML and adjust selectors.
  return constituencies;
}
