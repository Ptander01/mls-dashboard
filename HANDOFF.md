# MLS Analytics Dashboard — Project Handoff Document

**Project**: mls-dashboard  
**Version**: `09222d2b` (latest checkpoint)  
**Path**: `/home/ubuntu/mls-dashboard`  
**Stack**: React 19 + Tailwind CSS 4 + shadcn/ui + Recharts + Three.js + Framer Motion  
**Default Theme**: Light mode (switchable to dark)  
**Date**: March 12, 2026  
**Codebase**: 97 files, 16,384 total lines (8,816 custom code + 6,188 shadcn/ui library + 1,380 config/data)  

---

## 1. Design Philosophy: "Dark Forge" — Industrial Neumorphism

The dashboard follows the **"Dark Forge"** design movement, which blends Industrial Neumorphism with a Data Observatory aesthetic. The inspiration draws from aerospace HUDs, premium automotive instrument clusters (Porsche-style), and Bloomberg Terminal density. Every surface communicates depth, materiality, and precision.

### 1.1 Core Principles

The design is governed by four non-negotiable principles that must guide every future decision:

| Principle | Description |
|---|---|
| **Depth through shadow** | Every interactive element exists on a Z-plane. Inset and outset shadows create tactile, pressable surfaces. Nothing is flat. |
| **Matte darkness** | The background is never pure black — it is a warm charcoal (`#1a1a2e` → `#16213e`) with subtle noise texture overlaid. |
| **Precision typography** | Monospaced numbers (`JetBrains Mono`) for data, geometric sans (`Space Grotesk`) for labels. This creates a "mission control" feel. |
| **Ambient glow** | Accent colors emit soft light halos in dark mode, as if elements are backlit from within. Light mode uses subtle drop shadows instead. |

### 1.2 Color System

The color system is fully theme-aware, with separate palettes for dark and light modes defined as CSS custom properties in `client/src/index.css`.

**Dark Mode Palette:**

| Role | Color | Hex | Usage |
|---|---|---|---|
| Base | Matte charcoal | `#1a1a2e` | Page background, card surfaces |
| Primary accent | Electric cyan | `#00d4ff` | Active states, data highlights, progress |
| Secondary accent | Warm amber | `#ffb347` | Warnings, secondary metrics, warmth |
| Tertiary | Soft emerald | `#00c897` | Positive trends, success states |
| Danger | Coral red | `#ff6b6b` | Alerts, negative deltas |
| Text primary | Off-white | `#e8e8f0` | Body text, headings |
| Text secondary | Muted blue-gray | `#8892b0` | Captions, labels |

**Light Mode Palette:**

| Role | Color | Hex | Usage |
|---|---|---|---|
| Base | Soft lavender-gray | `#e4e4ec` | Page background |
| Primary accent | Deep teal | `#0891b2` | Active states |
| Secondary accent | Dark amber | `#d97706` | Warnings |
| Tertiary | Forest green | `#059669` | Positive trends |
| Danger | True red | `#dc2626` | Alerts |

All colors use OKLCH format in CSS variables for Tailwind CSS 4 compatibility. The semantic token system (`--cyan`, `--amber`, `--emerald`, `--coral`, `--surface`, `--surface-raised`, `--surface-sunken`) ensures components automatically adapt to the active theme.

### 1.3 Typography System

Three typefaces are loaded via Google Fonts CDN in `client/index.html`:

| Typeface | Role | Usage |
|---|---|---|
| **Space Grotesk** (400, 500, 600, 700) | Display & body | All headings, labels, navigation, body text |
| **JetBrains Mono** (400, 500, 700) | Data & numbers | Stat values, table cells, counters, axis labels |
| **Inter** (system fallback) | Fallback only | Not used as primary — explicitly avoided per design brief |

The hierarchy follows: 48px display → 24px section → 16px body → 12px caption. All numeric data uses `font-variant-numeric: tabular-nums` for perfect column alignment.

### 1.4 Neumorphic Shadow System

The neumorphic system is defined as CSS utility classes in `index.css` (lines 373–410), each powered by theme-aware CSS variables:

| Class | Effect | Use Case |
|---|---|---|
| `.neu-flat` | Flat surface with equal outset shadows | Default card state |
| `.neu-raised` | Elevated surface with stronger shadows + inset highlight | Primary cards, interactive elements |
| `.neu-pressed` | Inset shadows creating "pushed in" effect | Active/selected states |
| `.neu-concave` | Gradient background + inset shadows | Recessed containers, input fields |

The `NeuCard` component (`client/src/components/NeuCard.tsx`) wraps this system into a reusable React component with `variant`, `glow`, `animate`, and `delay` props.

### 1.5 Glassmorphism Layer

A secondary glassmorphism system is available via `.glass` and `.glass-sm` CSS classes. These use `backdrop-filter: blur(20px) saturate(1.4)` with semi-transparent backgrounds. The Recharts tooltip wrapper is globally styled with glassmorphism via `.recharts-tooltip-wrapper .recharts-default-tooltip` overrides.

### 1.6 Animation System

Entry animations use a **Z-axis assembly** pattern where elements fly in from depth:

| Animation | CSS Class | Description |
|---|---|---|
| `float-in` | `.animate-float-in` | `perspective(1200px) translateZ(300px)` → `translateZ(0)` with blur-to-sharp |
| `slide-up-fade` | `.animate-slide-up` | `translateY(30px)` → `translateY(0)` with opacity |
| `modal-enter` | (inline) | `perspective(1200px) translateZ(200px) scale(0.9)` → normal |

Stagger delays are available via `.stagger-1` through `.stagger-8` (0.05s → 0.88s). The `AnimatedCounter` component handles number count-up animations for stat cards.

A global smooth theme transition is applied to all elements (`background-color`, `border-color`, `box-shadow`, `color`) with 0.35s duration, except SVG/canvas/animation elements which are excluded for performance.

---

## 2. Custom 3D Chart Components

All custom chart components live in **`client/src/lib/chartUtils.tsx`** (1,191 lines). They are SVG-based custom shape renderers for Recharts that create the illusion of extruded 3D objects with directional lighting, gradient surfaces, and cast shadows.

### 2.1 Design Language for 3D Charts

The 3D effect system follows these universal rules:

- **Light source**: Top-left (consistent across all components)
- **Extrusion direction**: Right and down (simulating depth going away from viewer)
- **Gradient system**: 5-stop linear gradients on front faces simulating directional lighting (highlight → base → shadow)
- **Cast shadows**: Semi-transparent ellipses or rectangles offset below/right of objects
- **Theme awareness**: All components accept `isDark` and adjust shadow opacity, highlight intensity, and gradient stops accordingly

### 2.2 Component Reference

#### `Extruded3DBar` (line 187)

The standard vertical bar used in the **Player Stats** scatter plot and other single-bar contexts.

| Property | Value | Notes |
|---|---|---|
| Extrusion | `extrudeX = 4, extrudeY = 4` | Right face + bottom face parallelograms |
| Front face | 5-stop vertical gradient (highlight → base → shadow) | Simulates cylindrical lighting |
| Right face | Darkened base color (0.7 multiplier) with own gradient | Side plane catching less light |
| Bottom face | Further darkened (0.5 multiplier) | Underside in shadow |
| Cast shadow | Offset rectangle with Gaussian blur | `rgba(0,0,0, 0.35)` dark / `rgba(0,0,0, 0.15)` light |
| Top edge | 1px white highlight line | Catches the overhead light |

#### `Extruded3DStackedBar` (line 316)

Used in the **Team Budget** stacked salary bar chart. Extends `Extruded3DBar` with stack-position awareness.

| Property | Value | Notes |
|---|---|---|
| Stack positions | `bottom`, `middle`, `top` | Only `top` gets the top highlight; only `bottom` gets the cast shadow |
| Extrusion | `extrudeX = 4, extrudeY = 4` | Same as standard bar |
| **Bar offset fix** | `y - extrudeY` applied to all segments | Shifts bars up so the 3D bottom face rests ON the X axis line, not through it |
| Gap lines | 1px dark separator between segments | Prevents visual blending of adjacent colors |

> **Critical fix applied**: All bars are shifted upward by `extrudeY` (4px) so the 3D extrusion's bottom parallelogram lands exactly on the X axis line. Without this, bars appear to "hang through" the axis.

#### `Extruded3DHorizontalBar` (line 463)

Used in the **Attendance** tab's Gravitational Pull, Away Impact, and Home Response horizontal bar charts.

| Property | Value | Notes |
|---|---|---|
| Extrusion | `extrudeX = 3, extrudeY = 3` | Slightly smaller than vertical bars |
| Negative bar handling | Right-side 3D face rendered at `x + barWidth` edge | **Fix applied**: Negative bars (extending left from zero) now correctly show the 3D face on the side closest to the zero/average line |
| Direction awareness | Checks `width >= 0` to determine face placement | Positive bars get right face; negative bars get right face at their right edge (near zero) |

#### `Extruded3DBarWithCeiling` (line 679)

Used in the **Attendance** tab's main "Average Home Attendance by Team" bar chart. Adds stadium capacity markers.

| Property | Value | Notes |
|---|---|---|
| Extrusion | `extrudeX = 3, extrudeY = 3` | Slightly smaller extrusion |
| **Bar offset fix** | `adjustedY = y - extrudeY` | Same upward shift as stacked bars |
| **3D Braille Capacity Dots** | Replaces flat dashed lines | Each dot is a sphere with radial gradient (light top-left → dark bottom-right), cast shadow ellipse, and specular highlight |
| Dot spacing | Every 8px along the capacity line | Creates a textured "braille" appearance |
| Dot radius | 2.5px with 1.5px shadow offset | Small enough to read as a line, large enough to show 3D detail |

#### `Extruded3DPie` (line 854)

Used in the **Team Budget** tab's "Salary by Position" donut chart. This is a flat circular donut (NOT tilted) with neumorphic raised-ring styling.

| Property | Value | Notes |
|---|---|---|
| Geometry | Flat circle, `innerRadius` / `outerRadius` | Standard donut, viewed top-down |
| Segment gradients | 5-stop gradients along the arc direction | Simulates directional lighting on each pie slice |
| **Gradient intensity** | Toned down — max white mix at 25% (was 40%) | Per user request to reduce brightness on blue segments |
| Cast shadows | Dual-layer per segment (deep + ambient) | Offset based on segment's angular position relative to light source |
| **Inner hole** | Recessed matte floor (NOT raised dome) | Radial gradient darker at edges, lighter at center — simulates a concave bowl |
| **Inward shadows** | Segments cast shadows onto the inner floor | Shadow direction based on each segment's midpoint angle |
| **Inner wall glow** | Light-facing segments get subtle illumination on their inner arc edge | The interior wall of the donut ring catches light |
| Gap rendering | 1.5px dark gaps between segments | Uses `stroke` on segment paths, color matches theme |
| Outer shadow | Large ambient shadow around entire donut | Creates the "floating above surface" effect |
| **Labels** | Name + dollar amount + percentage | e.g., "Forwards / $14.5M (40.1%)" |

#### `Extruded3DDot` (line 560)

Used in the **Player Stats** scatter plot. Each data point is a 3D sphere.

| Property | Value | Notes |
|---|---|---|
| Sphere effect | Radial gradient (highlight top-left → base → dark bottom-right) | Simulates spherical lighting |
| Cast shadow | Offset ellipse below-right | Semi-transparent with blur |
| Specular highlight | Small white circle at top-left | Adds gloss/glass feel |

#### `create3DAreaGradient` (line 634)

Creates SVG `<linearGradient>` definitions for area charts with a 3D depth effect. Returns a unique gradient ID and the `<defs>` JSX to inject into the SVG.

#### `LineShadowFilter` (line 666)

SVG filter definition that adds drop shadows to line chart strokes. Applied via `filter={url(#lineShadow3d)}` on Recharts `<Line>` components.

#### `LINE_3D_STYLE` (line 656)

Constant object with default line styling: `strokeWidth: 2.5`, `strokeLinecap: 'round'`, `strokeLinejoin: 'round'`.

### 2.3 Team Color System

The function `teamColor(teamId, isDark)` (around line 10) returns the official team color for any MLS team ID. The `mutedTeamColor(teamId, isDark)` variant (line 83) returns a desaturated version for backgrounds. The `positionColor(position, isDark)` function (line 102) returns colors for GK/DF/MF/FW positions.

### 2.4 Linear Regression

The `linearRegression(data)` function (line 109) computes slope, intercept, and R-squared for the scatter plot trend line. Used in the Player Stats tab's "Player Comparison" chart.

---

## 3. Known Fixes and Patterns

This section documents critical bugs that were discovered and fixed during development. Future developers must be aware of these to avoid regressions.

### 3.1 The `.flex { min-height: 0; min-width: 0 }` Override

**Location**: `client/src/index.css`, line 354–357

The template includes a global override on `.flex` that sets `min-height: 0` and `min-width: 0`. This is useful for preventing flex children from overflowing, but it **breaks any component that relies on flex containers to size their children** — most notably, the `ChartModal` component.

**Impact**: When the modal used Tailwind's `flex` and `flex-1` classes, the chart content collapsed to zero height because `min-height: 0` prevented the flex child from expanding.

**Solution**: The `ChartModal` component (`client/src/components/ChartModal.tsx`) was rewritten to use **explicit inline `style` attributes** instead of Tailwind flex classes. This bypasses the global override entirely. Any future modal or overlay component should follow the same pattern.

### 3.2 Bar Offset Above X Axis

**Problem**: 3D extruded bars have a bottom face parallelogram that extends below the bar's actual Y+height position. The X axis line sits at the bar's mathematical bottom, so the 3D extrusion passes through it, making bars appear to "hang through" the axis.

**Solution**: In both `Extruded3DStackedBar` and `Extruded3DBarWithCeiling`, the bar's Y position is shifted upward by `extrudeY` pixels:

```tsx
// In Extruded3DStackedBar:
const adjustedY = y - extrudeY;

// In Extruded3DBarWithCeiling:
const adjustedY = y - extrudeY;
```

This ensures the 3D bottom face lands exactly on the X axis line. If you create any new extruded bar component, you must apply this same offset.

### 3.3 Negative Horizontal Bar Missing Face

**Problem**: In `Extruded3DHorizontalBar`, the right-side 3D face was only rendered when `width >= 0`. For negative bars (extending left from the zero line), no face was drawn on the edge closest to the average/zero reference line.

**Solution**: Added a conditional branch that renders the right-side face at the `x + barWidth` position for negative bars. The face is drawn as a parallelogram from the bar's right edge (which is the edge nearest zero for negative values).

### 3.4 Flat Attendance Data for Some Teams

**Problem**: Austin FC, FC Dallas, St. Louis City, and FC Cincinnati had identical attendance values across all home games, producing perfectly flat trend lines.

**Solution**: A Python script (`/home/ubuntu/fix_attendance.py`) was run to inject realistic variance into the match data in `mlsData.ts`. Each team's attendance values were adjusted with random offsets (typically ±5-15% of base value) while keeping the average consistent with the original.

### 3.5 SVG Overflow for 3D Effects

**Location**: `client/src/index.css`, lines 748–756

Recharts clips SVG content by default, which cuts off the 3D extrusion faces and cast shadows. The following CSS overrides are essential:

```css
.recharts-surface { overflow: visible; }
.recharts-bar, .recharts-scatter, .recharts-line, .recharts-area { overflow: visible; }
```

### 3.6 Theme Transition Exclusions

**Location**: `client/src/index.css`, lines 974–990

A global 0.35s transition is applied to all elements for smooth theme switching. However, SVG elements, canvas, and animation classes are explicitly excluded to prevent performance issues and visual glitches during chart rendering.

---

## 4. File Structure and Key Logic Locations

### 4.1 Directory Tree

```
mls-dashboard/
├── client/
│   ├── index.html                          # Entry HTML, Google Fonts CDN links
│   ├── public/                             # Static assets (favicon only)
│   └── src/
│       ├── App.tsx                          # Root component, routing, providers (35 lines)
│       ├── main.tsx                         # React entry point
│       ├── index.css                        # ALL design tokens, neumorphic system, animations (991 lines)
│       ├── pages/
│       │   ├── Home.tsx                     # Main dashboard page, tab system, hero section (303 lines)
│       │   └── NotFound.tsx                 # 404 page
│       ├── components/
│       │   ├── NeuCard.tsx                  # Neumorphic card wrapper component
│       │   ├── ChartModal.tsx               # Full-screen chart expand modal + MaximizeButton
│       │   ├── AnimatedCounter.tsx          # Number count-up animation for stat cards
│       │   ├── FilterPanel.tsx              # Collapsible left filter panel (glassmorphism)
│       │   ├── ErrorBoundary.tsx            # React error boundary
│       │   ├── ManusDialog.tsx              # Manus-branded dialog
│       │   ├── Map.tsx                      # Google Maps integration (proxy-authenticated)
│       │   ├── tabs/
│       │   │   ├── PlayerStats.tsx          # Scatter plot, top scorers, player table (846 lines)
│       │   │   ├── TeamBudget.tsx           # Stacked salary bars, pie chart, budget table (262 lines)
│       │   │   ├── Attendance.tsx           # Bar chart, trend, gravitational pull (649 lines)
│       │   │   ├── TravelMap.tsx            # 3D Three.js globe/map with travel arcs (1,173 lines)
│       │   │   └── PitchMatch.tsx           # Soccer pitch visualization (447 lines)
│       │   └── ui/                          # shadcn/ui components (50+ files)
│       ├── contexts/
│       │   ├── FilterContext.tsx            # Global filter state (teams, age, salary, position, conference)
│       │   └── ThemeContext.tsx             # Dark/light theme toggle
│       ├── hooks/
│       │   ├── useComposition.ts            # Composition utilities
│       │   ├── useMobile.tsx                # Mobile detection hook
│       │   └── usePersistFn.ts              # Persistent function reference hook
│       └── lib/
│           ├── chartUtils.tsx               # ALL custom 3D chart components (1,191 lines) ⭐
│           ├── mlsData.ts                   # ALL data: 30 teams, 881 players, 510 matches (1,559 lines) ⭐
│           ├── geoData.ts                   # Geographic data for travel map
│           └── utils.ts                     # Tailwind merge utility
├── server/
│   └── index.ts                            # Placeholder (static-only project)
├── shared/
│   └── const.ts                            # Shared constants
├── ideas.md                                # Design brainstorm document
├── todo.md                                 # Task tracking
├── package.json                            # Dependencies
├── vite.config.ts                          # Vite configuration
├── tsconfig.json                           # TypeScript config
└── components.json                         # shadcn/ui config
```

### 4.2 Key Dependencies

| Package | Version | Purpose |
|---|---|---|
| `react` | 19.2.1 | UI framework |
| `recharts` | 2.15.2 | Chart library (all 2D charts) |
| `three` + `@types/three` | 0.183.1 | 3D rendering for Travel Map |
| `framer-motion` | 12.23.22 | Advanced animations |
| `lucide-react` | 0.453.0 | Icon library |
| `tailwind-merge` | 3.3.1 | Tailwind class merging |
| `wouter` | 3.7.1 | Client-side routing |
| `sonner` | 2.0.7 | Toast notifications |
| `earcut` | 3.0.2 | Polygon triangulation (for Three.js) |

### 4.3 Data Model

All data lives in `client/src/lib/mlsData.ts` as exported constants. There is no backend or API — everything is client-side.

| Export | Type | Count | Description |
|---|---|---|---|
| `TEAMS` | `Team[]` | 30 | All MLS teams with id, name, stadium, city, lat/lng, color, conference |
| `PLAYERS` | `Player[]` | 881 | All players with 22 stat fields (goals, assists, shots, salary, etc.) |
| `MATCHES` | `Match[]` | 510 | All 2025 season matches with attendance, venue, scores |
| `TEAM_BUDGETS` | `Record<string, TeamBudget>` | 30 | Salary breakdown: DP, TAM, regular per team |

### 4.4 Global State Architecture

The app uses two React contexts:

**`ThemeContext`** manages dark/light mode. The `ThemeProvider` wraps the entire app with `defaultTheme="light"` (changed from dark per user preference). The 3D neumorphic theme toggle button in the header switches between modes with a 0.35s CSS transition on all elements.

**`FilterContext`** manages the global filter panel state. Filters include: selected teams, selected players, age range, minutes range, salary range, position filter (GK/DF/MF/FW), and conference filter (Eastern/Western). All tab components consume `useFilters()` to get `filteredPlayers`, `filteredMatches`, and `filteredTeams`.

---

## 5. Tab-by-Tab Feature Summary

### 5.1 Player Stats

The Player Stats tab features a configurable scatter plot ("Player Comparison") where users select X and Y axis metrics from dropdowns (Shots, Goals, Assists, Minutes, Age, Salary, etc.). The scatter plot uses `Extruded3DDot` for 3D sphere data points and supports two coloring modes: by Team (official team colors) and by Position. A toggleable trend line shows linear regression with R-squared value. A "Top Scorers" leaderboard sits to the right. Below, a full data table with all 881 players supports sorting, and clicking any row or dot opens a player detail card.

### 5.2 Team Budget

The Team Budget tab shows a stacked bar chart of all 30 teams' salary breakdowns (DP, TAM, Regular) using `Extruded3DStackedBar`. Clicking a team bar reveals a drill-down `Extruded3DPie` donut chart showing salary by position (GK, DF, MF, FW) with percentages in labels. A budget comparison table shows all teams' financial details.

### 5.3 Attendance

The Attendance tab has three main sections. The top bar chart ("Average Home Attendance by Team") uses `Extruded3DBarWithCeiling` with 3D braille capacity dots. It supports a "Fill Rate" toggle that switches to percentage view. Below, an "Attendance Trend by Matchweek" line/area chart shows weekly attendance for a selected team with a capacity reference line. The bottom section is the "Gravitational Pull" horizontal bar chart using `Extruded3DHorizontalBar`, showing each team's cumulative attendance impact when visiting away venues. Clicking a team bar reveals two drill-down panels: "Away Impact" and "Home Response."

### 5.4 Travel Map

The Travel Map tab renders a 3D Three.js scene with a ground plane representing North America. Stadium locations are shown as glowing orbs, and travel routes are rendered as metallic arcs. The map supports orbit controls (rotate, zoom, pan). This tab is the most complex (1,173 lines) and has pending improvements listed in `todo.md`.

### 5.5 Pitch Match

The Pitch Match tab visualizes player positions on a soccer pitch diagram. Players are placed according to their positional data with team-colored markers.

---

## 6. User Preferences and Pending Ideas

### 6.1 Established Preferences

Throughout development, the user has consistently expressed these preferences:

- **3D depth is paramount**: Every visual element should have the extruded 3D treatment with gradients, lighting, and cast shadows. Flat elements feel incomplete.
- **Consistency across all charts**: The same 3D language (gradient lighting, cast shadows, extrusion faces) must be applied uniformly. If bars have it, pie charts need it. If bars have it, reference lines need it (hence the braille dots).
- **No tilted/perspective pie charts**: The pie chart must remain a flat circle viewed top-down. The 3D effect comes from gradients, shadows, and the raised-ring donut shape — NOT from tilting the geometry.
- **Matte, not glossy**: Gradients should be subtle. The user specifically asked to tone down the blue segment's white highlight. Aim for brushed metal, not chrome.
- **Light mode is preferred**: The user prefers light mode as the default experience. Dark mode must still work and look great, but light mode is the primary showcase. The default theme has been set to `"light"` in `App.tsx`.

### 6.2 Pending TODO Items

From `todo.md`, these items remain open:

**Travel Map Rebuild (Major)**:
- Fetch real GeoJSON (US states, Canada provinces, coastlines) from Natural Earth
- Rebuild ground plane with proper cartographic terrain texture
- Render smooth vector state/province borders as Three.js line geometry
- Add subtle terrain variation (elevation hints, urban area patches)
- Improve orb materials (denser glass, proper Fresnel, ground light pools)
- Add vertical light pillars from each stadium (Craig Taylor style)
- Improve arc rendering (thinner, more elegant metallic tubes)
- Team-colored animated flow dots on arcs
- Proper depth of field / atmospheric perspective

**Modal/Data Fixes (Minor)**:
- The `todo.md` still lists the modal and flat data bugs as open, but both have been fixed in the latest checkpoint. These items should be marked as complete.

### 6.3 New Feature Idea: Racing Team Leaderboard Tab

The user has proposed a new **"Race Chart"** tab concept — a racing-style animated leaderboard synchronized to a timeline scrubber. The concept:

- A horizontal bar chart where each bar represents a team, and the bar length represents a cumulative metric (e.g., total points, total goals, total salary spend)
- A timeline slider at the bottom represents matchweeks (1–34)
- As the user scrubs or plays the timeline, the bars animate and re-sort in real-time, creating a "racing" effect where teams overtake each other
- The animation should feel like a Formula 1 leaderboard or the popular "bar chart race" visualization format
- Each bar should use the team's official color and the same 3D extruded style as existing bars
- Consider adding a "play" button that auto-advances the timeline at a configurable speed
- Could track multiple metrics: cumulative points, cumulative goals scored, cumulative attendance, cumulative salary spend

**Implementation notes**: This would be a new tab component at `client/src/components/tabs/RaceChart.tsx`. The match data in `mlsData.ts` already has `week` fields, so cumulative stats can be computed by filtering matches up to the current week. The `Extruded3DHorizontalBar` component could be reused for the racing bars. Framer Motion's `AnimatePresence` and `layout` animations would handle the smooth reordering.

---

## 7. How to Export the Project to GitHub

The Manus platform provides a built-in GitHub export feature. Follow these steps:

### 7.1 Using the Manus Management UI (Recommended)

1. Open the **Management UI** panel (click the panel icon in the Chatbox header or any card's "View" button)
2. Navigate to **Settings** in the left sidebar
3. Click the **GitHub** sub-panel
4. You will be prompted to authenticate with your GitHub account if not already connected
5. Select the **owner** (your personal account or an organization)
6. Enter a **repository name** (e.g., `mls-analytics-dashboard`)
7. Click **Export** — this creates a new repository with all project files

### 7.2 Manual GitHub Export (Alternative)

If you prefer manual control, you can use the GitHub CLI (`gh`) which is pre-installed in the sandbox:

```bash
# Navigate to the project directory
cd /home/ubuntu/mls-dashboard

# Initialize git (if not already)
git init
git add -A
git commit -m "MLS Analytics Dashboard - Full project export"

# Authenticate with GitHub
gh auth login

# Create a new repository and push
gh repo create mls-analytics-dashboard --public --source=. --push
```

### 7.3 Important Notes for External Hosting

- The project is designed for Manus's built-in hosting with custom domain support (currently at `mlsanalytics-fbeeqevy.manus.space`)
- If deploying to Vercel, Netlify, or similar: the project is a standard Vite + React SPA. Run `pnpm build` to generate the `dist/` folder
- The Google Maps integration uses a Manus proxy for authentication — this will NOT work on external hosts. You would need to provide your own Google Maps API key
- All data is client-side (no backend), so any static hosting service will work for the core dashboard
- The Three.js Travel Map tab is resource-intensive; ensure the hosting service supports large JavaScript bundles

### 7.4 Publishing on Manus

To publish the live site on Manus:

1. Ensure a checkpoint has been saved (latest: `09222d2b`)
2. Click the **Publish** button in the Management UI header (top-right)
3. The site will be deployed to the configured domain

---

## 8. Development Environment Quick Start

For a new Manus chat session picking up this project:

```bash
# The project is already at /home/ubuntu/mls-dashboard
cd /home/ubuntu/mls-dashboard

# Install dependencies (if needed after sandbox hibernation)
pnpm install

# Start the dev server
pnpm dev
```

The dev server runs on port 3000. The project uses Vite with HMR (Hot Module Replacement), so changes to any file in `client/src/` are reflected instantly in the browser.

### 8.1 Key Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Start development server on port 3000 |
| `pnpm build` | Build for production (outputs to `dist/`) |
| `npx tsc --noEmit` | Type-check without building |

### 8.2 Prompt for New Chat Session

When starting a new chat to continue work on this project, provide the following context:

> "I have an existing Manus webdev project called `mls-dashboard` at `/home/ubuntu/mls-dashboard`. It's an MLS Analytics Dashboard built with React 19 + Tailwind CSS 4 + Recharts + Three.js. The design follows a 'Dark Forge' Industrial Neumorphism style with 3D extruded chart components. Please read the handoff document at `/home/ubuntu/MLS_Dashboard_Project_Handoff.md` for full context on the design system, custom components, known fixes, and pending work."

---

## 9. Appendix: CSS Variable Quick Reference

The complete set of theme-aware CSS variables is defined in `client/src/index.css`. Here are the most frequently referenced ones:

| Variable | Dark Value | Light Value | Usage |
|---|---|---|---|
| `--background` | `oklch(0.13 0.01 280)` | `oklch(0.94 0.005 260)` | Page background |
| `--card` | `oklch(0.17 0.012 280)` | `oklch(0.93 0.005 260)` | Card surfaces |
| `--cyan` | `#00d4ff` | `#0891b2` | Primary accent |
| `--amber` | `#ffb347` | `#d97706` | Secondary accent |
| `--surface` | `#1e1e2e` | `#e4e4ec` | Neumorphic base surface |
| `--surface-raised` | `#252538` | `#eaeaf2` | Elevated surface |
| `--surface-sunken` | `#161625` | `#dcdce6` | Recessed surface |
| `--neu-shadow-dark` | `rgba(0,0,0,0.5)` | `rgba(166,170,190,0.45)` | Dark shadow in neumorphic pair |
| `--neu-shadow-light` | `rgba(60,60,80,0.12)` | `rgba(255,255,255,0.8)` | Light shadow in neumorphic pair |
| `--glass-bg` | `rgba(20,20,40,0.55)` | `rgba(240,240,248,0.45)` | Glassmorphism background |


---

## 10. Insight Engine (Tier 1 — March 13, 2026)

### 10.1 Overview

The Insight Engine transforms the dashboard from a descriptive data explorer into a **data narrator**. Rather than leaving users to infer conclusions, every tab now surfaces computed, context-aware headlines and expandable insight cards that highlight the most significant findings in the current data view.

The implementation follows three core patterns:

| Pattern | Description |
|---|---|
| **Computed Headlines** | Every tab displays a dynamically generated sentence above the static description. The headline updates when filters or axes change, always surfacing the most interesting finding. |
| **Analyze Button + Insight Cards** | A neumorphic "ANALYZE" toggle reveals a 2x2 grid of insight cards, each with an icon, bold headline, and supporting detail paragraph. Clicking again collapses the panel (button text changes to "EXPLORE"). |
| **Outlier Annotations** | The Player Stats scatter plot auto-labels the top 2 overperformers and top 2 underperformers relative to the regression line, using cyan (over) and coral (under) text labels directly on the chart. |

### 10.2 Architecture

The system is implemented across three files with zero new dependencies:

| File | Purpose |
|---|---|
| `client/src/lib/insightEngine.ts` | Pure TypeScript analysis module. Contains all headline generators, insight card computers, and outlier detection. Every function is memoizable and takes filtered data as input. |
| `client/src/components/InsightPanel.tsx` | Two exported components: `InsightPanel` (the ANALYZE toggle + card grid with Framer Motion animations) and `InsightHeadline` (the animated headline that updates when data changes). |
| Tab files (`PlayerStats.tsx`, `TeamBudget.tsx`, `Attendance.tsx`) | Each tab imports the relevant engine functions and UI components, wiring them into the existing layout between the tab description and summary cards. |

### 10.3 Insight Engine Functions

The `insightEngine.ts` module exports the following functions:

**Player Stats Tab:**
- `playerStatsHeadline(players, xAxis, yAxis)` — Generates a context-aware headline based on the current scatter plot axes. Has special-case narratives for Salary vs Goals (value), Shots vs Goals (efficiency), Age vs Goals (peak age), and Minutes vs Salary (availability premium). Falls back to R²-based generic headlines.
- `playerStatsInsights(players)` — Returns up to 4 insight cards covering: best goal bargain (cost per goal), position efficiency gap, discipline outlier, and age vs output analysis.
- `computeOutliers(scatterData, regression, count)` — Identifies the top N overperformers and underperformers by residual distance from the regression line, filtered by a 0.8 standard deviation significance threshold.

**Team Budget Tab:**
- `teamBudgetHeadline(teams, players)` — Computes ROI narrative (cost per goal by team), or spending gap narrative when ROI data is insufficient.
- `teamBudgetInsights(teams, players)` — Returns up to 4 cards: DP efficiency analysis, conference spending gap, roster construction diversity (DP share variance), and salary-to-output mismatch.

**Attendance Tab:**
- `attendanceHeadline(matches, teams)` — Surfaces the highest-attendance team, league median comparison, and capacity fill rate failures.
- `attendanceInsights(matches, teams)` — Returns up to 4 cards: gravitational pull (the "Messi effect"), fill rate analysis, attendance volatility (coefficient of variation), and weekend vs weekday effect.

### 10.4 Design Integration

The insight components follow the Dark Forge design system precisely:

- **InsightPanel button**: Uses `neu-raised` / `neu-pressed` shadow pairs, `Space Grotesk` font, uppercase tracking, and the `Lightbulb` icon from Lucide.
- **Insight cards**: Each card has a subtle accent-colored background tint (6% opacity), neumorphic inset/outset shadows, and a small icon badge in a recessed container. The four accent colors (`cyan`, `amber`, `emerald`, `coral`) are mapped from the existing CSS variable system.
- **InsightHeadline**: Uses `Space Grotesk` at font-weight 500 for the computed headline, with `AnimatePresence` keyed to the headline string so it cross-fades when axes or filters change.
- **Outlier labels**: Rendered as Recharts `ReferenceLine` labels with `Space Grotesk` at 9px, using cyan for overperformers and coral for underperformers. Only the player's last name is shown to avoid clutter.

### 10.5 How Headlines Update

Headlines are fully reactive to the filter system. When a user:
- Changes the scatter plot X or Y axis → the Player Stats headline recomputes with axis-specific narratives
- Filters to a single team → the Team Budget headline switches to a single-team summary
- Filters by conference → all headlines recompute using only the filtered subset
- Adjusts age/salary sliders → insights recalculate with the narrowed player pool

All computations are wrapped in `useMemo` with appropriate dependency arrays for performance.

### 10.6 Per-Card Inline Insights (March 13, 2026)

In addition to the tab-wide headline and ANALYZE panel, each individual NeuCard section now has its own compact insight button in the card header. This creates a **layered insight architecture**: the tab-level headline provides the big-picture narrative, while per-card insights give contextual analysis specific to that card's data.

| Component | File | Description |
|---|---|---|
| `CardInsightButton` | `client/src/components/CardInsight.tsx` | A compact lightbulb icon button that toggles a frosted-glass dropdown of 2-3 insights. Positioned inline with other header controls (maximize, toggles). |
| `CardInsightInline` | `client/src/components/CardInsight.tsx` | An alternative inline variant that expands insights directly below the card header (not currently used, available for future cards). |

The following cards in the Player Stats tab have per-card insight buttons:

| Card | Insight Generator | Example Insights |
|---|---|---|
| **Player Comparison** (scatter plot) | `scatterCardInsights(players, xAxis, yAxis, r2)` | R² interpretation with plain-English strength label; position gap analysis (e.g., "FWs average 6.5 goals vs GKs at 0.0"); data coverage note. Updates when axes change. |
| **Top Scorers** | `topScorersCardInsights(players)` | Scoring concentration across teams; position breakdown of top 10; salary efficiency comparison of top scorer vs most expensive scorer. |
| **Player Radar** (selected player) | `playerRadarCardInsights(player, allPlayers)` | Position peer ranking (e.g., "Ranks #1 in goals among 105 FWs"); age group comparison; salary bracket peer comparison. Dynamically generated per selected player. |
| **Player Database** | `playerTableCardInsights(players)` | Salary distribution (median, top earner, zero-salary count); position balance; age demographics (youngest, oldest, median). |

The per-card insight generators are defined in `client/src/lib/insightEngine.ts` and follow the same memoization pattern as the tab-level functions.


---

## 11. Pending Work — Future Session Queue

The following items are organized by recommended session grouping to minimize file conflicts when working across multiple Manus sessions. Each session should clone fresh from GitHub, complete its scope, and push before the next session begins.

### 11.1 Session Priority: Visual & Animation Upgrades

**3D Radar Chart** — Convert the current flat 2D radar chart (Recharts `RadarChart`) in the player detail card to a Three.js-powered 3D radar with the same Dark Forge neumorphic treatment as the Travel Map globe. The radar should rotate subtly on hover and use extruded polygon faces with team-colored fills.

**Animation Polish** — Audit all tab transitions, card expansions, and data loading states for consistent Framer Motion easing curves. Ensure all animations use the project's standard `[0.22, 1, 0.36, 1]` cubic-bezier. Add staggered entrance animations to summary stat cards and table rows on tab switch.

**Files likely touched:** `PlayerStats.tsx` (radar section), possibly a new `Radar3D.tsx` component, Framer Motion configs.

### 11.2 Session Priority: Team Leaderboard (New Component)

**Animated Team Leaderboard** — A new tab or section that shows team rankings with animated bar chart race behavior. Key requirements:
- Timeline scrubber to animate ranking changes over the season (week-by-week)
- Toggle to split into East/West conference view or show all 30 teams combined
- Bars should use team colors and smoothly reorder as rankings change
- Follow the Dark Forge neumorphic container treatment

**Files likely touched:** New `TeamLeaderboard.tsx` component, `Home.tsx` (if adding a new tab), `mlsData.ts` (if weekly standings data is needed).

### 11.3 Session Priority: Attendance Pane Fixes

**Capacity Chart Overhang** — The capacity fill chart's bars overhang the x-axis boundary. Needs clipping or domain adjustment.

**3D Braille Effect on Capacity Line** — The capacity fill line chart should have the same 3D extruded dot/braille treatment as other chart elements in the design system.

**Attendance Drill-Down** — The attendance/week line graph needs three view modes:
1. All teams side-by-side (small multiples or overlaid lines)
2. League average only (single smoothed line)
3. League total (aggregate sum per week)

**Files likely touched:** `Attendance.tsx`, possibly `chartUtils.tsx`.

### 11.4 Session Priority: Maximize Modal Fixes

**Charts Struggle in Maximize View** — Several tabs have charts that render tiny, compressed, or fail to resize properly when the maximize (expand) button is clicked. This is a recurring issue across tabs. Root cause is likely that the chart components don't re-measure their container dimensions after the modal animation completes. Fix should involve a resize observer or delayed re-render after the modal transition.

**Files likely touched:** `NeuCard.tsx` (modal system), individual tab files that use the maximize feature.

### 11.5 Layout: Ultrawide Display Optimization

The dashboard currently uses a constrained max-width that wastes significant horizontal space on ultrawide monitors (e.g., 32" 4K). The user's preference is to take better advantage of large displays while remaining reasonable on standard screens. The approach should be:
- Increase the main container max-width or switch to a fluid width with reduced side margins
- Use responsive breakpoints so standard monitors (1080p, 1440p) still look balanced
- Mobile responsiveness is not a priority but should not be actively broken

**Files likely touched:** `Home.tsx` or the main layout wrapper, possibly `index.css` for responsive breakpoints.

---

