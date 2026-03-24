# MLS Dashboard: Chart Control Design System Specification

**Author:** Manus AI
**Date:** March 23, 2026
**Project:** MLS Dashboard

## Executive Summary

The MLS Dashboard currently features a robust data visualization layer across its six tabs, utilizing a consistent neumorphic aesthetic. However, an audit of the `ChartHeader` component and its `rightAction` slot reveals significant fragmentation in how interactive controls (toggles, segmented buttons, insights, and maximization) are implemented. Currently, there are at least four different hand-rolled implementations of segmented controls, inconsistent ordering of action buttons, and missing standard affordances on several charts.

This specification establishes a standardized, predictable design system for chart controls, drawing on best practices from enterprise data visualization platforms including Microsoft Power BI, Apple Human Interface Guidelines (HIG), and the ESRI Calcite Design System. By enforcing strict spatial ordering, logical grouping, and unified component primitives, the dashboard will offer a more intuitive and professional user experience.

## Research Foundation & Industry Patterns

The proposed standardization is informed by established user experience patterns in enterprise data visualization. 

### Microsoft Power BI & Fluent UI
Microsoft's Power BI utilizes a consistent "Visual Header" that appears on hover for every chart [1]. This header enforces a strict left-to-right ordering: Informational/Warning icons first, followed by Drill controls, Focus Mode (maximize), Filter context, and finally a "More Options" overflow menu. The Fluent UI framework reinforces this by emphasizing logical groupings within toolbars, using dividers to separate distinct functional areas (e.g., formatting versus destructive actions), and prioritizing icons for compact display [2].

### Apple Human Interface Guidelines (HIG)
Apple's HIG for toolbars emphasizes logical grouping and predictable placement. Navigation and primary view toggles are typically positioned on the left, content-specific actions in the center, and utility actions on the right [3]. Apple specifically recommends using segmented controls for mutually exclusive view modes rather than disparate buttons, a pattern that aligns well with the dashboard's need to toggle between different metrics or symbologies.

### ESRI Calcite & IBM Carbon Design Systems
The ESRI Calcite design system employs an "Action Bar" pattern with clear visual separators between functional groups, relying heavily on an icon-plus-tooltip approach to maintain a compact footprint [4]. Similarly, the IBM Carbon Design System defines a strict chart anatomy where navigation tools and legends are predictably located, ensuring that users do not have to relearn the interface for each new visualization [5].

## Current State Audit Findings

An analysis of the existing `client/src/components/tabs/*.tsx` files revealed the following structural inconsistencies:

| Inconsistency | Description | Impact |
|---|---|---|
| **Fragmented Primitives** | There are four distinct implementations of segmented controls. `SeasonPulse.tsx` defines an inline `ToggleGroup`, while `Attendance.tsx`, `DumbbellChart.tsx`, and `ResilienceIndexChart.tsx` use hand-rolled arrays of buttons with varying border radius and neumorphic shadow logic. | Increases technical debt and results in slight visual discrepancies across tabs. |
| **Variable Ordering** | The `rightAction` slot in `ChartHeader` lacks a defined sequence. Some charts place the `CardInsightToggle` before the `MaximizeButton`, while others reverse this. Filters and view modes are placed haphazardly. | Disrupts user muscle memory; users must scan the header to locate the desired action. |
| **Missing Affordances** | Several complex charts, such as the `DumbbellChart` and `TravelScatterChart`, lack the `MaximizeButton`, despite benefiting from a full-screen view. | Limits accessibility and detailed analysis for specific visualizations. |
| **Control Delegation** | Some self-contained charts (e.g., `ResilienceIndexChart`) embed their own `ChartHeader` with internal controls, while the parent tab attempts to inject the `CardInsightToggle` externally, leading to nested or split control zones. | Complicates component architecture and makes state management difficult. |

## Proposed Design System Standardization

To resolve these issues, the dashboard will adopt a strict three-zone control architecture within the `ChartHeader` component, supported by unified React primitives.

### 1. The Three-Zone Architecture

The `rightAction` slot of the `ChartHeader` will be standardized into three distinct, visually separated zones, always ordered from left to right:

**Zone 1: Data & View Controls (Left)**
This zone contains controls that alter what data is shown or how it is symbolized. It utilizes the new standardized segmented controls.
*   **Filters:** Dropdowns or toggles that restrict the dataset (e.g., Conference: All/East/West).
*   **Metrics:** Toggles that change the underlying value being plotted (e.g., PPG vs. GD).
*   **Symbology/Color:** Toggles that change the visual encoding (e.g., Color by Team vs. Color by Position).
*   **Perspective:** Toggles that change the chart type or view mode (e.g., Index vs. Components).

**Zone 2: Analytical Actions (Center)**
This zone contains tools that layer additional context or analysis over the existing view.
*   **Trendlines/Averages:** Toggles to show/hide statistical overlays.
*   **Card Insights (`CardInsightToggle`):** The standard lightbulb button that reveals AI-generated insights inline.

**Zone 3: Utility Actions (Right)**
This zone contains universal actions related to the chart container itself.
*   **Methods Toggle:** The existing `FlaskConical` button that expands the academic methodology panel. (Note: Currently this sits to the left of `rightAction`; it should be integrated as the first item in Zone 3).
*   **Maximize (`MaximizeButton`):** The standard expand button to open the chart in a `ChartModal`.

*Visual separators (subtle vertical lines with low opacity) must be placed between these zones to clarify the grouping.*

### 2. Standardized UI Primitives

All bespoke control implementations must be replaced with a single set of reusable primitives housed in `client/src/components/ui/`.

**A. `SegmentedControl` Component**
A unified component to replace the inline `ToggleGroup` and hand-rolled button arrays.
*   **Props:** `options` (array of value/label/icon objects), `value` (current state), `onChange` (callback), `size` (compact/default).
*   **Styling:** Must use the established neumorphic language. The container should have an inset shadow (`neu-pressed` style), while the active item has an elevated shadow (`neu-raised`) with the active cyan text color.
*   **Behavior:** Supports text labels, icon-only (with tooltips), or icon+text configurations.

**B. `ToggleAction` Component**
A unified component for standalone on/off states (e.g., showing a trendline).
*   **Styling:** Follows the same neumorphic pressed/raised logic as the segmented control, but for a single button.

### 3. Implementation Guidelines

1.  **Extract and Unify:** Move the `ToggleGroup` from `SeasonPulse.tsx` into `client/src/components/ui/SegmentedControl.tsx` and upgrade it to handle the styling requirements of all current bespoke implementations.
2.  **Audit and Replace:** Systematically replace the custom controls in `Attendance.tsx`, `DumbbellChart.tsx`, `ResilienceIndexChart.tsx`, and `TravelScatterChart.tsx` with the new `SegmentedControl`.
3.  **Enforce Ordering:** Update every instance of `ChartHeader` across all six tabs to ensure the `rightAction` children follow the Data -> Analysis -> Utility zone ordering.
4.  **Add Missing Controls:** Ensure every chart that visualizes dense data includes the `MaximizeButton` by default.

## Conclusion

By adopting this standardized chart control specification, the MLS Dashboard will align with industry-leading data visualization platforms. The predictable placement of controls and the use of unified neumorphic primitives will significantly reduce cognitive load for the user, resulting in a cleaner, more professional interface that is easier to maintain and extend.

---
## References
[1] WiseBI. "A Guide to Visual Header Icons in Power BI." https://wisebi.com/blogs/a-guide-to-visual-header-icons-in-power-bi/
[2] Microsoft. "React Toolbar - Fluent 2 Design System." https://fluent2.microsoft.design/components/web/react/core/toolbar/usage
[3] Apple. "Toolbars - Human Interface Guidelines." https://developer.apple.com/design/human-interface-guidelines/toolbars
[4] ESRI. "Segmented Control | Calcite Design System." https://developers.arcgis.com/calcite-design-system/components/segmented-control/
[5] IBM. "Chart anatomy - Carbon Design System." https://carbondesignsystem.com/data-visualization/chart-anatomy/
