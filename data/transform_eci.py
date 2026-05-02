"""
ECI Data Transformer
Converts raw ECI constituency-wise data to our dashboard JSON format.

This is the EXACT logic that the Cloudflare Worker will run in JavaScript.
We build it in Python first to test, then port to JS.
"""
import json

# Party abbreviation mapping (ECI uses full names, we use abbreviations)
PARTY_MAP = {
    "Dravida Munnetra Kazhagam": "DMK",
    "Indian National Congress": "INC",
    "Viduthalai Chiruthaigal Katchi": "VCK",
    "Communist Party of India": "CPI",
    "Communist Party of India (Marxist)": "CPI(M)",
    "Indian Union Muslim League": "IUML",
    "All India Anna Dravida Munnetra Kazhagam": "AIADMK",
    "Bharatiya Janata Party": "BJP",
    "Pattali Makkal Katchi": "PMK",
    "Desiya Murpokku Dravida Kazhagam": "DMDK",
    "Naam Tamilar Katchi": "NTK",
    "Tamilaga Vettri Kazhagam": "TVK",
    "Amma Makkal Munnetra Kazhagam": "AMMK",
}

ALLIANCE_MAP = {
    "DMK": "DMK+", "INC": "DMK+", "VCK": "DMK+", "CPI": "DMK+",
    "CPI(M)": "DMK+", "IUML": "DMK+", "MDMK": "DMK+",
    "AIADMK": "AIADMK+", "BJP": "AIADMK+", "PMK": "AIADMK+", "DMDK": "AIADMK+",
    "TVK": "TVK+", "NTK": "NTK",
}

# District mapping for each AC number (from our GeoJSON)
with open('public/tn-constituencies.geojson') as f:
    geo = json.load(f)
DISTRICT_MAP = {}
NAME_MAP = {}
for feat in geo['features']:
    p = feat['properties']
    DISTRICT_MAP[p['ac_no']] = p['dist_name']
    NAME_MAP[p['ac_no']] = p['ac_name']


def get_party_abbr(full_name, candidate_data=None):
    """Convert ECI full party name to our abbreviation."""
    if full_name in PARTY_MAP:
        return PARTY_MAP[full_name]
    # Check if candidate_data has party_abbr
    if candidate_data and 'party_abbr' in candidate_data:
        return candidate_data['party_abbr']
    # Fallback: use first letters or "IND"
    if "Independent" in full_name:
        return "IND"
    return full_name[:4].upper()


def get_alliance(party_abbr):
    return ALLIANCE_MAP.get(party_abbr, "Others")


def transform_eci_to_dashboard(eci_data):
    """
    INPUT:  ECI format (from results.eci.gov.in scrape)
    OUTPUT: Our dashboard format (mock_results.json structure)
    """
    dashboard = {
        "lastUpdated": None,  # set by caller
        "totalSeats": 234,
        "countingStatus": "in_progress",
        "summary": {"declared": 0, "counting": 0},
        "allianceSummary": [],
        "constituencies": []
    }

    alliance_counts = {a: {"won": 0, "leading": 0} for a in ["DMK+", "AIADMK+", "TVK+", "NTK", "Others"]}

    for const_data in eci_data.get("constituencywise_results", []):
        vd = const_data.get("voting_data", {})
        ac_no = int(vd.get("constituency_no", 0))
        ac_name = NAME_MAP.get(ac_no, vd.get("constituency", ""))
        district = DISTRICT_MAP.get(ac_no, "")

        candidates = []
        for cand in vd.get("voting_tally", []):
            evm = int(cand.get("evm_votes", "0").replace(",", ""))
            postal = int(cand.get("postal_votes", "0").replace(",", ""))
            total = evm + postal
            party = get_party_abbr(cand.get("party", ""), cand)

            candidates.append({
                "name": cand.get("candidate", ""),
                "party": party,
                "votes": total,
                "status": "trailing"  # updated below
            })

        # Sort by votes descending
        candidates.sort(key=lambda c: c["votes"], reverse=True)

        # Calculate totals and margin
        total_votes = sum(c["votes"] for c in candidates)
        for c in candidates:
            c["voteShare"] = round(c["votes"] / total_votes * 100, 1) if total_votes > 0 else 0

        margin = (candidates[0]["votes"] - candidates[1]["votes"]) if len(candidates) > 1 else 0

        # Determine status (for now, all "counting" - on counting day, ECI marks "declared")
        # We consider it "declared" if total votes > 0 and all rounds done
        # For live data, we just mark as counting
        status = "counting"
        if total_votes > 0:
            candidates[0]["status"] = "leading"

        # Track alliance
        if candidates:
            leader_alliance = get_alliance(candidates[0]["party"])
            alliance_counts[leader_alliance]["leading"] += 1

        dashboard["constituencies"].append({
            "id": ac_no,
            "name": ac_name,
            "district": district,
            "status": status,
            "totalVotes": total_votes,
            "roundsCompleted": 0,
            "totalRounds": 22,
            "margin": margin,
            "candidates": candidates
        })

    # Build alliance summary
    alliance_order = ["DMK+", "AIADMK+", "TVK+", "NTK", "Others"]
    for a_name in alliance_order:
        ac = alliance_counts.get(a_name, {"won": 0, "leading": 0})
        dashboard["allianceSummary"].append({
            "name": a_name,
            "won": ac["won"],
            "leading": ac["leading"],
            "total": ac["won"] + ac["leading"]
        })

    dashboard["summary"]["counting"] = len(dashboard["constituencies"])

    return dashboard


if __name__ == "__main__":
    from datetime import datetime, timezone

    # TEST: Transform mock ECI data
    with open("data/mock_eci/all_constituencies.json") as f:
        eci_data = json.load(f)

    dashboard = transform_eci_to_dashboard(eci_data)
    dashboard["lastUpdated"] = datetime.now(timezone.utc).isoformat()

    # Save and compare
    with open("data/transformed_results.json", "w") as f:
        json.dump(dashboard, f, indent=2)

    print(f"Constituencies: {len(dashboard['constituencies'])}")
    print(f"Total votes tracked: {sum(c['totalVotes'] for c in dashboard['constituencies']):,}")
    print(f"\nAlliance Summary:")
    for a in dashboard["allianceSummary"]:
        print(f"  {a['name']}: Won {a['won']}, Lead {a['leading']}, Total {a['total']}")

    print(f"\nSample constituency (Kolathur - Stalin's seat):")
    kolathur = next(c for c in dashboard["constituencies"] if c["id"] == 13)
    print(f"  {kolathur['name']} ({kolathur['district']})")
    for cand in kolathur["candidates"][:3]:
        print(f"    {cand['name']} ({cand['party']}): {cand['votes']:,} ({cand['voteShare']}%)")
