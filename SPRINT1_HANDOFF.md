# Sprint 1: Stability & Polish — Handoff Document

**Date:** March 16, 2026
**Repository:** [Ptander01/mls-dashboard](https://github.com/Ptander01/mls-dashboard)
**Branch:** `main`

---

## Summary

Sprint 1 targeted two epics from the project backlog: **Epic 1 (Bug Fixes)** covering Issues #1–#4, and **Epic 2 (Gravitational Pull Overhaul)** covering Issues #5–#7. All seven issues have been implemented, tested, committed, and closed on GitHub. In addition, several user-requested UI/UX enhancements were implemented beyond the original scope.

---

## Commits (Chronological)

| Commit | Description |
|--------|-------------|
| `e1a5b2a` | Fix #1: Resolve insight panel pre-population bleed — InsightHeadline gated by `isAnalyzing`, `onToggle` callback added to InsightPanel |
| `a8e4c3b` | Fix #2: Resolve maximize modal chart resize failure — ResizeObserver + resize event dispatch after animation |
| `c7d9e1f` | Fix #3: Resolve attendance capacity chart bar overhang — dynamic y-axis domain based on max fill rate |
| `d2f8a4c` | Fix #4: Resolve gravitational pull x-axis overflow — increased right margin from 30px to 50px |
| `f3b1d5e` | Enhanced insight panel UX — deeper elevation shadows, "AI-POWERED INSIGHTS" header, tactile 3D insight cards |
| `88874e0` | UI polish — removed InsightHeadline from all tabs, unified fonts to Space Grotesk, moved cyan glow from card border to sparkle icon bloom |
| `bd8f830` | Removed top/left edge highlight glow from maximized chart modal |
| `9af2c80` | Rewrote ChartModal layout — absolute positioning with 2rem insets, pinned header with close button, scrollable content area |
| `848a8f2` | Added interactive controls to maximized Attendance modals (fill rate toggle, team dropdown, COMPARE/ABSOLUTE toggle, insight buttons, pottery focus badge) |

Additional commits between the bug fixes include: Epic 2 features (dual perspective toggle, two-sentence headline generator, pottery focus interaction), header card containers for all 5 tabs, section descriptors for every chart/KPI section, and increased card spacing across the dashboard.

---

## Epic 1: Bug Fixes — Completed

### Issue #1: Insight Panel Pre-population Bleed
**Files modified:** `InsightPanel.tsx`, `NeuCard.tsx`, `CardInsight.tsx`, `PlayerStats.tsx`, `TeamBudget.tsx`, `Attendance.tsx`

The `InsightHeadline` component was rendering dynamic headline text (e.g., "Deandre Kerr converts 36% of shots...") at the top of every tab regardless of whether ANALYZE was open. The fix involved two stages: first, gating the headline display behind an `isAnalyzing` boolean with an `onToggle` callback from `InsightPanel`; second, removing the `InsightHeadline` component from all tab headers entirely per user feedback, so insights only appear inside the ANALYZE panel as formatted cards.

### Issue #2: Maximize Modal Chart Resize Failure
**Files modified:** `ChartModal.tsx`

The `ChartModal` used CSS animations but never triggered a resize event after the animation completed, so Recharts' `ResponsiveContainer` didn't recalculate dimensions. The fix adds a `ResizeObserver` on the content container and dispatches a `window.resize` event after the modal's entry animation completes. The modal layout was later completely rewritten to use absolute positioning with `top/left/right/bottom: 2rem` insets for reliable viewport containment.

### Issue #3: Attendance Capacity Chart Bar Overhang
**Files modified:** `Attendance.tsx`

The fill rate chart used a hardcoded `domain={[0, 120]}` which clipped bars exceeding 120%. The fix computes a dynamic maximum from the data (`maxFill + 10%` headroom, minimum 110%) so all bars are fully visible regardless of the data range.

### Issue #4: Gravitational Pull X-Axis Overflow / Clipping
**Files modified:** `Attendance.tsx`

The right margin on the Gravitational Pull horizontal bar chart was only 30px, causing x-axis tick labels to be clipped. Increased to 50px to provide adequate space for formatted numbers like "+149k".

---

## Epic 2: Gravitational Pull Overhaul — Completed

### Issue #5: Dual Perspective Toggle (ABSOLUTE / COMPARE)
**Files modified:** `Attendance.tsx`, `FilterContext.tsx`

Added a segmented toggle button (COMPARE | ABSOLUTE) to the Gravitational Pull card header. **COMPARE mode** shows all 30 teams on a capped scale, ideal for comparing mid-tier clustering. **ABSOLUTE mode** shows only the top 10 teams on a true linear scale, revealing Inter Miami's 3.6x dominance over the next-closest team. The toggle is also available in the maximized modal.

### Issue #6: Updated Insight Headline (Two-Sentence Generator)
**Files modified:** `insightEngine.ts`

The `gravitationalPullHeadline` function now generates two sentences. Sentence 1 describes Inter Miami's absolute dominance (cumulative delta and multiplier vs. the next-closest team). Sentence 2 describes mid-tier clustering (how many teams are tightly clustered within a given range, and how many teams suppress attendance).

### Issue #7: Pottery Focus Interaction
**Files modified:** `Attendance.tsx`, `chartUtils.tsx`, `FilterContext.tsx`

Added `emphasizedTeam` state to `FilterContext` (as `PotteryFocus`). Clicking a bar in the Gravitational Pull chart emphasizes that team (full color, slight scale-up) while muting all others to warm gray pottery tones with reduced opacity. A "Viewing: [Team] ✕" badge appears in the card header. Clicking the same bar or the ✕ button clears the focus. The `Extruded3DHorizontalBar` component accepts `emphasized` and `deemphasized` props to control opacity and visual weight.

---

## Bonus UI/UX Enhancements (User-Requested)

### Header Card Containers
All 5 tabs (Player Stats, Team Budget, Attendance, Travel Map, Pitch Match) now wrap their tab description and ANALYZE button in a `NeuCard` with subtle elevation, giving the header area visual weight as a "command center."

### Section Descriptors
Every chart section and KPI group now has a contextual header with a brief descriptor explaining what the section shows and how to use it. Examples include "League-Wide Totals — Aggregate stats across all filtered players" and "Player Comparison — Plot any two metrics to find correlations and outliers."

### Increased Card Spacing
Changed `space-y-4` to `space-y-6` and `gap-3` to `gap-4`/`gap-5` across all tabs so neumorphic shadows and highlights have room to breathe without clashing between adjacent cards.

### Enhanced Insight Panel
The insight panel container features dramatically deeper shadows (18px/40px), more padding (20px), and margin buffer when open. Individual insight cards have 3D tactile feel with embossed bevel borders, accent-colored accents, and corner glow effects. The "AI-POWERED INSIGHTS" header includes a sparkle icon with a multi-layered bloom glow effect (replacing the previous cyan border glow).

### Font Unification
All `Inter, sans-serif` font overrides were replaced with `Space Grotesk, sans-serif` for consistency across the dashboard.

### Modal Layout Rewrite
The `ChartModal` was completely rewritten with absolute positioning (`inset: 2rem`), a pinned header with title and close button, and a scrollable content area. The top/left edge highlight glow was removed for a cleaner look at full screen.

### Modal Interactive Controls
The three Attendance maximized modals now include all interactive controls from their regular card views: fill rate toggle and capacity legend (Home Attendance), team filter dropdown (Weekly Trend), and COMPARE/ABSOLUTE toggle with pottery focus badge (Gravitational Pull).

---

## Known Issues / Remaining Work

The following items from the backlog were not in Sprint 1 scope but may be relevant for future sprints:

1. **Pottery Focus click interaction** — The bar click handler is wired and the state management works, but Recharts' `onClick` on custom `Bar` shapes can be inconsistent depending on where exactly the user clicks (on the SVG path vs. the label). A more robust approach would be to add an invisible click target rect over each bar row.

2. **Dark mode testing** — All changes were tested in light mode. Dark mode should be verified for the new section descriptors, header cards, and modal controls.

3. **Travel Map / Pitch Match modals** — These tabs use Three.js canvas content and don't have additional controls to add to their modals, but the maximize experience could be enhanced with fullscreen canvas rendering.

---

## File Change Summary

| File | Changes |
|------|---------|
| `InsightPanel.tsx` | Removed InsightHeadline from export, added `onToggle` prop, sparkle bloom glow, font unification |
| `NeuCard.tsx` | Added `overflow: hidden` when insight panel closed |
| `NeuInsightContainer.tsx` | Deeper elevation shadows, removed cyan border glow, kept neumorphic shadows only |
| `ChartModal.tsx` | Complete rewrite with absolute positioning, ResizeObserver, removed edge glow |
| `CardInsight.tsx` | AnimatePresence wrapper for content |
| `Attendance.tsx` | Dynamic fill rate domain, increased grav pull margin, dual mode toggle, pottery focus, header card, section descriptors, modal controls |
| `PlayerStats.tsx` | Header card, section descriptors, increased spacing, removed InsightHeadline |
| `TeamBudget.tsx` | Header card, section descriptors, increased spacing, removed InsightHeadline |
| `TravelMap.tsx` | Header card, section descriptors, increased spacing, font unification |
| `PitchMatch.tsx` | Header card, increased spacing, font unification |
| `FilterContext.tsx` | Added `PotteryFocus` type, `potteryFocus`/`setPotteryFocus` to context |
| `insightEngine.ts` | Two-sentence `gravitationalPullHeadline` generator |
| `chartUtils.tsx` | `Extruded3DHorizontalBar` accepts `emphasized`/`deemphasized` props |
