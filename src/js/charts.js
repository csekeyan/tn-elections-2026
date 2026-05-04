// Chart.js visualizations - fixed sizing, labels on chart

import { getPartyColor, getAllianceColor, getPartyConfig } from './data.js';

let partyChart = null;
let voteShareChart = null;

export function initCharts() {
  Chart.defaults.color = '#8896a8';
  Chart.defaults.font.family = "'DM Sans', 'Inter', system-ui, sans-serif";
  Chart.defaults.animation = { duration: 600, easing: 'easeOutQuart' };
}

export function updateCharts(data) {
  if (!data) return;
  updatePartyChart(data);
  updateVoteShareChart(data);
}

function updatePartyChart(data) {
  const config = getPartyConfig();
  if (!config) return;

  const partySeats = {};
  data.constituencies.forEach(c => {
    if (c.candidates.length > 0) {
      const party = c.candidates[0].party;
      partySeats[party] = (partySeats[party] || 0) + 1;
    }
  });

  const sorted = Object.entries(partySeats).sort((a, b) => b[1] - a[1]);
  const labels = sorted.map(([p]) => p);
  const values = sorted.map(([, v]) => v);
  const colors = labels.map(p => getPartyColor(p));

  const ctx = document.getElementById('partyChart');
  if (!ctx) return;

  if (partyChart) partyChart.destroy();

  partyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors.map(c => c + 'cc'),
        hoverBackgroundColor: colors,
        borderRadius: 6,
        barThickness: 24,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { right: 40 } },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
        // Datalabel plugin not loaded, so use custom afterDraw
      },
      scales: {
        x: {
          display: false,
          grid: { display: false },
        },
        y: {
          grid: { display: false },
          ticks: {
            font: { size: 13, weight: '500' },
            color: '#c0c8d4',
          }
        }
      }
    },
    plugins: [{
      // Draw seat count at end of each bar
      afterDraw(chart) {
        const ctx2 = chart.ctx;
        chart.data.datasets[0].data.forEach((val, i) => {
          const meta = chart.getDatasetMeta(0).data[i];
          ctx2.fillStyle = '#e2e8f0';
          ctx2.font = "600 13px 'DM Sans', sans-serif";
          ctx2.textAlign = 'left';
          ctx2.textBaseline = 'middle';
          ctx2.fillText(val + ' seats', meta.x + 8, meta.y);
        });
      }
    }]
  });
}

function updateVoteShareChart(data) {
  const config = getPartyConfig();
  if (!config) return;

  const allianceVotes = {};
  data.constituencies.forEach(c => {
    c.candidates.forEach(cand => {
      const alliance = config.parties[cand.party]?.alliance || 'Others';
      allianceVotes[alliance] = (allianceVotes[alliance] || 0) + cand.votes;
    });
  });

  const order = config.allianceOrder;
  const labels = order.filter(a => allianceVotes[a]);
  const values = labels.map(a => allianceVotes[a]);
  const totalVotes = values.reduce((s, v) => s + v, 0);
  const colors = labels.map(a => getAllianceColor(a));

  const ctx = document.getElementById('voteShareChart');
  if (!ctx) return;

  if (voteShareChart) voteShareChart.destroy();

  voteShareChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors.map(c => c + 'cc'),
        hoverBackgroundColor: colors,
        borderColor: '#111827',
        borderWidth: 3,
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '58%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 16,
            font: { size: 12, weight: '500' },
            usePointStyle: true,
            pointStyleWidth: 10,
          }
        },
        tooltip: {
          callbacks: {
            label: (item) => {
              const pct = ((item.raw / totalVotes) * 100).toFixed(1);
              const votes = item.raw.toLocaleString('en-IN');
              return ` ${item.label}: ${pct}% (${votes} votes)`;
            }
          }
        }
      }
    },
    plugins: [{
      // Draw percentage labels on each slice
      afterDraw(chart) {
        const ctx2 = chart.ctx;
        const dataset = chart.data.datasets[0];
        const meta = chart.getDatasetMeta(0);

        meta.data.forEach((arc, i) => {
          const pct = ((dataset.data[i] / totalVotes) * 100).toFixed(1);
          if (pct < 3) return; // show labels on smaller slices too

          const { x, y } = arc.tooltipPosition();
          ctx2.fillStyle = '#fff';
          ctx2.font = "600 12px 'DM Sans', sans-serif";
          ctx2.textAlign = 'center';
          ctx2.textBaseline = 'middle';
          ctx2.fillText(pct + '%', x, y);
        });
      }
    }]
  });
}
