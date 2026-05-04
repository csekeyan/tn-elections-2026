// ECI HTML → Dashboard JSON transformer
// Parses per-constituency HTML pages from results.eci.gov.in

const PARTY_MAP = {
  'Dravida Munnetra Kazhagam': 'DMK',
  'Indian National Congress': 'INC',
  'Viduthalai Chiruthaigal Katchi': 'VCK',
  'Communist Party of India': 'CPI',
  'Communist Party of India (Marxist)': 'CPI(M)',
  'Indian Union Muslim League': 'IUML',
  'Marumalarchi Dravida Munnetra Kazhagam': 'MDMK',
  'Kongunadu Makkal Desiya Katchi': 'KMDK',
  'All India Anna Dravida Munnetra Kazhagam': 'AIADMK',
  'Bharatiya Janata Party': 'BJP',
  'Pattali Makkal Katchi': 'PMK',
  'Desiya Murpokku Dravida Kazhagam': 'DMDK',
  'Naam Tamilar Katchi': 'NTK',
  'Tamilaga Vettri Kazhagam': 'TVK',
  'Amma Makkal Munnetra Kazhagam': 'AMMK',
  'Tamil Maanila Congress (Moopanar)': 'TMC(M)',
  'Bahujan Samaj Party': 'BSP',
  'None of the Above': 'NOTA',
};

const ALLIANCE_MAP = {
  DMK: 'DMK+', INC: 'DMK+', VCK: 'DMK+', CPI: 'DMK+',
  'CPI(M)': 'DMK+', IUML: 'DMK+', MDMK: 'DMK+', KMDK: 'DMK+', 'TMC(M)': 'DMK+',
  AIADMK: 'AIADMK+', BJP: 'AIADMK+', PMK: 'AIADMK+', DMDK: 'AIADMK+',
  TVK: 'TVK+', NTK: 'NTK',
};

function getPartyAbbr(fullName) {
  if (!fullName) return 'IND';
  const mapped = PARTY_MAP[fullName.trim()];
  if (mapped) return mapped;
  if (fullName.includes('Independent')) return 'IND';
  // Fallback: first word abbreviation
  return fullName.trim().slice(0, 6).toUpperCase();
}

function getAlliance(party) {
  return ALLIANCE_MAP[party] || 'Others';
}

// Parse a single constituency HTML page from ECI
export function parseConstituencyHtml(html, acNo) {
  // Extract constituency name: <h2>Assembly Constituency <span> 1 - GUMMIDIPOONDI<Strong>...
  let acName = `AC-${acNo}`;
  const nameMatch = html.match(/Assembly Constituency\s*<span>\s*\d+\s*-\s*([^<]+)/i);
  if (nameMatch) {
    acName = nameMatch[1].trim().replace(/\s*\(Tamil Nadu\)/i, '');
  }

  // Extract round info: Status as on Round, <span>X</span>/Y
  let roundsCompleted = 0, totalRounds = 25;
  const roundMatch = html.match(/Status as on Round[^<]*<span>(\d+)<\/span>\s*\/\s*(\d+)/i);
  if (roundMatch) {
    roundsCompleted = parseInt(roundMatch[1]) || 0;
    totalRounds = parseInt(roundMatch[2]) || 25;
  }

  // Check if result declared
  const isDeclared = html.includes('Result Declared') || html.includes('result declared');

  // Parse candidate rows from table
  // Format: <tr><td>SN</td><td>Candidate</td><td>Party</td><td>EVM</td><td>Postal</td><td>Total</td><td>%</td></tr>
  const candidates = [];
  const rowRegex = /<tr>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<\/tr>/gi;
  
  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    const candidateName = match[2].trim();
    const partyFull = match[3].trim();
    const evmVotes = parseInt(match[4].replace(/,/g, '').trim()) || 0;
    const postalVotes = parseInt(match[5].replace(/,/g, '').trim()) || 0;
    const totalVotes = parseInt(match[6].replace(/,/g, '').trim()) || 0;

    candidates.push({
      name: candidateName,
      party: getPartyAbbr(partyFull),
      votes: totalVotes || (evmVotes + postalVotes),
      evm: evmVotes,
      postal: postalVotes,
      status: 'trailing',
      voteShare: 0,
    });
  }

  // Sort by votes descending
  candidates.sort((a, b) => b.votes - a.votes);

  // Compute vote share and status
  const totalVotes = candidates.reduce((s, c) => s + c.votes, 0);
  candidates.forEach((c, i) => {
    c.voteShare = totalVotes > 0 ? Math.round(c.votes / totalVotes * 1000) / 10 : 0;
    if (i === 0 && totalVotes > 0) {
      c.status = isDeclared ? 'won' : 'leading';
    }
  });

  const margin = candidates.length > 1 ? candidates[0].votes - candidates[1].votes : 0;
  const status = isDeclared ? 'declared' : (totalVotes > 0 ? 'counting' : 'not_started');

  return {
    id: acNo,
    name: acName,
    status,
    totalVotes,
    margin,
    roundsCompleted,
    totalRounds,
    candidates,
  };
}

// Build full dashboard JSON from array of parsed constituencies
export function buildDashboard(constituencies) {
  const allianceCounts = {};
  let declared = 0;
  let counting = 0;

  for (const c of constituencies) {
    if (c.status === 'declared') declared++;
    else if (c.status === 'counting') counting++;

    if (c.candidates.length > 0 && c.totalVotes > 0) {
      const leader = c.candidates[0];
      const alliance = getAlliance(leader.party);
      if (!allianceCounts[alliance]) allianceCounts[alliance] = { won: 0, leading: 0 };
      if (c.status === 'declared') allianceCounts[alliance].won++;
      else allianceCounts[alliance].leading++;
    }
  }

  const allianceOrder = ['DMK+', 'AIADMK+', 'TVK+', 'NTK', 'Others'];
  const allianceSummary = allianceOrder.map(name => {
    const c = allianceCounts[name] || { won: 0, leading: 0 };
    return { name, won: c.won, leading: c.leading, total: c.won + c.leading };
  });

  // Sort constituencies by ID
  constituencies.sort((a, b) => a.id - b.id);

  return {
    totalSeats: 234,
    countingStatus: declared === 234 ? 'completed' : (counting > 0 || declared > 0 ? 'in_progress' : 'not_started'),
    summary: { declared, counting, notStarted: 234 - declared - counting },
    allianceSummary,
    constituencies,
  };
}
