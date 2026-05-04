// Constituency detail modal

import { getPartyColor, getData } from './data.js';

const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');

export function initModal() {
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
}

export function openConstituency(acNo) {
  const data = getData();
  if (!data) return;

  const c = data.constituencies.find(x => x.id === acNo);
  if (!c) return;

  const maxVotes = Math.max(...c.candidates.map(x => x.votes));
  const statusClass = c.status === 'declared' ? 'status-won' : 'status-counting';
  const statusText = c.status === 'declared' ? 'DECLARED' : 'COUNTING';

  const candidatesHtml = c.candidates.map((cand, i) => {
    const color = getPartyColor(cand.party);
    const barW = (cand.votes / maxVotes * 100).toFixed(1);
    const isLead = i === 0;
    const rankStyle = isLead
      ? `background:${color};color:white`
      : `background:var(--bg-hover);color:var(--text-muted)`;

    return `
      <div class="candidate-row">
        <div class="candidate-rank" style="${rankStyle}">${i + 1}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <div>
              <span style="font-weight:${isLead ? '600' : '400'};font-size:0.88rem">${cand.name}</span>
              <span class="party-badge" style="background:${color};margin-left:6px">${cand.party}</span>
            </div>
            <div style="text-align:right;flex-shrink:0;margin-left:8px">
              <span style="font-weight:600;font-size:0.9rem">${cand.votes.toLocaleString('en-IN')}</span>
              <span style="color:var(--text-muted);font-size:0.75rem;margin-left:3px">(${cand.voteShare}%)</span>
            </div>
          </div>
          <div style="background:var(--bg-primary);border-radius:3px;height:5px;overflow:hidden">
            <div class="candidate-bar" style="width:${barW}%;background:${color}"></div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  modalContent.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
      <div>
        <h2 style="font-size:1.1rem;font-weight:700">${c.name}</h2>
        <div style="color:var(--text-muted);font-size:0.8rem;margin-top:2px">${c.district ? c.district + " &middot; " : ""}#${c.id}</div>
      </div>
      <button class="modal-close" onclick="document.getElementById('modal').classList.remove('active')">&times;</button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px">
      <div style="background:var(--bg-primary);padding:8px 12px;border-radius:6px">
        <div style="font-size:0.62rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em">Status</div>
        <span class="status-badge ${statusClass}" style="margin-top:3px">${statusText}</span>
      </div>
      <div style="background:var(--bg-primary);padding:8px 12px;border-radius:6px">
        <div style="font-size:0.62rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em">Margin</div>
        <div style="font-weight:700;font-size:1rem;margin-top:3px">${c.margin.toLocaleString('en-IN')}</div>
      </div>
      <div style="background:var(--bg-primary);padding:8px 12px;border-radius:6px">
        <div style="font-size:0.62rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em">Rounds</div>
        <div style="font-weight:700;font-size:1rem;margin-top:3px">${c.roundsCompleted}/${c.totalRounds}</div>
      </div>
      <div style="background:var(--bg-primary);padding:8px 12px;border-radius:6px">
        <div style="font-size:0.62rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em">Total Votes</div>
        <div style="font-weight:700;font-size:1rem;margin-top:3px">${(c.totalVotes / 1000).toFixed(0)}K</div>
      </div>
    </div>

    <div style="font-size:0.75rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px">Candidates</div>
    <div style="display:flex;flex-direction:column;gap:2px">${candidatesHtml}</div>
  `;

  modal.classList.add('active');
}

function closeModal() { modal.classList.remove('active'); }
