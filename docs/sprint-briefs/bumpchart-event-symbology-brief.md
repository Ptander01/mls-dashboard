# Sprint Brief: BumpChart Event Symbology (Faux-3D Breach Effect)

## Objective
Enhance the `BumpChart` component on the Season Pulse tab to support an **"Event View" mode**. Currently, the chart uses a team-based 3D focus system (when a team is selected, their entire line becomes a 3D tube with shadow/glow, while other teams de-emphasize to flat 2D lines). 

This sprint will shift that paradigm when event filters are active: instead of highlighting an entire team's strand, the chart will apply the 3D elevation effect *only* to the specific line segments where filtered events occurred. This creates a visual metaphor of events "breaching the surface" of the baseline 2D chart.

## Core Mechanics

### 1. The "Breach" Effect (Faux-3D SVG)
The BumpChart currently uses a `TeamLine` component to render full team paths using monotone cubic interpolation (`monotoneCubicPath`).
- **Current state:** The entire path is rendered as either a flat `<path>` or a layered 3D tube (shadow layer + base layer + specular highlight layer).
- **New state (Event View):** When an event occurs for a team at Week $N$, the line segment connecting Week $N-1$ to Week $N+1$ should receive the 3D tube treatment. The rest of the team's line remains flat 2D.
- **Implementation strategy:** You will likely need to split the `pathD` string into segments or use `stroke-dasharray` / `stroke-dashoffset` tricks, OR render the 3D layers only for the bounding weeks of an event.

### 2. Symbology Rules
When the user toggles Event View mode (e.g., by activating an event filter):
- **Baseline:** All strands start flat/2D.
- **Elevation:** Only segments surrounding a filtered event (e.g., an "Upset") get the 3D elevation.
- **Color Emphasis:** Teams that have *zero* events matching the active filters go fully monochrome (desaturated, low opacity, no background tab color).
- **Color Retention:** Teams that *do* have matching events keep their team color, but only their event segments are 3D.

### 3. Filter State Integration
- The `SeasonTimeline.tsx` component currently holds the `activeFilters` state for event categories (Streaks, Rank Changes, Upsets, Milestones).
- **Architecture change:** This state needs to be lifted up to the parent `SeasonPulse.tsx` component so it can be passed down to *both* `SeasonTimeline` and `BumpChart`.
- The `BumpChart` will use these filters to determine which events to visualize as 3D breaches.

## Required Changes

### `client/src/components/tabs/SeasonPulse.tsx`
- Lift the `activeFilters` state from `SeasonTimeline` into this file.
- Pass `activeFilters` and `onToggleFilter` down to `SeasonTimeline`.
- Pass `activeFilters` down to `BumpChart`.

### `client/src/components/charts/SeasonTimeline.tsx`
- Remove local `activeFilters` state.
- Accept `activeFilters` and `onToggleFilter` as props from `SeasonPulse`.

### `client/src/components/charts/BumpChart.tsx`
- Accept `activeFilters` as a prop.
- Modify the `TeamLine` component (or create an `EventSegmentLine` component) to support partial-path 3D rendering.
- Implement the monochrome desaturation logic for teams without active events.
- *Hint:* Look at how `TeamLine` currently renders the 3D tube using `darken()` and `lighten()` with translated paths. You will need to apply this selectively to path segments.

## Success Criteria
1. Toggling an event filter in the timeline header instantly updates the BumpChart.
2. Teams without the selected event type become desaturated/monochrome.
3. Teams with the selected event type retain color, but only the segment surrounding the event (e.g., Week 2 to Week 4 for a Week 3 event) appears as a 3D tube.
4. The transition between normal team-focus mode and event-focus mode is smooth.
5. TypeScript compiles cleanly with no new errors.

## Context Notes
- The app uses Vite + React + Tailwind + Framer Motion.
- The BumpChart is a custom SVG implementation, not a Recharts component.
- The 3D effect is achieved using multiple SVG `<path>` elements with `transform="translate(...)"` and `strokeWidth` variations. Do not attempt to use Three.js or WebGL for this specific feature; stick to the established faux-3D SVG pattern.
