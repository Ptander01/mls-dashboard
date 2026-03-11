import { useState, useMemo } from 'react';
import { useFilters } from '@/contexts/FilterContext';
import { TEAMS } from '@/lib/mlsData';
import { ChevronLeft, ChevronRight, Filter, RotateCcw } from 'lucide-react';

export default function FilterPanel() {
  const { filters, setFilters, resetFilters, isFilterActive } = useFilters();
  const [collapsed, setCollapsed] = useState(true);

  const positions = ['GK', 'DF', 'MF', 'FW'];
  const conferences = ['Eastern', 'Western'];

  const toggleTeam = (id: string) => {
    setFilters(prev => ({
      ...prev,
      selectedTeams: prev.selectedTeams.includes(id)
        ? prev.selectedTeams.filter(t => t !== id)
        : [...prev.selectedTeams, id],
    }));
  };

  const togglePosition = (pos: string) => {
    setFilters(prev => ({
      ...prev,
      positionFilter: prev.positionFilter.includes(pos)
        ? prev.positionFilter.filter(p => p !== pos)
        : [...prev.positionFilter, pos],
    }));
  };

  const toggleConference = (conf: string) => {
    setFilters(prev => ({
      ...prev,
      conferenceFilter: prev.conferenceFilter.includes(conf)
        ? prev.conferenceFilter.filter(c => c !== conf)
        : [...prev.conferenceFilter, conf],
    }));
  };

  const formatSalary = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
    return `$${val}`;
  };

  const sortedTeams = useMemo(() => [...TEAMS].sort((a, b) => a.short.localeCompare(b.short)), []);

  return (
    <>
      {/* Collapsed toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-50 neu-raised rounded-r-lg p-2 flex items-center gap-1 transition-all duration-300"
        style={{ left: collapsed ? 0 : '280px' }}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        {collapsed && (
          <span className="flex items-center gap-1">
            <Filter size={14} className="text-cyan" />
            {isFilterActive && <span className="w-2 h-2 rounded-full bg-cyan animate-glow-pulse" />}
          </span>
        )}
      </button>

      {/* Filter Panel */}
      <div
        className={`fixed left-0 top-0 h-full z-40 transition-transform duration-300 ease-out ${collapsed ? '-translate-x-full' : 'translate-x-0'}`}
        style={{ width: '280px' }}
      >
        <div className="h-full neu-flat overflow-y-auto border-r border-white/5 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-cyan" />
              <span className="text-sm font-semibold tracking-wide" style={{ fontFamily: 'Space Grotesk' }}>
                GLOBAL FILTERS
              </span>
            </div>
            {isFilterActive && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-cyan transition-colors"
              >
                <RotateCcw size={12} />
                Reset
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Conference */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Conference
              </label>
              <div className="flex gap-2">
                {conferences.map(conf => (
                  <button
                    key={conf}
                    onClick={() => toggleConference(conf)}
                    className={`flex-1 text-xs py-1.5 rounded-md transition-all ${
                      filters.conferenceFilter.includes(conf)
                        ? 'neu-pressed text-cyan'
                        : 'neu-raised text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {conf}
                  </button>
                ))}
              </div>
            </div>

            {/* Position */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Position
              </label>
              <div className="flex gap-2">
                {positions.map(pos => (
                  <button
                    key={pos}
                    onClick={() => togglePosition(pos)}
                    className={`flex-1 text-xs py-1.5 rounded-md transition-all font-mono ${
                      filters.positionFilter.includes(pos)
                        ? 'neu-pressed text-cyan'
                        : 'neu-raised text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            {/* Teams */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Teams ({filters.selectedTeams.length > 0 ? filters.selectedTeams.length : 'All'})
              </label>
              <div className="neu-concave rounded-lg p-2 max-h-48 overflow-y-auto space-y-0.5">
                {sortedTeams.map(team => (
                  <button
                    key={team.id}
                    onClick={() => toggleTeam(team.id)}
                    className={`w-full text-left text-xs py-1 px-2 rounded flex items-center gap-2 transition-colors ${
                      filters.selectedTeams.includes(team.id)
                        ? 'text-cyan bg-white/5'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/3'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: team.color }}
                    />
                    {team.short}
                  </button>
                ))}
              </div>
            </div>

            {/* Age Range */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Age Range
              </label>
              <div className="flex items-center gap-2 text-xs font-mono text-cyan mb-1">
                <span>{filters.ageRange[0]}</span>
                <span className="text-muted-foreground">—</span>
                <span>{filters.ageRange[1]}</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="range"
                  min={16}
                  max={42}
                  value={filters.ageRange[0]}
                  onChange={e => setFilters(prev => ({ ...prev, ageRange: [+e.target.value, prev.ageRange[1]] }))}
                  className="flex-1"
                />
                <input
                  type="range"
                  min={16}
                  max={42}
                  value={filters.ageRange[1]}
                  onChange={e => setFilters(prev => ({ ...prev, ageRange: [prev.ageRange[0], +e.target.value] }))}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Minutes Range */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Minutes Played
              </label>
              <div className="flex items-center gap-2 text-xs font-mono text-cyan mb-1">
                <span>{filters.minutesRange[0]}</span>
                <span className="text-muted-foreground">—</span>
                <span>{filters.minutesRange[1]}</span>
              </div>
              <input
                type="range"
                min={0}
                max={3500}
                step={50}
                value={filters.minutesRange[1]}
                onChange={e => setFilters(prev => ({ ...prev, minutesRange: [prev.minutesRange[0], +e.target.value] }))}
              />
            </div>

            {/* Salary Range */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Salary
              </label>
              <div className="flex items-center gap-2 text-xs font-mono text-amber mb-1">
                <span>{formatSalary(filters.salaryRange[0])}</span>
                <span className="text-muted-foreground">—</span>
                <span>{formatSalary(filters.salaryRange[1])}</span>
              </div>
              <input
                type="range"
                min={0}
                max={15000000}
                step={100000}
                value={filters.salaryRange[1]}
                onChange={e => setFilters(prev => ({ ...prev, salaryRange: [prev.salaryRange[0], +e.target.value] }))}
              />
            </div>
          </div>

          {/* Active filter count */}
          {isFilterActive && (
            <div className="p-3 border-t border-white/5 text-center">
              <span className="text-xs text-muted-foreground">
                Filters active — showing filtered results
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
