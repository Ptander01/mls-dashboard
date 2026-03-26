# Sprint Brief: Season Pulse Visual Polish

**Epic:** 1 (Season Pulse)
**Goal:** Refine the visual density, typography, and 3D interactions on the Season Pulse tab (Snapshot Table and Bump Chart).

## 1. Snapshot Table Polish (`SeasonPulse.tsx`)

The current table feels too spread out, lacks tactile depth compared to the Player Database, and the power bars don't take advantage of available horizontal space.

### 1.1 Typography & Headers
- **Change:** Replace header acronyms with full words (e.g., "P" -> "Played", "GD" -> "Goal Diff", "PPG" -> "Points Per Game").
- **Change:** Increase the base font size of the table content by 1-2 steps (e.g., from `text-[11px]` to `text-xs` or `text-sm`).
- **Context:** The table currently uses `font-mono` (`JetBrains Mono`). Keep the font family but scale it up for readability.

### 1.2 Tactile Neumorphic Rows
- **Problem:** The current rows use a flat background color based on tier/hover state.
- **Change:** Apply the existing `.data-table` CSS class pattern from `index.css` to the Season Pulse table.
- **Implementation:** 
  - Change the `<table>` class to include `data-table`.
  - Ensure the `<tr>` elements inherit the `neu-raised` style box-shadows defined in `index.css` (lines 563-589).
  - The rows should appear physically raised from the background, matching the exact aesthetic of the Player Database table.

### 1.3 Expanded Power Bars
- **Problem:** The final column ("Power" or "Pts") has a lot of whitespace, and the `PowerBar` component is hardcoded to `width: "60px"`.
- **Change:** Significantly increase the width of the `PowerBar` container (e.g., to `120px` or `150px`, or use `w-full max-w-[150px]`).
- **Goal:** Make the visual difference between a high score and a low score much more pronounced.

---

## 2. Bump Chart Polish (`BumpChart.tsx`)

The Rank Flow bump chart needs richer 3D rendering for highlighted lines, better tooltip UX, and improved label visibility.

### 2.1 3D Neumorphic Highlighted Lines
- **Problem:** When a team is hovered or clicked, the line simply gets thicker and fully opaque. It still looks like a flat SVG path.
- **Change:** Apply a 3D tube/polyline aesthetic to the highlighted team's path.
- **Implementation Ideas:**
  - Add an SVG `<filter>` with `feDropShadow` to create depth.
  - Render multiple overlapping paths for the highlighted team: a thick dark path offset downward for a cast shadow, a base color path, and a thinner, lighter path offset upward for a specular highlight (simulating a 3D cylinder/tube).
  - *Reference:* See `reference_images/3d-polyline-reference.png`.

### 2.2 Event Tooltip Expansion
- **Problem:** The `EventTooltip` component truncates the description text: `event.description.length > 50 ? event.description.slice(0, 47) + "..." : event.description`.
- **Change:** Remove the truncation. Allow the tooltip to expand vertically to fit the full text.
- **Implementation:** 
  - Switch from rendering SVG `<text>` elements to using a `<foreignObject>` that contains standard HTML `<div>` elements. This allows natural text wrapping and CSS styling.
  - Apply the standard glassmorphic tooltip styling (`var(--glass-bg)`, backdrop blur) to the HTML container.

### 2.3 Persistent Team Labels
- **Problem:** Team labels currently only appear at the very end of the line for *highlighted* teams.
- **Change:** Always show all 30 team labels at the far right edge of the chart (at `xScale(endWeek) + padding`).
- **Animation:** As the user scrubs the timeline or clicks "Play", these labels should smoothly animate up and down the Y-axis to track their team's current rank at `endWeek`.
- **Implementation:** 
  - Remove the `highlightedTeams.map` restriction for rendering endpoint labels.
  - Use `framer-motion` (`<motion.g>`) for the label groups so they smoothly interpolate their `y` position during playback.

### 2.4 Show All Color Lines Option
- **Problem:** Unselected lines are heavily deemphasized (opacity 0.15, neutral color).
- **Change:** Add a toggle (perhaps near the Play controls or ChartHeader) to "Show All Colors" vs "Focus Mode".
- **Implementation:** When "Show All Colors" is active, render all unselected lines using their actual `mutedTeamColor` instead of the neutral gray, perhaps at a medium opacity (e.g., 0.4) so they are visible but still allow a highlighted team to pop.

---

## Acceptance Criteria

- [ ] Table headers use full words instead of acronyms.
- [ ] Table font size is increased for better readability.
- [ ] Table rows have the tactile, raised 3D appearance matching the Player Database.
- [ ] Power bars are significantly wider, utilizing the column's whitespace.
- [ ] Highlighted bump chart lines have a 3D tube/shadow effect.
- [ ] Event tooltips use `<foreignObject>` to display full, wrapped text without truncation.
- [ ] All team labels are visible on the right axis and animate vertically during timeline playback.
- [ ] Users can toggle between seeing all team colors or the default gray deemphasized view.
