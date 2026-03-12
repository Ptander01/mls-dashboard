# MLS Analytics Dashboard — Architecture and Self-Hosting Guide

**Author**: Manus AI
**Date**: March 12, 2026
**Repo**: `github.com/Ptander01/mls-dashboard`

---

## 1. How the Dashboard Runs Inside Manus

The MLS Analytics Dashboard is a **static frontend application** built with React 19, Tailwind CSS 4, and Vite. Inside the Manus sandbox, it runs as a Vite dev server on port 3000. There is no database, no backend API, and no server-side logic powering the dashboard — all 881 players, 510 matches, and 30 teams are embedded directly in the TypeScript source code as static data.

### 1.1 The Manus Runtime Stack

When running inside Manus, the project uses this stack:

| Layer | Technology | Purpose |
|---|---|---|
| **Dev Server** | Vite 7.1 | Hot Module Replacement, serves `client/` directory |
| **Framework** | React 19 | Component rendering and state management |
| **Styling** | Tailwind CSS 4 + shadcn/ui | Design tokens, utility classes, pre-built components |
| **Charts** | Recharts 2.15 | SVG-based charting with custom 3D shape renderers |
| **3D Map** | Three.js 0.183 | WebGL-powered Travel Map with GeoJSON polygons |
| **Animations** | Framer Motion 12 | Page transitions, entrance animations |
| **Routing** | Wouter 3.3 | Client-side routing (single page app) |
| **Data** | Static TypeScript files | `mlsData.ts` (1,559 lines) and `geoData.ts` (40KB) |

### 1.2 Manus-Specific Components (What You Can Remove)

The project includes several Manus-specific plugins and files that are **only needed inside the Manus sandbox** and should be removed or ignored for self-hosting:

**`vite-plugin-manus-runtime`** — This Vite plugin injects a small runtime script that enables Manus's Management UI features (live preview, visual editor, analytics integration). It sets `window.__MANUS_HOST_DEV__` and provides communication between the dashboard and the Manus platform. For self-hosting, this plugin does nothing harmful but is unnecessary.

**`vite-plugin-manus-debug-collector`** — Defined inline in `vite.config.ts` (lines 77-151), this plugin collects browser console logs, network requests, and session replay events and writes them to `.manus-logs/` files. This is purely a development debugging tool for the Manus agent. For self-hosting, you can safely remove the entire plugin function and its reference in the `plugins` array.

**`client/public/__manus__/debug-collector.js`** — The client-side counterpart of the debug collector (821 lines). Intercepts `console.log`, `fetch`, and DOM events to send them to the Vite dev server. Safe to delete entirely.

**Analytics script in `client/index.html`** — The `<script>` tag referencing `%VITE_ANALYTICS_ENDPOINT%/umami` is Manus's built-in Umami analytics. Without the environment variables set, this script tag will fail silently and do nothing. You can remove it or replace it with your own analytics (Google Analytics, Plausible, etc.).

**`client/src/const.ts`** — References `VITE_OAUTH_PORTAL_URL` and `VITE_APP_ID` for Manus OAuth. Since this dashboard doesn't use authentication, these are unused. Safe to ignore.

**`client/src/components/Map.tsx`** — A Google Maps integration component that uses Manus's proxy API key (`VITE_FRONTEND_FORGE_API_KEY`). This component is **not imported or used** by any tab in the dashboard. The Travel Map tab uses Three.js with embedded GeoJSON data instead. Safe to ignore or delete.

### 1.3 Environment Variables

The Manus sandbox injects these environment variables, but **none of them are required** for the dashboard to function:

| Variable | Used By | Required for Self-Hosting? |
|---|---|---|
| `VITE_FRONTEND_FORGE_API_KEY` | `Map.tsx` (unused) | No |
| `VITE_FRONTEND_FORGE_API_URL` | `Map.tsx` (unused) | No |
| `VITE_OAUTH_PORTAL_URL` | `const.ts` (unused) | No |
| `VITE_APP_ID` | `const.ts` (unused) | No |
| `VITE_ANALYTICS_ENDPOINT` | `index.html` analytics | No (remove the script tag) |
| `VITE_ANALYTICS_WEBSITE_ID` | `index.html` analytics | No (remove the script tag) |
| `VITE_APP_LOGO` | Not referenced in code | No |
| `VITE_APP_TITLE` | Not referenced in code | No |

The dashboard is **100% self-contained** — all data is embedded in TypeScript files, all images are served from CloudFront CDN URLs, and there are no API calls to external services.

### 1.4 External Dependencies (CDN-Hosted Assets)

The dashboard references two images hosted on Manus's CloudFront CDN:

| Asset | File | URL |
|---|---|---|
| Hero stadium background | `Home.tsx` line 12 | `https://d2xsxph8kpxj0f.cloudfront.net/.../hero-stadium-*.webp` |
| Pitch background | `PitchMatch.tsx` line 12 | `https://d2xsxph8kpxj0f.cloudfront.net/.../pitch-bg-*.webp` |

These URLs are publicly accessible and will continue to work. However, if you want full independence from Manus infrastructure, you should download these images and host them yourself (see Section 3.3).

Google Fonts are loaded from `fonts.googleapis.com` for **JetBrains Mono** and **Space Grotesk**. These are standard Google Fonts CDN links and will always work.

---

## 2. Project Architecture

### 2.1 Data Flow

The dashboard follows a simple unidirectional data flow with no backend:

```
Static Data (mlsData.ts)
    ↓
FilterContext (global React context)
    ↓ filteredPlayers, filteredMatches, filteredTeams
Tab Components (PlayerStats, TeamBudget, Attendance, TravelMap, PitchMatch)
    ↓
Custom 3D Chart Renderers (chartUtils.tsx)
    ↓
SVG/Canvas Output (Recharts + Three.js)
```

**`mlsData.ts`** (1,559 lines) contains all player data (881 players with 17 attributes each), match results (510 matches), team metadata (30 teams with colors, stadium info, conference), and derived statistics. Every computation happens client-side in the browser.

**`FilterContext.tsx`** provides global filtering state. Users can filter by team, player, age range, minutes played, salary range, position, and conference. All five tabs consume the same filtered dataset.

**`chartUtils.tsx`** (1,191 lines) is the heart of the visual system. It exports 8 custom Recharts shape components that render the 3D neumorphic bar, pie, and dot effects using SVG gradients, shadows, and geometric extrusion.

### 2.2 File Structure Summary

```
mls-dashboard/
├── client/                          # Frontend application
│   ├── index.html                   # Entry HTML (Google Fonts, analytics)
│   ├── public/                      # Static files (favicon, debug collector)
│   └── src/
│       ├── main.tsx                 # React entry point
│       ├── App.tsx                  # Routes + ThemeProvider + FilterProvider
│       ├── index.css                # 990 lines — full neumorphic design system
│       ├── pages/
│       │   └── Home.tsx             # Main dashboard page with tab navigation
│       ├── components/
│       │   ├── tabs/                # 5 tab components (the main content)
│       │   │   ├── PlayerStats.tsx  # Scatter plot, top scorers, radar charts
│       │   │   ├── TeamBudget.tsx   # Stacked salary bars, pie chart, DP table
│       │   │   ├── Attendance.tsx   # Bar charts, trends, gravitational pull
│       │   │   ├── TravelMap.tsx    # Three.js 3D map with animated arcs
│       │   │   └── PitchMatch.tsx   # Soccer pitch visualization
│       │   ├── ui/                  # 53 shadcn/ui components
│       │   ├── NeuCard.tsx          # Neumorphic card wrapper
│       │   ├── ChartModal.tsx       # Expand/maximize chart modal
│       │   └── FilterPanel.tsx      # Global filter sidebar
│       ├── contexts/
│       │   ├── ThemeContext.tsx      # Dark/light mode toggle
│       │   └── FilterContext.tsx     # Global data filtering
│       ├── hooks/                   # Custom React hooks
│       └── lib/
│           ├── mlsData.ts           # All MLS player/match/team data
│           ├── geoData.ts           # GeoJSON polygons for Travel Map
│           ├── chartUtils.tsx       # 8 custom 3D chart shape components
│           └── utils.ts             # Tailwind merge utility
├── server/
│   └── index.ts                     # Express static file server (production)
├── shared/
│   └── const.ts                     # Shared constants placeholder
├── HANDOFF.md                       # Comprehensive project handoff document
├── ideas.md                         # Original design brainstorm
├── todo.md                          # Pending work items
├── package.json                     # Dependencies and scripts
├── vite.config.ts                   # Vite + Manus plugins configuration
├── tsconfig.json                    # TypeScript configuration
└── tsconfig.node.json               # Node TypeScript configuration
```

---

## 3. Self-Hosting Guide

### 3.1 Option A: Static Hosting (Recommended — Simplest)

Since the dashboard is a pure client-side React app with no backend, you can build it to static HTML/CSS/JS and host it anywhere that serves static files.

**Step 1: Clone and install**

```bash
git clone https://github.com/Ptander01/mls-dashboard.git
cd mls-dashboard
pnpm install
```

If you don't have `pnpm`, install it first: `npm install -g pnpm`

**Step 2: Clean up Manus-specific code (optional but recommended)**

Edit `vite.config.ts` and remove the Manus plugins:

```typescript
// REMOVE these from the plugins array:
// vitePluginManusRuntime()
// vitePluginManusDebugCollector()

// KEEP these:
const plugins = [react(), tailwindcss(), jsxLocPlugin()];
```

Remove the analytics script from `client/index.html`:

```html
<!-- DELETE this line: -->
<script defer src="%VITE_ANALYTICS_ENDPOINT%/umami" data-website-id="%VITE_ANALYTICS_WEBSITE_ID%"></script>
```

Delete the debug collector file:

```bash
rm -rf client/public/__manus__/
```

**Step 3: Build for production**

```bash
pnpm build
```

This outputs static files to `dist/public/`. The folder contains `index.html`, bundled JavaScript, and CSS — everything needed to run the dashboard.

**Step 4: Deploy the `dist/public/` folder**

You can deploy this folder to any static hosting provider:

| Provider | Command / Method |
|---|---|
| **Vercel** | `npx vercel --prod` (from project root) |
| **Netlify** | Drag `dist/public/` to Netlify Drop, or connect GitHub repo |
| **GitHub Pages** | Push `dist/public/` contents to a `gh-pages` branch |
| **AWS S3 + CloudFront** | `aws s3 sync dist/public/ s3://your-bucket/` |
| **Cloudflare Pages** | Connect GitHub repo, set build command to `pnpm build`, output dir to `dist/public` |
| **Any web server** | Copy `dist/public/` to your server's document root |

**Important for SPA routing**: Since the app uses client-side routing (Wouter), you need to configure your hosting to serve `index.html` for all routes. Most providers have a "single page app" or "rewrite all to index.html" option.

### 3.2 Option B: Node.js Server (If You Want a Server)

The project includes a minimal Express server in `server/index.ts` that serves the built static files and handles SPA routing.

```bash
# Build everything (client + server)
pnpm build

# Start the production server
pnpm start
```

This starts an Express server on port 3000 (or `$PORT` env var) that serves the static build and redirects all routes to `index.html`. This is useful if you're deploying to platforms that expect a Node.js process (Railway, Render, Fly.io, etc.).

### 3.3 Option C: Local Development

To run the dev server locally with hot reload:

```bash
git clone https://github.com/Ptander01/mls-dashboard.git
cd mls-dashboard
pnpm install
pnpm dev
```

Open `http://localhost:3000` in your browser. Vite's HMR will instantly reflect any code changes.

### 3.4 Downloading CDN Images for Full Independence

If you want to eliminate all external dependencies, download the two CDN-hosted images:

```bash
# Create a local images directory
mkdir -p client/public/images

# Download the hero stadium image
curl -o client/public/images/hero-stadium.webp \
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663348511113/fBEeqeVYwBHXg2g2gjhenP/hero-stadium-YUnnMoGMi6PoZPwoH5aXFc.webp"

# Download the pitch background
curl -o client/public/images/pitch-bg.webp \
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663348511113/fBEeqeVYwBHXg2g2gjhenP/pitch-bg-SCSoxY6mUL64vxkYMYHLEF.webp"
```

Then update the references in the source code:

In `client/src/pages/Home.tsx` line 12, change:
```typescript
const HERO_IMG = '/images/hero-stadium.webp';
```

In `client/src/components/tabs/PitchMatch.tsx` line 12, change:
```typescript
const PITCH_BG = '/images/pitch-bg.webp';
```

### 3.5 System Requirements

| Requirement | Minimum |
|---|---|
| **Node.js** | v18+ (v22 recommended) |
| **pnpm** | v10+ |
| **Browser** | Chrome 90+, Firefox 90+, Safari 15+, Edge 90+ |
| **RAM for build** | ~512MB |
| **Disk space** | ~200MB (including `node_modules`) |
| **Build output size** | ~2-3MB (gzipped) |

The dashboard is entirely client-side, so the hosting server has minimal requirements — it just needs to serve static files. Even a free-tier Netlify or Vercel account is more than sufficient.

---

## 4. What Would Break Outside Manus (and How to Fix It)

The good news is that **almost nothing breaks**. The dashboard was built as a static frontend with all data embedded. Here is a complete list of potential issues:

| Issue | Severity | Fix |
|---|---|---|
| `vite-plugin-manus-runtime` missing in production | None — only runs during dev | Remove from `vite.config.ts` plugins array |
| Analytics script fails (no Umami endpoint) | None — fails silently | Remove the `<script>` tag from `index.html` |
| CDN images become unavailable someday | Low — they work now | Download and self-host (see Section 3.4) |
| `allowedHosts` in Vite config blocks your domain | Low — only affects dev server | Add your domain or set `allowedHosts: true` |
| `class="dark"` hardcoded in `index.html` | Cosmetic — brief flash before React hydrates | Change to `class=""` since default theme is now light |

None of these are blocking issues. The dashboard will build and run correctly on any standard Node.js environment without any modifications.

---

## 5. Continuing Development in a New Manus Session

For future Manus sessions, use this prompt:

> "I have an existing Manus webdev project called `mls-dashboard` synced to GitHub at `https://github.com/Ptander01/mls-dashboard`. Please read `HANDOFF.md` in the project root for full context on the design system, custom 3D neumorphic components, known fixes, and my preferences. Then [your request]."

The new Manus agent will clone the repo, read the handoff document, and have full context to continue development.
