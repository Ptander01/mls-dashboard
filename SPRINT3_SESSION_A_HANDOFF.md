# Sprint 3 — Epic 5 Session A Handoff

## Commits

| Commit | Description |
|--------|-------------|
| `d4fe1cd` | Baseline: resilienceUtils data layer, neumorphic DumbbellChart, ResilienceIndexChart (bar version) |
| `5ed104f` | Final: 3D extruded treemap for Resilience Index + deep earthy tier colors |

## Files Created / Modified

| File | Status | Purpose |
|------|--------|---------|
| `client/src/lib/resilienceUtils.ts` | **New** | Data layer: PPG splits, resilience scoring, tier assignment, insight headlines, theme-aware `tierColor()` |
| `client/src/components/charts/DumbbellChart.tsx` | **New** | Neumorphic grooved-track dumbbell chart with 3D knob endpoints, H/A vs TEAM symbology, PPG/WIN%/GD metric toggle |
| `client/src/components/charts/ResilienceIndexChart.tsx` | **New** | 3D extruded treemap (squarified layout), SCORE/TEAM color toggle, INDEX/COMPONENTS view toggle |
| `client/src/components/tabs/TravelMap.tsx` | **Modified** | Integrated both charts below the map in a stacked full-width layout with CardInsight headlines |
| `client/src/lib/resilienceUtils.ts` | **Modified** | Added `TIER_COLORS_DARK`, `TIER_COLORS_LIGHT`, `tierColor()` for theme-aware deep earthy palette |

## Design Decisions

The Resilience Index was originally a horizontal bar chart but was upgraded to a **squarified treemap** with 3D extruded tiles. This was a deliberate choice to introduce a novel visualization technique not used elsewhere in the dashboard (which already has bar charts in Attendance, Budget, and other tabs).

The tier color palette uses deep earthy tones inspired by the shipping container aesthetic from the user's reference images, matching the position colors used in the Team Budget pie charts. The palette is theme-aware with separate dark/light variants.

The DumbbellChart uses a neumorphic fader/mixer aesthetic with grooved inset tracks and raised 3D knob endpoints, inspired by audio mixer reference images provided by the user.

## Known Issues / Session B Scope

1. **Dumbbell toggle buttons** — The H/A vs TEAM and PPG/WIN%/GD toggles may need click-target verification; they appeared unresponsive during browser testing (could be a sandbox rendering issue vs. actual bug).
2. **Session B charts** — Epic 5 Session B covers Chart B (Travel Burden scatter plot) and Chart D (Team Radar Cards), per the BACKLOG.
3. **COMPONENTS view** — The sub-strip layout works but could benefit from more distinct visual separation between the three component strips on smaller tiles.

## Aesthetic Reference

All colors follow the deep earthy matte palette:

| Tier | Dark Mode | Light Mode | Semantic |
|------|-----------|------------|----------|
| Excellent | `#1E3448` (deep steel blue) | `#2A4A64` | Cool, strong |
| Good | `#1E3A28` (deep forest green) | `#2A4A35` | Natural, stable |
| Vulnerable | `#4A3E1A` (deep olive-brown) | `#5A4A2A` | Warm, cautionary |
| Fragile | `#6A2222` (deep brick red) | `#8A2A2A` | Hot, concerning |
