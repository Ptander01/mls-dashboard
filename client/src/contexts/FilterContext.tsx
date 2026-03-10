import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { teams, players, matches, type Player, type Match, type Team } from '@/lib/mlsData';

export interface Filters {
  selectedTeams: string[];
  selectedPlayers: string[];
  ageRange: [number, number];
  minutesRange: [number, number];
  salaryRange: [number, number];
  positionFilter: string[];
  conferenceFilter: string[];
}

interface FilterContextType {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  resetFilters: () => void;
  filteredPlayers: Player[];
  filteredMatches: Match[];
  filteredTeams: Team[];
  isFilterActive: boolean;
}

const defaultFilters: Filters = {
  selectedTeams: [],
  selectedPlayers: [],
  ageRange: [16, 42],
  minutesRange: [0, 3100],
  salaryRange: [0, 15000000],
  positionFilter: [],
  conferenceFilter: [],
};

const FilterContext = createContext<FilterContextType | null>(null);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  const resetFilters = useCallback(() => setFilters(defaultFilters), []);

  const isFilterActive = useMemo(() => {
    return filters.selectedTeams.length > 0 ||
      filters.selectedPlayers.length > 0 ||
      filters.positionFilter.length > 0 ||
      filters.conferenceFilter.length > 0 ||
      filters.ageRange[0] !== 16 || filters.ageRange[1] !== 42 ||
      filters.minutesRange[0] !== 0 || filters.minutesRange[1] !== 3100 ||
      filters.salaryRange[0] !== 0 || filters.salaryRange[1] !== 15000000;
  }, [filters]);

  const filteredTeams = useMemo(() => {
    let t = [...teams];
    if (filters.conferenceFilter.length > 0) {
      t = t.filter(team => filters.conferenceFilter.includes(team.conference));
    }
    if (filters.selectedTeams.length > 0) {
      t = t.filter(team => filters.selectedTeams.includes(team.id));
    }
    return t;
  }, [filters.selectedTeams, filters.conferenceFilter]);

  const filteredPlayers = useMemo(() => {
    let p = [...players];
    const teamIds = filteredTeams.map(t => t.id);
    if (filters.selectedTeams.length > 0 || filters.conferenceFilter.length > 0) {
      p = p.filter(player => teamIds.includes(player.teamId));
    }
    if (filters.selectedPlayers.length > 0) {
      p = p.filter(player => filters.selectedPlayers.includes(player.id));
    }
    if (filters.positionFilter.length > 0) {
      p = p.filter(player => filters.positionFilter.includes(player.position));
    }
    p = p.filter(player => player.age >= filters.ageRange[0] && player.age <= filters.ageRange[1]);
    p = p.filter(player => player.minutesPlayed >= filters.minutesRange[0] && player.minutesPlayed <= filters.minutesRange[1]);
    p = p.filter(player => player.salary >= filters.salaryRange[0] && player.salary <= filters.salaryRange[1]);
    return p;
  }, [filters, filteredTeams]);

  const filteredMatches = useMemo(() => {
    if (filters.selectedTeams.length === 0 && filters.conferenceFilter.length === 0) return matches;
    const teamIds = filteredTeams.map(t => t.id);
    return matches.filter(m => teamIds.includes(m.homeTeamId) || teamIds.includes(m.awayTeamId));
  }, [filters.selectedTeams, filters.conferenceFilter, filteredTeams]);

  return (
    <FilterContext.Provider value={{ filters, setFilters, resetFilters, filteredPlayers, filteredMatches, filteredTeams, isFilterActive }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used within FilterProvider');
  return ctx;
}
