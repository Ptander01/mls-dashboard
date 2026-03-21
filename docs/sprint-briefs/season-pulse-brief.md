# Sprint Brief: Season Pulse Tab

**Merged Epic:** Consolidates former Epic 11 (Power Rankings, #45-47) and Epic 12 (Season Timeline, #48-50) into a single tab with three integrated layers.

**Estimated Effort:** 3 Sessions (Data Engine + Bump Chart + Narrative Timeline)

**Tab Name:** "Season Pulse" (or "Rankings" — final name TBD)

**New Files:**
- `client/src/lib/seasonPulse.ts` — weekly standings engine, composite scoring, inflection detection
- `client/src/components/tabs/SeasonPulse.tsx` — tab container with all three layers
- `client/src/components/charts/BumpChart.tsx` — the rank flow visualization
- `client/src/components/charts/SeasonTimeline.tsx` — narrative timeline detail panel

**Existing Files Modified:**
- `client/src/pages/Home.tsx` — add new tab
- `client/src/lib/insightEngine.ts` — add season narrative generators

---

## Design Philosophy

This tab answers one question at three zoom levels:

> **"How has the season unfolded?"**

| Layer | Zoom Level | Interaction | What It Shows |
|-------|-----------|-------------|---------------|
| **Snapshot Table** | Macro — single week | Default view, week selector | Where every team stands right now |
| **Bump Chart** | Meso — season arc | Horizontal expansion of table | How rankings shifted week by week |
| **Narrative Timeline** | Micro — single team | Click a team row to expand | Why a specific team rose or fell |

The three layers share the same x-axis (matchweeks 1-33) and the same team selection context. Clicking a team in any layer highlights it across all three. This is the master-detail pattern already established by the Deep Dive Panel on the Travel tab.

---

## Data Architecture

### Source Data

The match data already exists in `mlsData.ts`: **510 matches across 33 weeks**, with `homeTeam`, `awayTeam`, `homeGoals`, `awayGoals`, and `week` fields. This is everything needed to compute cumulative standings at any matchweek.

### Weekly Standings Engine (`seasonPulse.ts`)

The core computation: iterate through matches week by week, maintaining a running tally per team.

```typescript
interface WeeklyStanding {
  teamId: string;
  week: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  rank: number;           // 1-30 based on points (then GD, then GF as tiebreakers)
  conferenceRank: number; // 1-15 within conference
  ppg: number;            // points / played
  form: string;           // last 5 results as "WWDLW"
  formPoints: number;     // points from last 5 matches (0-15)
}
```

**Computation approach:**

```typescript
function computeWeeklyStandings(
  matches: Match[],
  teams: Team[]
): Map<number, WeeklyStanding[]> {
  // Returns a Map keyed by week number (1-33)
  // Each value is an array of 30 WeeklyStanding objects, sorted by rank
  
  // 1. Initialize all 30 teams at week 0 with zeroes
  // 2. For each week 1-33:
  //    a. Copy previous week's standings
  //    b. Process that week's matches (update W/D/L, GF/GA, points)
  //    c. Compute PPG and form string
  //    d. Sort by points → GD → GF to assign rank
  //    e. Sort within conference for conferenceRank
  // 3. Return the full Map
}
```

This produces a 30×33 matrix of rankings — the exact data structure the bump chart needs.

### Composite Power Score

Absorbs the logic from Issue #45. The composite score weights multiple dimensions:

```typescript
interface PowerScore {
  teamId: string;
  week: number;
  overall: number;        // 0-100 composite
  components: {
    points: number;       // weight: 0.35 — raw standings position
    form: number;         // weight: 0.25 — last 5 results
    goalDifference: number; // weight: 0.20 — offensive/defensive balance
    homeAway: number;     // weight: 0.10 — home/away split consistency
    momentum: number;     // weight: 0.10 — rank change trend (rising/falling)
  };
}
```

The composite score is what drives the "Power Ranking" sort order (as opposed to raw points). It rewards teams that are hot and balanced, not just teams that accumulated points early and stalled.

### Inflection Point Detection

Auto-detect significant moments for the narrative timeline:

```typescript
interface SeasonEvent {
  teamId: string;
  week: number;
  type: 'streak' | 'collapse' | 'surge' | 'upset' | 'milestone';
  title: string;
  description: string;
  rankBefore: number;
  rankAfter: number;
  severity: number;  // 1-5 scale for visual prominence
}
```

**Detection rules (auto-generated from match data):**

| Event Type | Detection Logic |
|-----------|----------------|
| **Winning streak** | 4+ consecutive wins |
| **Losing streak** | 3+ consecutive losses |
| **Unbeaten run** | 6+ matches without a loss |
| **Collapse** | Drop of 5+ ranks in 3 weeks |
| **Surge** | Rise of 5+ ranks in 3 weeks |
| **Upset** | Bottom-10 team beats top-5 team |
| **Milestone** | Team clinches playoff spot, or mathematically eliminated |

These are all computable from the match data alone — no external API needed for v1. Editorial annotations (injuries, transfers, tactical shifts) can be added as a curated JSON overlay in a future sprint.

---

## Layer 1: Snapshot Table

### Layout

A dense, scannable table showing all 30 teams (or 15 with conference filter) ranked by composite power score for a selected week.

| Rank | Δ | Team | P | W | D | L | GD | PPG | Form | Power |
|------|---|------|---|---|---|---|----|----|------|-------|
| 1 | +2 | LAFC | 45 | 13 | 6 | 3 | +18 | 2.05 | WWWDW | 87.3 |
| 2 | — | Inter Miami | 44 | 13 | 5 | 4 | +22 | 2.00 | WDWWL | 85.1 |
| ... | | | | | | | | | | |

### Columns

| Column | Content | Width |
|--------|---------|-------|
| **Rank** | Composite power rank (not raw points rank) | 40px |
| **Δ** | Rank change from previous week. Green up arrow, red down arrow, gray dash. | 30px |
| **Team** | Color dot + team short name | 140px |
| **P / W / D / L** | Cumulative record | 30px each |
| **GD** | Goal difference with +/- sign | 40px |
| **PPG** | Points per game, 2 decimal places | 50px |
| **Form** | Last 5 results as colored dots (green=W, gray=D, red=L) | 60px |
| **Power** | Composite score as a mini horizontal bar + number | 80px |

### Controls

- **Week selector:** Dropdown or slider (Week 1-33). Default to latest week.
- **Conference filter:** ALL | EASTERN | WESTERN (neumorphic toggle group, same pattern as Dumbbell chart)
- **Rank by:** POWER (default) | POINTS (raw standings) — toggle to let users compare composite vs. traditional ranking

### Styling

- Neumorphic row styling consistent with existing tables
- Selected/hovered team row gets the standard highlight treatment
- Tier groupings (from Issue #47): subtle horizontal dividers or background tint bands separating Title Contenders / Playoff / Bubble / Rebuilding tiers. Use k-means on the power score or simple quartile breaks.

---

## Layer 2: Bump Chart

### Concept

The bump chart is the horizontal expansion of the snapshot table. Instead of seeing one week's rankings, you see how every team's rank flowed across the entire season (or a filtered window).

Each team is a line. The y-axis is rank (1 at top, 30 at bottom). The x-axis is matchweek (1-33). Lines weave up and down as teams rise and fall.

### Rendering Approach

**Custom SVG** (not a library like nivo). Reasons:
1. Full control over the neumorphic aesthetic (line materials, shadows, glow)
2. The deemphasis/highlight pattern needs precise opacity and stroke control
3. Integration with the snapshot table and timeline below requires shared state
4. 30 lines × 33 points = 990 data points — trivial for SVG performance

### Line Rendering

```
SVG viewBox: ~1200 × 700 (responsive via viewBox + width="100%")
X-axis: 33 evenly spaced columns (one per matchweek)
Y-axis: 30 evenly spaced rows (one per rank position)
```

Each team's line is a smooth curve (cubic bezier via `d3.curveMonotoneX` or manual control points) connecting its rank at each week. Curved lines are critical for readability — straight line segments create a tangled mess at 30 lines.

### Deemphasis Pattern (Critical)

With 30 lines, the default view will be visually dense. The deemphasis pattern is the single most important design decision:

| State | Line Appearance |
|-------|----------------|
| **Default (no selection)** | All lines visible at 15-20% opacity, 1px stroke, neutral gray. Conference tint optional (warm gray for East, cool gray for West). |
| **Hover** | Hovered line jumps to 100% opacity, 2.5px stroke, team primary color. All other lines fade to 8% opacity. Team name label appears at the line's endpoint. |
| **Click (locked)** | Same as hover but persists. Triggers Layer 3 (timeline) expansion below. |
| **Conference filter** | Only 15 lines shown. Much more readable. Non-selected conference lines hidden entirely. |
| **Multi-select** | Allow shift+click to compare 2-3 teams simultaneously. Each at full opacity in their team color. |

### Week Window Slider

A range slider below the bump chart controls the visible matchweek window:

- **Full season:** Weeks 1-33 (default)
- **Drag handles:** Narrow to any window (e.g., Weeks 12-22)
- **Preset buttons:** "Full Season" | "First Half" | "Second Half" | "Last 10 Weeks"
- **Play button:** Animate the window sliding from Week 1 forward, showing the season unfold in real time. 200-300ms per week transition.

### Annotations on Bump Chart

When a team is selected, overlay small markers on their line at weeks where auto-detected inflection events occurred. These markers are clickable and scroll the timeline (Layer 3) to that event.

### ChartHeader Integration

```tsx
<ChartHeader
  title="Season Rank Flow"
  description={<>
    Watch how the league table shifted week by week. Each line traces a team's
    ranking across the season — <strong>hover to isolate a team</strong>,
    click to lock it and see their full story below. The tighter the lines
    cluster, the more competitive that stretch of the season was.
  </>}
  methods={<>
    Rankings computed from cumulative points (3W/1D/0L), with tiebreakers:
    goal difference → goals for → head-to-head. Power Score is a weighted
    composite: Points Position (35%) + Form (25%) + Goal Difference (20%) +
    Home/Away Consistency (10%) + Momentum (10%). Lines rendered as monotone
    cubic interpolation. Inflection events auto-detected from rank deltas
    and streak analysis.
  </>}
  rightAction={/* Conference filter + Rank By toggle */}
/>
```

---

## Layer 3: Narrative Timeline

### Trigger

Clicking a team in either the snapshot table or the bump chart expands a panel below the bump chart showing that team's season story.

### Layout

A horizontal timeline (not vertical scrollytelling — the original Issue #48 proposed vertical, but horizontal aligns with the bump chart's x-axis above, creating a direct visual connection).

```
[Week 1] ----●---- [Week 5] ----●---- [Week 12] ----●---- [Week 18] ----●---- [Week 33]
              |                  |                    |                    |
         "3-game win       "Lost to         "Dropped from        "5-game
          streak to         bottom-dweller    3rd to 11th          unbeaten
          open season"      Dallas 0-3"       in 4 weeks"          run to close"
```

### Event Nodes

Each auto-detected `SeasonEvent` renders as a node on the timeline:

- **Circle marker** on the timeline spine, sized by severity (1-5)
- **Color** by event type: green (streak/surge), red (collapse/loss), amber (upset), cyan (milestone)
- **Expandable card** below the node with title, description, and mini stat callout

### Narrative Text Generation

Use `insightEngine.ts` patterns to generate punchy, specific sentences:

```
"Charlotte FC ripped off 5 straight wins from Week 8-12, climbing from 
18th to 7th — the biggest surge in the Eastern Conference this season."

"After a 0-3 home loss to FC Dallas in Week 15, Houston dropped 4 spots 
in a single week. Their PPG fell from 1.82 to 1.64."
```

### Sticky Context Panel (from Issue #50)

When a team is selected and the timeline is visible, a small sticky panel in the top-right corner of the timeline section shows:

- Team crest + name + current rank
- Mini sparkline of their power score over time
- Key season stats (W-D-L, GD, PPG)

This panel updates as the user hovers over different weeks on the timeline.

---

## Session Breakdown

### Session 1: Data Engine + Snapshot Table
- Build `seasonPulse.ts` with weekly standings computation
- Implement composite power scoring
- Build inflection point detection
- Create the snapshot table with week selector and conference filter
- Add the tab to `Home.tsx`
- **Deliverable:** Functional table with all 30 teams ranked by power score at any week

### Session 2: Bump Chart
- Build `BumpChart.tsx` with custom SVG rendering
- Implement curved line paths with monotone interpolation
- Build the deemphasis/highlight interaction system
- Add the week window slider with presets and play animation
- Integrate with snapshot table (shared team selection state)
- **Deliverable:** Interactive bump chart with hover/click/filter working

### Session 3: Narrative Timeline + Polish
- Build `SeasonTimeline.tsx` with horizontal timeline
- Implement event node rendering and expandable cards
- Add narrative text generation to `insightEngine.ts`
- Build the sticky context panel
- Polish all three layers' visual integration
- Add `ChartHeader` to both the bump chart and timeline sections
- **Deliverable:** Complete Season Pulse tab with all three layers working together

---

## Technical Considerations

### Performance

The 30×33 standings matrix (990 cells) is tiny — no performance concern for computation. The SVG bump chart with 30 curved paths of 33 points each is also lightweight. The main performance consideration is the Framer Motion transitions when hovering/selecting teams — keep these simple (opacity + strokeWidth, no path morphing).

### State Management

All three layers share a `selectedTeam` and `selectedWeek` state. Use React context or lift state to the `SeasonPulse.tsx` container:

```typescript
const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
const [selectedWeek, setSelectedWeek] = useState<number>(33); // latest
const [weekRange, setWeekRange] = useState<[number, number]>([1, 33]);
const [conferenceFilter, setConferenceFilter] = useState<'ALL' | 'EASTERN' | 'WESTERN'>('ALL');
const [rankBy, setRankBy] = useState<'POWER' | 'POINTS'>('POWER');
```

### Responsive Behavior

- **Large screens:** All three layers visible simultaneously (table → bump chart → timeline)
- **Medium screens:** Bump chart and timeline stack below table, full width
- **Small screens:** Table becomes the primary view; bump chart available via "Expand" button; timeline in a slide-up panel

### Neumorphic Consistency

- Snapshot table rows: same `NeuCard` styling as other tables
- Bump chart container: `NeuCard` with `ChartHeader`
- Timeline panel: slides open with the same expand animation as the Deep Dive Panel
- Event cards: mini `NeuCard` instances with the standard shadow system

---

## Relationship to Original Issues

| Original Issue | Status | How It's Absorbed |
|---------------|--------|-------------------|
| #45 — Composite Scoring Engine | Absorbed | `seasonPulse.ts` power score computation |
| #46 — Leaderboard Table | Absorbed | Layer 1: Snapshot Table |
| #47 — Tier Groupings | Absorbed | Tier bands in snapshot table + bump chart y-axis regions |
| #48 — Timeline Spine & Scrollytelling | Absorbed + Redesigned | Layer 3: Horizontal timeline (not vertical scroll) |
| #49 — Event Nodes & Narrative Cards | Absorbed | Layer 3: Event nodes with expandable cards |
| #50 — Sticky Context Panel | Absorbed | Sticky panel in timeline section |

All six original issues will be closed and replaced with new consolidated issues.
