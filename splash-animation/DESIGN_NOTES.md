# MLS Dashboard Splash Animation

## Concept: "The Illuminated Monolith"

A cinematic splash page intro animation for the MLS Analytics Dashboard featuring the MLS crest rendered as a 3D embossed metallic form on brushed dark titanium, with the subtitle "A Deeper Look" debossed into the surface.

## Creative Direction

| Dimension | Choice |
|-----------|--------|
| Surface Material | Brushed dark titanium — cold, industrial precision |
| Logo Reveal | Camera pullback — starts macro close-up, pulls back to reveal |
| Text Animation | Smooth left-to-right sweep / ripple carving into surface |
| Color Temperature | Monochromatic dark with subtle cyan (#00d4ff) glow accents |
| Pacing | Slow and luxurious (8-12 seconds) |

## Version History

**v1/** — Initial 3-shot composite (19s). Individual shots are strong but transitions feel stitched.

**v2/** — Improved 4-shot composite (24s) with chained keyframes for better continuity. Added bridge shot between macro and wide view.

**v3/** — Refined 4-shot composite (24s). Shot 1 starts on the logo surface itself (not plain titanium). Text uses smooth left-to-right sweep instead of staggered letter stamping.

**v4-final/** — Single continuous 8-second shot combining the best elements: macro close-up on logo surface pulling back to reveal full composition with text ripple-carving. No cuts, no crossfades, no seams. The most cohesive result.

## Key Lesson

Single-shot generation produces dramatically more cohesive results than multi-shot stitching with crossfades. Each AI-generated shot has slightly different lighting, texture, and color grading that creates visible seams even with smooth transitions.

## File Structure

```
splash-animation/
├── v1/                  # Version 1: 3-shot composite
├── v2/                  # Version 2: 4-shot with chained keyframes
├── v3/                  # Version 3: Refined shots (macro on logo, wave text)
├── v4-final/            # Version 4: Single continuous shot (BEST)
├── concepts/            # Initial concept exploration keyframes (3 concepts)
├── keyframes/           # Production keyframes used for video generation
└── DESIGN_NOTES.md      # This file
```
