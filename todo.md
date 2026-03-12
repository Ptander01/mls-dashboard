# Travel Map Rebuild - Cinematic Quality

- [ ] Fetch real GeoJSON: US states, Canada provinces, coastlines from Natural Earth
- [ ] Process GeoJSON into optimized format for Three.js rendering
- [ ] Rebuild ground plane with proper cartographic terrain texture
- [ ] Render smooth vector state/province borders as Three.js line geometry
- [ ] Add subtle terrain variation (elevation hints, urban area patches)
- [ ] Improve orb materials - denser glass, proper Fresnel, ground light pools
- [ ] Add vertical light pillars from each stadium (Craig Taylor style)
- [ ] Improve arc rendering - thinner, more elegant metallic tubes
- [ ] Team-colored animated flow dots on arcs
- [ ] Proper depth of field / atmospheric perspective
- [ ] Test and verify visual quality matches reference images

# X Axis / Stacked Bar Fix

- [x] Fix X axis line overlap with stacked bar 3D extrusion in Team Budget chart — bars should rest ON the X axis line, not hang through it

# Pie Chart Refinements

- [ ] Add percentages to data labels (e.g. "Forwards $14.5M (43%)")
- [ ] Make inner hole a recessed "floor" — not raised — so segments cast shadows inward onto it
- [ ] Add subtle inner wall illumination on light-facing segments (interior edge catches light)
- [ ] Tone down blue segment gradient (less white/bright on the highlight)
- [ ] Remove the extruded/raised look from the inner hole center

# Attendance Chart Fixes

- [x] Offset attendance bars above X axis (same fix as team salary stacked bars)
- [x] Replace stadium capacity dotted lines with textured 3D braille dots with lighting gradients and cast shadows
