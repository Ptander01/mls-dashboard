# MLS Dashboard Upgrade Tasks

## Phase 1: Chart Maximize/Fullscreen
- [ ] Create ChartModal component with fullscreen overlay
- [ ] Add maximize button to NeuCard component
- [ ] Wire up maximize across all tabs (PlayerStats, TeamBudget, Attendance, PitchMatch)

## Phase 2: Travel Map Rebuild
- [ ] Replace SVG map with Google Maps integration
- [ ] Add proper Mercator projection with zoom/pan/drag
- [ ] Implement animated travel arcs as polylines on Google Maps
- [ ] Color-code arcs by distance traveled
- [ ] Keep timeline slider synced to matchweek

## Phase 3: 3D Marble Stadium Markers
- [ ] Create custom overlay markers with radial gradient marbles
- [ ] Use team primary colors for each marble
- [ ] Add specular highlight and soft outer glow
- [ ] Add hover tooltip with team name and match info

## Phase 4: Testing & Delivery
- [ ] Test all tabs with maximize feature
- [ ] Test map zoom/pan/drag interactions
- [ ] Test timeline animation with new map
- [ ] Save checkpoint and deliver
