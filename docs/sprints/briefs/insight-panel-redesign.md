# Sprint Handoff: InsightPanel UI Redesign (Mechanical Door Animation)

## 1. Context & Objective
Currently, the `InsightPanel` component (used across Player Stats, Attendance, Team Budget, and Season Pulse tabs) renders a thin, depressed groove/trough when the insights are collapsed. This persistent artifact looks unfinished and breaks the clean aesthetic of the dashboard when at rest.

The objective of this sprint is to completely remove the static depression artifact and replace the opening sequence with a high-tech, cinematic "mechanical door" animation—reminiscent of an Iron Man suit sequence. When the user clicks the "ANALYZE" button, a recessed cavity should part open, and the elevated insight cards should rise out of it.

## 2. Current Implementation Details
*   **Component:** `client/src/components/NeuInsightContainer.tsx`
*   **Trigger:** The `showDepression` prop is currently hardcoded to `true` in `InsightPanel.tsx` (line 126).
*   **Current State:** When collapsed, it renders a 14px high `div` with heavy inset shadows (`depressionShadow`) and a dark background (`depressionBg`), sitting statically below the header.
*   **Current Animation:** On click, the height expands, shadows swap from inset to drop shadow, and the container translates upward (`y: -6`).

## 3. Design Specification: The "Mechanical Door" Sequence

The new animation should be a multi-stage, staggered sequence powered by Framer Motion. The container should be completely invisible (height: 0, opacity: 0) when collapsed.

### Stage 1: The Parting Doors (0ms - 300ms)
When "ANALYZE" is clicked, a sleek, dark recessed cavity appears. Instead of just fading in, simulate mechanical doors sliding apart horizontally.
*   **Visuals:** A dark container (`#141422` in dark mode) with sharp inner shadows to look like a deep mechanical bay.
*   **Animation:** Use a pseudo-element or inner div acting as the "doors" that scale on the X-axis from 1 to 0 (origin: center), revealing the dark cavity underneath.
*   **Easing:** Use a mechanical, slightly springy easing curve (e.g., `type: "spring", stiffness: 300, damping: 30`).

### Stage 2: The Ascent (300ms - 600ms)
Once the doors are fully parted, the actual `NeuInsightContainer` (with the content) rises out of the cavity.
*   **Visuals:** The elevated container with the heavy drop shadows and cyan/amber glows.
*   **Animation:** Translate Y from `+40px` (hidden inside the cavity) up to `-6px` (floating above the surface).
*   **Masking:** The rising container must be masked by the cavity boundaries (`overflow: hidden` on the parent wrapper) so it truly looks like it's emerging from below the surface, not just sliding up the screen.

### Stage 3: The Content Bloom (500ms - 800ms)
As the container reaches its apex, the internal insight cards and header text fade in and scale up slightly.
*   **Animation:** Opacity 0 → 1, Scale 0.95 → 1.
*   **Stagger:** The header appears first, followed by the insight cards in a rapid stagger sequence (`delay: i * 0.08`).

## 4. Implementation Strategy

### A. Refactor `NeuInsightContainer.tsx`
1.  Remove the `showDepression` logic entirely. The component should render nothing when `isOpen` is false.
2.  Wrap the elevated container in a new "Bay Wrapper" `div`.
3.  The Bay Wrapper should handle the Stage 1 (door parting) animation and act as the `overflow-hidden` mask for Stage 2.
4.  The inner container handles the Stage 2 (rising) animation.

### B. Update `InsightPanel.tsx`
1.  Remove the `showDepression={true}` prop.
2.  Ensure the "ANALYZE" button triggers the new multi-stage sequence smoothly.

### C. Update `CardInsight.tsx`
1.  Ensure the inline card insights (which also use `NeuInsightContainer`) inherit the new animation cleanly, scaled down appropriately for the `compact` variant.

## 5. Success Criteria
*   [ ] The persistent dark depression line is completely gone when the Insight Panel is closed.
*   [ ] Clicking "ANALYZE" triggers a horizontal "door opening" effect revealing a dark cavity.
*   [ ] The elevated insight container visibly rises *out* of the cavity (masked by its borders).
*   [ ] The animation is smooth, hardware-accelerated (using `transform` and `opacity`), and does not cause layout thrashing or lag.
*   [ ] Closing the panel reverses the sequence (container sinks, doors slide shut).
