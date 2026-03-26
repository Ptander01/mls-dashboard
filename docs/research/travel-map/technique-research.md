# Travel Map Technical Research Notes

## Mapbox Cinematic Route Animation Technique
**Source:** https://www.mapbox.com/blog/building-cinematic-route-animations-with-mapboxgl

Key techniques used for Tour de France route animations:
- **Route reveal:** GeoJSON LineString with `line-gradient` paint property, incrementally revealing the path using `animationPhase` (0 to 1).
- **Camera follow:** Uses `turf.along()` to get the leading edge coordinates, then trigonometry to position the camera at a fixed altitude/pitch behind the leading edge.
- **Cinematic rotation:** Bearing changes at a constant rate (`startBearing - animationPhase * 200.0`) for a slow pan effect.
- **LERP smoothing:** Linear interpolation prevents jerky camera movement on sharp turns.
- **Globe fly-in:** Custom function transitions from globe view to route-level view.
- **3D terrain:** Built on Mapbox GL JS terrain with satellite imagery.

**Relevance to MLS:** This exact pattern could animate a team's season — fly in from globe to North America, then trace the team's travel schedule week by week with the camera following the route between stadiums. The "leading edge" becomes the current matchweek.

## MapLibre GL JS Capabilities (Mapbox-free alternative)
- Full 3D terrain support with DEM tiles (free from AWS Terrain Tiles or MapTiler).
- Custom Three.js layers can be embedded directly into the map scene.
- `react-map-gl` provides React bindings compatible with MapLibre.
- No API key cost (open source), unlike Mapbox which charges per tile load.

## Three Possible Architecture Approaches

### Option A: MapLibre GL + Custom Three.js Layer
- MapLibre handles terrain, tiles, camera.
- Three.js custom layer adds stadium markers, animated arcs, data overlays.
- **Pro:** Real geography, real terrain, lightweight.
- **Con:** Two rendering pipelines to coordinate.

### Option B: Pure Three.js (no mapping library)
- Load a US/Canada heightmap as a displacement map on a plane.
- Render everything in Three.js: terrain, routes, markers, labels.
- **Pro:** Total creative control, matches existing Three.js stack.
- **Con:** No tile-based zoom, no street-level detail, more manual work.

### Option C: Globe.gl / react-globe.gl
- Pre-built 3D globe with arc animations, point markers, label layers.
- Built on Three.js under the hood.
- **Pro:** Animated arcs between points are a first-class feature.
- **Con:** Globe projection (not flat map), may feel disconnected from the rest of the dashboard aesthetic.

## Key Decision: What Data Does the Map Show?
The scope creep concern is valid. The map needs ONE clear purpose. Options:
1. **Travel narrative only:** Animate a team's season journey, stadium to stadium. The map IS the story.
2. **Travel + results:** Each stop shows W/D/L result, maybe color-coded arcs.
3. **Travel + performance:** Overlay attendance, PPG, or other metrics at each stadium.
4. **Network overview:** Show all 30 teams' travel networks simultaneously (like the string art reference).

The inspiration images suggest option 1 or 2 — cinematic storytelling, not dense data.
