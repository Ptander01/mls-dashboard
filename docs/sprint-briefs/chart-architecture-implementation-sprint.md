# Sprint Prompt: Chart Header Architecture Implementation (Option D)

## Context
Clone the repo: `gh repo clone Ptander01/mls-dashboard`

This sprint implements the approved "Option D" Three-Zone chart header architecture across the entire dashboard. We are moving from ad-hoc `rightAction` control clusters to a standardized, icon-first, distributed layout system.

**Read these files before writing any code:**
1. `docs/design-system/chart-control-spec.md` — The original spec detailing the problem and the Three-Zone theory.
2. `/home/ubuntu/deliverables/wireframe-option-d-revised.html` (if available from previous session) — The interactive HTML prototype of the exact layout we are building.
3. `client/src/components/ui/ChartHeader.tsx` — The component we are refactoring.
4. `client/src/components/sandbox/ChartControlWireframe.tsx` (if it exists in the repo) — Contains the raw React code for the new primitive components (`IconAction`, `SegmentedControl`, `ToggleAction`).

## The Three-Zone Architecture

Every chart card must be restructured into three rows:
- **Row 1:** Title + Subtitle (Left) AND Zone 2/3 Actions (Top Right, pinned)
- **Row 2:** Description (Full width, below title)
- **Row 3:** Zone 1 Toolbar (Full width, below description, containing data controls)

### Iconography System (Strict Mapping)
All controls are now icon-first with hover tooltips (using Radix `Tooltip` via `client/src/components/ui/tooltip.tsx`).

**Zone 1 (Data Controls) — anchored in the Row 3 Toolbar:**
- `Filter` (lucide-react): Conference filter (All/East/West)
- `Palette`: Color symbology (H/A vs Team, Position vs Team)
- `Layers`: Data metric/perspective (PPG, Win%, GD, Index vs Components)
- `Eye`: View mode toggle (Index vs Components, Focused vs Full Scale)
- `Percent`: Fill Rate toggle (active state)
- `BarChart3`: Absolute values toggle (inactive state of Fill Rate)

**Zone 2 (Analysis) & Zone 3 (Utility) — pinned Top-Right in Row 1:**
- `TrendingUp` (Zone 2): Trendline / league average overlay
- `Lightbulb` (Zone 2): AI Insights toggle (active color: amber)
- `FlaskConical` (Zone 3): Methods & methodology panel
- `Maximize2` (Zone 3): Expand to full screen

---

## Step 1: Build the Shared Primitives

Create a new file: `client/src/components/ui/ChartControls.tsx`

This file must export three reusable primitive components that encapsulate the neumorphic styling and tooltip logic:

### 1. `IconAction` (for Zone 2/3 buttons)
```typescript
interface IconActionProps {
  icon: React.ReactNode;
  tooltip: string;
  isActive?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
  isDark: boolean;
  activeColor?: "cyan" | "amber" | "emerald"; // defaults to cyan
}
```
- Base style: 28x28px, rounded-lg, transparent background, muted-foreground icon.
- Active style: `.neu-pressed`, icon color matches `activeColor`, background `var(--neu-bg-pressed)`.
- Hover: Wraps the button in a `Tooltip` showing the `tooltip` string.

### 2. `SegmentedControl` (for Zone 1 toggle groups)
```typescript
interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (val: T) => void;
  isDark: boolean;
  groupIcon: React.ReactNode;
  groupTooltip: string;
}
```
- Renders a flex container.
- Left side: The `groupIcon` wrapped in a `Tooltip` showing `groupTooltip`.
- Right side: The actual toggle buttons in a `.neu-raised` (or flat) trough.
- Active segment: `.neu-pressed` with cyan text.

### 3. `ToggleAction` (for standalone Zone 1 toggles like Fill Rate)
```typescript
interface ToggleActionProps {
  icon: React.ReactNode;
  label: string;
  tooltip: string;
  isActive: boolean;
  onToggle: () => void;
  isDark: boolean;
}
```
- Renders an icon + text label button.
- Active style: `.neu-pressed` with cyan text.
- Wraps in a `Tooltip`.

---

## Step 2: Refactor `ChartHeader.tsx`

Modify `client/src/components/ui/ChartHeader.tsx` to support the new layout.

### Updated Props Interface
```typescript
export interface ChartHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  methods?: React.ReactNode;
  
  // NEW PROPS
  zone1Toolbar?: React.ReactNode; // The distributed flex row of data controls
  zone2Analysis?: React.ReactNode; // e.g., Trend toggle, Insights toggle
  zone3Utility?: React.ReactNode; // e.g., Maximize button
  
  // DEPRECATED (keep for backward compatibility during migration, but map it to zone1Toolbar or zone3Utility if provided)
  rightAction?: React.ReactNode; 
}
```

### Layout Structure inside `ChartHeader`
```tsx
<div className="mb-4">
  {/* Row 1: Title + Zone 2/3 */}
  <div className="flex items-start justify-between gap-4 mb-2">
    <div className="flex-1 min-w-0">
      <h3 className="text-sm font-semibold">{title}</h3>
      {subtitle && <p className="text-[10px] mt-0.5">{subtitle}</p>}
    </div>
    
    {/* Zone 2/3 Cluster */}
    <div className="flex items-center gap-0.5 flex-shrink-0">
      {zone2Analysis}
      
      {/* Separator if both zones exist */}
      {(zone2Analysis || methods) && (zone3Utility || methods) && (
        <div className="w-[1px] h-5 bg-border mx-1" />
      )}
      
      {/* Methods Button (migrated to use IconAction pattern) */}
      {methods && (
        <IconAction 
          icon={<FlaskConical size={13} />} 
          tooltip="Methods & Methodology" 
          isActive={methodsOpen} 
          onToggle={() => setMethodsOpen(!methodsOpen)} 
          isDark={isDark} 
          activeColor="emerald"
        />
      )}
      
      {zone3Utility}
      
      {/* Fallback for unmigrated charts */}
      {rightAction && !zone1Toolbar && !zone2Analysis && !zone3Utility && (
        <div className="ml-2">{rightAction}</div>
      )}
    </div>
  </div>

  {/* Row 2: Description */}
  {description && (
    <div className="text-[11px] text-muted-foreground leading-relaxed mb-3">
      {description}
    </div>
  )}

  {/* Row 3: Zone 1 Toolbar */}
  {zone1Toolbar && (
    <div 
      className="flex items-center justify-between gap-2 mb-4 py-2 px-3 rounded-lg flex-wrap"
      style={{
        background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)",
        borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`,
        borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`,
      }}
    >
      {zone1Toolbar}
    </div>
  )}

  {/* Methods Panel (Animated Inset - keep existing implementation) */}
  {methods && <MethodsPanel ... />}
</div>
```

---

## Step 3: Migrate Existing Components

You must update the following files to use the new `ChartHeader` API and the new primitives from `ChartControls.tsx`.

### 1. `client/src/components/CardInsight.tsx`
Refactor `CardInsightToggle` to use the new `IconAction` component under the hood, ensuring it renders as a `Lightbulb` icon with an amber active state.

### 2. `client/src/components/ChartModal.tsx`
Refactor `MaximizeButton` to use the new `IconAction` component, rendering as a `Maximize2` icon.

### 3. `client/src/components/charts/DumbbellChart.tsx`
- **Zone 1:** `SegmentedControl` for Symbology (`Palette` icon: H/A vs TEAM). `SegmentedControl` for Metric (`Layers` icon: PPG vs WIN% vs GD).
- **Zone 2:** `CardInsightToggle` (Lightbulb).
- **Zone 3:** `MaximizeButton`.

### 4. `client/src/components/charts/ResilienceIndexChart.tsx`
- **Zone 1:** `SegmentedControl` for ColorMode (`Palette` icon: SCORE vs TEAM). `SegmentedControl` for ViewMode (`Eye` icon: INDEX vs COMPONENTS).
- **Zone 2:** `CardInsightToggle`.
- **Zone 3:** `MaximizeButton`.

### 5. `client/src/components/charts/TravelScatterChart.tsx`
- **Zone 1:** `SegmentedControl` for Conference (`Filter` icon: ALL/EAST/WEST). `ToggleAction` for Color (`Palette` icon: COLOR).
- **Zone 2:** `CardInsightToggle`.
- **Zone 3:** `MaximizeButton`.

### 6. `client/src/components/tabs/Attendance.tsx`
Migrate all 5 charts in this file:
- **Home Attendance:** Zone 1 = `ToggleAction` for Fill Rate (`Percent`/`BarChart3` icon). Zone 2 = Insights. Zone 3 = Maximize.
- **Weekly Trend:** Zone 1 = Select dropdown (keep as is, but move to `zone1Toolbar`). Zone 2 = Insights. Zone 3 = Maximize.
- **Gravity Chart:** Zone 1 = `SegmentedControl` for Mode (`Eye` icon: FOCUSED vs FULL SCALE). Zone 2 = Insights. Zone 3 = Maximize.
- **Away Impact / Home Response:** Move Insights and Maximize to `zone2Analysis` and `zone3Utility`.

### 7. `client/src/components/tabs/SeasonPulse.tsx`
- Replace the inline `ToggleGroup` component with the new shared `SegmentedControl`.
- **Zone 1:** Conference (`Filter` icon) and Rank Mode (`Layers` icon: POWER vs POINTS).
- **Zone 2:** Insights.

### 8. `client/src/components/tabs/PlayerStats.tsx`
- **Scatter Chart:** Zone 1 = X/Y Dropdowns + Color Toggle + Trend Toggle. Zone 2 = Insights. Zone 3 = Maximize.
- **Radar Chart:** Zone 2 = Insights. Zone 3 = Maximize + Close button.

---

## Acceptance Criteria
1. All charts across the dashboard utilize the new Three-Zone layout (Row 1: Title + Z2/Z3, Row 2: Description, Row 3: Z1 Toolbar).
2. The `rightAction` prop is fully migrated to `zone1Toolbar`, `zone2Analysis`, and `zone3Utility`.
3. All controls use the standardized lucide-react icons defined in the spec.
4. Hovering over any icon button reveals a Radix Tooltip with the descriptive label.
5. Dark mode and light mode neumorphic stylings are preserved and applied correctly to the new primitive components.
6. The `ChartHeader` description text no longer competes for horizontal space with controls.

**To start the implementation:** Create `client/src/components/ui/ChartControls.tsx` first, then update `ChartHeader.tsx`, then migrate the charts one by one.
