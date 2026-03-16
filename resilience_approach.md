# Technical Approach: `resilienceUtils.ts` Data Layer

The `resilienceUtils.ts` file will provide the foundational data calculations required for the Performance & Resilience Analysis section of the Travel Map. It will compute travel burden, performance gaps, and squad depth metrics to form a composite Travel Resilience Score.

## 1. Core Interfaces
```typescript
export interface TeamResilienceMetrics {
  teamId: string;
  teamName: string;
  // Travel Burden
  totalAwayMiles: number;
  longestTripMiles: number;
  timeZonesCrossed: number; // Simplified estimate based on lng differences
  // Performance
  homePPG: number;
  awayPPG: number;
  ppgGap: number; // homePPG - awayPPG
  homeWinPct: number;
  awayWinPct: number;
  homeGD: number;
  awayGD: number;
  // Squad Metrics
  squadDepthIndex: number;
  weightedAvgAge: number;
  // Composite Score
  resilienceScore: number;
  resilienceTier: 'green' | 'cyan' | 'amber' | 'red';
  // Score Components (0-100)
  scoreComponents: {
    awayPerformance: number; // Based on away PPG relative to league
    congestionResistance: number; // Based on squad depth
    longHaulRecord: number; // Based on performance in games > 1000 miles away
  };
}
```

## 2. Calculation Functions

### A. Travel Metrics
- `totalAwayMiles(teamId: string, matches: Match[], teams: Team[]): number`
  - Iterate through all away matches for the team.
  - Find the home team's stadium coordinates.
  - Use the existing `calculateDistance(lat1, lng1, lat2, lng2)` from `mlsData.ts`.
  - Sum the distances.

### B. Performance Metrics
- `calculatePPG(teamId: string, matches: Match[], isHome: boolean)`
  - Filter matches where the team is home/away.
  - Calculate points: 3 for win, 1 for draw, 0 for loss.
  - Divide by number of matches.
- Compute Win % and Goal Difference (GD) similarly for the dumbbell chart toggles.

### C. Squad Depth Index
- `squadDepthIndex(teamId: string, players: Player[]): number`
  - A measure of how evenly minutes are distributed.
  - We can use a modified Herfindahl-Hirschman Index (HHI) of player minutes.
  - Lower HHI = better depth (minutes spread across more players).
  - Normalize to a 0-100 scale where 100 is excellent depth.

### D. Weighted Average Age
- `weightedAvgAge(teamId: string, players: Player[]): number`
  - Calculate average age weighted by minutes played.
  - `sum(player.age * player.minutes) / sum(player.minutes)`

### E. Travel Resilience Score (Composite)
- `travelResilienceScore(metrics: PartialMetrics): TeamResilienceMetrics`
  - **Away Performance (33%)**: Normalize away PPG (e.g., 0 to 2.0 mapped to 0-100).
  - **Congestion Resistance (33%)**: Directly use the normalized Squad Depth Index.
  - **Long-Haul Record (33%)**: Calculate PPG specifically for away games > 1000 miles away, normalized.
  - Combine into a final `resilienceScore` (0-100).
  - Assign tiers based on score:
    - > 75: 'green' (Excellent)
    - 60-75: 'cyan' (Good)
    - 45-59: 'amber' (Vulnerable)
    - < 45: 'red' (Fragile)

## 3. Integration with Existing Data
- Import `TEAMS`, `MATCHES`, `PLAYERS`, and `calculateDistance` from `@/lib/mlsData`.
- Export a main hook or function `useResilienceData(filteredTeams, filteredMatches, filteredPlayers)` to be used in `TravelMap.tsx`.

## Next Steps
1. Implement these functions in `client/src/lib/resilienceUtils.ts`.
2. Build the Dumbbell Chart (Chart A) using the calculated PPG gap.
3. Build the Resilience Index Bar Chart (Chart C) using the composite score and tiers.
