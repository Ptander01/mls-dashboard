# TravelScatterChart — Crater Implementation Handoff (Updated March 18, 2026)

## Current State

The active `TravelScatterChart.tsx` has been **reverted to the working SVG backup** (the "metallic rings" version from commit `74eb89b`). This version looks good and the user considers it an acceptable fallback. The dashboard is NOT broken.

A Three.js V6 attempt is saved as `TravelScatterChart.threejs-v6.tsx` for reference — it has the right architecture but the camera/geometry needs fixing.

## File Inventory

| File | Description |
|------|-------------|
| `client/src/components/charts/TravelScatterChart.tsx` | **ACTIVE** — SVG metallic rings version (the good backup) |
| `client/src/components/charts/TravelScatterChart.backup.tsx` | Same as active (copy of SVG version) |
| `client/src/components/charts/TravelScatterChart.threejs-v6.tsx` | Three.js V6 attempt — smooth parabolic bowls, orthographic camera, but broken visually |
| `reference_images/backup_render_metallic_rings.png` | Screenshot of the SVG backup — user likes this as fallback |
| `reference_images/inspo_clay_relief_1.png` | Primary inspo — clay/plaster relief with craters, organic connections |
| `reference_images/inspo_simple_holes_2.png` | Secondary inspo — simple holes punched into flat surface |
| `reference_images/inspo_clay_closeup_3.png` | Close-up of clay relief showing depth and shadow detail |
| `reference_images/inspo_SD_closeup.png` | Close-up of current render's SD crater for comparison |
| `reference_images/v6_broken_elongated.png` | Screenshot of broken V6 — elongated eye-shapes from bad camera angle |

## Dependencies (Already Committed)

`three`, `@react-three/fiber`, `@react-three/drei`, `@types/three` are all in `package.json` already. Just run `npm install`.

## The Goal

Create impact craters that look like **holes pressed into a flat clay/plaster surface** — matching the reference images in `reference_images/`. The key visual is a **monochromatic relief sculpture** viewed from above, where depth is conveyed purely through shadow and light.

## What the User Wants (Critical Visual Requirements)

Based on extensive feedback across multiple iterations:

1. **Concave holes, NOT convex domes** — The craters must read as depressions/holes in a surface, not raised bumps. This is the #1 issue that kept recurring.

2. **Monochromatic warm cream/beige** — Everything is the same color (`#e5e1dc` or similar). Depth comes ONLY from shadows cast by directional lighting. No color variation between surface and crater.

3. **Nearly top-down view** — Like looking at a relief sculpture from directly above. Just enough angle to see shadow inside the craters. The inspo images are essentially top-down.

4. **Steep crater walls** — The floor should be nearly as wide as the mouth opening (like a cylinder, not a bowl). Minimal visible slope.

5. **3D ring grooves** — Each concentric ring inside the crater should be a physical step/ledge with its own shadow/highlight, NOT just a faint line. The rings encode squad rotation depth (more rings = deeper rotation).

6. **Soft directional shadow** — Single light source from upper-left. Shadow crescent on the upper-left interior wall (rim blocks light from reaching near wall). Lit floor on the lower-right.

7. **Matte plaster material** — Ultra-high roughness (0.95-0.98), zero metalness. No shiny or metallic appearance.

8. **Subtle rim edge** — NOT a thick bright white ring. Just a slight lip where the surface breaks into the hole.

## Data Interface

```typescript
interface TeamResilienceMetrics {
  teamId: string;
  teamShort: string;
  conference: string; // "Eastern" or "Western"
  primaryColor: string;
  totalAwayMiles: number;
  homePPG: number;
  awayPPG: number;
  ppgGap: number; // homePPG - awayPPG (home advantage)
  squadDepthIndex: number; // Gini index for squad rotation
  uniquePlayersUsed: number;
  // ... other fields in resilienceUtils.ts
}
```

## Data Mapping

| Visual Property | Data Field | Scale |
|----------------|------------|-------|
| X position | `totalAwayMiles` | Linear, ~8k to ~25k |
| Y position | `ppgGap` | Linear, ~-1.0 to ~1.5 |
| Crater radius | `abs(ppgGap)` | Sqrt, bigger gap = bigger crater |
| Crater depth | Proportional to radius | `radius * 0.35` max |
| Ring count | `squadDepthIndex` | Linear, 3 to 8 rings |

## What Was Tried and What Failed

### Attempt 1-3: SVG Approaches
- Used SVG gradients, filters, and strokes to simulate 3D
- **Problem:** SVG can only fake depth — the craters always looked like flat 2D drawings or convex "Captain America shields" rather than concave holes
- The metallic rings version (current backup) was the best SVG result — user likes it as fallback but it doesn't match the inspo

### Attempt 4-5: Three.js with ExtrudeGeometry Surface + LatheGeometry Bowls
- Created a thick surface slab with circular holes punched out using `ExtrudeGeometry`
- Placed `LatheGeometry` bowl meshes below each hole
- **Problem 1:** Terraced steps were too dramatic — looked like spiral staircases, not smooth bowls
- **Problem 2:** Bowl geometry didn't match hole size — visible gaps between bowl rim and surface hole
- **Problem 3:** Camera angle too oblique — craters looked like amphitheaters from the side
- **Problem 4:** Depth too extreme — craters punched through the surface slab

### Attempt 6: Three.js with Smooth Parabolic Bowls + Orthographic Camera
- Simplified to smooth parabolic bowl profile: `y = -depth * (1 - t²)`
- Switched to orthographic camera for relief sculpture look
- Removed ExtrudeGeometry surface (just flat plane + bowls on top)
- **Problem:** Camera position `[-3, 50, 8]` with orthographic projection created elongated eye-shapes instead of circles. The slight tilt combined with orthographic projection distorted the circular bowls into ellipses.

## Recommended Next Steps

### Option A: Fix the Three.js V6 Approach (Most Promising)

The V6 architecture is sound — the main issue was the camera. Key fixes:

1. **Camera must be EXACTLY top-down** for orthographic: `position=[0, 50, 0]` looking at `[0, 0, 0]`. ANY tilt with orthographic will distort circles into ellipses. If you want to see into craters, the depth illusion must come ENTIRELY from the directional light casting shadows into the bowls — not from camera angle.

2. **Alternative: Use perspective camera with high FOV from far away** — this gives a nearly-orthographic look but with slight depth. Position at `[0, 80, 2]` looking at `[0, 0, 0]` with narrow FOV.

3. **Ring grooves** — Add sinusoidal undulations to the bowl profile (the V6 code has this but amplitude may need tuning). Each groove should be deep enough to catch shadow from the directional light.

4. **Shadow quality** — Use `shadow-radius={4}` for soft shadow edges, `shadow-mapSize={2048}` for detail.

5. **The V6 code is in `TravelScatterChart.threejs-v6.tsx`** — start from there, fix the camera, and iterate.

### Option B: Canvas 2D Approach (Alternative)

If Three.js keeps being problematic, a 2D Canvas approach could work:
- Render each crater as a pre-computed radial gradient with computed lighting
- Use the directional light angle to compute per-pixel shading
- More control over the exact appearance, less dependency on 3D engine quirks
- Downside: no real shadows, everything must be computed manually

### Option C: Keep the SVG Backup (Fallback)

The current active file IS the SVG backup. It looks good (metallic rings with dramatic shadows). If the user decides the 3D approach isn't worth pursuing, this is already in place.

## Key Lessons Learned

1. **Orthographic + any tilt = distortion.** Circles become ellipses. Either go pure top-down ortho OR use perspective.
2. **SVG can't convincingly fake concave depth.** The human eye reads SVG gradients as convex (dome-like) by default. Flipping the gradient doesn't fully convince.
3. **Three.js LatheGeometry works well for crater bowls** — the geometry is correct, it's the camera and lighting that need tuning.
4. **Depth must be shallow** — `radius * 0.35` max. The inspo images show subtle depressions, not deep holes.
5. **Same color for everything** — surface and crater must be identical color. Depth comes only from real shadows.
6. **The user is very visually discerning** — they can immediately tell the difference between fake 2D shading and real 3D geometry. Don't try to fake it with SVG.

## How to Test

```bash
cd /home/ubuntu/mls-dashboard
npm install
npm run dev
# Navigate to Travel Map tab, scroll to Chart B
# "Travel Burden vs Away Performance Drop"
```

## Git History

| Commit | Description |
|--------|-------------|
| `811cb1e` | Initial scatter chart |
| `a2e4aa8` | Cinematic crater upgrade (SVG) |
| `74eb89b` | scatter-v3 deeper 3D (SVG) — the "good backup" version, currently active |
| HEAD (uncommitted) | Three.js V6 saved as separate file, SVG backup restored as active |
