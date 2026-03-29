/**
 * seasonDataLoader.ts — Dynamic Season Data Loader
 *
 * Both 2025 and 2026 season data are loaded asynchronously from static JSON
 * files in /data/. The TEAMS array remains in mlsData.ts for immediate use.
 */

import type { Player, Match, TeamBudget } from "./mlsData";
import { TEAMS } from "./mlsData";

export type SeasonYear = 2025 | 2026;

export interface SeasonData {
  matches: Match[];
  players: Player[];
  teamBudgets: Record<string, TeamBudget>;
  totalWeeks: number;
  seasonYear: SeasonYear;
}

// ─── Shared parser for season JSON payloads ───
function parseSeasonJson(
  json: any,
  seasonYear: SeasonYear,
  fallbackBudgets?: Record<string, TeamBudget>
): SeasonData {
  const matches: Match[] = (json.matches || []).map((m: any) => ({
    id: m.id,
    week: m.week,
    date: m.date,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeGoals: m.homeGoals,
    awayGoals: m.awayGoals,
    attendance: m.attendance || 0,
    venue: m.venue || "",
  }));

  const players: Player[] = (json.players || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    team: p.team,
    position: p.position as Player["position"],
    nationality: p.nationality || "Unknown",
    age: p.age || 25,
    games: p.games || 0,
    starts: p.starts || 0,
    minutes: p.minutes || 0,
    goals: p.goals || 0,
    assists: p.assists || 0,
    yellowCards: p.yellowCards || 0,
    redCards: p.redCards || 0,
    shots: p.shots || 0,
    shotsOnTarget: p.shotsOnTarget || 0,
    shotAccuracy: p.shotAccuracy || 0,
    fouls: p.fouls || 0,
    fouled: p.fouled || 0,
    tackles: p.tackles || 0,
    interceptions: p.interceptions || 0,
    crosses: p.crosses || 0,
    offsides: p.offsides || 0,
    salary: p.salary || 0,
  }));

  const teamBudgets: Record<string, TeamBudget> =
    json.teamBudgets && Object.keys(json.teamBudgets).length > 0
      ? json.teamBudgets
      : fallbackBudgets || {};

  const totalWeeks: number = json.totalWeeks || 5;

  return {
    matches,
    players,
    teamBudgets,
    totalWeeks,
    seasonYear,
  };
}

// ─── 2025 data (loaded on demand) ───
let _season2025: SeasonData | null = null;
let _load2025Promise: Promise<SeasonData> | null = null;

/**
 * Load the 2025 season data from the static JSON file.
 * Returns cached data if already loaded.
 */
export async function load2025Data(): Promise<SeasonData> {
  if (_season2025) return _season2025;
  if (_load2025Promise) return _load2025Promise;

  _load2025Promise = fetch("/data/mls2025.json")
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load 2025 data: ${res.status}`);
      return res.json();
    })
    .then((json) => {
      _season2025 = parseSeasonJson(json, 2025);
      return _season2025;
    })
    .catch((err) => {
      console.error("Failed to load 2025 season data:", err);
      _load2025Promise = null;
      throw err;
    });

  return _load2025Promise;
}

// ─── 2026 data (loaded on demand) ───
let _season2026: SeasonData | null = null;
let _load2026Promise: Promise<SeasonData> | null = null;

/**
 * Load the 2026 season data from the static JSON file.
 * Returns cached data if already loaded.
 */
export async function load2026Data(): Promise<SeasonData> {
  if (_season2026) return _season2026;
  if (_load2026Promise) return _load2026Promise;

  _load2026Promise = fetch("/data/mls2026.json")
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load 2026 data: ${res.status}`);
      return res.json();
    })
    .then((json) => {
      // Use 2025 budgets as fallback for 2026 (salary data not yet published)
      const fallbackBudgets = _season2025?.teamBudgets;
      _season2026 = parseSeasonJson(json, 2026, fallbackBudgets);
      return _season2026;
    })
    .catch((err) => {
      console.error("Failed to load 2026 season data:", err);
      _load2026Promise = null;
      throw err;
    });

  return _load2026Promise;
}

/**
 * Get season data synchronously. Returns null if not yet loaded.
 */
export function getSeasonDataSync(season: SeasonYear): SeasonData | null {
  if (season === 2025) return _season2025;
  return _season2026;
}

/**
 * Get season data, loading if necessary.
 */
export async function getSeasonData(season: SeasonYear): Promise<SeasonData> {
  if (season === 2025) return load2025Data();
  return load2026Data();
}

/**
 * Check if a season's data is already loaded.
 */
export function isSeasonLoaded(season: SeasonYear): boolean {
  if (season === 2025) return _season2025 !== null;
  return _season2026 !== null;
}

/**
 * Load season data for a given year.
 */
export function loadSeasonData(season: SeasonYear): Promise<SeasonData> {
  if (season === 2025) return load2025Data();
  return load2026Data();
}

// Re-export TEAMS since they're shared across seasons
export { TEAMS };
