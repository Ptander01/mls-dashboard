# Sprint Brief: Chart Control Design System Standardization

**Epic:** 13
**Goal:** Unify chart header controls across all 6 tabs using a predictable three-zone architecture and shared React primitives.

## 1. Context & Motivation

The MLS Dashboard currently has 4+ bespoke implementations of segmented controls and highly inconsistent ordering of action buttons within the `ChartHeader` component's `rightAction` slot. This sprint will standardize the interface, drawing on patterns from Microsoft Power BI, Apple HIG, and ESRI Calcite.

The core concept is the **Three-Zone Architecture** for the `rightAction` slot:
1. **Data & View (Left):** Filters, Metrics, Symbology, Perspective toggles.
2. **Analysis (Center):** Trendlines, CardInsightToggle.
3. **Utility (Right):** Methods toggle, MaximizeButton.

## 2. Technical Implementation Plan

### Step 0: Wireframe Exploration (CRITICAL)
Before modifying the codebase across all 6 tabs, the developer **must** build a standalone wireframe or prototype of the new `ChartHeader` and `SegmentedControl` components. 
- Create a temporary route or sandbox component (e.g., `client/src/components/sandbox/ChartControlWireframe.tsx`).
- Mock up 2-3 different layout options for the Three-Zone Architecture.
- Present these wireframes to the user (via screenshots or a live dev server link) to get explicit approval on the layout, spacing, and neumorphic styling.
- **Do not proceed to Step 1 until the user has approved a specific wireframe.**

### Step 1: Create Shared Primitives
Create `client/src/components/ui/SegmentedControl.tsx`. You can start by extracting the `ToggleGroup` from `client/src/components/tabs/SeasonPulse.tsx` (lines 188-240) and generalizing it.

**Requirements for `SegmentedControl`:**
- Props: `options: { value: T, label?: string, icon?: ReactNode }[]`, `value: T`, `onChange: (v: T) => void`, `isDark: boolean`, `size?: "compact" | "default"`
- Neumorphic styling: container should have an inset shadow (`neu-pressed`), active item has elevated shadow (`neu-raised`) with cyan text.
- Must support icon-only, text-only, or icon+text.

Create `client/src/components/ui/ToggleAction.tsx` for standalone on/off states (like the Absolute/Fill Rate toggle in Attendance).

### Step 2: Refactor `ChartHeader.tsx`
Currently, `ChartHeader` accepts a freeform `rightAction: ReactNode`. We need to enforce the three zones.

*   Move the existing Methods button (the `FlaskConical` toggle) *inside* the right action flex container, positioning it immediately before the `MaximizeButton` (if present) in the Utility zone.
*   Ensure there is a subtle vertical separator (e.g., `border-l border-white/10`) between the three conceptual zones if they contain elements.

### Step 3: Replace Bespoke Controls Across Tabs
Systematically replace the hand-rolled controls in the following files:

1.  **`SeasonPulse.tsx`**: Replace the inline `ToggleGroup` with the new shared `SegmentedControl`.
2.  **`Attendance.tsx`**:
    *   Replace the custom `Absolute/Fill Rate` button with `ToggleAction`.
    *   Replace the `FOCUSED/FULL SCALE` gravMode buttons with `SegmentedControl`.
3.  **`DumbbellChart.tsx`**: Replace the hand-rolled `symbology` and `mode` buttons with `SegmentedControl`.
4.  **`ResilienceIndexChart.tsx`**: Replace the `viewMode` and `colorMode` buttons with `SegmentedControl`.
5.  **`TravelScatterChart.tsx`**: Replace the `conference` and `color` toggles with `SegmentedControl`.
6.  **`BumpChart.tsx`**: Replace the 3-state `viewMode` cycle button with `SegmentedControl`.

### Step 4: Add Missing Affordances & Enforce Ordering
Audit every chart to ensure the `rightAction` contents follow the Data → Analysis → Utility order.

*   **Add `MaximizeButton`** to `DumbbellChart`, `TravelScatterChart`, `ResilienceIndexChart`, and the Narrative Timeline (if applicable).
*   **Fix Control Delegation:** Ensure charts that embed their own `ChartHeader` (like `DumbbellChart`) don't have a parent tab injecting controls outside the header. All controls for a chart should live in its single `ChartHeader`.

## 3. Verification & Acceptance

- [ ] Check all 6 tabs in both Light and Dark mode.
- [ ] Verify the `SegmentedControl` looks consistent everywhere (same height, padding, shadow depth).
- [ ] Verify the ordering is strictly Data/View (left) → Analysis (center) → Utility (right).
- [ ] Verify clicking the Maximize button on the newly added charts works correctly.

## 4. AI Developer Instructions

*   **WIRE-FRAME FIRST:** The user explicitly requested to see layout examples before pulling the trigger on updating the whole dashboard. Your very first action should be creating a static mockup of the new header to show the user.
*   **Do not modify the data pipeline or underlying D3/Three.js rendering logic.** This sprint is strictly about the UI control layer surrounding the charts.
*   Start by building the `SegmentedControl` and verifying it looks correct in the wireframe sandbox before rolling it out to the complex SVG charts.
*   When refactoring `DumbbellChart` and `ResilienceIndexChart`, pay careful attention to how state is passed up or managed internally.
