# MLS Analytics Dashboard Backlog

This document serves as the prioritized backlog and work plan for the MLS Analytics Dashboard, synthesized from the March 15-17, 2026 brainstorming sessions. It is organized into Epics (Priorities) and Stories (Tasks), with effort estimates (in Manus sessions) and technical dependencies mapped out.

## Epic 1: High-Priority Bug Fixes

**Effort:** 1 Session (Completed)
**Goal:** Address small, isolated, high-annoyance UI/UX issues before adding new features.
**Files Touched:** `NeuCard.tsx`, `ChartModal.tsx`, `InsightPanel.tsx`, `Attendance.tsx`

## Epic 2: Gravitational Pull Chart Overhaul

**Effort:** 1 Session (Completed)
**Goal:** Enhance the Gravitational Pull chart with a dual perspective toggle and deeper insights.
**Files Touched:** `Attendance.tsx`, `insightEngine.ts`, `FilterContext.tsx`, `chartUtils.tsx`

## Epic 3: Attendance Tab Insight Completion

**Effort:** 1 Session (Completed)
**Goal:** Finalize insights and trend visualizations on the Attendance tab.
**Files Touched:** `Attendance.tsx`, `insightEngine.ts`

## Epic 4: Insight Engine Depth

**Effort:** 1 Session (Completed)
**Goal:** Enrich insights across Team Budget, Player Stats, and Pitch Match tabs.
**Files Touched:** `insightEngine.ts`, `PlayerStats.tsx`, `TeamBudget.tsx`, `PitchMatch.tsx`

## Epic 5: Travel Map Performance Section

**Effort:** 2 Sessions (Completed)
**Goal:** Build the comprehensive "Performance & Resilience Analysis" section under the Travel Map.
**Files Touched:** `TravelMap.tsx`, new `resilienceUtils.ts`, `insightEngine.ts`, `FilterContext.tsx`

---

## Epic 6: Polish & Feedback (Completed)

**Effort:** 1 Session
**Goal:** Address UX feedback and mathematical corrections from the Sprint 1-4 review.
**Files Touched:** `resilienceUtils.ts`, `Attendance.tsx`, `DeepDivePanel.tsx`, `insightEngine.ts`, `ChartModal.tsx`
**Dependencies:** Epics 1-5

- **Task 6.1: Squad Depth Metric Fix**
  - [x] Replace inverted HHI with Gini coefficient on top-15 players to increase variance.
- **Task 6.2: Attendance Tab UX Fixes**
  - [x] Make Away Impact/Home Response panels always visible.
  - [x] Implement global team filtering across the entire tab.
  - [x] Decrease bar chart hover effect and match Gravitational Pull deemphasis to top bar chart pottery aesthetic.
  - [x] Fix tooltip positioning to allow overflow.
  - [x] Fix ABSOLUTE toggle to cap X-axis and let Miami bleed off edge (renamed to FOCUSED/FULL SCALE).
  - [x] Fix modal header cut-off and ensure all maximize views are properly scrollable.
- **Task 6.3: Age Ridgeline Redesign**
  - [x] Replace translucent lines with opaque layered area polygons (paper-stack aesthetic).
- **Task 6.4: Insight Engine Polish**
  - [x] Ensure all new insight cards are punchy, max 2 sentences, and start with specific numbers/teams.

## Epic 6.5: Uniform Chart Container Template (Completed)

**Effort:** 1 Session
**Goal:** Create a reusable `ChartHeader` component with conversational descriptions and expandable METHODS panels, rolled out across all 10 chart cards. Establishes the "smart casual" tone pattern: visible conversational hook + collapsible methodology section with recessed neumorphic inset.
**Files Touched:** New `ChartHeader.tsx`, `Attendance.tsx`, `TeamBudget.tsx`, `PlayerStats.tsx`, `TravelScatterChart.tsx`, `DumbbellChart.tsx`, `ResilienceIndexChart.tsx`, `RadarTeamCards.tsx`
**Dependencies:** Epics 1-6
**PR:** #68 (merged)
**Issue:** #67 (closed)

- **Task 6.5.1: ChartHeader Component**
  - [x] Build reusable `ChartHeader` with title, conversational description, and expandable METHODS panel.
  - [x] Recessed neumorphic inset for METHODS — "peeking under the hood" design intent.
- **Task 6.5.2: Rollout Across All Charts**
  - [x] Integrate `ChartHeader` into all 10 chart cards across Attendance, Travel Performance, Team Budget, and Player Stats tabs.
  - [x] Write unique descriptions and methodology text for each chart.

---

## Epic 7: The Relief Scatter (Visual Overhaul)

**Effort:** 1 Session
**Goal:** Redesign the Travel Scatter chart into a monochromatic relief sculpture using SVG filters and physical depth encoding (Vaughn Horseman aesthetic).
**Files Touched:** `TravelScatterChart.tsx`
**Dependencies:** Epic 5

- **Task 7.1: Surface Texture & Geometry**
  - Implement `feTurbulence` background and monochromatic base.
  - Build simplified crater geometry with cast shadows and inward gradients.
- **Task 7.2: Data Encoding & Labels**
  - Map Rings = Squad Depth, Radius = PPG Gap.
  - Add recessed/embossed text labels inside craters.
- **Task 7.3: Color System**
  - Implement `TERRAIN`/`TEAMS` color toggle and flood animation.

## Epic 8: Pitch Match Real Data Integration

**Effort:** 2 Sessions
**Goal:** Replace dummy data on the PitchMatch tab with real StatsBomb open data.
**Files Touched:** `scripts/fetch_statsbomb_miami.py`, `PitchMatch.tsx`, `hooks/useStatsBombData.ts`
**Dependencies:** None

- **Task 8.1: Data Preparation**
  - Write Python script to fetch, parse, and save Inter Miami 2023 event data to static JSON.
- **Task 8.2: Shot Map Visualization**
  - Build frontend data loading hooks and match selector UI.
  - Implement 3D Shot Map (spheres colored by outcome mapped to Three.js coordinates).
- **Task 8.3: Passing Network (Stretch)**
  - Implement player passing network with Three.js lines/tubes.

## Epic 9: Travel Map deck.gl Spike

**Effort:** 1 Session
**Goal:** Upgrade the Travel Map to use `deck.gl` for geospatial accuracy and cinematic lighting.
**Files Touched:** `vite.config.ts`, `TravelMap.tsx`, `DeckTravelMap.tsx`
**Dependencies:** Epic 5

- **Task 9.1: Setup & Optimization**
  - Configure Vite manual chunks and lazy loading for `deck.gl` to protect bundle size.
- **Task 9.2: Geospatial Layers**
  - Implement `DeckTravelMap` with Carto basemaps and `TerrainLayer`.
  - Implement `ColumnLayer` for stadiums and `TripsLayer` for animated travel arcs.
- **Task 9.3: Lighting & Polish**
  - Apply directional lighting and bloom post-processing.

## Epic 10: Race Chart Tab

**Effort:** 1 Session
**Goal:** Add a high-impact animated horizontal bar chart race.
**Files Touched:** New `RaceChart.tsx`, `Home.tsx`
**Dependencies:** All analytical layers

- **Task 10.1: Implement Race Chart Tab**
  - Animated horizontal bar chart race synchronized to a matchweek timeline scrubber.
  - Metrics toggle: cumulative points, goals, attendance, salary spend.

## Future / Deferred Work

- **Treemap & Matrix Animation Polish:** Do not use deck.gl for these. Instead, enhance current SVG/Three.js implementations with better lighting and Framer Motion transitions.
- **Bar Chart Reorder Animation (react-spring):** Animate bars sliding horizontally to new ranked positions.
- **Multi-Team Area Chart Compare Mode:** Layered translucent 3D area polygons.
- **Cross-chart pottery linking**
- **Ultrawide layout optimization**
- **Statistical hypothesis tests UI**
- **2026 Season Data Integration**

## Notes on Data Visualization and UI

- Maximize the use of available width and height on larger displays by decreasing margins.
- Utilize Three.js/Deck.gl for actual geometry and lighting in 3D visualizations (e.g., travel maps, pitch map visuals) to achieve a genuine 3D effect.
- Default theme for UI and documentation screenshots should be Light Mode.

## Appendix: Data Sources Inventory

- **[StatsBomb Open Data](https://github.com/statsbomb/open-data)**: Free event-level data for Inter Miami 2023 matches.
- **[Squawka Comparison Matrix](https://www.squawka.com/us/comparison-matrix/)**: Reference for data definitions and player comparison methodologies.
- **[MLS Conference Standings](https://www.mlssoccer.com/standings/2026/conference)**: Home/away record splits.
- **[MLS Form Guide](https://www.mlssoccer.com/standings/2026/conference)**: Recent form visualization.
- **[MLS Supporters' Shield Standings](https://www.mlssoccer.com/standings/2026/supporters-shield)**: Single-table view of all 30 teams.
- **[MLS Player Stats](https://www.mlssoccer.com/stats/)**: Key passes and touches.
- **[MLS Club Stats](https://www.mlssoccer.com/stats/clubs/)**: General, Passing, Attacking, Defending aggregates.
- **[ESPN MLS Performance Stats](https://www.espn.com/soccer/stats/_/league/USA.1/season/2025/view/performance)**: Streak data (winning, unbeaten, losing streaks).
