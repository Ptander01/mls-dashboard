#!/usr/bin/env python3
"""
fetch_statsbomb_messi.py
========================
Fetches StatsBomb open-data for every match where Lionel Messi appears,
across all available competitions (La Liga, Ligue 1, MLS, FIFA World Cup,
Copa America, Champions League finals).

Outputs:
    client/public/data/statsbomb/messi/
        messi-matches.json                – match index with Messi-specific stats
        messi-career-events.json          – ALL Messi events across all matches
        messi-shots.json                  – Messi shots only (compact, for shot maps)
        messi-passes.json                 – Messi passes only (for passing networks)
        messi-heatmap.json                – Messi touch locations (for heatmaps)

Design decisions:
    - We store Messi-only events (not full-match events) to keep the repo
      size manageable (~133K events vs ~1.5M for all players).
    - A single consolidated file per event type is more practical for career-
      spanning visualizations than 602 individual match files.
    - The match index includes per-match aggregates so the frontend can
      filter/facet without loading all events.

Usage:
    pip install statsbombpy pandas
    python scripts/fetch_statsbomb_messi.py
"""

from __future__ import annotations

import json
import math
import sys
import time
from pathlib import Path

import pandas as pd
from statsbombpy import sb

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# All competition-season pairs where Messi could appear
MESSI_COMPETITIONS = [
    # La Liga (Barcelona) — 2004/05 through 2020/21
    (11, 37, "La Liga", "2004/05"),
    (11, 38, "La Liga", "2005/06"),
    (11, 39, "La Liga", "2006/07"),
    (11, 40, "La Liga", "2007/08"),
    (11, 41, "La Liga", "2008/09"),
    (11, 21, "La Liga", "2009/10"),
    (11, 22, "La Liga", "2010/11"),
    (11, 23, "La Liga", "2011/12"),
    (11, 24, "La Liga", "2012/13"),
    (11, 25, "La Liga", "2013/14"),
    (11, 26, "La Liga", "2014/15"),
    (11, 27, "La Liga", "2015/16"),
    (11, 2,  "La Liga", "2016/17"),
    (11, 1,  "La Liga", "2017/18"),
    (11, 4,  "La Liga", "2018/19"),
    (11, 42, "La Liga", "2019/20"),
    (11, 90, "La Liga", "2020/21"),
    # Ligue 1 (PSG)
    (7, 108, "Ligue 1", "2021/22"),
    (7, 235, "Ligue 1", "2022/23"),
    # MLS (Inter Miami)
    (44, 107, "MLS", "2023"),
    # FIFA World Cup (Argentina)
    (43, 3,   "FIFA World Cup", "2018"),
    (43, 106, "FIFA World Cup", "2022"),
    # Copa America (Argentina)
    (223, 282, "Copa America", "2024"),
    # Champions League finals
    (16, 39, "Champions League", "2006/07"),
    (16, 40, "Champions League", "2007/08"),
    (16, 21, "Champions League", "2009/10"),
    (16, 22, "Champions League", "2010/11"),
    (16, 23, "Champions League", "2011/12"),
    (16, 24, "Champions League", "2012/13"),
    (16, 26, "Champions League", "2014/15"),
    (16, 27, "Champions League", "2015/16"),
    (16, 4,  "Champions League", "2018/19"),
]

# Teams Messi has played for
MESSI_TEAMS = ["Barcelona", "Paris Saint-Germain", "Inter Miami", "Argentina"]

REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = REPO_ROOT / "client" / "public" / "data" / "statsbomb" / "messi"

# Event types relevant for pitch visualizations
RELEVANT_TYPES = {"Pass", "Shot", "Carry", "Dribble", "Ball Recovery",
                  "Clearance", "Interception", "Pressure", "Duel",
                  "Foul Won", "Foul Committed", "Goal Keeper"}


# ---------------------------------------------------------------------------
# Helpers
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


def process_messi_event(row: pd.Series, competition: str, season: str) -> dict | None:
    """Convert a Messi event row into a compact dict with competition context."""
    etype = row.get("type")
    if etype not in RELEVANT_TYPES:
        return None

    event: dict = {
        "id": row["id"],
        "matchId": int(row["match_id"]),
        "competition": competition,
        "season": season,
        "minute": int(row["minute"]),
        "second": int(row["second"]),
        "type": etype,
        "team": _safe(row.get("team")),
        "location": _loc(row.get("location")),
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
        event["recipient"] = _safe(row.get("pass_recipient"))
        event["passHeight"] = _safe(row.get("pass_height"))
        event["isGoalAssist"] = bool(row.get("pass_goal_assist")) if _safe(row.get("pass_goal_assist")) else False
        event["isShotAssist"] = bool(row.get("pass_shot_assist")) if _safe(row.get("pass_shot_assist")) else False
        event["isCross"] = bool(row.get("pass_cross")) if _safe(row.get("pass_cross")) else False

    elif etype == "Carry":
        event["carryEndLocation"] = _loc(row.get("carry_end_location"))

    elif etype == "Dribble":
        event["outcome"] = _safe(row.get("dribble_outcome"))

    return event


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    print("=" * 70)
    print("StatsBomb — Lionel Messi Career Data Fetch")
    print("=" * 70)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    all_events: list[dict] = []
    matches_index: list[dict] = []
    match_count = 0
    skipped = 0

    for comp_id, season_id, comp_name, season_name in MESSI_COMPETITIONS:
        print(f"\n--- {comp_name} {season_name} (comp={comp_id}, season={season_id}) ---")

        try:
            matches = sb.matches(competition_id=comp_id, season_id=season_id)
        except Exception as e:
            print(f"  ERROR fetching matches: {e}")
            continue

        # Filter for Messi's teams
        mask = pd.Series([False] * len(matches))
        for team in MESSI_TEAMS:
            mask = mask | matches["home_team"].str.contains(team, case=False, na=False)
            mask = mask | matches["away_team"].str.contains(team, case=False, na=False)
        team_matches = matches[mask].copy()

        if team_matches.empty:
            print("  No matches for Messi's teams.")
            continue

        team_matches.sort_values("match_date", inplace=True)

        for _, m in team_matches.iterrows():
            mid = int(m["match_id"])
            home = m["home_team"]
            away = m["away_team"]
            date = m["match_date"]

            try:
                events = sb.events(match_id=mid)
            except Exception as e:
                print(f"  ERROR fetching events for {mid}: {e}")
                continue

            # Filter for Messi events only
            messi_mask = events["player"].str.contains("Messi", case=False, na=False)
            messi_events = events[messi_mask]

            if messi_events.empty:
                skipped += 1
                continue

            # Process events
            match_processed = []
            for _, row in messi_events.iterrows():
                evt = process_messi_event(row, comp_name, season_name)
                if evt is not None:
                    match_processed.append(evt)

            if not match_processed:
                skipped += 1
                continue

            all_events.extend(match_processed)
            match_count += 1

            # Compute per-match stats
            shots = [e for e in match_processed if e["type"] == "Shot"]
            goals = [e for e in shots if e.get("outcome") == "Goal"]
            passes = [e for e in match_processed if e["type"] == "Pass"]
            carries = [e for e in match_processed if e["type"] == "Carry"]
            dribbles = [e for e in match_processed if e["type"] == "Dribble"]
            total_xg = round(sum(s.get("xG", 0) or 0 for s in shots), 4)

            matches_index.append({
                "matchId": mid,
                "date": date,
                "competition": comp_name,
                "season": season_name,
                "homeTeam": home,
                "awayTeam": away,
                "homeScore": int(m["home_score"]),
                "awayScore": int(m["away_score"]),
                "stadium": _safe(m.get("stadium")),
                "messiTeam": match_processed[0]["team"],
                "messiStats": {
                    "events": len(match_processed),
                    "shots": len(shots),
                    "goals": len(goals),
                    "xG": total_xg,
                    "passes": len(passes),
                    "carries": len(carries),
                    "dribbles": len(dribbles),
                },
            })

            print(f"  ✓ {date}: {home} vs {away} — "
                  f"{len(match_processed)} events, {len(shots)} shots, "
                  f"{len(goals)} goals, xG={total_xg}")

    # Sort everything chronologically
    matches_index.sort(key=lambda m: m["date"])
    all_events.sort(key=lambda e: (e.get("matchId", 0), e["minute"], e["second"]))

    # ---------------------------------------------------------------------------
    # Write output files
    # ---------------------------------------------------------------------------
    print(f"\n{'='*70}")
    print(f"Writing output files …")
    print(f"  Total: {match_count} matches, {len(all_events)} events (skipped {skipped})")

    # 1. Match index
    path = OUTPUT_DIR / "messi-matches.json"
    with open(path, "w") as f:
        json.dump(matches_index, f, indent=2)
    print(f"  → {path.relative_to(REPO_ROOT)} ({len(matches_index)} matches)")

    # 2. All career events (compact)
    path = OUTPUT_DIR / "messi-career-events.json"
    with open(path, "w") as f:
        json.dump(all_events, f, separators=(",", ":"))
    print(f"  → {path.relative_to(REPO_ROOT)} ({len(all_events)} events)")

    # 3. Shots only (for shot maps / xG timeline)
    shots = [e for e in all_events if e["type"] == "Shot"]
    path = OUTPUT_DIR / "messi-shots.json"
    with open(path, "w") as f:
        json.dump(shots, f, separators=(",", ":"))
    print(f"  → {path.relative_to(REPO_ROOT)} ({len(shots)} shots)")

    # 4. Passes only (for passing networks)
    passes = [e for e in all_events if e["type"] == "Pass"]
    path = OUTPUT_DIR / "messi-passes.json"
    with open(path, "w") as f:
        json.dump(passes, f, separators=(",", ":"))
    print(f"  → {path.relative_to(REPO_ROOT)} ({len(passes)} passes)")

    # 5. Heatmap data (all touch locations — any event with a location)
    heatmap = []
    for e in all_events:
        if e.get("location"):
            heatmap.append({
                "matchId": e["matchId"],
                "competition": e["competition"],
                "season": e["season"],
                "minute": e["minute"],
                "type": e["type"],
                "location": e["location"],
            })
    path = OUTPUT_DIR / "messi-heatmap.json"
    with open(path, "w") as f:
        json.dump(heatmap, f, separators=(",", ":"))
    print(f"  → {path.relative_to(REPO_ROOT)} ({len(heatmap)} touch points)")

    # Career summary
    total_goals = sum(1 for s in shots if s.get("outcome") == "Goal")
    total_xg = round(sum(s.get("xG", 0) or 0 for s in shots), 2)
    total_assists = sum(1 for p in passes if p.get("isGoalAssist"))

    print(f"\n{'='*70}")
    print(f"Messi Career Summary (StatsBomb open data)")
    print(f"  Matches:  {match_count}")
    print(f"  Goals:    {total_goals}")
    print(f"  xG:       {total_xg}")
    print(f"  Assists:  {total_assists}")
    print(f"  Shots:    {len(shots)}")
    print(f"  Passes:   {len(passes)}")
    print(f"  Events:   {len(all_events)}")
    print(f"{'='*70}")


if __name__ == "__main__":
    main()
