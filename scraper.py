#!/usr/bin/env python3
"""Local ECI scraper → Cloudflare KV. Run on your Mac during counting."""

import re, json, time, subprocess, sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

ECI_BASE = 'https://results.eci.gov.in/ResultAcGenMay2026'
TOTAL_ACS = 234
KV_NAMESPACE = 'f55206ca16c04fe684ec5a81347edc23'
KV_KEY = 'api:results'

PARTY_MAP = {
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
}

ALLIANCE_MAP = {
    'DMK': 'DMK+', 'INC': 'DMK+', 'VCK': 'DMK+', 'CPI': 'DMK+',
    'CPI(M)': 'DMK+', 'IUML': 'DMK+', 'MDMK': 'DMK+', 'KMDK': 'DMK+', 'TMC(M)': 'DMK+',
    'AIADMK': 'AIADMK+', 'BJP': 'AIADMK+', 'PMK': 'AIADMK+', 'DMDK': 'AIADMK+',
    'TVK': 'TVK+', 'NTK': 'NTK',
}

def get_party(full_name):
    if not full_name:
        return 'IND'
    name = full_name.strip()
    if name in PARTY_MAP:
        return PARTY_MAP[name]
    if 'Independent' in name:
        return 'IND'
    return name[:6].upper()

def get_alliance(party):
    return ALLIANCE_MAP.get(party, 'Others')

def fetch_constituency(ac_no):
    url = f'{ECI_BASE}/ConstituencywiseS22{ac_no}.htm'
    try:
        result = subprocess.run(
            ['curl', '-s', '-m', '10', url],
            capture_output=True, text=True, timeout=15
        )
        if result.returncode != 0 or not result.stdout:
            return None
        html = result.stdout
        if 'Access Denied' in html or len(html) < 500:
            return None
    except Exception as e:
        return None

    # Parse name
    m = re.search(r'Assembly Constituency\s*<span>\s*\d+\s*-\s*([^<]+)', html)
    ac_name = m.group(1).strip().replace(' (Tamil Nadu)', '') if m else f'AC-{ac_no}'

    # Parse round
    m = re.search(r'Status as on Round[^<]*<span>(\d+)</span>\s*/\s*(\d+)', html)
    rounds_done = int(m.group(1)) if m else 0
    total_rounds = int(m.group(2)) if m else 25

    is_declared = 'Result Declared' in html

    # Parse candidate rows
    row_re = re.compile(
        r'<tr>\s*<td[^>]*>\s*(\d+)\s*</td>\s*'
        r'<td[^>]*>([^<]+)</td>\s*'
        r'<td[^>]*>([^<]+)</td>\s*'
        r'<td[^>]*>([^<]+)</td>\s*'
        r'<td[^>]*>([^<]+)</td>\s*'
        r'<td[^>]*>([^<]+)</td>\s*'
        r'<td[^>]*>([^<]+)</td>\s*</tr>',
        re.IGNORECASE
    )

    candidates = []
    for m in row_re.finditer(html):
        name = m.group(2).strip()
        party = get_party(m.group(3).strip())
        evm = int(m.group(4).replace(',', '').strip() or '0')
        postal = int(m.group(5).replace(',', '').strip() or '0')
        total = int(m.group(6).replace(',', '').strip() or '0')
        candidates.append({
            'name': name,
            'party': party,
            'votes': total or (evm + postal),
            'status': 'trailing',
            'voteShare': 0,
        })

    candidates.sort(key=lambda c: c['votes'], reverse=True)
    total_votes = sum(c['votes'] for c in candidates)
    for i, c in enumerate(candidates):
        c['voteShare'] = round(c['votes'] / total_votes * 100, 1) if total_votes > 0 else 0
        if i == 0 and total_votes > 0:
            c['status'] = 'won' if is_declared else 'leading'

    margin = (candidates[0]['votes'] - candidates[1]['votes']) if len(candidates) > 1 else 0
    ac_status = 'declared' if is_declared else ('counting' if total_votes > 0 else 'not_started')

    return {
        'id': ac_no,
        'name': ac_name,
        'status': ac_status,
        'totalVotes': total_votes,
        'margin': margin,
        'roundsCompleted': rounds_done,
        'totalRounds': total_rounds,
        'candidates': candidates,
    }

def build_dashboard(constituencies):
    alliance_counts = {}
    declared = counting = 0

    for c in constituencies:
        if c['status'] == 'declared':
            declared += 1
        elif c['status'] == 'counting':
            counting += 1

        if c['candidates'] and c['totalVotes'] > 0:
            leader = c['candidates'][0]
            alliance = get_alliance(leader['party'])
            if alliance not in alliance_counts:
                alliance_counts[alliance] = {'won': 0, 'leading': 0}
            if c['status'] == 'declared':
                alliance_counts[alliance]['won'] += 1
            else:
                alliance_counts[alliance]['leading'] += 1

    order = ['DMK+', 'AIADMK+', 'TVK+', 'NTK', 'Others']
    alliance_summary = []
    for name in order:
        c = alliance_counts.get(name, {'won': 0, 'leading': 0})
        alliance_summary.append({'name': name, 'won': c['won'], 'leading': c['leading'], 'total': c['won'] + c['leading']})

    constituencies.sort(key=lambda c: c['id'])
    cs = 'completed' if declared == 234 else ('in_progress' if counting > 0 or declared > 0 else 'not_started')
    return {
        'totalSeats': 234,
        'countingStatus': cs,
        'summary': {'declared': declared, 'counting': counting, 'notStarted': 234 - declared - counting},
        'allianceSummary': alliance_summary,
        'constituencies': constituencies,
    }

def push_to_kv(data):
    json_str = json.dumps(data)
    api_url = 'https://tn-elections-2026.pages.dev/api/results?token=tn2026live'
    cmd = ['curl', '-s', '-X', 'POST', '-H', 'Content-Type: application/json',
           '-d', '@-', api_url]
    result = subprocess.run(cmd, input=json_str, capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        print(f'  Push error: {result.stderr[:200]}')
        return False
    try:
        resp = json.loads(result.stdout)
        if resp.get('ok'):
            return True
        print(f'  Push rejected: {resp}')
        return False
    except:
        print(f'  Push response: {result.stdout[:200]}')
        return False

def scrape_once():
    start = time.time()
    constituencies = []
    failed = 0

    with ThreadPoolExecutor(max_workers=10) as pool:
        futures = {pool.submit(fetch_constituency, i): i for i in range(1, TOTAL_ACS + 1)}
        for f in as_completed(futures):
            result = f.result()
            if result:
                constituencies.append(result)
            else:
                failed += 1

    duration = time.time() - start
    data = build_dashboard(constituencies)
    data['lastUpdated'] = datetime.now(timezone.utc).isoformat()
    data['_source'] = 'eci-local'
    data['_fetchDuration'] = f'{int(duration * 1000)}ms'
    data['_constituenciesFetched'] = len(constituencies)
    data['_failed'] = failed

    # Summary
    total_votes = sum(c['totalVotes'] for c in constituencies)
    counting = data['summary']['counting']
    declared = data['summary']['declared']
    alliance_str = ' | '.join(f"{a['name']}:{a['total']}" for a in data['allianceSummary'] if a['total'] > 0)

    print(f'  [{datetime.now().strftime("%H:%M:%S")}] {len(constituencies)}/234 parsed, {failed} failed, {duration:.1f}s')
    print(f'  Counting: {counting} | Declared: {declared} | Total votes: {total_votes:,}')
    if alliance_str:
        print(f'  {alliance_str}')

    # Push to KV
    if push_to_kv(data):
        print(f'  Pushed to KV')
    return data

def main():
    interval = 240
    print(f'ECI Scraper starting. Interval: {interval}s (4 min). Ctrl+C to stop.')
    print(f'Fetching {TOTAL_ACS} constituencies from {ECI_BASE}')
    print()

    while True:
        try:
            print(f'--- Scraping ---')
            data = scrape_once()

            # Adaptive interval
            if data['countingStatus'] == 'completed':
                print('All 234 declared! Final scrape.')
                break
            elif data['countingStatus'] == 'not_started':
                interval = 240
            else:
                interval = 240

            print(f'  Next scrape in {interval}s...\n')
            time.sleep(interval)
        except KeyboardInterrupt:
            print('\nStopped.')
            break
        except Exception as e:
            print(f'Error: {e}')
            time.sleep(10)

if __name__ == '__main__':
    main()
