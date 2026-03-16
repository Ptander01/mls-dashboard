# MLS Analytics Dashboard: Daily Progress Report (March 16, 2026)

## Executive Summary
Today was a massive execution day spanning 4 sprint sessions and over 8 hours of development. We successfully completed **Sprint 1** (Stability & Polish) and made significant headway into **Sprint 2** (Insight Depth) and **Sprint 3/4** (Travel Performance & Advanced Viz). The dashboard's visual language has been elevated significantly, introducing custom 3D SVGs, Catmull-Rom splines, and cinematic lighting techniques.

## Sprint 1: Stability & Polish (Completed)
All 7 issues in Epic 1 and Epic 2 were closed. The foundation is now rock solid.

| Issue | Status | Description |
|-------|--------|-------------|
| #1 | Closed | Fixed Insight Panel pre-population bleed across all tabs |
| #2 | Closed | Resolved Maximize Modal chart resize failure |
| #3 | Closed | Fixed Attendance Capacity chart bar overhang |
| #4 | Closed | Resolved Gravitational Pull x-axis overflow/clipping |
| #5 | Closed | Added Dual Perspective Toggle (ABSOLUTE / COMPARE) |
| #6 | Closed | Updated Insight Headline to a two-sentence generator |
| #7 | Closed | Implemented Pottery Focus Interaction (emphasized team highlighting) |

## Sprint 2: Insight Depth (In Progress)
The Attendance tab received a major visual overhaul, moving away from standard Recharts components to custom 3D SVG rendering.

- **3D Area Trend Chart:** Built a custom `<Area3DPolygon>` using Catmull-Rom interpolation for smooth curves. Added top and bottom braille lines (max/min envelopes) that float above and rest on the surface, creating a three-layer elevation model.
- **UI Polish:** Increased bar chart heights, implemented a deemphasize-on-click pattern, and unified fonts to Space Grotesk.

## Sprints 3 & 4: Travel Performance (In Progress)
The Travel Map tab was completely transformed into a "Performance & Resilience Analysis" command center.

- **Data Layer:** Created `resilienceUtils.ts` to compute travel burden, home/away splits, squad depth, and a composite Resilience Score (0-100).
- **Dumbbell Chart (Chart A):** Built a neumorphic grooved-track chart with chrome metallic knobs to show home vs away PPG gaps.
- **Crater Scatter Plot (Chart B):** Delivered a cinematic recessed-impression scatter plot. Teams are rendered as physical "craters" with beveled rims, directional lighting, and variable ring spacing based on squad rotation depth.
- **Resilience Index (Chart C):** Upgraded from a simple bar chart to a 3D extruded squarified treemap using a deep earthy tier color palette.
- **Radar Team Cards (Chart D):** Added a collapsible 12-card grid with 5-axis spider charts and staggered entrance animations.
- **Deep Dive Panel:** Added a three-panel section covering squad depth (HHI bars), salary vs road performance, and age distribution ridgelines.

---

## Critical Feedback & Action Plan for Tomorrow

Based on your review of today's work, I've captured the following feedback items to tackle in our next sessions. I've created GitHub Issues for each of these.

### 1. Squad Depth Calculation
**The Issue:** You noticed the squad depth index values are "all almost the same."
**The Cause:** The current calculation uses an inverted Herfindahl-Hirschman Index (HHI) of minutes played. Because MLS rosters are large (~30 players) and most teams distribute minutes somewhat evenly across a 34-game season, the raw HHI values naturally cluster tightly. The normalization math compresses them further into a narrow band (mostly 70-90).
**The Fix:** We need to switch to a more spread-sensitive metric, such as the Gini coefficient of minutes distribution, or focus the calculation strictly on the top 15 players to filter out garbage-time minutes that dilute the variance.

### 2. Attendance Tab UX Refinements
- **Always-On Charts:** The away impact and home response charts should be permanently visible, not hidden behind a click on the Gravitational Pull chart.
- **Global Filtering:** Clicking any team's bar anywhere on the pane should auto-filter the entire tab consistently.
- **Hover Effects:** The hover effect on bar charts needs to be drastically decreased.
- **Tooltip Positioning:** Tooltips should stop gravitating toward the center of the chart; it's perfectly fine if they spill outside their container.
- **Absolute Toggle Behavior:** The ABSOLUTE toggle on the Gravitational Pull chart needs adjusting. It should zoom the X-axis to cap at the second-highest value (LAFC's +42k) and let Inter Miami's massive +149k value bleed off the edge or show a truncated "break" for dramatic emphasis.

### 3. Travel Tab Visual Refinements
- **Age Distribution Ridgelines:** The current translucent lines with shaded areas under them are difficult to read. We will update these to opaque, layered shaded area polygons (referencing the green paper-stack image you provided) to create a clearer, physical overlapping effect.
- **Insight Engine Output:** The generated insights in the newer tabs need format and output improvements to be punchier and more readable.
