# Sprint Brief: 2026 Season Data Integration

**Epic:** 12 (New)
**Goal:** Integrate live 2026 MLS season data (Matchday 1-5+) into the dashboard, enabling users to toggle between the full 2025 season and the ongoing 2026 season. Surface emerging storylines (LAFC's shutout record, Philly's collapse, Vancouver's surge) via the Insight Engine.
**Primary Data Source:** American Soccer Analysis (ASA) API via the `itscalledsoccer` Python package.

---

## The Challenge: Multi-Season Architecture

The dashboard currently hardcodes `SEASON_YEAR = 2025` and imports a single 28,400-line static `mlsData.ts` file. Integrating 2026 requires making the app **season-aware**.

Because we are mid-season, the 2026 data is incomplete (only 4-5 matchweeks played out of 34). The charts and computation engines (`seasonPulse.ts`) must gracefully handle truncated data arrays without breaking or showing 29 weeks of zeros.

Furthermore, we are switching data providers from FBRef (2025) to ASA (2026) because ASA provides a free, unblocked Python API that includes advanced Expected Goals (xG) metrics.

## Phase 1: Data Pipeline (Python)

**Task:** Write a data fetching script (`scripts/fetch_2026_season.py`) that pulls live data from the ASA API and outputs `client/public/data/mls2026.json`.

1. **Install dependency:** `pip install itscalledsoccer rapidfuzz`
2. **Fetch Games:** `client.get_game_xgoals(leagues="mls", season_name="2026")`
3. **Fetch Players:** `client.get_player_xgoals(leagues="mls", season_name="2026")`
4. **Map Team IDs:** The ASA API uses internal hashes (e.g., `jYQJ19EqGR` for Nashville). You must map these to the dashboard's existing 3-letter IDs.
   * *Note: ASA's `team_abbreviation` field matches our IDs for 26/30 teams. The 4 exceptions to manually map are: DCU → DC, FCD → DAL, NER → NE, SJE → SJ.*
5. **Infer Matchweeks:** ASA game data includes dates but not matchweek numbers. Group games by date proximity (e.g., Feb 21-23 = Week 1, Feb 28-Mar 2 = Week 2) to assign week numbers required by the `seasonPulse.ts` engine.
6. **Output Format:** Generate a JSON file that exactly matches the structure of the existing `MATCHES` and `PLAYERS` arrays in `mlsData.ts`.
   * *Fallback:* Since 2026 salary data is not yet published by the MLSPA, carry over the 2025 `TEAM_BUDGETS` and player salaries as placeholders, or set them to 0.

## Phase 2: Context & State Management

**Task:** Update `FilterContext.tsx` to handle season switching.

1. **Add State:** Add `selectedSeason: 2025 | 2026` to the `Filters` interface (default to 2026).
2. **Global Toggle:** Add a segmented control or dropdown to the global filter sidebar allowing the user to switch between 2025 and 2026.
3. **Dynamic Data Loading:** Modify `FilterContext` to serve either the static 2025 data or the fetched 2026 data based on the selected season.
4. **Update `seasonPulse.ts`:** Modify the engine to accept the active season's match list rather than hardcoding the import from `mlsData.ts`. Ensure it handles a `TOTAL_WEEKS` value that dynamically matches the maximum week found in the data (e.g., 5 for 2026, 33 for 2025).

## Phase 3: The Insight Engine (The Payoff)

**Task:** Update `insightEngine.ts` to recognize and comment on the defining storylines of the early 2026 season.

The true value of this sprint is getting the dashboard to "talk" about what's happening right now. Ensure the insight generation logic can surface these specific 2026 realities:

*   **The LAFC Wall:** LAFC has 5 clean sheets in 5 games (0 GA). The engine should flag this as a historic defensive start.
*   **The Philly Collapse:** Philadelphia Union (2025 Shield winners) have 0 points through 5 games. The engine should detect this as a catastrophic title defense hangover.
*   **The Vancouver Surge:** Vancouver has 14 goals in 5 games (+12 GD).
*   **The Sam Surridge Golden Boot Race:** Surridge has 7 goals in 5 games for Nashville.

## Acceptance Criteria

- [ ] Global sidebar contains a 2025 / 2026 season toggle.
- [ ] Toggling to 2026 updates the Season Pulse table to show the current standings (Nashville, LAFC, Vancouver at the top; Philly at the bottom).
- [ ] The Bump Chart correctly renders only the completed matchweeks for 2026, without crashing on future empty weeks.
- [ ] Insight cards on the Season Pulse and Player Stats tabs dynamically update to reference 2026 storylines when 2026 is selected.
- [ ] No regressions when toggling back to 2025 (the full 33-week historical view must remain intact).
