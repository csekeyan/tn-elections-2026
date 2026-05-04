// Data service: fetches results, adaptive polling based on server hint

const API_URL = '/api/results';
const LOCAL_MOCK = './mock_results.json';
const DEFAULT_INTERVAL = 120000;

const IS_DEV = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const DATA_URL = IS_DEV ? LOCAL_MOCK : API_URL;

let currentData = null;
let listeners = [];
let pollTimer = null;
let countdownTimer = null;
let pollInterval = DEFAULT_INTERVAL;
let secondsLeft = 120;

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

    if (data.error && !data.constituencies) {
      console.warn('API error:', data.error);
      return null;
    }

    // Adaptive polling: server tells us how often to poll
    const hint = parseInt(res.headers.get('X-Poll-Interval'));
    if (hint && hint !== pollInterval / 1000) {
      const newInterval = hint * 1000;
      if (newInterval !== pollInterval) {
        pollInterval = newInterval;
        secondsLeft = hint;
        clearInterval(pollTimer);
        pollTimer = setInterval(fetchResults, pollInterval);
      }
    }

    currentData = data;
    listeners.forEach(fn => fn(data));
    return data;
  } catch (err) {
    console.error('Fetch failed:', err);
    if (!IS_DEV && !currentData) {
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
  pollTimer = setInterval(fetchResults, pollInterval);

  secondsLeft = pollInterval / 1000;
  const countdownEl = document.getElementById('countdown');
  const refreshBar = document.getElementById('refreshBar');

  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    secondsLeft--;
    if (secondsLeft <= 0) secondsLeft = pollInterval / 1000;
    if (countdownEl) countdownEl.textContent = `Refreshing in ${secondsLeft}s`;
    if (refreshBar) refreshBar.style.transform = `scaleX(${secondsLeft / (pollInterval / 1000)})`;
  }, 1000);
}

export function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  if (countdownTimer) clearInterval(countdownTimer);
}
