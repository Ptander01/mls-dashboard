import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import {
  TEAMS,
  type Player,
  type Match,
  type Team,
  type TeamBudget,
} from "@/lib/mlsData";
import {
  loadSeasonData,
  getSeasonDataSync,
  type SeasonYear,
  type SeasonData,
} from "@/lib/seasonDataLoader";
import { setInsightEngineSeasonData } from "@/lib/insightEngine";

export interface Filters {
  selectedTeams: string[];
  selectedPlayers: string[];
  ageRange: [number, number];
  minutesRange: [number, number];
  salaryRange: [number, number];
  positionFilter: string[];
  conferenceFilter: string[];
  selectedSeason: SeasonYear;
}

/** Pottery-focus state: which team (if any) is emphasized on the Gravitational Pull chart */
export interface PotteryFocus {
  emphasizedTeam: string | null;
}

interface FilterContextType {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  resetFilters: () => void;
  filteredPlayers: Player[];
  filteredMatches: Match[];
  filteredTeams: Team[];
  isFilterActive: boolean;
  potteryFocus: PotteryFocus;
  setPotteryFocus: React.Dispatch<React.SetStateAction<PotteryFocus>>;
  /** Active season's full data arrays (unfiltered) */
  activeSeasonData: {
    matches: Match[];
    players: Player[];
    teamBudgets: Record<string, TeamBudget>;
    totalWeeks: number;
    seasonYear: SeasonYear;
    teams: Team[];
  };
  /** Whether season data is still loading */
  seasonLoading: boolean;
}

const defaultFilters: Filters = {
  selectedTeams: [],
  selectedPlayers: [],
  ageRange: [16, 42],
  minutesRange: [0, 3500],
  salaryRange: [0, 15000000],
  positionFilter: [],
  conferenceFilter: [],
  selectedSeason: 2026,
};

const FilterContext = createContext<FilterContextType | null>(null);

/** Empty season data placeholder while loading */
const EMPTY_SEASON: SeasonData = {
  matches: [],
  players: [],
  teamBudgets: {},
  totalWeeks: 0,
  seasonYear: 2025,
};

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [potteryFocus, setPotteryFocus] = useState<PotteryFocus>({
    emphasizedTeam: null,
  });
  const [season2025Data, setSeason2025Data] = useState<SeasonData | null>(
    getSeasonDataSync(2025)
  );
  const [season2026Data, setSeason2026Data] = useState<SeasonData | null>(
    getSeasonDataSync(2026)
  );
  const [seasonLoading, setSeasonLoading] = useState(false);

  // Load the selected season's data on mount or when season changes
  useEffect(() => {
    const season = filters.selectedSeason;
    const cached =
      season === 2025 ? season2025Data : season2026Data;

    if (cached) return; // Already loaded

    setSeasonLoading(true);
    loadSeasonData(season)
      .then((data) => {
        if (season === 2025) setSeason2025Data(data);
        else setSeason2026Data(data);
        setSeasonLoading(false);
      })
      .catch(() => {
        setSeasonLoading(false);
      });
  }, [filters.selectedSeason, season2025Data, season2026Data]);

  const resetFilters = useCallback(
    () =>
      setFilters((prev) => ({
        ...defaultFilters,
        selectedSeason: prev.selectedSeason,
      })),
    []
  );

  const isFilterActive = useMemo(() => {
    return (
      filters.selectedTeams.length > 0 ||
      filters.selectedPlayers.length > 0 ||
      filters.positionFilter.length > 0 ||
      filters.conferenceFilter.length > 0 ||
      filters.ageRange[0] !== 16 ||
      filters.ageRange[1] !== 42 ||
      filters.minutesRange[0] !== 0 ||
      filters.minutesRange[1] !== 3500 ||
      filters.salaryRange[0] !== 0 ||
      filters.salaryRange[1] !== 15000000
    );
  }, [filters]);

  // Resolve active season data — returns empty placeholder if still loading
  const activeSeasonData = useMemo(() => {
    const seasonData =
      filters.selectedSeason === 2026 ? season2026Data : season2025Data;

    const resolved = seasonData || EMPTY_SEASON;

    return {
      matches: resolved.matches,
      players: resolved.players,
      teamBudgets: resolved.teamBudgets,
      totalWeeks: resolved.totalWeeks,
      seasonYear: filters.selectedSeason,
      teams: TEAMS, // Teams are shared across seasons
    };
  }, [filters.selectedSeason, season2025Data, season2026Data]);

  // Keep insightEngine in sync with the active season data
  useEffect(() => {
    setInsightEngineSeasonData(activeSeasonData.matches, activeSeasonData.teamBudgets);
  }, [activeSeasonData.matches, activeSeasonData.teamBudgets]);

  const filteredTeams = useMemo(() => {
    let t = [...TEAMS];
    if (filters.conferenceFilter.length > 0) {
      t = t.filter((team) => filters.conferenceFilter.includes(team.conference));
    }
    if (filters.selectedTeams.length > 0) {
      t = t.filter((team) => filters.selectedTeams.includes(team.id));
    }
    return t;
  }, [filters.selectedTeams, filters.conferenceFilter]);

  const filteredPlayers = useMemo(() => {
    let p = [...activeSeasonData.players];
    const teamIds = filteredTeams.map((t) => t.id);
    if (
      filters.selectedTeams.length > 0 ||
      filters.conferenceFilter.length > 0
    ) {
      p = p.filter((player) => teamIds.includes(player.team));
    }
    if (filters.selectedPlayers.length > 0) {
      p = p.filter((player) =>
        filters.selectedPlayers.includes(String(player.id))
      );
    }
    if (filters.positionFilter.length > 0) {
      p = p.filter((player) => filters.positionFilter.includes(player.position));
    }
    p = p.filter(
      (player) =>
        player.age >= filters.ageRange[0] && player.age <= filters.ageRange[1]
    );
    p = p.filter(
      (player) =>
        player.minutes >= filters.minutesRange[0] &&
        player.minutes <= filters.minutesRange[1]
    );
    p = p.filter(
      (player) =>
        player.salary >= filters.salaryRange[0] &&
        player.salary <= filters.salaryRange[1]
    );
    return p;
  }, [filters, filteredTeams, activeSeasonData.players]);

  const filteredMatches = useMemo(() => {
    const allMatches = activeSeasonData.matches;
    if (
      filters.selectedTeams.length === 0 &&
      filters.conferenceFilter.length === 0
    )
      return allMatches;
    const teamIds = filteredTeams.map((t) => t.id);
    return allMatches.filter(
      (m) => teamIds.includes(m.homeTeam) || teamIds.includes(m.awayTeam)
    );
  }, [
    filters.selectedTeams,
    filters.conferenceFilter,
    filteredTeams,
    activeSeasonData.matches,
  ]);

  return (
    <FilterContext.Provider
      value={{
        filters,
        setFilters,
        resetFilters,
        filteredPlayers,
        filteredMatches,
        filteredTeams,
        isFilterActive,
        potteryFocus,
        setPotteryFocus,
        activeSeasonData,
        seasonLoading,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used within FilterProvider");
  return ctx;
}
