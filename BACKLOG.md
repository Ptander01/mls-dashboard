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

## Epic 6.6: Dumbbell Chart Polish (Completed)

**Effort:** 1 Session
**Goal:** Polish the Dumbbell Chart across sizing, visual contrast, and interpretation text. Tighten dimensions to match adjacent Travel tab cards, fix grooved track shadow direction to read as recessed, deepen toggle contrast, and add dynamic metric context paragraphs with sort-order indicator.
**Files Touched:** `DumbbellChart.tsx`
**Dependencies:** Epic 6.5
**PR:** #73 (merged)
**Issues:** #64 (closed), #65 (closed), #66 (closed)

- **Task 6.6.1: Sizing Consistency (#64)**
  - [x] Reduce row height (38→28), knob radius (10→7.5), track height (7→5), margins, and font sizes.
  - [x] Chart now proportional to Scatter, Resilience Index, and Radar cards on Travel tab.
- **Task 6.6.2: Visual Contrast & Neumorphic Depth (#65)**
  - [x] Stronger active/inactive toggle styling with deeper neumorphic shadows.
  - [x] Light-mode fill bar darkened for visibility.
  - [x] Grooved track SVG filter shadow directions inverted — reads as recessed channel.
  - [x] Deepened knob cast shadows for stronger 3D lifted look.
  - [x] Widened home/away lightness split in team color mode for mobile readability.
- **Task 6.6.3: Interpretation Text & Metric Explanations (#66)**
  - [x] Enhanced ChartHeader description with expected-pattern and outlier-spotting guidance.
  - [x] Dynamic metric context paragraph that updates per PPG/WIN%/GD toggle.
  - [x] Sort-order indicator label ("Sorted by gap magnitude").

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
**Files Touched:** `scripts/fetch_miami_network.py`, `PitchMatch.tsx`, `PassingNetwork3D.tsx`, `GlassNode.tsx`, `NeonTube.tsx`
**Dependencies:** None

- **Task 8.1: Data Preparation**
  - [x] Python script (`scripts/fetch_miami_network.py`) fetches, parses, and computes centrality metrics for Inter Miami 2023 event data. Outputs `miami_network.json`.
- **Task 8.2: Shot Map Visualization**
  - [ ] Build frontend data loading hooks and match selector UI.
  - [ ] Implement 3D Shot Map (spheres colored by outcome mapped to Three.js coordinates).
- **Task 8.3: Cinematic 3D Passing Network — COMPLETE (Commits `24bb251`, `8791e89`; Issue #41 closed)**
  - [x] `PassingNetwork3D.tsx` (1,003 lines): Three.js scene with stadium floodlights, atmospheric haze, exponential fog, Bloom post-processing.
  - [x] `GlassNode.tsx` (231 lines): MeshPhysicalMaterial glass spheres with radial glow halos, sized by combined Degree (60%) + Betweenness (40%) centrality.
  - [x] `NeonTube.tsx` (101 lines): Position-colored neon tube conduits (DF=pink, MF=purple, AM=cyan, FW=gold) with thickness scaled by pass frequency.
  - [x] ChartHeader with insight-driven description and expandable METHODS panel (C_D, C_B formulas, network density).
  - [x] Deemphasis interaction pattern (hover/click to isolate passing lanes).
  - [x] On-canvas glassmorphism NETWORK METRICS card.
  - [x] Maximize modal with full-viewport 3D scene, lazy-loaded with Suspense fallback.

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

## Epic 11: Season Pulse Tab (Merged from former Epics 11+12)

**Effort:** 3 Sessions
**Goal:** Build a unified "Season Pulse" tab combining power rankings, a bump chart (rank flow visualization), and a narrative season timeline. Three layers of the same question — "How has the season unfolded?" — at macro, meso, and micro zoom levels. Consolidates former Power Rankings (#45-47) and Season Timeline (#48-50) issues.
**Sprint Brief:** `docs/sprint-briefs/season-pulse-brief.md`
**Dependencies:** Epics 1-6

- **Session 1: Data Engine + Snapshot Table (#74) — COMPLETE (PR #77)**
  - [x] Weekly standings engine computing cumulative records at each matchweek (1-33)
  - [x] Composite Power Score: Points (35%) + Form (25%) + GD (20%) + H/A Consistency (10%) + Momentum (10%)
  - [x] Auto-detect inflection events (streaks, collapses, surges, upsets, milestones)
  - [x] Snapshot table: 30 teams ranked by power score, with week selector, conference filter, rank-by toggle
  - [x] Tier groupings (Title Contenders / Playoff / Bubble / Rebuilding) via quartile breaks
- **Session 2: Bump Chart (#75) — COMPLETE (PR #78)**
  - [x] Custom SVG bump chart: 30 curved lines across 33 matchweeks
  - [x] Deemphasis interaction: hover highlights one line, click locks + triggers timeline
  - [x] Week window range slider with presets (Full Season / First Half / Second Half / Last 10)
  - [x] Play button: animate rankings unfolding week by week
  - [x] Inflection markers on selected team's line
- **Session 3: Narrative Timeline + Polish (#76)**
  - [ ] Horizontal timeline aligned with bump chart x-axis, triggered by team selection
  - [ ] Event nodes sized by severity, colored by type, with expandable narrative cards
  - [ ] Narrative text generation via `insightEngine.ts`
  - [ ] Sticky context panel (team crest, sparkline, key stats)
  - [ ] Bidirectional selection state across all three layers

**Superseded Issues (closed):** #45, #46, #47, #48, #49, #50

## Epic 12: 2026 Season Data Integration (Completed)

**Effort:** 1 Session
**Goal:** Integrate live 2026 MLS season data from the American Soccer Analysis (ASA) API, enabling a global season toggle (2025/2026) and surfacing early-season storylines via the Insight Engine.
**Sprint Brief:** `docs/sprint-briefs/2026-data-integration.md`
**Verification:** `docs/verification/2026-integration-verification.md`
**Commit:** `77416fe`
**Issue:** #26 (closed)
**Data Source:** `itscalledsoccer` Python client → ASA public API (no auth required)

- **Task 12.1: Data Pipeline**
  - [x] `scripts/fetch_2026_season.py` — fetches game xGoals, player xGoals, team standings from ASA API.
  - [x] Maps ASA team IDs to dashboard abbreviations (4 manual overrides: DCU→DC, FCD→DAL, NER→NE, SJE→SJ).
  - [x] Infers matchweek numbers from date groupings.
  - [x] Outputs `client/public/data/mls2026.json` (69 matches, 614 players, 5 matchweeks).
  - [x] NaN sanitizer prevents invalid JSON output.
- **Task 12.2: Season-Aware Architecture**
  - [x] `seasonDataLoader.ts` — lazy-loads 2026 JSON with singleton cache pattern.
  - [x] `FilterContext.tsx` — `selectedSeason` state, `activeSeasonData` resolver.
  - [x] `seasonPulse.ts` — refactored from module-level cache to function-parameter pattern.
  - [x] `BumpChart.tsx` — dynamic `WEEK_PRESETS` based on active season's total weeks.
- **Task 12.3: Season Toggle UI**
  - [x] 2025 / 2026 LIVE segmented control in `FilterPanel.tsx` sidebar.
  - [x] Dynamic season badge in `Home.tsx` ("2026 SEASON LIVE" with green indicator).
  - [x] Dynamic match/player counts update on toggle.
- **Task 12.4: 2026 Insight Engine**
  - [x] `insightEngine.ts` — `seasonPulseInsights()` with 4 storyline detectors:
    - "The LAFC Wall: 5 games, 0 goals conceded"
    - "Philly Collapse: 0 points through 5 games"
    - "Vancouver Surge: 14 goals in 5 games (2.8/game)"
    - "Golden Boot Race: Sam Surridge leads with 7 goals in 4 games"

---

## Future / Deferred Work

- **Treemap & Matrix Animation Polish:** Do not use deck.gl for these. Instead, enhance current SVG/Three.js implementations with better lighting and Framer Motion transitions.
- **Bar Chart Reorder Animation (react-spring):** Animate bars sliding horizontally to new ranked positions.
- **Multi-Team Area Chart Compare Mode:** Layered translucent 3D area polygons.
- **Cross-chart pottery linking**
- **Ultrawide layout optimization**
- **Statistical hypothesis tests UI**

## Notes on Data Visualization and UI

- Maximize the use of available width and height on larger displays by decreasing margins.
- Utilize Three.js/Deck.gl for actual geometry and lighting in 3D visualizations (e.g., travel maps, pitch map visuals) to achieve a genuine 3D effect.
- Default theme for UI and documentation screenshots should be Light Mode.

## Appendix: Data Sources Inventory

- **[American Soccer Analysis API](https://app.americansocceranalysis.com/api/v1/__docs__/)**: 2026 season data via `itscalledsoccer` Python client. Game xGoals, player xGoals, team standings, xPass, goals added. No auth required.
- **[StatsBomb Open Data](https://github.com/statsbomb/open-data)**: Free event-level data for Inter Miami 2023 matches.
- **[Squawka Comparison Matrix](https://www.squawka.com/us/comparison-matrix/)**: Reference for data definitions and player comparison methodologies.
- **[MLS Conference Standings](https://www.mlssoccer.com/standings/2026/conference)**: Home/away record splits.
- **[MLS Form Guide](https://www.mlssoccer.com/standings/2026/conference)**: Recent form visualization.
- **[MLS Supporters' Shield Standings](https://www.mlssoccer.com/standings/2026/supporters-shield)**: Single-table view of all 30 teams.
- **[MLS Player Stats](https://www.mlssoccer.com/stats/)**: Key passes and touches.
- **[MLS Club Stats](https://www.mlssoccer.com/stats/clubs/)**: General, Passing, Attacking, Defending aggregates.
- **[ESPN MLS Performance Stats](https://www.espn.com/soccer/stats/_/league/USA.1/season/2025/view/performance)**: Streak data (winning, unbeaten, losing streaks).
