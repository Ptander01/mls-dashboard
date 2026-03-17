#!/usr/bin/env python3
"""
fetch_statsbomb_worldcup.py
===========================
Fetches StatsBomb open-data for the complete FIFA World Cup 2022 tournament
(64 matches) and processes all events into compact JSON files suitable for
frontend 3D pitch visualizations (shot maps, passing networks, heatmaps).

Outputs:
    client/public/data/statsbomb/worldcup2022/
        wc-matches.json                   – match index with metadata
        wc-events-{matchId}.json          – processed events per match

Usage:
    pip install statsbombpy pandas
    python scripts/fetch_statsbomb_worldcup.py
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import pandas as pd
from statsbombpy import sb

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
COMPETITION_ID = 43   # FIFA World Cup
SEASON_ID = 106       # 2022

RELEVANT_TYPES = {"Pass", "Shot", "Carry", "Dribble", "Ball Recovery",
                  "Clearance", "Interception", "Pressure", "Duel",
                  "Foul Won", "Foul Committed", "Goal Keeper"}

REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = REPO_ROOT / "client" / "public" / "data" / "statsbomb" / "worldcup2022"


# ---------------------------------------------------------------------------
# Helpers (same compact format as the Miami script)
# ---------------------------------------------------------------------------

def _safe(val):
    if val is None:
        return None
    if isinstance(val, float) and math.isnan(val):
        return None
    return val


def _loc(val):
    if val is None:
        return None
    if isinstance(val, (list, tuple)) and len(val) >= 2:
        return [round(float(val[0]), 1), round(float(val[1]), 1)]
    return None


def process_event(row: pd.Series) -> dict | None:
    etype = row.get("type")
    if etype not in RELEVANT_TYPES:
        return None

    event: dict = {
        "id": row["id"],
        "matchId": int(row["match_id"]),
        "minute": int(row["minute"]),
        "second": int(row["second"]),
        "type": etype,
        "team": {
            "id": int(row["team_id"]) if _safe(row.get("team_id")) else None,
            "name": _safe(row.get("team")),
        },
        "player": None,
        "location": _loc(row.get("location")),
    }

    if _safe(row.get("player")):
        event["player"] = {
            "id": int(row["player_id"]) if _safe(row.get("player_id")) else None,
            "name": row["player"],
        }

    if etype == "Shot":
        event["shotEndLocation"] = _loc(row.get("shot_end_location"))
        event["outcome"] = _safe(row.get("shot_outcome"))
        event["xG"] = round(float(row["shot_statsbomb_xg"]), 4) if _safe(row.get("shot_statsbomb_xg")) else None
        event["bodyPart"] = _safe(row.get("shot_body_part"))
        event["technique"] = _safe(row.get("shot_technique"))
        event["shotType"] = _safe(row.get("shot_type"))

    elif etype == "Pass":
        event["passEndLocation"] = _loc(row.get("pass_end_location"))
        event["outcome"] = _safe(row.get("pass_outcome"))
        event["recipient"] = None
        if _safe(row.get("pass_recipient")):
            event["recipient"] = {
                "id": int(row["pass_recipient_id"]) if _safe(row.get("pass_recipient_id")) else None,
                "name": row["pass_recipient"],
            }
        event["passHeight"] = _safe(row.get("pass_height"))
        event["isGoalAssist"] = bool(row.get("pass_goal_assist")) if _safe(row.get("pass_goal_assist")) else False
        event["isShotAssist"] = bool(row.get("pass_shot_assist")) if _safe(row.get("pass_shot_assist")) else False
        event["isCross"] = bool(row.get("pass_cross")) if _safe(row.get("pass_cross")) else False

    elif etype == "Carry":
        event["carryEndLocation"] = _loc(row.get("carry_end_location"))

    elif etype == "Dribble":
        event["outcome"] = _safe(row.get("dribble_outcome"))

    elif etype == "Goal Keeper":
        event["outcome"] = _safe(row.get("goalkeeper_outcome"))
        event["gkType"] = _safe(row.get("goalkeeper_type"))

    return event


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    print("=" * 70)
    print("StatsBomb — FIFA World Cup 2022 Full Tournament Fetch")
    print("=" * 70)

    # 1. Fetch all matches
    print("\n[1/3] Fetching World Cup 2022 match list …")
    matches_df = sb.matches(competition_id=COMPETITION_ID, season_id=SEASON_ID)
    matches_df.sort_values("match_date", inplace=True)
    matches_df.reset_index(drop=True, inplace=True)

    print(f"  → {len(matches_df)} matches found.\n")

    # 2. Build match index
    print("[2/3] Building wc-matches.json index …")
    matches_index: list[dict] = []
    for _, m in matches_df.iterrows():
        matches_index.append({
            "matchId": int(m["match_id"]),
            "date": m["match_date"],
            "kickOff": _safe(m.get("kick_off")),
            "homeTeam": {"name": m["home_team"]},
            "awayTeam": {"name": m["away_team"]},
            "homeScore": int(m["home_score"]),
            "awayScore": int(m["away_score"]),
            "matchWeek": int(m["match_week"]) if _safe(m.get("match_week")) else None,
            "stadium": _safe(m.get("stadium")),
            "referee": _safe(m.get("referee")),
            "competitionStage": _safe(m.get("competition_stage")),
        })

    # 3. Fetch & process events
    print("[3/3] Fetching and processing events per match …\n")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    total_events = 0
    total_shots = 0
    total_goals = 0
    total_passes = 0

    for meta in matches_index:
        mid = meta["matchId"]
        label = f"{meta['homeTeam']['name']} vs {meta['awayTeam']['name']} ({meta['date']})"
        print(f"  Fetching match {mid}: {label} …")

        raw_events = sb.events(match_id=mid)
        processed: list[dict] = []
        for _, row in raw_events.iterrows():
            evt = process_event(row)
            if evt is not None:
                processed.append(evt)

        processed.sort(key=lambda e: (e["minute"], e["second"]))

        shots = [e for e in processed if e["type"] == "Shot"]
        goals = [e for e in shots if e.get("outcome") == "Goal"]
        passes = [e for e in processed if e["type"] == "Pass"]

        total_events += len(processed)
        total_shots += len(shots)
        total_goals += len(goals)
        total_passes += len(passes)

        print(f"    → {len(processed)} events  |  {len(shots)} shots  |  "
              f"{len(goals)} goals  |  {len(passes)} passes")

        events_path = OUTPUT_DIR / f"wc-events-{mid}.json"
        with open(events_path, "w") as f:
            json.dump(processed, f, separators=(",", ":"))

    # Write match index
    matches_path = OUTPUT_DIR / "wc-matches.json"
    with open(matches_path, "w") as f:
        json.dump(matches_index, f, indent=2)

    print(f"\n{'='*70}")
    print(f"Done! FIFA World Cup 2022")
    print(f"  Matches:  {len(matches_index)}")
    print(f"  Events:   {total_events}")
    print(f"  Shots:    {total_shots}")
    print(f"  Goals:    {total_goals}")
    print(f"  Passes:   {total_passes}")
    print(f"\nFiles saved to: {OUTPUT_DIR.relative_to(REPO_ROOT)}/")
    print(f"{'='*70}")


if __name__ == "__main__":
    main()
