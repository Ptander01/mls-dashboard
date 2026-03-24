#!/usr/bin/env python3
"""
scrape_fox_stats.py — Fox Sports MLS Stats Scraper

Scrapes the Fox Sports MLS stats pages (Standard and Discipline categories)
to collect counting stats that are missing from the ASA API:
  - Standard:   YC (Yellow Cards), RC (Red Cards), OFF (Offsides)
  - Discipline: FC (Fouls Committed), FS (Fouls Suffered), TKL (Tackles), INT (Interceptions)

Output: scripts/temp_fox_stats.json — a dict keyed by player name with all scraped fields.
"""

import json
import os
import re
import sys
import time

import requests
from bs4 import BeautifulSoup

# ──────────────────────────────────────────────
# CONSTANTS
# ──────────────────────────────────────────────

BASE_URL = "https://www.foxsports.com/soccer/mls/stats"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
}
MAX_PAGES = 25
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_PATH = os.path.join(SCRIPT_DIR, "temp_fox_stats.json")

# Fox Sports team abbreviations → Dashboard 3-letter codes
# (only listing exceptions; most are identical)
FOX_TO_DASH = {
    "NY":  "RBNY",
    "NYC": "NYC",
    "LA":  "LA",
    # All others pass through unchanged
}


def parse_int(val):
    """Safely parse a string to int, returning 0 for dashes or empty strings."""
    if not val or val.strip() in ("-", ""):
        return 0
    try:
        return int(val.strip())
    except ValueError:
        return 0


def extract_player_info(name_cell):
    """
    Extract player name and team abbreviation from the Fox Sports name cell.

    The HTML structure is:
      <td class="cell-entity ...">
        <div class="table-entity">
          <div class="flex-col">
            <a class="table-entity-name ...">
              Player Name
              <sup class="table-superscript ...">TEAM</sup>
            </a>
          </div>
        </div>
      </td>

    Falls back to regex splitting if the <sup> tag is missing.
    """
    sup = name_cell.find("sup")
    if sup:
        team = sup.get_text(strip=True)
        # Remove the <sup> element to get clean player name
        sup.decompose()
        name = name_cell.get_text(strip=True)
    else:
        # Fallback: split trailing 2-4 uppercase letters as team abbreviation
        raw = name_cell.get_text(strip=True)
        match = re.match(r"^(.+?)([A-Z]{2,4})$", raw)
        if match:
            name = match.group(1).strip()
            team = match.group(2)
        else:
            name = raw
            team = ""

    # Normalize team abbreviation to dashboard format
    team = FOX_TO_DASH.get(team, team)
    return name.strip(), team


def scrape_category(category, column_map):
    """
    Scrape all pages for a given Fox Sports category.

    Args:
        category: "standard" or "discipline"
        column_map: dict mapping header name → output field name
                    e.g. {"YC": "yellowCards", "RC": "redCards"}

    Returns:
        dict keyed by player name → {field: int_value, ..., "fox_team": str}
    """
    results = {}
    print(f"\n📥 Scraping Fox Sports — {category.upper()}")

    for page in range(1, MAX_PAGES + 1):
        url = f"{BASE_URL}?category={category}&season=2026&page={page}"
        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            resp.raise_for_status()
        except requests.RequestException as e:
            print(f"   ⚠️  Page {page} request failed: {e}")
            break

        soup = BeautifulSoup(resp.text, "html.parser")
        tables = soup.find_all("table")

        # Fox Sports uses two tables: [0] = header row, [1] = data rows
        if len(tables) < 2:
            print(f"   Page {page}: no data table found — stopping pagination.")
            break

        header_table = tables[0]
        data_table = tables[1]

        # Parse column headers from the header table
        headers = [th.get_text(strip=True) for th in header_table.find_all("th")]

        # Build index mapping: header_name → column_index
        # Data table has an extra leading column (#/rank) not in the header table,
        # plus the PLAYERS column, so data columns are offset by 1 from headers.
        # headers[0] = "PLAYERS", headers[1] = "GP", etc.
        # data_cols[0] = rank, data_cols[1] = name, data_cols[2] = GP, etc.
        # So data column index = header index + 1
        header_to_data_idx = {}
        for i, h in enumerate(headers):
            header_to_data_idx[h] = i + 1  # +1 for the rank column

        # Verify we can find the columns we need
        if page == 1:
            found = {h: h in header_to_data_idx for h in column_map}
            print(f"   Headers: {headers}")
            print(f"   Column availability: {found}")

        rows = data_table.find_all("tr")
        if not rows:
            print(f"   Page {page}: no rows — stopping pagination.")
            break

        page_count = 0
        for row in rows:
            cells = row.find_all("td")
            if len(cells) < 3:
                continue

            name, team = extract_player_info(cells[1])
            if not name:
                continue

            # Build the stats dict for this player
            player_stats = {"fox_team": team}
            for fox_header, output_field in column_map.items():
                col_idx = header_to_data_idx.get(fox_header)
                if col_idx is not None and col_idx < len(cells):
                    player_stats[output_field] = parse_int(cells[col_idx].get_text(strip=True))
                else:
                    player_stats[output_field] = 0

            # Use player name as key; if duplicate, keep the one with more data
            if name in results:
                # Merge: take max values (a player might appear on multiple teams)
                for field in column_map.values():
                    results[name][field] = max(
                        results[name].get(field, 0),
                        player_stats.get(field, 0),
                    )
            else:
                results[name] = player_stats

            page_count += 1

        print(f"   Page {page}: scraped {page_count} players (total: {len(results)})")

        # Polite delay between requests
        time.sleep(0.5)

    return results


def main():
    print("🦊 Fox Sports MLS Stats Scraper")
    print("=" * 50)

    # ── Scrape Standard stats ──
    standard_map = {
        "YC":  "yellowCards",
        "RC":  "redCards",
        "OFF": "offsides",
    }
    standard_data = scrape_category("standard", standard_map)

    # ── Scrape Discipline stats ──
    discipline_map = {
        "FC":  "fouls",
        "FS":  "fouled",
        "TKL": "tackles",
        "INT": "interceptions",
    }
    discipline_data = scrape_category("discipline", discipline_map)

    # ── Merge both datasets ──
    print(f"\n🔀 Merging Standard ({len(standard_data)} players) + "
          f"Discipline ({len(discipline_data)} players)...")

    merged = {}
    all_names = set(standard_data.keys()) | set(discipline_data.keys())

    for name in all_names:
        entry = {"fox_team": ""}
        # Standard fields
        if name in standard_data:
            entry.update(standard_data[name])
        else:
            for field in standard_map.values():
                entry.setdefault(field, 0)
        # Discipline fields
        if name in discipline_data:
            for field in discipline_map.values():
                entry[field] = discipline_data[name].get(field, 0)
            # Use team from whichever source has it
            if not entry.get("fox_team") and discipline_data[name].get("fox_team"):
                entry["fox_team"] = discipline_data[name]["fox_team"]
        else:
            for field in discipline_map.values():
                entry.setdefault(field, 0)

        merged[name] = entry

    # ── Save output ──
    with open(OUTPUT_PATH, "w") as f:
        json.dump(merged, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Saved {len(merged)} players to {OUTPUT_PATH}")

    # ── Quick validation ──
    print("\n📊 Sample entries:")
    for name in list(merged.keys())[:5]:
        stats = merged[name]
        print(f"   {name} ({stats['fox_team']}): "
              f"YC={stats.get('yellowCards', 0)} RC={stats.get('redCards', 0)} "
              f"OFF={stats.get('offsides', 0)} "
              f"FC={stats.get('fouls', 0)} FS={stats.get('fouled', 0)} "
              f"TKL={stats.get('tackles', 0)} INT={stats.get('interceptions', 0)}")

    # Count players with non-zero stats
    has_data = sum(
        1 for s in merged.values()
        if any(s.get(f, 0) > 0 for f in [
            "yellowCards", "redCards", "offsides",
            "fouls", "fouled", "tackles", "interceptions",
        ])
    )
    print(f"\n   Players with at least one non-zero stat: {has_data}/{len(merged)}")


if __name__ == "__main__":
    main()
