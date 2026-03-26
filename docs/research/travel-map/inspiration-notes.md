# Travel Map Inspiration Notes

## Reference 1: Cinematic Terrain (Laos/Vietnam/Cambodia)
**File:** `ref1-cinematic-terrain-laos.webp`
**Source:** Likely a Vox or documentary-style motion graphics piece.
**What stands out:**
- Extruded 3D terrain with real topography — mountains have physical height.
- Dark, desaturated color palette with warm edge lighting (almost sepia).
- Shallow depth-of-field blur at the edges — gives a tilt-shift / miniature effect.
- Country labels are large, spaced-letter serif typography floating on the surface.
- Grid lines subtly visible on the ocean floor — gives a "war room table" feel.
- The overall mood is cinematic, serious, editorial.

## Reference 2: Data Overlay on Terrain (Dunkirk Evacuation)
**File:** `ref2-data-overlay-dunkirk.webp`
**Source:** Likely a Vox Darkroom or similar documentary data visualization.
**What stands out:**
- Same extruded terrain style but with **data overlaid directly on the geography**.
- "143,000 SOLDIERS EVACUATED" rendered as massive 3D text sitting on the ocean surface.
- Orange/gold highlight routes drawn directly on the terrain.
- Small 3D pin markers (spheres) placed at specific locations.
- The key insight: **stats are part of the landscape, not floating UI panels**.

## Reference 3: White Terrain with Infographic Overlay (India Green Crime)
**File:** `ref3-white-terrain-india-stats.png`
**Source:** Appears to be a web-based interactive (possibly WebGL/Three.js).
**What stands out:**
- **Light/white terrain** — proves the cinematic 3D map works in light mode too.
- Infographic elements (donut chart, percentage, labels) are rendered **on the map surface** as if printed on the terrain.
- Clean, minimal typography — black text on white terrain.
- The terrain extrusion is subtle — just enough to feel 3D without being dramatic.
- This is the closest reference to what a "light mode" version could look like.

## Reference 4: Physical String Transit Map (NYC Subway)
**File:** `ref4-physical-string-transit-map.png`
**Source:** Physical art installation — pins and colored string on a white board.
**What stands out:**
- This is a **physical object**, not digital — but the aesthetic is relevant.
- Colored strings represent routes, pins represent stations/nodes.
- The shadow casting from the physical strings gives natural depth.
- Minimal, almost abstract — the geography is implied by the route shapes.
- This suggests a possible direction: **abstract the geography** and focus on the network of routes as the primary visual, with physical-feeling materials (string, pins, shadow).

## Synthesis: Common Threads
1. **3D terrain with real topography** — not flat tiles with a perspective transform.
2. **Data lives on the surface** — stats, labels, routes are rendered as part of the 3D scene, not floating UI.
3. **Cinematic lighting and depth-of-field** — the map feels like a physical object you're looking down at.
4. **Restrained color** — monochromatic base with 1-2 accent colors for data highlights.
5. **The tension:** References 1-3 are geographic realism; Reference 4 is abstract minimalism. These are two very different directions.
