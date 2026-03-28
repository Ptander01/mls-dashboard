import { useState, useEffect, useCallback, lazy, Suspense, useRef } from "react";
import FilterPanel from "@/components/FilterPanel";
import TabSkeleton from "@/components/TabSkeleton";
import { useFilters } from "@/contexts/FilterContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useIsMobile } from "@/hooks/useMobile";
import {
  Users,
  DollarSign,
  BarChart3,
  Map,
  Target,
  Sun,
  Moon,
  Filter,
  Activity,
  SlidersHorizontal,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

// Lazy-loaded tab components
const PlayerStats = lazy(() => import("@/components/tabs/PlayerStats"));
const TeamBudget = lazy(() => import("@/components/tabs/TeamBudget"));
const Attendance = lazy(() => import("@/components/tabs/Attendance"));
const TravelMap = lazy(() => import("@/components/tabs/TravelMap"));
const PitchMatch = lazy(() => import("@/components/tabs/PitchMatch"));
const SeasonPulse = lazy(() => import("@/components/tabs/SeasonPulse"));

const HERO_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663348511113/fBEeqeVYwBHXg2g2gjhenP/hero-stadium-YUnnMoGMi6PoZPwoH5aXFc.webp";

const tabs = [
  { id: "players", label: "Player Stats", icon: Users },
  { id: "budget", label: "Team Budget", icon: DollarSign },
  { id: "attendance", label: "Attendance", icon: BarChart3 },
  { id: "travel", label: "Travel Map", icon: Map },
  { id: "pitch", label: "Pitch Match", icon: Target },
  { id: "pulse", label: "Season Pulse", icon: Activity },
];

/** Tab content transition variants */
const tabVariants = {
  initial: { opacity: 0, scale: 0.98, filter: "blur(4px)" },
  animate: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    filter: "blur(4px)",
    transition: { duration: 0.15, ease: [0.4, 0, 1, 1] as const },
  },
};

/** Reduced-motion variants — instant swap */
const tabVariantsReduced = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.01 } },
  exit: { opacity: 0, transition: { duration: 0.01 } },
};

/** Render the active tab component */
function TabContent({
  activeTab,
  deepLinkTeam,
  onPulseTeamChange,
}: {
  activeTab: string;
  deepLinkTeam?: string | null;
  onPulseTeamChange?: (teamId: string | null) => void;
}) {
  switch (activeTab) {
    case "players":
      return <PlayerStats />;
    case "budget":
      return <TeamBudget />;
    case "attendance":
      return <Attendance />;
    case "travel":
      return <TravelMap />;
    case "pitch":
      return <PitchMatch />;
    case "pulse":
      return (
        <SeasonPulse
          deepLinkTeam={deepLinkTeam}
          onTeamChange={onPulseTeamChange}
        />
      );
    default:
      return null;
  }
}

// Exploded Z-axis assembly animation component
function ZAssemblyTitle() {
  const [phase, setPhase] = useState(0);
  const { activeSeasonData } = useFilters();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      setPhase(3);
      return;
    }
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 1000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [prefersReducedMotion]);

  const letters = "MLS".split("");
  const word2 = "Analytics".split("");

  return (
    <div className="flex items-baseline gap-1 mb-1 flex-wrap">
      <div
        className="w-1 h-10 rounded-full bg-cyan"
        style={{
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? "scaleY(1)" : "scaleY(0)",
          transition: prefersReducedMotion
            ? "none"
            : "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
          transformOrigin: "bottom",
          boxShadow: "0 0 12px var(--cyan)",
        }}
      />
      <div className="flex">
        {letters.map((l, i) => (
          <span
            key={`mls-${i}`}
            className="text-4xl font-bold inline-block"
            style={{
              fontFamily: "Space Grotesk",
              color: "var(--title-color)",
              opacity: phase >= 1 ? 1 : 0,
              transform:
                phase >= 1
                  ? "perspective(800px) translateZ(0) scale(1)"
                  : `perspective(800px) translateZ(${200 + i * 100}px) scale(${1.3 + i * 0.1})`,
              filter: phase >= 1 ? "blur(0)" : `blur(${6 + i * 2}px)`,
              transition: prefersReducedMotion
                ? "none"
                : `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.08}s`,
            }}
          >
            {l}
          </span>
        ))}
      </div>
      <div className="flex ml-2">
        {word2.map((l, i) => (
          <span
            key={`an-${i}`}
            className="text-4xl font-bold text-cyan inline-block"
            style={{
              fontFamily: "Space Grotesk",
              textShadow: phase >= 2 ? "var(--text-glow-cyan)" : "none",
              opacity: phase >= 2 ? 1 : 0,
              transform:
                phase >= 2
                  ? "perspective(800px) translateZ(0) translateY(0) scale(1)"
                  : `perspective(800px) translateZ(${300 + i * 80}px) translateY(-${10 + i * 3}px) scale(${1.2 + i * 0.05})`,
              filter: phase >= 2 ? "blur(0)" : `blur(${8 + i * 1.5}px)`,
              transition: prefersReducedMotion
                ? "none"
                : `all 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.04}s`,
            }}
          >
            {l}
          </span>
        ))}
      </div>
      <span
        className="text-xs font-mono text-muted-foreground px-2.5 py-1 rounded-full ml-3"
        style={{
          background: "var(--badge-bg)",
          border: "1px solid var(--badge-border)",
          opacity: phase >= 3 ? 1 : 0,
          transform:
            phase >= 3
              ? "perspective(800px) translateZ(0)"
              : "perspective(800px) translateZ(500px)",
          filter: phase >= 3 ? "blur(0)" : "blur(12px)",
          transition: prefersReducedMotion
            ? "none"
            : "all 1s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {activeSeasonData.seasonYear} SEASON{activeSeasonData.seasonYear === 2026 && <span className="ml-1 text-emerald-400">LIVE</span>}
      </span>
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      onClick={toggleTheme}
      className={`theme-toggle-3d ${isDark ? "is-dark" : "is-light"}`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {/* Glow emanation behind the button */}
      <div className="toggle-glow" />
      {/* Recessed cavity */}
      <div className="toggle-cavity" />
      {/* Raised pill that sinks on toggle */}
      <div className="toggle-pill">
        <div className="toggle-icon icon-moon">
          <Moon size={14} style={{ color: "#00d4ff" }} />
        </div>
        <div className="toggle-icon icon-sun">
          <Sun size={14} style={{ color: "#d97706" }} />
        </div>
      </div>
    </button>
  );
}

/** Valid tab IDs for URL deep-linking */
const VALID_TABS = new Set(tabs.map((t) => t.id));

/** Read initial state from URL search params (?tab=pulse&team=LAFC) */
function readUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");
  const team = params.get("team");
  return {
    tab: tab && VALID_TABS.has(tab) ? tab : null,
    team: team || null,
  };
}

/** Write state into URL search params without page reload */
function writeUrlParams(tab: string, team: string | null) {
  const params = new URLSearchParams();
  // Only write params for non-default state
  if (tab !== "players") params.set("tab", tab);
  if (team) params.set("team", team);
  const search = params.toString();
  const url = search ? `${window.location.pathname}?${search}` : window.location.pathname;
  window.history.replaceState(null, "", url);
}

export default function Home() {
  // Read initial tab/team from URL params on mount
  const urlState = readUrlParams();
  const [activeTab, setActiveTab] = useState(urlState.tab || "players");
  const [deepLinkTeam, setDeepLinkTeam] = useState<string | null>(urlState.team);
  const [loaded, setLoaded] = useState(false);
  const { isFilterActive, filteredPlayers, filteredTeams, filteredMatches, activeSeasonData } = useFilters();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const isMobile = useIsMobile();
  const prefersReducedMotion = useReducedMotion();
  const tabScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), prefersReducedMotion ? 0 : 100);
    return () => clearTimeout(t);
  }, [prefersReducedMotion]);

  // Sync tab changes to URL
  const handleTabChange = useCallback((tabId: string) => {
    if (tabId === activeTab) return;
    setActiveTab(tabId);
    // Clear team param when switching away from pulse
    writeUrlParams(tabId, tabId === "pulse" ? null : null);

    // Scroll active tab into view on mobile
    if (tabScrollRef.current) {
      const activeBtn = tabScrollRef.current.querySelector(`[data-tab="${tabId}"]`);
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [activeTab]);

  // Callback for SeasonPulse to report team selection changes to the URL
  const handlePulseTeamChange = useCallback((teamId: string | null) => {
    writeUrlParams("pulse", teamId);
  }, []);

  return (
    <div
      className="min-h-screen noise-bg relative"
      style={{ background: "var(--page-bg)" }}
    >
      {/* Hero Header with cinematic entry */}
      <header className="relative overflow-hidden" style={{ height: "200px" }}>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${HERO_IMG})`,
            filter: `brightness(${isDark ? 0.3 : 0.6}) saturate(1.3) contrast(1.1)`,
            transform: loaded ? "scale(1)" : "scale(1.1)",
            transition: prefersReducedMotion
              ? "none"
              : "transform 2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
        {/* Gradient overlays */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, var(--hero-overlay-from), var(--hero-overlay-mid), var(--hero-overlay-to))`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to right, var(--hero-side-from), transparent, var(--hero-side-to))`,
          }}
        />
        {/* Scan line effect */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ opacity: 0.03 }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "200%",
              background: `repeating-linear-gradient(0deg, transparent, transparent 2px, var(--scan-line-color) 2px, var(--scan-line-color) 4px)`,
              animation: "scan-line 8s linear infinite",
            }}
          />
        </div>

        <div className="relative z-10 h-full flex flex-col justify-end px-4 md:px-6 pb-5">
          <ZAssemblyTitle />
          <div
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? "translateY(0)" : "translateY(20px)",
              transition: prefersReducedMotion
                ? "none"
                : "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 1.2s",
            }}
          >
            <p className="text-xs text-muted-foreground ml-6 font-mono tracking-wider">
              <span style={{ color: "var(--subtitle-color)" }}>///</span>{" "}
              {filteredTeams.length} teams{" "}
              <span style={{ color: "var(--dot-separator)" }}>·</span>{" "}
              {filteredPlayers.length} players{" "}
              <span style={{ color: "var(--dot-separator)" }}>·</span>{" "}
              {filteredMatches.length} matches
              {isFilterActive && (
                <span className="text-cyan ml-2 inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-glow-pulse" />
                  filtered
                </span>
              )}
            </p>
          </div>
        </div>
      </header>

      {/* Tab Navigation — Raised Neumorphic Platform */}
      <nav
        className="sticky top-0 z-30 px-2 md:px-4 py-2"
        style={{
          background: "var(--nav-bg)",
          backdropFilter: "blur(16px) saturate(1.5)",
          opacity: loaded ? 1 : 0,
          transform: loaded ? "translateY(0)" : "translateY(-20px)",
          transition: prefersReducedMotion
            ? "none"
            : "all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.8s",
        }}
      >
        <div
          className="max-w-[2400px] mx-auto neu-raised rounded-xl px-2 md:px-3 py-2 flex items-center"
          style={{
            boxShadow: isDark
              ? "4px 4px 12px rgba(0,0,0,0.5), -2px -2px 8px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.04)"
              : "4px 4px 12px rgba(0,0,0,0.1), -2px -2px 8px rgba(255,255,255,0.7), inset 0 1px 0 rgba(255,255,255,0.6)",
          }}
        >
          {/* Tabs — scrollable icon-only on mobile, full labels on desktop */}
          <div
            ref={tabScrollRef}
            className="flex flex-1 items-center md:justify-between gap-1 md:gap-0 overflow-x-auto scrollbar-hide"
            style={{ scrollSnapType: "x mandatory" }}
          >
            {tabs.map((tab, i) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  data-tab={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className="relative group flex-shrink-0 md:flex-1"
                  title={tab.label}
                  style={{
                    scrollSnapAlign: "center",
                    opacity: loaded ? 1 : 0,
                    transform: loaded
                      ? "perspective(800px) translateZ(0)"
                      : `perspective(800px) translateZ(${150 + i * 60}px)`,
                    filter: loaded ? "blur(0)" : `blur(${4 + i}px)`,
                    transition: prefersReducedMotion
                      ? "none"
                      : `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${0.9 + i * 0.06}s`,
                  }}
                >
                  <div
                    className={`tab-btn flex items-center justify-center gap-2 whitespace-nowrap min-h-[44px] min-w-[44px] ${isActive ? "active" : ""}`}
                  >
                    <Icon size={isMobile ? 18 : 14} />
                    {/* Show label only on md+ screens */}
                    <span className="hidden md:inline">{tab.label}</span>
                  </div>
                  {/* Active indicator line */}
                  {isActive && (
                    <div
                      className="absolute bottom-0 left-2 right-2 md:left-3 md:right-3 h-[2px] rounded-full bg-cyan"
                      style={{
                        boxShadow: "0 0 8px var(--cyan)",
                        animation: prefersReducedMotion
                          ? "none"
                          : "slide-up-fade 0.3s ease-out",
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right side: mobile filter button + filter badge + theme toggle */}
          <div
            className="flex-shrink-0 pl-2 md:pl-3 flex items-center gap-2 md:gap-3 border-l ml-2 md:ml-3"
            style={{ borderColor: "var(--table-border)" }}
          >
            {/* Mobile filter toggle — visible only on <1024px */}
            <FilterPanel.MobileToggle />

            {isFilterActive && (
              <div
                className="hidden md:flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg"
                style={{
                  background: isDark
                    ? "rgba(0, 212, 255, 0.08)"
                    : "rgba(8, 145, 178, 0.08)",
                  border: `1px solid ${isDark ? "rgba(0, 212, 255, 0.2)" : "rgba(8, 145, 178, 0.2)"}`,
                }}
              >
                <Filter size={12} className="text-cyan" />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-glow-pulse" />
                <span className="text-cyan">filtered</span>
              </div>
            )}
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Content Area with AnimatePresence crossfade */}
      <main className="px-3 md:px-4 xl:px-6 2xl:px-8 pb-8 max-w-[2400px] mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={prefersReducedMotion ? tabVariantsReduced : tabVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Suspense fallback={<TabSkeleton />}>
              <TabContent
                activeTab={activeTab}
                deepLinkTeam={deepLinkTeam}
                onPulseTeamChange={handlePulseTeamChange}
              />
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Filter Panel */}
      <FilterPanel />
    </div>
  );
}
