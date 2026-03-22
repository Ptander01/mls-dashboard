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
  PLAYERS,
  MATCHES,
  TEAM_BUDGETS,
  TOTAL_WEEKS,
  SEASON_YEAR,
  type Player,
  type Match,
  type Team,
  type TeamBudget,
} from "@/lib/mlsData";
import {
  load2026Data,
  getSeasonDataSync,
  type SeasonYear,
  type SeasonData,
} from "@/lib/seasonDataLoader";

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
  /** Whether the 2026 data is still loading */
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

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [potteryFocus, setPotteryFocus] = useState<PotteryFocus>({
    emphasizedTeam: null,
  });
  const [season2026Data, setSeason2026Data] = useState<SeasonData | null>(
    getSeasonDataSync(2026)
  );
  const [seasonLoading, setSeasonLoading] = useState(false);

  // Load 2026 data on mount (or when season switches to 2026)
  useEffect(() => {
    if (filters.selectedSeason === 2026 && !season2026Data) {
      setSeasonLoading(true);
      load2026Data()
        .then((data) => {
          setSeason2026Data(data);
          setSeasonLoading(false);
        })
        .catch(() => {
          setSeasonLoading(false);
        });
    }
  }, [filters.selectedSeason, season2026Data]);

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

  // Resolve active season data
  const activeSeasonData = useMemo(() => {
    if (filters.selectedSeason === 2026 && season2026Data) {
      return {
        matches: season2026Data.matches,
        players: season2026Data.players,
        teamBudgets: season2026Data.teamBudgets,
        totalWeeks: season2026Data.totalWeeks,
        seasonYear: 2026 as SeasonYear,
        teams: TEAMS, // Teams are shared across seasons
      };
    }
    // Default: 2025
    return {
      matches: MATCHES,
      players: PLAYERS,
      teamBudgets: TEAM_BUDGETS,
      totalWeeks: TOTAL_WEEKS,
      seasonYear: 2025 as SeasonYear,
      teams: TEAMS,
    };
  }, [filters.selectedSeason, season2026Data]);

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
