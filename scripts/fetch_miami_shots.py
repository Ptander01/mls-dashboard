#!/usr/bin/env python3
"""
fetch_miami_shots.py
====================
Reads the already-fetched StatsBomb event data for Inter Miami vs Toronto FC
(Match ID 3877115, Sept 20 2023 — 4-0 win) and produces a lightweight JSON
file containing all shot events with pre-computed Three.js coordinates.

Output:
    client/public/data/miami_shots.json

Usage:
    python scripts/fetch_miami_shots.py

The script reads from the existing events file produced by
fetch_statsbomb_miami.py, so no network call is required.
"""

from __future__ import annotations

import json
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
MATCH_ID = 3877115
REPO_ROOT = Path(__file__).resolve().parent.parent
EVENTS_PATH = REPO_ROOT / "client" / "public" / "data" / "statsbomb" / f"events-{MATCH_ID}.json"
OUTPUT_PATH = REPO_ROOT / "client" / "public" / "data" / "miami_shots.json"

# Outcome categories for color coding in the frontend
OUTCOME_MAP = {
    "Goal": "goal",
    "Saved": "saved",
    "Off T": "off_target",
    "Post": "off_target",   # Post counts as off-target visually
    "Blocked": "blocked",
}


# ---------------------------------------------------------------------------
# Coordinate Transformation
# ---------------------------------------------------------------------------
# StatsBomb pitch: 120 (length) x 80 (width), origin at bottom-left.
# Three.js pitch: X-axis -60 to 60, Z-axis -40 to 40, centered.
# Mapping: ThreeX = StatsBombX - 60, ThreeZ = StatsBombY - 40

def to_three(sb_x: float, sb_y: float) -> tuple[float, float]:
    """Convert StatsBomb [x, y] to Three.js [x, z] coordinates."""
    return (round(sb_x - 60, 2), round(sb_y - 40, 2))


# ---------------------------------------------------------------------------
# Main Pipeline
# ---------------------------------------------------------------------------

def main() -> None:
    print("=" * 60)
    print("Shot Map Data Extraction")
    print(f"Match: {MATCH_ID} (Inter Miami 4-0 Toronto FC)")
    print("=" * 60)

    # 1. Load events
    print(f"\n[1/3] Loading events from {EVENTS_PATH.name} …")
    with open(EVENTS_PATH) as f:
        events = json.load(f)
    print(f"  → {len(events)} total events loaded.")

    # 2. Filter shot events
    print("\n[2/3] Extracting shot events …")
    raw_shots = [e for e in events if e.get("type") == "Shot"]
    print(f"  → {len(raw_shots)} shots found.")

    # 3. Transform into lightweight output
    print("\n[3/3] Transforming to frontend-ready JSON …")

    shots = []
    team_stats: dict[str, dict] = {}

    for s in raw_shots:
        team_name = s["team"]["name"]
        player_name = s["player"]["name"]
        sb_loc = s["location"]           # [x, y] in StatsBomb coords
        sb_end = s.get("shotEndLocation", sb_loc)  # [x, y] or [x, y, z]
        outcome_raw = s.get("outcome", "Off T")
        outcome = OUTCOME_MAP.get(outcome_raw, "off_target")
        xg = round(s.get("xG", 0), 4)

        # Transform coordinates
        three_x, three_z = to_three(sb_loc[0], sb_loc[1])
        end_x, end_z = to_three(sb_end[0], sb_end[1])

        shot = {
            "id": s["id"],
            "minute": s["minute"],
            "second": s.get("second", 0),
            "team": team_name,
            "player": player_name,
            "location": [three_x, three_z],
            "endLocation": [end_x, end_z],
            "outcome": outcome,
            "outcomeRaw": outcome_raw,
            "xG": xg,
            "bodyPart": s.get("bodyPart", "Unknown"),
            "technique": s.get("technique", "Normal"),
            "shotType": s.get("shotType", "Open Play"),
        }
        shots.append(shot)

        # Accumulate team stats
        if team_name not in team_stats:
            team_stats[team_name] = {
                "shots": 0, "goals": 0, "saved": 0,
                "blocked": 0, "off_target": 0, "totalXG": 0.0,
            }
        ts = team_stats[team_name]
        ts["shots"] += 1
        if outcome == "goal":
            ts["goals"] += 1
        elif outcome == "saved":
            ts["saved"] += 1
        elif outcome == "blocked":
            ts["blocked"] += 1
        else:
            ts["off_target"] += 1
        ts["totalXG"] += xg

    # Sort by minute
    shots.sort(key=lambda s: (s["minute"], s["second"]))

    # Build team summaries
    teams = []
    for name, stats in sorted(team_stats.items()):
        teams.append({
            "name": name,
            "shots": stats["shots"],
            "goals": stats["goals"],
            "saved": stats["saved"],
            "blocked": stats["blocked"],
            "offTarget": stats["off_target"],
            "totalXG": round(stats["totalXG"], 4),
            "avgXG": round(stats["totalXG"] / max(1, stats["shots"]), 4),
        })

    output = {
        "matchId": MATCH_ID,
        "matchLabel": "Inter Miami 4-0 Toronto FC",
        "matchDate": "2023-09-20",
        "teams": teams,
        "shots": shots,
        "meta": {
            "totalShots": len(shots),
            "totalGoals": sum(1 for s in shots if s["outcome"] == "goal"),
            "coordinateSystem": "Three.js centered (X: -60 to 60, Z: -40 to 40)",
            "source": "StatsBomb Open Data",
        },
    }

    # Write output
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\n  → Saved {OUTPUT_PATH.relative_to(REPO_ROOT)}")

    # Print summary
    print("\n" + "=" * 80)
    print(f"{'Player':<35} {'Team':<15} {'Min':>4} {'Outcome':<12} {'xG':>6}")
    print("-" * 80)
    for shot in shots:
        print(
            f"  {shot['player'][:33]:<33} "
            f"{shot['team'][:13]:<13} "
            f"{shot['minute']:>4}' "
            f"{shot['outcomeRaw']:<12} "
            f"{shot['xG']:>6.4f}"
        )
    print("=" * 80)
    for t in teams:
        print(f"\n{t['name']}: {t['shots']} shots, {t['goals']} goals, "
              f"Total xG: {t['totalXG']:.4f}, Avg xG: {t['avgXG']:.4f}")
    print("=" * 80)


if __name__ == "__main__":
    main()
