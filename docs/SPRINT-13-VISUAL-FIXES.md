# Sprint #13: Visual Refinements & Default States

**Epic:** UI Polish & Chart Fidelity
**Status:** Ready for Development
**Assignee:** [Execution Agent]

## Objective
Fix three specific 3D rendering artifacts in the Team Budget charts and update the default visibility state of the Season Pulse bump chart.

## Issue 1: Dark Square Artifact on 3D Bar Tops
**Location:** `client/src/lib/chartUtils.tsx` (`Extruded3DStackedBar`)
**Problem:** A dark square is visible on the top face of the highest segment in the stacked bar chart. This occurs because the top face parallelogram uses `highlightColor` at `0.35` opacity, which sits on top of the dark `shadowColor` at the bottom of the front face's gradient.
**Acceptance Criteria:**
* The top face of the `top` stack position must blend smoothly without showing a dark square.
* **Suggested Fix:** Increase the opacity of the top face fill, or adjust the front face gradient so it doesn't end on a dark stop right where the top face overlaps, or use an opaque base color for the top face before applying the highlight.

## Issue 2: "Open Mouth" Bottom on Stacked Bars
**Location:** `client/src/lib/chartUtils.tsx` (`Extruded3DStackedBar`) & `client/src/components/tabs/TeamBudget.tsx`
**Problem:** The bottom 3D extrusion face is only rendered when `stackPosition === "bottom"`. When a team has zero Designated Player (DP) spend, Recharts doesn't render the bottom segment. The TAM segment (which has `stackPosition="middle"`) becomes the visual bottom of the stack, but lacks the bottom face extrusion, creating an "open mouth" effect.
**Acceptance Criteria:**
* Every stacked bar must have a closed bottom face, regardless of whether the lowest data category is zero.
* **Suggested Fix:** Instead of relying on a hardcoded `stackPosition` prop, the rendering logic must dynamically detect the lowest visible segment. You can pass the actual `dp` and `tam` values into the custom shape component to conditionally render the bottom face on the `middle` or `top` segment if the lower segments have a value of `0`.

## Issue 3: Reverse Shadow Artifact on Donut Chart
**Location:** `client/src/lib/chartUtils.tsx` (`Extruded3DPie`)
**Problem:** There is a bright glow/halo in the upper-left area of the donut chart that bleeds outside the donut ring onto the background. This is caused by Layer 8 (Specular highlight overlay), which is a full circle (`r={outerRadius * 0.9}`) with a radial gradient that lacks a clip-path.
**Acceptance Criteria:**
* The specular highlight must only affect the donut segments and must not bleed onto the surrounding background surface.
* **Suggested Fix:** Add an SVG `<clipPath>` to Layer 8 that restricts the highlight to the donut ring area (the area between `innerRadius` and `outerRadius`), or replace the single overlay with per-segment specular highlights.

## Issue 4: Bump Chart Default Visibility
**Location:** `client/src/components/charts/BumpChart.tsx`
**Problem:** The Bump Chart on the Season Pulse tab defaults to `viewMode === "focus"`. When no team is selected or hovered, this mode renders all lines at `0.15` opacity, making the chart look essentially blank on initial load.
**Acceptance Criteria:**
* The Bump Chart must default to `allFocus` mode on initial tab load.
* All team lines must be fully drawn with their 3D tube symbology and team colors visible by default.
* **Suggested Fix:** Change the initial state of `viewMode` from `"focus"` to `"allFocus"` at line 782: `const [viewMode, setViewMode] = useState<ViewMode>("allFocus");`.

## Technical Notes
* All changes must maintain the existing framer-motion transition smoothness.
* The visual fixes should apply correctly in both Light and Dark themes.
