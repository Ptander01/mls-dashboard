/**
 * resilienceUtils.ts — Travel Resilience & Performance Data Layer
 *
 * Computes travel burden, home/away performance gaps, squad depth,
 * and a composite Travel Resilience Score for each MLS team.
 * Used by the Performance & Resilience Analysis section under the Travel Map tab.
 */

import type { Team, Player, Match } from './mlsData';
import { TEAMS, PLAYERS, MATCHES, getTeam, calculateDistance } from './mlsData';

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export type ResilienceTier = 'green' | 'cyan' | 'amber' | 'red';

export interface ScoreComponents {
  awayPerformance: number;      // 0–100: away PPG normalized
  congestionResistance: number;  // 0–100: squad depth index
  longHaulRecord: number;        // 0–100: PPG in games > 1000 mi away
}

export interface TeamResilienceMetrics {
  teamId: string;
  teamName: string;
  teamShort: string;
  teamColor: string;
  conference: 'Eastern' | 'Western';
  // Travel burden
  totalAwayMiles: number;
  longestTripMiles: number;
  avgTripMiles: number;
  awayGamesCount: number;
  // Performance splits
  homePPG: number;
  awayPPG: number;
  ppgGap: number;           // homePPG - awayPPG (positive = better at home)
  homeWinPct: number;
  awayWinPct: number;
  winPctGap: number;
  homeGD: number;            // total goal difference at home
  awayGD: number;
  gdGap: number;
  homeGDPerGame: number;
  awayGDPerGame: number;
  gdPerGameGap: number;
  homeGames: number;
  awayGames: number;
  // Squad metrics
  squadDepthIndex: number;   // 0–100, higher = better depth
  weightedAvgAge: number;
  // Composite
  resilienceScore: number;   // 0–100
  resilienceTier: ResilienceTier;
  scoreComponents: ScoreComponents;
}

// ═══════════════════════════════════════════
// TRAVEL METRICS
// ═══════════════════════════════════════════

/**
 * Calculate the total away miles traveled by a team across all away matches.
 * Each away match contributes the distance from the team's home stadium to the opponent's stadium.
 */
export function totalAwayMiles(teamId: string, matches: Match[], teams: Team[]): number {
  const homeTeam = teams.find(t => t.id === teamId);
  if (!homeTeam) return 0;

  return matches
    .filter(m => m.awayTeam === teamId)
    .reduce((total, m) => {
      const opponent = teams.find(t => t.id === m.homeTeam);
      if (!opponent) return total;
      return total + calculateDistance(homeTeam.lat, homeTeam.lng, opponent.lat, opponent.lng);
    }, 0);
}

/**
 * Get per-match away trip distances for a team.
 */
export function awayTripDistances(teamId: string, matches: Match[], teams: Team[]): { match: Match; distance: number }[] {
  const homeTeam = teams.find(t => t.id === teamId);
  if (!homeTeam) return [];

  return matches
    .filter(m => m.awayTeam === teamId)
    .map(m => {
      const opponent = teams.find(t => t.id === m.homeTeam);
      const distance = opponent ? calculateDistance(homeTeam.lat, homeTeam.lng, opponent.lat, opponent.lng) : 0;
      return { match: m, distance };
    })
    .sort((a, b) => b.distance - a.distance);
}

// ═══════════════════════════════════════════
// PERFORMANCE METRICS
// ═══════════════════════════════════════════

/**
 * Calculate Points Per Game for a team in home or away matches.
 * Win = 3 pts, Draw = 1 pt, Loss = 0 pts.
 */
function calculatePPG(teamId: string, matches: Match[], isHome: boolean): { ppg: number; winPct: number; gd: number; gdPerGame: number; games: number } {
  const filtered = matches.filter(m => isHome ? m.homeTeam === teamId : m.awayTeam === teamId);
  if (filtered.length === 0) return { ppg: 0, winPct: 0, gd: 0, gdPerGame: 0, games: 0 };

  let points = 0;
  let wins = 0;
  let totalGD = 0;

  filtered.forEach(m => {
    const teamGoals = isHome ? m.homeGoals : m.awayGoals;
    const oppGoals = isHome ? m.awayGoals : m.homeGoals;
    const gd = teamGoals - oppGoals;
    totalGD += gd;

    if (gd > 0) { points += 3; wins++; }
    else if (gd === 0) { points += 1; }
  });

  return {
    ppg: points / filtered.length,
    winPct: (wins / filtered.length) * 100,
    gd: totalGD,
    gdPerGame: totalGD / filtered.length,
    games: filtered.length,
  };
}

// ═══════════════════════════════════════════
// SQUAD METRICS
// ═══════════════════════════════════════════

/**
 * Squad Depth Index — measures how evenly minutes are distributed among players.
 * Uses an inverted Herfindahl-Hirschman Index (HHI) of minutes shares.
 * Lower HHI = better depth. We normalize to 0–100 where 100 = excellent depth.
 */
export function squadDepthIndex(teamId: string, players: Player[]): number {
  const teamPlayers = players.filter(p => p.team === teamId && p.minutes > 0);
  if (teamPlayers.length < 2) return 0;

  const totalMinutes = teamPlayers.reduce((s, p) => s + p.minutes, 0);
  if (totalMinutes === 0) return 0;

  // HHI = sum of squared market shares
  const hhi = teamPlayers.reduce((s, p) => {
    const share = p.minutes / totalMinutes;
    return s + share * share;
  }, 0);

  // Minimum possible HHI for n players = 1/n (perfectly equal distribution)
  // Maximum HHI = 1 (one player plays all minutes)
  const n = teamPlayers.length;
  const minHHI = 1 / n;
  const maxHHI = 1;

  // Normalize: 0 (worst depth, HHI=1) to 100 (best depth, HHI=1/n)
  if (maxHHI === minHHI) return 50;
  const normalized = ((maxHHI - hhi) / (maxHHI - minHHI)) * 100;
  return Math.max(0, Math.min(100, normalized));
}

/**
 * Weighted average age — age weighted by minutes played.
 */
export function weightedAvgAge(teamId: string, players: Player[]): number {
  const teamPlayers = players.filter(p => p.team === teamId && p.minutes > 0);
  if (teamPlayers.length === 0) return 0;

  const totalMinutes = teamPlayers.reduce((s, p) => s + p.minutes, 0);
  if (totalMinutes === 0) return 0;

  return teamPlayers.reduce((s, p) => s + p.age * p.minutes, 0) / totalMinutes;
}

// ═══════════════════════════════════════════
// LONG-HAUL RECORD
// ═══════════════════════════════════════════

/**
 * Calculate PPG specifically for away games where travel distance exceeds a threshold.
 */
function longHaulPPG(teamId: string, matches: Match[], teams: Team[], thresholdMiles = 1000): number {
  const homeTeam = teams.find(t => t.id === teamId);
  if (!homeTeam) return 0;

  const longHaulMatches = matches
    .filter(m => m.awayTeam === teamId)
    .filter(m => {
      const opponent = teams.find(t => t.id === m.homeTeam);
      if (!opponent) return false;
      return calculateDistance(homeTeam.lat, homeTeam.lng, opponent.lat, opponent.lng) > thresholdMiles;
    });

  if (longHaulMatches.length === 0) return 0;

  let points = 0;
  longHaulMatches.forEach(m => {
    const gd = m.awayGoals - m.homeGoals;
    if (gd > 0) points += 3;
    else if (gd === 0) points += 1;
  });

  return points / longHaulMatches.length;
}

// ═══════════════════════════════════════════
// COMPOSITE RESILIENCE SCORE
// ═══════════════════════════════════════════

function assignTier(score: number): ResilienceTier {
  if (score >= 70) return 'green';
  if (score >= 55) return 'cyan';
  if (score >= 40) return 'amber';
  return 'red';
}

/**
 * Compute the full resilience metrics for a single team.
 */
function computeTeamResilience(
  team: Team,
  matches: Match[],
  teams: Team[],
  players: Player[],
  leagueAwayPPG: number,
  leagueLongHaulPPG: number,
): TeamResilienceMetrics {
  // Travel
  const trips = awayTripDistances(team.id, matches, teams);
  const miles = trips.reduce((s, t) => s + t.distance, 0);
  const longest = trips.length > 0 ? trips[0].distance : 0;
  const avgTrip = trips.length > 0 ? miles / trips.length : 0;

  // Performance
  const home = calculatePPG(team.id, matches, true);
  const away = calculatePPG(team.id, matches, false);

  // Squad
  const depth = squadDepthIndex(team.id, players);
  const avgAge = weightedAvgAge(team.id, players);

  // Long-haul
  const lhPPG = longHaulPPG(team.id, matches, teams, 1000);

  // Score components (each 0–100)
  // Away Performance: normalize away PPG. League max PPG is ~2.5, use 2.5 as ceiling.
  const awayPerfScore = Math.min(100, (away.ppg / 2.5) * 100);

  // Congestion Resistance: directly use squad depth index
  const congestionScore = depth;

  // Long-Haul Record: normalize long-haul PPG similarly
  const longHaulScore = Math.min(100, (lhPPG / 2.5) * 100);

  // Composite: weighted average
  const resilienceScore = awayPerfScore * 0.4 + congestionScore * 0.3 + longHaulScore * 0.3;

  return {
    teamId: team.id,
    teamName: team.name,
    teamShort: team.short,
    teamColor: team.color,
    conference: team.conference,
    totalAwayMiles: Math.round(miles),
    longestTripMiles: Math.round(longest),
    avgTripMiles: Math.round(avgTrip),
    awayGamesCount: trips.length,
    homePPG: Math.round(home.ppg * 100) / 100,
    awayPPG: Math.round(away.ppg * 100) / 100,
    ppgGap: Math.round((home.ppg - away.ppg) * 100) / 100,
    homeWinPct: Math.round(home.winPct * 10) / 10,
    awayWinPct: Math.round(away.winPct * 10) / 10,
    winPctGap: Math.round((home.winPct - away.winPct) * 10) / 10,
    homeGD: home.gd,
    awayGD: away.gd,
    gdGap: home.gd - away.gd,
    homeGDPerGame: Math.round(home.gdPerGame * 100) / 100,
    awayGDPerGame: Math.round(away.gdPerGame * 100) / 100,
    gdPerGameGap: Math.round((home.gdPerGame - away.gdPerGame) * 100) / 100,
    homeGames: home.games,
    awayGames: away.games,
    squadDepthIndex: Math.round(depth * 10) / 10,
    weightedAvgAge: Math.round(avgAge * 10) / 10,
    resilienceScore: Math.round(resilienceScore * 10) / 10,
    resilienceTier: assignTier(resilienceScore),
    scoreComponents: {
      awayPerformance: Math.round(awayPerfScore * 10) / 10,
      congestionResistance: Math.round(congestionScore * 10) / 10,
      longHaulRecord: Math.round(longHaulScore * 10) / 10,
    },
  };
}

// ═══════════════════════════════════════════
// MAIN EXPORT — Compute all teams
// ═══════════════════════════════════════════

/**
 * Compute resilience metrics for all teams. Returns an array sorted by resilienceScore descending.
 */
export function computeAllResilienceMetrics(
  teams: Team[] = TEAMS,
  matches: Match[] = MATCHES,
  players: Player[] = PLAYERS,
): TeamResilienceMetrics[] {
  // League averages for normalization context
  const leagueAwayPPG = (() => {
    let totalPts = 0, totalGames = 0;
    teams.forEach(t => {
      const awayMatches = matches.filter(m => m.awayTeam === t.id);
      awayMatches.forEach(m => {
        const gd = m.awayGoals - m.homeGoals;
        if (gd > 0) totalPts += 3;
        else if (gd === 0) totalPts += 1;
        totalGames++;
      });
    });
    return totalGames > 0 ? totalPts / totalGames : 1;
  })();

  const leagueLongHaulPPG = (() => {
    let totalPts = 0, totalGames = 0;
    teams.forEach(t => {
      const homeTeam = teams.find(tm => tm.id === t.id);
      if (!homeTeam) return;
      matches.filter(m => m.awayTeam === t.id).forEach(m => {
        const opp = teams.find(tm => tm.id === m.homeTeam);
        if (!opp) return;
        const dist = calculateDistance(homeTeam.lat, homeTeam.lng, opp.lat, opp.lng);
        if (dist > 1000) {
          const gd = m.awayGoals - m.homeGoals;
          if (gd > 0) totalPts += 3;
          else if (gd === 0) totalPts += 1;
          totalGames++;
        }
      });
    });
    return totalGames > 0 ? totalPts / totalGames : 1;
  })();

  return teams
    .map(t => computeTeamResilience(t, matches, teams, players, leagueAwayPPG, leagueLongHaulPPG))
    .sort((a, b) => b.resilienceScore - a.resilienceScore);
}

// ═══════════════════════════════════════════
// INSIGHT HEADLINES
// ═══════════════════════════════════════════

/**
 * Generate a two-sentence insight headline for the Dumbbell chart.
 */
export function dumbbellHeadline(metrics: TeamResilienceMetrics[]): string {
  if (metrics.length === 0) return '';

  // Find team with largest PPG gap
  const sorted = [...metrics].sort((a, b) => b.ppgGap - a.ppgGap);
  const worst = sorted[0];
  const best = sorted[sorted.length - 1];

  return `${worst.teamShort} suffers the steepest home-away drop (${worst.ppgGap.toFixed(2)} PPG gap), while ${best.teamShort} is the most road-resilient with just a ${Math.abs(best.ppgGap).toFixed(2)} gap.`;
}

/**
 * Generate a two-sentence insight headline for the Resilience Index chart.
 */
export function resilienceHeadline(metrics: TeamResilienceMetrics[]): string {
  if (metrics.length === 0) return '';

  const top = metrics[0];
  const bottom = metrics[metrics.length - 1];
  const greenCount = metrics.filter(m => m.resilienceTier === 'green').length;
  const redCount = metrics.filter(m => m.resilienceTier === 'red').length;

  return `${top.teamShort} leads the Travel Resilience Index at ${top.resilienceScore.toFixed(1)}, combining strong away form with deep squad rotation. ${redCount} team${redCount !== 1 ? 's' : ''} fall${redCount === 1 ? 's' : ''} into the "Fragile" tier, with ${bottom.teamShort} at the bottom (${bottom.resilienceScore.toFixed(1)}).`;
}

// ═══════════════════════════════════════════
// TIER COLORS — earthy matte palette matching the Team Budget pie chart hues
// ═══════════════════════════════════════════

export const TIER_COLORS_DARK: Record<ResilienceTier, string> = {
  green: '#1E3448',   // deep steel blue — excellent
  cyan: '#1E3A28',    // deep forest green — good
  amber: '#4A3E1A',   // deep olive-brown — vulnerable
  red: '#6A2222',     // deep brick red — fragile
};

export const TIER_COLORS_LIGHT: Record<ResilienceTier, string> = {
  green: '#2A4A64',   // dark steel blue — excellent
  cyan: '#2A4A35',    // dark forest green — good
  amber: '#5A4A2A',   // dark olive-brown — vulnerable
  red: '#8A2A2A',     // dark brick red — fragile
};

/** Legacy single-palette export for backward compatibility */
export const TIER_COLORS: Record<ResilienceTier, string> = TIER_COLORS_DARK;

export function tierColor(tier: ResilienceTier, isDark: boolean): string {
  return isDark ? TIER_COLORS_DARK[tier] : TIER_COLORS_LIGHT[tier];
}

export const TIER_LABELS: Record<ResilienceTier, string> = {
  green: 'Excellent',
  cyan: 'Good',
  amber: 'Vulnerable',
  red: 'Fragile',
};
