// Main app: wires everything together

import { loadPartyConfig, onUpdate, startPolling, getPartyColor, getAlliance, getAllianceColor, getPartyConfig } from './data.js';
import { initMap, updateMap, setClickHandler } from './map.js';
import { initCharts, updateCharts } from './charts.js';
import { initModal, openConstituency } from './constituency.js';

// Vite injects the base path from vite.config.js
const BASE = import.meta.env.BASE_URL;

const LEADERS = [
  {
    name: 'M.K. Stalin',
    party: 'DMK', alliance: 'DMK+',
    constituency: 'Kolathur', acNo: 13,
    img: BASE + 'images/leaders/stalin.jpg',
    partyImg: BASE + 'images/parties/dmk.png',
    role: 'Chief Minister',
    side: 'left',
  },
  {
    name: 'Vijay',
    party: 'TVK', alliance: 'TVK+',
    seats: [
      { constituency: 'Perambur', acNo: 12, district: 'Chennai' },
      { constituency: 'Trichy East', acNo: 141, district: 'Tiruchirappalli' },
    ],
    img: BASE + 'images/leaders/vijay.jpg',
    partyImg: BASE + 'images/parties/tvk.png',
    role: 'TVK President',
    side: 'left',
  },
  {
    name: 'E.K. Palaniswami',
    party: 'AIADMK', alliance: 'AIADMK+',
    constituency: 'Edappadi', acNo: 86,
    img: BASE + 'images/leaders/eps.jpg',
    partyImg: BASE + 'images/parties/aiadmk.png',
    role: 'AIADMK General Secy',
    side: 'right',
  },
  {
    name: 'Seeman',
    party: 'NTK', alliance: 'NTK',
    constituency: 'Karaikudi', acNo: 184,
    img: BASE + 'images/leaders/seeman.jpg',
    partyImg: BASE + 'images/parties/ntk.svg',
    role: 'NTK Chief Coordinator',
    side: 'right',
  },
];

let sortCol = 'id';
let sortAsc = true;
let filterSearch = '';
let filterDistrict = '';
let filterParty = '';
let filterStatus = '';

async function init() {
  await loadPartyConfig();
  initCharts();
  initModal();
  initTabs();
  initFilters();
  initSort();
  setClickHandler(openConstituency);

  onUpdate((data) => {
    renderStats(data);
    renderAllianceBar(data);
    renderTable(data);
    renderSidebars(data);
    updateMap();
    updateCharts(data);
    updateLastUpdated(data);
  });

  await initMap();
  await startPolling();
}

// --- Sidebars ---
function renderSidebars(data) {
  const config = getPartyConfig();
  if (!config || !data.allianceSummary) return;

  const allianceTotals = {};
  (data.allianceSummary || []).forEach(a => { allianceTotals[a.name] = a; });

  document.getElementById('sidebarLeft').innerHTML =
    LEADERS.filter(l => l.side === 'left').map(l => buildLeaderCard(l, data, config, allianceTotals)).join('');
  document.getElementById('sidebarRight').innerHTML =
    LEADERS.filter(l => l.side === 'right').map(l => buildLeaderCard(l, data, config, allianceTotals)).join('');
}

function getSeatResult(acNo, partyName, data, config) {
  const cr = data.constituencies.find(c => c.id === acNo);
  if (!cr || cr.candidates.length === 0) return null;
  const myIdx = cr.candidates.findIndex(c => c.party === partyName);
  const isLeading = myIdx === 0;
  const margin = isLeading ? cr.margin : -cr.margin;
  const votes = myIdx >= 0 ? cr.candidates[myIdx].votes : 0;
  let rival = null;
  if (isLeading && cr.candidates.length > 1) {
    rival = cr.candidates[1];
  } else if (!isLeading) {
    rival = cr.candidates[0];
  }
  let status = '';
  if (cr.status === 'declared' && isLeading) status = 'WON';
  else if (isLeading) status = 'LEADING';
  else status = 'TRAILING';
  return { status, margin, votes, isLeading, rival, constName: cr.name };
}

function buildSeatBlock(seatCfg, leader, data, config) {
  const color = config.parties[leader.party]?.color || '#6b7280';
  const r = getSeatResult(seatCfg.acNo, leader.party, data, config);
  if (!r) return '';
  const stColor = r.status === 'WON' ? 'var(--green)' : r.status === 'LEADING' ? 'var(--accent)' : 'var(--red)';
  const rivalColor = r.rival ? (config.parties[r.rival.party]?.color || '#6b7280') : '#6b7280';
  return `
    <div style="background:var(--bg-primary);border-radius:6px;padding:7px 9px;text-align:left;cursor:pointer" onclick="event.stopPropagation();window.__openConstituency && window.__openConstituency(${seatCfg.acNo})">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:0.7rem;font-weight:600">${seatCfg.constituency}</span>
        <span style="font-size:0.58rem;font-weight:700;color:${stColor}">${r.status}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:5px">
        <div style="display:flex;align-items:center;gap:4px">
          <span class="party-badge" style="background:${color};font-size:0.52rem;padding:1px 5px">${leader.party}</span>
          <span style="font-size:0.65rem;font-weight:500">${leader.name.split(' ').pop()}</span>
        </div>
        <span style="font-size:0.7rem;font-weight:700;font-variant-numeric:tabular-nums">${r.votes.toLocaleString()}</span>
      </div>
      ${r.rival ? `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:3px;opacity:0.6">
        <div style="display:flex;align-items:center;gap:4px">
          <span class="party-badge" style="background:${rivalColor};font-size:0.52rem;padding:1px 5px">${r.rival.party}</span>
          <span style="font-size:0.62rem">${r.rival.name.length > 12 ? r.rival.name.split(' ').pop() : r.rival.name}</span>
        </div>
        <span style="font-size:0.65rem;font-variant-numeric:tabular-nums">${r.rival.votes.toLocaleString()}</span>
      </div>
      <div style="margin-top:4px;height:3px;border-radius:2px;background:var(--bg-hover);overflow:hidden">
        <div style="height:100%;width:${Math.min(100, Math.abs(r.margin) / 500)}%;background:${r.isLeading ? color : rivalColor};border-radius:2px;transition:width 0.6s"></div>
      </div>
      ` : ''}
    </div>`;
}

function buildLeaderCard(leader, data, config, allianceTotals) {
  const partyInfo = config.parties[leader.party];
  const color = partyInfo?.color || '#6b7280';
  const ad = allianceTotals[leader.alliance] || { won: 0, leading: 0, total: 0 };

  // Build seat blocks: multi-seat (Vijay) or single-seat
  const seatList = leader.seats || [{ constituency: leader.constituency, acNo: leader.acNo }];
  const seatBlocksHtml = seatList.map(s => buildSeatBlock(s, leader, data, config)).join('');
  const primaryAcNo = seatList[0].acNo;

  return `
    <div class="leader-card" onclick="window.__openConstituency && window.__openConstituency(${primaryAcNo})" style="cursor:pointer">
      <div class="leader-photo-hero">
        <img src="${leader.img}" alt="${leader.name}">
        <div class="leader-gradient" style="background:linear-gradient(to top, ${color}cc 0%, ${color}44 40%, transparent 100%)"></div>
        <img class="party-symbol-badge" src="${leader.partyImg}" alt="${leader.party}" onerror="this.style.display='none'">
        <div class="leader-hero-role">${leader.role}</div>
        <div class="leader-hero-name">${leader.name}</div>
      </div>
      <div class="leader-card-body">
        <div style="display:flex;flex-direction:column;gap:5px;margin-bottom:6px">
          ${seatBlocksHtml}
        </div>
        <div style="background:var(--bg-primary);border-radius:6px;padding:7px 9px;text-align:left">
          <div style="font-size:0.55rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em">${leader.alliance} Overall</div>
          <div style="display:flex;align-items:baseline;gap:6px;margin-top:2px">
            <span style="font-size:1.3rem;font-weight:700;color:${color};line-height:1">${ad.total}</span>
            <span style="font-size:0.6rem;color:var(--text-muted)">of 234</span>
          </div>
          <div style="display:flex;gap:8px;margin-top:3px">
            <span style="font-size:0.58rem;color:var(--green)">Won ${ad.won}</span>
            <span style="font-size:0.58rem;color:var(--accent)">Lead ${ad.leading}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

window.__openConstituency = null;

// --- Stats Row ---
function renderStats(data) {
  const el = document.getElementById('statsRow');
  const stats = [
    { label: 'Total Seats', value: data.totalSeats, color: 'var(--accent)' },
    { label: 'Results Declared', value: data.summary.declared, color: 'var(--green)' },
    { label: 'Counting', value: data.summary.counting, color: 'var(--yellow)' },
  ];
  if (data.allianceSummary) {
    data.allianceSummary.forEach(a => {
      if (a.total > 0) {
        stats.push({ label: a.name, value: a.total, sub: `Won ${a.won} · Lead ${a.leading}`, color: getAllianceColor(a.name) });
      }
    });
  }
  el.innerHTML = stats.map(s => `
    <div class="stat-card">
      <div class="stat-number" style="color:${s.color}">${s.value}</div>
      <div class="stat-label">${s.label}</div>
      ${s.sub ? `<div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px">${s.sub}</div>` : ''}
    </div>
  `).join('');
}

// --- Alliance Bar ---
function renderAllianceBar(data) {
  const bar = document.getElementById('allianceBar');
  const legend = document.getElementById('allianceLegend');
  const majorityLine = document.getElementById('majorityLine');
  if (!data.allianceSummary) return;

  const total = data.totalSeats;
  const majority = Math.ceil(total / 2) + 1;

  bar.innerHTML = data.allianceSummary.map(a => {
    if (a.total === 0) return '';
    const pct = (a.total / total * 100).toFixed(1);
    return `<div class="alliance-bar-segment" style="width:${pct}%;background:${getAllianceColor(a.name)}" title="${a.name}: ${a.total}">${a.total > 10 ? a.total : ''}</div>`;
  }).join('');

  majorityLine.style.left = (majority / total * 100).toFixed(1) + '%';
  majorityLine.style.display = 'block';

  legend.innerHTML = data.allianceSummary.map(a => `
    <div class="alliance-legend-item">
      <div class="alliance-dot" style="background:${getAllianceColor(a.name)}"></div>
      <span class="alliance-count">${a.total}</span>
      <span class="alliance-name">${a.name} (Won ${a.won} · Lead ${a.leading})</span>
    </div>
  `).join('');
}

// --- Table ---
function getFilteredData(data) {
  if (!data) return [];
  let rows = data.constituencies;
  if (filterSearch) {
    const q = filterSearch.toLowerCase();
    rows = rows.filter(c => c.name.toLowerCase().includes(q) || c.district.toLowerCase().includes(q) || (c.candidates[0]?.name.toLowerCase().includes(q)));
  }
  if (filterDistrict) rows = rows.filter(c => c.district === filterDistrict);
  if (filterParty) rows = rows.filter(c => c.candidates[0]?.party === filterParty);
  if (filterStatus) rows = rows.filter(c => c.status === filterStatus);
  rows = [...rows].sort((a, b) => {
    let va, vb;
    switch (sortCol) {
      case 'id': va = a.id; vb = b.id; break;
      case 'name': va = a.name; vb = b.name; break;
      case 'district': va = a.district; vb = b.district; break;
      case 'leading': va = a.candidates[0]?.name || ''; vb = b.candidates[0]?.name || ''; break;
      case 'party': va = a.candidates[0]?.party || ''; vb = b.candidates[0]?.party || ''; break;
      case 'margin': va = a.margin; vb = b.margin; break;
      case 'status': va = a.status; vb = b.status; break;
      default: va = a.id; vb = b.id;
    }
    return typeof va === 'string' ? (sortAsc ? va.localeCompare(vb) : vb.localeCompare(va)) : (sortAsc ? va - vb : vb - va);
  });
  return rows;
}

function renderTable(data) {
  const tbody = document.getElementById('resultsBody');
  const rows = getFilteredData(data);
  tbody.innerHTML = rows.map(c => {
    const leader = c.candidates[0];
    const color = leader ? getPartyColor(leader.party) : '#6b7280';
    const stCls = c.status === 'declared' ? 'status-won' : 'status-counting';
    const stTxt = c.status === 'declared' ? 'WON' : 'COUNTING';
    return `<tr data-ac="${c.id}">
      <td style="color:var(--text-muted);font-size:0.75rem">${c.id}</td>
      <td style="font-weight:600">${c.name}</td>
      <td style="color:var(--text-secondary)">${c.district}</td>
      <td>${leader ? leader.name : '-'}</td>
      <td>${leader ? `<span class="party-badge" style="background:${color}">${leader.party}</span>` : '-'}</td>
      <td style="font-weight:600;font-variant-numeric:tabular-nums">${c.margin.toLocaleString()}</td>
      <td><span class="status-badge ${stCls}">${stTxt}</span></td>
    </tr>`;
  }).join('');
  document.getElementById('tableCount').textContent = `Showing ${rows.length} of ${data.constituencies.length} constituencies`;
  tbody.querySelectorAll('tr').forEach(tr => tr.addEventListener('click', () => openConstituency(parseInt(tr.dataset.ac))));
  populateFilters(data);
}

function populateFilters(data) {
  const ds = document.getElementById('districtFilter');
  const ps = document.getElementById('partyFilter');
  if (ds.options.length <= 1) [...new Set(data.constituencies.map(c => c.district))].sort().forEach(d => { const o = document.createElement('option'); o.value = d; o.textContent = d; ds.appendChild(o); });
  if (ps.options.length <= 1) [...new Set(data.constituencies.map(c => c.candidates[0]?.party).filter(Boolean))].sort().forEach(p => { const o = document.createElement('option'); o.value = p; o.textContent = p; ps.appendChild(o); });
}

function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).style.display = 'block';
  }));
}

function initFilters() {
  const h = () => { const d = window.__currentData; if (d) renderTable(d); };
  document.getElementById('searchInput').addEventListener('input', e => { filterSearch = e.target.value; h(); });
  document.getElementById('districtFilter').addEventListener('change', e => { filterDistrict = e.target.value; h(); });
  document.getElementById('partyFilter').addEventListener('change', e => { filterParty = e.target.value; h(); });
  document.getElementById('statusFilter').addEventListener('change', e => { filterStatus = e.target.value; h(); });
  onUpdate(d => { window.__currentData = d; });
}

function initSort() {
  document.querySelectorAll('.results-table thead th[data-sort]').forEach(th => th.addEventListener('click', () => {
    const col = th.dataset.sort;
    if (sortCol === col) sortAsc = !sortAsc; else { sortCol = col; sortAsc = true; }
    document.querySelectorAll('.results-table thead th').forEach(h => h.style.color = '');
    th.style.color = 'var(--accent)';
    const d = window.__currentData; if (d) renderTable(d);
  }));
}

function updateLastUpdated(data) {
  const el = document.getElementById('lastUpdated');
  if (data.lastUpdated) {
    el.textContent = `Updated: ${new Date(data.lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  }
}

init().then(() => { window.__openConstituency = openConstituency; }).catch(console.error);
