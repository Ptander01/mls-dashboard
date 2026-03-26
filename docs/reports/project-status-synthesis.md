# MLS Analytics Dashboard: Project Status Synthesis
*Generated: March 25, 2026*

This document provides a synthesized overview of the project's current state, cross-referencing `BACKLOG.md`, open GitHub issues, and the actual codebase to ensure alignment and identify any discrepancies.

## 1. High-Level Metrics

- **Total TypeScript/TSX Files:** 84
- **Total Lines of Code:** 64,281
- **GitHub Issues:** 74 total (18 Open, 56 Closed)
- **Data Footprint:** 
  - `mls2026.json` (326KB) - Live ASA data + Fox Sports scraper merge
  - `miami_network.json` (15KB) - StatsBomb parsed output
  - `statsbomb/` (5.7MB) - Raw event JSONs

## 2. Completed Epics (Fully Implemented & Closed)

The following epics are fully built, merged to `main`, and properly marked as closed in both the BACKLOG and GitHub issues:

- **Epic 1:** High-Priority Bug Fixes
- **Epic 2:** Gravitational Pull Chart Overhaul
- **Epic 3:** Attendance Tab Insight Completion
- **Epic 4:** Insight Engine Depth
- **Epic 5:** Travel Map Performance Section
- **Epic 6:** Polish & Feedback
- **Epic 6.5:** Uniform Chart Container Template
- **Epic 6.6:** Dumbbell Chart Polish
- **Epic 11:** Season Pulse Tab (Power Rankings + Bump Chart + Narrative Timeline)
- **Epic 12:** 2026 Season Data Integration
- **Epic 13:** Chart Control Design System Standardization
- **Epic 14:** 2026 Data Pipeline Polish (Fox Sports Scraper)

## 3. Discrepancy Audit: Epic 7 (The Relief Scatter)

There was a discrepancy regarding **Epic 7: The Relief Scatter**.
- **BACKLOG.md Status:** Listed as Open (no checkboxes).
- **GitHub Issues Status:** Issues #36, #37, #38, #61, #62, #63 are **CLOSED**.
- **Codebase Reality:** The codebase **DOES** contain the full 3D relief scatter implementation. `TravelScatterChart.tsx` is a 1,900+ line file using `@react-three/fiber` to render 3D concentric rings (`Ring` component using `THREE.ShapeGeometry` and `THREE.CircleGeometry`), shadow casting, and topographical relief (`feTurbulence` in `index.css`).

**Conclusion:** Epic 7 is actually **COMPLETE**. The BACKLOG simply wasn't updated with checkboxes when the developer session finished the work.

## 4. Open Work Streams (The True Backlog)

Cross-referencing the remaining open issues with the codebase reveals the true active backlog.

### A. The "Big Visuals" (Next Major Sprints)
These are the remaining unbuilt features that will require dedicated, multi-session sprints:
1. **Epic 8: Pitch Match Real Data Integration (Issue #40)**
   - *Status:* Partially complete. The 3D Passing Network is built, but the **3D Shot Map** is still pending.
2. **Epic 9: Travel Map deck.gl Spike (Issues #42, #43)**
   - *Status:* Unstarted. Upgrading the 2D map to a cinematic 3D deck.gl implementation.
3. **Epic 10: Race Chart Tab (Issue #20)**
   - *Status:* Unstarted. Animated horizontal bar chart race synchronized to a matchweek timeline scrubber.
4. **Epic 15: AI-Powered Holistic Team Commentary (Issue #82)**
   - *Status:* Ready for handoff.

### B. Polish & Enhancements (Smaller Sprints)
1. **Player Stats Radar Percentile Context (Issue #11)**
   - *Status:* Partially addressed in UI text, but the actual data normalization logic needs refinement.
2. **Attendance Trend Three View Modes (Issue #8)**
   - *Status:* Unstarted. Adding ALL TEAMS / LEAGUE AVG / LEAGUE TOTAL toggles.
3. **Pitch Match Insight Layer (Issue #12)**
   - *Status:* Unstarted. Adding the 4-card insight layer above the 3D canvas.
4. **Shape Morphing Transition (Issue #58)**
   - *Status:* Unstarted. Animation polish for Donut to Stacked Bar.

### C. Deferred / Future Ideas
These are tracked but not prioritized for immediate action:
- **Issue #19:** Deck.gl 3D Correlation Matrix
- **Issue #21:** Cross-Chart Pottery Linking
- **Issue #22:** Ultrawide Layout Optimization
- **Issue #23:** 3D Radar Chart (Three.js)
- **Issue #24:** Statistical Hypothesis Tests UI
- **Issue #25:** Mobile Tab Label Truncation Fix
- **Issues #51, #52:** Messi Career Mode & World Cup 2022 Match Explorer (Side projects)

## 5. Recommended Next Steps

1. **Clean up BACKLOG.md:** Mark Epic 7 as complete.
2. **Immediate Next Sprint:** Hand off **Epic 15 (AI-Powered Holistic Team Commentary)** to complete the Season Pulse tab.
3. **Next Major Build:** Decide between the **deck.gl Travel Map** (Epic 9) or the **3D Shot Map** (Epic 8).
