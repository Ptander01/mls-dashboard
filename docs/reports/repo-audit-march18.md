# MLS Analytics Dashboard: Repository Audit & Reorganization Plan

This document outlines the findings of a comprehensive repository audit conducted on March 18, analyzing file structure, bundle size, dead code, and overall project health.

## 1. The Verdict: Do You Need to Split the Project?

**No, you do not need to break this up into smaller websites.** 

The dashboard is large, but it is conceptually cohesive. Breaking it into multiple repos would create a nightmare of shared dependencies, duplicated data, and broken context. However, the current repository is suffering from **"prototype bloat"** — a common symptom of rapid iteration. You have large files, unused dependencies, and structural clutter that are pushing the limits of your build tools.

The solution is not to split the app, but to **clean, organize, and code-split** the existing architecture.

## 2. Critical Issues Identified

### A. The 92MB Data Problem
Your `client/public/data/statsbomb/` directory contains 96 MB of JSON files. The Inter Miami data (4 MB) is actively used. The Messi Career (45 MB) and World Cup (47 MB) datasets are currently sitting unused (reserved for side projects). While they don't bloat the JavaScript bundle, they make cloning the repo slow and inflate your Git history.
**Recommendation:** Move the Messi and World Cup datasets out of the main repository, or at least out of the active `public/` directory until they are needed.

### B. The Monolithic JavaScript Bundle
Your production build outputs a single JavaScript chunk of **2.68 MB** (707 KB gzipped). This triggers Vite's `> 500 KB` warning. Every user downloads the entire application (including Three.js, Recharts, and all tabs) just to view the Home page.
**Recommendation:** Implement route-level code splitting using React's `lazy()` and `<Suspense>`. The `TravelMap` and `PitchMatch` tabs (which use heavy 3D libraries) should only load when the user clicks those tabs.

### C. Component Megaliths
Several files have grown too large to maintain comfortably:
- `mlsData.ts` (1,559 lines / 377 KB): Massive inline data object.
- `Attendance.tsx` (1,396 lines): Contains multiple complex sub-charts.
- `chartUtils.tsx` (1,373 lines): A utility grab-bag.
- `TravelMap.tsx` (1,272 lines): Contains both layout and heavy visualization logic.
- `insightEngine.ts` (1,282 lines): Handles insights for every tab in one file.

### D. Root-Level Clutter & Dead Code
The root directory contains 16 scratch files (`proto_*.png`, `ideas.md`, `visual_check_*.md`) and 5 old `SPRINT_HANDOFF.md` files. 
Inside `client/src/components/charts/`, there are dead backup files (`TravelScatterChart.backup.tsx`, `TravelScatterChart.threejs-v6.tsx`) that should rely on Git history rather than existing as physical files.
Additionally, both `pnpm-lock.yaml` and `package-lock.json` exist, which can cause dependency resolution conflicts.

### E. Unused UI Components
You have 24 unused components in `client/src/components/ui/` (e.g., `accordion`, `carousel`, `menubar`, `sidebar`). These are standard shadcn/ui components that were likely installed during initial setup but never used.

## 3. The Reorganization Plan

We will execute this cleanup in a dedicated "Technical Debt Sprint" with the following phases:

### Phase 1: The Purge (Immediate Wins)
1. Delete `package-lock.json` (standardize on `pnpm`).
2. Move all `proto_*`, `visual_check_*`, and `SPRINT_HANDOFF.md` files into an `archive/` folder or delete them.
3. Delete dead code files (`*.backup.tsx`).
4. Delete the 24 unused UI components to clean up the `components/ui/` directory.
5. Update `.gitignore` to properly ignore the `skills/` directory and `*.backup.tsx` files.

### Phase 2: Structural Realignment
1. Move loose components (`CorrelationMatrix3D.tsx`, `StatsPlayground.tsx`, `Map.tsx`) into their appropriate subdirectories (e.g., `components/charts/` or `components/features/`).
2. Extract the massive inline data from `mlsData.ts` into static JSON files in `public/data/` and fetch them asynchronously.

### Phase 3: Performance & Code Splitting
1. Implement `React.lazy()` in `App.tsx` for all main tab components (`Attendance`, `TravelMap`, `PlayerStats`, `TeamBudget`, `PitchMatch`).
2. Update `vite.config.ts` with `manualChunks` to isolate heavy dependencies (`three`, `@react-three/fiber`, `recharts`) into their own vendor bundles.

### Phase 4: Component Refactoring (Long Term)
1. Break `Attendance.tsx` into smaller sub-components (`GravitationalPull.tsx`, `AttendanceTrend.tsx`).
2. Split `insightEngine.ts` into domain-specific engines (`attendanceInsights.ts`, `travelInsights.ts`).

## 4. Next Steps

I have generated an architecture diagram showing the current state of the repository, highlighting the problem areas. I will now create GitHub Issues for Phase 1 and Phase 2 of the reorganization plan so we can tackle them methodically.
