# Data Sources Research Notes

## Squawka Comparison Matrix
**URL:** https://www.squawka.com/us/comparison-matrix/
**Type:** Player comparison tool with detailed stat definitions
**Coverage:** MLS, Liga MX, EPL, Champions League, World Cup 2026

### Available Metrics by Position

**Goalkeepers:** Saves Made, Save Percentage, Clean Sheets, Goals Conceded (Inside/Outside Box), Penalties Faced & Saved

**Defenders:** Clearances, Interceptions, Blocked Shots, Tackles Made, Last-man Tackles, Fouls from Tackles, Cards (Yellow/Red), Duels Won, Aerial & Ground Duel Success

**Midfielders:** Ball Recoveries, Passes Completed, Passing Accuracy %, Assists, Through Balls, Open-play Passes, Take-ons Completed, Take-on Success %, Possession Lost

**Forwards:** Goals (Penalty, Non-penalty, Home/Away), Winning Goals, Shots on Target, Shot Accuracy %, Goals from Inside/Outside Box, Offsides, Take-ons

**Value for Dashboard:** Excellent data definitions reference. Could inform tooltip text and stat glossary. Player comparison methodology could inspire our radar chart percentile work (Epic 4, Issue #11).

---

## MLS Conference Standings
**URL:** https://www.mlssoccer.com/standings/2026/conference
**Type:** Official league standings with live/official toggle
**Coverage:** 2026 season (and historical back to 1996)

### Available Columns
Rank, Club, Points, PPG, GP (Games Played), W (Wins), L (Losses), T (Draws), GF (Goals For), GA (Goals Against), GD (Goal Differential), Home Record, Away Record

### Features
- Year selector (2026 back to 1996)
- Official vs Live toggle (real-time during matches)
- Eastern and Western Conference split
- Also has sub-tabs: Conference Standings, Supporters' Shield Standings, Form Guide

**Value for Dashboard:** Home/Away record split is directly useful for Travel Map Epic 5 (home vs away PPG). Form Guide tab could feed a new "league standings" page feature. Historical year data enables multi-season analysis.

---

## MLS Supporters' Shield Standings
**URL:** https://www.mlssoccer.com/standings/2026/supporters-shield
**Type:** Overall league standings (not split by conference)
**Coverage:** Same columns as conference standings, filterable by conference or season year

**Value for Dashboard:** Single-table view of all 30 teams ranked together. Conference filter toggle aligns with existing FilterContext pattern.

---

## MLS Player Stats (Official)
**URL:** https://www.mlssoccer.com/stats/
**Type:** Official MLS player statistics database
**Coverage:** 2026 season (and historical back to 1996), Regular Season and Cup Playoffs

### Available Player Stat Categories (League Leaders)
- Goals (top scorers)
- Assists
- Key Passes
- Shots
- Shots On Target
- Touches

### Features
- Year selector (2026 back to 1996)
- Season type filter (Regular Season / Cup Playoffs)
- Links to full lists for each category
- Player photos and team affiliations

**Value for Dashboard:** Key passes and touches data are new metrics not in our current dataset. Could enrich player radar charts (Epic 4, Issue #11) and provide additional dimensions for the insight engine.

---

## MLS Club Stats (Official)
**URL:** https://www.mlssoccer.com/stats/clubs/
**Type:** Official MLS club-level statistics with 4 distinct table views
**Coverage:** 2026 season (and historical), all 30 clubs

### Four Table Views

**General:** GP, PTS, W, L, T, G, GA, GD, PKA (Penalty Kicks Attempted), PKGA (Penalty Kicks Conceded), F (Fouls), FS (Fouls Suffered), OFF (Offsides), YC (Yellow Cards), RC (Red Cards)

**Passing:** (to be documented — accessible via tab toggle)

**Attacking:** (to be documented — accessible via tab toggle)

**Defending:** (to be documented — accessible via tab toggle)

**Value for Dashboard:** Club-level aggregates are directly useful for Team Budget tab insights (Epic 4, Issue #10). Fouls, cards, and penalty data could feed new insight cards. The 4-table structure maps well to our existing tab-based UI pattern.

---

## ESPN MLS Performance Stats
**URL:** https://www.espn.com/soccer/stats/_/league/USA.1/season/2025/view/performance
**Type:** Performance summary stats from ESPN
**Coverage:** 2025 season (and other years)

### Available Categories
- Longest Winning Streak
- Longest Current Winning Streak
- Longest Unbeaten Streak
- Longest Current Unbeaten Streak
- Longest Losing Streak
- Longest Current Losing Streak

### Features
- Season selector
- Team-level and league-level views
- Includes best winning, unbeaten, and losing streaks

**Value for Dashboard:** Streak data is excellent for the insight engine — "Team X is on a Y-game unbeaten run" type narratives. Could feed into attendance correlation analysis (do streaks affect attendance?) and travel resilience analysis (do road streaks correlate with squad depth?).

---

## MLS Form Guide
**URL:** https://www.mlssoccer.com/standings/2026/conference (Form Guide tab)
**Type:** Recent form visualization for all teams
**Coverage:** 2026 season

**Value for Dashboard:** Form data (W/D/L sequence) could be added to a league standings page. Visual form indicators are a common dashboard pattern that would complement our existing data.

---

