// Mock ECI - 5 rotating datasets simulating election counting phases
// Cycles every 30s: early → mid → late → near-final → declared

const PARTIES = ['DMK', 'AIADMK', 'TVK', 'NTK', 'BJP', 'IND', 'PMK', 'DMDK'];
const ALLIANCES = { DMK: 'DMK+', AIADMK: 'AIADMK+', TVK: 'TVK+', NTK: 'NTK', BJP: 'AIADMK+', IND: 'Others', PMK: 'AIADMK+', DMDK: 'Others' };
const DISTRICTS = ['Chennai','Coimbatore','Madurai','Tiruchirappalli','Salem','Tirunelveli','Erode','Vellore','Thoothukudi','Thanjavur','Dindigul','Kanchipuram','Tiruvallur','Cuddalore','Villupuram','Nagapattinam','Sivaganga','Ramanathapuram','Virudhunagar','Theni','Nilgiris','Karur','Namakkal','Perambalur','Ariyalur','Tiruvarur','Pudukkottai','Dharmapuri','Krishnagiri','Tiruvannamalai','Ranipet','Chengalpattu','Kallakurichi','Tenkasi'];
const NAMES = ['M. Suresh','R. Lakshmi','K. Selvam','S. Priya','T. Kumar','V. Devi','N. Raja','P. Meena','A. Murugan','B. Kala','C. Rajan','D. Geetha','E. Senthil','F. Rani','G. Babu','H. Malathi'];

// Seeded random for deterministic data per phase
function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
}

function generatePhaseData(phase) {
  // phase 0-4: early(10%) → mid(35%) → late(60%) → near-final(85%) → final(100%)
  const phaseCfg = [
    { declared: 0,   avgRounds: 5,  maxRounds: 22, label: 'Early Counting',     counting: true },
    { declared: 35,  avgRounds: 11, maxRounds: 22, label: 'Mid Counting',       counting: true },
    { declared: 95,  avgRounds: 17, maxRounds: 22, label: 'Late Counting',      counting: true },
    { declared: 170, avgRounds: 20, maxRounds: 22, label: 'Near Final',         counting: true },
    { declared: 234, avgRounds: 22, maxRounds: 22, label: 'All Results Declared', counting: false },
  ][phase];

  const rng = seededRandom(42 + phase * 1000);
  const constituencies = [];

  // Pre-define seat distribution per phase (shifts as counting progresses)
  // DMK+ starts strong, TVK+ surges in later phases, AIADMK+ steady
  const partyStrength = [
    // [DMK, AIADMK, TVK, NTK, BJP, IND, PMK, DMDK] base win probability
    [0.30, 0.25, 0.22, 0.08, 0.05, 0.04, 0.03, 0.03], // phase 0: tight
    [0.32, 0.24, 0.23, 0.07, 0.05, 0.03, 0.03, 0.03], // phase 1: DMK slight edge
    [0.34, 0.22, 0.25, 0.06, 0.04, 0.03, 0.03, 0.03], // phase 2: TVK surging
    [0.33, 0.21, 0.28, 0.06, 0.04, 0.03, 0.03, 0.02], // phase 3: TVK close to DMK
    [0.35, 0.20, 0.27, 0.06, 0.04, 0.03, 0.03, 0.02], // phase 4: DMK wins narrowly
  ][phase];

  for (let i = 0; i < 234; i++) {
    const isDeclared = i < phaseCfg.declared;
    const rounds = isDeclared ? 22 : Math.min(22, Math.max(1, Math.floor(phaseCfg.avgRounds + (rng() - 0.5) * 8)));
    const voteFactor = rounds / 22;

    // Generate candidates for this constituency
    const numCandidates = 3 + Math.floor(rng() * 3);
    const candidates = [];
    const usedParties = new Set();

    for (let c = 0; c < numCandidates; c++) {
      let party;
      do { party = PARTIES[Math.floor(rng() * PARTIES.length)]; } while (usedParties.has(party));
      usedParties.add(party);

      const pIdx = PARTIES.indexOf(party);
      const baseVotes = partyStrength[pIdx] * (60000 + rng() * 80000);
      const noise = (rng() - 0.5) * 20000;
      const votes = Math.max(500, Math.floor((baseVotes + noise) * voteFactor));
      const nameIdx = (i * 3 + c) % NAMES.length;

      candidates.push({
        name: NAMES[nameIdx] + (c > 0 ? ` (${party})` : ''),
        party,
        votes,
        status: '', // filled below
        voteShare: 0,
      });
    }

    // Sort by votes desc
    candidates.sort((a, b) => b.votes - a.votes);
    const totalVotes = candidates.reduce((s, c) => s + c.votes, 0);
    candidates.forEach((c, idx) => {
      c.voteShare = Math.round(c.votes / totalVotes * 1000) / 10;
      c.status = idx === 0 ? (isDeclared ? 'won' : 'leading') : 'trailing';
    });

    const margin = candidates.length > 1 ? candidates[0].votes - candidates[1].votes : candidates[0].votes;

    constituencies.push({
      id: i + 1,
      name: getConstituencyName(i),
      district: DISTRICTS[i % DISTRICTS.length],
      status: isDeclared ? 'declared' : 'counting',
      totalVotes,
      margin,
      roundsCompleted: rounds,
      totalRounds: 22,
      candidates,
    });
  }

  // Compute alliance summary
  const allianceTotals = {};
  constituencies.forEach(c => {
    const winner = c.candidates[0];
    const alliance = ALLIANCES[winner.party] || 'Others';
    if (!allianceTotals[alliance]) allianceTotals[alliance] = { name: alliance, won: 0, leading: 0, total: 0 };
    if (c.status === 'declared') allianceTotals[alliance].won++;
    else allianceTotals[alliance].leading++;
    allianceTotals[alliance].total++;
  });

  const allianceSummary = Object.values(allianceTotals).sort((a, b) => b.total - a.total);

  return {
    totalSeats: 234,
    countingStatus: phaseCfg.counting ? 'in_progress' : 'completed',
    phase: phase + 1,
    phaseLabel: phaseCfg.label,
    summary: {
      declared: phaseCfg.declared,
      counting: 234 - phaseCfg.declared,
    },
    allianceSummary,
    constituencies,
  };
}

function getConstituencyName(i) {
  const names = ['Gummidipoondi','Ponneri','Tiruttani','Arakkonam','Sholinghur','Ranipet','Arcot','Vellore','Anaikattu','Kilvaithinankuppam','Gudiyatham','Vaniyambadi','Ambur','Jolarpet','Tirupattur','Uthangarai','Bargur','Krishnagiri','Veppanahalli','Hosur','Denkanikottai','Kolathur-KV','Cheyyar','Vandavasi','Arani','Polur','Gingee','Villupuram','Tindivanam','Vanur','Vikravandi','Kallakurichi','Gangavalli','Attur','Yercaud','Salem-West','Salem-North','Salem-South','Veerapandi','Rasipuram','Senthamangalam','Namakkal','Paramathi-Velur','Tiruchengode','Kumarapalayam','Erode-East','Erode-West','Modakkurichi','Perundurai','Bhavani','Anthiyur','Gobichettipalayam','Bhavanisagar','Udhagamandalam','Coonoor','Gudalur','Mettupalayam','Avanashi','Tiruppur-North','Tiruppur-South','Palladam','Sulur','Kavundampalayam','Coimbatore-North','Thondamuthur','Coimbatore-South','Singanallur','Kinathukadavu','Pollachi','Valparai','Udumalaipettai','Madathukulam','Dharapuram','Kangeyam','Aravakurichi','Karur','Krishnarayapuram','Kulithalai','Manapparai','Srirangam','Trichy-West','Trichy-East','Thiruverumbur','Lalgudi','Manachanallur','Musiri','Thuraiyur','Perambalur','Kunnam','Ariyalur','Jayankondam','Tittagudi','Vriddhachalam','Neyveli','Panruti','Cuddalore','Kurinjipadi','Bhuvanagiri','Chidambaram','Kattumannarkoil','Sirkazhi','Mayiladuthurai','Poompuhar','Nagapattinam','Kilvelur','Vedaranyam','Thiruthuraipoondi','Mannargudi','Thiruvidaimarudur','Kumbakonam','Papanasam','Thiruvaiyaru','Thanjavur','Orathanadu','Pattukkottai','Peravurani','Gandharvakottai','Viralimalai','Pudukkottai','Thirumayam','Alangudi','Aranthangi','Karaikudi','Sivagangai','Manamadurai','Melur','Madurai-East','Sholavandan','Madurai-North','Madurai-South','Madurai-Central','Madurai-West','Thiruparankundram','Tirumangalam','Usilampatti','Andipatti','Periyakulam','Bodinayakanur','Cumbum','Rajapalayam','Srivilliputhur','Sattur','Sivakasi','Virudhunagar','Aruppukkottai','Tiruchuli','Paramakudi','Tiruvadanai','Ramanathapuram','Mudhukulathur','Vilathikulam','Thoothukkudi','Tiruchendur','Srivaikuntam','Ottapidaram','Kovilpatti','Sankarankovil','Vasudevanallur','Kadayanallur','Tenkasi','Alangulam','Tirunelveli','Ambasamudram','Palayamkottai','Nanguneri','Radhapuram','Kanniyakumari','Nagercoil','Colachel','Padmanabhapuram','Vilavancode','Killiyoor','Thiruvattar','Kolathur','Villivakkam','Ambattur','Maduravoyal','Avadi','Thiruvallur','Poonamallee','Perambur','Perambur-Central','Egmore','Royapuram','Harbour','Chepauk-Thiruvallikeni','Thousand-Lights','Anna-Nagar','Virugambakkam','Saidapet','T-Nagar','Mylapore','Velachery','Sholinganallur','Alandur'];
  return names[i] || `Constituency-${i+1}`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const CORS = { 'Access-Control-Allow-Origin': '*' };

    if (url.pathname === '/count') {
      const count = parseInt(await env.HITS.get('count') || '0');
      const log = JSON.parse(await env.HITS.get('log') || '[]');
      return Response.json({ totalHits: count, log: log.slice(-20) }, { headers: CORS });
    }

    if (url.pathname === '/reset') {
      await env.HITS.put('count', '0');
      await env.HITS.put('log', '[]');
      return Response.json({ reset: true }, { headers: CORS });
    }

    // /data - returns phase-based election data (rotates every 30s)
    const phase = Math.floor(Date.now() / 30000) % 5;

    // Count the hit
    const prev = parseInt(await env.HITS.get('count') || '0');
    const count = prev + 1;
    const now = new Date().toISOString();
    const fetchId = crypto.randomUUID().slice(0, 8);
    await env.HITS.put('count', String(count));
    const log = JSON.parse(await env.HITS.get('log') || '[]');
    log.push({ hit: count, time: now, id: fetchId, phase: phase + 1 });
    if (log.length > 50) log.splice(0, log.length - 50);
    await env.HITS.put('log', JSON.stringify(log));

    // Generate data for current phase
    const data = generatePhaseData(phase);
    data._eciHitNumber = count;
    data._eciHitTime = now;
    data._fetchId = fetchId;

    return Response.json(data, { headers: { ...CORS, 'X-Phase': String(phase + 1) } });
  },
};
