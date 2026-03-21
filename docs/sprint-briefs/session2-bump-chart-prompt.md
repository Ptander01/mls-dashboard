# Sprint Prompt: Season Pulse Session 2 — Bump Chart (Issue #75)

## Context

Clone the repo: `gh repo clone Ptander01/mls-dashboard`

Read these files before writing any code:
1. `docs/sprint-briefs/season-pulse-brief.md` — full epic architecture
2. `client/src/lib/seasonPulse.ts` — the data engine (Session 1 deliverable, 780 lines)
3. `client/src/components/tabs/SeasonPulse.tsx` — the tab container (Session 1 deliverable, 810 lines)
4. `client/src/components/charts/DumbbellChart.tsx` — reference for SVG chart patterns, deemphasis system, and neumorphic styling
5. `client/src/components/ui/ChartHeader.tsx` — the reusable header component (title, description, methods, rightAction)
6. `client/src/lib/chartUtils.tsx` — utility functions (`mutedTeamColor`, `hexToRgba`, etc.)

## What Already Exists (Session 1)

The Season Pulse tab is live with Layer 1 (Snapshot Table). The data engine provides everything the bump chart needs:

### Key API Functions (from `seasonPulse.ts`)

```typescript
// Returns the full 30×33 standings matrix (array of 33 arrays, each with 30 TeamWeekStanding objects)
computeWeeklyStandings(): TeamWeekStanding[][]

// Get a single team's trajectory across all weeks
getTeamTrajectory(teamId: string): TeamWeekStanding[]

// Get inflection events for a specific team
getTeamEvents(teamId: string): SeasonEvent[]

// Get all inflection events
detectInflectionEvents(): SeasonEvent[]

// Get max week number
getMaxWeek(): number  // returns 33
```

### TeamWeekStanding Interface (the data each line point needs)

```typescript
interface TeamWeekStanding {
  teamId: string;
  week: number;
  powerRank: number;      // 1-30, what the bump chart y-axis shows
  pointsRank: number;     // alternative rank mode
  powerScore: number;     // 0-100 composite
  tier: "Title Contenders" | "Playoff" | "Bubble" | "Rebuilding";
  rankDelta: number;      // change from previous week
  points: number;
  ppg: number;
  form: ("W" | "D" | "L")[];
  // ... plus wins, draws, losses, GD, home/away splits
}
```

### SeasonEvent Interface (for inflection markers)

```typescript
interface SeasonEvent {
  teamId: string;
  week: number;
  type: "winning_streak" | "losing_streak" | "unbeaten_run" | "winless_run" | "rank_surge" | "rank_collapse" | "upset_win" | "upset_loss" | "milestone";
  severity: number;  // 1-5
  title: string;
  description: string;
}
```

### Shared State in SeasonPulse.tsx (lines 346-358)

The parent component already manages these state variables that the bump chart must consume:

```typescript
const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
const [selectedWeek, setSelectedWeek] = useState<number>(getLatestWeek());
const [conferenceFilter, setConferenceFilter] = useState<ConferenceFilter>("ALL");
const [rankMode, setRankMode] = useState<RankMode>("POWER");
const [hoveredTeam, setHoveredTeam] = useState<string | null>(null);
```

The bump chart must read AND write to these same state variables (bidirectional). When a user hovers a team in the table, the corresponding line in the bump chart highlights, and vice versa.

### Placeholder Location (SeasonPulse.tsx line 711-712)

```tsx
{/* Placeholder for Layer 2: Bump Chart (Session 2) */}
{/* Placeholder for Layer 3: Narrative Timeline (Session 3) */}
```

Replace the Layer 2 placeholder with the bump chart component, wrapped in a `<StaggerItem>` and `<NeuCard>`.

## What to Build

### New File: `client/src/components/charts/BumpChart.tsx`

A custom SVG bump chart showing 30 team ranking lines across 33 matchweeks.

### Props Interface

```typescript
interface BumpChartProps {
  selectedTeam: string | null;
  onSelectTeam: (teamId: string | null) => void;
  hoveredTeam: string | null;
  onHoverTeam: (teamId: string | null) => void;
  conferenceFilter: "ALL" | "EASTERN" | "WESTERN";
  rankMode: "POWER" | "POINTS";
  selectedWeek: number;
  onSelectWeek: (week: number) => void;
}
```

### SVG Rendering

**Dimensions:** Use a responsive approach — `viewBox="0 0 1200 700"` with `width="100%"` and `preserveAspectRatio="xMidYMid meet"`. The chart should fill the NeuCard width.

**X-axis:** 33 evenly spaced columns (one per matchweek). Label every 5th week (1, 5, 10, 15, 20, 25, 30, 33). Use `JetBrains Mono` font.

**Y-axis:** 30 positions (rank 1 at top, rank 30 at bottom). Label every 5th rank (1, 5, 10, 15, 20, 25, 30). Optionally show tier region bands as subtle background fills (Title Contenders = top ~8, Playoff = ~8-15, Bubble = ~15-22, Rebuilding = ~22-30) using the same `TIER_COLORS` from the snapshot table.

**Lines:** Each team is a `<path>` element. Use `d3-shape`'s `line()` generator with `curveMonotoneX` interpolation for smooth curves. d3-shape is already available via the recharts dependency (`node_modules/d3-shape`).

```typescript
import { line, curveMonotoneX } from "d3-shape";

const lineGenerator = line<{ week: number; rank: number }>()
  .x(d => xScale(d.week))
  .y(d => yScale(d.rank))
  .curve(curveMonotoneX);
```

**Rank data source:** For each team, call `getTeamTrajectory(teamId)` and map to `{ week: s.week, rank: rankMode === "POWER" ? s.powerRank : s.pointsRank }`.

### Deemphasis Interaction System (Critical)

This is the most important design element. Follow the same pattern as the DumbbellChart and the snapshot table:

| State | Line Appearance |
|-------|----------------|
| **Default (no selection, no hover)** | All 30 lines at **0.15 opacity**, **1px stroke**, neutral color (`isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)"`) |
| **Hover (no locked selection)** | Hovered line: **1.0 opacity**, **2.5px stroke**, team primary color (via `mutedTeamColor`). All others: **0.08 opacity**. Show team name label at the line's rightmost point. |
| **Click (locked selection)** | Same as hover but persists after mouseout. Show team name label. Inflection markers appear on the line. |
| **Hover while locked** | Locked team stays at full opacity. Newly hovered team also at full opacity (slightly thinner, 2px). All others at 0.08. This allows comparison. |
| **Conference filter active** | Only show lines for the filtered conference (15 teams). Hidden teams' paths are not rendered at all. |

Use Framer Motion for opacity and strokeWidth transitions, or CSS transitions for performance (30 paths animating simultaneously).

### Team Name Labels

When a team is highlighted (hover or selected), show their short name (`team.short`) at the right endpoint of their line. Use a small text element with a dark/light background pill for readability.

### Week Window Range Slider

Below the SVG chart, add a range slider that controls which matchweeks are visible:

- **Two draggable handles** defining a `[startWeek, endWeek]` window
- **Default:** Full season `[1, 33]`
- **Preset buttons:** "Full Season" | "First Half (1-17)" | "Second Half (18-33)" | "Last 10 (24-33)"
- **Play button:** Animate a sliding window (width ~8 weeks) moving from left to right across the season. 250ms per step. Use `setInterval` with cleanup. Show Play/Pause toggle.

When the window is narrowed, the SVG viewBox or the x-scale adjusts to zoom into that range. Lines outside the window are clipped. The y-axis re-ranks based only on the visible window's endpoint standings.

### Inflection Markers

When a team is selected (clicked), overlay small circle markers on their line at weeks where `getTeamEvents(teamId)` returns events:

- Circle radius scaled by `severity` (1→3px, 5→7px)
- Color by event type: green for streaks/surges, red for collapses/losses, amber for upsets, cyan for milestones
- On hover, show a tooltip with the event `title` and `description`
- These markers are also clickable — they will eventually scroll the timeline (Session 3) to that event. For now, just log the click or no-op.

### Selected Week Indicator

Draw a vertical dashed line at the `selectedWeek` position on the x-axis. This syncs with the snapshot table's week selector — when the user changes the week in the table, the indicator moves in the bump chart, and vice versa.

### ChartHeader Integration

Wrap the bump chart in a `<ChartHeader>` with:

- **title:** "Season Rank Flow"
- **subtitle:** Dynamic, e.g., "Weeks 1-33 · 30 teams · Power Rankings"
- **description:** "Watch how the league table shifted week by week. Each line traces a team's ranking across the season — hover to isolate a team, click to lock it and see their inflection events. The tighter the lines cluster, the more competitive that stretch of the season was."
- **methods:** Explain the ranking computation, curve interpolation method, and inflection detection rules.
- **rightAction:** The preset buttons (Full Season / First Half / Second Half / Last 10) and Play/Pause button.

### Neumorphic Styling

- The chart lives inside a `<NeuCard>` (same as the snapshot table)
- Background: subtle gradient or flat, consistent with other chart cards
- Tier region bands: use the same `TIER_COLORS` with very low opacity as horizontal bands behind the lines
- Dark/light theme support: check `isDark` from `useTheme()` and adjust all colors accordingly

## Integration into SeasonPulse.tsx

Replace the Layer 2 placeholder comment with:

```tsx
<StaggerItem>
  <NeuCard className="p-4 md:p-5">
    <BumpChart
      selectedTeam={selectedTeam}
      onSelectTeam={setSelectedTeam}
      hoveredTeam={hoveredTeam}
      onHoverTeam={setHoveredTeam}
      conferenceFilter={conferenceFilter}
      rankMode={rankMode}
      selectedWeek={selectedWeek}
      onSelectWeek={setSelectedWeek}
    />
  </NeuCard>
</StaggerItem>
```

Import the BumpChart component at the top of SeasonPulse.tsx.

## Available Dependencies

These are already installed and available — do NOT install new packages:

- `d3-shape` (via recharts) — for `line()` + `curveMonotoneX`
- `framer-motion` — for animations
- `lucide-react` — for icons (Play, Pause, SkipForward, SkipBack already imported in SeasonPulse.tsx)
- `recharts` — if you prefer using Recharts components instead of raw SVG, that's acceptable but custom SVG is preferred for neumorphic control

## Technical Constraints

- **No new package installations.** Everything needed is already in the dependency tree.
- **TypeScript strict mode.** All props and state must be properly typed.
- **Dark/light theme.** Every color must have both variants. Use `isDark` from `useTheme()`.
- **Performance.** 30 paths × 33 points = 990 data points. This is trivial for SVG. But avoid re-rendering all 30 paths on every hover — use `React.memo` or `useMemo` for the path `d` strings, and only animate `opacity`/`strokeWidth` via CSS transitions or Framer Motion.
- **Responsive.** The chart must work at all viewport widths. Use the `viewBox` approach.
- **Accessibility.** Add `aria-label` to the SVG and `role="img"`.

## Branch & PR

- Create branch: `feature/season-pulse-session2`
- Commit with conventional commits: `feat(season-pulse): Session 2 — Bump Chart`
- Open PR #XX referencing Issue #75

## Acceptance Criteria

- [ ] 30 curved lines render correctly across 33 weeks (or 15 when conference-filtered)
- [ ] Deemphasis hover/click system works: hover highlights one line, click locks it
- [ ] Bidirectional state sync with snapshot table (hover/select in table highlights in chart and vice versa)
- [ ] Week window range slider with 4 presets and play/pause animation
- [ ] Inflection markers appear on selected team's line with tooltips
- [ ] Selected week vertical indicator syncs with table's week selector
- [ ] ChartHeader with description and methods panel
- [ ] Dark and light theme support
- [ ] TypeScript compiles cleanly with zero errors
- [ ] Responsive at all viewport widths
