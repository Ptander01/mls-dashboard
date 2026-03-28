import { useState, useMemo, useCallback } from "react";
import { useFilters } from "@/contexts/FilterContext";
import { TEAMS } from "@/lib/mlsData";
import { ChevronLeft, ChevronRight, Filter, RotateCcw, SlidersHorizontal } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/useMobile";
import type { SeasonYear } from "@/lib/seasonDataLoader";

// ---------------------------------------------------------------------------
// Shared filter controls (used in both desktop sidebar and mobile sheet)
// ---------------------------------------------------------------------------

function FilterControls() {
  const { filters, setFilters, resetFilters, isFilterActive, seasonLoading } =
    useFilters();

  const positions = ["GK", "DF", "MF", "FW"];
  const conferences = ["Eastern", "Western"];

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

  const setSeason = (season: SeasonYear) => {
    setFilters(prev => ({
      ...prev,
      selectedSeason: season,
      selectedTeams: [],
      selectedPlayers: [],
    }));
  };

  const formatSalary = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
    return `$${val}`;
  };

  const sortedTeams = useMemo(
    () => [...TEAMS].sort((a, b) => a.short.localeCompare(b.short)),
    []
  );

  return (
    <>
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-cyan" />
          <span
            className="text-sm font-semibold tracking-wide"
            style={{ fontFamily: "Space Grotesk, sans-serif" }}
          >
            GLOBAL FILTERS
          </span>
        </div>
        {isFilterActive && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-cyan transition-colors min-h-[44px] min-w-[44px] justify-center"
          >
            <RotateCcw size={12} />
            Reset
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Season Toggle */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            Season
          </label>
          <div className="flex gap-2">
            {([2025, 2026] as SeasonYear[]).map(season => (
              <button
                key={season}
                onClick={() => setSeason(season)}
                className={`flex-1 text-xs py-2.5 rounded-md transition-all font-mono relative min-h-[44px] ${
                  filters.selectedSeason === season
                    ? "neu-pressed text-cyan"
                    : "neu-raised text-muted-foreground hover:text-foreground"
                }`}
              >
                {season}
                {season === 2026 && (
                  <span
                    className="ml-1 text-[8px] uppercase tracking-wider"
                    style={{
                      color:
                        filters.selectedSeason === 2026
                          ? "var(--emerald)"
                          : "var(--muted-foreground)",
                    }}
                  >
                    LIVE
                  </span>
                )}
                {season === 2026 && seasonLoading && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </div>

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
                className={`flex-1 text-xs py-2.5 rounded-md transition-all min-h-[44px] ${
                  filters.conferenceFilter.includes(conf)
                    ? "neu-pressed text-cyan"
                    : "neu-raised text-muted-foreground hover:text-foreground"
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
                className={`flex-1 text-xs py-2.5 rounded-md transition-all font-mono min-h-[44px] ${
                  filters.positionFilter.includes(pos)
                    ? "neu-pressed text-cyan"
                    : "neu-raised text-muted-foreground hover:text-foreground"
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
            Teams (
            {filters.selectedTeams.length > 0
              ? filters.selectedTeams.length
              : "All"}
            )
          </label>
          <div className="neu-concave rounded-lg p-2 max-h-48 overflow-y-auto space-y-0.5">
            {sortedTeams.map(team => (
              <button
                key={team.id}
                onClick={() => toggleTeam(team.id)}
                className={`w-full text-left text-xs py-2 px-2 rounded flex items-center gap-2 transition-colors min-h-[44px] ${
                  filters.selectedTeams.includes(team.id)
                    ? "text-cyan bg-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
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
              onChange={e =>
                setFilters(prev => ({
                  ...prev,
                  ageRange: [+e.target.value, prev.ageRange[1]],
                }))
              }
              className="flex-1"
            />
            <input
              type="range"
              min={16}
              max={42}
              value={filters.ageRange[1]}
              onChange={e =>
                setFilters(prev => ({
                  ...prev,
                  ageRange: [prev.ageRange[0], +e.target.value],
                }))
              }
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
            <span>{filters.minutesRange[0].toLocaleString()}</span>
            <span className="text-muted-foreground">—</span>
            <span>{filters.minutesRange[1].toLocaleString()}</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-6 flex-shrink-0">
                Min
              </span>
              <input
                type="range"
                min={0}
                max={3500}
                step={50}
                value={filters.minutesRange[0]}
                onChange={e => {
                  const val = +e.target.value;
                  setFilters(prev => ({
                    ...prev,
                    minutesRange: [
                      Math.min(val, prev.minutesRange[1]),
                      prev.minutesRange[1],
                    ],
                  }));
                }}
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-6 flex-shrink-0">
                Max
              </span>
              <input
                type="range"
                min={0}
                max={3500}
                step={50}
                value={filters.minutesRange[1]}
                onChange={e => {
                  const val = +e.target.value;
                  setFilters(prev => ({
                    ...prev,
                    minutesRange: [
                      prev.minutesRange[0],
                      Math.max(val, prev.minutesRange[0]),
                    ],
                  }));
                }}
                className="flex-1"
              />
            </div>
          </div>
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
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-6 flex-shrink-0">
                Min
              </span>
              <input
                type="range"
                min={0}
                max={15000000}
                step={100000}
                value={filters.salaryRange[0]}
                onChange={e => {
                  const val = +e.target.value;
                  setFilters(prev => ({
                    ...prev,
                    salaryRange: [
                      Math.min(val, prev.salaryRange[1]),
                      prev.salaryRange[1],
                    ],
                  }));
                }}
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-6 flex-shrink-0">
                Max
              </span>
              <input
                type="range"
                min={0}
                max={15000000}
                step={100000}
                value={filters.salaryRange[1]}
                onChange={e => {
                  const val = +e.target.value;
                  setFilters(prev => ({
                    ...prev,
                    salaryRange: [
                      prev.salaryRange[0],
                      Math.max(val, prev.salaryRange[0]),
                    ],
                  }));
                }}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Active filter count */}
      {isFilterActive && (
        <div className="p-3 border-t text-center">
          <span className="text-xs text-muted-foreground">
            Filters active — showing filtered results
          </span>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Mobile Bottom Sheet
// ---------------------------------------------------------------------------

function MobileFilterSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[85vh] rounded-t-2xl flex flex-col"
        style={{
          background: "var(--neu-bg-flat)",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div
            className="w-10 h-1 rounded-full"
            style={{ background: "var(--table-border)" }}
          />
        </div>
        <FilterControls />
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Desktop Sidebar
// ---------------------------------------------------------------------------

function DesktopFilterSidebar() {
  const [collapsed, setCollapsed] = useState(true);
  const { isFilterActive } = useFilters();

  return (
    <>
      {/* Collapsed toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-50 neu-raised rounded-r-lg p-2 flex items-center gap-1 transition-all duration-300 min-h-[44px]"
        style={{ left: collapsed ? 0 : "280px" }}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        {collapsed && (
          <span className="flex items-center gap-1">
            <Filter size={14} className="text-cyan" />
            {isFilterActive && (
              <span className="w-2 h-2 rounded-full bg-cyan animate-glow-pulse" />
            )}
          </span>
        )}
      </button>

      {/* Filter Panel */}
      <div
        className={`fixed left-0 top-0 h-full z-40 transition-transform duration-300 ease-out ${collapsed ? "-translate-x-full" : "translate-x-0"}`}
        style={{ width: "280px" }}
      >
        <div className="h-full neu-flat overflow-y-auto border-r flex flex-col">
          <FilterControls />
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main FilterPanel component
// ---------------------------------------------------------------------------

// Shared state for mobile sheet open/close (lifted to module scope for MobileToggle)
let _mobileSheetOpen = false;
let _setMobileSheetOpen: ((v: boolean) => void) | null = null;

export default function FilterPanel() {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Register the setter so MobileToggle can open the sheet
  _mobileSheetOpen = mobileOpen;
  _setMobileSheetOpen = setMobileOpen;

  if (isMobile) {
    return null; // Mobile sheet is rendered via MobileFilterSheet below
  }

  // Desktop: render the slide-out sidebar (hidden on <1024px via CSS)
  return (
    <div className="hidden lg:block">
      <DesktopFilterSidebar />
    </div>
  );
}

// Expose a MobileToggle sub-component for the nav bar
FilterPanel.MobileToggle = function MobileToggle() {
  const isMobile = useIsMobile();
  const { isFilterActive } = useFilters();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Only show on screens < 1024px
  if (!isMobile && typeof window !== "undefined" && window.innerWidth >= 1024) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg relative"
        title="Open Filters"
        aria-label="Open Filters"
      >
        <SlidersHorizontal size={18} className="text-muted-foreground" />
        {isFilterActive && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan animate-glow-pulse" />
        )}
      </button>
      <MobileFilterSheet open={mobileOpen} onOpenChange={setMobileOpen} />
    </>
  );
};
