#!/usr/bin/env python3
"""
fetch_spotrac_salaries.py — MLS 2026 Salary Data Compiler

Compiles 2026 MLS player salary data from multiple sources and maps it
to the ASA player names used in the dashboard pipeline.

Data sources (in priority order):
  1. DirecTV Insider 2026 MLS Payrolls (top earners + team totals)
  2. MLSPA 2025 Fall Salary Guide (comprehensive baseline for returning players)

Fuzzy string matching (via thefuzz) maps source names → ASA player names.
Budget tier calculation: DP (>$1.68M), TAM ($683K–$1.68M), Regular (<$683K).

Output: scripts/salary_data_2026.json
  {
    "playerSalaries": { "normalized_name|team": salary, ... },
    "teamTotals": { "TEAM_ID": total, ... },
    "metadata": { ... }
  }
"""

import json
import os
import sys
import unicodedata
from collections import defaultdict

from thefuzz import fuzz, process

# ──────────────────────────────────────────────
# CONSTANTS
# ──────────────────────────────────────────────

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

MLSPA_JSON = os.path.join(os.path.dirname(PROJECT_ROOT), "mlspa_2025_fall.json")
MLS2026_JSON = os.path.join(PROJECT_ROOT, "client", "public", "data", "mls2026.json")
OUTPUT_PATH = os.path.join(SCRIPT_DIR, "salary_data_2026.json")

# 2026 MLS budget thresholds (from CBA)
DP_THRESHOLD = 1_683_750       # Designated Player: above this
TAM_THRESHOLD = 683_750        # TAM: between this and DP threshold
# Regular: below TAM_THRESHOLD

# MLSPA team name → Dashboard 3-letter team ID
MLSPA_TEAM_TO_DASH = {
    "Atlanta United": "ATL",
    "Austin FC": "ATX",
    "CF Montreal": "MTL",
    "Charlotte FC": "CLT",
    "Chicago Fire": "CHI",
    "Colorado Rapids": "COL",
    "Columbus Crew": "CLB",
    "DC United": "DC",
    "FC Cincinnati": "CIN",
    "FC Dallas": "DAL",
    "Houston Dynamo": "HOU",
    "Inter Miami": "MIA",
    "LA Galaxy": "LAG",
    "LAFC": "LAFC",
    "Minnesota United": "MIN",
    "Nashville SC": "NSH",
    "New England Revolution": "NE",
    "New York City FC": "NYC",
    "New York Red Bulls": "NYRB",
    "Orlando City SC": "ORL",
    "Philadelphia Union": "PHI",
    "Portland Timbers": "POR",
    "Real Salt Lake": "RSL",
    "San Diego FC": "SD",
    "San Jose Earthquakes": "SJ",
    "Seattle Sounders FC": "SEA",
    "Sporting Kansas City": "SKC",
    "St. Louis City SC": "STL",
    "Toronto FC": "TOR",
    "Vancouver Whitecaps FC": "VAN",
}

# DirecTV team name → Dashboard 3-letter team ID
DIRECTV_TEAM_TO_DASH = {
    "Los Angeles FC": "LAFC",
    "Atlanta United": "ATL",
    "Inter Miami": "MIA",
    "Chicago Fire": "CHI",
    "LA Galaxy": "LAG",
    "San Diego FC": "SD",
    "FC Cincinnati": "CIN",
    "New York Red Bulls": "NYRB",
    "Portland Timbers": "POR",
    "Seattle Sounders": "SEA",
    "New England Revolution": "NE",
    "New York City FC": "NYC",
    "Columbus Crew": "CLB",
    "Nashville SC": "NSH",
    "Austin FC": "ATX",
    "Charlotte FC": "CLT",
    "St. Louis City SC": "STL",
    "Colorado Rapids": "COL",
    "Real Salt Lake": "RSL",
    "FC Dallas": "DAL",
    "Orlando City": "ORL",
    "Minnesota United FC": "MIN",
    "San Jose Earthquakes": "SJ",
    "Houston Dynamo": "HOU",
    "Sporting Kansas City": "SKC",
    "D.C. United": "DC",
    "Philadelphia Union": "PHI",
    "CF Montreal": "MTL",
    "Toronto FC": "TOR",
    "Vancouver Whitecaps": "VAN",
}

# DirecTV 2026 team annual wages (from March 26, 2026 article)
DIRECTV_TEAM_WAGES = {
    "LAFC": 22_819_612,
    "ATL": 21_278_896,
    "MIA": 19_674_114,
    "CHI": 17_617_709,
    "LAG": 16_629_866,
    "SD": 15_961_001,
    "CIN": 15_955_993,
    "NYRB": 15_501_724,
    "POR": 15_191_248,
    "SEA": 14_827_093,
    "NE": 14_706_752,
    "NYC": 14_672_724,
    "CLB": 14_213_484,
    "NSH": 13_531_488,
    "ATX": 12_838_622,
    "CLT": 12_231_533,
    "STL": 12_007_588,
    "COL": 11_330_066,
    "RSL": 11_218_976,
    "DAL": 10_068_354,
    "ORL": 10_021_732,
    "MIN": 9_268_038,
    "SJ": 8_812_854,
    "HOU": 8_752_866,
    "SKC": 8_461_110,
    "DC": 6_306_244,
    "PHI": 6_126_110,
}

# DirecTV top 40 highest-paid players (2026)
DIRECTV_TOP_PLAYERS = [
    ("Lionel Messi", "MIA", 12_000_000),
    ("Son Heung-min", "LAFC", 10_368_750),
    ("Miguel Almirón", "ATL", 6_056_000),
    ("Hirving Lozano", "SD", 6_000_000),
    ("Emil Forsberg", "NYRB", 5_405_000),
    ("Riqui Puig", "LAG", 5_125_000),
    ("Jonathan Bamba", "CHI", 5_000_000),
    ("Carles Gil", "NE", 4_250_000),
    ("Hany Mukhtar", "NSH", 3_900_000),
    ("Kévin Denkey", "CIN", 3_800_000),
    ("Nicolás Fernández Mercau", "NYC", 3_650_000),
    ("Aleksei Miranchuk", "ATL", 3_600_000),
    ("Emmanuel Latte Lath", "ATL", 3_534_546),
    ("Ryan Gauld", "VAN", 3_500_000),
    ("Hugo Cuypers", "CHI", 3_238_000),
    ("Eric Maxim Choupo-Moting", "NYRB", 3_200_000),
    ("Brandon Vazquez", "ATX", 3_200_000),
    ("Evander", "CIN", 3_200_000),
    ("Joseph Paintsil", "LAG", 3_136_000),
    ("Denis Bouanga", "LAFC", 3_020_000),
    ("Dejan Joveljić", "SKC", 3_000_000),
    ("Sam Surridge", "NSH", 2_775_000),
    ("Jonathan Rodríguez", "POR", 2_775_000),
    ("Diego Rossi", "CLB", 2_725_000),
    ("David Costa", "POR", 2_725_000),
    ("Wilfried Zaha", "CLT", 2_666_667),
    ("Ezequiel Ponce", "HOU", 2_590_000),
    ("Albert Rusnák", "SEA", 2_575_000),
    ("Luis Muriel", "ORL", 2_500_000),
    ("Liel Abada", "CLT", 2_400_000),
    ("Kristoffer Velde", "POR", 2_280_000),
    ("Petar Musa", "DAL", 2_250_000),
    ("Jordan Morris", "SEA", 2_250_000),
    ("Djordje Mihailovic", "TOR", 2_158_335),
    ("Anders Dreyer", "SD", 2_117_647),
    ("Manu García", "SKC", 2_100_000),
    ("Dániel Gazdag", "CLB", 2_000_004),
    ("Paxten Aaronson", "COL", 2_000_000),
    ("Cristian Arango", "SJ", 2_000_000),
    ("Wessam Abou Ali", "CLB", 1_800_000),
]


# ──────────────────────────────────────────────
# NAME NORMALIZATION
# ──────────────────────────────────────────────

def normalize_name(name):
    """Strip accents, lowercase, and trim whitespace for matching."""
    nfkd = unicodedata.normalize("NFKD", name)
    stripped = "".join(c for c in nfkd if not unicodedata.combining(c))
    return stripped.lower().strip()


def build_name_variants(name):
    """Generate common name variants for matching."""
    norm = normalize_name(name)
    variants = [norm]
    parts = norm.split()
    
    if len(parts) >= 2:
        # First Last
        variants.append(f"{parts[0]} {parts[-1]}")
        # Last only (for single-name players like "Evander")
        variants.append(parts[-1])
        # First initial + Last
        variants.append(f"{parts[0][0]}. {parts[-1]}")
    
    return variants


# ──────────────────────────────────────────────
# SALARY DATA COMPILATION
# ──────────────────────────────────────────────

def load_mlspa_data():
    """Load MLSPA 2025 Fall salary data."""
    if not os.path.exists(MLSPA_JSON):
        print(f"⚠️  MLSPA data not found at {MLSPA_JSON}")
        return []
    
    with open(MLSPA_JSON) as f:
        data = json.load(f)
    
    # Convert to standardized format with dashboard team IDs
    result = []
    for p in data:
        team_id = MLSPA_TEAM_TO_DASH.get(p["team"])
        if not team_id:
            continue  # Skip MLS Pool, Retired, etc.
        
        result.append({
            "name": p["name"],
            "team": team_id,
            "base_salary": p["base_salary"],
            "guaranteed_comp": p["guaranteed_comp"],
            "source": "mlspa_2025_fall",
        })
    
    return result


def load_directv_data():
    """Load DirecTV 2026 top player salary data."""
    result = []
    for name, team, salary in DIRECTV_TOP_PLAYERS:
        result.append({
            "name": name,
            "team": team,
            "base_salary": salary,
            "guaranteed_comp": salary,  # DirecTV reports base + marketing
            "source": "directv_2026",
        })
    return result


def build_salary_lookup(mlspa_data, directv_data):
    """
    Build a salary lookup keyed by (normalized_name, team_id).
    DirecTV 2026 data takes priority over MLSPA 2025 Fall data.
    """
    lookup = {}
    
    # First, load MLSPA data (lower priority)
    for p in mlspa_data:
        key = (normalize_name(p["name"]), p["team"])
        lookup[key] = {
            "salary": p["guaranteed_comp"],
            "base_salary": p["base_salary"],
            "source": p["source"],
            "source_name": p["name"],
        }
    
    # Then overlay DirecTV data (higher priority)
    for p in directv_data:
        key = (normalize_name(p["name"]), p["team"])
        lookup[key] = {
            "salary": p["guaranteed_comp"],
            "base_salary": p["base_salary"],
            "source": p["source"],
            "source_name": p["name"],
        }
    
    return lookup


def match_player_salary(player_name, player_team, salary_lookup, all_source_names):
    """
    Match a dashboard player to salary data using fuzzy matching.
    
    Strategy:
      1. Exact match on (normalized_name, team)
      2. Fuzzy match on name within same team (score >= 85)
      3. Fuzzy match on name across all teams (score >= 90)
    
    Returns: (salary, source, match_type) or (0, None, None)
    """
    norm_name = normalize_name(player_name)
    
    # 1. Exact match
    key = (norm_name, player_team)
    if key in salary_lookup:
        return salary_lookup[key]["salary"], salary_lookup[key]["source"], "exact"
    
    # 2. Fuzzy match within same team
    team_names = [(k[0], k) for k in salary_lookup if k[1] == player_team]
    if team_names:
        names_only = [t[0] for t in team_names]
        result = process.extractOne(norm_name, names_only, scorer=fuzz.token_sort_ratio)
        if result and result[1] >= 82:
            matched_name = result[0]
            matched_key = next(t[1] for t in team_names if t[0] == matched_name)
            return salary_lookup[matched_key]["salary"], salary_lookup[matched_key]["source"], f"fuzzy_team({result[1]})"
    
    # 3. Try matching with just last name within same team
    parts = norm_name.split()
    if parts:
        last_name = parts[-1]
        team_matches = [(k, v) for k, v in salary_lookup.items() 
                       if k[1] == player_team and normalize_name(k[0]).split()[-1] == last_name]
        if len(team_matches) == 1:
            return team_matches[0][1]["salary"], team_matches[0][1]["source"], "last_name_team"
    
    # 4. Cross-team fuzzy match (higher threshold to avoid false positives)
    all_names = [k[0] for k in salary_lookup]
    if all_names:
        result = process.extractOne(norm_name, all_names, scorer=fuzz.token_sort_ratio)
        if result and result[1] >= 92:
            matched_name = result[0]
            # Find the key
            matched_keys = [k for k in salary_lookup if k[0] == matched_name]
            if len(matched_keys) == 1:
                matched_key = matched_keys[0]
                return salary_lookup[matched_key]["salary"], salary_lookup[matched_key]["source"], f"fuzzy_cross({result[1]})"
    
    return 0, None, None


# ──────────────────────────────────────────────
# BUDGET TIER CALCULATION
# ──────────────────────────────────────────────

def calculate_budget_tier(salary):
    """Classify a player's salary into DP, TAM, or Regular tier."""
    if salary >= DP_THRESHOLD:
        return "dp"
    elif salary >= TAM_THRESHOLD:
        return "tam"
    else:
        return "regular"


def calculate_team_budgets(players_with_salaries, team_ids):
    """
    Calculate teamBudgets object from player salary data.
    Uses DirecTV team totals as the authoritative total, then distributes
    the remaining salary proportionally among unmatched players.
    """
    team_budgets = {}
    
    for team_id in team_ids:
        team_players = [p for p in players_with_salaries if p["team"] == team_id]
        
        if not team_players:
            team_budgets[team_id] = {
                "totalSalary": DIRECTV_TEAM_WAGES.get(team_id, 0),
                "playerCount": 0,
                "dpSalary": 0, "dpCount": 0,
                "tamSalary": 0, "tamCount": 0,
                "regularSalary": 0, "regularCount": 0,
            }
            continue
        
        # Use DirecTV total as authoritative if available
        directv_total = DIRECTV_TEAM_WAGES.get(team_id, 0)
        matched_total = sum(p["salary"] for p in team_players if p["salary"] > 0)
        unmatched = [p for p in team_players if p["salary"] == 0]
        matched = [p for p in team_players if p["salary"] > 0]
        
        # Distribute remaining salary among unmatched players
        if directv_total > 0 and unmatched and directv_total > matched_total:
            remaining = directv_total - matched_total
            # Give each unmatched player an equal share (minimum salary floor)
            min_salary = 67_360  # 2026 MLS minimum salary
            per_player = max(min_salary, remaining // len(unmatched))
            for p in unmatched:
                p["salary"] = min(per_player, remaining)
                remaining -= p["salary"]
                if remaining <= 0:
                    break
        
        # Calculate tier breakdown
        dp_salary = 0
        dp_count = 0
        tam_salary = 0
        tam_count = 0
        regular_salary = 0
        regular_count = 0
        
        for p in team_players:
            tier = calculate_budget_tier(p["salary"])
            if tier == "dp":
                dp_salary += p["salary"]
                dp_count += 1
            elif tier == "tam":
                tam_salary += p["salary"]
                tam_count += 1
            else:
                regular_salary += p["salary"]
                regular_count += 1
        
        total_salary = dp_salary + tam_salary + regular_salary
        
        # If we have a DirecTV total, use it as the authoritative total
        if directv_total > 0:
            total_salary = directv_total
        
        team_budgets[team_id] = {
            "totalSalary": total_salary,
            "playerCount": len(team_players),
            "dpSalary": dp_salary,
            "dpCount": dp_count,
            "tamSalary": tam_salary,
            "tamCount": tam_count,
            "regularSalary": regular_salary,
            "regularCount": regular_count,
        }
    
    return team_budgets


# ──────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────

def main():
    print("=" * 60)
    print("MLS 2026 Salary Data Compiler")
    print("=" * 60)
    
    # 1. Load source data
    print("\n📂 Loading MLSPA 2025 Fall data...")
    mlspa_data = load_mlspa_data()
    print(f"   Loaded {len(mlspa_data)} MLSPA player records")
    
    print("📂 Loading DirecTV 2026 data...")
    directv_data = load_directv_data()
    print(f"   Loaded {len(directv_data)} DirecTV top earner records")
    print(f"   DirecTV team totals: {len(DIRECTV_TEAM_WAGES)} teams")
    
    # 2. Build salary lookup
    print("\n🔨 Building salary lookup...")
    salary_lookup = build_salary_lookup(mlspa_data, directv_data)
    print(f"   Lookup has {len(salary_lookup)} entries")
    
    # 3. Load current mls2026.json players
    print("\n📋 Loading current mls2026.json...")
    with open(MLS2026_JSON) as f:
        mls_data = json.load(f)
    
    players = mls_data["players"]
    print(f"   Found {len(players)} players in mls2026.json")
    
    # 4. Match salaries
    print("\n🔍 Matching salaries to ASA players...")
    all_source_names = list(set(k[0] for k in salary_lookup))
    
    matched_count = 0
    unmatched_names = []
    match_types = defaultdict(int)
    
    for p in players:
        salary, source, match_type = match_player_salary(
            p["name"], p["team"], salary_lookup, all_source_names
        )
        p["salary"] = salary
        
        if salary > 0:
            matched_count += 1
            match_types[match_type] += 1
        else:
            unmatched_names.append(f"{p['name']} ({p['team']})")
    
    print(f"\n   ✅ Matched: {matched_count}/{len(players)} ({matched_count/len(players)*100:.1f}%)")
    print(f"   ❌ Unmatched: {len(unmatched_names)}")
    print(f"\n   Match type breakdown:")
    for mt, count in sorted(match_types.items(), key=lambda x: -x[1]):
        print(f"     {mt}: {count}")
    
    # 5. Get unique team IDs
    team_ids = sorted(set(p["team"] for p in players))
    print(f"\n   Teams in data: {len(team_ids)}")
    
    # 6. Calculate team budgets
    print("\n💰 Calculating team budgets...")
    team_budgets = calculate_team_budgets(players, team_ids)
    
    # 7. Handle teams missing from DirecTV (MTL, TOR, VAN)
    missing_teams = [t for t in team_ids if t not in DIRECTV_TEAM_WAGES]
    if missing_teams:
        print(f"\n⚠️  Teams not in DirecTV data: {missing_teams}")
        print("   Using MLSPA-derived totals for these teams")
    
    # 8. Print summary
    print("\n📊 Team Budget Summary:")
    print(f"{'Team':6s} {'Total':>14s} {'Players':>8s} {'DP':>4s} {'TAM':>4s} {'Reg':>4s}")
    print("-" * 50)
    for tid in sorted(team_budgets.keys()):
        tb = team_budgets[tid]
        print(f"{tid:6s} ${tb['totalSalary']:>12,} {tb['playerCount']:>8d} "
              f"{tb['dpCount']:>4d} {tb['tamCount']:>4d} {tb['regularCount']:>4d}")
    
    # 9. Print top earners
    print("\n🏆 Top 15 Earners (matched):")
    top = sorted(players, key=lambda p: -p["salary"])[:15]
    for i, p in enumerate(top, 1):
        print(f"   {i:2d}. {p['name']:30s} ({p['team']:4s}) ${p['salary']:>12,}")
    
    # 10. Save output
    output = {
        "playerSalaries": {f"{p['name']}|{p['team']}": p["salary"] for p in players},
        "teamBudgets": team_budgets,
        "teamTotals": DIRECTV_TEAM_WAGES,
        "metadata": {
            "sources": ["MLSPA 2025 Fall Salary Guide", "DirecTV Insider 2026 MLS Payrolls"],
            "matchRate": f"{matched_count}/{len(players)} ({matched_count/len(players)*100:.1f}%)",
            "matchTypes": dict(match_types),
            "unmatchedCount": len(unmatched_names),
        }
    }
    
    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\n✅ Saved salary data to {OUTPUT_PATH}")
    
    return players, team_budgets, output


if __name__ == "__main__":
    main()
