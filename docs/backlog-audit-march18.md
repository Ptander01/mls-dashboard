# MLS Analytics Dashboard: Backlog Audit & Prioritization

*Generated March 18, 2026*

This audit reviews the 37 currently open issues (after closing 3 duplicates). They are categorized by type, assigned a Level of Effort (LOE), and ranked by impact. 

## Category 1: New Tabs & Major Features (High Impact, High LOE)

These are the big swings. They require significant architecture work but deliver the highest "wow" factor.

| Issue | Epic | Description | LOE | Impact | Recommendation |
|-------|------|-------------|-----|--------|----------------|
| **#42, #43** | `deckgl-map` | **Deck.gl Travel Map.** Replaces the current 2D SVG map with a 3D WebGL terrain map with animated flight arcs. | High (1 session) | High | **Do this next.** It completes the Travel Tab and is the most visually striking feature left. |
| **#40** | `pitch-data` | **3D Shot Map (PitchMatch Tab).** Render the StatsBomb Inter Miami data on a 3D Three.js pitch. | High (1 session) | High | Do after deck.gl. |
| **#48, #49** | `timeline` | **Season Timeline Scrollytelling.** Vertical spine with narrative event nodes and sticky animated stats. | High (1 session) | High | Save for later. Requires writing narrative copy. |
| **#45, #46** | `power-rankings` | **Power Rankings Bump Chart.** 30 interwoven lines showing rank evolution with k-means tier groupings. | Med (1 session) | Med | Save for later. |
| **#20** | `race-chart` | **Animated Race Chart.** Horizontal bar chart race over time. | Med | Med | Save for later. |

## Category 2: Existing Tab Polish & Completion (Medium Impact, Low LOE)

These issues finish the work you already started on the Travel and Attendance tabs. They are quick wins that make the dashboard feel complete.

| Issue | Epic | Description | LOE | Impact | Recommendation |
|-------|------|-------------|-----|--------|----------------|
| **#36, #37, #38** | `relief-scatter` | **Finish Relief Scatter.** Surface texture, recessed labels, and flood animation for the 3D scatter plot. | Med (0.5 session) | High | **Finish this first.** It's already in progress from Sprint 5B. |
| **#13, #14, #15, #16, #17, #18** | `travel-perf` | **Finish Travel Charts.** Dumbbell chart, Resilience bar, Radar cards, and Deep Dive panel. | Med (1 session) | High | Bundle with deck.gl (#42/#43) to finish the Travel Tab completely. |
| **#8, #9, #10, #11, #12** | `insight-depth` | **Insight Engine & Card Polish.** Add percentile context, three view modes for Attendance trend, and richer DP insights. | Low (0.5 session) | Med | Bundle into a "Data Polish Sprint". |

## Category 3: Animation & Micro-Interactions (High Impact, Low LOE)

You just knocked out the biggest animation wins in the Performance Sprint (#60). Only one stretch goal remains.

| Issue | Epic | Description | LOE | Impact | Recommendation |
|-------|------|-------------|-----|--------|----------------|
| **#58** | `animation` | **Shape Morphing Transition.** Use `flubber` to morph donut chart slices into a stacked bar for Squad Age. | Low | Med | Do as a standalone fun session when you need a break from heavy data work. |

## Category 4: Content & "Build in Public"

| Issue | Epic | Description | LOE | Impact | Recommendation |
|-------|------|-------------|-----|--------|----------------|
| **#44** | `linkedin` | **LinkedIn Post: Scatter Chart Before/After.** Draft a post showcasing the evolution from standard SVG to the 3D Relief Scatter. | Low (15 mins) | High | **Do this as soon as Relief Scatter is done.** Don't wait for perfection. |

## Category 5: Deferred / Side Projects (Out of Scope for Now)

| Issue | Epic | Description | LOE | Impact | Recommendation |
|-------|------|-------------|-----|--------|----------------|
| **#51, #52** | `side-project` | **Messi Career Mode & World Cup Explorer.** 602 matches of StatsBomb data. | Huge | High | Leave labeled as side-project. |
| **#21–#27** | `deferred` | **Hypothesis tests, 3D radar, 2026 data.** | Varies | Low | Keep deferred. |

---

## Recommended Execution Path

Based on the audit, here is the most logical path forward to maintain momentum without getting bogged down:

1. **Sprint 5B Completion:** Finish the Relief Scatter (#36, #37, #38).
2. **The LinkedIn Post:** Draft and post #44. Show off the Relief Scatter. Get some eyes on the project.
3. **Sprint 7 (The Travel Tab Finale):** Bundle deck.gl (#42, #43) with the remaining Travel charts (#13–#18). This will completely finish your second major tab.
4. **Sprint 8 (Pitch Data):** Build the 3D Pitch Match tab (#40) using the Inter Miami data.
5. **Sprint 9 (Scrollytelling):** Build the Timeline Tab (#48, #49).
