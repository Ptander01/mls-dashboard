# Sprint Brief: Data Payload Decoupling & Table Virtualization (Epic 19)

## 1. Context & Goal
The dashboard's JavaScript bundle is currently inflated by `client/src/lib/mlsData.ts`, which contains over 28,000 lines of inline JSON data (primarily the 2025 player and match data). This severely impacts initial load times, particularly for the 53% of users on mobile devices. 

Simultaneously, the `PlayerStats` tab renders large data tables. While the main view slices to 100 rows, the Maximized (modal) view attempts to render all 600+ rows into the DOM at once, causing scroll jank.

**Goal:** Extract the 2025 static data into an asynchronous JSON payload to slash bundle size, and implement DOM virtualization for the Player Stats table to guarantee 60fps scrolling.

## 2. Track A: Data Payload Decoupling

### Current State
- `mlsData.ts` exports TypeScript interfaces (`Team`, `Player`, `Match`), helper functions, and massive constant arrays (`TEAMS`, `PLAYERS`, `MATCHES`, `TEAM_BUDGETS`).
- `seasonDataLoader.ts` currently treats 2025 as synchronous (returning `SEASON_2025` immediately) and 2026 as asynchronous (fetching `/data/mls2026.json`).

### Implementation Steps
1. **Create the JSON Payload:**
   - Extract the `PLAYERS`, `MATCHES`, and `TEAM_BUDGETS` arrays from `mlsData.ts`.
   - Save them as a valid JSON file at `client/public/data/mls2025.json`.
   - **Crucial:** Keep the `TEAMS` array in `mlsData.ts` (it's small and needed globally for immediate UI rendering).

2. **Refactor `seasonDataLoader.ts`:**
   - Update `load2025Data()` to `fetch("/data/mls2025.json")` following the exact same pattern currently used for `load2026Data()`.
   - Both seasons should now be loaded asynchronously on demand (or preloaded in `FilterContext`).

3. **Update `FilterContext.tsx`:**
   - Modify the initialization logic to await the 2025 data fetch if the user defaults to the 2025 season.
   - Ensure the global `seasonLoading` state correctly reflects the fetch status of whichever season is currently selected.

4. **Clean up `mlsData.ts`:**
   - Remove the massive data arrays.
   - The file should now only contain TypeScript interfaces, the `TEAMS` array, and helper functions (e.g., `getTeam`).
   - *Expected result: `mlsData.ts` shrinks from 28,400+ lines to ~400 lines.*

## 3. Track B: Table Virtualization & Search

### Current State
- `PlayerStats.tsx` renders a standard HTML `<table>`. 
- In the default view, it slices the data: `sorted.slice(0, 100).map(...)`.
- In the Maximized view (inside `ChartModal`), it renders everything: `sorted.map(...)`.

### Implementation Steps
1. **Install Dependency:**
   - Run `npm install @tanstack/react-virtual` in the `client` directory.

2. **Implement Virtualizer:**
   - In `PlayerStats.tsx`, replace the standard `<tbody>` mapping with a `useVirtualizer` implementation.
   - The scroll container (the `div` with `overflow-y-auto`) needs a `ref` passed to the virtualizer.
   - Set a fixed estimate size for rows (e.g., `estimateSize: () => 48`).
   - Map over `virtualizer.getVirtualItems()` instead of the raw `sorted` array.
   - Apply absolute positioning to the `<tr>` elements based on the virtual item's `start` offset.
   - **Apply this to both the main card table and the Maximized modal table.**

3. **Add Text Search:**
   - Add a sleek, neumorphic text input above the table: `<input type="text" placeholder="Search players..." />`.
   - Filter the `sorted` array by this search string (matching `p.name` or `getTeam(p.team)?.short`, case-insensitive) *before* passing it to the virtualizer.

## 4. Acceptance Criteria
- [ ] `client/src/lib/mlsData.ts` is under 500 lines.
- [ ] `client/public/data/mls2025.json` exists and contains the historical data.
- [ ] Switching between 2025 and 2026 seasons in the dashboard works seamlessly.
- [ ] The Player Stats table renders using `@tanstack/react-virtual` (inspecting the DOM should show only ~15-20 `<tr>` elements at a time, even when scrolling).
- [ ] The new search bar instantly filters the table rows.
- [ ] No TypeScript errors or broken imports across the codebase.

## 5. AI Developer Guidelines
- **Zero Regression:** Do not alter the visual styling of the table. The virtualized table must look identical to the current table (same fonts, padding, borders, sticky headers).
- **Sticky Headers:** When virtualizing standard HTML tables, `<thead>` elements can sometimes lose their sticky behavior. Ensure `th { position: sticky; top: 0; }` is maintained.
- **Async Safety:** Ensure `FilterContext` doesn't crash if `activeSeasonData` is null during the initial fetch. Show the `SplashIntro` or a loading skeleton until the promise resolves.
