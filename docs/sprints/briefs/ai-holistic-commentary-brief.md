# Sprint Brief: AI-Powered Holistic Team Commentary

## Overview
Currently, the Season Pulse narrative timeline relies on a rule-based algorithmic engine to detect inflection events (streaks, surges, upsets) and generate a templated summary string. While functional, it lacks context-awareness. 

This sprint aims to replace the algorithmic summary card with a rich, AI-generated holistic commentary. By feeding an LLM the team's complete trajectory data, match results, roster information, and salary context, we can generate compelling, human-like storylines (e.g., "Berterame, $15M signing, hasn't scored in 9 games" or "Brand new head coach weathers shaky start").

## Goals
1. Integrate an LLM service (OpenAI via existing configuration) to generate context-aware team season summaries.
2. Build a data aggregation pipeline that compiles team context (standings trajectory, match results, player stats, salary data) into an optimized prompt payload.
3. Update `SeasonTimeline.tsx` to display the AI-generated commentary in the `SummaryCard`, including loading states and caching to minimize API calls.
4. Provide fallback handling to the existing rule-based narrative if the API call fails or is unavailable.

## Implementation Details

### 1. Data Aggregation (`lib/aiNarrativeEngine.ts`)
Create a new file to handle data prep and API communication.
- **`buildTeamContextPrompt(teamId, seasonYear)`**: Gathers all necessary context into a concise text block.
  - **Results & Trajectory**: W-D-L record, PPG, rank changes over the season.
  - **Roster & Performance**: Top goalscorers, key players, injuries (if data available).
  - **Financial Context**: Total salary, key high-earning players (to identify underperforming DPs).
- **`generateHolisticCommentary(teamId)`**: Calls the OpenAI API (e.g., `gpt-4.1-mini`) with the system prompt instructing it to act as an expert MLS analyst.

### 2. Prompt Engineering
The system prompt should enforce a specific tone and structure:
- **Tone**: Analytical, engaging, slightly journalistic (like an Athletic article).
- **Structure**: 2-3 short paragraphs.
- **Directives**: Focus on *why* things happened, not just *what* happened. Mention specific high-salary players if they are underperforming or carrying the team. Note managerial changes or severe form shifts.

### 3. Component Updates (`SeasonTimeline.tsx` & `SummaryCard`)
- Introduce a `useAiCommentary(teamId)` hook to manage the asynchronous fetch, loading state, and error handling.
- Update `SummaryCard` to accept a `loading` prop and display a skeleton loader or spinner while the AI generates the text.
- Implement a client-side cache (e.g., using `localStorage` or a simple in-memory `Map`) keyed by `teamId` and `maxWeek` to prevent redundant API calls when clicking between teams.

### 4. Fallback Mechanism
If the user's OpenAI credits run out or the API request fails, gracefully fallback to the existing `seasonSummaryNarrative` from `insightEngine.ts`.

## Acceptance Criteria
- [ ] A new utility file exists for communicating with the OpenAI API and constructing the context prompt.
- [ ] The prompt successfully incorporates standings, match results, and player/salary data.
- [ ] The `SummaryCard` in the narrative timeline displays the AI-generated text.
- [ ] A loading state is visible while the text is being generated.
- [ ] The generated text is cached so revisiting a team in the same session does not trigger a new API call.
- [ ] If the API call fails, the UI falls back to the algorithmic summary without crashing.

## Required Files to Modify/Create
- `client/src/lib/aiNarrativeEngine.ts` (New)
- `client/src/components/charts/SeasonTimeline.tsx`
- `client/src/components/tabs/SeasonPulse.tsx` (If context providers need updating)
- `.env.example` (Ensure OPENAI_API_KEY is documented)
