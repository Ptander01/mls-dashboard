# Sprint 2: Attendance Pane Overhaul — Handoff Document

**Date:** March 16, 2026
**Repository:** [Ptander01/mls-dashboard](https://github.com/Ptander01/mls-dashboard)
**Branch:** `main`

---

## Summary

Sprint 2 focused entirely on the **Attendance tab**, overhauling both the bar chart and trend chart with significant visual and interaction improvements. The bar chart received deemphasize-on-click behavior, toggle animation between Absolute and Fill Rate modes, and a new `Extruded3DBarFillRate` shape with bottom-face offset and 3D braille capacity dots. The trend chart was completely rebuilt as a **3D area polygon** with a matte playdough/clay aesthetic, smooth Catmull-Rom spline curves, variable braille range envelope (max and min lines), and proper tooltip support.

---

## Commits (Chronological)

| Commit | Description |
|--------|-------------|
| `c54d8b6` | Sprint 2 Attendance polish: bar chart Y-axis height increase, fill rate bar offset + braille capacity dots, top shadow artifact fix, trend line shadow + area fill removal, deemphasize-on-click behavior |
| `f9801a3` | Sprint 2: bar chart toggle animation, 3D ribbon line chart with gradient/shadow, braille capacity dots on trend, removed redundant avg line |
| `6e31c92` | Sprint 2: 3D area polygon trend chart, variable braille range envelope (max/min lines), smooth Catmull-Rom splines, matte bevel fix |
| `30f9c37` | Sprint 2: smooth Catmull-Rom braille lines, fix bevel bleed, add SPRINT2_HANDOFF.md |
| `3a906bd` | Sprint 2: remove data point dots from area chart, add bottom-face offset for 3D effect |

---

## Feature 1: Bar Chart Enhancements

### 1.1 Increased Chart Height
**Files modified:** `Attendance.tsx`

Default bar chart container height increased from 320px to 400px, making bars visually taller and better utilizing screen real estate.

### 1.2 Extruded3DBarFillRate — New Shape Component
**Files modified:** `chartUtils.tsx`

Created a new `Extruded3DBarFillRate` component that applies the same bottom-face offset technique as `Extruded3DBarWithCeiling`. The bars now sit ON the X-axis line instead of the 3D extrusion bleeding through it. Additionally, this shape renders **3D braille dots at the 100% capacity line** — each dot has a radial gradient, specular highlight, and elliptical cast shadow, matching the ceiling markers on the absolute chart.

### 1.3 Top Shadow Artifact Fix
**Files modified:** `chartUtils.tsx`

Reduced the top-face parallelogram `fillOpacity` from 0.3–0.35 down to 0.18 on both `Extruded3DBar` and `Extruded3DBarWithCeiling`, eliminating the faint, out-of-place shadow artifact at bar tops.

### 1.4 Deemphasize-on-Click Behavior
**Files modified:** `Attendance.tsx`

When a bar is clicked, the selected bar retains its team color while all other bars transition to a muted gray (`#e8e8e8` light / `#2a2a2a` dark). The chart does NOT re-animate on click — `isAnimationActive` is set to `false` after the initial 600ms render. Clicking the same bar again clears the selection and restores all colors. This behavior works in both Absolute and Fill Rate modes.

### 1.5 Toggle Animation (Absolute ↔ Fill Rate)
**Files modified:** `Attendance.tsx`

When toggling between Absolute and Fill Rate modes, the `animKey` counter increments, triggering Recharts' built-in 700ms ease-in-out bar height animation. The animation is suppressed during team click interactions (only colors change).

---

## Feature 2: 3D Area Polygon Trend Chart

### 2.1 Area3DPolygon — Custom SVG Renderer
**Files modified:** `Attendance.tsx`

The trend chart was completely rebuilt from a simple Recharts `LineChart` to a custom SVG-based **3D area polygon** rendered via Recharts' `<Customized>` component. Key characteristics:

- **Smooth Catmull-Rom spline curves** — The top edge uses Catmull-Rom interpolation (tension 0.3) for organic, rounded transitions between data points. No jagged linear segments.
- **Matte gradient fill** — Top-to-bottom linear gradient (lighter top surface → darker bottom) implying physical depth. No glossy or specular highlights.
- **Side extrusion face** — Right-side parallelogram with darkened fill creates the illusion of a thick 3D slab.
- **Cast shadow** — SVG `<filter>` with `feGaussianBlur` (stdDeviation 6) + `feOffset` (dy: 10) creates a deep shadow below the polygon, implying elevation above the chart surface.
- **Bevel highlight strip** — A thin strip along the top edge (offset 1.5px upward) with reduced opacity (0.5) creates a subtle rounded-bevel effect. The reverse path uses proper Catmull-Rom spline (not straight lines) to prevent watercolor-like bleeding.
- **Data point dots** — Small white circles with colored borders at each data point, with tiny specular highlights.

### 2.2 Mode 1: League Average (Default)
When no team is selected, the chart shows a single teal-blue 3D area polygon representing the league-wide average attendance per matchweek.

### 2.3 Mode 2: Single Team Drill-Down
When a team is selected (via bar click or dropdown), the team's actual attendance renders as the primary 3D area polygon in that team's color, while the league average appears as a dashed ghost outline behind it for comparison. The Y-axis domain adjusts to fit the team's data range.

### 2.4 Removed Redundant Average Line
When showing the league-wide average (no team selected), the dashed average guide line is no longer shown since the area polygon itself IS the average.

---

## Feature 3: Variable Braille Range Envelope

### 3.1 BrailleVariableLine — Custom Component
**Files modified:** `Attendance.tsx`

Created a `BrailleVariableLine` component that renders 3D braille dots along a **variable curve** (not a flat horizontal line). Dots are interpolated at 8px spacing along a Catmull-Rom spline that follows the per-week data values.

Each dot features:
- Radial gradient (white center → colored edge) for 3D sphere illusion
- Specular highlight (tiny white circle offset to upper-left)
- Elliptical cast shadow (blurred, offset below)

### 3.2 Max Braille Line (Floating Above)
Traces the per-week **maximum attendance** values. These dots follow a smooth curve that peaks during high-attendance weeks. They float in the air space above the area polygon, creating the top boundary of the range envelope.

### 3.3 Min Braille Line (Resting on Surface)
Traces the per-week **minimum attendance** values. These white dots sit on top of or just above the raised area surface, creating the tactile effect of beads resting on clay. This forms the bottom boundary of the range envelope.

### 3.4 Three-Layer Elevation Model
The chart now has three distinct elevation layers:
1. **Max dots** — floating above (gray, top of range)
2. **Average area polygon** — middle surface (team-colored or teal)
3. **Min dots** — resting on surface (white, bottom of range)

When a team is selected, all three layers become team-specific (actual max/min/avg game attendance per week).

---

## Feature 4: Tooltip & Reference Lines

### 4.1 Custom Tooltip
The tooltip displays:
- **League view:** Week number, Avg Attendance (highlighted in team color), Max, Min
- **Team view:** Week number, Team Attendance (highlighted), League Avg (for comparison)

### 4.2 Right-Side Labels
The max and min braille lines have right-aligned labels ("Max" and "Min") positioned at the last data point's Y-coordinate for context.

---

## Exported Utility Functions

The following functions were exported from `chartUtils.tsx` for reuse:
- `lighten(hex, amount)` — Lighten a hex color
- `darken(hex, amount)` — Darken a hex color
- `hexToRgba(hex, alpha)` — Convert hex to rgba string

---

## Architecture Patterns Established

### Custom SVG via Recharts `<Customized>`
The `Area3DPolygon` and `BrailleVariableLine` components demonstrate a pattern for rendering complex custom SVG graphics within Recharts charts. They access Recharts' internal `xAxisMap` and `yAxisMap` to convert data values to pixel coordinates, then render entirely custom SVG elements. This pattern can be reused for future chart types.

### Catmull-Rom Spline Utility
The `catmullRomPoint` function (defined inline in `Attendance.tsx`) implements Catmull-Rom interpolation with configurable tension. It's used by both the area polygon top edge and the braille variable lines. Consider extracting to `chartUtils.tsx` if needed elsewhere.

### Deemphasize Pattern
The bar chart deemphasize pattern (selected bar keeps color, others go gray) is implemented via a `selectedTeam` state that's checked in the `shape` prop callback. The `Extruded3DBarWithCeiling` and `Extruded3DBarFillRate` components accept `fill` and `sideColor` overrides to support this.

---

## Known Issues / Remaining Polish

1. **Area chart playdough texture** — The current matte gradient is clean but could benefit from more ambient occlusion at the edges (where the area meets the baseline) for a more pronounced clay/putty feel. The inspiration images show very soft, diffuse lighting with no harsh edges anywhere.

2. **Bevel highlight** — Reduced to 0.5 opacity but could potentially be further refined. Some users may still perceive slight bleed on certain screen resolutions.

3. **Dark mode** — All changes tested in light mode only. The area polygon gradients, braille dot colors, and deemphasize grays should be verified in dark mode.

4. **Multi-team compare mode** — The "COMPARE" button is present in the UI but Mode 3 (layered translucent area polygons for 2-5 teams) is not yet implemented. Architecture is ready — `Area3DPolygon` supports `layerOffset` and `opacity` props.

5. **Bar chart reorder animation** — Deferred to backlog. `@react-spring/web` is installed. See BACKLOG.md for implementation notes.

---

## File Change Summary

| File | Changes |
|------|---------|
| `Attendance.tsx` | Complete trend chart rebuild (Area3DPolygon, BrailleVariableLine, BrailleReferenceDots), bar chart height increase, deemphasize-on-click, toggle animation, fill rate shape swap, tooltip rewrite, reference line updates |
| `chartUtils.tsx` | New `Extruded3DBarFillRate` component, top-face opacity fix on `Extruded3DBar` and `Extruded3DBarWithCeiling`, exported `lighten`/`darken`/`hexToRgba` |
| `BACKLOG.md` | Added bar chart reorder animation and multi-team area chart compare mode to Future/Deferred section |
| `package.json` | Added `@react-spring/web` dependency (for future bar chart reorder animation) |

---

## Next Sprint Recommendations

1. **Travel Map Performance Section (Epic 5)** — The user has expressed strong interest in overhauling the Travel Map tab next. This is a 2-session epic covering resilience data layer, dumbbell chart, scatter plot, resilience index bar, radar cards, and deep dive panel. Recommend using Three.js for the 3D visualizations per user preference.

2. **Multi-team area chart compare mode** — Quick win to implement Mode 3 in the trend chart since the architecture is already in place.

3. **Gravitational Pull chart polish** — Epic 2 tasks from the backlog (pottery focus refinement, insight headline updates).
