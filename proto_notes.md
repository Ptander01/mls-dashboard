# Prototype Visual Notes

## Chart A — Dumbbell Gap (proto_dumbbell.png)
- Title: "Home vs Away Points Per Game"
- Subtitle: "Each team's average points earned at home (green) vs away (red). Gap width = home advantage magnitude."
- Toggle buttons: PPG | WIN% | GD (top right, pill-style)
- Legend: green dot = Home, red dot = Away, "Gap color = advantage direction"
- X-axis: 0.0 to 2.5+ scale at top
- Layout per row: team color dot + team name (left), dumbbell line (center), gap value like "+0.83" (right, colored teal/cyan)
- Sorted by gap magnitude descending (NE Revolution at top with +0.83, Inter Miami at bottom with +0.07)
- Dumbbell: thin horizontal line connecting two filled circles (green=home, red=away)
- The connecting line is a subtle thin line
- Insight headline above chart in a light card: "LAFC had the largest home advantage in MLS..."
- ~16 teams visible, scrollable or showing top teams

## Chart C — Resilience Index (proto_resilience_index.png)
- Title: "Travel Resilience Index — All 30 Teams"
- Subtitle: "Higher score = performance holds up better under travel and fixture congestion."
- Toggle: INDEX | COMPONENTS (top right)
- Layout per row: team color dot + team name (left ~200px), horizontal bar (center), SCORE number (right), MILES value (far right)
- Bars have rounded capsule shape with gradient coloring based on tier
- Green bars (top teams like LAFC 87, Inter Miami 83)
- Cyan bars (Columbus Crew 79, SEA 76)
- Amber/yellow bars (Philadelphia 63, LA Galaxy 62)
- Red bars (NE Revolution 38 at bottom)
- Bars appear to have a subtle 3D tube/capsule look with lighter top edge
- Column headers: TEAM, RESILIENCE SCORE, SCORE, MILES
- Insight headline: "Travel Resilience Index — composite score combining: away PPG (40%), performance after 5+ day rest vs 3 or fewer days (30%), and road record in matches following 1,000+ mile trips (30%). LAFC ranks #1 despite being the 2nd most traveled team in MLS."
- Shows ~16 teams in the visible area
