// Data service: fetches results from Worker API, polls every 30s

const WORKER_API = 'https://tn-elections-2026.56karthicute.workers.dev/api/results';
const LOCAL_MOCK = './mock_results.json';
const POLL_INTERVAL = 30000;

// Use Worker API in production, local mock in dev
const IS_DEV = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const DATA_URL = IS_DEV ? LOCAL_MOCK : WORKER_API;

let currentData = null;
let listeners = [];
let pollTimer = null;
let countdownTimer = null;
let secondsLeft = 30;

let partyConfig = null;

export async function loadPartyConfig() {
  const res = await fetch('./parties.json');
  partyConfig = await res.json();
  return partyConfig;
}

export function getPartyConfig() { return partyConfig; }

export function getPartyColor(party) {
  if (!partyConfig) return '#808080';
  return partyConfig.parties[party]?.color || '#808080';
}

export function getAlliance(party) {
  if (!partyConfig) return 'Others';
  return partyConfig.parties[party]?.alliance || 'Others';
}

export function getAllianceColor(allianceName) {
  if (!partyConfig) return '#808080';
  return partyConfig.alliances[allianceName]?.color || '#808080';
}

export function onUpdate(fn) { listeners.push(fn); }
export function getData() { return currentData; }

async function fetchResults() {
  try {
    const res = await fetch(DATA_URL + (IS_DEV ? '?t=' + Date.now() : ''));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Guard: if worker returns an error object, don't update
    if (data.error && !data.constituencies) {
      console.warn('API returned error:', data.error);
      return null;
    }

    currentData = data;
    listeners.forEach(fn => fn(data));
    return data;
  } catch (err) {
    console.error('Fetch failed:', err);
    // If worker is down, fall back to local mock
    if (!IS_DEV && !currentData) {
      console.warn('Worker unavailable, falling back to local mock');
      try {
        const fallback = await fetch(LOCAL_MOCK + '?t=' + Date.now());
        const data = await fallback.json();
        currentData = data;
        listeners.forEach(fn => fn(data));
        return data;
      } catch { return null; }
    }
    return null;
  }
}

export async function startPolling() {
  await fetchResults();
  pollTimer = setInterval(fetchResults, POLL_INTERVAL);

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
