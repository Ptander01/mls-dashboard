# Proto Image Notes - Session B

## Scatter Plot (proto_scatter.png)
- Light mode design with card container
- X axis: "Total Away Miles Traveled" (20k-40k range)
- Y axis: "Home Advantage (PPG Delta)" (0.0-1.0 range)
- Bubbles use team colors (muted), sized by squad depth
- Dashed regression line going from upper-left to lower-right
- Quadrant labels: "LOW TRAVEL · HIGH ADVANTAGE" (upper-left), "HIGH TRAVEL · LOW ADVANTAGE" (lower-right)
- Conference filter toggle: ALL | EAST | WEST in top-right
- Team labels above each bubble
- Insight headline above chart in a light blue container
- Grid lines: dashed horizontal/vertical

## Team Cards (proto_team_cards.png)
- 5-column grid of team cards (12 cards shown)
- Each card has: team color dot, team name, rank #
- 5-axis radar/spider chart per team
- Axes: Away, Conges(tion), Long-haul, Depth, Age
- Radar filled with team color (semi-transparent)
- Below radar: Away: X.XX  Miles: XXk  Age: XX.X  RES: XX
- Cards sorted by resilience rank
- Subtitle: "5-axis radar: Away PPG · Congestion Resistance · Long-haul Record · Squad Depth · Age Efficiency"
