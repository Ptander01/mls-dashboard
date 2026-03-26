# Data Visualization Animation Strategy

Animations transform a dashboard from a static reporting tool into an interactive storytelling experience. Based on the provided references (React Graph Gallery, SciChart, Syncfusion), this strategy defines how we will implement high-performance, purposeful animations across the MLS Analytics Dashboard using our existing stack (`framer-motion` and SVG/D3 math), avoiding the bloat of new heavy dependencies.

## 1. Bar Chart Data Transitions (Rank Reordering)
**Reference:** [React Graph Gallery: Barplot Data Transition](https://www.react-graph-gallery.com/example/barplot-data-transition-animation)
**Target Component:** Power Rankings Bump Chart & Gravitational Pull

**The Concept:**
When data changes (e.g., scrubbing through matchweeks), bars should not just instantly snap to new lengths. They should smoothly interpolate their width/height *and* smoothly animate their Y-position if their rank order changes.

**Implementation Plan:**
- Use `framer-motion`'s `<motion.rect>` instead of `react-spring` (to keep our dependency tree clean, as we already use framer-motion heavily).
- Key the elements by team ID (`key={team.id}`) so framer-motion knows which bar is which across renders.
- Use `layout` prop on the SVG elements to automatically animate position changes when sorting order updates.
- Set a spring transition: `transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}` to give it a physical, non-linear feel without being overly bouncy.

## 2. Scatter Plot Hover & Group Isolation
**Reference:** [React Graph Gallery: Scatter Plot Hover](https://www.react-graph-gallery.com/scatter-plot#real%20life)
**Target Component:** Travel Scatter (Relief Scatter) & Salary vs Performance Scatter

**The Concept:**
In dense scatter plots, hovering over one point should make it pop, while simultaneously dimming unrelated points to reduce visual noise.

**Implementation Plan:**
- Create a local state `hoveredTeam` in the chart component.
- On `onMouseEnter` of a point, set the state.
- For all other points, dynamically reduce opacity (e.g., to `0.2`) and drop saturation.
- If a point belongs to the same "group" (e.g., same conference or same tier), keep it at partial opacity (e.g., `0.6`) while the rest drop to `0.2`.
- Render the tooltip as an absolute-positioned HTML `<div>` overlaying the SVG, using the exact mouse coordinates, rather than trying to build SVG tooltips.

## 3. The Morphing Shape Transition (Pie to Bar)
**Reference:** [React Graph Gallery: Pie to Barplot](https://www.react-graph-gallery.com/donut#barplot%20transition)
**Target Component:** Squad Age Distribution (Deep Dive Panel)

**The Concept:**
Transitioning between two fundamentally different chart types (radial to linear) provides a massive "wow factor" and helps users understand that the underlying data is identical, just viewed through a different lens.

**Implementation Plan:**
- Use the `flubber` library to interpolate between SVG path strings.
- Target the Squad Age Distribution: start with a donut chart showing the league average age breakdown (U23, Prime, Veteran).
- When the user clicks "Compare Teams", use `flubber` and `framer-motion` to morph the radial donut slices into stacked horizontal bars for all 30 teams.
- This requires computing both the `d3.arc()` paths and the `d3.rect()` paths, and passing them to `flubber.interpolate()`.

## 4. Staggered Entrance Animations
**Reference:** [Syncfusion Animated Columns](https://www.syncfusion.com/react-components/react-charts/chart-types/bar-chart)
**Target Component:** All initial chart loads (Attendance, Travel, Budget)

**The Concept:**
Charts should not appear instantly on page load. They should build themselves.

**Implementation Plan:**
- Use `framer-motion`'s `variants` and `staggerChildren`.
- For bar charts: bars grow from the 0-axis outward.
- For the Dumbbell chart: the connecting line draws itself (`pathLength: 1`), then the home/away dots pop in (`scale: 1`).
- Stagger the entrance so the highest value bar loads first, cascading down to the lowest, drawing the user's eye to the most important data point immediately.

---

## Required Dependencies
We will stick to our existing stack where possible:
- `framer-motion` (already installed)
- `d3-shape`, `d3-scale` (already installed)
- **New addition:** `flubber` (for the complex pie-to-bar path morphing only).

## Phased Rollout (GitHub Issues)
This strategy will be broken down into three specific GitHub Issues to be tackled in an upcoming "Animation Polish" sprint.
