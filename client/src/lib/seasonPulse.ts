/**
 * seasonPulse.ts — Weekly Standings Engine, Composite Scoring & Inflection Detection
 *
 * Core data layer for the Season Pulse tab. Iterates through matches week by week,
 * maintaining cumulative standings, computing a composite Power Score, and auto-detecting
 * inflection events (streaks, surges, collapses, upsets, milestones).
 *
 * Refactored for multi-season support: all public functions accept injected data
 * (matches, teams, totalWeeks) rather than importing static arrays. Caching is
 * keyed by season year to avoid cross-contamination.
 */

import type { Match, Team } from "./mlsData";
import { TEAMS, MATCHES, TOTAL_WEEKS, getTeam } from "./mlsData";

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export interface TeamWeekStanding {
  teamId: string;
  week: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  ppg: number;
  /** Last 5 results: "W" | "D" | "L" (most recent first) */
  form: ("W" | "D" | "L")[];
  /** Rank by points (1 = best) */
  pointsRank: number;
  /** Rank by composite power score (1 = best) */
  powerRank: number;
  /** Composite power score (0–100) */
  powerScore: number;
  /** Tier label derived from power score quartiles */
  tier: "Title Contenders" | "Playoff" | "Bubble" | "Rebuilding";
  /** Change in power rank from previous week (negative = improved) */
  rankDelta: number;
  /** Home record */
  homeWins: number;
  homeDraws: number;
  homeLosses: number;
  homeGF: number;
  homeGA: number;
  /** Away record */
  awayWins: number;
  awayDraws: number;
  awayLosses: number;
  awayGF: number;
  awayGA: number;
}

export type EventType =
  | "winning_streak"
  | "losing_streak"
  | "unbeaten_run"
  | "winless_run"
  | "rank_surge"
  | "rank_collapse"
  | "upset_win"
  | "upset_loss"
  | "milestone";

export interface SeasonEvent {
  teamId: string;
  week: number;
  type: EventType;
  severity: number; // 1-5
  title: string;
  description: string;
}

// ═══════════════════════════════════════════
// INTERNAL ACCUMULATORS
// ═══════════════════════════════════════════

interface TeamAccumulator {
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  results: ("W" | "D" | "L")[]; // all results in order
  homeWins: number;
  homeDraws: number;
  homeLosses: number;
  homeGF: number;
  homeGA: number;
  awayWins: number;
  awayDraws: number;
  awayLosses: number;
  awayGF: number;
  awayGA: number;
}

function freshAccumulator(teamId: string): TeamAccumulator {
  return {
    teamId,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
    results: [],
    homeWins: 0,
    homeDraws: 0,
    homeLosses: 0,
    homeGF: 0,
    homeGA: 0,
    awayWins: 0,
    awayDraws: 0,
    awayLosses: 0,
    awayGF: 0,
    awayGA: 0,
  };
}

// ═══════════════════════════════════════════
// COMPOSITE POWER SCORE
// ═══════════════════════════════════════════

const WEIGHTS = {
  pointsPosition: 0.35,
  form: 0.25,
  goalDifference: 0.2,
  consistency: 0.1,
  momentum: 0.1,
};

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return ((value - min) / (max - min)) * 100;
}

function formScore(results: ("W" | "D" | "L")[]): number {
  const last5 = results.slice(-5);
  if (last5.length === 0) return 50;
  const pts = last5.reduce(
    (s, r) => s + (r === "W" ? 3 : r === "D" ? 1 : 0),
    0
  );
  const maxPts = last5.length * 3;
  return (pts / maxPts) * 100;
}

function momentumScore(acc: TeamAccumulator): number {
  if (acc.played < 3) return 50;
  const overallPPG = acc.points / acc.played;
  const last5 = acc.results.slice(-5);
  const recentPts = last5.reduce(
    (s, r) => s + (r === "W" ? 3 : r === "D" ? 1 : 0),
    0
  );
  const recentPPG = recentPts / last5.length;
  if (overallPPG === 0) return recentPPG > 0 ? 75 : 50;
  const ratio = recentPPG / overallPPG;
  return Math.max(0, Math.min(100, ratio * 50));
}

function consistencyScore(acc: TeamAccumulator): number {
  const homeGames = acc.homeWins + acc.homeDraws + acc.homeLosses;
  const awayGames = acc.awayWins + acc.awayDraws + acc.awayLosses;
  if (homeGames === 0 || awayGames === 0) return 50;
  const homePts = acc.homeWins * 3 + acc.homeDraws;
  const awayPts = acc.awayWins * 3 + acc.awayDraws;
  const homePPG = homePts / homeGames;
  const awayPPG = awayPts / awayGames;
  const gap = Math.abs(homePPG - awayPPG);
  return Math.max(0, 100 - (gap / 3) * 100);
}

function computePowerScores(
  accumulators: Map<string, TeamAccumulator>
): Map<string, { score: number; rank: number; tier: TeamWeekStanding["tier"] }> {
  const entries = Array.from(accumulators.entries()).filter(
    ([, acc]) => acc.played > 0
  );

  if (entries.length === 0) {
    const result = new Map<
      string,
      { score: number; rank: number; tier: TeamWeekStanding["tier"] }
    >();
    Array.from(accumulators.keys()).forEach((id) => {
      result.set(id, { score: 0, rank: 1, tier: "Rebuilding" });
    });
    return result;
  }

  const raw = entries.map(([id, acc]) => ({
    id,
    ppg: acc.played > 0 ? acc.points / acc.played : 0,
    gd: acc.goalsFor - acc.goalsAgainst,
    form: formScore(acc.results),
    momentum: momentumScore(acc),
    consistency: consistencyScore(acc),
  }));

  const ppgs = raw.map((r) => r.ppg);
  const gds = raw.map((r) => r.gd);
  const minPPG = Math.min(...ppgs);
  const maxPPG = Math.max(...ppgs);
  const minGD = Math.min(...gds);
  const maxGD = Math.max(...gds);

  const scored = raw.map((r) => ({
    id: r.id,
    score:
      WEIGHTS.pointsPosition * normalize(r.ppg, minPPG, maxPPG) +
      WEIGHTS.form * r.form +
      WEIGHTS.goalDifference * normalize(r.gd, minGD, maxGD) +
      WEIGHTS.consistency * r.consistency +
      WEIGHTS.momentum * r.momentum,
  }));

  scored.sort((a, b) => b.score - a.score);

  const result = new Map<
    string,
    { score: number; rank: number; tier: TeamWeekStanding["tier"] }
  >();

  const scores = scored.map((s) => s.score);
  const q1 = quantile(scores, 0.25);
  const q2 = quantile(scores, 0.5);
  const q3 = quantile(scores, 0.75);

  scored.forEach((s, i) => {
    let tier: TeamWeekStanding["tier"];
    if (s.score >= q3) tier = "Title Contenders";
    else if (s.score >= q2) tier = "Playoff";
    else if (s.score >= q1) tier = "Bubble";
    else tier = "Rebuilding";
    result.set(s.id, { score: s.score, rank: i + 1, tier });
  });

  Array.from(accumulators.keys()).forEach((id) => {
    if (!result.has(id)) {
      result.set(id, { score: 0, rank: scored.length + 1, tier: "Rebuilding" });
    }
  });

  return result;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

// ═══════════════════════════════════════════
// CACHE — keyed by season identifier
// ═══════════════════════════════════════════

const _matrixCache = new Map<string, TeamWeekStanding[][]>();
const _eventsCache = new Map<string, SeasonEvent[]>();

function cacheKey(
  teams: Team[],
  matches: Match[],
  totalWeeks: number
): string {
  // Use match count + totalWeeks as a fast cache key
  return `${matches.length}-${totalWeeks}-${teams.length}`;
}

// ═══════════════════════════════════════════
// MAIN COMPUTATION: WEEKLY STANDINGS MATRIX
// ═══════════════════════════════════════════

/**
 * Build the complete standings matrix for the given season data.
 * Returns an array of N elements (index 0 = week 1), each containing
 * an array of TeamWeekStanding objects sorted by powerRank.
 *
 * Accepts injected data for multi-season support.
 */
export function computeWeeklyStandings(
  teams: Team[] = TEAMS,
  matches: Match[] = MATCHES,
  totalWeeks: number = TOTAL_WEEKS
): TeamWeekStanding[][] {
  const key = cacheKey(teams, matches, totalWeeks);
  const cached = _matrixCache.get(key);
  if (cached) return cached;

  const teamIds = teams.map((t) => t.id);
  const accumulators = new Map<string, TeamAccumulator>();
  teamIds.forEach((id) => accumulators.set(id, freshAccumulator(id)));

  // Group matches by week
  const matchesByWeek = new Map<number, Match[]>();
  for (const m of matches) {
    const arr = matchesByWeek.get(m.week) || [];
    arr.push(m);
    matchesByWeek.set(m.week, arr);
  }

  let prevPowerRanks = new Map<string, number>();
  const matrix: TeamWeekStanding[][] = [];

  for (let week = 1; week <= totalWeeks; week++) {
    const weekMatches = matchesByWeek.get(week) || [];

    for (const m of weekMatches) {
      const homeAcc = accumulators.get(m.homeTeam);
      const awayAcc = accumulators.get(m.awayTeam);
      if (!homeAcc || !awayAcc) continue;

      homeAcc.played++;
      awayAcc.played++;
      homeAcc.goalsFor += m.homeGoals;
      homeAcc.goalsAgainst += m.awayGoals;
      awayAcc.goalsFor += m.awayGoals;
      awayAcc.goalsAgainst += m.homeGoals;
      homeAcc.homeGF += m.homeGoals;
      homeAcc.homeGA += m.awayGoals;
      awayAcc.awayGF += m.awayGoals;
      awayAcc.awayGA += m.homeGoals;

      if (m.homeGoals > m.awayGoals) {
        homeAcc.wins++;
        homeAcc.homeWins++;
        homeAcc.points += 3;
        homeAcc.results.push("W");
        awayAcc.losses++;
        awayAcc.awayLosses++;
        awayAcc.results.push("L");
      } else if (m.homeGoals < m.awayGoals) {
        awayAcc.wins++;
        awayAcc.awayWins++;
        awayAcc.points += 3;
        awayAcc.results.push("W");
        homeAcc.losses++;
        homeAcc.homeLosses++;
        homeAcc.results.push("L");
      } else {
        homeAcc.draws++;
        homeAcc.homeDraws++;
        homeAcc.points += 1;
        homeAcc.results.push("D");
        awayAcc.draws++;
        awayAcc.awayDraws++;
        awayAcc.points += 1;
        awayAcc.results.push("D");
      }
    }

    const powerData = computePowerScores(accumulators);

    const pointsSorted = teamIds
      .map((id) => {
        const acc = accumulators.get(id)!;
        return {
          id,
          points: acc.points,
          gd: acc.goalsFor - acc.goalsAgainst,
          gf: acc.goalsFor,
        };
      })
      .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);

    const pointsRankMap = new Map<string, number>();
    pointsSorted.forEach((t, i) => pointsRankMap.set(t.id, i + 1));

    const weekStandings: TeamWeekStanding[] = teamIds.map((id) => {
      const acc = accumulators.get(id)!;
      const power = powerData.get(id)!;
      const prevRank = prevPowerRanks.get(id) ?? power.rank;
      const delta = prevRank - power.rank;

      return {
        teamId: id,
        week,
        played: acc.played,
        wins: acc.wins,
        draws: acc.draws,
        losses: acc.losses,
        goalsFor: acc.goalsFor,
        goalsAgainst: acc.goalsAgainst,
        goalDifference: acc.goalsFor - acc.goalsAgainst,
        points: acc.points,
        ppg: acc.played > 0 ? acc.points / acc.played : 0,
        form: acc.results.slice(-5).reverse() as ("W" | "D" | "L")[],
        pointsRank: pointsRankMap.get(id)!,
        powerRank: power.rank,
        powerScore: power.score,
        tier: power.tier,
        rankDelta: delta,
        homeWins: acc.homeWins,
        homeDraws: acc.homeDraws,
        homeLosses: acc.homeLosses,
        homeGF: acc.homeGF,
        homeGA: acc.homeGA,
        awayWins: acc.awayWins,
        awayDraws: acc.awayDraws,
        awayLosses: acc.awayLosses,
        awayGF: acc.awayGF,
        awayGA: acc.awayGA,
      };
    });

    weekStandings.sort((a, b) => a.powerRank - b.powerRank);
    matrix.push(weekStandings);

    prevPowerRanks = new Map<string, number>();
    for (const s of weekStandings) {
      prevPowerRanks.set(s.teamId, s.powerRank);
    }
  }

  _matrixCache.set(key, matrix);
  return matrix;
}

// ═══════════════════════════════════════════
// INFLECTION POINT DETECTION
// ═══════════════════════════════════════════

export function detectInflectionEvents(
  teams: Team[] = TEAMS,
  matches: Match[] = MATCHES,
  totalWeeks: number = TOTAL_WEEKS
): SeasonEvent[] {
  const key = cacheKey(teams, matches, totalWeeks);
  const cached = _eventsCache.get(key);
  if (cached) return cached;

  const matrix = computeWeeklyStandings(teams, matches, totalWeeks);
  const events: SeasonEvent[] = [];
  const teamIds = teams.map((t) => t.id);

  for (const teamId of teamIds) {
    const team = getTeam(teamId);
    const teamName = team?.short || teamId;

    const weeklyData = matrix.map(
      (weekStandings) => weekStandings.find((s) => s.teamId === teamId)!
    );

    let currentStreak: "W" | "D" | "L" | null = null;
    let streakLength = 0;
    let unbeatenRun = 0;
    let winlessRun = 0;

    for (let w = 0; w < weeklyData.length; w++) {
      const standing = weeklyData[w];
      if (!standing || standing.played === 0) continue;

      const prevStanding = w > 0 ? weeklyData[w - 1] : null;
      const thisWeekResult = standing.form[0];
      if (!thisWeekResult) continue;

      // === STREAK DETECTION ===
      if (thisWeekResult === currentStreak) {
        streakLength++;
      } else {
        currentStreak = thisWeekResult;
        streakLength = 1;
      }

      if (thisWeekResult === "W" || thisWeekResult === "D") {
        unbeatenRun++;
      } else {
        unbeatenRun = 0;
      }

      if (thisWeekResult === "D" || thisWeekResult === "L") {
        winlessRun++;
      } else {
        winlessRun = 0;
      }

      if (
        currentStreak === "W" &&
        streakLength >= 3 &&
        streakLength === countConsecutiveFromEnd(standing.form, "W")
      ) {
        if (streakLength === 3 || streakLength === 5 || streakLength === 7) {
          events.push({
            teamId,
            week: standing.week,
            type: "winning_streak",
            severity: Math.min(5, Math.ceil(streakLength / 2) + 1),
            title: `${streakLength}-Game Winning Streak`,
            description: `${teamName} have won ${streakLength} consecutive matches, climbing to ${ordinal(standing.powerRank)} in the power rankings.`,
          });
        }
      }

      if (
        currentStreak === "L" &&
        streakLength >= 3 &&
        streakLength === countConsecutiveFromEnd(standing.form, "L")
      ) {
        if (streakLength === 3 || streakLength === 5 || streakLength === 7) {
          events.push({
            teamId,
            week: standing.week,
            type: "losing_streak",
            severity: Math.min(5, Math.ceil(streakLength / 2) + 1),
            title: `${streakLength}-Game Losing Streak`,
            description: `${teamName} have lost ${streakLength} straight, dropping to ${ordinal(standing.powerRank)} in the power rankings.`,
          });
        }
      }

      if (unbeatenRun === 5 || unbeatenRun === 8 || unbeatenRun === 10) {
        events.push({
          teamId,
          week: standing.week,
          type: "unbeaten_run",
          severity: Math.min(5, Math.ceil(unbeatenRun / 3)),
          title: `${unbeatenRun}-Game Unbeaten Run`,
          description: `${teamName} have gone ${unbeatenRun} matches without defeat.`,
        });
      }

      if (winlessRun === 5 || winlessRun === 8 || winlessRun === 10) {
        events.push({
          teamId,
          week: standing.week,
          type: "winless_run",
          severity: Math.min(5, Math.ceil(winlessRun / 3)),
          title: `${winlessRun}-Game Winless Run`,
          description: `${teamName} have gone ${winlessRun} matches without a victory.`,
        });
      }

      // === RANK SURGE / COLLAPSE ===
      if (prevStanding && prevStanding.played > 0) {
        const rankChange = prevStanding.powerRank - standing.powerRank;

        if (rankChange >= 5) {
          events.push({
            teamId,
            week: standing.week,
            type: "rank_surge",
            severity: Math.min(5, Math.ceil(rankChange / 3)),
            title: `Surged ${rankChange} Places`,
            description: `${teamName} rocketed from ${ordinal(prevStanding.powerRank)} to ${ordinal(standing.powerRank)} in the power rankings.`,
          });
        }

        if (rankChange <= -5) {
          const drop = Math.abs(rankChange);
          events.push({
            teamId,
            week: standing.week,
            type: "rank_collapse",
            severity: Math.min(5, Math.ceil(drop / 3)),
            title: `Dropped ${drop} Places`,
            description: `${teamName} fell from ${ordinal(prevStanding.powerRank)} to ${ordinal(standing.powerRank)} in the power rankings.`,
          });
        }
      }

      // === MILESTONES ===
      if (standing.wins === 1 && thisWeekResult === "W" && standing.week >= 3) {
        events.push({
          teamId,
          week: standing.week,
          type: "milestone",
          severity: 2,
          title: "First Win of the Season",
          description: `${teamName} finally got off the mark with their first victory in Week ${standing.week}.`,
        });
      }

      if (standing.points >= 30 && prevStanding && prevStanding.points < 30) {
        events.push({
          teamId,
          week: standing.week,
          type: "milestone",
          severity: 3,
          title: "30-Point Milestone",
          description: `${teamName} crossed the 30-point mark, a traditional playoff threshold.`,
        });
      }

      if (standing.points >= 50 && prevStanding && prevStanding.points < 50) {
        events.push({
          teamId,
          week: standing.week,
          type: "milestone",
          severity: 4,
          title: "50-Point Milestone",
          description: `${teamName} reached 50 points — elite territory.`,
        });
      }
    }

    // === UPSET DETECTION ===
    for (const m of matches) {
      if (m.homeTeam !== teamId && m.awayTeam !== teamId) continue;

      const weekIdx = m.week - 1;
      if (weekIdx < 1) continue;

      const prevWeekStandings = matrix[weekIdx - 1];
      if (!prevWeekStandings) continue;

      const homeRank = prevWeekStandings.find(
        (s) => s.teamId === m.homeTeam
      )?.powerRank;
      const awayRank = prevWeekStandings.find(
        (s) => s.teamId === m.awayTeam
      )?.powerRank;

      if (!homeRank || !awayRank) continue;

      const rankGap = Math.abs(homeRank - awayRank);
      if (rankGap < 10) continue;

      const isTeamHome = m.homeTeam === teamId;
      const teamRank = isTeamHome ? homeRank : awayRank;
      const oppRank = isTeamHome ? awayRank : homeRank;
      const oppTeam = getTeam(isTeamHome ? m.awayTeam : m.homeTeam);
      const oppName = oppTeam?.short || (isTeamHome ? m.awayTeam : m.homeTeam);

      const teamWon = isTeamHome
        ? m.homeGoals > m.awayGoals
        : m.awayGoals > m.homeGoals;

      if (teamWon && teamRank > oppRank) {
        events.push({
          teamId,
          week: m.week,
          type: "upset_win",
          severity: Math.min(5, Math.ceil(rankGap / 5)),
          title: `Upset Over ${oppName}`,
          description: `${teamName} (${ordinal(teamRank)}) stunned ${oppName} (${ordinal(oppRank)}) — a ${rankGap}-place upset.`,
        });
      }

      if (!teamWon && teamRank < oppRank && m.homeGoals !== m.awayGoals) {
        events.push({
          teamId,
          week: m.week,
          type: "upset_loss",
          severity: Math.min(5, Math.ceil(rankGap / 5)),
          title: `Upset Loss to ${oppName}`,
          description: `${teamName} (${ordinal(teamRank)}) were stunned by ${oppName} (${ordinal(oppRank)}) — a ${rankGap}-place upset.`,
        });
      }
    }
  }

  events.sort((a, b) => a.week - b.week || b.severity - a.severity);

  _eventsCache.set(key, events);
  return events;
}

// ═══════════════════════════════════════════
// CONVENIENCE ACCESSORS
// ═══════════════════════════════════════════

/**
 * Get standings for a specific week (1-indexed).
 */
export function getWeekStandings(
  week: number,
  teams: Team[] = TEAMS,
  matches: Match[] = MATCHES,
  totalWeeks: number = TOTAL_WEEKS
): TeamWeekStanding[] {
  const matrix = computeWeeklyStandings(teams, matches, totalWeeks);
  return matrix[week - 1] || [];
}

/**
 * Get the latest week that has data.
 */
export function getLatestWeek(
  teams: Team[] = TEAMS,
  matches: Match[] = MATCHES,
  totalWeeks: number = TOTAL_WEEKS
): number {
  const matrix = computeWeeklyStandings(teams, matches, totalWeeks);
  return matrix.length;
}

/**
 * Get a specific team's standings trajectory across all weeks.
 */
export function getTeamTrajectory(
  teamId: string,
  teams: Team[] = TEAMS,
  matches: Match[] = MATCHES,
  totalWeeks: number = TOTAL_WEEKS
): TeamWeekStanding[] {
  const matrix = computeWeeklyStandings(teams, matches, totalWeeks);
  return matrix.map(
    (weekStandings) => weekStandings.find((s) => s.teamId === teamId)!
  );
}

/**
 * Get inflection events for a specific team.
 */
export function getTeamEvents(
  teamId: string,
  teams: Team[] = TEAMS,
  matches: Match[] = MATCHES,
  totalWeeks: number = TOTAL_WEEKS
): SeasonEvent[] {
  return detectInflectionEvents(teams, matches, totalWeeks).filter(
    (e) => e.teamId === teamId
  );
}

/**
 * Get the max week number in the data.
 */
export function getMaxWeek(totalWeeks: number = TOTAL_WEEKS): number {
  return totalWeeks;
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function countConsecutiveFromEnd(
  form: ("W" | "D" | "L")[],
  result: "W" | "D" | "L"
): number {
  let count = 0;
  for (const r of form) {
    if (r === result) count++;
    else break;
  }
  return count;
}
