#!/usr/bin/env python3
"""
fetch_2026_season.py — MLS 2026 Season Data Pipeline

Pulls live data from the American Soccer Analysis (ASA) API and outputs
client/public/data/mls2026.json matching the dashboard's existing schema.

Data sources:
  - ASA get_games() for match results (via itscalledsoccer)
  - ASA /players/xgoals (direct API, season_name param) for player stats
  - ASA /players/xpass (direct API) for passing stats
  - ASA /goalkeepers/xgoals (direct API) for GK stats
  - ASA get_teams() for team ID mapping
  - ASA get_stadia() for venue names
  - ASA get_players() for player metadata (name, nationality, DOB, position)
  - Fox Sports (via temp_fox_stats.json) for counting stats:
    yellowCards, redCards, offsides, fouls, fouled, tackles, interceptions
  - MLSPA 2025 Fall Salary Guide + DirecTV 2026 Payrolls for salary data
    (via fetch_spotrac_salaries.py → salary_data_2026.json)

Output: JSON with { matches: Match[], players: Player[], teamBudgets: {}, totalWeeks: N }
"""

import json
import os
import sys
import unicodedata
from datetime import datetime, date
from collections import defaultdict

import requests
from itscalledsoccer.client import AmericanSoccerAnalysis

# ──────────────────────────────────────────────
# CONSTANTS
# ──────────────────────────────────────────────

ASA_BASE = "https://app.americansocceranalysis.com/api/v1/mls"

# ASA abbreviation → Dashboard 3-letter ID (only the 4 exceptions)
ASA_TO_DASH = {
    "DCU": "DC",
    "FCD": "DAL",
    "NER": "NE",
    "SJE": "SJ",
}

# Position mapping: ASA general_position → Dashboard position code
POS_MAP = {
    "GK": "GK",
    "CB": "DF",
    "FB": "DF",
    "DM": "MF",
    "CM": "MF",
    "AM": "MF",
    "W": "MF",
    "ST": "FW",
    # Fallbacks
    "DF": "DF",
    "MF": "MF",
    "FW": "FW",
}

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FOX_STATS_PATH = os.path.join(SCRIPT_DIR, "temp_fox_stats.json")
SALARY_DATA_PATH = os.path.join(SCRIPT_DIR, "salary_data_2026.json")

OUTPUT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "client", "public", "data", "mls2026.json",
)

# Fields to pull from Fox Sports data
FOX_FIELDS = [
    "yellowCards", "redCards", "offsides",
    "fouls", "fouled", "tackles", "interceptions",
]


# ──────────────────────────────────────────────
# FOX SPORTS DATA LOADER + FUZZY MATCHING
# ──────────────────────────────────────────────

def normalize_name(name):
    """Strip accents, lowercase, and trim whitespace for fuzzy matching."""
    nfkd = unicodedata.normalize("NFKD", name)
    stripped = "".join(c for c in nfkd if not unicodedata.combining(c))
    return stripped.lower().strip()


def load_fox_stats():
    """
    Load Fox Sports stats from temp_fox_stats.json and build lookup dicts.

    Returns:
        - exact_lookup: dict[normalized_name] → stats dict
        - last_name_lookup: dict[normalized_last_name] → list of (full_name, team, stats)
    """
    if not os.path.exists(FOX_STATS_PATH):
        print("⚠️  Fox Sports data not found — run scrape_fox_stats.py first.")
        print(f"   Expected: {FOX_STATS_PATH}")
        return {}, {}

    with open(FOX_STATS_PATH) as f:
        raw = json.load(f)

    exact_lookup = {}
    last_name_lookup = defaultdict(list)

    for name, stats in raw.items():
        norm = normalize_name(name)
        exact_lookup[norm] = stats

        # Build last-name index for fallback matching
        parts = norm.split()
        if parts:
            last = parts[-1]
            last_name_lookup[last].append((norm, stats.get("fox_team", ""), stats))

    print(f"📂 Loaded Fox Sports data: {len(raw)} players")
    return exact_lookup, last_name_lookup


def match_fox_stats(player_name, player_team, exact_lookup, last_name_lookup):
    """
    Try to match an ASA player name to Fox Sports data.

    Strategy:
      1. Exact match on normalized full name
      2. Last-name match filtered by team abbreviation (for common last names)
      3. Last-name match if there's only one candidate

    Returns:
        dict with Fox fields, or None if no match found.
    """
    norm = normalize_name(player_name)

    # 1. Exact normalized match
    if norm in exact_lookup:
        return exact_lookup[norm]

    # 2. Last-name fallback
    parts = norm.split()
    if not parts:
        return None
    last = parts[-1]

    candidates = last_name_lookup.get(last, [])
    if not candidates:
        return None

    # If only one candidate with this last name, use it
    if len(candidates) == 1:
        return candidates[0][2]

    # Multiple candidates: try to match by team
    # Dashboard team codes need to be compared with Fox team codes
    for cand_norm, cand_team, cand_stats in candidates:
        if cand_team and cand_team == player_team:
            return cand_stats

    # No team match found among multiple candidates — skip to avoid wrong match
    return None


# ──────────────────────────────────────────────
# SALARY DATA LOADER
# ──────────────────────────────────────────────

def load_salary_data():
    """
    Load pre-compiled salary data from salary_data_2026.json.

    If the file doesn't exist, runs fetch_spotrac_salaries.py to generate it.

    Returns:
        - salary_lookup: dict[name|team] → salary (int)
        - team_budgets: dict[team_id] → budget breakdown
    """
    if not os.path.exists(SALARY_DATA_PATH):
        print("⚠️  Salary data not found — running fetch_spotrac_salaries.py...")
        import subprocess
        result = subprocess.run(
            [sys.executable, os.path.join(SCRIPT_DIR, "fetch_spotrac_salaries.py")],
            capture_output=True, text=True
        )
        if result.returncode != 0:
            print(f"   ❌ Salary script failed: {result.stderr}")
            return {}, {}
        print(result.stdout)

    if not os.path.exists(SALARY_DATA_PATH):
        print("⚠️  Salary data still not found after running script.")
        return {}, {}

    with open(SALARY_DATA_PATH) as f:
        data = json.load(f)

    salary_lookup = data.get("playerSalaries", {})
    team_budgets = data.get("teamBudgets", {})

    non_zero = sum(1 for v in salary_lookup.values() if v > 0)
    print(f"📂 Loaded salary data: {len(salary_lookup)} players, {non_zero} with salary > 0")
    print(f"   Team budgets: {len(team_budgets)} teams")

    return salary_lookup, team_budgets


def main():
    print("🔄 Initializing ASA client...")
    client = AmericanSoccerAnalysis()

    # ──────────────────────────────────────────
    # 0. LOAD FOX SPORTS DATA
    # ──────────────────────────────────────────
    fox_exact, fox_last = load_fox_stats()
    has_fox_data = bool(fox_exact)

    # ──────────────────────────────────────────
    # 0b. LOAD SALARY DATA
    # ──────────────────────────────────────────
    salary_lookup, precomputed_budgets = load_salary_data()
    has_salary_data = bool(salary_lookup)

    # ──────────────────────────────────────────
    # 1. TEAM MAPPING
    # ──────────────────────────────────────────
    print("📋 Fetching team data...")
    teams_df = client.get_teams(leagues="mls")
    asa_id_to_abbr = dict(zip(teams_df["team_id"], teams_df["team_abbreviation"]))

    def to_dash_id(asa_team_id):
        abbr = asa_id_to_abbr.get(asa_team_id, asa_team_id)
        return ASA_TO_DASH.get(abbr, abbr)

    # ──────────────────────────────────────────
    # 2. STADIA MAPPING
    # ──────────────────────────────────────────
    print("🏟️  Fetching stadia data...")
    stadia_df = client.get_stadia()
    stadium_names = dict(zip(stadia_df["stadium_id"], stadia_df["stadium_name"]))

    # ──────────────────────────────────────────
    # 3. FETCH GAMES
    # ──────────────────────────────────────────
    print("⚽ Fetching 2026 game data...")
    games_df = client.get_games(leagues="mls", seasons="2026")
    games_df = games_df[games_df["status"] == "FullTime"].copy()
    games_df = games_df.sort_values("date_time_utc")

    print(f"   Found {len(games_df)} completed games")

    # Build matches array
    matches = []
    for idx, (_, row) in enumerate(games_df.iterrows()):
        dt_str = str(row["date_time_utc"]).replace(" UTC", "").strip()
        try:
            dt = datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S")
            date_str = dt.strftime("%Y-%m-%d")
        except Exception:
            date_str = dt_str[:10]

        attendance = int(row["attendance"]) if row["attendance"] and int(row["attendance"]) > 0 else 0
        venue = stadium_names.get(row["stadium_id"], "Unknown Stadium")

        matches.append({
            "id": idx + 1,
            "week": int(row["matchday"]),
            "date": date_str,
            "homeTeam": to_dash_id(row["home_team_id"]),
            "awayTeam": to_dash_id(row["away_team_id"]),
            "homeGoals": int(row["home_score"]),
            "awayGoals": int(row["away_score"]),
            "attendance": attendance,
            "venue": venue,
        })

    max_week = max(m["week"] for m in matches) if matches else 0
    print(f"   Matchweeks: 1–{max_week}")

    # ──────────────────────────────────────────
    # 4. FETCH PLAYER DATA
    # ──────────────────────────────────────────
    print("👤 Fetching player metadata...")
    all_players_df = client.get_players(leagues="mls")
    player_meta = {}
    for _, p in all_players_df.iterrows():
        player_meta[p["player_id"]] = {
            "name": p["player_name"],
            "nationality": p["nationality"] or "Unknown",
            "birth_date": p["birth_date"],
            "broad_pos": p["primary_broad_position"],
        }

    print("📊 Fetching 2026 player xGoals...")
    xg_resp = requests.get(f"{ASA_BASE}/players/xgoals", params={"season_name": "2026"})
    xg_resp.raise_for_status()
    player_xgoals = xg_resp.json()
    print(f"   Found {len(player_xgoals)} player xGoal records")

    print("📊 Fetching 2026 player xPass...")
    xp_resp = requests.get(f"{ASA_BASE}/players/xpass", params={"season_name": "2026"})
    xp_resp.raise_for_status()
    player_xpass = {p["player_id"]: p for p in xp_resp.json()}

    print("📊 Fetching 2026 goalkeeper xGoals...")
    gk_resp = requests.get(f"{ASA_BASE}/goalkeepers/xgoals", params={"season_name": "2026"})
    gk_resp.raise_for_status()
    gk_data = {p["player_id"]: p for p in gk_resp.json()}

    # ──────────────────────────────────────────
    # 5. BUILD PLAYERS ARRAY
    # ──────────────────────────────────────────
    print("🔨 Building player records...")
    players = []
    fox_matched = 0
    fox_unmatched = 0
    salary_matched = 0
    salary_unmatched = 0

    for idx, pxg in enumerate(player_xgoals):
        pid = pxg["player_id"]
        meta = player_meta.get(pid, {})
        xpass = player_xpass.get(pid, {})
        gk = gk_data.get(pid, {})

        name = meta.get("name", f"Player_{pid[:6]}")
        nationality = meta.get("nationality", "Unknown")

        # Calculate age from birth_date
        birth_str = meta.get("birth_date")
        age = 25  # default
        if birth_str:
            try:
                bd = datetime.strptime(birth_str, "%Y-%m-%d").date()
                today = date.today()
                age = today.year - bd.year - ((today.month, today.day) < (bd.month, bd.day))
            except Exception:
                pass

        # Position: use ASA general_position, map to dashboard format
        asa_pos = pxg.get("general_position", "") or meta.get("broad_pos", "MF")
        position = POS_MAP.get(asa_pos, "MF")

        # Team: ASA may return a list of team_ids; take the first (current)
        team_id_raw = pxg.get("team_id", "")
        if isinstance(team_id_raw, list):
            team_id_raw = team_id_raw[0] if team_id_raw else ""
        team = to_dash_id(team_id_raw)

        minutes = int(pxg.get("minutes_played", 0))
        goals = int(pxg.get("goals", 0))
        assists = int(pxg.get("primary_assists", 0))
        shots = int(pxg.get("shots", 0))
        shots_on_target = int(pxg.get("shots_on_target", 0))
        shot_accuracy = round(shots_on_target / shots * 100, 1) if shots > 0 else 0.0

        # Estimate games/starts from minutes (approx 90 min per game)
        games_played = max(1, round(minutes / 90)) if minutes > 0 else 0
        starts = games_played  # approximate

        # From xpass data
        count_games = int(xpass.get("count_games", games_played))
        if count_games > 0:
            games_played = count_games
            starts = count_games

        # ── Fox Sports merge ──
        yellow_cards = 0
        red_cards = 0
        fouls = 0
        fouled = 0
        tackles = 0
        interceptions = 0
        offsides = 0

        if has_fox_data:
            fox_stats = match_fox_stats(name, team, fox_exact, fox_last)
            if fox_stats:
                yellow_cards = fox_stats.get("yellowCards", 0)
                red_cards = fox_stats.get("redCards", 0)
                fouls = fox_stats.get("fouls", 0)
                fouled = fox_stats.get("fouled", 0)
                tackles = fox_stats.get("tackles", 0)
                interceptions = fox_stats.get("interceptions", 0)
                offsides = fox_stats.get("offsides", 0)
                fox_matched += 1
            else:
                fox_unmatched += 1

        # ── Salary merge ──
        salary = 0
        if has_salary_data:
            salary_key = f"{name}|{team}"
            salary = salary_lookup.get(salary_key, 0)
            if salary > 0:
                salary_matched += 1
            else:
                salary_unmatched += 1

        players.append({
            "id": idx + 1,
            "name": name,
            "team": team,
            "position": position,
            "nationality": nationality,
            "age": age,
            "games": games_played,
            "starts": starts,
            "minutes": minutes,
            "goals": goals,
            "assists": assists,
            "yellowCards": yellow_cards,
            "redCards": red_cards,
            "shots": shots,
            "shotsOnTarget": shots_on_target,
            "shotAccuracy": shot_accuracy,
            "fouls": fouls,
            "fouled": fouled,
            "tackles": tackles,
            "interceptions": interceptions,
            "crosses": 0,       # Not available from Fox Sports
            "offsides": offsides,
            "salary": salary,
        })

    print(f"   Built {len(players)} player records")
    if has_fox_data:
        print(f"   Fox Sports merge: {fox_matched} matched, {fox_unmatched} unmatched")
        pct = round(fox_matched / (fox_matched + fox_unmatched) * 100, 1) if (fox_matched + fox_unmatched) > 0 else 0
        print(f"   Match rate: {pct}%")
    if has_salary_data:
        print(f"   Salary merge: {salary_matched} matched, {salary_unmatched} unmatched")
        pct = round(salary_matched / (salary_matched + salary_unmatched) * 100, 1) if (salary_matched + salary_unmatched) > 0 else 0
        print(f"   Match rate: {pct}%")

    # ──────────────────────────────────────────
    # 6. TEAM BUDGETS
    # ──────────────────────────────────────────
    if precomputed_budgets:
        team_budgets = precomputed_budgets
        print(f"💰 Using precomputed team budgets for {len(team_budgets)} teams")
    else:
        team_budgets = {}  # Empty — will fall back to 2025 data in the dashboard
        print("⚠️  No salary data — teamBudgets will be empty (dashboard falls back to 2025)")

    # ──────────────────────────────────────────
    # 7. OUTPUT
    # ──────────────────────────────────────────
    output = {
        "matches": matches,
        "players": players,
        "teamBudgets": team_budgets,
        "totalWeeks": max_week,
        "seasonYear": 2026,
        "fetchedAt": datetime.utcnow().isoformat() + "Z",
    }

    # Replace NaN/Infinity with None for valid JSON
    import math
    def sanitize(obj):
        if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
            return None
        if isinstance(obj, dict):
            return {k: sanitize(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [sanitize(v) for v in obj]
        return obj

    output = sanitize(output)
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\n✅ Output written to {OUTPUT_PATH}")
    print(f"   {len(matches)} matches, {len(players)} players, {max_week} matchweeks")

    # Quick validation: print standings
    print("\n📊 Quick standings check:")
    team_pts = defaultdict(lambda: {"w": 0, "d": 0, "l": 0, "gf": 0, "ga": 0, "pts": 0})
    for m in matches:
        h, a = m["homeTeam"], m["awayTeam"]
        hg, ag = m["homeGoals"], m["awayGoals"]
        team_pts[h]["gf"] += hg
        team_pts[h]["ga"] += ag
        team_pts[a]["gf"] += ag
        team_pts[a]["ga"] += hg
        if hg > ag:
            team_pts[h]["w"] += 1; team_pts[h]["pts"] += 3
            team_pts[a]["l"] += 1
        elif hg < ag:
            team_pts[a]["w"] += 1; team_pts[a]["pts"] += 3
            team_pts[h]["l"] += 1
        else:
            team_pts[h]["d"] += 1; team_pts[h]["pts"] += 1
            team_pts[a]["d"] += 1; team_pts[a]["pts"] += 1

    sorted_teams = sorted(team_pts.items(), key=lambda x: (-x[1]["pts"], -(x[1]["gf"] - x[1]["ga"])))
    for i, (tid, s) in enumerate(sorted_teams[:10], 1):
        gd = s["gf"] - s["ga"]
        print(f"   {i:2d}. {tid:4s}  {s['w']}W {s['d']}D {s['l']}L  GD:{gd:+3d}  Pts:{s['pts']}")

    # Verify storylines
    print("\n📰 Storyline verification:")
    lafc = team_pts.get("LAFC", {})
    print(f"   LAFC GA: {lafc.get('ga', '?')} (expecting 0 for 'The LAFC Wall')")
    phi = team_pts.get("PHI", {})
    print(f"   PHI Pts: {phi.get('pts', '?')} (expecting 0 for 'The Philly Collapse')")
    van = team_pts.get("VAN", {})
    print(f"   VAN GF: {van.get('gf', '?')}, GD: {van.get('gf', 0) - van.get('ga', 0)} (expecting 14 GF, +12 GD)")
    # Sam Surridge
    surridge = [p for p in players if "Surridge" in p["name"]]
    if surridge:
        print(f"   Sam Surridge: {surridge[0]['goals']}G in {surridge[0]['games']} games")

    # Fox Sports merge validation
    if has_fox_data:
        print("\n🦊 Fox Sports merge validation:")
        non_zero_yc = sum(1 for p in players if p["yellowCards"] > 0)
        non_zero_tkl = sum(1 for p in players if p["tackles"] > 0)
        non_zero_fouls = sum(1 for p in players if p["fouls"] > 0)
        print(f"   Players with yellowCards > 0: {non_zero_yc}")
        print(f"   Players with tackles > 0:     {non_zero_tkl}")
        print(f"   Players with fouls > 0:       {non_zero_fouls}")

        # Show top card earners
        top_yc = sorted(players, key=lambda p: -p["yellowCards"])[:5]
        print("\n   Top yellow card earners:")
        for p in top_yc:
            print(f"     {p['name']} ({p['team']}): {p['yellowCards']} YC")

    # Salary merge validation
    if has_salary_data:
        print("\n💰 Salary merge validation:")
        non_zero_sal = sum(1 for p in players if p["salary"] > 0)
        print(f"   Players with salary > 0: {non_zero_sal}/{len(players)}")

        # Show top earners
        top_sal = sorted(players, key=lambda p: -p["salary"])[:10]
        print("\n   Top 10 earners:")
        for p in top_sal:
            print(f"     {p['name']} ({p['team']}): ${p['salary']:,}")

        # Team budget summary
        print("\n   Team budget summary:")
        for tid in sorted(team_budgets.keys()):
            tb = team_budgets[tid]
            print(f"     {tid:5s} ${tb['totalSalary']:>12,}  "
                  f"DP:{tb['dpCount']} TAM:{tb['tamCount']} Reg:{tb['regularCount']}")


if __name__ == "__main__":
    main()
