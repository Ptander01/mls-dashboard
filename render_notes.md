# Render Verification Notes

## Chart A — Dumbbell Gap (visible in light mode)
- Title "Home vs Away Points Per Game" renders correctly
- Toggle buttons: H/A | TEAM and PPG | WIN% | GD all visible and styled with neu-pressed/neu-raised
- Legend shows Home (green circle) and Away (red circle) labels
- Grooved inset tracks visible as horizontal rails across each row
- Colored fill visible between the two knob endpoints
- 3D knob endpoints render with green (home) and red (away) outer rings
- Cross-hatch texture visible on the knobs
- Gap values (+1.77, +1.24, etc.) shown on the right in cyan
- Teams sorted by gap magnitude: NY Red Bulls at top, NE Revolution near bottom
- Team color dots and short names on the left

## Chart C — Resilience Index (visible in light mode)
- Title "Travel Resilience Index — All 30 Teams" renders correctly
- Toggle buttons: INDEX | COMPONENTS visible
- Column headers: TEAM, RESILIENCE SCORE, SCORE, MILES
- Horizontal capsule bars with tier coloring:
  - Green bars for top teams (FC Cincinnati, San Diego FC)
  - Cyan bars for middle tier
  - Amber/yellow for lower
  - Red for bottom teams
- Score values and miles shown on the right
- Bars have 3D extruded capsule look with gradient and shadow

## Both charts render side-by-side in the xl:grid-cols-2 layout
## CardInsight toggle buttons visible in both card headers
## Section header "Performance & Resilience Analysis" renders above both cards
