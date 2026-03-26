# Sprint Brief: Travel Map Visual Research & Concept Exploration

## Overview
The Travel Map tab currently features a 2D map with arcs representing team travel. We want to overhaul this into a highly cinematic, immersive 3D experience. However, we are facing "scope creep" — we know how we want it to *feel* (3D terrain, physical depth, documentary-style lighting), but we aren't sure exactly what it should *do* or *show* (just travel? travel + results? travel + performance metrics?). 

Furthermore, we have rejected the use of `deck.gl` due to bundle size concerns (~400-500KB).

**This is a RESEARCH AND WIREFRAME sprint, not an implementation sprint.** The goal is to explore technical approaches (MapLibre GL vs. Pure Three.js) and conceptual directions, presenting 2-3 concrete options before any code is merged into the dashboard.

## Inspiration & Aesthetic Goals
The user has provided four key reference images (saved in `docs/travel-map-research/inspiration/`). The visual themes are:
1. **Cinematic 3D Terrain:** Real topographical depth (mountains have physical height), dark/monochromatic base, warm edge lighting, shallow depth-of-field (tilt-shift effect).
2. **Data on the Surface:** Stats, labels, and routes should be rendered *as part of the 3D landscape*, not as floating HTML UI panels. 
3. **Physicality:** The map should feel like a physical object (like a war room table or a string-and-pin art installation).

## The Constraints
1. **NO `deck.gl`**: The bundle size is too large.
2. **Acceptable Tech Stack**: 
   - **MapLibre GL JS** (with `react-map-gl` and custom Three.js layers for terrain/arcs).
   - **Pure Three.js** (loading a custom displacement map/heightmap for North America and rendering everything in WebGL).
3. **Focus**: The map must have ONE clear narrative purpose.

## AI Developer Instructions

### Phase 1: Technical Architecture Recommendation
Research and write a short recommendation comparing two approaches for achieving the cinematic terrain look:
- **Approach A:** MapLibre GL with 3D terrain enabled + a custom Three.js layer for the animated arcs and 3D text.
- **Approach B:** Pure Three.js using a high-res North America heightmap/displacement map, completely bypassing mapping tile libraries.

*Question to answer: Which approach gives us the most "cinematic, documentary-style" control over lighting, shadows, and depth-of-field while keeping the bundle size small?*

### Phase 2: Conceptual Directions
Propose 3 distinct conceptual directions for what the map should actually *show*. For example:
- **Concept 1: The Narrative Journey.** Focuses purely on one team at a time. The camera flies in from a globe view, then smoothly pans across the terrain following the team week-by-week. No heavy stats, just the cinematic journey of the season.
- **Concept 2: The Physical Network.** Inspired by the string-art reference. Abstracts the geography slightly and shows all 30 teams' travel simultaneously as glowing physical threads.
- **Concept 3: The Battleground.** Travel routes + Match Results. Arcs are colored by Win/Loss, and 3D text drops onto the terrain at each stadium showing the scoreline.

### Phase 3: Proof-of-Concept Sandbox
Build a standalone HTML/JS proof-of-concept (outside the React app, just a simple `sandbox.html`) demonstrating the preferred technical approach (e.g., a basic Three.js scene with a displacement map, cinematic lighting, and one animated arc). 
- Do not integrate this into `TravelMap.tsx` yet.
- The goal is to prove the visual aesthetic (shadows, terrain extrusion, lighting) is achievable.

## Deliverables for the User
1. A summary of the Technical Architecture recommendation (MapLibre vs. Pure Three.js).
2. 3 Conceptual Directions for what the map should actually do.
3. A working `sandbox.html` that the user can open in their browser to see the cinematic lighting and terrain effect in action.
