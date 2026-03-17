# Design Brief: Storytelling Chronological Timeline Tab

## Objective
Create a narrative-driven visualization that tells the story of a team's season chronologically. This moves away from aggregated, end-of-season statistics and focuses on the journey—the highs, lows, streaks, injuries, and key turning points that define a campaign.

## Inspiration & Aesthetic
- **Scrollytelling:** The New York Times / The Pudding style interactive articles where scrolling down a page triggers animations and updates to a sticky graphic.
- **Vertical Journey Maps:** A central spine (the timeline) with events branching off left and right.
- **The Neumorphic Dashboard Style:** The timeline spine should look like an extruded physical track or rail, with event nodes appearing as indented buttons or raised chips.

## Key Components

### 1. The Central Timeline Spine
A vertical, scrollable timeline that represents the entire MLS season (Matchweek 1 to 34, plus playoffs).
- **Visuals:** A thick, continuous line down the center of the screen. The line color changes based on the team's form (e.g., green for a winning streak, red for a losing streak).
- **Interaction:** As the user scrolls, a "current date" indicator moves down the spine, triggering animations for the events that occur at that time.

### 2. Event Nodes & Narrative Cards
Significant events are plotted along the spine. When the user scrolls past an event, an insight card expands.
- **Event Types:**
  - *Match Results:* Major wins, crushing defeats, rivalry games.
  - *Player Milestones:* Hat-tricks, debut goals, record-breaking performances.
  - *Adversity:* Major injuries, red cards, travel fatigue spikes (linking back to the Resilience Index).
  - *Tactical Shifts:* Formation changes or managerial adjustments.
- **Visuals:** Use distinct icons or small SVG graphics for different event types. The narrative cards should use the `insightEngine.ts` to generate punchy, contextual sentences.

### 3. The "Context" Side Panel (Sticky Graphic)
While the user scrolls the timeline on the left/center, a sticky panel on the right updates to show the team's changing statistical profile.
- **Visuals:** This could be a mini version of the Attendance Trend chart, the Team Radar chart, or the Rank Bump chart, which animates and morphs as the timeline progresses.
- **Goal:** Connect the narrative event (e.g., "Star striker injured in Week 10") to the statistical reality (the xG trendline immediately plummets on the sticky graphic).

## Technical Implementation Notes
- **Architecture:** This requires a "scrollytelling" setup. Libraries like `react-scrollama` or simply using `framer-motion` with `useScroll` and `useTransform` hooks are ideal.
- **Data Structure:** Requires a new data model: an array of `SeasonEvent` objects, each with a date, matchweek, type, description, and related metrics.
- **Insight Engine Integration:** The `insightEngine.ts` will need a new module specifically for generating chronological narratives (e.g., detecting streaks and generating the text "Miami rode a 5-game winning streak into the summer...").
