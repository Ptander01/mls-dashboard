# MLS Dashboard — Project Handoff Document

**Last updated:** March 21, 2026
**Repo:** [Ptander01/mls-dashboard](https://github.com/Ptander01/mls-dashboard)
**Live:** [mls-dashboard-one.vercel.app](https://mls-dashboard-one.vercel.app)

---

## Project Overview

"MLS: A Deeper Look" is a full-stack analytics dashboard for Major League Soccer, built with React 19, TypeScript 5.6, and Vite 7. The project started approximately 3 months ago and is the developer's first React/TypeScript project. All development is done in collaboration with Manus AI, using a sprint-based workflow with GitHub Issues and feature-branch PRs.

---

## Current Scoreboard

| Metric | Value |
|---|---|
| **Total Issues** | 71 |
| **Closed** | 42 |
| **Open** | 29 |
| **Completion** | 59% |
| **Total Commits** | 148 |
| **Total Lines of Code** | 59,823 |
| **Dashboard Tabs** | 6 |
| **Chart Components** | 10+ |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React 19 + TypeScript 5.6 |
| **Build Tool** | Vite 7 |
| **Styling** | Tailwind CSS + custom neumorphic design system |
| **Charts** | Recharts, custom SVG, Three.js (@react-three/fiber + drei) |
| **Animation** | Framer Motion |
| **Routing** | Wouter |
| **UI Components** | Radix UI primitives + shadcn/ui |
| **3D** | Three.js (correlation matrix, pitch visualizations) |
| **Hosting** | Vercel (auto-deploy from main) |
| **CDN** | Vercel Blob (splash video) |
| **Analytics** | @vercel/analytics + @vercel/speed-insights |
| **Package Manager** | pnpm |

---

## Design Conventions

These conventions are established and must be maintained across all new components:

**Neumorphic Design System:** Cards are raised with soft shadows. Interactive panels (like METHODS) are recessed/inset, creating a "peeking under the hood" feel. Toggle buttons use neumorphic pressed/raised states.

**ChartHeader Component** (`client/src/components/ui/ChartHeader.tsx`): Every chart card uses this reusable component. It provides a title, conversational description paragraph, and a collapsible METHODS panel with methodology/formula text. The description uses a FiveThirtyEight editorial voice — conversational, analytical, with specific numbers.

**Deemphasis Pattern:** On charts with many data points (scatter, bump chart, bar charts), hovering one element fades all others to low opacity. Clicking locks the selection. This is the primary interaction pattern across the dashboard.

**Color Palette:** Teal (`#5aacbc`) is the primary accent. Amber (`#e8a838`) is the secondary accent. Dark backgrounds use `#0f1117` to `#1a1d27`. Light mode is supported and is the default theme.

**Animation:** All transitions use Framer Motion. Staggered entry animations on tab load (`StaggerItem` wrapper). Smooth opacity/scale transitions on hover and selection.

**Insight Engine** (`client/src/lib/insightEngine.ts`): Auto-generates narrative text for chart cards. Each chart has a `generateXxxInsights()` function that returns `CardInsightItem[]` with title, text, and optional icon. Insights are displayed via the `CardInsight` component.

---

## File Structure (Key Files)

```
client/src/
├── App.tsx                              (39 lines — root with SplashIntro, Analytics, SpeedInsights)
├── components/
│   ├── SplashIntro.tsx                  (103 lines — splash video overlay)
│   ├── ui/
│   │   └── ChartHeader.tsx              (184 lines — reusable chart header)
│   ├── tabs/
│   │   ├── Attendance.tsx               (2,580 lines)
│   │   ├── PitchMatch.tsx               (765 lines)
│   │   ├── PlayerStats.tsx              (1,576 lines)
│   │   ├── SeasonPulse.tsx              (825 lines — NEW: snapshot table + bump chart)
│   │   ├── TeamBudget.tsx               (635 lines)
│   │   └── TravelMap.tsx                (1,614 lines)
│   └── charts/
│       ├── BumpChart.tsx                (1,155 lines — NEW: rank trajectory visualization)
│       ├── CorrelationMatrix3D.tsx       (813 lines — Three.js)
│       ├── DeepDivePanel.tsx            (1,129 lines)
│       ├── DumbbellChart.tsx            (869 lines — recently polished)
│       ├── RadarTeamCards.tsx            (363 lines)
│       ├── ResilienceIndexChart.tsx      (759 lines)
│       ├── StatsPlayground.tsx          (1,322 lines)
│       └── TravelScatterChart.tsx       (1,931 lines)
├── lib/
│   ├── mlsData.ts                       (28,436 lines — all match/team/salary data)
│   ├── insightEngine.ts                 (1,685 lines — narrative generation)
│   ├── seasonPulse.ts                   (779 lines — NEW: weekly standings engine)
│   └── resilienceUtils.ts              (486 lines — travel resilience metrics)
```

---

## Sprint Briefs (in repo)

All sprint briefs are committed at `docs/sprints/briefs/`:

| File | Status | Description |
|---|---|---|
| `session3-narrative-timeline-prompt.md` | **READY — next up** | Season Pulse Layer 3: narrative timeline |
| `session2-bump-chart-prompt.md` | Complete | Season Pulse Layer 2: bump chart |
| `season-pulse-brief.md` | Complete | Season Pulse master architecture |
| `dumbbell-polish-sprint.md` | Complete | Dumbbell chart sizing, contrast, text |
| `statsbomb-pitch-brief.txt` | Ready | StatsBomb pitch data integration |
| `deckgl-sprint-brief.txt` | Ready | deck.gl travel map |
| `animation-strategy.md` | Reference | Animation patterns across dashboard |
| `polish-feedback-brief.txt` | Reference | General polish patterns |

---

## Open Issues — Prioritized Backlog

### Tier 1: Active Sprint (do next)

| Issue | Title | Context |
|---|---|---|
| **#76** | Season Pulse: Narrative Timeline (Session 3) | Sprint prompt ready at `docs/sprints/briefs/session3-narrative-timeline-prompt.md`. **BLOCKED: user needs to review Sessions 1 and 2 on desktop before this starts.** |
| **#69** | Splash Intro Video | Component is wired, CDN URL is set. Needs user to verify live and close. May need minor adjustments after review. |

### Tier 2: Feature Epics (ready for sprint briefs)

| Issue | Title | Epic |
|---|---|---|
| #40 | 3D Shot Map on PitchMatch tab | pitch-data |
| #41 | Passing network visualization | pitch-data |
| #51 | Messi Career Mode — 602-match explorer | pitch-data (side project) |
| #52 | World Cup 2022 Match Explorer | pitch-data (side project) |
| #42 | deck.gl: Vite config + lazy loading | deckgl-map |
| #43 | deck.gl: DeckTravelMap with terrain + arcs | deckgl-map |

### Tier 3: Existing Tab Enhancements

| Issue | Title | Epic |
|---|---|---|
| #8 | Attendance Trend Chart: Three View Modes | attendance |
| #9 | Deepen Attendance Insight Cards | attendance |
| #10 | Team Budget: Richer DP Efficiency Insights | insight-depth |
| #11 | Player Stats: Percentile Context in Radar | insight-depth |
| #12 | Pitch Match: First Insight Layer | insight-depth |
| #13-18 | Travel tab enhancements (data layer, charts, deep dive) | travel-perf |

### Tier 4: New Features

| Issue | Title |
|---|---|
| #19 | Deck.gl 3D Correlation Matrix |
| #20 | Animated Race Chart Tab |
| #58 | Shape Morphing Transition (Donut → Stacked Bar) |

### Tier 5: Deferred

| Issue | Title |
|---|---|
| #21 | Cross-Chart Pottery Linking |
| #22 | Ultrawide Layout Optimization |
| #23 | 3D Radar Chart (Three.js) |
| #24 | Statistical Hypothesis Tests UI |
| #25 | Mobile Tab Label Truncation Fix |
| #26 | 2026 Season Data Integration |
| #27 | Enhanced Data Sources (FBref, Sofascore, StatsBomb) |

---

## Deployment Details

| Item | Value |
|---|---|
| **Production URL** | `mls-dashboard-one.vercel.app` |
| **Vercel Blob CDN** | `lgwwk3igzcagstag.public.blob.vercel-storage.com` |
| **Splash Video URL** | `lgwwk3igzcagstag.public.blob.vercel-storage.com/splash-optimized.mp4` |
| **Build time** | ~25 seconds |
| **Deploy trigger** | Push to `main` branch |
| **Analytics** | Vercel Web Analytics enabled |
| **Speed Insights** | Vercel Speed Insights enabled |

---

## Workflow Conventions

**Branch naming:** `feature/<descriptive-name>` for new features, `fix/<descriptive-name>` for bugs.

**Commit messages:** Conventional commits format — `feat(component): description`, `fix(component): description`, `docs: description`.

**PR workflow:** Feature branch → PR with description referencing issue number → merge to main → auto-deploy. PRs should reference the issue they close with `Closes #XX` in the body.

**Sprint briefs:** For complex features, a sprint brief is written first and committed to `docs/sprints/briefs/`. The brief contains exact file paths, API signatures, integration points, and acceptance criteria. New task threads should read the brief before starting implementation.

**BACKLOG.md:** The master backlog tracker in the repo root. Updated after every sprint with checkboxes for completed tasks. Organized by Epics.

**`.gitignore`:** Includes `package-lock.json` to prevent conflicts (project uses pnpm exclusively).

---

## Key Decisions Made

1. **No backend database.** All data is static TypeScript in `mlsData.ts`. This is intentional — the dashboard is a portfolio/analytics project, not a live service.

2. **Client-side analytics engine.** All computations (insight generation, power rankings, resilience index) run in the browser. No server-side compute.

3. **Neumorphic design system.** The entire UI follows a neumorphic aesthetic with raised cards, recessed panels, and soft shadows. This is a deliberate design choice, not a default.

4. **ChartHeader on every chart.** Every chart card has a title, description, and METHODS panel. This was standardized in Epic 6.5 (PR #68).

5. **Deemphasis as primary interaction.** Rather than tooltips or modals, the dashboard uses opacity-based deemphasis to let users focus on individual data points while maintaining context.

6. **Season Pulse merged Power Rankings + Timeline.** Originally two separate tabs (Epics 11 and 12), these were consolidated into a single "Season Pulse" tab with three layers: Snapshot Table, Bump Chart, and Narrative Timeline.

7. **Splash video hosted on Vercel Blob CDN.** Not committed to Git. The `SplashIntro.tsx` component references the CDN URL directly. Plays once per session via `sessionStorage` flag.

---

## What the New Thread Needs to Do First

1. Clone the repo: `gh repo clone Ptander01/mls-dashboard`
2. Read this document: `docs/HANDOFF.md`
3. Read the BACKLOG: `BACKLOG.md`
4. Check open issues: `gh issue list --state open`
5. Ask the user what they want to work on next

**If continuing Season Pulse Session 3:** Read `docs/sprints/briefs/session3-narrative-timeline-prompt.md` first. But confirm the user has reviewed Sessions 1 and 2 on desktop before starting.

---

## LinkedIn Content

All blog post drafts and feature release announcements are now consolidated in `docs/blog/`:

| File | Description |
|---|---|
| `docs/blog/design-system-post.md` | LinkedIn post on maturing the dashboard design system |
| `docs/blog/season-pulse-post.md` | LinkedIn post on the Season Pulse tab and event filter upgrade |
| `docs/blog/event-filter-handoff.md` | PM handoff brief for the BumpChart event filter sprint |

**Posting strategy:** Tuesday or Wednesday, 8-10am ET. First comment tags Manus and Vercel. Second comment invites questions.
