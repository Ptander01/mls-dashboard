# Sprint 5A: Polish & Feedback — Handoff Document

**Date:** March 17, 2026
**Epic:** Epic 6: Polish & Feedback
**Status:** Complete

## Overview
Sprint 5A focused on executing a comprehensive polish pass across the Attendance and Travel tabs, addressing user feedback, fixing visual bugs, and improving the overall UX of the dashboard. The primary goals were to refine data visualizations, improve context and clarity through better copywriting, and fix critical layout issues in maximized chart views.

All 8 planned issues (#28–#35) were completed and closed, along with several additional UX refinements discovered during implementation.

## Key Accomplishments

### 1. Attendance Tab UX & Visual Polish
The Attendance tab received a major overhaul to improve clarity, interactivity, and visual consistency:

- **Global Team Filtering (#30):** Clicking any bar in the top three charts (Home Attendance, Weekly Trend, Gravitational Pull) now acts as a global filter for the entire tab. The trend line, away impact, and home response panels all instantly update to reflect the selected team.
- **Improved Header Descriptions:** All chart sections received richer, actionable subtitles that better explain what the chart shows, how to interact with it, and what insights it delivers.
- **Away Impact Reframing:** The Away Impact chart was reframed as "City Excitement," focusing on how cities respond to the spectacle of a visiting team. A dotted separator line was added between positive and negative delta rows, along with a summary insight snippet.
- **Always-Visible Drill-Downs (#29):** The Away Impact and Home Response charts are now always visible, displaying placeholder prompts when no team is selected, rather than being completely hidden.
- **Insight Engine Integration:** The lightbulb insight toggle was added to the Away Impact and Home Response charts, powered by new dynamic insight generators.

### 2. Chart Component Refinements
Specific data visualizations were refined to improve readability and aesthetic consistency:

- **Gravitational Pull Deemphasis (#31):** The deemphasized state of the 3D horizontal bars was fixed to match the rich "unpainted pottery" aesthetic of the top vertical bar chart. The group-level opacity reduction was removed, restoring full 3D depth, shadows, and texture while keeping the neutral color.
- **Gravitational Pull Focus:** The redundant glow ring/highlight effect was removed from the emphasized bar, relying solely on the team color to stand out among the pottery-neutral bars.
- **Gravitational Pull Toggle Fix (#33):** The toggle logic was flipped and renamed for clarity. "FOCUSED" now zooms in and caps the X-axis at the second-highest team so the pack is comparable (letting Miami bleed off the edge), while "FULL SCALE" shows the true linear scale including Miami's outlier bar.
- **Weekly Trend Dynamic Y-Axis:** When a single team is filtered, the Y-axis max is now dynamically capped at the team's own maximum (plus capacity) rather than the league maximum, reducing dead whitespace while keeping the minimum at 0 to preserve the "crowd mass" visual metaphor.
- **Weekly Trend Simplification:** For single-team views, redundant min/max braille lines were removed. The chart now cleanly shows the team's attendance area, a faint ghost area for the league average, and a single dotted braille line for stadium capacity.
- **Age Ridgeline Restyle (#34):** The age distribution ridgeline chart in the Travel Deep Dive panel was completely restyled as opaque layered polygons with depth-based tinting, solid background fills, and specular edge highlights, matching the provided reference aesthetic.

### 3. Data & Content Polish
- **Gini Coefficient (#28):** Replaced the Squad Depth HHI (Herfindahl-Hirschman Index) with the Gini coefficient on top-15 players, providing better statistical differentiation across teams.
- **Insight Engine Polish (#35):** Executed a comprehensive polish pass on all Travel tab insight cards (Deep Dive panel, dumbbell chart, scatter chart). All generated insights were tightened to a maximum of two sentences, leading with numbers for immediate impact.

### 4. Critical Bug Fixes
- **Tooltip Positioning (#32):** Fixed tooltip clipping issues across all Attendance charts by applying `position: fixed`, allowing tooltips to overflow their container boundaries.
- **Maximize Modal Layout:** Resolved a persistent issue where maximized chart modals were cut off at the top or unscrollable. The `ChartModal` component was completely rewritten using a React `createPortal` to render directly on `document.body`. This bypasses ancestor CSS transforms that were creating unintended containing blocks for `position: fixed` elements, ensuring the modal always fits the viewport perfectly and allows internal scrolling when content exceeds the screen height.

## Closed Issues
- **#28:** Replace Squad Depth HHI with Gini coefficient on top-15 players
- **#29:** Make Away Impact & Home Response charts always visible
- **#30:** Global team filtering across Attendance tab
- **#31:** Decrease hover effect on bar charts & fix Gravitational Pull deemphasis
- **#32:** Fix tooltip positioning (position: fixed)
- **#33:** Fix ABSOLUTE toggle X-axis cap (Renamed to FOCUSED/FULL SCALE)
- **#34:** Restyle age ridgeline as opaque layered polygons
- **#35:** Insight engine polish pass (max 2 sentences, lead with numbers)

## Next Steps
With the Polish & Feedback sprint complete, the dashboard is in a highly refined state. The next major epic will focus on Pitch Data, integrating StatsBomb datasets to visualize shot maps, heatmaps, and passing networks for the 2022 World Cup and Messi's career.
