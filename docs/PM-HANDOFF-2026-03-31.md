# MLS Dashboard PM Handoff Note

**To:** Incoming MLS Dashboard PM Agent
**From:** Outgoing MLS Dashboard PM Agent
**Date:** March 31, 2026
**Repo:** `Ptander01/mls-dashboard`
**Live Site:** [mls-dashboard-one.vercel.app](https://mls-dashboard-one.vercel.app)
**Latest Commit:** `6e237b0` (main)

---

## 1. Project Overview

The MLS Analytics Dashboard is a React + TypeScript + Vite single-page application featuring neumorphic 3D UI, Recharts/Three.js visualizations, and an AI insight engine. It covers six tabs: Player Stats, Attendance, Team Budget, Pitch Match, Season Pulse, and Travel Map. Data is sourced from the American Soccer Analysis API, MLSPA salary guides, and DirecTV Insider payroll data.

## 2. Current Epic Status

The project uses a sequential Epic numbering system tracked in `BACKLOG.md`. Here is the current state:

| Epic | Name | Status |
|:-----|:-----|:-------|
| 1 | Core Dashboard Layout & Neumorphic Theme | COMPLETE |
| 2 | Pottery Focus Interaction | COMPLETE |
| 3 | Attendance Tab Insights | COMPLETE |
| 4 | Insight Engine Depth | COMPLETE |
| 5 | 3D Bar Charts & Visual Polish | COMPLETE |
| 6 | Pitch Match Tab | COMPLETE |
| 7 | Season Pulse Tab | COMPLETE |
| 8 | Travel Map Tab | COMPLETE |
| 9 | Travel Map Overhaul | RESEARCH DONE — awaiting direction |
| 10 | Race Chart Animation | CANCELLED — BumpChart covers season progression better |
| 11 | Cinematic Splash Screen | COMPLETE |
| 12 | 2026 Season Data Integration | COMPLETE |
| 13 | Uniform Chart Headers | COMPLETE |
| 14 | Data Pipeline Polish | COMPLETE |
| 15 | Attendance Deep Dive | COMPLETE |
| 16 | Season Pulse Enhancements | COMPLETE |
| 17 | BumpChart Season Progression | COMPLETE |
| 18 | Data Decoupling & Bundle Optimization | COMPLETE |
| 19 | Table Virtualization & Search | COMPLETE |
| 20 | 2026 Salary Data Pipeline | COMPLETE |
| 21 | InsightPanel UI Redesign | COMPLETE |

**Score: 19 of 20 active epics complete.** Epic 9 (Travel Map Overhaul) has research completed but no decision made on implementation approach.

## 3. Recent Work (This Session)

The following was completed in this PM session:

1. **Epic 10 (Race Chart) cancelled** — user prefers the BumpChart. Issue #20 closed.
2. **Cinematic theme toggle merged** — cherry-picked `ThemeToggle.tsx` and `ThemeToggleCompact.tsx` from `feature/cinematic-theme-switcher` branch onto main. Old branch deleted.
3. **Solar arc theme transition** — implemented a CSS custom property animation (`--solar-progress`) that sweeps shadows and a golden hour overlay across the entire dashboard simultaneously when toggling dark/light mode. Tuned over multiple iterations for shadow Y swing, overlay intensity, and arc duration (1.8s).
4. **Epic 20 (2026 Salary Pipeline)** — completed by another agent, synced into BACKLOG.md. 574/620 players matched (92.6%).
5. **Epic 21 (InsightPanel UI Redesign)** — completed by another agent. Three iterations: mechanical door → clean fade+rise → fully transparent orchestrator. Depression artifact eliminated.
6. **Repo recovery** — the repo was accidentally overwritten by a force-push from a different project (DC Parcel Dashboard). Recovered from local clone and force-pushed correct history back. No data lost.
7. **Dark mode hover contrast fix** — reduced the bright white cursor highlight on attendance bar charts to subtle `rgba(255,255,255,0.06)`.

## 4. Open GitHub Issues (15 remaining)

### Priority: High

| # | Title | Notes |
|:--|:------|:------|
| **#11** | Player Stats: Percentile Context in Radar Card | **Next sprint candidate.** Add league-wide percentile bands/shading to the player radar chart axes. |
| **#12** | Pitch Match Tab: First Insight Layer (4 Cards) | PitchMatch has zero InsightPanel integration. Needs 4 insight cards (most shots, highest xG, best accuracy, most lopsided possession). |

### Priority: Low / Deferred

| # | Title | Notes |
|:--|:------|:------|
| #8 | Attendance Trend: Three View Modes | Deprioritized. Small multiples / league avg / league total toggle. |
| #19 | deck.gl 3D Correlation Matrix | Deferred — large scope. |
| #22 | Ultrawide Layout Optimization | Deferred. |
| #23 | 3D Radar Chart (Three.js) | Deferred. |
| #24 | Statistical Hypothesis Tests UI | Deferred. |
| #25 | Mobile Tab Label Truncation Fix | Deferred (bug). |
| #27 | Enhanced Data Sources | Deferred. |
| #40 | Pitch Data: 3D Shot Map Enhancements | Deferred. |
| #42 | deck.gl: Vite Config + Dependencies | Deferred — large scope. |
| #43 | deck.gl: DeckTravelMap | Deferred — large scope. |
| #51 | Pitch Data: Messi Career Mode | Deferred. |
| #52 | Pitch Data: World Cup 2022 Explorer | Deferred. |
| #58 | Animation: Shape Morphing Transitions | Enhancement. |

## 5. Key Architecture Notes

- **Theme system:** CSS custom properties on `:root`, toggled via `ThemeContext`. Solar arc transition animates `--solar-progress` and `--solar-overlay-opacity` via `requestAnimationFrame`. Class swap (`.light` ↔ `.dark`) fires at 45% progress.
- **Data loading:** Season JSON files in `client/src/data/` (e.g., `mls2026.json`). Loaded via `seasonDataLoader.ts` based on `FilterContext` season selection.
- **Insight engine:** `insightEngine.ts` computes quantitative insights per tab. `InsightPanel.tsx` wraps `NeuInsightContainer.tsx` (now a transparent animation orchestrator) + `CardInsight.tsx`.
- **Neumorphic system:** CSS classes `.neu-flat`, `.neu-raised`, `.neu-pressed`, `.neu-concave` in `index.css`. Solar arc modifies shadow offsets via `calc()` referencing `--solar-progress`.
- **Sprint briefs:** Located in `docs/sprints/briefs/`. Each brief is a self-contained handoff document for an executing agent.

## 6. User Preferences (Important)

- **Light mode is the default** — documentation screenshots should use light theme.
- **Transitions must be simultaneous** — never staggered per-element. The user specifically dislikes "geographically scattered" effects.
- **Charts need introductions + methods** — every chart should have a textual abstract and a "Methods" button explaining data sources and math.
- **Pottery Focus is click-to-activate** — not hover. Applies globally within each tab.
- **Hover highlights should be subtle** — especially in dark mode. Low-contrast cursor fills.
- **The PM agent does not build** — write sprint briefs and the user kicks off separate chats for execution.

## 7. Project Boundaries

- **This PM agent** manages: `Ptander01/mls-dashboard` repo, `BACKLOG.md`, all Epics, and GitHub issues.
- **Portfolio PM agent** manages: `Portfolio-Docs` repo, `pta-portfolio` site, and broader professional migration sprints (S-0, S-1, etc.).
- The Portfolio PM may occasionally relay completion reports (as happened with Epic 20). Accept and verify these.

## 8. Recommended Next Steps

1. **Sprint #11 — Percentile Radar Context:** Write a brief for adding league percentile bands to the player radar chart. This is the highest-priority open feature.
2. **Sprint #12 — PitchMatch Insights:** The only tab without InsightPanel integration. Four cards needed.
3. **Epic 9 decision:** The Travel Map overhaul research is done but no direction chosen. Ask the user what they want to do with it.
