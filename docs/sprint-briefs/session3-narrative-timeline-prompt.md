# Sprint Prompt: Season Pulse Session 3 — Narrative Timeline + Polish (Issue #76)

## Context

Clone the repo: `gh repo clone Ptander01/mls-dashboard`

Read these files before writing any code:
1. `docs/sprint-briefs/season-pulse-brief.md` — full epic architecture (Layer 3 spec starts at line 259)
2. `client/src/lib/seasonPulse.ts` — data engine (780 lines). Key exports: `getTeamTrajectory()`, `getTeamEvents()`, `detectInflectionEvents()`, `computeWeeklyStandings()`
3. `client/src/components/tabs/SeasonPulse.tsx` — tab container (~830 lines). Shared state lives here. Layer 3 placeholder at **line 728**.
4. `client/src/components/charts/BumpChart.tsx` — bump chart (~1,155 lines). The timeline must visually align with this chart's x-axis.
5. `client/src/lib/insightEngine.ts` — existing insight generation patterns (1,685 lines). Add season narrative generators here.
6. `client/src/components/CardInsight.tsx` — `CardInsightItem` interface (`{ text: string; accent: "cyan" | "amber" | "emerald" | "coral" }`)
7. `client/src/components/ui/ChartHeader.tsx` — reusable header component
8. `client/src/components/charts/DumbbellChart.tsx` — reference for neumorphic SVG patterns and deemphasis

## What Already Exists (Sessions 1 & 2)

### Data Engine API (from `seasonPulse.ts`)

```typescript
// Get a specific team's standings trajectory across all weeks
getTeamTrajectory(teamId: string): TeamWeekStanding[]

// Get inflection events for a specific team (sorted by week, then severity desc)
getTeamEvents(teamId: string): SeasonEvent[]

// Get ALL inflection events across all teams
detectInflectionEvents(): SeasonEvent[]

// Full 30×33 matrix
computeWeeklyStandings(): TeamWeekStanding[][]

// Max week
getMaxWeek(): number  // returns 33
```

### SeasonEvent Interface

```typescript
interface SeasonEvent {
  teamId: string;
  week: number;
  type: "winning_streak" | "losing_streak" | "unbeaten_run" | "winless_run"
      | "rank_surge" | "rank_collapse" | "upset_win" | "upset_loss" | "milestone";
  severity: number;  // 1-5
  title: string;     // e.g., "5-Game Winning Streak"
  description: string; // e.g., "Charlotte FC have won 5 consecutive matches, climbing to 7th..."
}
```

### TeamWeekStanding Interface

```typescript
interface TeamWeekStanding {
  teamId: string;
  week: number;
  powerRank: number;      // 1-30
  pointsRank: number;
  powerScore: number;     // 0-100
  tier: "Title Contenders" | "Playoff" | "Bubble" | "Rebuilding";
  rankDelta: number;
  points: number;
  ppg: number;
  form: ("W" | "D" | "L")[];
  wins: number; draws: number; losses: number;
  goalsFor: number; goalsAgainst: number; goalDifference: number;
  homeWins: number; homeDraws: number; homeLosses: number;
  awayWins: number; awayDraws: number; awayLosses: number;
}
```

### Shared State in SeasonPulse.tsx (lines 352-357)

```typescript
const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
const [selectedWeek, setSelectedWeek] = useState<number>(getLatestWeek());
const [conferenceFilter, setConferenceFilter] = useState<ConferenceFilter>("ALL");
const [rankMode, setRankMode] = useState<RankMode>("POWER");
const [hoveredTeam, setHoveredTeam] = useState<string | null>(null);
```

The narrative timeline **only renders when `selectedTeam` is not null**. It reads the same shared state and writes back to it (clicking an event node should update `selectedWeek`).

### Placeholder Location (SeasonPulse.tsx line 728)

```tsx
{/* Placeholder for Layer 3: Narrative Timeline (Session 3) */}
```

Replace with the timeline component, wrapped in `<AnimatePresence>` so it slides/fades in when a team is selected.

### BumpChart X-Axis Alignment

The bump chart uses these constants (BumpChart.tsx lines 62-66):

```typescript
const SVG_WIDTH = 1200;
const SVG_HEIGHT = 700;
const MARGIN = { top: 30, right: 80, bottom: 40, left: 45 };
const CHART_WIDTH = SVG_WIDTH - MARGIN.left - MARGIN.right;  // 1075
const CHART_HEIGHT = SVG_HEIGHT - MARGIN.top - MARGIN.bottom; // 630
```

The timeline's x-axis (weeks 1-33) should visually align with the bump chart's x-axis above it. Since both are inside `<NeuCard className="p-4 md:p-5">` containers, use the same `MARGIN.left` (45px) and `MARGIN.right` (80px) padding for the timeline's horizontal layout, or use a shared SVG viewBox width of 1200 with matching margins.

## What to Build

### 1. New File: `client/src/components/charts/SeasonTimeline.tsx`

A horizontal narrative timeline that expands below the bump chart when a team is selected.

#### Props Interface

```typescript
interface SeasonTimelineProps {
  teamId: string;
  selectedWeek: number;
  onSelectWeek: (week: number) => void;
  rankMode: "POWER" | "POINTS";
}
```

#### Layout Structure

The timeline has three sections stacked vertically:

**A. Sticky Context Panel (top bar)**
A compact horizontal bar showing the selected team's identity and key stats:

```
[●] Charlotte FC  |  #7 Power  |  12W 5D 6L  |  +8 GD  |  1.78 PPG  |  Playoff Tier
```

- Team color dot + team name (Space Grotesk, bold)
- Key stats in JetBrains Mono
- Mini sparkline of power score across all 33 weeks (tiny inline SVG, ~120px wide, ~20px tall)
- This panel uses the same neumorphic inset styling as the METHODS panels (recessed, not elevated)
- Stats update dynamically if the user hovers over different weeks on the timeline

**B. Timeline Spine (main visualization)**
A horizontal SVG timeline spanning weeks 1-33:

```
●───────●─────────────●──────────●────────────────●───────●
W3      W5            W12        W18              W25     W31
```

- **Spine:** A horizontal line (2px, muted color) running the full width
- **Week ticks:** Small vertical marks at each week, labeled every 5th week (matching bump chart x-axis labels)
- **Event nodes:** Circles placed at the week where each `SeasonEvent` occurred
  - **Size:** Radius scaled by severity: `severity * 2 + 3` (so 5px for severity 1, 13px for severity 5)
  - **Color by event type:**
    - `winning_streak` / `unbeaten_run` / `rank_surge` → emerald (#10b981 dark, #059669 light)
    - `losing_streak` / `winless_run` / `rank_collapse` → coral (#ef4444 dark, #dc2626 light)
    - `upset_win` / `upset_loss` → amber (#f59e0b dark, #d97706 light)
    - `milestone` → cyan (#06b6d4 dark, #0891b2 light)
  - **Glow:** `box-shadow: 0 0 ${severity * 2}px ${color}` for a neumorphic pop effect
  - **Hover:** Scale up 1.3x, show tooltip with `event.title`
  - **Click:** Expand the narrative card below AND update `selectedWeek` to that event's week (syncs with bump chart vertical indicator and snapshot table)

- **Selected week indicator:** A vertical dashed line at `selectedWeek`, matching the bump chart's indicator. When the user changes the week in the table or bump chart, this indicator moves here too.

- **Power score trend line:** A subtle background line (low opacity, 1px) tracing the team's `powerScore` across weeks, normalized to the timeline's height. This gives visual context for "was the team rising or falling when this event happened?"

**C. Narrative Cards (expandable detail area)**

Below the timeline spine, show narrative cards for events. Two display modes:

**Default (no event clicked):** Show a summary card with the team's season narrative — a 2-3 sentence auto-generated paragraph covering the overall arc. Example:

> "Charlotte FC's season was defined by a dominant mid-season surge — climbing from 18th to 7th between Weeks 8-14 on the back of a 5-game winning streak. A Week 20 collapse (3 losses in 4 matches) threatened to undo the progress, but they steadied to finish in the Playoff tier."

**Event clicked:** Show a detailed card for that specific event:

```
┌──────────────────────────────────────────────────────┐
│  ● 5-Game Winning Streak                    Week 12  │
│                                                      │
│  Charlotte FC have won 5 consecutive matches,        │
│  climbing from 18th to 7th in the power rankings.    │
│                                                      │
│  Before: #18 (42.3 power)  →  After: #7 (67.8 power)│
│  Form: W W W W W                                     │
│  PPG change: 1.42 → 1.78                             │
└──────────────────────────────────────────────────────┘
```

Card styling:
- Neumorphic card (mini NeuCard) with team color left border (3px)
- Event type icon from lucide-react (TrendingUp for surges/streaks, TrendingDown for collapses, Zap for upsets, Trophy for milestones)
- Before/after stats pulled from `getTeamTrajectory()` at `event.week - 1` and `event.week`
- Form dots (reuse the `FormDots` component pattern from SeasonPulse.tsx)
- Smooth expand/collapse animation via Framer Motion `AnimatePresence` + `motion.div` with `height: "auto"`

### 2. Season Narrative Generator (add to `insightEngine.ts`)

Add a new exported function:

```typescript
export function seasonNarrativeInsights(teamId: string): CardInsightItem[]
```

This function should:
1. Call `getTeamTrajectory(teamId)` to get the full season arc
2. Call `getTeamEvents(teamId)` to get inflection events
3. Generate 3-5 `CardInsightItem` entries covering:
   - **Overall arc:** "Team X finished Nth, up/down from their Week 1 position of Mth"
   - **Peak moment:** The highest-severity positive event
   - **Low point:** The highest-severity negative event
   - **Form trend:** How they started vs. how they finished
   - **Home/away split:** If there's a notable imbalance

Also add a headline function:

```typescript
export function seasonPulseHeadline(teamId: string): string
```

Returns a single punchy sentence summarizing the team's season, suitable for the ChartHeader description when a team is selected.

### 3. Integration into SeasonPulse.tsx

Replace the Layer 3 placeholder (line 728) with:

```tsx
<AnimatePresence>
  {selectedTeam && (
    <StaggerItem key={`timeline-${selectedTeam}`}>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden"
      >
        <NeuCard className="p-4 md:p-5">
          <SeasonTimeline
            teamId={selectedTeam}
            selectedWeek={selectedWeek}
            onSelectWeek={setSelectedWeek}
            rankMode={rankMode}
          />
        </NeuCard>
      </motion.div>
    </StaggerItem>
  )}
</AnimatePresence>
```

Import `SeasonTimeline` at the top of SeasonPulse.tsx.

### 4. Polish Pass (All Three Layers)

Since this is the final session, do a polish pass on the full tab:

- **Update the file header comment** in SeasonPulse.tsx to reflect all three layers being complete
- **Ensure consistent spacing** between the three NeuCard sections (use `space-y-4` on the StaggerContainer)
- **Verify bidirectional sync** across all three layers:
  - Click team in table → bump chart highlights + timeline expands
  - Click team in bump chart → table highlights + timeline expands
  - Click event in timeline → bump chart week indicator moves + table week selector updates
  - Change week in table → bump chart indicator moves + timeline indicator moves
- **ChartHeader for the timeline section:**
  - title: "Season Story" (or dynamic: "{Team Name}'s Season Story")
  - subtitle: Dynamic, e.g., "7 inflection events across 33 weeks"
  - description: Dynamic narrative headline from `seasonPulseHeadline(teamId)`
  - methods: Explain inflection detection rules (streak thresholds, rank change thresholds, upset detection logic)
- **Empty state:** If a team has zero events (unlikely but possible for a very steady team), show a message: "No major inflection events detected — {Team Name} had a remarkably steady season."

## Available Dependencies

Already installed — do NOT add new packages:
- `framer-motion` — for expand/collapse animations
- `lucide-react` — for event type icons (TrendingUp, TrendingDown, Zap, Trophy, AlertTriangle, etc.)
- `d3-shape` (via recharts) — if needed for the sparkline or power score trend line

## Technical Constraints

- **No new package installations.**
- **TypeScript strict mode.** All props typed.
- **Dark/light theme.** Every color needs both variants via `isDark`.
- **Performance.** Event count per team is typically 5-15. Trivial rendering load.
- **Responsive.** Timeline must work at all viewport widths. On narrow screens, event nodes may overlap — handle this by either staggering vertically or showing a scrollable horizontal container.
- **Accessibility.** `aria-label` on the timeline SVG, `role="listitem"` on event cards.

## Branch & PR

- Create branch: `feature/season-pulse-session3`
- Commit with conventional commits: `feat(season-pulse): Session 3 — Narrative Timeline + Polish`
- Open PR referencing Issue #76

## Acceptance Criteria

- [ ] Timeline only renders when a team is selected (AnimatePresence expand)
- [ ] Sticky context panel shows team identity, key stats, and mini sparkline
- [ ] Timeline spine with event nodes sized by severity and colored by type
- [ ] Event nodes are hoverable (tooltip) and clickable (expand card + sync week)
- [ ] Narrative cards show before/after stats and descriptive text
- [ ] Default summary card shows overall season arc when no event is clicked
- [ ] `seasonNarrativeInsights()` added to insightEngine.ts with 3-5 insights per team
- [ ] `seasonPulseHeadline()` added to insightEngine.ts
- [ ] ChartHeader with dynamic title, subtitle, description, and methods
- [ ] Bidirectional sync verified: table ↔ bump chart ↔ timeline (all three directions)
- [ ] Selected week indicator on timeline syncs with table and bump chart
- [ ] Power score trend line visible behind timeline spine
- [ ] Dark and light theme support
- [ ] TypeScript compiles cleanly with zero errors
- [ ] Responsive at all viewport widths
- [ ] File header comments updated to reflect complete tab
