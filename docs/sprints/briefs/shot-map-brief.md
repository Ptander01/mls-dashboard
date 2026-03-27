# Sprint Brief: Cinematic 3D Shot Map & xG Analysis

**Target Tab:** PitchMatch
**Epic:** 8 (Pitch Match Real Data) — Task 8.2
**Status:** Ready for Implementation

## Objective
Replace the procedurally generated 2D SVG shot map on the PitchMatch tab with a stunning, data-driven 3D visualization using real StatsBomb event data. The visualization must perfectly match the "neon and glass" aesthetic established by the 3D Passing Network, leveraging React Three Fiber (`@react-three/fiber`), Bloom post-processing, and the dashboard's signature neumorphic UI container system.

The goal is to create a zero-iteration, production-ready implementation that requires no supervision.

---

## 1. Design & Aesthetic Targets

The visualization lives inside the existing `NeuCard` container on the PitchMatch tab. The Three.js canvas presents a dark, futuristic pitch, consistent with the `PassingNetwork3D` component.

**The "Glass & Neon" Shot Aesthetic:**
- **Shot Origin Nodes:** Rendered as 3D glass spheres (reusing or adapting the `GlassNode` material: `MeshPhysicalMaterial` with high transmission, low roughness, and an Index of Refraction ~1.5).
- **Node Sizing:** The radius of the glass node MUST scale linearly with the **xG (Expected Goals)** value of the shot. A 0.80 xG tap-in should be massive; a 0.02 xG speculative strike should be tiny.
- **Shot Trajectories (Edges):** Rendered as glowing neon arcs connecting the shot origin (`location`) to the goal mouth (`shotEndLocation`). Re-use or adapt the `NeonTube` component. The arcs should have a slight vertical curve (quadratic Bézier) to simulate ball flight, with the apex height scaling by distance.
- **Bloom Post-Processing:** Use `@react-three/postprocessing` (EffectComposer + Bloom) to make the trajectory arcs and node cores genuinely glow.
- **Outcome Color Coding:**
  - **Goal:** Neon Emerald (`var(--emerald)` / `#00c897`)
  - **Saved:** Neon Amber (`var(--amber)` / `#ffb347`)
  - **Off Target / Post:** Neon Coral (`var(--coral)` / `#ff6b6b`)
  - **Blocked:** Muted Gray (`#666666` or `rgba(255,255,255,0.3)`)

---

## 2. Data Engineering (StatsBomb Integration)

We are using the **Inter Miami 4-0 Toronto FC (Sept 21, 2023)** match as our hero dataset. StatsBomb Match ID: `3877115`.

**Step 1: Data Extraction**
Create a Python script `scripts/fetch_miami_shots.py` (or append to the existing network script) to extract shot events from `client/public/data/statsbomb/events-3877115.json`.
- Filter for `type.name == 'Shot'`.
- Extract fields: `id`, `minute`, `second`, `team.name`, `player.name`, `location` [x,y], `shot.end_location` [x,y,z], `shot.outcome.name`, `shot.statsbomb_xg`, `shot.body_part.name`.
- Export a lightweight `miami_shots_3877115.json` to `client/public/data/`.

**Step 2: Coordinate Transformation**
StatsBomb pitch coordinates are 120 (length) x 80 (width). Origin (0,0) is bottom-left.
Our Three.js pitch uses a centered coordinate system:
- X-axis (length): -60 to 60
- Z-axis (width): -40 to 40
- **Mapping:** `ThreeX = StatsBombX - 60`, `ThreeZ = StatsBombY - 40`.

---

## 3. UI Integration & Interaction Architecture

The container MUST use the standardized `ChartHeader` component (Three-Zone architecture) defined in `ChartControls.tsx`.

**Zone 1: Data Controls (Toolbar)**
- Implement a `SegmentedControl` to filter by team (e.g., "Inter Miami", "Toronto FC", "Both").
- Implement `ToggleAction` buttons to filter by outcome: "Goals", "Saved", "Off Target", "Blocked".

**Zone 2: Analysis**
- Include an `IconAction` (e.g., Sparkles icon) that toggles an AI-generated insight about the shot map (e.g., "Miami generated 2.4 xG from the left half-space...").

**Zone 3: Utility**
- **Methods Panel (`methods` prop):** Explain the xG model, the StatsBomb data source (Match 3877115), and the mapping of xG to sphere volume.
- **Maximize Button:** Use `MaximizeButton` to open the 3D scene in a full-screen `ChartModal`.

**The 3D Canvas Interaction (Deemphasis):**
- **Hover:** When hovering over a shot node, maintain full opacity for that node and its trajectory tube. Fade all other nodes and tubes to 15% opacity.
- **Tooltip:** Display an HTML overlay (using `@react-three/drei`'s `Html` component) showing: Player Name, Minute, xG value, Outcome, and Body Part. Use the dashboard's `neu-raised` glassmorphism styling for the tooltip.

---

## 4. Technical Implementation Steps

**Phase 1: Data Pipeline**
1. Write `scripts/fetch_miami_shots.py` to parse the raw StatsBomb JSON and output `client/public/data/miami_shots.json`.
2. Ensure the JSON structure is strictly typed in the frontend.

**Phase 2: Three.js Components**
1. Create `client/src/components/charts/ShotMap3D.tsx`.
2. Set up the `Canvas`, `OrbitControls` (restricted pan/zoom), and `EffectComposer` with `Bloom`.
3. Render the pitch boundary lines (white/gray lines on the dark floor).
4. Map the JSON data to render `GlassNode` components at the transformed `location` coordinates. Scale `radius` by `xG * baseScale`.
5. Map the JSON data to render `NeonTube` components from `location` to `shotEndLocation`.

**Phase 3: Dashboard Integration**
1. Update `client/src/components/tabs/PitchMatch.tsx`.
2. Add "3D Shot Map" to the main view selector alongside "Player Heatmap" and "Passing Network".
3. Wrap `ShotMap3D` in a `NeuCard` with the fully populated `ChartHeader`.
4. Ensure the `ChartModal` integration works for maximized viewing.

---

## 5. File Architecture

- `scripts/fetch_miami_shots.py` (New)
- `client/public/data/miami_shots.json` (New, generated)
- `client/src/components/tabs/PitchMatch.tsx` (Update to integrate new view)
- `client/src/components/charts/ShotMap3D.tsx` (New - The Three.js canvas)

## Execution Rules
- **DO NOT** use generic 2D SVG circles. This must be a premium React Three Fiber scene.
- **DO NOT** reinvent the styling wheel. Import and use `NeuCard`, `ChartHeader`, `SegmentedControl`, `ToggleAction`, and `IconAction`.
- **DO NOT** leave out the bloom effect. The neon aesthetic is mandatory.
- **DO NOT** hardcode the data in the component. Fetch it from the generated JSON file.
