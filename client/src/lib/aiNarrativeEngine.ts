/**
 * aiNarrativeEngine.ts — AI-Powered Holistic Team Commentary
 *
 * Data aggregation pipeline and OpenAI integration for generating
 * context-aware, analyst-quality team season narratives.
 *
 * Two main exports:
 *   - buildTeamContextPrompt(): Compiles team trajectory, results, roster,
 *     and salary data into an optimized text block for the LLM.
 *   - generateHolisticCommentary(): Sends the context to OpenAI and returns
 *     a rich, multi-paragraph commentary string.
 *
 * Designed for client-side use — calls a lightweight server proxy at
 * /api/ai-commentary to keep the API key secure.
 */

import type { Team, Player, Match, TeamBudget } from "./mlsData";
import { getTeam } from "./mlsData";
import {
  getTeamTrajectory,
  getTeamEvents,
  getTeamWeeklyResults,
  type TeamWeekStanding,
  type SeasonEvent,
  type WeekMatchResult,
} from "./seasonPulse";

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export interface TeamContext {
  teamId: string;
  teamName: string;
  teamShort: string;
  conference: string;
  seasonYear: number;
  totalWeeks: number;
  /** Compiled text block for the LLM prompt */
  contextBlock: string;
}

export interface AiCommentaryResult {
  commentary: string;
  source: "ai";
  cachedAt: number;
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function fmtSalary(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formString(form: ("W" | "D" | "L")[]): string {
  return form.slice(0, 5).join("-");
}

// ═══════════════════════════════════════════
// DATA AGGREGATION
// ═══════════════════════════════════════════

/**
 * Build a concise text block summarizing a team's entire season context.
 * This is the "prompt payload" — everything the LLM needs to write
 * an informed, analyst-quality commentary.
 */
export function buildTeamContextPrompt(
  teamId: string,
  teams: Team[],
  matches: Match[],
  players: Player[],
  teamBudgets: Record<string, TeamBudget>,
  totalWeeks: number,
  seasonYear: number
): TeamContext | null {
  const team = getTeam(teamId);
  if (!team) return null;

  const trajectory = getTeamTrajectory(teamId, teams, matches, totalWeeks);
  const events = getTeamEvents(teamId, teams, matches, totalWeeks);
  const weeklyResults = getTeamWeeklyResults(teamId, teams, matches, totalWeeks);

  if (!trajectory || trajectory.length === 0) return null;

  const last = trajectory[trajectory.length - 1];
  const first = trajectory[0];
  if (!last || last.played === 0) return null;

  const teamPlayers = players.filter((p) => p.team === teamId);
  const budget = teamBudgets[teamId];

  const sections: string[] = [];

  // ─── Section 1: Identity & Standing ───
  sections.push(
    `TEAM: ${team.name} (${team.short}) | ${team.conference} Conference | ${seasonYear} Season`
  );
  sections.push(
    `CURRENT STANDING: ${ordinal(last.powerRank)} power rank | ${ordinal(last.pointsRank)} points rank | ${last.points} pts from ${last.played} matches | PPG: ${last.ppg.toFixed(2)} | Tier: ${last.tier}`
  );

  // ─── Section 2: Season Trajectory ───
  const rankDelta = first.powerRank - last.powerRank;
  const trajectoryDir =
    rankDelta > 3
      ? "significant climb"
      : rankDelta < -3
        ? "significant drop"
        : "relatively stable position";
  sections.push(
    `TRAJECTORY: Started ${ordinal(first.powerRank)}, now ${ordinal(last.powerRank)} (${trajectoryDir}). Record: ${last.wins}W-${last.draws}D-${last.losses}L | GD: ${last.goalDifference > 0 ? "+" : ""}${last.goalDifference} (${last.goalsFor} GF, ${last.goalsAgainst} GA)`
  );

  // Home/Away split
  sections.push(
    `HOME: ${last.homeWins}W-${last.homeDraws}D-${last.homeLosses}L (${last.homeGF} GF, ${last.homeGA} GA) | AWAY: ${last.awayWins}W-${last.awayDraws}D-${last.awayLosses}L (${last.awayGF} GF, ${last.awayGA} GA)`
  );

  // Current form
  sections.push(`CURRENT FORM (last 5): ${formString(last.form)}`);

  // ─── Section 3: Key Results (last 10 matches) ───
  const allResults: { week: number; result: WeekMatchResult }[] = [];
  weeklyResults.forEach((results, week) => {
    results.forEach((r) => allResults.push({ week, result: r }));
  });
  allResults.sort((a, b) => b.week - a.week);
  const recentResults = allResults.slice(0, 10);

  if (recentResults.length > 0) {
    const resultsStr = recentResults
      .map((r) => {
        const m = r.result;
        const loc = m.isHome ? "vs" : "@";
        return `W${r.week}: ${m.result} ${m.goalsFor}-${m.goalsAgainst} ${loc} ${m.opponentShort}`;
      })
      .join(" | ");
    sections.push(`RECENT RESULTS: ${resultsStr}`);
  }

  // ─── Section 4: Inflection Events ───
  if (events.length > 0) {
    const eventStrs = events
      .sort((a, b) => b.severity - a.severity)
      .slice(0, 6)
      .map(
        (e) =>
          `[W${e.week} sev:${e.severity}] ${e.title}: ${e.description}`
      );
    sections.push(`KEY EVENTS:\n${eventStrs.join("\n")}`);
  } else {
    sections.push("KEY EVENTS: No major inflection events detected — steady season.");
  }

  // ─── Section 5: Top Players ───
  const scorers = [...teamPlayers]
    .filter((p) => p.goals > 0)
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 5);
  const assisters = [...teamPlayers]
    .filter((p) => p.assists > 0)
    .sort((a, b) => b.assists - a.assists)
    .slice(0, 3);
  const minuteLeaders = [...teamPlayers]
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 3);

  if (scorers.length > 0) {
    const scorerStr = scorers
      .map(
        (p) =>
          `${p.name} (${p.position}, age ${p.age}): ${p.goals}G ${p.assists}A in ${p.minutes} min, salary ${fmtSalary(p.salary)}`
      )
      .join(" | ");
    sections.push(`TOP SCORERS: ${scorerStr}`);
  }

  if (assisters.length > 0) {
    const assistStr = assisters
      .map((p) => `${p.name}: ${p.assists}A ${p.goals}G`)
      .join(" | ");
    sections.push(`TOP ASSISTS: ${assistStr}`);
  }

  // ─── Section 6: Financial Context ───
  if (budget) {
    sections.push(
      `SALARY: Total ${fmtSalary(budget.totalSalary)} | ${budget.dpCount} DPs (${fmtSalary(budget.dpSalary)}) | ${budget.tamCount} TAM (${fmtSalary(budget.tamSalary)}) | ${budget.regularCount} regular (${fmtSalary(budget.regularSalary)})`
    );

    // High-salary players with low output (potential underperformers)
    const highPaid = teamPlayers
      .filter((p) => p.salary >= 1_000_000)
      .sort((a, b) => b.salary - a.salary);
    if (highPaid.length > 0) {
      const dpStr = highPaid
        .slice(0, 4)
        .map(
          (p) =>
            `${p.name} (${fmtSalary(p.salary)}): ${p.goals}G ${p.assists}A in ${p.minutes} min`
        )
        .join(" | ");
      sections.push(`HIGH-SALARY PLAYERS: ${dpStr}`);
    }
  }

  // ─── Section 7: PPG Trend ───
  if (trajectory.length >= 5) {
    const ppgTrend = trajectory
      .filter((_, i) => i % Math.max(1, Math.floor(trajectory.length / 6)) === 0 || i === trajectory.length - 1)
      .map((w) => `W${w.week}:${w.ppg.toFixed(2)}`)
      .join(" → ");
    sections.push(`PPG TREND: ${ppgTrend}`);
  }

  return {
    teamId,
    teamName: team.name,
    teamShort: team.short,
    conference: team.conference,
    seasonYear,
    totalWeeks,
    contextBlock: sections.join("\n\n"),
  };
}

// ═══════════════════════════════════════════
// SYSTEM PROMPT
// ═══════════════════════════════════════════

const SYSTEM_PROMPT = `You are an expert MLS analyst writing for a data-driven soccer dashboard. Your commentary should read like a premium article from The Athletic — analytical, engaging, and slightly journalistic.

RULES:
- Write exactly 2-3 short paragraphs (no headers, no bullet points, no markdown).
- Focus on WHY things happened, not just WHAT happened. Connect results to roster composition, salary investment, and tactical patterns.
- If a high-salary Designated Player (DP) is underperforming (few goals/assists relative to salary and minutes), call it out specifically by name and salary.
- If a low-salary player is outperforming expectations, highlight the value they provide.
- Note any severe form shifts, streaks, or momentum changes and speculate on causes.
- Reference specific match results when they illustrate a larger narrative.
- Use a confident, analytical tone. Avoid clichés like "time will tell" or "only time will tell."
- Keep total length under 200 words. Be concise and information-dense.
- Do NOT use any formatting — no bold, no italics, no headers. Plain text only.`;

// ═══════════════════════════════════════════
// API COMMUNICATION
// ═══════════════════════════════════════════

/**
 * Generate holistic AI commentary for a team's season.
 * Calls the server-side proxy at /api/ai-commentary.
 *
 * @throws Error if the API call fails (caller should handle fallback)
 */
export async function generateHolisticCommentary(
  teamId: string,
  teams: Team[],
  matches: Match[],
  players: Player[],
  teamBudgets: Record<string, TeamBudget>,
  totalWeeks: number,
  seasonYear: number
): Promise<string> {
  const context = buildTeamContextPrompt(
    teamId,
    teams,
    matches,
    players,
    teamBudgets,
    totalWeeks,
    seasonYear
  );

  if (!context) {
    throw new Error(`No season data available for team ${teamId}`);
  }

  const userPrompt = `Analyze this MLS team's ${context.seasonYear} season and write a holistic commentary:\n\n${context.contextBlock}`;

  const response = await fetch("/api/ai-commentary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      teamId: context.teamId,
      seasonYear: context.seasonYear,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `AI commentary request failed (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();

  if (!data.commentary || typeof data.commentary !== "string") {
    throw new Error("Invalid response format from AI commentary API");
  }

  return data.commentary.trim();
}
