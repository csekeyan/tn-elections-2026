// Data service: fetches results, manages polling, notifies listeners

const MOCK_URL = './mock_results.json';
const POLL_INTERVAL = 30000; // 30 seconds

let currentData = null;
let listeners = [];
let pollTimer = null;
let countdownTimer = null;
let secondsLeft = 30;

// Load party config
let partyConfig = null;

export async function loadPartyConfig() {
  const res = await fetch('./parties.json');
  partyConfig = await res.json();
  return partyConfig;
}

export function getPartyConfig() {
  return partyConfig;
}

export function getPartyColor(party) {
  if (!partyConfig) return '#808080';
  const p = partyConfig.parties[party];
  return p ? p.color : '#808080';
}

export function getAlliance(party) {
  if (!partyConfig) return 'Others';
  const p = partyConfig.parties[party];
  return p ? p.alliance : 'Others';
}

export function getAllianceColor(allianceName) {
  if (!partyConfig) return '#808080';
  const a = partyConfig.alliances[allianceName];
  return a ? a.color : '#808080';
}

export function onUpdate(fn) {
  listeners.push(fn);
}

export function getData() {
  return currentData;
}

async function fetchResults() {
  try {
    // In production, this would point to Cloudflare Worker
    const res = await fetch(MOCK_URL + '?t=' + Date.now());
    const data = await res.json();
    currentData = data;
    listeners.forEach(fn => fn(data));
    return data;
  } catch (err) {
    console.error('Failed to fetch results:', err);
    return null;
  }
}

export async function startPolling() {
  // Initial fetch
  await fetchResults();

  // Poll
  pollTimer = setInterval(fetchResults, POLL_INTERVAL);

  // Countdown display
  secondsLeft = 30;
  const countdownEl = document.getElementById('countdown');
  const refreshBar = document.getElementById('refreshBar');

  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    secondsLeft--;
    if (secondsLeft <= 0) secondsLeft = 30;
    if (countdownEl) countdownEl.textContent = `Refreshing in ${secondsLeft}s`;
    if (refreshBar) refreshBar.style.transform = `scaleX(${secondsLeft / 30})`;
  }, 1000);
}

export function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  if (countdownTimer) clearInterval(countdownTimer);
}
