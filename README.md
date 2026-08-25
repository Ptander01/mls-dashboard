# MLS Analytics Dashboard

**[🚀 View Live Demo](https://mls-dashboard-one.vercel.app)**

An advanced interactive dashboard for Major League Soccer statistical analysis featuring the live 2026 season and complete 2025 historical data. Built with React 19, Tailwind CSS 4, Recharts, and Three.js, the dashboard showcases a custom **Industrial Neumorphic 3D** design system with extruded chart elements, gradient lighting, cast shadows, and glassmorphic overlays.

Built to see whether a full analytics product could run with no backend at all — 881 players, 510 matches and real MLSPA wage data compiled into a typed module at build time, with a Python pipeline refreshing the live season on demand. The answer is yes, and the constraint is what makes it load instantly.

![Player Stats — Scatter plot, top scorers, and full player database](docs/assets/screenshots/01-player-stats.webp)

---

## Features

The dashboard is organized into six core analytical tabs:

### 1. Season Pulse
A unified timeline of the season's unfolding narrative.
- **Snapshot Table:** A 30-team standings matrix ranked by a composite Power Score (points, form, goal difference, momentum).
- **Rank Flow Bump Chart:** A custom SVG visualization showing how teams rise and fall across matchweeks.
- **Storyline Detection:** The Insight Engine auto-detects streaks, collapses, and surges (e.g., "The LAFC Wall: 5 games, 0 goals conceded").

### 2. Player Stats
Compare individual player performance across the MLS season. The scatter plot lets you explore relationships between any two metrics (Shots vs Goals, Minutes vs Assists, etc.) with team or position coloring and a trend line showing correlation strength. Click any player row or dot to view their full performance radar. Includes a sortable, filterable database of all 881 players across 17 statistical columns.

### 3. Team Budget
Analyze how each MLS club allocates its salary budget across Designated Players, TAM, and regular contracts. Click any team bar to drill into positional salary breakdowns (via a 3D neumorphic donut chart) and see top earners with cost-per-goal efficiency metrics.

![Team Salary Breakdown with 3D stacked bars](docs/assets/screenshots/02-team-budget.webp)

![Team Budget drill-down — 3D donut pie chart and top earners table](docs/assets/screenshots/06-team-budget-drilldown.webp)

### 4. Attendance
Explore match-day attendance across all MLS venues. The bar chart ranks teams by average home attendance with 3D braille-dot stadium capacity markers. Toggle to fill rate mode to see stadium utilization. The trend chart tracks weekly patterns.

![Attendance analysis with braille capacity dots and trend chart](docs/assets/screenshots/07-attendance-detail.webp)

The Gravitational Pull section reveals how specific away teams affect host venue turnout.
<img width="1920" height="930" alt="image" src="https://github.com/user-attachments/assets/7959cf97-b840-4307-9dd8-aaaa6ace38b1" />

<img width="1920" height="614" alt="image" src="https://github.com/user-attachments/assets/0f5a9965-28f7-4c21-9e9b-049755c9d085" />

### 5. Travel Performance
Visualize the travel burden across MLS clubs on an interactive 3D globe built with Three.js. Each team's stadium appears as a glowing orb, and animated arcs trace away-game routes week by week. Scrub through the season timeline to watch travel patterns unfold. Conference-heavy schedules mean Western teams often face significantly more travel than Eastern counterparts.

![Interactive 3D travel map with animated route arcs](docs/assets/screenshots/04-travel-map.webp)

### 6. Pitch Match
Dive into tactical match data on a virtual pitch. The heatmap shows player positioning intensity, the shot map plots every attempt with xG-scaled markers (goals highlighted), and the passing network reveals team shape and link-up play using cinematic 3D glass nodes and neon tube conduits. Select any team to see their tactical fingerprint.

![Pitch Match — Player heatmap on virtual pitch](docs/assets/screenshots/05-pitch-match.webp)

---

## The Insight Engine

This is not just a dashboard of charts; it is a data journalism product. The proprietary **Insight Engine** (`insightEngine.ts`) continuously scans the data layer to generate contextual, human-readable insights. Every chart is wrapped in a `ChartHeader` component that includes an editorial hook (e.g., "Busquets touched the ball more than anyone, but Redondo was the bridge") and an expandable METHODS panel detailing the underlying math.

---

## Data Architecture

The dashboard operates entirely without a backend database, using a hybrid data approach:

1. **Static 2025 Core:** The foundational dataset (881 players, 510 matches, real MLSPA wages) is embedded directly in a highly optimized TypeScript file (`mlsData.ts`), ensuring instant load times.
2. **Live 2026 Integration:** A Python pipeline (`scripts/fetch_2026_season.py`) pulls live match and xG data from the American Soccer Analysis (ASA) API, generating a lightweight JSON payload.
3. **Season Toggle:** A global context provider allows users to instantly switch the entire application state between the complete 2025 historical record and the live 2026 season.

```mermaid
flowchart LR
    MLSPA["MLSPA salary releases"]:::src
    ASA["American Soccer Analysis API<br/>matches + xG"]:::src

    PY["scripts/fetch_2026_season.py"]
    TS["mlsData.ts<br/>881 players, 510 matches<br/>typed, compiled in"]:::gen
    JSON["2026 season payload<br/>lightweight JSON"]:::gen

    CTX{{"season context<br/>2025 | 2026"}}
    ENG["Insight Engine<br/>streaks, collapses, surges"]
    TABS["6 analytical tabs"]

    MLSPA --> TS
    ASA --> PY --> JSON
    TS --> CTX
    JSON --> CTX
    CTX --> ENG
    CTX --> TABS
    ENG --> TABS

    classDef src fill:#1f2933,stroke:#7ecfb2,color:#e6edf3
    classDef gen fill:#22272e,stroke:#f0c96e,color:#e6edf3
```

The important edge: **the season toggle is a context provider, not two builds.**
Both datasets are resolved at the same boundary, so every tab, chart and the
Insight Engine switch together and no component needs to know which season it is
rendering.

**The details that would have made it wrong:**

- **Cost-per-goal divides by goals, which is zero for most players.** The metric is
  only computed where the denominator is meaningful; showing an infinite or blank
  efficiency figure across a squad would make the whole table untrustworthy.
- **The composite Power Score is a weighted blend, not a standing.** Points, form,
  goal difference and momentum on one axis is a ranking this dashboard invents —
  useful for narrative, not the league table, and labelled as such.
- **xG is a model output, not an observation.** It arrives from ASA already
  estimated; treating it as a counted quantity alongside actual goals is the most
  common way to misread a chart like this.
- **The 2025 data is compiled in, not fetched.** That is what makes first paint
  instant, and it means the historical record is a snapshot with a date rather
  than a live view.


---

## Design System

The dashboard uses a custom **"Dark Forge" Industrial Neumorphism** design language:

- **3D Extruded Charts** — Every bar, pie segment, and data marker has parallelogram side/bottom faces with 5-stop directional lighting gradients simulating a top-left light source
- **Cast Shadows** — Chart elements cast realistic drop shadows onto their environment, with both deep and ambient shadow layers
- **Neumorphic Cards** — Raised card surfaces with multi-layer box shadows creating a tactile, pressed-metal feel
- **Glassmorphic Overlays** — Frosted-glass tooltips and overlays with backdrop blur and subtle borders
- **3D Braille Dots** — Stadium capacity markers rendered as spherical dots with radial gradient lighting and cast shadow ellipses
- **Recessed Donut Floor** — The pie chart inner hole appears as a matte recessed surface with inward-cast shadows from surrounding segments
- **Theme Support** — Full light and dark mode with smooth CSS transitions (light mode default)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Styling | Tailwind CSS 4 + CSS Variables |
| Components | shadcn/ui (Radix primitives) |
| Charts | Recharts (with custom SVG shapes) |
| 3D Rendering | Three.js + React Three Fiber + Post-processing |
| Data Pipeline | Python (itscalledsoccer, rapidfuzz) |
| Routing | Wouter |
| Build | Vite 6 |
| Package Manager | pnpm |

---

## Getting Started

```bash
# Clone the repository
git clone https://github.com/Ptander01/mls-dashboard.git
cd mls-dashboard

# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

The app will be available at `http://localhost:3000`.

### Refreshing 2026 Live Data
To pull the latest match results and xG metrics from the ASA API:
```bash
python3 scripts/fetch_2026_season.py
```

### Build for Production

```bash
pnpm build
```

The output lands in `dist/public/` — a fully static bundle you can deploy to any web server, CDN, or static hosting platform (Vercel, Netlify, GitHub Pages, etc.).

---

## Project Structure

```
client/
  src/
    pages/Home.tsx              — Main dashboard (single-page with tab navigation)
    components/
      tabs/
        SeasonPulse.tsx         — Power rankings, bump chart, narrative timeline
        PlayerStats.tsx         — Scatter plot, top scorers, player database
        TeamBudget.tsx          — Stacked bar chart, pie drill-down, top earners
        Attendance.tsx          — Bar chart, trend line, gravitational pull
        TravelMap.tsx           — Three.js 3D globe with animated arcs
        PitchMatch.tsx          — Heatmap, shot map, passing network
      NeuCard.tsx               — Neumorphic card wrapper
      ChartModal.tsx            — Full-screen chart expand modal
    lib/
      chartUtils.tsx            — All custom 3D chart shape components (2,200+ lines)
      insightEngine.ts          — Narrative generation and storyline detection
      mlsData.ts                — Complete 2025 MLS dataset (881 players, 510 matches)
      seasonDataLoader.ts       — Lazy loader for 2026 JSON data
    contexts/
      FilterContext.tsx          — Global filter state and season toggle
    index.css                   — Design tokens, neumorphic shadows, animations
scripts/
  fetch_2026_season.py          — ASA API data pipeline
  fetch_miami_network.py        — StatsBomb event data pipeline
```

---

## Limits

**"Live 2026" is live when you refresh it.** The deployed build serves whatever
`fetch_2026_season.py` last produced. Nothing polls, so a season payload ages
until someone re-runs the script and redeploys.

**Salary figures are MLSPA release snapshots.** They are published periodically
and describe base compensation as reported — not total earnings, and not
continuously current. Cost-per-goal inherits that lag.

**xG comes from a third-party model.** Different providers produce different xG
for the same shot. These figures are internally consistent because they all come
from ASA, and they are not comparable against xG quoted from anywhere else.

**The 3D treatment costs precision.** Extruded bars, cast shadows and the donut
depth are a deliberate aesthetic, and they make close values harder to compare
than flat marks would. Where exact comparison matters, the sortable tables are the
honest surface and the charts are the entry point to them.

**No backend means no user state.** Filters, comparisons and drill-downs live for
one session; nothing is saved, shared or linkable.

**One league, two seasons.** Nothing here generalises to other competitions
without new ingestion — the schema is shaped around MLS roster rules, including
Designated Players and TAM, which do not exist elsewhere.

## Documentation

- **`docs/HANDOFF.md`** — Comprehensive design system reference, component API documentation, known fixes, and development patterns
- **`ARCHITECTURE.md`** — Detailed guide for self-hosting outside Manus, build pipeline explanation, and deployment options
- **`docs/sprints/briefs/`** — The historical record of feature scoping and implementation plans
- **`docs/blog/`** — LinkedIn post drafts and feature release announcements
- **`docs/README.md`** — Full docs directory structure and navigation guide

---

## License

This project is private and not licensed for redistribution.
