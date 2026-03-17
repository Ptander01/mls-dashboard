# Design Brief: Team Ranking & Power Index Tab

## Objective
Create a dedicated "Power Rankings" tab that visualizes team strength, form, and statistical rankings in a highly engaging, interactive format. This tab will serve as the definitive "who is the best right now" view, moving beyond simple points-based standings to incorporate underlying performance metrics.

## Inspiration & Aesthetic
- **FiveThirtyEight SPI (Soccer Power Index):** Clean, tabular ranking with clear indicators for offensive/defensive ratings and trend arrows.
- **Bump Charts (Rank over Time):** Flowing, interwoven lines showing how team positions change week-by-week.
- **The Neumorphic Dashboard Style:** Continue using the established `NeuCard` components, ensuring the rankings feel like physical objects rather than flat web tables.

## Key Components

### 1. The Composite Power Index Table
A central, highly sortable table that ranks all 30 MLS teams based on a custom composite score (incorporating PPG, xG differential, recent form, and travel resilience).
- **Visuals:** Use small inline sparklines for recent form (last 5 matches).
- **Trend Indicators:** Up/down arrows with positional change numbers (e.g., "↑ 3", "↓ 1") compared to the previous matchweek.
- **Interaction:** Clicking a team row expands a drawer or side panel with a quick radar chart comparing them to the league average.

### 2. The Interactive Bump Chart (Rank Evolution)
A large, full-width visualization showing the evolution of team rankings over the season.
- **Structure:** X-axis is Matchweek, Y-axis is Rank (1-30, inverted so 1 is at the top).
- **Visuals:** Thick, smooth, translucent SVG paths (`CatmullRom` curves) representing each team.
- **Interaction:** Hovering over a line brings that team to full opacity and mutes the rest. Clicking locks the highlight.
- **Implementation Note:** This is best achieved using `recharts` or custom SVG with `framer-motion` for the line drawing animation.

### 3. Tier Groupings (The "Bucket" View)
Instead of just a linear 1-30 list, visually group teams into distinct tiers (e.g., "Title Contenders," "Playoff Locks," "Bubble Teams," "Rebuilding").
- **Visuals:** Render these as distinct physical `NeuCard` containers.
- **Insight Engine:** Automatically assign teams to tiers based on statistical clustering (k-means or standard deviation breaks) rather than arbitrary cutoffs.

## Technical Implementation Notes
- **Data Source:** This will rely heavily on the existing `teamStats` and the new `resilienceUtils.ts` calculations.
- **State Management:** Needs a matchweek scrubber to allow users to "go back in time" and see the rankings as they stood in Week 10, Week 20, etc.
- **Bundle Impact:** High reliance on existing SVG/Recharts infrastructure; minimal new dependencies required.
