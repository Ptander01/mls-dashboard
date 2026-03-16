# MLS Analytics Dashboard Backlog

This document serves as the prioritized backlog and work plan for the MLS Analytics Dashboard, synthesized from the March 15, 2026 brainstorming session. It is organized into Epics (Priorities) and Stories (Tasks), with effort estimates (in Manus sessions) and technical dependencies mapped out.

## Epic 1: High-Priority Bug Fixes
**Effort:** 1 Session
**Goal:** Address small, isolated, high-annoyance UI/UX issues before adding new features.
**Files Touched:** `NeuCard.tsx`, `ChartModal.tsx`, `InsightPanel.tsx`, `Attendance.tsx`

- **Task 1.1: Fix Insight Panel Pre-population Bleed**
  - **Description:** Content from insight cards bleeds outside containers before the ANALYZE button is pressed.
  - **Implementation:** Implement conditional rendering (`{isOpen && ...}`) with `AnimatePresence`. Ensure `useState(false)` default on all tabs and `overflow: hidden` on the parent `NeuCard` while closed.

- **Task 1.2: Fix Maximize Modal Chart Resize**
  - **Description:** Charts render compressed or fail to resize after the modal expand animation completes.
  - **Implementation:** Add a `ResizeObserver` or delayed re-render after the Framer Motion transition finishes in `NeuCard.tsx` / `ChartModal.tsx`.

- **Task 1.3: Fix Attendance Capacity Chart Overhang**
  - **Description:** Fill rate bars clip at the top of the chart container.
  - **Implementation:** Set y-axis domain max to `Math.ceil(maxFillRate * 1.15)` to add breathing room above the tallest bar.

- **Task 1.4: Fix Gravitational Pull X-Axis Overflow**
  - **Description:** Bar labels and axis values are clipped on the right edge.
  - **Implementation:** Adjust container margins or padding to ensure full visibility. (Related to Epic 2, but clipping fix should happen here).

## Epic 2: Gravitational Pull Chart Overhaul
**Effort:** 1 Session
**Goal:** Enhance the Gravitational Pull chart with a dual perspective toggle and deeper insights.
**Files Touched:** `Attendance.tsx`, `insightEngine.ts`, `FilterContext.tsx`, `chartUtils.tsx`
**Dependencies:** Epic 1

- **Task 2.1: Implement Dual Perspective Toggle (ABSOLUTE / COMPARE)**
  - **Description:** Toggle between true linear scale (ABSOLUTE) and capped scale (COMPARE).
  - **Implementation:** 
    - **ABSOLUTE mode:** True linear scale, Inter Miami bar intentionally bleeds past card boundary, `overflow: visible` on card container, `z-index: 10` on card, drop shadow on overflowing bar portion via SVG filter, end-of-bar label showing true value and multiple (e.g. “9.4x next highest”), only top 10 teams shown with “+ 20 more teams” hint.
    - **COMPARE mode:** All 30 teams, x-axis domain capped at `secondHighest * 1.15`, normal `overflow: hidden`.

- **Task 2.2: Update Gravitational Pull Insight Headline**
  - **Description:** Create a two-sentence generator in `insightEngine.ts`.
  - **Implementation:** Sentence 1 describes Miami’s dominance (maps to ABSOLUTE view), sentence 2 describes the mid-tier clustering (maps to COMPARE view).

- **Task 2.3: Implement Pottery Focus Interaction**
  - **Description:** Add emphasized team highlighting on the Gravitational Pull chart.
  - **Implementation:** Add `emphasizedTeam: string | null` to `FilterContext`. Use warm gray pottery values (`#c8c4bc` light / `#3a3830` dark) with slight extrusion reduction (0.6x) for deemphasized bars. Click same team to toggle off. Add “Viewing: [Team] ✕” badge in card header when active. (Do NOT wire cross-chart linking yet).

## Epic 3: Attendance Tab Insight Completion
**Effort:** 1 Session
**Goal:** Finalize insights and trend visualizations on the Attendance tab.
**Files Touched:** `Attendance.tsx`, `insightEngine.ts`
**Dependencies:** Epic 1

- **Task 3.1: Implement Attendance Trend Chart Modes**
  - **Description:** Add toggle to “Attendance Trend by Matchweek”: ALL TEAMS, LEAGUE AVG, LEAGUE TOTAL.
  - **Implementation:** 
    - **ALL TEAMS:** Small multiples grid, 30 sparklines, hover highlights one team to full opacity, others mute. (Default view).
    - **LEAGUE AVG:** Single smoothed line.
    - **LEAGUE TOTAL:** Aggregate sum per week.

- **Task 3.2: Deepen Attendance Insight Cards**
  - **Description:** Replace scaffolded cards with specific, data-driven insights.
  - **Implementation:** Target specificity: named teams, real computed numbers, surprising findings. Apply the standard of the weekend/weekday card to all four cards. Integrate the new two-sentence headline from Task 2.2.

## Epic 4: Insight Engine Depth
**Effort:** 1 Session
**Goal:** Enrich insights across Team Budget, Player Stats, and Pitch Match tabs.
**Files Touched:** `insightEngine.ts`, `PlayerStats.tsx`, `TeamBudget.tsx`, `PitchMatch.tsx`
**Dependencies:** Epic 1

- **Task 4.1: Enhance Team Budget Tab Insights**
  - **Description:** Surface deeper financial insights.
  - **Implementation:** Target DP efficiency analysis with named teams and real dollar-per-goal figures, conference spending gap, salary-to-output mismatch. Headline finding: “Which team got the worst ROI on their DP spend”.

- **Task 4.2: Update Player Stats Radar Context**
  - **Description:** Make the radar spokes encode percentile position among position peers, not raw stats.
  - **Implementation:** Update `playerRadarCardInsights` to use percentile rank. Add percentile labels on each axis spoke: “Top 8% among FWs.”

- **Task 4.3: Add Pitch Match Tab First Insight Layer**
  - **Description:** Introduce basic insights to the Pitch Match tab.
  - **Implementation:** Start with four basic cards: most shots in a single match, highest xG game, team with best shot accuracy league-wide, most lopsided possession match.

## Epic 5: Travel Map Performance Section
**Effort:** 2 Sessions
**Goal:** Build the comprehensive "Performance & Resilience Analysis" section under the Travel Map.
**Files Touched:** `TravelMap.tsx`, new `resilienceUtils.ts`, `insightEngine.ts`, `FilterContext.tsx`
**Dependencies:** Epic 1

### Session A: Data Layer & Primary Charts
- **Task 5.1: Create `resilienceUtils.ts` Data Layer**
  - **Description:** Implement calculation functions for travel and resilience metrics.
  - **Implementation:** Create `stadiumDistance(team1, team2)`, `totalAwayMiles(teamId, matches, teams)`, `squadDepthIndex(teamId, players)`, `weightedAvgAge(teamId, players)`, and `travelResilienceScore(teamId, ...)`.

- **Task 5.2: Build Chart A (Dumbbell: Home vs Away PPG)**
  - **Description:** Show the gap between home and away performance per team.
  - **Implementation:** Sort by gap magnitude, toggle PPG/WIN%/GD. Add computed insight headline above it.

- **Task 5.3: Build Chart C (Resilience Index Bar)**
  - **Description:** Full-width ranked bar chart for resilience index.
  - **Implementation:** Color tiered (green/cyan/amber/red). Include three pip indicators per bar showing score component breakdown (Away PPG, Congestion resistance, Long-haul record). Add insight headline.

### Session B: Advanced Charts & Deep Dive
- **Task 5.4: Build Chart B (Scatter: Travel Burden vs Performance Drop)**
  - **Description:** X axis = total away miles, Y axis = home/away PPG delta, bubble size = squad depth index.
  - **Implementation:** Add regression line and quadrant labels. Ensure conference filter toggle works. Add insight headline.

- **Task 5.5: Build Chart D (Radar Team Cards)**
  - **Description:** 12-card radar grid collapsed behind a “View Team Profiles →” button.
  - **Implementation:** 5-axis spider: Away PPG, Congestion Resistance, Long-haul Record, Squad Depth, Age Efficiency.

- **Task 5.6: Implement Deep Dive Collapsible Panel**
  - **Description:** Collapsed panel toggled by “DEEP DIVE — Squad Construction & Salary Analysis” button.
  - **Implementation:** Three sub-panels with staggered Framer Motion entrance:
    - **Panel 1:** Squad depth breakdown (minutes HHI horizontal bars).
    - **Panel 2:** Salary concentration vs road performance scatter.
    - **Panel 3:** Age distribution stacked bars (U23 / 23-29 / 30+).
  - **Integrate Insights:** `travelResilienceHeadline()`, `squadDepthInsights()`, `salaryRoadInsights()`.

## Epic 6: Deck.gl Correlation Matrix
**Effort:** 1 Session
**Goal:** Implement a true 3D correlation matrix using Deck.gl.
**Files Touched:** `StatsPlayground.tsx`, new `CorrelationMatrix3D.tsx`, `package.json`
**Dependencies:** None (Standalone)

- **Task 6.1: Install and Configure Deck.gl**
  - **Description:** Install `@deck.gl/react`, `@deck.gl/core`, `@deck.gl/layers`.
  - **Implementation:** Lazy load behind the Statistical Playground open state.

- **Task 6.2: Build 3D Correlation Matrix**
  - **Description:** Replace current SVG pseudo-3D cells with `ColumnLayer` + `OrthographicView`.
  - **Implementation:** Config: `diskResolution: 4` for square prisms, `material` prop for PBR lighting, `transitions: { getElevation: 600 }` for animated height changes, `pickable: true` with `onClick` wiring to scatter plot axes. Use reference lighting screenshot.

## Epic 7: Race Chart Tab
**Effort:** 1 Session
**Goal:** Add a high-impact animated horizontal bar chart race.
**Files Touched:** New `RaceChart.tsx`, `Home.tsx`
**Dependencies:** All analytical layers (Epics 1-5)

- **Task 7.1: Implement Race Chart Tab**
  - **Description:** Animated horizontal bar chart race synchronized to a matchweek timeline scrubber.
  - **Implementation:** Play button auto-advances. Toggle East/West/All. Bars use team colors with 3D extruded treatment reusing `Extruded3DHorizontalBar`. Framer Motion layout prop handles smooth reordering. Metrics toggle: cumulative points, goals, attendance, salary spend.

## Future / Deferred Work
- **Bar Chart Reorder Animation (react-spring):** When toggling between Absolute and Fill Rate modes, animate bars sliding horizontally to their new ranked positions using `@react-spring/web` (already installed). Reference implementation: [react-graph-gallery barplot-data-transition-animation](https://www.react-graph-gallery.com/example/barplot-data-transition-animation). Approach: render bars in stable DOM order, compute target X positions from rank, use `useSpring` to animate `x` and `height`. Requires replacing Recharts `<Bar>` with a `<Customized>` SVG overlay rendering `Extruded3DBarWithCeiling` / `Extruded3DBarFillRate` shapes manually.
- **Multi-Team Area Chart Compare Mode (Mode 3):** Enable selecting 2-5 teams in the attendance trend chart to show layered translucent 3D area polygons stacked with slight depth offsets (paper-cutout aesthetic). UI: "COMPARE" button enables multi-select from dropdown or by clicking multiple bars. For 6+ teams, switch to 3D ridgelines only (topographic landscape). Architecture is already in place with `Area3DPolygon` component supporting `layerOffset` and `opacity` props.
- Cross-chart pottery linking (validate single-chart pottery first in Priority 2)
- Ultrawide layout optimization
- 3D radar chart (Three.js powered)
- Statistical hypothesis tests UI (t-test, ANOVA displays)
- Mobile tab label truncation fix
- 2026 Season Data Integration
- Enhanced Data Sources Integration (FBref, Sofascore, StatsBomb) for heatmaps, pass maps, and advanced event-level data.

## Notes on Data Visualization and UI
- Maximize the use of available width and height on larger displays by decreasing margins.
- Utilize Three.js/Deck.gl for actual geometry and lighting in 3D visualizations (e.g., travel maps, correlation matrix) to achieve a genuine 3D effect.
- Default theme for UI and documentation screenshots should be Light Mode.

## Appendix: Future Data Sources Inventory
The following resources have been cataloged for future data integration efforts (Epic 8+):

- **[Squawka Comparison Matrix](https://www.squawka.com/us/comparison-matrix/)**: Excellent reference for data definitions and player comparison methodologies. Could inform tooltip text, stat glossary, and radar chart percentile calculations.
- **[MLS Conference Standings](https://www.mlssoccer.com/standings/2026/conference)**: Official standings including home/away record splits, which are directly useful for the Travel Map performance section (home vs away PPG).
- **[MLS Form Guide](https://www.mlssoccer.com/standings/2026/conference)**: Recent form visualization (W/D/L sequence) that could be added to a future league standings page.
- **[MLS Supporters' Shield Standings](https://www.mlssoccer.com/standings/2026/supporters-shield)**: Single-table view of all 30 teams ranked together, filterable by conference.
- **[MLS Player Stats](https://www.mlssoccer.com/stats/)**: Database including new metrics like key passes and touches to enrich player radar charts.
- **[MLS Club Stats](https://www.mlssoccer.com/stats/clubs/)**: Four distinct table views (General, Passing, Attacking, Defending). Club-level aggregates are useful for Team Budget insights.
- **[ESPN MLS Performance Stats](https://www.espn.com/soccer/stats/_/league/USA.1/season/2025/view/performance)**: Streak data (winning, unbeaten, losing streaks) that is excellent for the insight engine to generate narrative summaries.
