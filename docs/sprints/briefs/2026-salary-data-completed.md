# Sprint Brief: 2026 Salary Data Pipeline (Completed)

## Overview
The 2026 MLS salary data pipeline has been successfully implemented and integrated into the `fetch_2026_season.py` script. The Budget tab in the dashboard now fully populates with real data, providing a comprehensive breakdown of team budgets, positional spending, and top earners.

## Implementation Details

### Data Sources
We established a robust, multi-source fallback strategy for 2026 salary data:
1. **DirecTV Insider 2026 MLS Payrolls**: Used as the primary source for team total budgets and the top 40 highest-paid players in the league (including new 2026 signings like Son Heung-min).
2. **MLSPA 2025 Fall Salary Guide**: Used as the comprehensive baseline for returning players. A custom PDF parser was built to extract all 920 players, handling complex edge cases like merged team and position strings.

### Fuzzy Name Matching
We implemented a sophisticated fuzzy matching algorithm using the `thefuzz` library to map source names to the ASA player names:
- **Exact Match**: Normalizes names (stripping accents, lowercasing) and matches exactly within the same team.
- **Fuzzy Team Match**: Uses Levenshtein distance (score >= 82) to match names within the same team.
- **Last Name Team Match**: Falls back to matching just the last name within the same team.
- **Cross-Team Fuzzy Match**: Uses a higher threshold (score >= 92) to catch players who may have transferred between the MLSPA release and the 2026 season.

**Results**: 574 out of 620 players (92.6%) were successfully matched to a salary. The 46 unmatched players are primarily new 2026 signings or academy graduates not present in the 2025 MLSPA data.

### Budget Tier Calculation
We implemented the logic to classify salaries into MLS budget tiers based on the 2026 CBA thresholds:
- **Designated Player (DP)**: Salary >= $1,683,750
- **Targeted Allocation Money (TAM)**: $683,750 <= Salary < $1,683,750
- **Regular**: Salary < $683,750

Team totals are driven by the authoritative DirecTV numbers. Any discrepancy between the matched player salaries and the team total is distributed proportionally among the unmatched players (respecting the $67,360 league minimum), ensuring the team totals remain perfectly accurate for the frontend charts.

### Pipeline Integration
The salary data logic was encapsulated in `fetch_spotrac_salaries.py`, which generates an intermediate `salary_data_2026.json`. This data is then consumed by the main `fetch_2026_season.py` script, which injects the `salary` field into each player record and populates the `teamBudgets` object at the root of `mls2026.json`.

## Dashboard Validation
The frontend Budget tab was tested and confirmed to be fully functional:
- **League-Wide Totals**: Correctly displays $392.2M total spend and $13.1M average budget.
- **Stacked Bar Chart**: All 30 teams are rendered and ordered by total salary, with accurate DP, TAM, and Regular segments.
- **Team Drill-Down**: Selecting a team (e.g., LAFC) correctly renders the positional donut chart (Forwards, Midfielders, Defenders) and populates the Top Earners table with accurate $/Goal metrics.

## Next Steps
- Monitor the MLSPA for the official Spring 2026 Salary Guide release, which will provide exact figures for the remaining 46 unmatched players.
- Consider adding a "Value Signing" metric to the Player Stats scatter plot (e.g., Goals per $1M Salary).
