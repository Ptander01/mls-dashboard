# Sprint Brief: Dumbbell Chart Polish

**Issues:** #64 (Sizing), #65 (Visual Contrast), #66 (Interpretation Text)
**File:** `client/src/components/charts/DumbbellChart.tsx`
**Container:** Rendered inside `<NeuCard className="p-5">` in `TravelMap.tsx` (~line 1525)
**Dependencies:** `ChartHeader.tsx`, `resilienceUtils.ts`, `chartUtils.ts` (lighten/darken/hexToRgba)

---

## Context

The Dumbbell Chart is a horizontal chart showing Home vs Away performance gaps for all 30 MLS teams. It uses custom SVG with neumorphic grooved tracks and brushed chrome knob endpoints. It already has a `ChartHeader` integration (from Issue #67) with description and methods text. This sprint polishes three areas: sizing consistency, visual contrast, and richer interpretation text.

**Current dimensions (hardcoded):**
- `chartWidth = 1200` (SVG viewBox width)
- `rowHeight = 38`
- `trackHeight = 7`
- `knobRadius = 10`
- `marginLeft = 160`, `marginRight = 70`, `marginTop = 40`
- `height` prop defaults to `700` but is unused (SVG height is computed from row count)
- Team name font: `11.5px Space Grotesk`
- Tick font: `9.5px JetBrains Mono`

**Current toggle structure:**
- Symbology: `H/A` | `TEAM` (neumorphic pressed/raised buttons)
- Metric: `PPG` | `WIN%` | `GD` (neumorphic pressed/raised buttons)
- Both toggle groups are in `rightAction` slot of `ChartHeader`

---

## Issue #64: Sizing Consistency

### Problem
The chart is significantly larger than surrounding Travel tab components (Scatter, Treemap, Radar Cards). With 30 rows at `rowHeight=38`, the SVG is ~1200px tall, dwarfing adjacent charts.

### Changes Required

1. **Reduce row height** from `38` to `28-30`. This is the single biggest lever. At 30 rows × 28px = 840px + margins ≈ 880px total, which is much more proportional.

2. **Reduce knob radius** from `10` to `7-8`. The knobs need to scale with the tighter rows.

3. **Reduce track height** from `7` to `5-6`. Keep proportional to knobs.

4. **Reduce team name font** from `11.5px` to `10-10.5px`. Still legible but tighter.

5. **Reduce tick font** from `9.5px` to `8.5-9px`.

6. **Consider max-height with scroll** as a fallback: wrap the SVG container in a `max-h-[600px] overflow-y-auto` div. This way the chart never exceeds a reasonable viewport proportion. However, scrolling inside a chart is generally bad UX — prefer tightening the rows first.

7. **Test at multiple widths.** The SVG uses `viewBox` with `width="100%"` and `preserveAspectRatio="xMidYMin meet"`, so it scales responsively. The key is that the aspect ratio doesn't get too tall/narrow on smaller screens.

### Specific Code Changes
```tsx
// Before
const rowHeight = 38;
const trackHeight = 7;
const knobRadius = 10;

// After
const rowHeight = 28;
const trackHeight = 5;
const knobRadius = 7.5;
```

Also reduce `marginLeft` from `160` to `130-140` (team names will be smaller) and `marginTop` from `40` to `30`.

---

## Issue #65: Visual Contrast & Neumorphic Depth

### Problem
Four specific visual issues:

### 65a: Toggle Icon Contrast
The H/A and TEAM toggle buttons don't have enough visual distinction between active and inactive states. The `neu-pressed` and `neu-raised` CSS classes handle the shape, but the color contrast is insufficient.

**Fix:** When a toggle is active (`symbology === s` or `mode === m`), add a stronger text color and a subtle background tint:
```tsx
// Active state — increase contrast
symbology === s
  ? "neu-pressed text-cyan font-bold"
  : "neu-raised text-muted-foreground/50 hover:text-foreground"
```

Also increase the shadow depth on toggle buttons. Currently using generic `neu-pressed` / `neu-raised` classes. Add inline `boxShadow` overrides for deeper neumorphic feel:
```tsx
style={{
  boxShadow: symbology === s
    ? isDark
      ? "inset 2px 2px 5px rgba(0,0,0,0.5), inset -2px -2px 4px rgba(60,60,80,0.08)"
      : "inset 2px 2px 5px rgba(0,0,0,0.12), inset -2px -2px 4px rgba(255,255,255,0.5)"
    : isDark
      ? "2px 2px 5px rgba(0,0,0,0.4), -2px -2px 4px rgba(60,60,80,0.06)"
      : "2px 2px 5px rgba(166,170,190,0.3), -2px -2px 4px rgba(255,255,255,0.7)",
}}
```

### 65b: Color Bar Between Toggles (Light Mode)
In light mode, the fill color between the home and away knobs is too washed out. Currently:
```tsx
fillColor: isDark ? "#3a8a9a" : "#5aacbc",
```

**Fix:** Darken the light mode fill to something richer:
```tsx
fillColor: isDark ? "#3a8a9a" : "#2d8090",
```

### 65c: Grooved Track Inset Direction
The `GroovedTrack` component's inner shadow currently reads as extruded (raised bump) instead of recessed (inset channel). The issue is the shadow/highlight direction in the SVG filter.

**Fix:** In the `GroovedTrack` component, swap the `feOffset` directions:
```tsx
// Current (reads as raised):
<feOffset dx="1.5" dy="1.5" result="darkOffset" />   // dark shadow bottom-right
<feOffset dx="-1" dy="-1" result="lightOffset" />     // light highlight top-left

// Fixed (reads as recessed/inset):
<feOffset dx="-1.5" dy="-1.5" result="darkOffset" />  // dark shadow top-left
<feOffset dx="1" dy="1" result="lightOffset" />        // light highlight bottom-right
```

Also invert the vertical gradient on the groove background:
```tsx
// Current:
<stop offset="0%" stopColor={isDark ? "#111120" : "#c8c8d4"} />  // darker on top
<stop offset="100%" stopColor={isDark ? "#1e1e30" : "#dcdce8"} /> // lighter on bottom

// Fixed (recessed = lighter on top, darker on bottom):
<stop offset="0%" stopColor={isDark ? "#1e1e30" : "#dcdce8"} />  // lighter on top
<stop offset="100%" stopColor={isDark ? "#111120" : "#c8c8d4"} /> // darker on bottom
```

---

## Issue #66: Interpretation Text & Metric Explanations

### Problem
The chart looks impressive but doesn't communicate its message at a glance. Users admire the graphics without being impacted by the takeaways.

### 66a: ChartHeader Description Enhancement
The current description is good but can be enriched. Update the `description` prop to include the "expected pattern" and "how to spot outliers" guidance:

```tsx
description={
  <>
    How big is each team's{" "}
    <strong className="text-foreground/80">home-field advantage</strong>
    ? Each row compares what a club earns at home versus on the road —
    the wider the colored bar, the more they rely on their own fans.{" "}
    <strong className="text-foreground/80">Most teams play better at home</strong>
    , so you'd expect the green knob to sit right of the red. Teams where
    the gap is tiny — or reversed — are unusually resilient road warriors.
    Toggle between metrics to see the split from different angles.
  </>
}
```

### 66b: Dynamic Metric Context Below Description
Add a small contextual line that changes based on the active metric toggle. Place this between the `ChartHeader` and the legend, or integrate it into the description dynamically:

```tsx
const metricContext: Record<MetricMode, string> = {
  "PPG": "Points Per Game — the most balanced measure. A 0.5+ gap means a team earns roughly 1.5 more points per home match than away.",
  "WIN%": "Win percentage strips out draws, showing pure win frequency. Teams with high Win% gaps dominate at home but struggle to close out games on the road.",
  "GD": "Goal Difference per game reveals dominance vs. scrappy results. A team can have similar PPG home and away but wildly different GD if they win big at home and squeak by on the road.",
};
```

Render this as a subtle text line below the description:
```tsx
<p className="text-[10px] text-muted-foreground/60 mt-1.5 italic"
   style={{ fontFamily: "system-ui, sans-serif" }}>
  {metricContext[mode]}
</p>
```

### 66c: Sort Order Indicator
Currently sorted by `absGap` descending (line 439). Add a visible sort indicator. Options:
1. **Simple label** in the legend area: `"Sorted by gap magnitude (largest first)"`
2. **Sort toggle** letting users switch between: Gap (default), Alphabetical, Conference

Recommendation: Start with the simple label. A sort toggle is nice-to-have but adds complexity. If implementing a toggle, add it to the `rightAction` area as a third button group.

---

## Implementation Order

1. **#64 first** (sizing) — changes dimensions that affect everything else
2. **#65 second** (visual contrast) — adjust shadows/colors within the new dimensions
3. **#66 third** (interpretation text) — content layer on top of the polished visuals

## Testing Checklist
- [ ] All 30 rows legible at new row height
- [ ] No horizontal overflow or text truncation
- [ ] Visually proportional to Scatter, Resilience Index, and Radar Cards on Travel tab
- [ ] Toggle contrast clear in both light and dark mode
- [ ] Grooved track reads as recessed channel (not raised bump)
- [ ] Light mode fill color rich enough to see clearly
- [ ] Metric context text updates on toggle
- [ ] Sort order communicated to user
- [ ] ChartHeader methods panel still works correctly

## Tone Guidance
- **Smart casual** — conversational descriptions that feel like explaining to a friend
- The description should answer the question the viewer already has: "What am I looking at and why should I care?"
- Methods section is for the rigorous reader who wants formulas and definitions
- Metric context line should be brief, informative, slightly editorial (FiveThirtyEight style)
