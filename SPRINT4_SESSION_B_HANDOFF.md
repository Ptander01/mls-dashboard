# Sprint 4 — Session B Handoff

## Completed Tasks

### Task 5.4: Chart B — Travel Burden vs Performance Drop Scatter Plot
**File:** `client/src/components/charts/TravelScatterChart.tsx`

The scatter plot visualizes the relationship between total away travel miles (X-axis) and home/away PPG delta (Y-axis), with bubble size encoding squad depth index. Key features include a dashed regression line with R-squared annotation, quadrant labels identifying "LOW TRAVEL / HIGH ADVANTAGE" and "HIGH TRAVEL / LOW ADVANTAGE" zones, a three-button conference filter (ALL / EAST / WEST), and an auto-generated insight headline that adapts to the filtered data. The chart uses the matte playdough aesthetic with team-colored radial-gradient bubbles, elliptical cast shadows, and specular highlights. Median-split quadrant dividers provide context for relative positioning.

### Task 5.5: Chart D — Radar Team Cards
**File:** `client/src/components/charts/RadarTeamCards.tsx`

A collapsible 12-card grid of team resilience profiles, toggled by a "View Team Profiles" button. Each card contains a 5-axis spider/radar chart with axes for Away PPG, Congestion Resistance, Long-haul Record, Squad Depth, and Age Efficiency. The radar polygons use team-colored fills with semi-transparent opacity. Below each radar, a compact stats row displays Away PPG, total miles, average age, and resilience score. Cards are sorted by resilience rank and use staggered Framer Motion entrance animations. The grid is responsive, scaling from 2 columns on mobile to 5 columns on extra-large screens.

### Task 5.6: Deep Dive Collapsible Panel
**File:** `client/src/components/charts/DeepDivePanel.tsx`

A collapsed panel toggled by a "DEEP DIVE — Squad Construction & Salary Analysis" button, containing three sub-panels with staggered entrance animations. Panel 1 shows squad depth breakdown as horizontal bars representing the minutes HHI index, sorted by depth. Panel 2 displays a salary concentration vs road performance scatter plot, with DP salary concentration on the X-axis and away PPG on the Y-axis, including a regression trend line. Panel 3 presents age distribution as stacked horizontal bars showing the percentage of minutes played by U23, 23-29, and 30+ age brackets. Each panel includes an auto-generated insight summary.

### Toggle Bug Fix
**File:** `client/src/components/charts/DumbbellChart.tsx`

The toggle buttons (H/A vs TEAM, PPG/WIN%/GD) had click-target issues due to insufficient padding and missing z-index stacking. The fix added `relative z-10` to the toggle container, `e.stopPropagation()` to click handlers, increased padding from `py-1` to `py-1.5`, set explicit `minWidth: 40px` and `minHeight: 28px`, and added `cursor-pointer select-none` classes for better UX.

### Integration
**File:** `client/src/components/tabs/TravelMap.tsx`

All three new components are imported and rendered in the Performance & Resilience Analysis section, ordered as Chart A (Dumbbell), Chart B (Scatter), Chart C (Resilience Index), Chart D (Radar Cards), and Deep Dive Panel. Each is wrapped in a NeuCard container with appropriate labels.

## Architecture Notes

All new components follow the same patterns established in Session A. They consume `TeamResilienceMetrics[]` from `resilienceUtils.ts`, use `mutedTeamColor()` and `linearRegression()` from `chartUtils.tsx`, and respect the dark/light theme via `useTheme()`. The DeepDivePanel additionally consumes `Player[]` and `Team[]` for age distribution and salary analysis. No new dependencies were added; all charts are rendered as pure SVG for consistency with the existing codebase.

## Build Status

The project compiles with zero TypeScript errors and builds successfully with Vite. The production bundle is approximately 2.5 MB (gzipped: 658 KB).
