#!/usr/bin/env python3
"""
fetch_statsbomb_miami.py
========================
Fetches StatsBomb open-data for all available Inter Miami 2023 MLS matches,
processes the raw events into a compact JSON format suitable for a frontend
3D pitch map, and writes the output files into:

    client/public/data/statsbomb/
        matches.json              – match index / metadata
        events-{matchId}.json     – processed events per match

Usage:
    pip install statsbombpy pandas
    python scripts/fetch_statsbomb_miami.py

The script is idempotent – re-running it overwrites existing files.
"""

from __future__ import annotations

import json
import math
import os
import sys
from pathlib import Path

import pandas as pd
from statsbombpy import sb

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
COMPETITION_ID = 44        # Major League Soccer
SEASON_ID = 107            # 2023
TEAM_NAME = "Inter Miami"  # Filter token (case-insensitive substring)

# Event types we care about for the pitch map
RELEVANT_TYPES = {"Pass", "Shot", "Carry", "Dribble", "Ball Recovery",
                  "Clearance", "Interception", "Pressure", "Duel",
                  "Foul Won", "Foul Committed", "Goal Keeper"}

# Resolve output directory relative to the repo root (one level up from scripts/)
REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = REPO_ROOT / "client" / "public" / "data" / "statsbomb"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _safe(val):
    """Return None for NaN / NaT / empty, else the value."""
    if val is None:
        return None
    if isinstance(val, float) and math.isnan(val):
        return None
    return val


def _loc(val):
    """Convert a location list to a 2-element [x, y] list or None."""
    if val is None:
        return None
    if isinstance(val, (list, tuple)) and len(val) >= 2:
        return [round(float(val[0]), 1), round(float(val[1]), 1)]
    return None


def process_event(row: pd.Series) -> dict | None:
    """Convert a single raw StatsBomb event row into a compact dict.

    Returns None if the event type is not in RELEVANT_TYPES.
    """
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

    # Player info (some events like tactical shifts have no player)
    if _safe(row.get("player")):
        event["player"] = {
            "id": int(row["player_id"]) if _safe(row.get("player_id")) else None,
            "name": row["player"],
        }

    # ----- Type-specific fields -----

    if etype == "Shot":
        event["shotEndLocation"] = _loc(row.get("shot_end_location"))
        event["outcome"] = _safe(row.get("shot_outcome"))
        event["xG"] = round(float(row["shot_statsbomb_xg"]), 4) if _safe(row.get("shot_statsbomb_xg")) else None
        event["bodyPart"] = _safe(row.get("shot_body_part"))
        event["technique"] = _safe(row.get("shot_technique"))
        event["shotType"] = _safe(row.get("shot_type"))

    elif etype == "Pass":
        event["passEndLocation"] = _loc(row.get("pass_end_location"))
        event["outcome"] = _safe(row.get("pass_outcome"))  # None = successful
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
# Main pipeline
# ---------------------------------------------------------------------------

def main() -> None:
    print("=" * 60)
    print("StatsBomb Inter Miami 2023 – Data Fetch & Process")
    print("=" * 60)

    # 1. Fetch matches -------------------------------------------------------
    print("\n[1/3] Fetching MLS 2023 match list …")
    matches_df = sb.matches(competition_id=COMPETITION_ID, season_id=SEASON_ID)

    # Filter for Inter Miami (home or away)
    mask = (
        matches_df["home_team"].str.contains(TEAM_NAME, case=False, na=False)
        | matches_df["away_team"].str.contains(TEAM_NAME, case=False, na=False)
    )
    miami_matches = matches_df[mask].copy()
    miami_matches.sort_values("match_date", inplace=True)
    miami_matches.reset_index(drop=True, inplace=True)

    if miami_matches.empty:
        print("ERROR: No Inter Miami matches found. Exiting.")
        sys.exit(1)

    print(f"  → Found {len(miami_matches)} Inter Miami matches.\n")

    # 2. Build matches.json metadata -----------------------------------------
    print("[2/3] Building matches.json index …")
    matches_index: list[dict] = []
    for _, m in miami_matches.iterrows():
        matches_index.append({
            "matchId": int(m["match_id"]),
            "date": m["match_date"],
            "kickOff": _safe(m.get("kick_off")),
            "homeTeam": {
                "name": m["home_team"],
            },
            "awayTeam": {
                "name": m["away_team"],
            },
            "homeScore": int(m["home_score"]),
            "awayScore": int(m["away_score"]),
            "matchWeek": int(m["match_week"]) if _safe(m.get("match_week")) else None,
            "stadium": _safe(m.get("stadium")),
            "referee": _safe(m.get("referee")),
            "competitionStage": _safe(m.get("competition_stage")),
        })

    # 3. Fetch & process events per match ------------------------------------
    print("[3/3] Fetching and processing events per match …\n")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for meta in matches_index:
        mid = meta["matchId"]
        label = f"{meta['homeTeam']['name']} vs {meta['awayTeam']['name']} ({meta['date']})"
        print(f"  Fetching events for match {mid}: {label} …")

        raw_events = sb.events(match_id=mid)
        processed: list[dict] = []
        for _, row in raw_events.iterrows():
            evt = process_event(row)
            if evt is not None:
                processed.append(evt)

        # Sort by minute/second for chronological order
        processed.sort(key=lambda e: (e["minute"], e["second"]))

        # Summary stats for this match
        shots = [e for e in processed if e["type"] == "Shot"]
        goals = [e for e in shots if e.get("outcome") == "Goal"]
        passes = [e for e in processed if e["type"] == "Pass"]

        print(f"    → {len(processed)} events  |  {len(shots)} shots  |  "
              f"{len(goals)} goals  |  {len(passes)} passes")

        # Write events file
        events_path = OUTPUT_DIR / f"events-{mid}.json"
        with open(events_path, "w") as f:
            json.dump(processed, f, separators=(",", ":"))
        print(f"    → Saved {events_path.relative_to(REPO_ROOT)}")

    # Write matches.json
    matches_path = OUTPUT_DIR / "matches.json"
    with open(matches_path, "w") as f:
        json.dump(matches_index, f, indent=2)
    print(f"\n  → Saved {matches_path.relative_to(REPO_ROOT)}")

    # Final summary
    print("\n" + "=" * 60)
    print("Done! Generated files:")
    print(f"  {matches_path.relative_to(REPO_ROOT)}")
    for meta in matches_index:
        print(f"  client/public/data/statsbomb/events-{meta['matchId']}.json")
    print("=" * 60)


if __name__ == "__main__":
    main()
