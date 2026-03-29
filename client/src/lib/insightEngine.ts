/**
 * insightEngine.ts — MLS Dashboard Insight Engine
 *
 * Pure TypeScript analysis functions that compute narrative headlines
 * and insight cards from the dashboard data. No external dependencies.
 *
 * Each function takes filtered data and returns structured insight objects
 * that the UI components render. All computations are memoizable.
 */

import type { Player, Match, Team, TeamBudget } from "./mlsData";
import { TEAMS, getTeam } from "./mlsData";

// ─── Module-level season data injection ───
// Components set these via setInsightEngineSeasonData() so that
// internal helpers can access season-scoped matches and budgets
// without changing every public function signature.
let _MATCHES: Match[] = [];
let _TEAM_BUDGETS: Record<string, TeamBudget> = {};

export function setInsightEngineSeasonData(
  matches: Match[],
  teamBudgets: Record<string, TeamBudget>
): void {
  _MATCHES = matches;
  _TEAM_BUDGETS = teamBudgets;
}
import { linearRegression } from "./chartUtils";
import type { TeamWeekStanding, SeasonEvent } from "./seasonPulse";
import { getTeamTrajectory, getTeamEvents } from "./seasonPulse";
import type { SeasonYear } from "./seasonDataLoader";

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export interface Insight {
  icon:
    | "trending-up"
    | "trending-down"
    | "alert"
    | "star"
    | "zap"
    | "target"
    | "dollar"
    | "users"
    | "bar-chart";
  headline: string;
  detail: string;
  accentColor: "cyan" | "amber" | "emerald" | "coral";
}

export interface OutlierPoint {
  name: string;
  team: string;
  teamId: string;
  xVal: number;
  yVal: number;
  residual: number;
  direction: "over" | "under";
}

// ═══════════════════════════════════════════
// UTILITY HELPERS
// ═══════════════════════════════════════════

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString("en-US", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });
}

function fmtSalary(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(0)}%`;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  const variance =
    arr.reduce((s, v) => s + (v - mean) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

// ═══════════════════════════════════════════
// PLAYER STATS INSIGHTS
// ═══════════════════════════════════════════

/**
 * Compute a dynamic headline for the Player Stats scatter plot
 * based on the current X/Y axis selection and filtered data.
 */
export function playerStatsHeadline(
  players: Player[],
  xAxis: string,
  yAxis: string
): string {
  const active = players.filter(p => p.minutes > 200);
  if (active.length < 5) return "Select more players to reveal patterns";

  const pts = active
    .map(p => ({
      x: (p as any)[xAxis] as number,
      y: (p as any)[yAxis] as number,
      name: p.name,
      salary: p.salary,
      team: p.team,
      position: p.position,
    }))
    .filter(d => d.x != null && d.y != null && isFinite(d.x) && isFinite(d.y));

  if (pts.length < 5) return "Not enough data for the selected axes";

  const reg = linearRegression(pts.map(d => ({ x: d.x, y: d.y })));

  // Compute residuals and find top outliers
  const withResiduals = pts.map(d => ({
    ...d,
    predicted: reg.slope * d.x + reg.intercept,
    residual: d.y - (reg.slope * d.x + reg.intercept),
  }));

  const overperformers = [...withResiduals].sort(
    (a, b) => b.residual - a.residual
  );
  const underperformers = [...withResiduals].sort(
    (a, b) => a.residual - b.residual
  );

  const xLabel = getAxisLabel(xAxis);
  const yLabel = getAxisLabel(yAxis);

  // Special case: Salary vs Goals — the "value" narrative
  if (
    (xAxis === "salary" && yAxis === "goals") ||
    (xAxis === "goals" && yAxis === "salary")
  ) {
    const scorers = active.filter(p => p.goals > 0 && p.salary > 0);
    if (scorers.length > 3) {
      const costPerGoal = scorers.map(p => ({
        name: p.name,
        team: getTeam(p.team)?.short || p.team,
        cpg: p.salary / p.goals,
        goals: p.goals,
        salary: p.salary,
      }));
      const bestValue = [...costPerGoal].sort((a, b) => a.cpg - b.cpg)[0];
      const worstValue = [...costPerGoal].sort((a, b) => b.cpg - a.cpg)[0];
      return `${bestValue.name} (${bestValue.team}) scored ${bestValue.goals} goals at ${fmtSalary(bestValue.cpg)}/goal — the league's best value. ${worstValue.name} cost ${fmtSalary(worstValue.cpg)} per goal.`;
    }
  }

  // Special case: Shots vs Goals — the "efficiency" narrative
  if (xAxis === "shots" && yAxis === "goals") {
    const shooters = active.filter(p => p.shots >= 10);
    if (shooters.length > 3) {
      const convRate = shooters.map(p => ({
        name: p.name,
        team: getTeam(p.team)?.short || p.team,
        rate: p.goals / p.shots,
        goals: p.goals,
        shots: p.shots,
      }));
      const avgRate =
        convRate.reduce((s, p) => s + p.rate, 0) / convRate.length;
      const best = [...convRate].sort((a, b) => b.rate - a.rate)[0];
      const topOutlier = overperformers[0];
      return `${best.name} (${best.team}) converts ${(best.rate * 100).toFixed(0)}% of shots — ${(best.rate / avgRate).toFixed(1)}x the league average. ${topOutlier.name} scores ${Math.abs(topOutlier.residual).toFixed(1)} more goals than expected for their shot volume.`;
    }
  }

  // Special case: Age vs Goals — the "peak age" narrative
  if (xAxis === "age" && yAxis === "goals") {
    const scorers = active.filter(p => p.goals > 0);
    const byAge: Record<number, number[]> = {};
    scorers.forEach(p => {
      if (!byAge[p.age]) byAge[p.age] = [];
      byAge[p.age].push(p.goals);
    });
    const ageAvgs = Object.entries(byAge)
      .filter(([, goals]) => goals.length >= 3)
      .map(([age, goals]) => ({
        age: +age,
        avg: goals.reduce((s, g) => s + g, 0) / goals.length,
      }))
      .sort((a, b) => b.avg - a.avg);
    if (ageAvgs.length >= 3) {
      const peakAge = ageAvgs[0].age;
      return `Goal scoring peaks at age ${peakAge} in MLS. ${overperformers[0].name} scores ${Math.abs(overperformers[0].residual).toFixed(1)} more goals than expected for their age.`;
    }
  }

  // Special case: Minutes vs Salary — the "availability premium" narrative
  if (
    (xAxis === "minutes" && yAxis === "salary") ||
    (xAxis === "salary" && yAxis === "minutes")
  ) {
    const highPaid = active.filter(p => p.salary >= 1_000_000);
    const lowMinHigh = highPaid.filter(p => p.minutes < 1000);
    if (lowMinHigh.length > 0) {
      const worst = [...lowMinHigh].sort((a, b) => b.salary - a.salary)[0];
      return `${lowMinHigh.length} players earning $1M+ played fewer than 1,000 minutes. ${worst.name} (${fmtSalary(worst.salary)}) logged just ${fmt(worst.minutes)} minutes — ${fmtSalary(worst.salary / Math.max(1, worst.minutes))} per minute played.`;
    }
  }

  // Generic headline based on R² strength
  if (reg.r2 >= 0.5) {
    return `Strong relationship detected: more ${xLabel.toLowerCase()} strongly predicts more ${yLabel.toLowerCase()} (R² = ${reg.r2.toFixed(2)}). ${overperformers[0].name} leads the overperformers.`;
  } else if (reg.r2 >= 0.2) {
    return `Moderate link between ${xLabel.toLowerCase()} and ${yLabel.toLowerCase()} (R² = ${reg.r2.toFixed(2)}). ${overperformers[0].name} outperforms the trend while ${underperformers[0].name} underperforms.`;
  } else {
    return `Weak correlation between ${xLabel.toLowerCase()} and ${yLabel.toLowerCase()} (R² = ${reg.r2.toFixed(2)}) — other factors matter more. ${overperformers[0].name} is the standout outlier.`;
  }
}

/**
 * Compute insight cards for the Player Stats tab
 */
export function playerStatsInsights(players: Player[]): Insight[] {
  const active = players.filter(p => p.minutes > 200);
  if (active.length < 10) return [];

  const insights: Insight[] = [];

  // 1. Value efficiency: best goals per dollar
  const scorers = active.filter(p => p.goals >= 3 && p.salary > 0);
  if (scorers.length > 3) {
    const costPerGoal = scorers
      .map(p => ({ ...p, cpg: p.salary / p.goals }))
      .sort((a, b) => a.cpg - b.cpg);
    const best = costPerGoal[0];
    const worst = costPerGoal[costPerGoal.length - 1];
    const bestTeam = getTeam(best.team)?.short || best.team;
    const worstTeam = getTeam(worst.team)?.short || worst.team;
    insights.push({
      icon: "dollar",
      headline: `${best.name} is the league's best goal bargain at ${fmtSalary(best.cpg)}/goal`,
      detail: `${best.name} (${bestTeam}, ${fmtSalary(best.salary)}) scored ${best.goals} goals. Meanwhile, ${worst.name} (${worstTeam}) cost ${fmtSalary(worst.cpg)} per goal — a ${(worst.cpg / best.cpg).toFixed(0)}x premium for ${worst.goals} goals.`,
      accentColor: "emerald",
    });
  }

  // 2. Position efficiency gap
  const byPosition: Record<
    string,
    { goals: number; salary: number; count: number }
  > = {};
  active.forEach(p => {
    if (!byPosition[p.position])
      byPosition[p.position] = { goals: 0, salary: 0, count: 0 };
    byPosition[p.position].goals += p.goals;
    byPosition[p.position].salary += p.salary;
    byPosition[p.position].count++;
  });
  const posData = Object.entries(byPosition).map(([pos, d]) => ({
    pos,
    goalsPerPlayer: d.goals / d.count,
    avgSalary: d.salary / d.count,
    totalGoals: d.goals,
  }));
  const fwData = posData.find(p => p.pos === "FW");
  const mfData = posData.find(p => p.pos === "MF");
  if (fwData && mfData && mfData.totalGoals > 0) {
    const fwShare =
      (fwData.totalGoals / active.reduce((s, p) => s + p.goals, 0)) * 100;
    insights.push({
      icon: "target",
      headline: `Forwards score ${fwData.goalsPerPlayer.toFixed(1)} goals/player — ${(fwData.goalsPerPlayer / mfData.goalsPerPlayer).toFixed(1)}x the midfield rate`,
      detail: `Forwards account for ${fwShare.toFixed(0)}% of all goals despite being ${((active.filter(p => p.position === "FW").length / active.length) * 100).toFixed(0)}% of the active roster. Their average salary is ${fmtSalary(fwData.avgSalary)} vs ${fmtSalary(mfData.avgSalary)} for midfielders.`,
      accentColor: "cyan",
    });
  }

  // 3. Discipline outlier
  const cardedPlayers = active.filter(p => p.yellowCards > 0);
  if (cardedPlayers.length > 10) {
    const avgCards =
      cardedPlayers.reduce((s, p) => s + p.yellowCards, 0) /
      cardedPlayers.length;
    const mostCarded = [...cardedPlayers].sort(
      (a, b) => b.yellowCards - a.yellowCards
    )[0];
    const mostCardedTeam = getTeam(mostCarded.team)?.short || mostCarded.team;
    const dfCards = cardedPlayers.filter(p => p.position === "DF");
    const mfCards = cardedPlayers.filter(p => p.position === "MF");
    const dfAvg =
      dfCards.length > 0
        ? dfCards.reduce((s, p) => s + p.yellowCards, 0) / dfCards.length
        : 0;
    const mfAvg =
      mfCards.length > 0
        ? mfCards.reduce((s, p) => s + p.yellowCards, 0) / mfCards.length
        : 0;
    const moreCardedPos = dfAvg > mfAvg ? "Defenders" : "Midfielders";
    const higherAvg = Math.max(dfAvg, mfAvg);
    insights.push({
      icon: "alert",
      headline: `${mostCarded.name} (${mostCardedTeam}) leads the league with ${mostCarded.yellowCards} yellow cards`,
      detail: `The league average is ${avgCards.toFixed(1)} yellows per carded player. ${moreCardedPos} average ${higherAvg.toFixed(1)} cards — the most disciplined position is ${
        posData
          .sort((a, b) => a.pos.localeCompare(b.pos))
          .map(p => p.pos)
          .find(pos => {
            const posCards = cardedPlayers.filter(pl => pl.position === pos);
            return (
              posCards.length > 0 &&
              posCards.reduce((s, pl) => s + pl.yellowCards, 0) /
                posCards.length ===
                Math.min(dfAvg, mfAvg)
            );
          }) || "GK"
      }.`,
      accentColor: "amber",
    });
  }

  // 4. Age vs output
  const youngStars = active.filter(p => p.age <= 23 && p.goals >= 5);
  const veterans = active.filter(p => p.age >= 30 && p.goals >= 5);
  if (youngStars.length > 0 && veterans.length > 0) {
    const bestYoung = [...youngStars].sort((a, b) => b.goals - a.goals)[0];
    const bestYoungTeam = getTeam(bestYoung.team)?.short || bestYoung.team;
    const youngAvgGoals =
      youngStars.reduce((s, p) => s + p.goals, 0) / youngStars.length;
    const vetAvgGoals =
      veterans.reduce((s, p) => s + p.goals, 0) / veterans.length;
    insights.push({
      icon: "star",
      headline: `${youngStars.length} players under 24 scored 5+ goals — led by ${bestYoung.name} (${bestYoungTeam}) with ${bestYoung.goals}`,
      detail: `Young scorers (≤23) average ${youngAvgGoals.toFixed(1)} goals vs ${vetAvgGoals.toFixed(1)} for veterans (30+). At ${fmtSalary(bestYoung.salary)}, ${bestYoung.name} earns ${((bestYoung.salary / Math.max(1, veterans.sort((a, b) => b.salary - a.salary)[0]?.salary || 1)) * 100).toFixed(0)}% of the top veteran's salary.`,
      accentColor: "cyan",
    });
  }

  return insights.slice(0, 4);
}

/**
 * Compute outlier points for the scatter plot annotations
 */
export function computeOutliers(
  scatterData: {
    name: string;
    xVal: number;
    yVal: number;
    team: string;
    teamId: string;
    position: string;
  }[],
  regression: { slope: number; intercept: number; r2: number },
  count: number = 2
): OutlierPoint[] {
  if (scatterData.length < 5 || regression.r2 < 0.01) return [];

  const withResiduals = scatterData
    .filter(d => isFinite(d.xVal) && isFinite(d.yVal))
    .map(d => ({
      ...d,
      residual: d.yVal - (regression.slope * d.xVal + regression.intercept),
    }));

  // Standard deviation of residuals for significance threshold
  const residuals = withResiduals.map(d => d.residual);
  const sd = stdDev(residuals);
  if (sd === 0) return [];

  // Only label points that are at least 1 standard deviation from the line
  const significant = withResiduals.filter(
    d => Math.abs(d.residual) >= sd * 0.8
  );
  if (significant.length === 0) return [];

  const overperformers = [...significant]
    .filter(d => d.residual > 0)
    .sort((a, b) => b.residual - a.residual)
    .slice(0, count)
    .map(d => ({ ...d, direction: "over" as const }));

  const underperformers = [...significant]
    .filter(d => d.residual < 0)
    .sort((a, b) => a.residual - b.residual)
    .slice(0, count)
    .map(d => ({ ...d, direction: "under" as const }));

  return [...overperformers, ...underperformers];
}

// ═══════════════════════════════════════════
// TEAM BUDGET INSIGHTS
// ═══════════════════════════════════════════

/**
 * Compute a dynamic headline for the Team Budget tab
 */
export function teamBudgetHeadline(teams: Team[], players: Player[]): string {
  if (teams.length === 0) return "No teams selected";

  const teamStats = teams
    .map(t => {
      const budget = _TEAM_BUDGETS[t.id];
      const teamPlayers = players.filter(p => p.team === t.id);
      const totalGoals = teamPlayers.reduce((s, p) => s + p.goals, 0);
      const totalSalary = budget?.totalSalary || 0;
      const costPerGoal = totalGoals > 0 ? totalSalary / totalGoals : Infinity;
      return {
        team: t,
        budget,
        totalGoals,
        totalSalary,
        costPerGoal,
        playerCount: teamPlayers.length,
      };
    })
    .filter(t => t.totalSalary > 0);

  if (teamStats.length < 2) {
    const t = teamStats[0];
    if (!t) return "No budget data available";
    const dpPct = t.budget
      ? (t.budget.dpSalary / t.budget.totalSalary) * 100
      : 0;
    return `${t.team.short} spends ${fmtSalary(t.totalSalary)} total — ${fmtPct(dpPct)} on Designated Players, producing ${t.totalGoals} goals.`;
  }

  const bestROI = [...teamStats]
    .filter(t => t.costPerGoal < Infinity)
    .sort((a, b) => a.costPerGoal - b.costPerGoal)[0];
  const worstROI = [...teamStats]
    .filter(t => t.costPerGoal < Infinity)
    .sort((a, b) => b.costPerGoal - a.costPerGoal)[0];

  if (bestROI && worstROI && bestROI.team.id !== worstROI.team.id) {
    return `${bestROI.team.short} gets a goal every ${fmtSalary(bestROI.costPerGoal)} — the best ROI in the league. ${worstROI.team.short} spends ${fmtSalary(worstROI.costPerGoal)} per goal, a ${(worstROI.costPerGoal / bestROI.costPerGoal).toFixed(1)}x premium.`;
  }

  const highest = [...teamStats].sort(
    (a, b) => b.totalSalary - a.totalSalary
  )[0];
  const lowest = [...teamStats].sort(
    (a, b) => a.totalSalary - b.totalSalary
  )[0];
  return `${highest.team.short} leads spending at ${fmtSalary(highest.totalSalary)} — ${(highest.totalSalary / lowest.totalSalary).toFixed(1)}x more than ${lowest.team.short} (${fmtSalary(lowest.totalSalary)}).`;
}

/**
 * Compute insight cards for the Team Budget tab
 */
export function teamBudgetInsights(
  teams: Team[],
  players: Player[]
): Insight[] {
  if (teams.length < 2) return [];
  const insights: Insight[] = [];

  // 1. DP efficiency analysis
  const dpPlayers = players.filter(
    p => p.salary >= 1_500_000 && p.minutes > 200
  );
  const nonDpScorers = players.filter(
    p => p.salary < 1_500_000 && p.salary > 0 && p.goals >= 3 && p.minutes > 200
  );
  if (dpPlayers.length > 3 && nonDpScorers.length > 3) {
    const dpGoals = dpPlayers.reduce((s, p) => s + p.goals, 0);
    const dpSalary = dpPlayers.reduce((s, p) => s + p.salary, 0);
    const totalGoals = players
      .filter(p => p.minutes > 200)
      .reduce((s, p) => s + p.goals, 0);
    const totalSalary = players
      .filter(p => p.salary > 0)
      .reduce((s, p) => s + p.salary, 0);
    const dpGoalShare = totalGoals > 0 ? (dpGoals / totalGoals) * 100 : 0;
    const dpSalaryShare = totalSalary > 0 ? (dpSalary / totalSalary) * 100 : 0;
    insights.push({
      icon: "dollar",
      headline: `High earners ($1.5M+) score ${dpGoalShare.toFixed(0)}% of goals but consume ${dpSalaryShare.toFixed(0)}% of salary`,
      detail: `${dpPlayers.length} players earning $1.5M+ produced ${dpGoals} goals at ${fmtSalary(dpSalary / Math.max(1, dpGoals))}/goal. The ${nonDpScorers.length} best-value scorers (under $1.5M, 3+ goals) average ${fmtSalary(nonDpScorers.reduce((s, p) => s + p.salary, 0) / nonDpScorers.length)} and ${(nonDpScorers.reduce((s, p) => s + p.goals, 0) / nonDpScorers.length).toFixed(1)} goals each.`,
      accentColor: "amber",
    });
  }

  // 2. Conference spending gap
  const eastTeams = teams.filter(t => t.conference === "Eastern");
  const westTeams = teams.filter(t => t.conference === "Western");
  if (eastTeams.length > 2 && westTeams.length > 2) {
    const eastAvg =
      eastTeams.reduce(
        (s, t) => s + (_TEAM_BUDGETS[t.id]?.totalSalary || 0),
        0
      ) / eastTeams.length;
    const westAvg =
      westTeams.reduce(
        (s, t) => s + (_TEAM_BUDGETS[t.id]?.totalSalary || 0),
        0
      ) / westTeams.length;
    const eastGoals = eastTeams.reduce(
      (s, t) =>
        s +
        players.filter(p => p.team === t.id).reduce((gs, p) => gs + p.goals, 0),
      0
    );
    const westGoals = westTeams.reduce(
      (s, t) =>
        s +
        players.filter(p => p.team === t.id).reduce((gs, p) => gs + p.goals, 0),
      0
    );
    const higherConf = eastAvg > westAvg ? "Eastern" : "Western";
    const lowerConf = eastAvg > westAvg ? "Western" : "Eastern";
    const gap = Math.abs(eastAvg - westAvg);
    const moreGoalsConf =
      eastGoals / eastTeams.length > westGoals / westTeams.length
        ? "Eastern"
        : "Western";
    insights.push({
      icon: "bar-chart",
      headline: `${higherConf} Conference spends ${fmtSalary(gap)} more per team than the ${lowerConf}`,
      detail: `${higherConf} teams average ${fmtSalary(Math.max(eastAvg, westAvg))} vs ${fmtSalary(Math.min(eastAvg, westAvg))} in the ${lowerConf}. ${moreGoalsConf === higherConf ? "The bigger spenders also score more" : `But the ${moreGoalsConf} Conference scores more goals per team despite spending less`}.`,
      accentColor: "cyan",
    });
  }

  // 3. Roster construction diversity
  const teamDpShares = teams
    .map(t => {
      const b = _TEAM_BUDGETS[t.id];
      if (!b || b.totalSalary === 0) return null;
      return {
        team: t,
        dpShare: (b.dpSalary / b.totalSalary) * 100,
        total: b.totalSalary,
      };
    })
    .filter(Boolean) as { team: Team; dpShare: number; total: number }[];

  if (teamDpShares.length > 5) {
    const mostDpHeavy = [...teamDpShares].sort(
      (a, b) => b.dpShare - a.dpShare
    )[0];
    const leastDpHeavy = [...teamDpShares].sort(
      (a, b) => a.dpShare - b.dpShare
    )[0];
    insights.push({
      icon: "users",
      headline: `${mostDpHeavy.team.short} puts ${mostDpHeavy.dpShare.toFixed(0)}% of salary into DPs — ${leastDpHeavy.team.short} only ${leastDpHeavy.dpShare.toFixed(0)}%`,
      detail: `Roster construction varies dramatically. ${mostDpHeavy.team.short} bets on star power while ${leastDpHeavy.team.short} distributes salary more evenly. The league average DP share is ${(teamDpShares.reduce((s, t) => s + t.dpShare, 0) / teamDpShares.length).toFixed(0)}%.`,
      accentColor: "emerald",
    });
  }

  // 4. Biggest salary-to-output mismatch
  const teamEfficiency = teams
    .map(t => {
      const budget = _TEAM_BUDGETS[t.id];
      const teamPlayers = players.filter(
        p => p.team === t.id && p.minutes > 200
      );
      const goals = teamPlayers.reduce((s, p) => s + p.goals, 0);
      const assists = teamPlayers.reduce((s, p) => s + p.assists, 0);
      return {
        team: t,
        salary: budget?.totalSalary || 0,
        goals,
        assists,
        contributions: goals + assists,
      };
    })
    .filter(t => t.salary > 0 && t.contributions > 0);

  if (teamEfficiency.length > 5) {
    const avgCostPerContrib =
      teamEfficiency.reduce((s, t) => s + t.salary / t.contributions, 0) /
      teamEfficiency.length;
    const mostEfficient = [...teamEfficiency].sort(
      (a, b) => a.salary / a.contributions - b.salary / b.contributions
    )[0];
    const leastEfficient = [...teamEfficiency].sort(
      (a, b) => b.salary / b.contributions - a.salary / a.contributions
    )[0];
    insights.push({
      icon: "zap",
      headline: `${mostEfficient.team.short} produces a goal contribution every ${fmtSalary(mostEfficient.salary / mostEfficient.contributions)}`,
      detail: `That's ${(avgCostPerContrib / (mostEfficient.salary / mostEfficient.contributions)).toFixed(1)}x more efficient than the league average (${fmtSalary(avgCostPerContrib)}/contribution). ${leastEfficient.team.short} is the least efficient at ${fmtSalary(leastEfficient.salary / leastEfficient.contributions)} per goal contribution.`,
      accentColor: "emerald",
    });
  }

  return insights.slice(0, 4);
}

// ═══════════════════════════════════════════
// ATTENDANCE INSIGHTS
// ═══════════════════════════════════════════

const STADIUM_CAPACITY: Record<string, number> = {
  ATL: 71000,
  ATX: 20738,
  MTL: 19619,
  CLT: 75000,
  CHI: 61500,
  COL: 18061,
  CLB: 20371,
  DC: 20000,
  CIN: 26000,
  DAL: 20500,
  HOU: 22039,
  MIA: 21550,
  LAG: 27000,
  LAFC: 22000,
  MIN: 19400,
  NSH: 30000,
  NE: 65878,
  NYRB: 25000,
  NYC: 28000,
  ORL: 25500,
  PHI: 18500,
  POR: 25218,
  RSL: 20213,
  SD: 35000,
  SEA: 37722,
  SJ: 18000,
  SKC: 18467,
  STL: 22500,
  TOR: 30000,
  VAN: 22120,
};

/**
 * Compute a dynamic headline for the Attendance tab
 */
export function attendanceHeadline(matches: Match[], teams: Team[]): string {
  if (matches.length === 0 || teams.length === 0)
    return "No attendance data available";

  const homeData = teams
    .map(t => {
      const homeMatches = matches.filter(
        m => m.homeTeam === t.id && m.attendance > 0
      );
      const avg =
        homeMatches.length > 0
          ? homeMatches.reduce((s, m) => s + m.attendance, 0) /
            homeMatches.length
          : 0;
      const cap = STADIUM_CAPACITY[t.id] || 0;
      const fillRate = cap > 0 ? avg / cap : 0;
      return { team: t, avg, cap, fillRate, matchCount: homeMatches.length };
    })
    .filter(t => t.avg > 0);

  if (homeData.length < 2) {
    const t = homeData[0];
    if (!t) return "No attendance data available";
    return `${t.team.short} averages ${fmt(t.avg)} fans per home game (${fmtPct(t.fillRate * 100)} capacity).`;
  }

  const medianAtt = median(homeData.map(t => t.avg));
  const highest = [...homeData].sort((a, b) => b.avg - a.avg)[0];
  const lowest = [...homeData].sort((a, b) => a.avg - b.avg)[0];
  const underFilled = homeData.filter(t => t.fillRate < 0.8 && t.cap > 0);

  if (underFilled.length > 0) {
    return `${highest.team.short} leads with ${fmt(highest.avg)} avg fans — nearly ${(highest.avg / medianAtt).toFixed(1)}x the league median. ${underFilled.length} team${underFilled.length > 1 ? "s" : ""} fail${underFilled.length === 1 ? "s" : ""} to fill 80% of capacity.`;
  }

  return `${highest.team.short} draws ${fmt(highest.avg)} fans per game — ${(highest.avg / lowest.avg).toFixed(1)}x more than ${lowest.team.short} (${fmt(lowest.avg)}). The league median is ${fmt(medianAtt)}.`;
}

/**
 * Compute insight cards for the Attendance tab
 */
export function attendanceInsights(matches: Match[], teams: Team[]): Insight[] {
  if (matches.length < 10 || teams.length < 2) return [];
  const insights: Insight[] = [];

  // 1. Gravitational pull — the "Messi effect"
  const homeAvgs: Record<string, number> = {};
  TEAMS.forEach(t => {
    const hm = _MATCHES.filter(m => m.homeTeam === t.id && m.attendance > 0);
    homeAvgs[t.id] =
      hm.length > 0 ? hm.reduce((s, m) => s + m.attendance, 0) / hm.length : 0;
  });

  const pullData = teams
    .map(t => {
      const awayGames = _MATCHES.filter(
        m => m.awayTeam === t.id && m.attendance > 0
      );
      let totalDelta = 0,
        matchCount = 0;
      awayGames.forEach(m => {
        const homeAvg = homeAvgs[m.homeTeam] || 0;
        if (homeAvg > 0) {
          totalDelta += m.attendance - homeAvg;
          matchCount++;
        }
      });
      return {
        team: t,
        totalDelta,
        avgDelta: matchCount > 0 ? totalDelta / matchCount : 0,
        matchCount,
      };
    })
    .sort((a, b) => b.totalDelta - a.totalDelta);

  if (pullData.length > 3) {
    const topPull = pullData[0];
    const secondPull = pullData[1];
    if (topPull.totalDelta > 0) {
      const ratio =
        secondPull.totalDelta > 0
          ? topPull.totalDelta / secondPull.totalDelta
          : 0;
      insights.push({
        icon: "star",
        headline: `${topPull.team.short} generates ${fmt(topPull.totalDelta)} more fans on the road than expected`,
        detail:
          ratio > 1.5
            ? `That's ${ratio.toFixed(1)}x more pull than the next team (${secondPull.team.short}). When ${topPull.team.short} visits, stadiums average ${fmt(topPull.avgDelta)} extra fans above the home team's normal draw.`
            : `${topPull.team.short} averages ${fmt(topPull.avgDelta)} extra fans per away game. ${secondPull.team.short} is close behind with ${fmt(secondPull.totalDelta)} total extra fans.`,
        accentColor: "cyan",
      });
    }
  }

  // 2. Fill rate analysis
  const fillData = teams
    .map(t => {
      const homeMatches = matches.filter(
        m => m.homeTeam === t.id && m.attendance > 0
      );
      const avg =
        homeMatches.length > 0
          ? homeMatches.reduce((s, m) => s + m.attendance, 0) /
            homeMatches.length
          : 0;
      const cap = STADIUM_CAPACITY[t.id] || 0;
      return { team: t, avg, cap, fillRate: cap > 0 ? avg / cap : 0 };
    })
    .filter(t => t.cap > 0);

  const overCapacity = fillData.filter(t => t.fillRate > 0.95);
  const underCapacity = fillData.filter(t => t.fillRate < 0.7);
  if (overCapacity.length > 0 || underCapacity.length > 0) {
    const bestFill = [...fillData].sort((a, b) => b.fillRate - a.fillRate)[0];
    insights.push({
      icon: "trending-up",
      headline: `${overCapacity.length} team${overCapacity.length !== 1 ? "s" : ""} regularly exceed${overCapacity.length === 1 ? "s" : ""} 95% capacity`,
      detail: `${bestFill.team.short} leads at ${fmtPct(bestFill.fillRate * 100)} fill rate (${fmt(bestFill.avg)} in a ${fmt(bestFill.cap)}-seat venue). ${underCapacity.length > 0 ? `${underCapacity.length} team${underCapacity.length > 1 ? "s" : ""} fill less than 70% — the biggest gap is ${[...underCapacity].sort((a, b) => a.fillRate - b.fillRate)[0].team.short} at ${fmtPct([...underCapacity].sort((a, b) => a.fillRate - b.fillRate)[0].fillRate * 100)}.` : "Every other team fills at least 70%."}`,
      accentColor: "emerald",
    });
  }

  // 3. Attendance volatility
  const volatility = teams
    .map(t => {
      const homeMatches = matches.filter(
        m => m.homeTeam === t.id && m.attendance > 0
      );
      if (homeMatches.length < 3) return null;
      const atts = homeMatches.map(m => m.attendance);
      const avg = atts.reduce((s, a) => s + a, 0) / atts.length;
      const sd = stdDev(atts);
      return { team: t, avg, sd, cv: avg > 0 ? sd / avg : 0 };
    })
    .filter(Boolean) as { team: Team; avg: number; sd: number; cv: number }[];

  if (volatility.length > 5) {
    const mostVolatile = [...volatility].sort((a, b) => b.cv - a.cv)[0];
    const mostConsistent = [...volatility].sort((a, b) => a.cv - b.cv)[0];
    insights.push({
      icon: "bar-chart",
      headline: `${mostVolatile.team.short} has the most volatile attendance (±${fmt(mostVolatile.sd)} per game)`,
      detail: `Their coefficient of variation is ${(mostVolatile.cv * 100).toFixed(1)}% — meaning attendance swings wildly game to game. ${mostConsistent.team.short} is the most consistent at just ±${fmt(mostConsistent.sd)} (${(mostConsistent.cv * 100).toFixed(1)}% CV).`,
      accentColor: "amber",
    });
  }

  // 4. Weekend vs weekday effect
  const weekdayMatches = matches.filter(m => {
    const d = new Date(m.date).getDay();
    return d >= 1 && d <= 4 && m.attendance > 0;
  });
  const weekendMatches = matches.filter(m => {
    const d = new Date(m.date).getDay();
    return (d === 0 || d === 5 || d === 6) && m.attendance > 0;
  });
  if (weekdayMatches.length > 10 && weekendMatches.length > 10) {
    const weekdayAvg =
      weekdayMatches.reduce((s, m) => s + m.attendance, 0) /
      weekdayMatches.length;
    const weekendAvg =
      weekendMatches.reduce((s, m) => s + m.attendance, 0) /
      weekendMatches.length;
    const diff = weekendAvg - weekdayAvg;
    const pctDiff = (diff / weekdayAvg) * 100;
    insights.push({
      icon: "trending-up",
      headline: `Weekend games draw ${fmt(Math.abs(diff))} ${diff > 0 ? "more" : "fewer"} fans than weekday matches`,
      detail: `Weekend/Friday average: ${fmt(weekendAvg)}. Weekday average: ${fmt(weekdayAvg)}. That's a ${Math.abs(pctDiff).toFixed(1)}% ${diff > 0 ? "boost" : "drop"} — equivalent to ${Math.abs(Math.round(diff * weekdayMatches.length))} total fans across ${weekdayMatches.length} weekday games.`,
      accentColor: diff > 0 ? "emerald" : "coral",
    });
  }

  return insights.slice(0, 4);
}

/**
 * Compute a two-sentence headline for the Gravitational Pull section.
 * Sentence 1: describes the top team's dominance (maps to ABSOLUTE view)
 * Sentence 2: describes mid-tier clustering (maps to COMPARE view)
 */
export function gravitationalPullHeadline(teams: Team[]): string {
  const homeAvgs: Record<string, number> = {};
  TEAMS.forEach(t => {
    const hm = _MATCHES.filter(m => m.homeTeam === t.id && m.attendance > 0);
    homeAvgs[t.id] =
      hm.length > 0 ? hm.reduce((s, m) => s + m.attendance, 0) / hm.length : 0;
  });

  const pullData = teams
    .map(t => {
      const awayGames = _MATCHES.filter(
        m => m.awayTeam === t.id && m.attendance > 0
      );
      let totalDelta = 0,
        matchCount = 0;
      awayGames.forEach(m => {
        const homeAvg = homeAvgs[m.homeTeam] || 0;
        if (homeAvg > 0) {
          totalDelta += m.attendance - homeAvg;
          matchCount++;
        }
      });
      return {
        team: t,
        totalDelta,
        avgDelta: matchCount > 0 ? totalDelta / matchCount : 0,
      };
    })
    .sort((a, b) => b.totalDelta - a.totalDelta);

  if (pullData.length < 3) return "Gravitational Pull";

  const top = pullData[0];
  const second = pullData[1];
  const ratio =
    second.totalDelta > 0
      ? (top.totalDelta / second.totalDelta).toFixed(1)
      : "—";

  // Sentence 1: dominance / ABSOLUTE perspective
  const s1 =
    top.totalDelta > 0
      ? `${top.team.short} generates +${fmt(top.totalDelta)} cumulative extra fans on the road — ${ratio}x the next-closest team (${second.team.short}).`
      : `No team dominates the road draw — ${top.team.short} leads with just ${fmt(top.totalDelta)}.`;

  // Sentence 2: mid-tier clustering / COMPARE perspective
  const positiveTeams = pullData.filter(t => t.totalDelta > 0);
  const negativeTeams = pullData.filter(t => t.totalDelta < 0);
  // Find the tightest cluster in the middle
  const midStart = Math.floor(pullData.length * 0.25);
  const midEnd = Math.floor(pullData.length * 0.75);
  const midSlice = pullData.slice(midStart, midEnd);
  const midRange =
    midSlice.length > 1
      ? Math.abs(
          midSlice[0].totalDelta - midSlice[midSlice.length - 1].totalDelta
        )
      : 0;

  const s2 =
    midRange < 30000 && midSlice.length > 3
      ? `The middle ${midSlice.length} teams are tightly clustered within ${fmt(midRange)} total fans — ${negativeTeams.length} teams actually suppress attendance when visiting.`
      : `${positiveTeams.length} teams boost away attendance while ${negativeTeams.length} suppress it — the gap between #2 ${second.team.short} and the bottom is ${fmt(Math.abs(second.totalDelta - pullData[pullData.length - 1].totalDelta))}.`;

  return `${s1} ${s2}`;
}

// ═══════════════════════════════════════════
// AXIS LABEL HELPER
// ═══════════════════════════════════════════

function getAxisLabel(key: string): string {
  const labels: Record<string, string> = {
    goals: "Goals",
    assists: "Assists",
    shots: "Shots",
    shotsOnTarget: "Shots on Target",
    shotAccuracy: "Shot Accuracy",
    minutes: "Minutes",
    games: "Games",
    age: "Age",
    salary: "Salary",
    tackles: "Tackles",
    interceptions: "Interceptions",
    fouls: "Fouls",
    fouled: "Times Fouled",
    yellowCards: "Yellow Cards",
    redCards: "Red Cards",
    crosses: "Crosses",
    offsides: "Offsides",
    starts: "Starts",
  };
  return labels[key] || key;
}

// ═══════════════════════════════════════════
// PER-CARD INSIGHTS (Card-level analysis)
// ═══════════════════════════════════════════

import type { CardInsightItem } from "@/components/CardInsight";

/**
 * Insights for the scatter plot card based on current axes and regression
 */
export function scatterCardInsights(
  players: Player[],
  xAxis: string,
  yAxis: string,
  r2: number
): CardInsightItem[] {
  const active = players.filter(p => p.minutes > 200);
  if (active.length < 10) return [];

  const items: CardInsightItem[] = [];
  const xLabel = getAxisLabel(xAxis).toLowerCase();
  const yLabel = getAxisLabel(yAxis).toLowerCase();

  // R² interpretation
  if (r2 >= 0.6) {
    items.push({
      text: `Strong predictive relationship (R² = ${r2.toFixed(2)}): ${xLabel} explains ${(r2 * 100).toFixed(0)}% of the variation in ${yLabel}. Points above the line outperform expectations.`,
      accent: "cyan",
    });
  } else if (r2 >= 0.3) {
    items.push({
      text: `Moderate relationship (R² = ${r2.toFixed(2)}): ${xLabel} partially predicts ${yLabel}, but other factors matter. Look for clusters and outliers.`,
      accent: "amber",
    });
  } else {
    items.push({
      text: `Weak correlation (R² = ${r2.toFixed(2)}): ${xLabel} and ${yLabel} are largely independent. Outliers here represent genuinely unusual players.`,
      accent: "coral",
    });
  }

  // Position clustering insight
  const byPos: Record<string, { xSum: number; ySum: number; count: number }> =
    {};
  active.forEach(p => {
    const x = (p as any)[xAxis] as number;
    const y = (p as any)[yAxis] as number;
    if (x == null || y == null || !isFinite(x) || !isFinite(y)) return;
    if (!byPos[p.position]) byPos[p.position] = { xSum: 0, ySum: 0, count: 0 };
    byPos[p.position].xSum += x;
    byPos[p.position].ySum += y;
    byPos[p.position].count++;
  });
  const posAvgs = Object.entries(byPos)
    .filter(([, d]) => d.count >= 5)
    .map(([pos, d]) => ({
      pos,
      xAvg: d.xSum / d.count,
      yAvg: d.ySum / d.count,
      count: d.count,
    }));

  if (posAvgs.length >= 2) {
    const sorted = [...posAvgs].sort((a, b) => b.yAvg - a.yAvg);
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];
    if (top.yAvg > bottom.yAvg * 1.5) {
      items.push({
        text: `Position gap: ${top.pos}s average ${top.yAvg.toFixed(1)} ${yLabel} vs ${bottom.pos}s at ${bottom.yAvg.toFixed(1)} — toggle to position colors to see the clustering.`,
        accent: "emerald",
      });
    }
  }

  // Data density note
  const totalPoints = active.filter(p => {
    const x = (p as any)[xAxis];
    const y = (p as any)[yAxis];
    return x != null && y != null && isFinite(x) && isFinite(y);
  }).length;
  items.push({
    text: `Showing ${totalPoints} players with 200+ minutes. ${active.length - totalPoints > 0 ? `${active.length - totalPoints} filtered out due to missing data.` : "All active players included."}`,
    accent: "cyan",
  });

  return items.slice(0, 3);
}

/**
 * Insights for the Top Scorers leaderboard card
 */
export function topScorersCardInsights(players: Player[]): CardInsightItem[] {
  const active = players.filter(p => p.minutes > 200);
  if (active.length < 10) return [];

  const items: CardInsightItem[] = [];
  const topScorers = [...active].sort((a, b) => b.goals - a.goals).slice(0, 10);

  // Team concentration
  const teamCounts: Record<string, number> = {};
  topScorers.forEach(p => {
    const team = getTeam(p.team)?.short || p.team;
    teamCounts[team] = (teamCounts[team] || 0) + 1;
  });
  const multiTeams = Object.entries(teamCounts).filter(([, c]) => c > 1);
  if (multiTeams.length > 0) {
    const [teamName, count] = multiTeams.sort((a, b) => b[1] - a[1])[0];
    items.push({
      text: `${teamName} places ${count} players in the top 10 — the most of any team. Concentrated firepower or balanced attack?`,
      accent: "cyan",
    });
  } else {
    items.push({
      text: `All 10 top scorers come from different teams — goal scoring is evenly distributed across the league.`,
      accent: "emerald",
    });
  }

  // Position breakdown
  const fwCount = topScorers.filter(p => p.position === "FW").length;
  const mfCount = topScorers.filter(p => p.position === "MF").length;
  if (mfCount >= 3) {
    items.push({
      text: `${mfCount} of the top 10 scorers are midfielders — suggesting MLS rewards attacking midfield play, not just strikers.`,
      accent: "amber",
    });
  } else if (fwCount >= 8) {
    items.push({
      text: `${fwCount} of 10 top scorers are forwards — traditional striker dominance in MLS goal scoring.`,
      accent: "amber",
    });
  }

  // Value comparison: cheapest vs most expensive in top 10
  const withSalary = topScorers.filter(p => p.salary > 0);
  if (withSalary.length >= 5) {
    const cheapest = [...withSalary].sort((a, b) => a.salary - b.salary)[0];
    const priciest = [...withSalary].sort((a, b) => b.salary - a.salary)[0];
    if (priciest.salary > cheapest.salary * 3) {
      items.push({
        text: `${cheapest.name} scores ${cheapest.goals} goals at ${fmtSalary(cheapest.salary)} — ${priciest.name} earns ${(priciest.salary / cheapest.salary).toFixed(0)}x more (${fmtSalary(priciest.salary)}) for ${priciest.goals} goals.`,
        accent: "emerald",
      });
    }
  }

  return items.slice(0, 3);
}

/**
 * Insights for a selected player's radar card — contextual comparison
 */
export function playerRadarCardInsights(
  player: Player,
  allPlayers: Player[]
): CardInsightItem[] {
  const items: CardInsightItem[] = [];
  const active = allPlayers.filter(p => p.minutes > 200);
  if (active.length < 10) return [];

  const team = getTeam(player.team)?.short || player.team;

  // Compare to position peers
  const posPeers = active.filter(p => p.position === player.position);
  if (posPeers.length >= 5) {
    const goalRank = posPeers.filter(p => p.goals > player.goals).length + 1;
    const assistRank =
      posPeers.filter(p => p.assists > player.assists).length + 1;
    const pctile = (1 - goalRank / posPeers.length) * 100;
    items.push({
      text: `Among ${posPeers.length} ${player.position}s: ranks #${goalRank} in goals and #${assistRank} in assists (${pctile.toFixed(0)}th percentile for goals).`,
      accent: pctile >= 75 ? "cyan" : pctile >= 50 ? "amber" : "coral",
    });
  }

  // Compare to age group
  const agePeers = active.filter(p => Math.abs(p.age - player.age) <= 2);
  if (agePeers.length >= 5) {
    const ageAvgGoals =
      agePeers.reduce((s, p) => s + p.goals, 0) / agePeers.length;
    const diff = player.goals - ageAvgGoals;
    if (Math.abs(diff) > 1) {
      items.push({
        text: `${diff > 0 ? "Outscores" : "Trails"} age peers (${player.age - 2}–${player.age + 2}) by ${Math.abs(diff).toFixed(1)} goals. Age group average: ${ageAvgGoals.toFixed(1)} goals across ${agePeers.length} players.`,
        accent: diff > 0 ? "emerald" : "coral",
      });
    }
  }

  // Salary context
  if (player.salary > 0) {
    const salaryPeers = active.filter(
      p =>
        p.salary > 0 &&
        p.salary >= player.salary * 0.5 &&
        p.salary <= player.salary * 2
    );
    if (salaryPeers.length >= 3) {
      const peerAvgGoals =
        salaryPeers.reduce((s, p) => s + p.goals, 0) / salaryPeers.length;
      const diff = player.goals - peerAvgGoals;
      items.push({
        text: `At ${fmtSalary(player.salary)}, ${diff >= 0 ? "outproduces" : "underperforms"} salary peers by ${Math.abs(diff).toFixed(1)} goals. ${salaryPeers.length} players in the ${fmtSalary(player.salary * 0.5)}–${fmtSalary(player.salary * 2)} bracket average ${peerAvgGoals.toFixed(1)} goals.`,
        accent: diff >= 0 ? "emerald" : "amber",
      });
    }
  }

  // Minutes efficiency
  if (player.minutes > 0 && player.goals > 0) {
    const minsPerGoal = player.minutes / player.goals;
    const allMinsPerGoal = active
      .filter(p => p.goals > 0)
      .map(p => p.minutes / p.goals);
    const leagueMedian = median(allMinsPerGoal);
    if (leagueMedian > 0) {
      const ratio = leagueMedian / minsPerGoal;
      items.push({
        text: `Scores every ${Math.round(minsPerGoal)} minutes — ${ratio >= 1 ? `${ratio.toFixed(1)}x faster` : `${(1 / ratio).toFixed(1)}x slower`} than the league median of ${Math.round(leagueMedian)} minutes/goal.`,
        accent: ratio >= 1.2 ? "cyan" : ratio >= 0.8 ? "amber" : "coral",
      });
    }
  }

  return items.slice(0, 3);
}

/**
 * Insights for the Player Database table card
 */
export function playerTableCardInsights(players: Player[]): CardInsightItem[] {
  const items: CardInsightItem[] = [];
  if (players.length < 10) return [];

  // Salary distribution
  const withSalary = players.filter(p => p.salary > 0);
  if (withSalary.length >= 10) {
    const salaries = withSalary.map(p => p.salary);
    const med = median(salaries);
    const top10Pct = salaries
      .sort((a, b) => b - a)
      .slice(0, Math.ceil(salaries.length * 0.1));
    const top10AvgSalary =
      top10Pct.reduce((s, v) => s + v, 0) / top10Pct.length;
    items.push({
      text: `Median salary: ${fmtSalary(med)}. The top 10% earn ${(top10AvgSalary / med).toFixed(1)}x the median (avg ${fmtSalary(top10AvgSalary)}). ${withSalary.filter(p => p.salary > 1_000_000).length} players earn $1M+.`,
      accent: "emerald",
    });
  }

  // Position balance
  const posCounts: Record<string, number> = {};
  players.forEach(p => {
    posCounts[p.position] = (posCounts[p.position] || 0) + 1;
  });
  const posEntries = Object.entries(posCounts).sort((a, b) => b[1] - a[1]);
  if (posEntries.length >= 3) {
    const breakdown = posEntries
      .map(([pos, count]) => `${pos}: ${count}`)
      .join(", ");
    items.push({
      text: `Position breakdown: ${breakdown}. ${posEntries[0][0]}s make up ${((posEntries[0][1] / players.length) * 100).toFixed(0)}% of the filtered roster.`,
      accent: "amber",
    });
  }

  // Age demographics
  const ages = players.map(p => p.age);
  const avgAge = ages.reduce((s, a) => s + a, 0) / ages.length;
  const under23 = players.filter(p => p.age <= 23).length;
  const over30 = players.filter(p => p.age >= 30).length;
  items.push({
    text: `Average age: ${avgAge.toFixed(1)}. ${under23} players are 23 or younger (${((under23 / players.length) * 100).toFixed(0)}%), ${over30} are 30+ (${((over30 / players.length) * 100).toFixed(0)}%).`,
    accent: "cyan",
  });

  return items.slice(0, 3);
}

// ═══════════════════════════════════════════
// PER-CARD INSIGHTS — TEAM BUDGET TAB
// ═══════════════════════════════════════════

/**
 * Insights for the Budget Breakdown bar chart card
 */
export function budgetBarCardInsights(
  teams: Team[],
  players: Player[]
): CardInsightItem[] {
  const items: CardInsightItem[] = [];
  if (teams.length < 5) return [];

  const teamBudgets = teams
    .map(t => {
      const b = _TEAM_BUDGETS[t.id];
      const total = b ? b.totalSalary : 0;
      const dp = b ? b.dpSalary : 0;
      return {
        name: t.short,
        id: t.id,
        total,
        dp,
        dpPct: total > 0 ? dp / total : 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  // Spending gap: top vs bottom
  const top3 = teamBudgets.slice(0, 3);
  const bot3 = teamBudgets.slice(-3);
  const topAvg = top3.reduce((s, t) => s + t.total, 0) / 3;
  const botAvg = bot3.reduce((s, t) => s + t.total, 0) / 3;
  if (botAvg > 0) {
    items.push({
      text: `The top 3 spenders (${top3.map(t => t.name).join(", ")}) average ${fmtSalary(topAvg)} — ${(topAvg / botAvg).toFixed(1)}x more than the bottom 3 (${bot3.map(t => t.name).join(", ")}) at ${fmtSalary(botAvg)}.`,
      accent: "amber",
    });
  }

  // DP dependency — who relies most on DPs
  const dpHeavy = teamBudgets
    .filter(t => t.total > 0)
    .sort((a, b) => b.dpPct - a.dpPct);
  if (dpHeavy.length >= 5) {
    const most = dpHeavy[0];
    const least = dpHeavy.filter(t => t.dpPct > 0).slice(-1)[0];
    items.push({
      text: `${most.name} allocates ${(most.dpPct * 100).toFixed(0)}% of salary to DPs — the most DP-dependent team. ${least ? `${least.name} allocates just ${(least.dpPct * 100).toFixed(0)}%.` : ""}`,
      accent: "cyan",
    });
  }

  // League-wide total
  const leagueTotal = teamBudgets.reduce((s, t) => s + t.total, 0);
  const medianBudget = median(teamBudgets.map(t => t.total));
  items.push({
    text: `League total payroll: ${fmtSalary(leagueTotal)}. Median team budget: ${fmtSalary(medianBudget)}. ${teamBudgets.filter(t => t.total > medianBudget * 1.5).length} teams spend 50%+ above the median.`,
    accent: "emerald",
  });

  return items.slice(0, 3);
}

/**
 * Insights for the Salary by Position pie chart card
 */
export function salaryPieCardInsights(
  selectedTeam: Team | null,
  players: Player[],
  allTeams: Team[]
): CardInsightItem[] {
  const items: CardInsightItem[] = [];

  if (!selectedTeam) {
    // No team selected — show league-wide position spending
    if (players.length < 50) return [];
    const posSalary: Record<string, number> = {};
    const posCount: Record<string, number> = {};
    players.forEach(p => {
      posSalary[p.position] = (posSalary[p.position] || 0) + p.salary;
      posCount[p.position] = (posCount[p.position] || 0) + 1;
    });
    const entries = Object.entries(posSalary).sort((a, b) => b[1] - a[1]);
    if (entries.length >= 2) {
      const topPos = entries[0];
      const avgPerPlayer = topPos[1] / (posCount[topPos[0]] || 1);
      items.push({
        text: `Select a team to see its salary breakdown. League-wide, ${topPos[0]}s command the most total salary (${fmtSalary(topPos[1])}) at ${fmtSalary(avgPerPlayer)}/player.`,
        accent: "amber",
      });
    }
    return items;
  }

  const teamPlayers = players.filter(p => p.team === selectedTeam.id);
  if (teamPlayers.length < 3) return [];

  const posSalary: Record<string, { total: number; count: number }> = {};
  teamPlayers.forEach(p => {
    if (!posSalary[p.position]) posSalary[p.position] = { total: 0, count: 0 };
    posSalary[p.position].total += p.salary;
    posSalary[p.position].count += 1;
  });

  const entries = Object.entries(posSalary).sort(
    (a, b) => b[1].total - a[1].total
  );
  const totalSalary = entries.reduce((s, [, v]) => s + v.total, 0);

  // Biggest allocation
  if (entries.length >= 2) {
    const top = entries[0];
    const pct =
      totalSalary > 0 ? ((top[1].total / totalSalary) * 100).toFixed(0) : "0";
    items.push({
      text: `${selectedTeam.short} invests ${pct}% of salary in ${top[0]}s (${fmtSalary(top[1].total)} across ${top[1].count} players). Their cheapest position group is ${entries[entries.length - 1][0]}s at ${fmtSalary(entries[entries.length - 1][1].total)}.`,
      accent: "cyan",
    });
  }

  // Goals per dollar by position
  const posGoals: Record<string, number> = {};
  teamPlayers.forEach(p => {
    posGoals[p.position] = (posGoals[p.position] || 0) + p.goals;
  });
  const bestROI = entries
    .filter(([pos]) => (posGoals[pos] || 0) > 0 && posSalary[pos].total > 0)
    .map(([pos]) => ({
      pos,
      costPerGoal: posSalary[pos].total / (posGoals[pos] || 1),
    }))
    .sort((a, b) => a.costPerGoal - b.costPerGoal);
  if (bestROI.length >= 1) {
    items.push({
      text: `Best goal ROI: ${bestROI[0].pos}s at ${fmtSalary(bestROI[0].costPerGoal)}/goal (${posGoals[bestROI[0].pos]} goals from ${fmtSalary(posSalary[bestROI[0].pos].total)}).`,
      accent: "emerald",
    });
  }

  return items.slice(0, 3);
}

/**
 * Insights for the Top Earners table card
 */
export function topEarnersCardInsights(
  selectedTeam: Team | null,
  players: Player[]
): CardInsightItem[] {
  const items: CardInsightItem[] = [];

  if (!selectedTeam) {
    items.push({
      text: `Select a team from the bar chart or team chips to see top earner analysis.`,
      accent: "amber",
    });
    return items;
  }

  const teamPlayers = players
    .filter(p => p.team === selectedTeam.id)
    .sort((a, b) => b.salary - a.salary);
  if (teamPlayers.length < 3) return [];

  const topEarner = teamPlayers[0];
  const teamTotal = teamPlayers.reduce((s, p) => s + p.salary, 0);
  const topPct =
    teamTotal > 0 ? ((topEarner.salary / teamTotal) * 100).toFixed(0) : "0";

  items.push({
    text: `${topEarner.name} earns ${fmtSalary(topEarner.salary)} — ${topPct}% of ${selectedTeam.short}'s total payroll. ${topEarner.goals > 0 ? `At ${fmtSalary(topEarner.salary / topEarner.goals)}/goal, ` : "With 0 goals, "}${topEarner.goals > 0 ? "that's " + (topEarner.salary / topEarner.goals > 500000 ? "expensive production." : "solid value.") : "the investment hasn't paid off in goals yet."}`,
    accent: "cyan",
  });

  // Salary concentration — top 3 vs rest
  const top3Salary = teamPlayers.slice(0, 3).reduce((s, p) => s + p.salary, 0);
  const restSalary = teamTotal - top3Salary;
  const restCount = teamPlayers.length - 3;
  if (restCount > 0 && restSalary > 0) {
    items.push({
      text: `Top 3 earners take ${((top3Salary / teamTotal) * 100).toFixed(0)}% of the budget. The remaining ${restCount} players split ${fmtSalary(restSalary)} (avg ${fmtSalary(restSalary / restCount)}/player).`,
      accent: "amber",
    });
  }

  return items.slice(0, 3);
}

// ═══════════════════════════════════════════
// PER-CARD INSIGHTS — ATTENDANCE TAB
// ═══════════════════════════════════════════

/**
 * Insights for the Attendance Trend line chart card
 */
export function attendanceTrendCardInsights(
  matches: Match[],
  teams: Team[]
): CardInsightItem[] {
  const items: CardInsightItem[] = [];
  if (matches.length < 20) return [];

  // Weekly trend direction
  const weekMap: Record<number, number[]> = {};
  matches.forEach(m => {
    if (!weekMap[m.week]) weekMap[m.week] = [];
    weekMap[m.week].push(m.attendance);
  });
  const weeks = Object.keys(weekMap)
    .map(Number)
    .sort((a, b) => a - b);
  if (weeks.length >= 4) {
    const firstHalf = weeks.slice(0, Math.floor(weeks.length / 2));
    const secondHalf = weeks.slice(Math.floor(weeks.length / 2));
    const firstAvg =
      firstHalf.reduce(
        (s, w) => s + weekMap[w].reduce((a, b) => a + b, 0) / weekMap[w].length,
        0
      ) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce(
        (s, w) => s + weekMap[w].reduce((a, b) => a + b, 0) / weekMap[w].length,
        0
      ) / secondHalf.length;
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    items.push({
      text: `Attendance ${change > 0 ? "grew" : "declined"} ${Math.abs(change).toFixed(1)}% from the first half to the second half of the season (${fmt(Math.round(firstAvg))} → ${fmt(Math.round(secondAvg))} avg/match).`,
      accent: change > 0 ? "emerald" : "coral",
    });
  }

  // Peak week
  const weekAvgs = weeks.map(w => ({
    week: w,
    avg: weekMap[w].reduce((a, b) => a + b, 0) / weekMap[w].length,
  }));
  const peakWeek = weekAvgs.sort((a, b) => b.avg - a.avg)[0];
  if (peakWeek) {
    items.push({
      text: `Peak attendance: Week ${peakWeek.week} averaged ${fmt(Math.round(peakWeek.avg))} fans/match. The lowest was Week ${weekAvgs[weekAvgs.length - 1].week} at ${fmt(Math.round(weekAvgs[weekAvgs.length - 1].avg))}.`,
      accent: "amber",
    });
  }

  return items.slice(0, 3);
}

/**
 * Insights for the Capacity Fill chart card
 */
const STADIUM_CAP: Record<string, number> = {
  ATL: 71000,
  ATX: 20738,
  MTL: 19619,
  CLT: 75000,
  CHI: 61500,
  COL: 18061,
  CLB: 20371,
  DC: 20000,
  CIN: 26000,
  DAL: 20500,
  HOU: 22039,
  MIA: 21550,
  LAG: 27000,
  LAFC: 22000,
  MIN: 19400,
  NSH: 30000,
  NE: 65878,
  NYRB: 25000,
  NYC: 28000,
  ORL: 25500,
  PHI: 18500,
  POR: 25218,
  RSL: 20213,
  SD: 35000,
  SEA: 37722,
  SJ: 18000,
  SKC: 18467,
  STL: 22500,
  TOR: 30000,
  VAN: 22120,
};

export function capacityFillCardInsights(
  teams: Team[],
  matches: Match[]
): CardInsightItem[] {
  const items: CardInsightItem[] = [];
  if (teams.length < 5) return [];

  // Compute fill rates
  const teamFills = teams
    .map(t => {
      const homeMatches = matches.filter(m => m.homeTeam === t.id);
      const avgAtt =
        homeMatches.length > 0
          ? homeMatches.reduce((s, m) => s + m.attendance, 0) /
            homeMatches.length
          : 0;
      const cap = STADIUM_CAP[t.id] || 0;
      const fillRate = cap > 0 ? avgAtt / cap : 0;
      return { name: t.short, fillRate, avgAtt, capacity: cap };
    })
    .filter(t => t.fillRate > 0)
    .sort((a, b) => b.fillRate - a.fillRate);

  if (teamFills.length >= 5) {
    const overFill = teamFills.filter(t => t.fillRate > 1);
    const under70 = teamFills.filter(t => t.fillRate < 0.7);
    items.push({
      text: `${overFill.length} team${overFill.length !== 1 ? "s" : ""} exceed${overFill.length === 1 ? "s" : ""} 100% capacity (standing room/expansion)${
        overFill.length > 0
          ? ": " +
            overFill
              .slice(0, 3)
              .map(t => `${t.name} at ${(t.fillRate * 100).toFixed(0)}%`)
              .join(", ")
          : ""
      }. ${under70.length} team${under70.length !== 1 ? "s" : ""} fill less than 70%.`,
      accent: "cyan",
    });
  }

  // Best and worst
  if (teamFills.length >= 2) {
    const best = teamFills[0];
    const worst = teamFills[teamFills.length - 1];
    items.push({
      text: `${best.name} leads at ${(best.fillRate * 100).toFixed(0)}% fill (${fmt(Math.round(best.avgAtt))} avg in a ${fmt(best.capacity)}-seat venue). ${worst.name} trails at ${(worst.fillRate * 100).toFixed(0)}% (${fmt(Math.round(worst.avgAtt))} of ${fmt(worst.capacity)}).`,
      accent: "emerald",
    });
  }

  return items.slice(0, 3);
}

/**
 * Insights for the Gravitational Pull chart card
 */
export function gravPullCardInsights(
  teams: Team[],
  matches: Match[]
): CardInsightItem[] {
  const items: CardInsightItem[] = [];
  if (teams.length < 5) return [];

  // Compute gravitational pull: avg away attendance when this team visits
  const teamPull = teams
    .map(t => {
      const awayMatches = matches.filter(m => m.awayTeam === t.id);
      const avgAwayAtt =
        awayMatches.length > 0
          ? awayMatches.reduce((s, m) => s + m.attendance, 0) /
            awayMatches.length
          : 0;
      return { name: t.short, pull: avgAwayAtt, awayGames: awayMatches.length };
    })
    .filter(t => t.awayGames >= 3)
    .sort((a, b) => b.pull - a.pull);

  if (teamPull.length >= 5) {
    const top = teamPull[0];
    const leagueAvg =
      teamPull.reduce((s, t) => s + t.pull, 0) / teamPull.length;
    items.push({
      text: `${top.name} draws ${fmt(Math.round(top.pull))} avg fans on the road — ${((top.pull / leagueAvg - 1) * 100).toFixed(0)}% above the league average of ${fmt(Math.round(leagueAvg))}. The "away day" premium suggests star power or rivalry draw.`,
      accent: "amber",
    });

    const bottom = teamPull[teamPull.length - 1];
    items.push({
      text: `${bottom.name} has the weakest road draw at ${fmt(Math.round(bottom.pull))} avg — ${((1 - bottom.pull / leagueAvg) * 100).toFixed(0)}% below average. ${teamPull.filter(t => t.pull > leagueAvg).length} of ${teamPull.length} teams draw above-average crowds away.`,
      accent: "coral",
    });
  }

  return items.slice(0, 3);
}

/**
 * Away Impact card insights — how cities respond when a specific team visits.
 */
export function awayImpactCardInsights(
  teamId: string,
  matches: Match[]
): CardInsightItem[] {
  const items: CardInsightItem[] = [];
  if (!teamId) return items;

  // Compute home averages for every team
  const homeAvgs: Record<string, number> = {};
  TEAMS.forEach(t => {
    const hm = matches.filter(m => m.homeTeam === t.id && m.attendance > 0);
    homeAvgs[t.id] =
      hm.length > 0 ? hm.reduce((s, m) => s + m.attendance, 0) / hm.length : 0;
  });

  // Compute per-host deltas
  const byHost: Record<string, number[]> = {};
  matches
    .filter(m => m.awayTeam === teamId && m.attendance > 0)
    .forEach(m => {
      if (!byHost[m.homeTeam]) byHost[m.homeTeam] = [];
      byHost[m.homeTeam].push(m.attendance);
    });

  const hostDeltas = Object.entries(byHost)
    .map(([hostId, atts]) => {
      const avgAtt = atts.reduce((s, a) => s + a, 0) / atts.length;
      const hostAvg = homeAvgs[hostId] || 0;
      return {
        hostId,
        hostName: getTeam(hostId)?.short || hostId,
        delta: Math.round(avgAtt - hostAvg),
        avgAtt: Math.round(avgAtt),
        hostAvg: Math.round(hostAvg),
      };
    })
    .sort((a, b) => b.delta - a.delta);

  if (hostDeltas.length === 0) return items;

  const teamName = getTeam(teamId)?.short || teamId;
  const positiveCount = hostDeltas.filter(d => d.delta > 0).length;
  const totalCities = hostDeltas.length;

  if (positiveCount > 0) {
    items.push({
      text: `${positiveCount} of ${totalCities} cities drew more fans than their own season average when ${teamName} came to town. The biggest bump was at ${hostDeltas[0].hostName} (+${fmt(hostDeltas[0].delta)}).`,
      accent: "emerald",
    });
  }

  const negativeDeltas = hostDeltas.filter(d => d.delta < 0);
  if (negativeDeltas.length > 0) {
    const worst = negativeDeltas[negativeDeltas.length - 1];
    items.push({
      text: `${negativeDeltas.length} stadiums actually saw lower turnout — ${worst.hostName} dropped ${fmt(Math.abs(worst.delta))} below their average.`,
      accent: "coral",
    });
  }

  return items.slice(0, 3);
}

/**
 * Home Response card insights — how a team's own fans respond to different visitors.
 */
export function homeResponseCardInsights(
  teamId: string,
  matches: Match[]
): CardInsightItem[] {
  const items: CardInsightItem[] = [];
  if (!teamId) return items;

  const homeMatches = matches.filter(
    m => m.homeTeam === teamId && m.attendance > 0
  );
  if (homeMatches.length === 0) return items;

  const avgHome =
    homeMatches.reduce((s, m) => s + m.attendance, 0) / homeMatches.length;
  const byAway: Record<string, number[]> = {};
  homeMatches.forEach(m => {
    if (!byAway[m.awayTeam]) byAway[m.awayTeam] = [];
    byAway[m.awayTeam].push(m.attendance);
  });

  const awayDeltas = Object.entries(byAway)
    .map(([awayId, atts]) => {
      const awayAvg = atts.reduce((s, a) => s + a, 0) / atts.length;
      return {
        awayId,
        awayName: getTeam(awayId)?.short || awayId,
        delta: Math.round(awayAvg - avgHome),
        avgAtt: Math.round(awayAvg),
      };
    })
    .sort((a, b) => b.delta - a.delta);

  if (awayDeltas.length === 0) return items;

  const teamName = getTeam(teamId)?.short || teamId;
  const topDraw = awayDeltas[0];

  if (topDraw.delta > 0) {
    items.push({
      text: `${topDraw.awayName} visiting ${teamName} drew the biggest crowd bump (+${fmt(topDraw.delta)} above the ${fmt(Math.round(avgHome))} home average). Rivalry or star power at work.`,
      accent: "amber",
    });
  }

  const aboveAvg = awayDeltas.filter(d => d.delta > 0).length;
  items.push({
    text: `${aboveAvg} of ${awayDeltas.length} visiting teams pushed ${teamName}'s attendance above their season average. The rest drew below-average crowds.`,
    accent: aboveAvg > awayDeltas.length / 2 ? "emerald" : "cyan",
  });

  return items.slice(0, 3);
}


// ═══════════════════════════════════════════
// SEASON PULSE INSIGHTS (2026 Storyline Detection)
// ═══════════════════════════════════════════

/**
 * Compute insight cards for the Season Pulse tab.
 *
 * Dynamically detects defining storylines based on the active season's
 * standings data. For 2026, this includes the four key narratives:
 * - The LAFC Wall (historic defensive start)
 * - The Philly Collapse (title defense hangover)
 * - The Vancouver Surge (offensive explosion)
 * - The Sam Surridge Golden Boot Race
 *
 * For 2025, it surfaces end-of-season narratives from the full data.
 */
export function seasonPulseInsights(
  standings: TeamWeekStanding[],
  players: Player[],
  matches: Match[],
  seasonYear: SeasonYear,
  totalWeeks: number
): Insight[] {
  const insights: Insight[] = [];
  if (standings.length === 0) return insights;

  // Sort by power rank
  const sorted = [...standings].sort((a, b) => a.powerRank - b.powerRank);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];

  // ─── 2026 Early-Season Storyline Detection ───
  if (seasonYear === 2026) {
    // 1. The LAFC Wall — detect historic defensive start
    const lafcStanding = standings.find(s => s.teamId === "LAFC");
    if (lafcStanding && lafcStanding.goalsAgainst === 0 && lafcStanding.played >= 3) {
      const lafcTeam = getTeam("LAFC")?.name || "LAFC";
      insights.push({
        icon: "star",
        headline: `The LAFC Wall: ${lafcStanding.played} games, 0 goals conceded`,
        detail: `${lafcTeam} have kept ${lafcStanding.played} consecutive clean sheets to start the ${seasonYear} season — a historic defensive record. Their ${lafcStanding.wins}W-${lafcStanding.draws}D-${lafcStanding.losses}L record with ${lafcStanding.goalsFor} GF and 0 GA gives them an impenetrable +${lafcStanding.goalsFor} goal difference.`,
        accentColor: "cyan",
      });
    }

    // 2. The Philly Collapse — detect title defense hangover
    const phillyStanding = standings.find(s => s.teamId === "PHI");
    if (phillyStanding && phillyStanding.points === 0 && phillyStanding.played >= 3) {
      const phillyTeam = getTeam("PHI")?.name || "Philadelphia Union";
      insights.push({
        icon: "alert",
        headline: `Philly Collapse: 0 points through ${phillyStanding.played} games`,
        detail: `${phillyTeam}, the 2025 Supporters' Shield winners, have ${phillyStanding.losses} losses in ${phillyStanding.played} matches with 0 points — a catastrophic title defense start. They've conceded ${phillyStanding.goalsAgainst} goals (${(phillyStanding.goalsAgainst / phillyStanding.played).toFixed(1)}/game) and sit at the bottom of the table.`,
        accentColor: "coral",
      });
    }

    // 3. The Vancouver Surge — detect offensive explosion
    const vanStanding = standings.find(s => s.teamId === "VAN");
    if (vanStanding && vanStanding.goalsFor >= 10 && vanStanding.played >= 3) {
      const vanTeam = getTeam("VAN")?.name || "Vancouver Whitecaps";
      const gpg = (vanStanding.goalsFor / vanStanding.played).toFixed(1);
      insights.push({
        icon: "zap",
        headline: `Vancouver Surge: ${vanStanding.goalsFor} goals in ${vanStanding.played} games (${gpg}/game)`,
        detail: `${vanTeam} are the league's most prolific attack with ${vanStanding.goalsFor} GF and a +${vanStanding.goalDifference} goal difference through ${vanStanding.played} matches. Their ${vanStanding.points} points from a ${vanStanding.wins}W-${vanStanding.draws}D-${vanStanding.losses}L record has them firmly in the title contender tier.`,
        accentColor: "emerald",
      });
    }

    // 4. The Sam Surridge Golden Boot Race — detect top scorer
    const activePlayers = players.filter(p => p.minutes > 0 && p.goals > 0);
    const topScorer = [...activePlayers].sort((a, b) => b.goals - a.goals)[0];
    if (topScorer && topScorer.goals >= 5) {
      const scorerTeam = getTeam(topScorer.team)?.short || topScorer.team;
      const gamesPlayed = topScorer.games || topScorer.starts || 1;
      const gpg = (topScorer.goals / gamesPlayed).toFixed(2);
      const runnerUp = [...activePlayers].sort((a, b) => b.goals - a.goals)[1];
      const runnerUpText = runnerUp
        ? ` — ${topScorer.goals - runnerUp.goals} goals clear of ${runnerUp.name} (${runnerUp.goals}).`
        : ".";
      insights.push({
        icon: "trending-up",
        headline: `Golden Boot Race: ${topScorer.name} leads with ${topScorer.goals} goals in ${gamesPlayed} games`,
        detail: `${topScorer.name} (${scorerTeam}) is scoring at ${gpg} goals/game — a pace that would yield ${Math.round(topScorer.goals / gamesPlayed * 34)} goals over a full 34-game season${runnerUpText}`,
        accentColor: "amber",
      });
    }

    // 5. General early-season power gap
    if (insights.length < 4 && top && bottom) {
      const topTeam = getTeam(top.teamId)?.short || top.teamId;
      const bottomTeam = getTeam(bottom.teamId)?.short || bottom.teamId;
      const gap = (top.powerScore - bottom.powerScore).toFixed(1);
      insights.push({
        icon: "bar-chart",
        headline: `${gap}-point power gap between ${topTeam} and ${bottomTeam} after ${totalWeeks} weeks`,
        detail: `${topTeam} lead with a ${top.powerScore.toFixed(1)} composite score (${top.points} pts, ${top.ppg.toFixed(2)} PPG). ${bottomTeam} sit last at ${bottom.powerScore.toFixed(1)} (${bottom.points} pts). Early-season volatility means these gaps can close quickly.`,
        accentColor: "cyan",
      });
    }
  }

  // ─── 2025 Full-Season Insights ───
  if (seasonYear === 2025) {
    // Shield winner narrative
    const topTeam = getTeam(top.teamId);
    if (topTeam) {
      insights.push({
        icon: "star",
        headline: `${topTeam.short} finish as the ${seasonYear} power rankings champion`,
        detail: `${topTeam.name} end the season with a ${top.powerScore.toFixed(1)} composite score — ${top.points} points from ${top.played} matches (${top.ppg.toFixed(2)} PPG). Their ${top.wins}W-${top.draws}D-${top.losses}L record and +${top.goalDifference} GD earned them the top spot.`,
        accentColor: "cyan",
      });
    }

    // Biggest riser (most positive rank delta)
    const risers = [...standings].sort((a, b) => b.rankDelta - a.rankDelta);
    if (risers.length > 0 && risers[0].rankDelta > 0) {
      const riser = risers[0];
      const riserTeam = getTeam(riser.teamId)?.short || riser.teamId;
      insights.push({
        icon: "trending-up",
        headline: `${riserTeam} surged +${riser.rankDelta} spots in the final week`,
        detail: `${riserTeam} climbed ${riser.rankDelta} positions to finish ${ordinalSuffix(riser.powerRank)} in the power rankings with ${riser.points} points and a ${riser.powerScore.toFixed(1)} composite score.`,
        accentColor: "emerald",
      });
    }

    // Biggest faller
    const fallers = [...standings].sort((a, b) => a.rankDelta - b.rankDelta);
    if (fallers.length > 0 && fallers[0].rankDelta < 0) {
      const faller = fallers[0];
      const fallerTeam = getTeam(faller.teamId)?.short || faller.teamId;
      insights.push({
        icon: "trending-down",
        headline: `${fallerTeam} dropped ${Math.abs(faller.rankDelta)} spots in the final week`,
        detail: `${fallerTeam} fell to ${ordinalSuffix(faller.powerRank)} in the power rankings despite ${faller.points} points. Their late-season form of ${faller.form.join("")} cost them dearly.`,
        accentColor: "coral",
      });
    }

    // Bottom of table
    const bottomTeam = getTeam(bottom.teamId);
    if (bottomTeam && insights.length < 4) {
      insights.push({
        icon: "alert",
        headline: `${bottomTeam.short} finish last with ${bottom.points} points`,
        detail: `${bottomTeam.name} end the season at the bottom of the power rankings (${bottom.powerScore.toFixed(1)} composite). Their ${bottom.wins}W-${bottom.draws}D-${bottom.losses}L record and ${bottom.goalDifference} GD tell the story of a difficult campaign.`,
        accentColor: "amber",
      });
    }
  }

  return insights.slice(0, 4);
}

/**
 * Compute card-level insights for the Season Pulse standings table.
 */
export function seasonPulseTableCardInsights(
  standings: TeamWeekStanding[],
  seasonYear: SeasonYear
): CardInsightItem[] {
  const items: CardInsightItem[] = [];
  if (standings.length === 0) return items;

  const sorted = [...standings].sort((a, b) => a.powerRank - b.powerRank);

  // Points vs Power rank divergence
  const divergent = sorted.filter(s => Math.abs(s.powerRank - s.pointsRank) >= 5);
  if (divergent.length > 0) {
    const biggest = [...divergent].sort(
      (a, b) => Math.abs(b.powerRank - b.pointsRank) - Math.abs(a.powerRank - a.pointsRank)
    )[0];
    const teamName = getTeam(biggest.teamId)?.short || biggest.teamId;
    const direction = biggest.powerRank < biggest.pointsRank ? "higher" : "lower";
    items.push({
      text: `${teamName} ranks ${Math.abs(biggest.powerRank - biggest.pointsRank)} spots ${direction} in power rankings than points — ${direction === "higher" ? "strong form and momentum compensate for fewer points" : "accumulated points mask declining form"}.`,
      accent: direction === "higher" ? "emerald" : "amber",
    });
  }

  // Home vs Away split
  const homeHeavy = sorted.filter(s => s.homeWins > 0 && s.awayWins === 0 && s.played >= 3);
  if (homeHeavy.length > 0) {
    const names = homeHeavy.slice(0, 3).map(s => getTeam(s.teamId)?.short || s.teamId).join(", ");
    items.push({
      text: `${names} ${homeHeavy.length === 1 ? "has" : "have"} won only at home — zero away victories so far. Road form will determine their playoff fate.`,
      accent: "coral",
    });
  }

  // Clean sheet leaders
  const cleanSheets = sorted.filter(s => s.goalsAgainst === 0);
  if (cleanSheets.length > 0) {
    const names = cleanSheets.map(s => getTeam(s.teamId)?.short || s.teamId).join(", ");
    items.push({
      text: `${names} ${cleanSheets.length === 1 ? "has" : "have"} a perfect defensive record — 0 goals conceded through ${cleanSheets[0].played} matches.`,
      accent: "cyan",
    });
  }

  // Highest-scoring team
  const topAttack = [...sorted].sort((a, b) => b.goalsFor - a.goalsFor)[0];
  if (topAttack) {
    const teamName = getTeam(topAttack.teamId)?.short || topAttack.teamId;
    const gpg = (topAttack.goalsFor / topAttack.played).toFixed(1);
    items.push({
      text: `${teamName} lead the league in scoring with ${topAttack.goalsFor} goals (${gpg}/game) — ${seasonYear === 2026 ? "an explosive early-season pace" : "the most prolific attack of the season"}.`,
      accent: "emerald",
    });
  }

  return items.slice(0, 3);
}

// Helper for ordinal suffixes
function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}


/**
 * Compute card-level insights for the Bump Chart (Season Rank Flow).
 *
 * Analyses the visible week range and filtered teams to surface
 * movement narratives: biggest movers, most stable, tightest clusters,
 * and conference-specific observations.
 */
export function bumpChartCardInsights(
  standings: TeamWeekStanding[],
  prevStandings: TeamWeekStanding[] | null,
  conferenceFilter: "ALL" | "EASTERN" | "WESTERN",
  rankMode: "POWER" | "POINTS",
  startWeek: number,
  endWeek: number,
  seasonYear: SeasonYear
): CardInsightItem[] {
  const items: CardInsightItem[] = [];
  if (standings.length === 0) return items;

  const sorted = [...standings].sort((a, b) =>
    rankMode === "POWER" ? a.powerRank - b.powerRank : a.pointsRank - b.pointsRank
  );

  const confLabel =
    conferenceFilter === "EASTERN" ? "Eastern Conference" :
    conferenceFilter === "WESTERN" ? "Western Conference" : "league";

  // Biggest mover (if we have previous standings to compare)
  if (prevStandings && prevStandings.length > 0) {
    let biggestRise = { id: "", delta: 0 };
    let biggestDrop = { id: "", delta: 0 };

    for (const curr of sorted) {
      const prev = prevStandings.find(s => s.teamId === curr.teamId);
      if (!prev) continue;
      const currRank = rankMode === "POWER" ? curr.powerRank : curr.pointsRank;
      const prevRank = rankMode === "POWER" ? prev.powerRank : prev.pointsRank;
      const delta = prevRank - currRank; // positive = improved
      if (delta > biggestRise.delta) biggestRise = { id: curr.teamId, delta };
      if (delta < biggestDrop.delta) biggestDrop = { id: curr.teamId, delta };
    }

    if (biggestRise.delta >= 2) {
      const name = getTeam(biggestRise.id)?.short || biggestRise.id;
      items.push({
        text: `${name} surged ${biggestRise.delta} places in the ${confLabel} between weeks ${startWeek} and ${endWeek} — the biggest climb in the current window.`,
        accent: "emerald",
      });
    }

    if (biggestDrop.delta <= -2) {
      const name = getTeam(biggestDrop.id)?.short || biggestDrop.id;
      items.push({
        text: `${name} dropped ${Math.abs(biggestDrop.delta)} spots over the same span — the steepest decline in the ${confLabel}.`,
        accent: "coral",
      });
    }
  }

  // Tightest cluster: find consecutive teams with identical or near-identical scores
  const scores = sorted.map(s => rankMode === "POWER" ? s.powerScore : s.points);
  let maxCluster = 0;
  let bestClusterStart = 0;
  let clusterStart = 0;
  for (let i = 1; i < scores.length; i++) {
    const gap = Math.abs(scores[i] - scores[i - 1]);
    if (gap <= (rankMode === "POWER" ? 3 : 1)) {
      const run = i - clusterStart + 1;
      if (run > maxCluster) {
        maxCluster = run;
        bestClusterStart = clusterStart;
      }
    } else {
      clusterStart = i;
    }
  }
  if (maxCluster >= 3) {
    const clusterTeams = sorted.slice(bestClusterStart, bestClusterStart + maxCluster);
    const topName = getTeam(clusterTeams[0]?.teamId)?.short || "";
    const botName = getTeam(clusterTeams[clusterTeams.length - 1]?.teamId)?.short || "";
    items.push({
      text: `${maxCluster} teams from ${topName} to ${botName} are separated by less than ${rankMode === "POWER" ? "3 power score points" : "2 points"} — any single result could reshuffle this cluster.`,
      accent: "amber",
    });
  }

  // Leader narrative
  const leader = sorted[0];
  if (leader) {
    const name = getTeam(leader.teamId)?.short || leader.teamId;
    const score = rankMode === "POWER" ? leader.powerScore.toFixed(1) : String(leader.points);
    const second = sorted[1];
    if (second) {
      const gap = rankMode === "POWER"
        ? (leader.powerScore - second.powerScore).toFixed(1)
        : String(leader.points - second.points);
      const secondName = getTeam(second.teamId)?.short || second.teamId;
      items.push({
        text: `${name} lead the ${confLabel} with a ${rankMode === "POWER" ? "power score" : "points tally"} of ${score}, ${gap} ${rankMode === "POWER" ? "points" : "pts"} clear of ${secondName} in ${ordinalSuffix(2)}.`,
        accent: "cyan",
      });
    }
  }

  return items.slice(0, 3);
}


// ═══════════════════════════════════════════
// SEASON NARRATIVE INSIGHTS (Per-Team Timeline)
// ═══════════════════════════════════════════

/**
 * Generate 3-5 narrative insight cards for a specific team's season arc.
 * Used by the SeasonTimeline component's narrative cards area.
 */
export function seasonNarrativeInsights(
  teamId: string,
  teams: Team[],
  matches: Match[],
  totalWeeks: number
): CardInsightItem[] {
  const items: CardInsightItem[] = [];
  const trajectory = getTeamTrajectory(teamId, teams, matches, totalWeeks);
  const events = getTeamEvents(teamId, teams, matches, totalWeeks);
  const team = getTeam(teamId);
  const teamName = team?.short || teamId;

  if (!trajectory || trajectory.length === 0) return items;

  const first = trajectory[0];
  const last = trajectory[trajectory.length - 1];

  // 1. Overall arc: where they started vs where they finished
  if (first && last && last.played > 0) {
    const startRank = first.powerRank;
    const endRank = last.powerRank;
    const delta = startRank - endRank; // positive = improved
    if (Math.abs(delta) >= 3) {
      const direction = delta > 0 ? "climbed" : "dropped";
      const accent = delta > 0 ? "emerald" : "coral";
      items.push({
        text: `${teamName} ${direction} from ${ordinalSuffix(startRank)} to ${ordinalSuffix(endRank)} in the power rankings across ${totalWeeks} weeks — a net shift of ${Math.abs(delta)} places.`,
        accent: accent as CardInsightItem["accent"],
      });
    } else {
      items.push({
        text: `${teamName} held steady around ${ordinalSuffix(endRank)} in the power rankings, finishing with ${last.points} points from ${last.played} matches (${last.ppg.toFixed(2)} PPG).`,
        accent: "cyan",
      });
    }
  }

  // 2. Peak moment: highest-severity positive event
  const positiveEvents = events.filter(
    (e) =>
      e.type === "winning_streak" ||
      e.type === "unbeaten_run" ||
      e.type === "rank_surge" ||
      e.type === "upset_win" ||
      e.type === "milestone"
  );
  const peakEvent = [...positiveEvents].sort((a, b) => b.severity - a.severity)[0];
  if (peakEvent) {
    items.push({
      text: `Peak moment: ${peakEvent.title} in Week ${peakEvent.week}. ${peakEvent.description}`,
      accent: "emerald",
    });
  }

  // 3. Low point: highest-severity negative event
  const negativeEvents = events.filter(
    (e) =>
      e.type === "losing_streak" ||
      e.type === "winless_run" ||
      e.type === "rank_collapse" ||
      e.type === "upset_loss"
  );
  const lowEvent = [...negativeEvents].sort((a, b) => b.severity - a.severity)[0];
  if (lowEvent) {
    items.push({
      text: `Low point: ${lowEvent.title} in Week ${lowEvent.week}. ${lowEvent.description}`,
      accent: "coral",
    });
  }

  // 4. Form trend: how they started vs how they finished
  if (last && last.played >= 5) {
    const earlyForm = trajectory.length >= 5
      ? trajectory.slice(0, 5).reduce((sum, w) => sum + (w.played > 0 ? w.ppg : 0), 0) / 5
      : 0;
    const lateSlice = trajectory.slice(-5);
    const lateForm = lateSlice.reduce((sum, w) => sum + (w.played > 0 ? w.ppg : 0), 0) / lateSlice.length;

    if (earlyForm > 0 && lateForm > 0) {
      const diff = lateForm - earlyForm;
      if (Math.abs(diff) >= 0.3) {
        const trend = diff > 0 ? "improved" : "declined";
        const accent = diff > 0 ? "emerald" : "amber";
        items.push({
          text: `Form ${trend}: ${teamName}'s PPG moved from ${earlyForm.toFixed(2)} (early) to ${lateForm.toFixed(2)} (late) — a ${diff > 0 ? "+" : ""}${diff.toFixed(2)} shift in points per game.`,
          accent: accent as CardInsightItem["accent"],
        });
      } else {
        items.push({
          text: `Consistent form: ${teamName} maintained a steady ${last.ppg.toFixed(2)} PPG throughout the season with no major form swings.`,
          accent: "cyan",
        });
      }
    }
  }

  // 5. Home/away split
  if (last && last.played >= 6) {
    const homeGames = last.homeWins + last.homeDraws + last.homeLosses;
    const awayGames = last.awayWins + last.awayDraws + last.awayLosses;
    if (homeGames >= 3 && awayGames >= 3) {
      const homePts = last.homeWins * 3 + last.homeDraws;
      const awayPts = last.awayWins * 3 + last.awayDraws;
      const homePPG = homePts / homeGames;
      const awayPPG = awayPts / awayGames;
      const gap = Math.abs(homePPG - awayPPG);
      if (gap >= 0.5) {
        const stronger = homePPG > awayPPG ? "home" : "away";
        const strongPPG = stronger === "home" ? homePPG : awayPPG;
        const weakPPG = stronger === "home" ? awayPPG : homePPG;
        items.push({
          text: `${teamName} are a ${stronger} team: ${strongPPG.toFixed(2)} PPG ${stronger === "home" ? "at home" : "on the road"} vs ${weakPPG.toFixed(2)} PPG ${stronger === "home" ? "away" : "at home"} — a ${gap.toFixed(2)} PPG gap.`,
          accent: "amber",
        });
      }
    }
  }

  return items.slice(0, 5);
}

/**
 * Generate a single punchy headline summarizing a team's season arc.
 * Used by the ChartHeader description when a team is selected.
 */
export function seasonPulseHeadline(
  teamId: string,
  teams: Team[],
  matches: Match[],
  totalWeeks: number
): string {
  const trajectory = getTeamTrajectory(teamId, teams, matches, totalWeeks);
  const events = getTeamEvents(teamId, teams, matches, totalWeeks);
  const team = getTeam(teamId);
  const teamName = team?.short || teamId;

  if (!trajectory || trajectory.length === 0) {
    return `No data available for ${teamName}.`;
  }

  const last = trajectory[trajectory.length - 1];
  if (!last || last.played === 0) {
    return `${teamName}'s season has not yet begun.`;
  }

  // Find the highest-severity event for the headline
  const topEvent = [...events].sort((a, b) => b.severity - a.severity)[0];

  const first = trajectory[0];
  const rankDelta = first.powerRank - last.powerRank; // positive = improved

  if (topEvent && topEvent.severity >= 3) {
    // Lead with the most dramatic event
    const weekRange = events.length >= 2
      ? `Weeks ${events[0].week}-${events[events.length - 1].week}`
      : `Week ${topEvent.week}`;
    return `${teamName}'s season was defined by ${topEvent.title.toLowerCase()} in Week ${topEvent.week} — finishing ${ordinalSuffix(last.powerRank)} with ${last.points} points (${last.ppg.toFixed(2)} PPG) across ${weekRange}.`;
  }

  if (Math.abs(rankDelta) >= 5) {
    const verb = rankDelta > 0 ? "surged" : "slid";
    return `${teamName} ${verb} from ${ordinalSuffix(first.powerRank)} to ${ordinalSuffix(last.powerRank)} over ${totalWeeks} weeks — ${last.wins}W ${last.draws}D ${last.losses}L, ${last.ppg.toFixed(2)} PPG.`;
  }

  return `${teamName} sit ${ordinalSuffix(last.powerRank)} in the power rankings with ${last.points} points from ${last.played} matches (${last.wins}W ${last.draws}D ${last.losses}L, ${last.ppg.toFixed(2)} PPG).`;
}

/**
 * Generate a 2-3 sentence auto-generated paragraph covering a team's overall season arc.
 * Used as the default narrative card when no specific event is clicked.
 */
export function seasonSummaryNarrative(
  teamId: string,
  teams: Team[],
  matches: Match[],
  totalWeeks: number
): string {
  const trajectory = getTeamTrajectory(teamId, teams, matches, totalWeeks);
  const events = getTeamEvents(teamId, teams, matches, totalWeeks);
  const team = getTeam(teamId);
  const teamName = team?.name || teamId;

  if (!trajectory || trajectory.length === 0) return `No season data for ${teamName}.`;

  const last = trajectory[trajectory.length - 1];
  const first = trajectory[0];
  if (!last || last.played === 0) return `${teamName}'s season has not yet begun.`;

  const parts: string[] = [];

  // Opening: overall trajectory
  const rankDelta = first.powerRank - last.powerRank;
  if (Math.abs(rankDelta) >= 5) {
    const verb = rankDelta > 0 ? "climbed" : "dropped";
    parts.push(
      `${teamName} ${verb} from ${ordinalSuffix(first.powerRank)} to ${ordinalSuffix(last.powerRank)} in the power rankings over ${totalWeeks} weeks.`
    );
  } else {
    parts.push(
      `${teamName} finished ${ordinalSuffix(last.powerRank)} in the power rankings with ${last.points} points from ${last.played} matches.`
    );
  }

  // Middle: key events
  const positiveEvents = events.filter(
    (e) =>
      e.type === "winning_streak" ||
      e.type === "unbeaten_run" ||
      e.type === "rank_surge" ||
      e.type === "upset_win"
  );
  const negativeEvents = events.filter(
    (e) =>
      e.type === "losing_streak" ||
      e.type === "winless_run" ||
      e.type === "rank_collapse" ||
      e.type === "upset_loss"
  );

  const topPositive = [...positiveEvents].sort((a, b) => b.severity - a.severity)[0];
  const topNegative = [...negativeEvents].sort((a, b) => b.severity - a.severity)[0];

  if (topPositive && topNegative) {
    parts.push(
      `A ${topPositive.title.toLowerCase()} in Week ${topPositive.week} was the season highlight, while a ${topNegative.title.toLowerCase()} in Week ${topNegative.week} marked the low point.`
    );
  } else if (topPositive) {
    parts.push(
      `The defining moment was a ${topPositive.title.toLowerCase()} in Week ${topPositive.week}.`
    );
  } else if (topNegative) {
    parts.push(
      `A ${topNegative.title.toLowerCase()} in Week ${topNegative.week} defined a difficult campaign.`
    );
  }

  // Closing: final form
  if (last.played >= 5) {
    const formStr = last.form.slice(0, 5).join("");
    parts.push(
      `They closed with a ${formStr} run, finishing on ${last.ppg.toFixed(2)} PPG and a ${last.goalDifference > 0 ? "+" : ""}${last.goalDifference} goal difference.`
    );
  }

  if (events.length === 0) {
    return `${teamName} had a steady season with no major inflection events — finishing ${ordinalSuffix(last.powerRank)} with ${last.points} points (${last.ppg.toFixed(2)} PPG).`;
  }

  return parts.join(" ");
}
