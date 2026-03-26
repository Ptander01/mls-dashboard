# Sprint Brief: 2026 Data Pipeline Polish

## Objective
Fill the "zeros" in the 2026 player dataset (`mls2026.json`). When the dashboard transitioned from FBRef to the ASA API in early 2026, several basic counting stats were lost because ASA focuses on advanced metrics (xG, xPass). This sprint will build a secondary scraper to pull these missing stats from Fox Sports and merge them into the existing pipeline.

## The Problem
Currently, the `fetch_2026_season.py` script hardcodes the following fields to `0` for all players:
- `yellowCards`, `redCards`
- `fouls`, `fouled`
- `tackles`, `interceptions`
- `offsides`, `crosses`
- `salary`

## The Solution
We have verified that **Fox Sports** maintains easily scrapeable, server-rendered HTML tables for MLS stats. By scraping two specific pages, we can fill 7 of the 9 missing fields.

### Data Mapping
| Field | Target Source | Page Category | Column Header |
|---|---|---|---|
| `yellowCards` | Fox Sports | Standard | YC |
| `redCards` | Fox Sports | Standard | RC |
| `offsides` | Fox Sports | Standard | OFF |
| `fouls` | Fox Sports | Discipline | FC (Fouls Committed) |
| `fouled` | Fox Sports | Discipline | FS (Fouls Suffered) |
| `tackles` | Fox Sports | Discipline | TKL |
| `interceptions` | Fox Sports | Discipline | INT |
| `crosses` | *Remain 0* | N/A | Not available on Fox |
| `salary` | *Remain 0* | N/A | 2026 MLSPA guide pending |

## Implementation Steps

### 1. Create `scripts/scrape_fox_stats.py`
Create a new Python script using `requests` and `BeautifulSoup` to scrape the Fox Sports tables.
- **Target 1 (Standard):** `https://www.foxsports.com/soccer/mls/stats?category=standard&season=2026&page={1..N}`
- **Target 2 (Discipline):** `https://www.foxsports.com/soccer/mls/stats?category=discipline&season=2026&page={1..N}`
- **Logic:** 
  - Loop through pages 1-25 (or until no table is found).
  - Extract the data rows.
  - *Crucial formatting note:* Fox Sports concatenates the player name and team abbreviation in the first column (e.g., "Gabriel PecLA"). You will need a regex or string manipulation to split this into `Name` and `Team` so it can be matched with the ASA data.
  - Save the combined results to an intermediate JSON file: `scripts/temp_fox_stats.json`.

### 2. Update `scripts/fetch_2026_season.py`
Modify the existing ASA fetch script to consume the Fox Sports data.
- Read `scripts/temp_fox_stats.json`.
- When building the `players` array (around line 180), perform a fuzzy match on the player name (e.g., ignoring case and accents) against the Fox Sports dictionary.
- If a match is found, populate `yellowCards`, `redCards`, `fouls`, `fouled`, `tackles`, `interceptions`, and `offsides` with the Fox Sports integers instead of `0`.

### 3. Pipeline Wrapper (Optional but recommended)
Create a simple bash script `scripts/update_data.sh` that runs both:
```bash
#!/bin/bash
echo "Scraping Fox Sports..."
python3 scripts/scrape_fox_stats.py
echo "Fetching ASA and merging..."
python3 scripts/fetch_2026_season.py
```

## Acceptance Criteria
- [ ] `scrape_fox_stats.py` successfully pages through Fox Sports and extracts YC, RC, OFF, FC, FS, TKL, INT.
- [ ] Name parsing correctly separates "Gabriel PecLA" into "Gabriel Pec".
- [ ] `fetch_2026_season.py` successfully merges the Fox data into the final `mls2026.json`.
- [ ] The Player Database tab in the dashboard no longer shows 0s for cards, tackles, and fouls for starting players.
