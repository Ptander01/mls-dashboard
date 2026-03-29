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

## Epic 7: The Relief Scatter (Visual Overhaul) — COMPLETE

**Effort:** 1 Session
**Goal:** Redesign the Travel Scatter chart into a monochromatic relief sculpture using SVG filters and physical depth encoding (Vaughn Horseman aesthetic).
**Files Touched:** `TravelScatterChart.tsx`
**Dependencies:** Epic 5
**Issues:** #36, #37, #38, #61, #62, #63 (all closed)

- **Task 7.1: Surface Texture & Geometry**
  - [x] Implement `feTurbulence` background and monochromatic base.
  - [x] Build simplified crater geometry with cast shadows and inward gradients using `@react-three/fiber`.
- **Task 7.2: Data Encoding & Labels**
  - [x] Map Rings = Squad Depth, Radius = PPG Gap.
  - [x] Add recessed/embossed 3D text labels inside craters.
- **Task 7.3: Color System**
  - [x] Implement `TERRAIN`/`TEAMS` color toggle and flood animation.

## Epic 8: Pitch Match Real Data Integration

**Effort:** 2 Sessions
**Goal:** Replace dummy data on the PitchMatch tab with real StatsBomb open data.
**Files Touched:** `scripts/fetch_miami_network.py`, `PitchMatch.tsx`, `PassingNetwork3D.tsx`, `GlassNode.tsx`, `NeonTube.tsx`
**Dependencies:** None

- **Task 8.1: Data Preparation**
  - [x] Python script (`scripts/fetch_miami_network.py`) fetches, parses, and computes centrality metrics for Inter Miami 2023 event data. Outputs `miami_network.json`.
- **Task 8.2: Shot Map Visualization (Ready for Handoff)**
  - [ ] Build frontend data loading hooks and match selector UI.
  - [ ] Implement 3D Shot Map (spheres colored by outcome mapped to Three.js coordinates).
  - *Sprint Brief:* `docs/sprints/briefs/shot-map-brief.md`
- **Task 8.3: Cinematic 3D Passing Network — COMPLETE (Commits `24bb251`, `8791e89`; Issue #41 closed)**
  - [x] `PassingNetwork3D.tsx` (1,003 lines): Three.js scene with stadium floodlights, atmospheric haze, exponential fog, Bloom post-processing.
  - [x] `GlassNode.tsx` (231 lines): MeshPhysicalMaterial glass spheres with radial glow halos, sized by combined Degree (60%) + Betweenness (40%) centrality.
  - [x] `NeonTube.tsx` (101 lines): Position-colored neon tube conduits (DF=pink, MF=purple, AM=cyan, FW=gold) with thickness scaled by pass frequency.
  - [x] ChartHeader with insight-driven description and expandable METHODS panel (C_D, C_B formulas, network density).
  - [x] Deemphasis interaction pattern (hover/click to isolate passing lanes).
  - [x] On-canvas glassmorphism NETWORK METRICS card.
  - [x] Maximize modal with full-viewport 3D scene, lazy-loaded with Suspense fallback.

## Epic 9: Travel Map Overhaul (Deferred — Awaiting Visual Direction)

**Effort:** 1-2 Sessions
**Goal:** Upgrade the Travel Map with 3D terrain, animated arcs, and cinematic lighting.
**Files Touched:** `vite.config.ts`, `TravelMap.tsx`, new map component TBD
**Dependencies:** Epic 5
**Decision (Mar 25, 2026):** deck.gl rejected due to bundle size concerns (~400-500KB gzipped).
**Research Sprint (Mar 26, 2026):** Completed technical evaluation. **Pure Three.js recommended** over MapLibre GL — provides full control over cinematic lighting, shadows, and depth-of-field with zero additional bundle size (Three.js already loaded). Three conceptual directions proposed (Narrative Journey, Physical Network, Battleground). Proof-of-concept `sandbox.html` built demonstrating displacement-map terrain, warm lighting, and animated arcs.
**Research Docs:** `docs/research/travel-map/`, `docs/sprints/briefs/travel-map-research-brief.md`
**Status:** Awaiting user decision on conceptual direction before implementation.

- **Task 9.1:** TBD — awaiting visual direction decision
- **Task 9.2:** TBD
- **Task 9.3:** TBD

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
**Sprint Brief:** `docs/sprints/briefs/season-pulse-brief.md`
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
- **Session 3: Narrative Timeline + Polish (#76) — COMPLETE**
  - [x] Horizontal timeline aligned with bump chart x-axis, triggered by team selection
  - [x] Event nodes sized by severity, colored by type, with expandable narrative cards
  - [x] Narrative text generation via `insightEngine.ts` (4 AI-generated season storylines)
  - [x] Sticky context panel (team crest, sparkline, key stats)
  - [x] Bidirectional selection state across all three layers
  - [x] 3D tube effects on bump chart, glassmorphic tooltips, persistent team labels

**Superseded Issues (closed):** #45, #46, #47, #48, #49, #50

## Epic 12: 2026 Season Data Integration (Completed)

**Effort:** 1 Session
**Goal:** Integrate live 2026 MLS season data from the American Soccer Analysis (ASA) API, enabling a global season toggle (2025/2026) and surfacing early-season storylines via the Insight Engine.
**Sprint Brief:** `docs/sprints/briefs/2026-data-integration.md`
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

## Epic 13: Chart Control Design System Standardization

**Effort:** 1-2 Sessions
**Goal:** Standardize all chart header controls across the dashboard into a predictable three-zone architecture (Data/View Controls | Analytical Actions | Utility Actions), replacing 4+ bespoke segmented control implementations with unified `SegmentedControl` and `ToggleAction` primitives.
**Spec:** `docs/design-system/chart-control-spec.md`
**Sprint Brief:** `docs/sprints/briefs/design-system-sprint-brief.md`
**Dependencies:** Epics 6.5, 11, 12

- **Task 13.0: Wireframe Exploration** ✅ Session 1 (Mar 24, 2026)
  - [x] Built wireframe sandbox (`components/sandbox/ChartControlWireframe.tsx`) with Options A-D.
  - [x] User approved **Option D** — distributed three-zone layout: Row 1 (Title + Z2/Z3 top-right), Row 2 (Description full-width), Row 3 (Z1 toolbar full-width).
- **Task 13.1: Extract Shared Primitives** ✅ Session 1
  - [x] Created `client/src/components/ui/ChartControls.tsx` with `IconAction`, `SegmentedControl`, `ToggleAction`, `ZoneSeparator`.
  - [x] Standardized lucide-react iconography: Filter, Palette, Layers, Eye, Lightbulb (amber), FlaskConical, Maximize2.
  - [x] All icon buttons wrapped in Radix Tooltip with descriptive labels.
- **Task 13.2: Enforce Three-Zone Ordering** ✅ Session 1
  - [x] Refactored `ChartHeader.tsx` to accept `zone1Toolbar`, `zone2Analysis`, `zone3Utility` props.
  - [x] `rightAction` kept as deprecated fallback; zero consumer usages remain.
- **Task 13.3: Replace Bespoke Controls** ✅ Session 1 — 100% migration coverage
  - [x] `Attendance.tsx` — all 5 charts migrated (Home Attendance, Weekly Trend, Gravitational Pull, Away Impact, Home Response).
  - [x] `DumbbellChart.tsx` — Zone 1: SegmentedControl for Symbology + Metric.
  - [x] `ResilienceIndexChart.tsx` — Zone 1: SegmentedControl for ColorMode + ViewMode.
  - [x] `TravelScatterChart.tsx` — Zone 1: SegmentedControl for Conference + ToggleAction for Color.
  - [x] `BumpChart.tsx` — Zone 1: IconAction for view mode cycling.
  - [x] `SeasonPulse.tsx` — Replaced inline ToggleGroup with shared SegmentedControl.
  - [x] `PlayerStats.tsx`, `PitchMatch.tsx`, `TeamBudget.tsx` — all migrated.
- **Task 13.4: Add Missing Affordances** ✅ Session 1
  - [x] `CardInsightToggle` now uses `IconAction` internally with Lightbulb icon and amber active state.
  - [x] `MaximizeButton` now uses `IconAction` internally with Maximize2 icon.
- **Task 13.5: Audit & Verify** ✅ Session 1
  - [x] Clean build: zero TypeScript errors, zero warnings beyond chunk size advisories.
  - [x] `rightAction` grep: 0 matches outside `ChartHeader.tsx`.

## Epic 14: 2026 Data Pipeline Polish

**Effort:** 1 Session
**Goal:** Fill the zeros in the 2026 player dataset by scraping Fox Sports for basic counting stats (cards, tackles, interceptions, fouls, offsides) and merging them into the existing ASA pipeline.
**Sprint Brief:** `docs/sprints/briefs/data-pipeline-polish.md`
**Dependencies:** Epic 12 (2026 data integration)

- **Task 14.1: Fox Sports Scraper** ✅ Session 1 (Mar 24, 2026)
  - [x] Create `scripts/scrape_fox_stats.py` to scrape Fox Sports Standard page (YC, RC, OFF) and Discipline page (TKL, INT, FC, FS). — 622 players scraped.
  - [x] Handle pagination (25 rows/page) and name parsing using `<sup>` tag extraction with regex fallback.
  - [x] Output intermediate JSON: `scripts/temp_fox_stats.json` (added to `.gitignore`).
- **Task 14.2: Merge into ASA Pipeline** ✅ Session 1
  - [x] Update `scripts/fetch_2026_season.py` with accent-normalized exact match + last-name fallback with team filter. 97.1% match rate (602/620 ASA players).
- **Task 14.3: Pipeline Wrapper** ✅ Session 1
  - [x] Create `scripts/update_data.sh` to run both scripts in sequence.
- **Task 14.4: Verification** ✅ Session 1
  - [x] `mls2026.json` updated: yellowCards (0→199), redCards (0→13), fouls (0→90), fouled (0→87), tackles (0→354), interceptions (0→273), offsides (0→106).
  - [x] Remaining gaps: `crosses` (no Fox Sports source), `salary` (MLSPA guide pending).

## Epic 15: AI-Powered Holistic Team Commentary — COMPLETE

**Effort:** 1 Session
**Goal:** Replace the rule-based algorithmic summary card in the Season Pulse narrative timeline with a rich, AI-generated holistic commentary. By feeding an LLM the team's complete trajectory data, match results, roster information, and salary context, generate compelling, context-aware storylines.
**Sprint Brief:** `docs/sprints/briefs/ai-holistic-commentary-brief.md`
**Dependencies:** Epic 11 (Season Pulse), Epic 12 (2026 data integration)
**Commits:** `5110af2`, `c95fd69`, `daf1e18`

- **Task 15.1: Data Aggregation Engine** ✅
  - [x] Create `client/src/lib/aiNarrativeEngine.ts` with `buildTeamContextPrompt(teamId, seasonYear)` to compile standings trajectory, match results, player stats, and salary data into an optimized prompt payload.
  - [x] Implement `generateHolisticCommentary(teamId)` calling OpenAI API (`gpt-4.1-mini`) with expert MLS analyst system prompt.
- **Task 15.2: Prompt Engineering** ✅
  - [x] Design system prompt enforcing analytical, journalistic tone (2-3 short paragraphs).
  - [x] Include directives to focus on *why* things happened, mention high-salary underperformers/carriers, and note managerial changes.
- **Task 15.3: Component Integration** ✅
  - [x] Create `useAiCommentary(teamId)` hook with async fetch, loading state, and error handling.
  - [x] Update `SummaryCard` in `SeasonTimeline.tsx` to display AI-generated text with skeleton loader.
  - [x] Implement client-side cache (keyed by `teamId` + `maxWeek`) to prevent redundant API calls.
- **Task 15.4: Fallback & Verification** ✅
  - [x] Graceful fallback to existing `seasonSummaryNarrative` from `insightEngine.ts` if API fails.
  - [x] Verify loading states, caching behavior, and fallback across multiple teams.
- **Task 15.5: UX Refinements** ✅ (Commit `c95fd69`)
  - [x] Always-visible empty-state prompt for Narrative Timeline when no team selected.
  - [x] Elevated neumorphic styling for AI card matching InsightPanel aesthetic.
  - [x] Methods section documentation for the AI commentary feature.
- **Task 15.6: Shareable Deep-Links + Event Filtering** ✅ (Commit `daf1e18`)
  - [x] URL search param sync (`?tab=pulse&team=LAFC`) for shareable team story links.
  - [x] Event category filter chips (Streaks, Rank Changes, Upsets, Milestones) in timeline header.

## Epic 16: BumpChart Event Symbology

**Effort:** 1 Session
**Goal:** Add "breach the surface" faux-3D effect on individual BumpChart line segments during event view, with filter state lifting, monochrome desaturation for non-event teams, and enhanced visual contrast.
**Sprint Brief:** `docs/sprints/briefs/bumpchart-event-symbology-brief.md`
**Dependencies:** Epic 11 (Season Pulse), Epic 15
**Commits:** `39905f2`, `68fba2b`, `11ad660`, `39d16a9`, `4868fc8`
**Status:** COMPLETE

- **Task 16.1: Architectural State Lifting** ✅
  - [x] `activeFilters` state and `toggleFilter` callback lifted from `SeasonTimeline` to parent `SeasonPulse` container.
  - [x] Single source of truth shared by BumpChart and SeasonTimeline for synchronized event filtering.
- **Task 16.2: Event-Aware 3D Breach Rendering** ✅
  - [x] New memoized `EventSegmentLine` component renders faux-3D tube effects only on matchweeks where filtered events occurred.
  - [x] Breach week ranges computed (event week ±1), contiguous ranges merged, sub-paths via `monotoneCubicPath()`.
  - [x] 3D tube (shadow, base, specular highlight) renders exclusively on breach segments.
- **Task 16.3: Three-Tier Visual Hierarchy** ✅
  - [x] Tier 1: Selected team — bold 3D tube, full color.
  - [x] Tier 2: Event-relevant teams — 3D breach segments + colored dot markers at 0.85 opacity.
  - [x] Tier 3: Everything else — ghost grey at 0.08 opacity, 1px stroke.
- **Task 16.4: Event Dot Markers on All Teams** ✅ (Commit `39d16a9`)
  - [x] Colored dots (Green=Streaks, Amber=Rank Changes, Red=Upsets, Cyan=Milestones) on all event-relevant team lines.
  - [x] Dot radius scales with event severity; glow ring and hover tooltip on each.
- **Task 16.5: Event Filter Pills in BumpChart Header** ✅ (Commit `11ad660`)
  - [x] Compact filter pill bar in BumpChart `zone1Toolbar` with Filter icon and four toggleable category pills.
  - [x] Fully synced with SeasonTimeline filter buttons — toggling from either location updates both views.
- **Task 16.6: Documentation & Methods Update** ✅ (Commit `4868fc8`)
  - [x] Chart description rewritten to explain Event View Mode, filter pills, 3D highlights, and dot markers.
  - [x] Methods panel updated with "Event Symbology & Filtering" section documenting three-tier hierarchy and color legend.
- **Future Refinements (Non-Blocking):**
  - 3D breach subtlety improves as season progresses (currently only 5 weeks of 2026 data).
  - Potential animation enhancement: fade-in/out transition between default and Event View Mode.
  - Opacity gap tuning (0.85 vs 0.08) may need mid-season adjustment with denser data.

## Epic 17: Portfolio Site Scaffold (S-3)

**Effort:** 1 Session
**Goal:** Initialize the Next.js 15 App Router scaffold for the "PTA Geospatial Intelligence" portfolio site, establish the design system bridging from the MLS Dashboard aesthetic, and configure the Vercel deployment pipeline.
**Sprint Brief:** `sprints/S-3_Portfolio_Site_Scaffold.md`
**Dependencies:** None (separate repository)
**Status:** Ready to hand off

- **Task 17.1:** Next.js 15 App Router scaffolding with `src/` directory convention.
- **Task 17.2:** Design system translation — port Dark Forge Industrial Neumorphism to portfolio brand.
- **Task 17.3:** Animation foundation (Framer Motion page transitions).
- **Task 17.4:** Vercel deployment pipeline configuration.

---

## Epic 18: Animation Polish & Mobile Responsiveness

**Effort:** 1 Session (Completed)
**Goal:** Make the dashboard fully responsive for mobile devices (53% of traffic) and smooth out animation rough edges (splash screen loading, tab transitions, theme toggle jank).
**Sprint Brief:** `docs/sprints/briefs/animation-mobile-polish-brief.md`
**PR:** #85 (feature/animation-mobile-polish)
**Issue:** #84 (Closed)
**Dependencies:** None
**Status:** COMPLETE

- **Task 18.1: Animation Polish**
  - [x] Add ring spinner + 0.8s Framer Motion crossfade to splash screen (`SplashIntro.tsx`).
  - [x] Implement `AnimatePresence` crossfade between `TabSkeleton` and loaded content (`Home.tsx`).
  - [x] Remove global `html *` theme transition; replaced with targeted transitions on `.neu-raised`, `.glass`, `.tab-btn` (`index.css`).
  - [x] Add `@media (prefers-reduced-motion: reduce)` support for CSS keyframes and Framer Motion.
- **Task 18.2: Mobile Responsiveness**
  - [x] Convert tab navigation to horizontally scrollable icon-only interface on mobile (<768px).
  - [x] Convert fixed 280px Filter Panel into Radix UI bottom sheet on mobile (<1024px).
  - [x] Update chart containers to responsive grids (4-col → 2-col on mobile); `TravelMap` globe uses `min(560px, 70vh)`.
  - [x] Enforce 44x44px minimum touch targets on all interactive elements.
- **Task 18.3: Additional Polish**
  - [x] Center-align all KPI metric card headers and counter values across every tab.

---

## Epic 19: Data Payload Decoupling & Table Virtualization

**Effort:** 1 Session
**Goal:** Extract the 28,000+ line inline JSON data from `mlsData.ts` into an asynchronous payload to slash initial bundle size. Implement DOM virtualization (`@tanstack/react-virtual`) for the Player Stats table to guarantee 60fps scrolling, and add a text search filter.
**Sprint Brief:** `docs/sprints/briefs/data-decoupling-virtualization-brief.md`
**Dependencies:** None
**Status:** COMPLETE (commit `b1c17ee`, Issue #86 closed)

- **Task 19.1: Data Decoupling**
  - [x] Extracted `PLAYERS` (882), `MATCHES` (510), and `TEAM_BUDGETS` (30) into `client/public/data/mls2025.json`.
  - [x] Refactored `seasonDataLoader.ts` to fetch 2025 data asynchronously (same pattern as 2026).
  - [x] Updated `FilterContext.tsx` with async loading, `isLoading` state, and insight engine sync.
  - [x] Stripped `mlsData.ts` from 28,400+ lines to interfaces + `TEAMS` array only. **Net: -27,991 lines removed.**
  - [x] Migrated all 9 downstream consumers: Attendance, PitchMatch, TeamBudget, TravelMap, DeepDivePanel, insightEngine, resilienceUtils, seasonPulse, aiNarrativeEngine.
- **Task 19.2: Table Virtualization & Search**
  - [x] Installed `@tanstack/react-virtual`.
  - [x] Implemented `useVirtualizer` in both main card and maximized modal tables (spacer-row technique preserving native `<table>` layout).
  - [x] Added neumorphic `SearchInput` component filtering by player name, team, and position.

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
