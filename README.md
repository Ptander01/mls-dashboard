# MLS Analytics Dashboard

An advanced interactive dashboard for Major League Soccer statistical analysis featuring the 2025 season. Built with React 19, Tailwind CSS 4, Recharts, and Three.js, the dashboard showcases a custom **Industrial Neumorphic 3D** design system with extruded chart elements, gradient lighting, cast shadows, and glassmorphic overlays.

![Player Stats — Scatter plot, top scorers, and full player database](https://d2xsxph8kpxj0f.cloudfront.net/310519663348511113/fBEeqeVYwBHXg2g2gjhenP/01-player-stats_de0c193d.webp)

---

## Features

### Player Stats
Compare individual player performance across the 2025 MLS season. The scatter plot lets you explore relationships between any two metrics (Shots vs Goals, Minutes vs Assists, etc.) with team or position coloring and a trend line showing correlation strength. Click any player row or dot to view their full performance radar. Includes a sortable, filterable database of all 881 players across 17 statistical columns.

### Team Budget
Analyze how each MLS club allocates its salary budget across Designated Players, TAM, and regular contracts. Click any team bar to drill into positional salary breakdowns (via a 3D neumorphic donut chart) and see top earners with cost-per-goal efficiency metrics.

![Team Salary Breakdown with 3D stacked bars](https://d2xsxph8kpxj0f.cloudfront.net/310519663348511113/fBEeqeVYwBHXg2g2gjhenP/02-team-budget_e3321419.webp)

![Team Budget drill-down — 3D donut pie chart and top earners table](https://d2xsxph8kpxj0f.cloudfront.net/310519663348511113/fBEeqeVYwBHXg2g2gjhenP/06-team-budget-drilldown_db337e2c.webp)

### Attendance
Explore match-day attendance across all MLS venues. The bar chart ranks teams by average home attendance with 3D braille-dot stadium capacity markers. Toggle to fill rate mode to see stadium utilization. The trend chart tracks weekly patterns, and the Gravitational Pull section reveals how specific away teams affect host venue turnout.

![Attendance analysis with braille capacity dots and trend chart](https://d2xsxph8kpxj0f.cloudfront.net/310519663348511113/fBEeqeVYwBHXg2g2gjhenP/07-attendance-detail_d6a8497e.webp)

### Travel Map
Visualize the travel burden across MLS clubs on an interactive 3D globe built with Three.js. Each team's stadium appears as a glowing orb, and animated arcs trace away-game routes week by week. Scrub through the season timeline to watch travel patterns unfold. Conference-heavy schedules mean Western teams often face significantly more travel than Eastern counterparts.

![Interactive 3D travel map with animated route arcs](https://d2xsxph8kpxj0f.cloudfront.net/310519663348511113/fBEeqeVYwBHXg2g2gjhenP/04-travel-map_89dda9d8.webp)

### Pitch Match
Dive into tactical match data on a virtual pitch. The heatmap shows player positioning intensity, the shot map plots every attempt with xG-scaled markers (goals highlighted), and the passing network reveals team shape and link-up play. Select any team to see their tactical fingerprint.

![Pitch Match — Player heatmap on virtual pitch](https://d2xsxph8kpxj0f.cloudfront.net/310519663348511113/fBEeqeVYwBHXg2g2gjhenP/05-pitch-match_4874fce4.webp)

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
| 3D Map | Three.js + React Three Fiber |
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
        PlayerStats.tsx         — Scatter plot, top scorers, player database
        TeamBudget.tsx          — Stacked bar chart, pie drill-down, top earners
        Attendance.tsx          — Bar chart, trend line, gravitational pull
        TravelMap.tsx           — Three.js 3D globe with animated arcs
        PitchMatch.tsx          — Heatmap, shot map, passing network
      NeuCard.tsx               — Neumorphic card wrapper
      ChartModal.tsx            — Full-screen chart expand modal
    lib/
      chartUtils.tsx            — All custom 3D chart shape components (2,200+ lines)
      mlsData.ts                — Complete 2025 MLS dataset (881 players, 510 matches)
      geoData.ts                — US state boundaries for the travel map
    contexts/
      FilterContext.tsx          — Global filter state (conference, position, team, age, salary)
    index.css                   — Design tokens, neumorphic shadows, animations
```

---

## Data

All data is embedded directly in TypeScript — no external API calls or database required. The dataset includes:

- **881 players** with 17 statistical columns (goals, assists, shots, tackles, salary, etc.)
- **510 matches** with scores, attendance, venues, and matchweek assignments
- **30 teams** with colors, abbreviations, stadium info, and conference affiliations
- **Stadium capacities** and geographic coordinates for the travel map

---

## Documentation

- **`HANDOFF.md`** — Comprehensive design system reference, component API documentation, known fixes, and development patterns
- **`ARCHITECTURE.md`** — Detailed guide for self-hosting outside Manus, build pipeline explanation, and deployment options

---

## License

This project is private and not licensed for redistribution.

---

Built with [Manus](https://manus.im)
