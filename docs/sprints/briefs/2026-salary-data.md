# Sprint Handoff: 2026 Salary & Budget Data Integration

## 1. Context & Objective
The dashboard's **Budget** tab is currently empty when viewing the 2026 season because player salary data and team budgets are missing from `mls2026.json`. The application falls back to 2025 budget totals to prevent crashes, but individual player salaries show as $0, causing the "Top Earners" table and positional pie charts to render incorrectly. 

The objective of this sprint is to scrape or compile available 2026 MLS salary data and integrate it into the `fetch_2026_season.py` pipeline, ensuring the Budget tab fully populates.

## 2. Current Data Landscape & Sources
The official **MLS Players Association (MLSPA)** 2026 Spring Salary Guide has not been released yet (typically drops in late April or May). However, partial and compiled 2026 salary data is available through secondary sources:

*   **Spotrac (MLS Section):** Maintains updated 2026 cash tables for all teams, including base salaries and cap hits for most players.
*   **DirecTV Insider:** Recently published a comprehensive 2026 MLS Payrolls breakdown, listing total team wages for all 27 clubs and the top 40 highest-paid players.
*   **FBref:** Does not consistently track MLS player wages.
*   **American Soccer Analysis (ASA):** The current API used for 2026 match/player data does not provide salary figures.

## 3. Required Data Structures
The dashboard requires two specific data injections into `client/public/data/mls2026.json`:

### A. Player Salaries
Each player object in the `players` array needs a `salary` field (integer, representing guaranteed compensation).
```json
{
  "id": "player_id",
  "name": "Lionel Messi",
  "salary": 20446667
}
```

### B. Team Budgets
A top-level `teamBudgets` object mapped by the 3-letter team ID (e.g., "ATL", "MIA"). Each team requires the following breakdown to power the 3D stacked bar chart:
```json
"ATL": {
  "totalSalary": 21278896,
  "playerCount": 28,
  "dpSalary": 15000000,
  "dpCount": 3,
  "tamSalary": 3000000,
  "tamCount": 4,
  "regularSalary": 3278896,
  "regularCount": 21
}
```

## 4. Implementation Strategy

### Step 1: Data Acquisition Script
Create a new Python scraper (e.g., `scripts/fetch_spotrac_salaries.py`) to pull 2026 player contracts from Spotrac's MLS team pages. 
*   If Spotrac data is incomplete, fallback to the 2025 MLSPA Fall release for returning players.
*   Use fuzzy string matching (like `thefuzz`) to map Spotrac player names to the ASA player names currently in the pipeline.

### Step 2: Budget Calculation Logic
Once player salaries are mapped, write a function to calculate the `teamBudgets` object programmatically:
*   Sum the total salaries per team.
*   Estimate DP (Designated Player) vs. TAM vs. Regular spend based on salary thresholds (e.g., players earning > $1.68M are typically DPs).
*   Count the number of players in each tier.

### Step 3: Pipeline Integration
Update `scripts/fetch_2026_season.py`:
1.  Import the salary mapping dictionary.
2.  During the player iteration loop, inject the mapped `salary` (defaulting to 0 if unknown).
3.  Generate the `teamBudgets` object and append it to the final JSON output instead of the current empty `{}` fallback.

## 5. Success Criteria
*   [ ] `fetch_2026_season.py` successfully populates `salary` fields for the majority of active 2026 players.
*   [ ] `teamBudgets` object is fully generated for all 2026 teams.
*   [ ] Running `pnpm dev` shows a fully populated Budget tab (stacked bar chart, pie chart, and top earners table) when the 2026 season is selected.
*   [ ] The transition between 2025 and 2026 seasons updates the Budget tab data seamlessly.
