import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useFilters, type PotteryFocus } from "@/contexts/FilterContext";
import { TEAMS, MATCHES, getTeam } from "@/lib/mlsData";
import {
  mutedTeamColor,
  Extruded3DBar,
  Extruded3DHorizontalBar,
  Extruded3DBarWithCeiling,
  Extruded3DBarFillRate,
  lighten,
  darken,
  hexToRgba,
} from "@/lib/chartUtils";
import NeuCard from "@/components/NeuCard";
import AnimatedCounter from "@/components/AnimatedCounter";
import { ChartModal, MaximizeButton } from "@/components/ChartModal";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  LineChart,
  Cell,
  ReferenceLine,
  Customized,
} from "recharts";
import {
  Users,
  TrendingUp,
  TrendingDown,
  MapPin,
  Globe,
  Target,
  Home,
  BarChart3,
  Percent,
  Eye,
  X,
  Layers,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { InsightPanel } from "@/components/InsightPanel";
import {
  attendanceHeadline,
  attendanceInsights,
  attendanceTrendCardInsights,
  capacityFillCardInsights,
  gravPullCardInsights,
  gravitationalPullHeadline,
  awayImpactCardInsights,
  homeResponseCardInsights,
} from "@/lib/insightEngine";
import {
  CardInsightToggle,
  CardInsightSection,
} from "@/components/CardInsight";
import { ChartHeader } from "@/components/ui/ChartHeader";
import StaggerContainer, { StaggerItem } from "@/components/StaggerContainer";

// ─── Stadium Capacities (expandable max for multi-use venues) ───
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

export default function Attendance() {
  const {
    filters,
    filteredTeams,
    filteredMatches,
    potteryFocus,
    setPotteryFocus,
  } = useFilters();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [maximized, setMaximized] = useState<string | null>(null);
  const [showFillRate, setShowFillRate] = useState(false);
  const [trendTeamOverride, setTrendTeamOverride] = useState<string | "">("");
  const [showCapacityInsights, setShowCapacityInsights] = useState(false);
  const [showTrendInsights, setShowTrendInsights] = useState(false);
  const [showGravInsights, setShowGravInsights] = useState(false);
  const [showAwayImpactInsights, setShowAwayImpactInsights] = useState(false);
  const [showHomeResponseInsights, setShowHomeResponseInsights] =
    useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [gravMode, setGravMode] = useState<"FULL SCALE" | "FOCUSED">("FOCUSED");

  const emphasizedTeam = potteryFocus.emphasizedTeam;
  const setEmphasizedTeam = (teamId: string | null) =>
    setPotteryFocus({ emphasizedTeam: teamId });

  // Auto-select team when exactly one team is filtered globally
  useEffect(() => {
    if (filters.selectedTeams.length === 1) {
      setSelectedTeam(filters.selectedTeams[0]);
      setTrendTeamOverride(filters.selectedTeams[0]);
    }
  }, [filters.selectedTeams]);

  const effectiveTrendTeam = useMemo(() => {
    if (trendTeamOverride) return trendTeamOverride;
    if (filters.selectedTeams.length === 1) return filters.selectedTeams[0];
    return "";
  }, [trendTeamOverride, filters.selectedTeams]);

  // ═══ SUMMARY STATS ═══
  const avgAttendance = useMemo(() => {
    const withAtt = filteredMatches.filter(m => m.attendance > 0);
    if (withAtt.length === 0) return 0;
    return withAtt.reduce((s, m) => s + m.attendance, 0) / withAtt.length;
  }, [filteredMatches]);

  const totalAttendance = useMemo(
    () => filteredMatches.reduce((s, m) => s + m.attendance, 0),
    [filteredMatches]
  );

  const highestMatch = useMemo(() => {
    if (filteredMatches.length === 0) return null;
    return [...filteredMatches].sort((a, b) => b.attendance - a.attendance)[0];
  }, [filteredMatches]);

  // ═══ HOME AVERAGE ATTENDANCE ═══
  const homeAvgData = useMemo(() => {
    return filteredTeams
      .map(t => {
        const homeMatches = filteredMatches.filter(
          m => m.homeTeam === t.id && m.attendance > 0
        );
        const avg =
          homeMatches.length > 0
            ? homeMatches.reduce((s, m) => s + m.attendance, 0) /
              homeMatches.length
            : 0;
        const cap = STADIUM_CAPACITY[t.id] || 0;
        const fillPct = cap > 0 ? Math.round((avg / cap) * 100) : 0;
        return {
          name: t.short,
          id: t.id,
          avg: Math.round(avg),
          capacity: cap,
          fillPct,
          color: mutedTeamColor(t.id, isDark),
        };
      })
      .sort((a, b) => (showFillRate ? b.fillPct - a.fillPct : b.avg - a.avg));
  }, [filteredTeams, filteredMatches, showFillRate, isDark]);

  // ═══ WEEKLY TREND ═══
  const weeklyData = useMemo(() => {
    const matchesForTrend = effectiveTrendTeam
      ? filteredMatches.filter(
          m => m.homeTeam === effectiveTrendTeam && m.attendance > 0
        )
      : filteredMatches.filter(m => m.attendance > 0);
    const byWeek: Record<number, number[]> = {};
    matchesForTrend.forEach(m => {
      if (!byWeek[m.week]) byWeek[m.week] = [];
      byWeek[m.week].push(m.attendance);
    });
    return Object.entries(byWeek)
      .map(([week, atts]) => ({
        week: +week,
        avg: Math.round(atts.reduce((s, a) => s + a, 0) / atts.length),
        max: Math.max(...atts),
        min: Math.min(...atts),
      }))
      .sort((a, b) => a.week - b.week);
  }, [filteredMatches, effectiveTrendTeam]);

  const trendCapacity = useMemo(() => {
    if (effectiveTrendTeam) return STADIUM_CAPACITY[effectiveTrendTeam] || 0;
    const caps = filteredTeams
      .map(t => STADIUM_CAPACITY[t.id] || 0)
      .filter(c => c > 0);
    return caps.length > 0
      ? Math.round(caps.reduce((s, c) => s + c, 0) / caps.length)
      : 0;
  }, [filteredTeams, effectiveTrendTeam]);

  const trendTeamObj = effectiveTrendTeam ? getTeam(effectiveTrendTeam) : null;
  const trendColor = effectiveTrendTeam
    ? mutedTeamColor(effectiveTrendTeam, isDark)
    : "var(--cyan)";

  // ═══ GRAVITATIONAL PULL ═══
  const gravitationalPull = useMemo(() => {
    const homeAvgs: Record<string, number> = {};
    TEAMS.forEach(t => {
      const hm = MATCHES.filter(m => m.homeTeam === t.id && m.attendance > 0);
      homeAvgs[t.id] =
        hm.length > 0
          ? hm.reduce((s, m) => s + m.attendance, 0) / hm.length
          : 0;
    });
    return TEAMS.map(t => {
      const awayGames = MATCHES.filter(
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
        name: t.short,
        id: t.id,
        totalDelta: Math.round(totalDelta),
        avgDelta: matchCount > 0 ? Math.round(totalDelta / matchCount) : 0,
        matches: matchCount,
        color: mutedTeamColor(t.id, isDark),
      };
    }).sort((a, b) => b.totalDelta - a.totalDelta);
  }, [isDark]);

  // ═══ DRILL-DOWN: Away Impact ═══
  const awayImpactData = useMemo(() => {
    if (!selectedTeam) return [];
    const homeAvgs: Record<string, number> = {};
    TEAMS.forEach(t => {
      const hm = MATCHES.filter(m => m.homeTeam === t.id && m.attendance > 0);
      homeAvgs[t.id] =
        hm.length > 0
          ? hm.reduce((s, m) => s + m.attendance, 0) / hm.length
          : 0;
    });
    const byHost: Record<string, number[]> = {};
    MATCHES.filter(
      m => m.awayTeam === selectedTeam && m.attendance > 0
    ).forEach(m => {
      if (!byHost[m.homeTeam]) byHost[m.homeTeam] = [];
      byHost[m.homeTeam].push(m.attendance);
    });
    return Object.entries(byHost)
      .map(([hostId, atts]) => {
        const avgAtt = atts.reduce((s, a) => s + a, 0) / atts.length;
        const hostAvg = homeAvgs[hostId] || 0;
        return {
          hostTeam: getTeam(hostId)?.short || hostId,
          hostId,
          delta: Math.round(avgAtt - hostAvg),
          avgAtt: Math.round(avgAtt),
          hostAvg: Math.round(hostAvg),
          matches: atts.length,
          color: mutedTeamColor(hostId, isDark),
        };
      })
      .sort((a, b) => b.delta - a.delta);
  }, [selectedTeam, isDark]);

  // ═══ DRILL-DOWN: Home Response ═══
  const homeResponseData = useMemo(() => {
    if (!selectedTeam) return [];
    const homeMatches = MATCHES.filter(
      m => m.homeTeam === selectedTeam && m.attendance > 0
    );
    if (homeMatches.length === 0) return [];
    const avgHome =
      homeMatches.reduce((s, m) => s + m.attendance, 0) / homeMatches.length;
    const byAway: Record<string, number[]> = {};
    homeMatches.forEach(m => {
      if (!byAway[m.awayTeam]) byAway[m.awayTeam] = [];
      byAway[m.awayTeam].push(m.attendance);
    });
    return Object.entries(byAway)
      .map(([awayId, atts]) => {
        const awayAvg = atts.reduce((s, a) => s + a, 0) / atts.length;
        return {
          awayTeam: getTeam(awayId)?.short || awayId,
          awayId,
          delta: Math.round(awayAvg - avgHome),
          avgAtt: Math.round(awayAvg),
          homeAvg: Math.round(avgHome),
          matches: atts.length,
          color: mutedTeamColor(awayId, isDark),
        };
      })
      .sort((a, b) => b.delta - a.delta);
  }, [selectedTeam, isDark]);

  /* Insight engine */
  const _headline = useMemo(
    () => attendanceHeadline(filteredMatches, filteredTeams),
    [filteredMatches, filteredTeams]
  );

  const attInsights = useMemo(
    () => attendanceInsights(filteredMatches, filteredTeams),
    [filteredMatches, filteredTeams]
  );

  /* Per-card insights */
  const capacityFillInsights = useMemo(
    () => capacityFillCardInsights(filteredTeams, filteredMatches),
    [filteredTeams, filteredMatches]
  );
  const trendInsights = useMemo(
    () => attendanceTrendCardInsights(filteredMatches, filteredTeams),
    [filteredMatches, filteredTeams]
  );
  const gravInsights = useMemo(
    () => gravPullCardInsights(filteredTeams, filteredMatches),
    [filteredTeams, filteredMatches]
  );
  const awayImpactInsights = useMemo(
    () => (selectedTeam ? awayImpactCardInsights(selectedTeam, MATCHES) : []),
    [selectedTeam]
  );
  const homeResponseInsights = useMemo(
    () => (selectedTeam ? homeResponseCardInsights(selectedTeam, MATCHES) : []),
    [selectedTeam]
  );
  const gravHeadline = useMemo(
    () => gravitationalPullHeadline(filteredTeams),
    [filteredTeams]
  );

  const selectedTeamObj = selectedTeam ? getTeam(selectedTeam) : null;
  const selectedHomeAvg = useMemo(() => {
    if (!selectedTeam) return 0;
    const hm = MATCHES.filter(
      m => m.homeTeam === selectedTeam && m.attendance > 0
    );
    return hm.length > 0
      ? Math.round(hm.reduce((s, m) => s + m.attendance, 0) / hm.length)
      : 0;
  }, [selectedTeam]);

  // ═══════════════════════════════════════════
  // CHART COMPONENTS
  // ═══════════════════════════════════════════

  // ═══ BAR CHART ANIMATION STATE ═══
  const barChartRendered = useRef(false);
  const [barAnimKey, setBarAnimKey] = useState(0);
  const suppressBarAnim = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      barChartRendered.current = true;
    }, 700);
    return () => clearTimeout(timer);
  }, []);

  // When toggling between Absolute / Fill Rate, bump the animation key so bars re-animate
  useEffect(() => {
    if (barChartRendered.current) {
      suppressBarAnim.current = false;
      setBarAnimKey(k => k + 1);
    }
  }, [showFillRate]);

  const handleBarClick = useCallback(
    (d: any) => {
      suppressBarAnim.current = true;
      if (selectedTeam === d.id) {
        // Toggle off — clear all tab-wide filtering
        setSelectedTeam(null);
        setTrendTeamOverride("");
        setEmphasizedTeam(null);
      } else {
        // Set tab-wide team filter: selectedTeam drives drill-downs,
        // trendTeamOverride drives the weekly trend, emphasizedTeam drives pottery focus
        setSelectedTeam(d.id);
        setTrendTeamOverride(d.id);
        setEmphasizedTeam(d.id);
      }
    },
    [selectedTeam]
  );

  const HomeBarContent = ({ height = 400 }: { height?: number }) => {
    const dataKey = showFillRate ? "fillPct" : "avg";
    const deemphasizedFill = isDark ? "#2a2a2a" : "#e8e8e8";
    return (
      <div style={{ height }}>
        <ResponsiveContainer>
          <BarChart
            data={homeAvgData}
            margin={{ top: 5, right: 10, bottom: 60, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--table-border)" />
            <XAxis
              dataKey="name"
              stroke="var(--table-header-color)"
              fontSize={9}
              tickLine={false}
              angle={-45}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              stroke="var(--table-header-color)"
              fontSize={10}
              tickLine={false}
              domain={
                showFillRate
                  ? [
                      0,
                      Math.ceil(
                        Math.max(...homeAvgData.map(d => d.fillPct), 100) * 1.15
                      ),
                    ]
                  : [0, "auto"]
              }
              tickFormatter={showFillRate ? (v: number) => `${v}%` : undefined}
            />
            <Tooltip
              wrapperStyle={{
                position: "fixed",
                zIndex: 9999,
                pointerEvents: "none",
              }}
              content={({ payload }) => {
                if (!payload?.length) return null;
                const d = payload[0].payload;
                const pct =
                  d.capacity > 0 ? Math.round((d.avg / d.capacity) * 100) : 0;
                return (
                  <div
                    className="glass-sm p-2 text-xs"
                    style={{ fontFamily: "JetBrains Mono, monospace" }}
                  >
                    <div className="font-semibold" style={{ color: d.color }}>
                      {d.name}
                    </div>
                    <div>
                      Avg:{" "}
                      <span className="text-amber">
                        {d.avg.toLocaleString()}
                      </span>
                    </div>
                    {d.capacity > 0 && (
                      <>
                        <div style={{ color: "var(--glass-text-muted)" }}>
                          Capacity: {d.capacity.toLocaleString()}
                        </div>
                        <div>
                          Fill Rate:{" "}
                          <span
                            className={
                              pct >= 90
                                ? "text-emerald"
                                : pct >= 70
                                  ? "text-amber"
                                  : "text-coral"
                            }
                          >
                            {pct}%
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                );
              }}
            />
            <Bar
              dataKey={dataKey}
              radius={[4, 4, 0, 0]}
              cursor="pointer"
              onClick={(d: any) => handleBarClick(d)}
              isAnimationActive={!suppressBarAnim.current}
              animationDuration={700}
              animationEasing="ease-in-out"
              key={`bar_${barAnimKey}`}
              shape={
                showFillRate
                  ? (props: any) => <Extruded3DBarFillRate {...props} />
                  : (props: any) => <Extruded3DBarWithCeiling {...props} />
              }
            >
              {homeAvgData.map((d, i) => {
                const isSelected = selectedTeam === d.id;
                const isDeemphasized = selectedTeam !== null && !isSelected;
                return (
                  <Cell
                    key={d.id}
                    fill={isDeemphasized ? deemphasizedFill : d.color}
                    stroke={
                      isSelected ? (isDark ? "#ffffff" : "#333333") : "none"
                    }
                    strokeWidth={isSelected ? 2 : 0}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // ─── Catmull-Rom spline helper: converts points to a smooth SVG cubic bezier path ───
  const catmullRomPath = (
    pts: Array<{ x: number; y: number }>,
    tension = 0.35
  ): string => {
    if (pts.length < 2) return "";
    if (pts.length === 2)
      return `M${pts[0].x},${pts[0].y} L${pts[1].x},${pts[1].y}`;
    const d: string[] = [`M${pts[0].x},${pts[0].y}`];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;
      d.push(`C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`);
    }
    return d.join(" ");
  };

  // ─── Custom 3D Area Polygon Renderer ───
  // Renders a filled area from the smooth top curve down to the baseline
  // with matte gradient fill, side extrusion, and cast shadow — playdough aesthetic
  const Area3DPolygon = ({
    points,
    baselineY,
    areaColor,
    opacity = 1,
    layerOffset = 0,
    isGhost = false,
  }: {
    points: Array<{ x: number; y: number }>;
    baselineY: number;
    areaColor: string;
    opacity?: number;
    layerOffset?: number; // vertical offset for multi-team stacking
    isGhost?: boolean; // true for the league-average ghost outline
  }) => {
    if (!points || points.length < 2) return null;
    const id = `area3d_${Math.random().toString(36).slice(2, 8)}`;
    const extrudeDepth = isGhost ? 2 : 4; // 3D extrusion depth
    const shadowOffY = isGhost ? 4 : 8;
    const shadowBlur = isGhost ? 3 : 5;

    // Offset all points by layerOffset
    const pts = layerOffset
      ? points.map(p => ({ x: p.x, y: p.y - layerOffset }))
      : points;
    // Bottom-face offset: lift the baseline up so the area sits above the X-axis line (same as bar charts)
    const bottomOffset = isGhost ? 0 : extrudeDepth;
    const baseline = baselineY - layerOffset - bottomOffset;

    // Colors
    const topColor = lighten(areaColor, isGhost ? 0.2 : 0.35);
    const midColor = areaColor;
    const botColor = darken(areaColor, isGhost ? 0.15 : 0.3);
    const sideColor = darken(areaColor, 0.45);

    // Build smooth top curve path
    const topCurve = catmullRomPath(pts);
    // Build area path: smooth top curve → straight line down to baseline → back along bottom
    const firstPt = pts[0];
    const lastPt = pts[pts.length - 1];
    const areaPath = `${topCurve} L${lastPt.x},${baseline} L${firstPt.x},${baseline} Z`;

    // Shadow path: same shape but offset down
    const shadowPts = pts.map(p => ({ x: p.x + 3, y: p.y + shadowOffY }));
    const shadowCurve = catmullRomPath(shadowPts);
    const shadowPath = `${shadowCurve} L${lastPt.x + 3},${baseline + shadowOffY} L${firstPt.x + 3},${baseline + shadowOffY} Z`;

    // Right-side extrusion face: a parallelogram along the right edge
    const rightSidePath = `M${lastPt.x},${pts[pts.length - 1].y} L${lastPt.x + extrudeDepth},${pts[pts.length - 1].y + extrudeDepth} L${lastPt.x + extrudeDepth},${baseline + extrudeDepth} L${lastPt.x},${baseline} Z`;

    // Bottom extrusion face: a parallelogram along the baseline
    const bottomFacePath = `M${firstPt.x},${baseline} L${firstPt.x + extrudeDepth},${baseline + extrudeDepth} L${lastPt.x + extrudeDepth},${baseline + extrudeDepth} L${lastPt.x},${baseline} Z`;

    // Top bevel highlight: a thin strip along the top curve to simulate rounded edge
    // We create a second curve offset slightly upward and use the reverse spline for the bottom edge
    const bevelPts = pts.map(p => ({ x: p.x, y: p.y - 1.2 }));
    const bevelCurve = catmullRomPath(bevelPts);
    // Build reverse spline path for the original top curve (going right-to-left)
    const reversePts = [...pts].reverse();
    const reverseTopCurve = catmullRomPath(reversePts);
    // The bevel strip is the area between the bevel curve (top) and the original top curve (bottom)
    const bevelPath = `${bevelCurve} L${lastPt.x},${pts[pts.length - 1].y} ${reverseTopCurve.replace(/^M/, "L")} Z`;

    if (isGhost) {
      // Ghost mode: just a subtle outline with very faint fill
      return (
        <g opacity={0.3}>
          <path
            d={areaPath}
            fill={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"}
            stroke={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"}
            strokeWidth={1.5}
            strokeDasharray="6 4"
          />
        </g>
      );
    }

    return (
      <g opacity={opacity}>
        <defs>
          {/* Main area gradient — matte, no glossy highlights */}
          <linearGradient id={`${id}_grad`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={topColor} stopOpacity={0.92} />
            <stop
              offset="15%"
              stopColor={lighten(midColor, 0.12)}
              stopOpacity={0.88}
            />
            <stop offset="50%" stopColor={midColor} stopOpacity={0.82} />
            <stop
              offset="85%"
              stopColor={darken(midColor, 0.1)}
              stopOpacity={0.78}
            />
            <stop offset="100%" stopColor={botColor} stopOpacity={0.85} />
          </linearGradient>
          {/* Side face gradient */}
          <linearGradient id={`${id}_side`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={sideColor} stopOpacity={0.8} />
            <stop
              offset="100%"
              stopColor={darken(areaColor, 0.55)}
              stopOpacity={0.9}
            />
          </linearGradient>
          {/* Shadow filter */}
          <filter
            id={`${id}_shadowF`}
            x="-10%"
            y="-10%"
            width="130%"
            height="140%"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation={shadowBlur} />
          </filter>
          {/* Top bevel highlight gradient */}
          <linearGradient id={`${id}_bevel`} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={lighten(areaColor, 0.35)}
              stopOpacity={0.4}
            />
            <stop offset="100%" stopColor={topColor} stopOpacity={0.05} />
          </linearGradient>
        </defs>

        {/* Cast shadow */}
        <path
          d={shadowPath}
          fill="rgba(0,0,0,0.3)"
          filter={`url(#${id}_shadowF)`}
        />

        {/* Bottom extrusion face */}
        <path
          d={bottomFacePath}
          fill={darken(areaColor, 0.45)}
          fillOpacity={0.6}
        />

        {/* Right-side extrusion face */}
        <path d={rightSidePath} fill={`url(#${id}_side)`} />

        {/* Main area fill — the front face */}
        <path d={areaPath} fill={`url(#${id}_grad)`} />

        {/* Top bevel highlight — smooth rounded edge effect (matte, subtle) */}
        <path d={bevelPath} fill={`url(#${id}_bevel)`} opacity={0.5} />

        {/* Top edge line — subtle, defines the ridge */}
        <path
          d={topCurve}
          fill="none"
          stroke={topColor}
          strokeWidth={1.2}
          strokeOpacity={0.6}
        />

        {/* Bottom edge contact shadow */}
        <line
          x1={firstPt.x}
          y1={baseline}
          x2={lastPt.x}
          y2={baseline}
          stroke={darken(areaColor, 0.4)}
          strokeWidth={1}
          strokeOpacity={0.3}
        />

        {/* Data point dots removed for clean putty-edge aesthetic */}
      </g>
    );
  };

  // ─── Custom 3D Braille Dots Reference Line Renderer ───
  // ═══ VARIABLE BRAILLE LINE — follows per-week data curve with smooth Catmull-Rom spline ═══
  const BrailleVariableLine = ({
    points,
    label,
    labelColor,
    dotColor,
  }: {
    points: Array<{ x: number; y: number }>;
    label: string;
    labelColor: string;
    dotColor?: string;
  }) => {
    if (!points || points.length < 2) return null;
    const dotRadius = 2.0;
    const minSpacing = 8;
    const id = `braille_var_${Math.random().toString(36).slice(2, 8)}`;

    // Catmull-Rom spline interpolation for smooth curves between data points
    const catmullRomInterpolate = (
      pts: Array<{ x: number; y: number }>,
      tension = 0.35
    ): Array<{ x: number; y: number }> => {
      if (pts.length < 2) return pts;
      const result: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(pts.length - 1, i + 2)];
        // Estimate segment arc length for dot count
        const segLen = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
        const numDots = Math.max(2, Math.floor(segLen / minSpacing));
        for (let j = 0; j < numDots; j++) {
          const t = j / numDots;
          const t2 = t * t;
          const t3 = t2 * t;
          // Catmull-Rom basis functions
          const x =
            0.5 *
            (2 * p1.x +
              (-p0.x + p2.x) * t +
              (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
              (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
          const y =
            0.5 *
            (2 * p1.y +
              (-p0.y + p2.y) * t +
              (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
              (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
          result.push({ x, y });
        }
      }
      // Add the last point
      result.push(pts[pts.length - 1]);
      return result;
    };

    // Interpolate points along the smooth spline curve
    const allDots = catmullRomInterpolate(points);

    const lastPt = points[points.length - 1];
    return (
      <g>
        <defs>
          <filter
            id={`${id}_dotShadow`}
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" />
          </filter>
          <radialGradient id={`${id}_dotGrad`} cx="35%" cy="30%" r="65%">
            <stop
              offset="0%"
              stopColor={dotColor || "#ffffff"}
              stopOpacity={0.95}
            />
            <stop
              offset="40%"
              stopColor={dotColor ? dotColor : "#e8e4dc"}
              stopOpacity={0.85}
            />
            <stop offset="75%" stopColor="#b8b4ac" stopOpacity={0.7} />
            <stop offset="100%" stopColor="#888480" stopOpacity={0.6} />
          </radialGradient>
        </defs>
        {allDots.map((dot, di) => (
          <g key={`vdot_${di}`}>
            <ellipse
              cx={dot.x + 1.2}
              cy={dot.y + 1.8}
              rx={dotRadius + 0.6}
              ry={dotRadius * 0.45 + 0.4}
              fill="rgba(0,0,0,0.3)"
              filter={`url(#${id}_dotShadow)`}
            />
            <circle
              cx={dot.x}
              cy={dot.y}
              r={dotRadius}
              fill={`url(#${id}_dotGrad)`}
            />
            <circle
              cx={dot.x - dotRadius * 0.3}
              cy={dot.y - dotRadius * 0.3}
              r={dotRadius * 0.3}
              fill="rgba(255,255,255,0.7)"
            />
          </g>
        ))}
        {/* Label at end */}
        <text
          x={lastPt.x + 8}
          y={lastPt.y + 3}
          fill={labelColor}
          fontSize={9}
          fontFamily="JetBrains Mono, monospace"
        >
          {label}
        </text>
      </g>
    );
  };

  const BrailleReferenceDots = ({
    y: refY,
    xStart,
    xEnd,
    label,
    labelColor,
  }: {
    y: number;
    xStart: number;
    xEnd: number;
    label: string;
    labelColor: string;
  }) => {
    if (!refY || refY <= 0) return null;
    const dotRadius = 2.2;
    const dotSpacing = 10;
    const lineLen = xEnd - xStart;
    const dotCount = Math.max(2, Math.floor(lineLen / dotSpacing));
    const actualSpacing = lineLen / dotCount;
    const id = `braille_ref_${Math.random().toString(36).slice(2, 8)}`;
    return (
      <g>
        <defs>
          <filter
            id={`${id}_dotShadow`}
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
          </filter>
          <radialGradient id={`${id}_dotGrad`} cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.95} />
            <stop offset="40%" stopColor="#e8e4dc" stopOpacity={0.85} />
            <stop offset="75%" stopColor="#b8b4ac" stopOpacity={0.7} />
            <stop offset="100%" stopColor="#888480" stopOpacity={0.6} />
          </radialGradient>
        </defs>
        {Array.from({ length: dotCount + 1 }, (_, di) => {
          const dotX = xStart + di * actualSpacing;
          return (
            <g key={`rdot_${di}`}>
              <ellipse
                cx={dotX + 1.5}
                cy={refY + 2}
                rx={dotRadius + 0.8}
                ry={dotRadius * 0.5 + 0.5}
                fill="rgba(0,0,0,0.35)"
                filter={`url(#${id}_dotShadow)`}
              />
              <circle
                cx={dotX}
                cy={refY}
                r={dotRadius}
                fill={`url(#${id}_dotGrad)`}
              />
              <circle
                cx={dotX - dotRadius * 0.3}
                cy={refY - dotRadius * 0.3}
                r={dotRadius * 0.35}
                fill="rgba(255,255,255,0.7)"
              />
            </g>
          );
        })}
        {/* Label */}
        <text
          x={xEnd + 6}
          y={refY + 3}
          fill={labelColor}
          fontSize={9}
          fontFamily="JetBrains Mono, monospace"
        >
          {label}
        </text>
      </g>
    );
  };

  // ═══ LEAGUE-WIDE WEEKLY DATA (for ghost overlay when a team is selected) ═══
  const leagueWeeklyData = useMemo(() => {
    const allWithAtt = filteredMatches.filter(m => m.attendance > 0);
    const byWeek: Record<number, number[]> = {};
    allWithAtt.forEach(m => {
      if (!byWeek[m.week]) byWeek[m.week] = [];
      byWeek[m.week].push(m.attendance);
    });
    return Object.entries(byWeek)
      .map(([week, atts]) => ({
        week: +week,
        avg: Math.round(atts.reduce((s, a) => s + a, 0) / atts.length),
        max: Math.max(...atts),
        min: Math.min(...atts),
      }))
      .sort((a, b) => a.week - b.week);
  }, [filteredMatches]);

  const WeeklyContent = ({ height = 240 }: { height?: number }) => {
    const areaColor = effectiveTrendTeam
      ? trendColor
      : isDark
        ? "#3A6A7A"
        : "#4A7A8A";
    // Merge league data with team data for the chart domain
    // When a team is selected, we show both the team area and a ghost league average
    const showGhost = !!effectiveTrendTeam;
    const chartData = weeklyData; // primary data source (team or league avg)

    // Compute Y domain — always start at 0 (the filled polygon represents the crowd mass).
    // When a team is filtered, cap the max at the team's own max (not the league max)
    // so there isn't a huge empty gap above their line.
    const teamMaxVals = weeklyData.map(d => d.max);
    const teamMax = teamMaxVals.length > 0 ? Math.max(...teamMaxVals) : 50000;

    // When a team is selected: use their max + capacity (whichever is higher) as ceiling
    // When no team: use the league-wide max
    const yMax = showGhost
      ? Math.max(teamMax, trendCapacity || 0)
      : teamMaxVals.length > 0
        ? Math.max(...teamMaxVals, ...leagueWeeklyData.map(d => d.max))
        : 50000;

    // For league view: check if min/max are actually different from avg (multiple games per week)
    const hasVariation = !showGhost && weeklyData.some(d => d.max !== d.min);

    return (
      <div style={{ height }}>
        <ResponsiveContainer>
          <LineChart
            data={chartData}
            margin={{ top: 15, right: 120, bottom: 5, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--table-border)" />
            <XAxis
              dataKey="week"
              stroke="var(--table-header-color)"
              fontSize={10}
              tickLine={false}
            />
            <YAxis
              stroke="var(--table-header-color)"
              fontSize={10}
              tickLine={false}
              domain={[0, Math.ceil(yMax * 1.1)]}
            />
            <Tooltip
              wrapperStyle={{
                position: "fixed",
                zIndex: 9999,
                pointerEvents: "none",
              }}
              content={({ payload }) => {
                if (!payload?.length) return null;
                const d = payload[0]?.payload;
                if (!d) return null;
                const leagueWeek = showGhost
                  ? leagueWeeklyData.find(lw => lw.week === d.week)
                  : null;
                return (
                  <div
                    className="glass-sm p-2 text-xs"
                    style={{ fontFamily: "JetBrains Mono, monospace" }}
                  >
                    <div className="font-semibold" style={{ color: areaColor }}>
                      Week {d.week}
                    </div>
                    <div>
                      Attendance:{" "}
                      <span className="text-amber">
                        {d.avg?.toLocaleString()}
                      </span>
                    </div>
                    {/* League view: show the spread */}
                    {!showGhost && d.max !== d.min && (
                      <>
                        <div style={{ color: "var(--glass-text-muted)" }}>
                          High: {d.max?.toLocaleString()}
                        </div>
                        <div style={{ color: "var(--glass-text-muted)" }}>
                          Low: {d.min?.toLocaleString()}
                        </div>
                      </>
                    )}
                    {/* Team view: show capacity context */}
                    {showGhost && trendCapacity > 0 && (
                      <div style={{ color: "var(--glass-text-muted)" }}>
                        {Math.round((d.avg / trendCapacity) * 100)}% of capacity
                        ({trendCapacity.toLocaleString()})
                      </div>
                    )}
                    {leagueWeek && (
                      <div
                        style={{
                          color: "var(--glass-text-muted)",
                          borderTop: "1px solid var(--table-border)",
                          paddingTop: 3,
                          marginTop: 3,
                        }}
                      >
                        League Avg: {leagueWeek.avg?.toLocaleString()}
                      </div>
                    )}
                  </div>
                );
              }}
            />
            {/* Hidden line to drive Recharts data/tooltip — Area3DPolygon renders the visual */}
            <Line
              type="monotone"
              dataKey="avg"
              stroke="transparent"
              strokeWidth={0}
              name={
                effectiveTrendTeam
                  ? `${trendTeamObj?.short} Home Attendance`
                  : "Avg Attendance"
              }
              animationDuration={0}
              dot={false}
              activeDot={{
                r: 5,
                fill: areaColor,
                stroke: isDark ? "#ffffff" : "#333333",
                strokeWidth: 2,
              }}
            />
            {/* Max line — drives variable braille dots */}
            <Line
              type="monotone"
              dataKey="max"
              stroke="transparent"
              strokeWidth={0}
              dot={false}
              name="Max"
            />
            {/* Min line — drives variable braille dots */}
            <Line
              type="monotone"
              dataKey="min"
              stroke="transparent"
              strokeWidth={0}
              dot={false}
              name="Min"
            />
            {/* 3D Area Polygon + braille reference dots rendered as Customized overlay */}
            <Customized
              component={(props: any) => {
                const { xAxisMap, yAxisMap, formattedGraphicalItems } = props;
                if (
                  !formattedGraphicalItems ||
                  formattedGraphicalItems.length === 0
                )
                  return null;
                const avgLine = formattedGraphicalItems[0];
                if (!avgLine?.props?.points) return null;
                const pts = avgLine.props.points.filter(
                  (p: any) => p.x != null && p.y != null
                );
                if (pts.length < 2) return null;
                const xAxis = xAxisMap && (Object.values(xAxisMap)[0] as any);
                const yAxis = yAxisMap && (Object.values(yAxisMap)[0] as any);
                const chartLeft = xAxis?.x || 0;
                const chartRight = (xAxis?.x || 0) + (xAxis?.width || 0);
                const baselineY = yAxis ? yAxis.scale(0) : 0;

                // Build ghost league-average points when a team is selected
                let ghostPts: Array<{ x: number; y: number }> | null = null;
                if (showGhost && yAxis) {
                  ghostPts = leagueWeeklyData
                    .map(lw => {
                      // Map league week to x position using the same x scale
                      const matchingPt = pts.find((p: any) => {
                        const ptData = chartData.find(
                          cd => cd.week === lw.week
                        );
                        return ptData !== undefined;
                      });
                      // Use xAxis scale if available
                      const xPos = xAxis?.scale ? xAxis.scale(lw.week) : 0;
                      const yPos = yAxis.scale(lw.avg);
                      return { x: xPos, y: yPos };
                    })
                    .filter(p => p.x > 0 && !isNaN(p.y));
                }

                // Build variable max and min braille dot points
                // formattedGraphicalItems: [0]=avg, [1]=max, [2]=min
                const maxLine = formattedGraphicalItems[1];
                const minLine = formattedGraphicalItems[2];
                const maxPts =
                  maxLine?.props?.points?.filter(
                    (p: any) => p.x != null && p.y != null
                  ) || [];
                const minPts =
                  minLine?.props?.points?.filter(
                    (p: any) => p.x != null && p.y != null
                  ) || [];

                // Capacity braille dots (when a team is selected)
                const capYPx =
                  yAxis && trendCapacity > 0
                    ? yAxis.scale(trendCapacity)
                    : null;

                return (
                  <g>
                    {/* Ghost league average area (when a specific team is selected) */}
                    {ghostPts && ghostPts.length >= 2 && (
                      <Area3DPolygon
                        points={ghostPts}
                        baselineY={baselineY}
                        areaColor={isDark ? "#5A6A7A" : "#8A9AAA"}
                        isGhost={true}
                      />
                    )}
                    {/* Primary 3D area polygon */}
                    <Area3DPolygon
                      points={pts}
                      baselineY={baselineY}
                      areaColor={areaColor}
                    />
                    {/* League view: show min/max spread as braille dots */}
                    {hasVariation && minPts.length >= 2 && (
                      <BrailleVariableLine
                        points={minPts.map((p: any) => ({ x: p.x, y: p.y }))}
                        label={`Low`}
                        labelColor={
                          isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.35)"
                        }
                      />
                    )}
                    {hasVariation && maxPts.length >= 2 && (
                      <BrailleVariableLine
                        points={maxPts.map((p: any) => ({ x: p.x, y: p.y }))}
                        label={`High`}
                        labelColor={
                          isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.35)"
                        }
                      />
                    )}
                    {/* Team view: capacity braille dots only */}
                    {effectiveTrendTeam &&
                      capYPx != null &&
                      trendCapacity > 0 && (
                        <BrailleReferenceDots
                          y={capYPx}
                          xStart={chartLeft}
                          xEnd={chartRight}
                          label={`${trendTeamObj?.short} Capacity ${(trendCapacity / 1000).toFixed(1)}k`}
                          labelColor={
                            isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.4)"
                          }
                        />
                      )}
                  </g>
                );
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const GravitationalPullContent = ({ height = 700 }: { height?: number }) => {
    // ── FULL SCALE mode: true linear scale showing all teams including Miami's full bar ──
    // ── FOCUSED mode: X-axis capped at ~LAFC, Miami bleeds off edge, pottery focus enabled ──
    const isFullScale = gravMode === "FULL SCALE";

    // Data slicing — FULL SCALE shows top 10, FOCUSED shows all 30
    const displayData = isFullScale
      ? gravitationalPull.slice(0, 10)
      : gravitationalPull;
    const remainingCount = isFullScale ? gravitationalPull.length - 10 : 0;

    // Domain calculation
    const topTeam = gravitationalPull[0];
    const secondHighest =
      gravitationalPull.length > 1 ? gravitationalPull[1].totalDelta : 0;
    const minVal = Math.min(...displayData.map(d => d.totalDelta));
    const topMultiple =
      secondHighest > 0 ? (topTeam.totalDelta / secondHighest).toFixed(1) : "—";

    // FULL SCALE: show the entire range including Miami's outlier value
    // FOCUSED: cap at ~1.25x the second-highest (LAFC) so the pack is visible and Miami bleeds off
    const xDomain: [number, number] = isFullScale
      ? [Math.min(minVal, 0), Math.round(topTeam.totalDelta * 1.08)]
      : [Math.min(minVal * 1.05, 0), Math.round(secondHighest * 1.25)];

    const chartHeight = isFullScale ? Math.max(350, 10 * 35) : height;

    // Global tab filtering click handler
    const handleBarClick = (d: any) => {
      if (selectedTeam === d.id) {
        // Toggle off — clear all tab-wide filtering
        setSelectedTeam(null);
        setTrendTeamOverride("");
        setEmphasizedTeam(null);
      } else {
        // Set tab-wide team filter
        setSelectedTeam(d.id);
        setTrendTeamOverride(d.id);
        if (!isFullScale) setEmphasizedTeam(d.id);
      }
    };

    return (
      <div
        style={{ height: chartHeight, position: "relative" }}
        className={isFullScale ? "overflow-visible" : "overflow-hidden"}
      >
        <ResponsiveContainer>
          <BarChart
            data={displayData}
            layout="vertical"
            margin={{
              top: 5,
              right: isFullScale ? 120 : 60,
              bottom: 5,
              left: 5,
            }}
            style={isFullScale ? ({ overflow: "visible" } as any) : undefined}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--table-border)" />
            <XAxis
              type="number"
              stroke="var(--table-header-color)"
              fontSize={10}
              tickLine={false}
              domain={xDomain}
              tickFormatter={(v: number) =>
                v >= 0
                  ? `+${(v / 1000).toFixed(0)}k`
                  : `${(v / 1000).toFixed(0)}k`
              }
            />
            <YAxis
              dataKey="name"
              type="category"
              stroke="var(--table-header-color)"
              fontSize={9}
              tickLine={false}
              width={110}
              tick={({ x, y, payload }: any) => {
                const item = displayData.find(d => d.name === payload.value);
                const isEmphasized = emphasizedTeam === item?.id;
                const isDeemphasized =
                  emphasizedTeam && emphasizedTeam !== item?.id;
                return (
                  <g
                    transform={`translate(${x},${y})`}
                    style={{ cursor: "pointer" }}
                    onClick={() => item && handleBarClick(item)}
                  >
                    <circle
                      cx={-100}
                      cy={0}
                      r={4}
                      fill={
                        isDeemphasized
                          ? isDark
                            ? "#3a3830"
                            : "#c8c4bc"
                          : item?.color || "#666"
                      }
                      opacity={isDeemphasized ? 0.5 : 1}
                    />
                    <text
                      x={-92}
                      y={0}
                      dy={4}
                      textAnchor="start"
                      fill={
                        isDeemphasized
                          ? isDark
                            ? "#5a5850"
                            : "#a8a4a0"
                          : "var(--table-header-color)"
                      }
                      fontSize={isEmphasized ? 10 : 9}
                      fontWeight={isEmphasized ? 700 : 400}
                      style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                    >
                      {payload.value}
                    </text>
                  </g>
                );
              }}
            />
            <ReferenceLine x={0} stroke="var(--border)" strokeWidth={1} />
            <Tooltip
              wrapperStyle={{
                position: "fixed",
                zIndex: 9999,
                pointerEvents: "none",
              }}
              content={({ payload }) => {
                if (!payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div
                    className="glass-sm p-3 text-xs"
                    style={{ fontFamily: "JetBrains Mono, monospace" }}
                  >
                    <div
                      className="font-semibold mb-1"
                      style={{ color: d.color }}
                    >
                      {d.name}
                    </div>
                    <div>
                      Net Impact:{" "}
                      <span
                        className={
                          d.totalDelta >= 0 ? "text-emerald" : "text-coral"
                        }
                      >
                        {d.totalDelta >= 0 ? "+" : ""}
                        {d.totalDelta.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      Avg Delta/Game:{" "}
                      <span
                        className={
                          d.avgDelta >= 0 ? "text-emerald" : "text-coral"
                        }
                      >
                        {d.avgDelta >= 0 ? "+" : ""}
                        {d.avgDelta.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ color: "var(--glass-text-muted)" }}>
                      Away Games: {d.matches}
                    </div>
                    {isFullScale && d.id === topTeam.id && (
                      <div
                        className="mt-1 pt-1 border-t"
                        style={{ borderColor: "var(--glass-border)" }}
                      >
                        <span className="text-cyan font-semibold">
                          {topMultiple}x
                        </span>
                        <span style={{ color: "var(--glass-text-muted)" }}>
                          {" "}
                          the next-closest team
                        </span>
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Bar
              dataKey="totalDelta"
              radius={[0, 4, 4, 0]}
              cursor="pointer"
              onClick={(d: any) => handleBarClick(d)}
              shape={(props: any) => {
                const teamId = props.payload?.id;
                const isEmp = emphasizedTeam === teamId;
                const isDemp = !!(emphasizedTeam && emphasizedTeam !== teamId);
                return (
                  <Extruded3DHorizontalBar
                    {...props}
                    emphasized={!isFullScale && isEmp}
                    deemphasized={!isFullScale && isDemp}
                    isDarkTheme={isDark}
                  />
                );
              }}
            >
              {displayData.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.color}
                  stroke={
                    selectedTeam === d.id
                      ? isDark
                        ? "#ffffff"
                        : "#333333"
                      : "none"
                  }
                  strokeWidth={selectedTeam === d.id ? 2 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* FULL SCALE mode: end-of-bar label for top team */}
        {isFullScale && topTeam && (
          <div
            className="absolute top-2 right-2 text-right"
            style={{ fontFamily: "JetBrains Mono, monospace" }}
          >
            <div
              className="text-[10px] font-semibold"
              style={{ color: topTeam.color }}
            >
              {topTeam.name}: +{topTeam.totalDelta.toLocaleString()}
            </div>
            <div className="text-[9px] text-cyan font-bold">
              {topMultiple}x next highest
            </div>
          </div>
        )}

        {/* FULL SCALE mode: remaining teams hint */}
        {isFullScale && remainingCount > 0 && (
          <div className="text-center mt-1">
            <span className="text-[10px] text-muted-foreground italic">
              + {remainingCount} more teams (switch to FOCUSED to see all)
            </span>
          </div>
        )}
      </div>
    );
  };

  const AwayImpactContent = ({ height = 400 }: { height?: number }) => {
    if (!selectedTeam || awayImpactData.length === 0) {
      return (
        <div
          className="flex items-center justify-center text-muted-foreground text-sm"
          style={{ height }}
        >
          Click a team in the Gravitational Pull chart to see their away impact
        </div>
      );
    }
    // Find the boundary between positive and negative deltas for the separator
    const positiveCount = awayImpactData.filter(d => d.delta >= 0).length;
    const negativeCount = awayImpactData.length - positiveCount;
    return (
      <>
        <div style={{ height }}>
          <ResponsiveContainer>
            <BarChart
              data={awayImpactData}
              layout="vertical"
              margin={{ top: 5, right: 30, bottom: 5, left: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--table-border)"
              />
              <XAxis
                type="number"
                stroke="var(--table-header-color)"
                fontSize={10}
                tickLine={false}
                tickFormatter={(v: number) =>
                  v >= 0 ? `+${v.toLocaleString()}` : v.toLocaleString()
                }
              />
              <YAxis
                dataKey="hostTeam"
                type="category"
                stroke="var(--table-header-color)"
                fontSize={9}
                tickLine={false}
                width={110}
                tick={({ x, y, payload }: any) => {
                  const item = awayImpactData.find(
                    d => d.hostTeam === payload.value
                  );
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <circle
                        cx={-100}
                        cy={0}
                        r={4}
                        fill={item?.color || "#666"}
                      />
                      <text
                        x={-92}
                        y={0}
                        dy={4}
                        textAnchor="start"
                        fill="var(--table-header-color)"
                        fontSize={9}
                      >
                        {payload.value}
                      </text>
                    </g>
                  );
                }}
              />
              <ReferenceLine x={0} stroke="var(--border)" strokeWidth={1} />
              <Tooltip
                wrapperStyle={{
                  position: "fixed",
                  zIndex: 9999,
                  pointerEvents: "none",
                }}
                content={({ payload }) => {
                  if (!payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div
                      className="glass-sm p-3 text-xs"
                      style={{ fontFamily: "JetBrains Mono, monospace" }}
                    >
                      <div className="font-semibold mb-1">
                        <span
                          style={{
                            color: mutedTeamColor(selectedTeam!, isDark),
                          }}
                        >
                          {selectedTeamObj?.short}
                        </span>
                        <span style={{ color: "var(--glass-text-muted)" }}>
                          {" "}
                          visiting{" "}
                        </span>
                        <span style={{ color: d.color }}>{d.hostTeam}</span>
                      </div>
                      <div>
                        Delta:{" "}
                        <span
                          className={
                            d.delta >= 0 ? "text-emerald" : "text-coral"
                          }
                        >
                          {d.delta >= 0 ? "+" : ""}
                          {d.delta.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        Actual Attendance:{" "}
                        <span className="text-cyan">
                          {d.avgAtt.toLocaleString()}
                        </span>
                      </div>
                      <div style={{ color: "var(--glass-text-muted)" }}>
                        Host Avg: {d.hostAvg.toLocaleString()}
                      </div>
                      <div style={{ color: "var(--glass-text-muted)" }}>
                        Matches: {d.matches}
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="delta"
                radius={[0, 4, 4, 0]}
                shape={(props: any) => <Extruded3DHorizontalBar {...props} />}
              >
                {awayImpactData.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {positiveCount > 0 && negativeCount > 0 && (
          <p
            className="text-[10px] text-muted-foreground text-center mt-1"
            style={{ fontFamily: "JetBrains Mono, monospace" }}
          >
            <span className="text-emerald">{positiveCount} cities</span> drew
            more fans than their own average when {selectedTeamObj?.short}{" "}
            visited
            {" \u2014 "}
            <span className="text-coral">{negativeCount}</span> drew fewer.
          </p>
        )}
      </>
    );
  };

  const HomeResponseContent = ({ height = 400 }: { height?: number }) => {
    if (!selectedTeam || homeResponseData.length === 0) {
      return (
        <div
          className="flex items-center justify-center text-muted-foreground text-sm"
          style={{ height }}
        >
          Click a team in the Gravitational Pull chart to see their home
          response
        </div>
      );
    }
    return (
      <div style={{ height }}>
        <ResponsiveContainer>
          <BarChart
            data={homeResponseData}
            layout="vertical"
            margin={{ top: 5, right: 30, bottom: 5, left: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--table-border)" />
            <XAxis
              type="number"
              stroke="var(--table-header-color)"
              fontSize={10}
              tickLine={false}
              tickFormatter={(v: number) =>
                v >= 0 ? `+${v.toLocaleString()}` : v.toLocaleString()
              }
            />
            <YAxis
              dataKey="awayTeam"
              type="category"
              stroke="var(--table-header-color)"
              fontSize={9}
              tickLine={false}
              width={110}
              tick={({ x, y, payload }: any) => {
                const item = homeResponseData.find(
                  d => d.awayTeam === payload.value
                );
                return (
                  <g transform={`translate(${x},${y})`}>
                    <circle
                      cx={-100}
                      cy={0}
                      r={4}
                      fill={item?.color || "#666"}
                    />
                    <text
                      x={-92}
                      y={0}
                      dy={4}
                      textAnchor="start"
                      fill="var(--table-header-color)"
                      fontSize={9}
                    >
                      {payload.value}
                    </text>
                  </g>
                );
              }}
            />
            <ReferenceLine x={0} stroke="var(--border)" strokeWidth={1} />
            <Tooltip
              wrapperStyle={{
                position: "fixed",
                zIndex: 9999,
                pointerEvents: "none",
              }}
              content={({ payload }) => {
                if (!payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div
                    className="glass-sm p-3 text-xs"
                    style={{ fontFamily: "JetBrains Mono, monospace" }}
                  >
                    <div className="font-semibold mb-1">
                      <span style={{ color: d.color }}>{d.awayTeam}</span>
                      <span style={{ color: "var(--glass-text-muted)" }}>
                        {" "}
                        visiting{" "}
                      </span>
                      <span
                        style={{ color: mutedTeamColor(selectedTeam!, isDark) }}
                      >
                        {selectedTeamObj?.short}
                      </span>
                    </div>
                    <div>
                      Delta:{" "}
                      <span
                        className={d.delta >= 0 ? "text-emerald" : "text-coral"}
                      >
                        {d.delta >= 0 ? "+" : ""}
                        {d.delta.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      Actual Attendance:{" "}
                      <span className="text-cyan">
                        {d.avgAtt.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ color: "var(--glass-text-muted)" }}>
                      {selectedTeamObj?.short} Home Avg:{" "}
                      {d.homeAvg.toLocaleString()}
                    </div>
                    <div style={{ color: "var(--glass-text-muted)" }}>
                      Matches: {d.matches}
                    </div>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="delta"
              radius={[0, 4, 4, 0]}
              shape={(props: any) => <Extruded3DHorizontalBar {...props} />}
            >
              {homeResponseData.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <StaggerContainer className="space-y-6 mt-4">
      {/* Tab Header Card — elevated command center */}
      <StaggerItem>
        <NeuCard variant="raised" animate={false} className="p-5">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Attendance</span> —
            Explore match-day attendance across all MLS venues. The bar chart
            ranks teams by average home attendance (toggle to fill rate to see
            stadium utilization). The dotted white line shows stadium capacity.
            The trend chart tracks weekly attendance patterns, and the
            drill-down panels reveal how specific away teams affect turnout.
          </p>
          <InsightPanel
            insights={attInsights}
            isDark={isDark}
            onToggle={setIsAnalyzing}
          />
        </NeuCard>
      </StaggerItem>

      {/* League-Wide Totals */}
      <StaggerItem>
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <div
              className="w-1 h-4 rounded-full bg-cyan"
              style={{ boxShadow: "0 0 6px var(--cyan)" }}
            />
            <h2
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              style={{ fontFamily: "Space Grotesk, sans-serif" }}
            >
              League-Wide Totals
            </h2>
            <span className="text-[10px] text-muted-foreground/60 ml-1">
              Aggregate attendance figures across all matches
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <NeuCard delay={0.05} className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users size={14} className="text-cyan" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  Total Attendance
                </span>
              </div>
              <AnimatedCounter
                value={totalAttendance}
                className="text-2xl text-cyan"
              />
            </NeuCard>
            <NeuCard delay={0.12} className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-amber" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  Avg per Match
                </span>
              </div>
              <AnimatedCounter
                value={avgAttendance}
                className="text-2xl text-amber"
              />
            </NeuCard>
            <NeuCard delay={0.2} className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={14} className="text-emerald" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  Highest
                </span>
              </div>
              <AnimatedCounter
                value={highestMatch?.attendance || 0}
                className="text-2xl text-emerald"
              />
              {highestMatch && (
                <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                  {getTeam(highestMatch.homeTeam)?.short} vs{" "}
                  {getTeam(highestMatch.awayTeam)?.short}
                </div>
              )}
            </NeuCard>
            <NeuCard delay={0.3} className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown size={14} className="text-purple-400" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  Matches
                </span>
              </div>
              <AnimatedCounter
                value={filteredMatches.length}
                className="text-2xl text-purple-400"
              />
            </NeuCard>
          </div>
        </div>
      </StaggerItem>

      {/* Home Attendance with Fill Rate Toggle */}
      <StaggerItem>
        <NeuCard animate={false} className="p-4">
          <ChartHeader
            title={
              showFillRate
                ? "Stadium Fill Rate by Team"
                : "Average Home Attendance by Team"
            }
            description={
              showFillRate ? (
                <>
                  Are teams actually filling their stadiums, or is there room to
                  grow? This chart shows each club's{" "}
                  <strong className="text-foreground/80">fill rate</strong> —
                  the percentage of seats filled on a typical match day. A bar
                  hitting 100% means consistent sellouts; anything below reveals
                  untapped demand (or an oversized venue). Click any bar to
                  filter the entire tab.
                </>
              ) : (
                <>
                  Who draws the biggest crowds in MLS? This chart ranks every
                  team by their{" "}
                  <strong className="text-foreground/80">
                    average home attendance
                  </strong>
                  . The dotted line marks each stadium's capacity — when a bar
                  reaches it, that club is selling out. Click any bar to filter
                  the entire tab.
                </>
              )
            }
            methods={
              <>
                Fill% = (Average Home Attendance / Stadium Capacity) × 100.
                Average Home Attendance = sum of all home match attendances /
                number of home matches. Stadium capacities sourced from official
                MLS venue data (expandable max for multi-use venues, e.g., ATL =
                71,000, CLT = 75,000). Bars sorted descending by the active
                metric. Data: 2025 MLS regular season.
              </>
            }
            rightAction={
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFillRate(!showFillRate)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-all duration-300"
                  style={{
                    background: showFillRate
                      ? isDark
                        ? "rgba(0, 212, 255, 0.12)"
                        : "rgba(8, 145, 178, 0.1)"
                      : isDark
                        ? "rgba(255, 255, 255, 0.04)"
                        : "rgba(0, 0, 0, 0.04)",
                    color: showFillRate
                      ? "var(--cyan)"
                      : "var(--table-header-color)",
                    border: `1px solid ${showFillRate ? (isDark ? "rgba(0, 212, 255, 0.3)" : "rgba(8, 145, 178, 0.3)") : isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)"}`,
                  }}
                >
                  {showFillRate ? (
                    <BarChart3 size={11} />
                  ) : (
                    <Percent size={11} />
                  )}
                  {showFillRate ? "Absolute" : "Fill Rate"}
                </button>
                <CardInsightToggle
                  isOpen={showCapacityInsights}
                  onToggle={() => setShowCapacityInsights(v => !v)}
                  isDark={isDark}
                />
                <MaximizeButton onClick={() => setMaximized("home")} />
              </div>
            }
          />
          <CardInsightSection
            isOpen={showCapacityInsights}
            insights={capacityFillInsights}
            isDark={isDark}
          />
          <HomeBarContent />
        </NeuCard>
      </StaggerItem>

      {/* Weekly Trend with Team Filter */}
      <StaggerItem>
        <NeuCard animate={false} className="p-4">
          <ChartHeader
            title={`Home Attendance by Matchweek${trendTeamObj ? ` — ${trendTeamObj.short}` : ""}`}
            description={
              effectiveTrendTeam ? (
                <>
                  How does{" "}
                  <strong className="text-foreground/80">
                    {trendTeamObj?.short}'s
                  </strong>{" "}
                  home gate shift across the season? This trend line tracks
                  their week-by-week attendance against{" "}
                  <strong className="text-foreground/80">
                    stadium capacity
                  </strong>{" "}
                  (dotted line) and the faint league average in the background.
                  Look for spikes around rivalry weeks and dips during
                  international breaks.
                </>
              ) : (
                <>
                  Is MLS attendance momentum building or fading? This chart
                  tracks{" "}
                  <strong className="text-foreground/80">
                    league-wide home attendance
                  </strong>{" "}
                  week by week across the season. The dotted envelope shows each
                  week's high and low. Select a team from the dropdown to
                  isolate one club's trajectory.
                </>
              )
            }
            methods={
              <>
                Weekly attendance = sum of all home match attendances in that
                matchweek / number of home matches. Envelope lines: max and min
                single-match attendance per week. When a team is selected, the
                line shows that club's actual home attendance per matchweek;
                dotted line = stadium capacity; faint area = league average for
                context. Smoothing: none (raw weekly values). Data: 2025 MLS
                regular season.
              </>
            }
            rightAction={
              <div className="flex items-center gap-2">
                <select
                  value={
                    trendTeamOverride ||
                    (filters.selectedTeams.length === 1
                      ? filters.selectedTeams[0]
                      : "")
                  }
                  onChange={e => setTrendTeamOverride(e.target.value)}
                  className="text-[10px] font-semibold uppercase tracking-wider rounded-md px-2 py-1 transition-all duration-200"
                  style={{
                    background: effectiveTrendTeam
                      ? isDark
                        ? "rgba(0, 212, 255, 0.08)"
                        : "rgba(8, 145, 178, 0.08)"
                      : "var(--neu-bg-flat)",
                    color: effectiveTrendTeam
                      ? trendColor
                      : "var(--table-header-color)",
                    border: `1px solid ${effectiveTrendTeam ? (isDark ? "rgba(0, 212, 255, 0.25)" : "rgba(8, 145, 178, 0.25)") : isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)"}`,
                    outline: "none",
                  }}
                >
                  <option value="">All Teams</option>
                  {TEAMS.slice()
                    .sort((a, b) => a.short.localeCompare(b.short))
                    .map(t => (
                      <option key={t.id} value={t.id}>
                        {t.short}
                      </option>
                    ))}
                </select>
                <CardInsightToggle
                  isOpen={showTrendInsights}
                  onToggle={() => setShowTrendInsights(v => !v)}
                  isDark={isDark}
                />
                <MaximizeButton onClick={() => setMaximized("weekly")} />
              </div>
            }
          />
          <CardInsightSection
            isOpen={showTrendInsights}
            insights={trendInsights}
            isDark={isDark}
          />
          <WeeklyContent />
        </NeuCard>
      </StaggerItem>

      {/* Gravitational Pull */}
      <StaggerItem>
        <NeuCard
          animate={false}
          className={`p-4 ${gravMode === "FULL SCALE" ? "z-10 relative" : ""}`}
          overflowVisible={gravMode === "FULL SCALE"}
        >
          <ChartHeader
            title="Gravitational Pull — League-Wide Away Team Impact"
            description={
              <>
                Think of it as the{" "}
                <strong className="text-foreground/80">“Messi Effect.”</strong>{" "}
                When certain teams visit, the host stadium fills up beyond its
                usual average. This chart measures each away team's{" "}
                <strong className="text-foreground/80">
                  gravitational pull
                </strong>{" "}
                — how many extra (or fewer) fans show up compared to the host's
                normal home gate. Positive bars mean a visiting team is a
                genuine draw; negative bars mean fans stay home. Click a team to
                drill into which cities respond most.
              </>
            }
            methods={
              <>
                Gravitational Pull = Average Away Attendance (when this team
                visits) − Host’s Season Home Average. Calculated per away team
                across all away matches. Positive values indicate the visiting
                team draws above-average crowds. FOCUSED mode shows all 30 teams
                with pottery-focus emphasis; FULL SCALE shows top 10 on a true
                linear axis. Data: 2025 MLS regular season match attendance.
              </>
            }
            rightAction={
              <div className="flex items-center gap-2">
                <div
                  className="flex rounded-md overflow-hidden"
                  style={{
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                  }}
                >
                  {(["FOCUSED", "FULL SCALE"] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => {
                        setGravMode(mode);
                        if (mode === "FULL SCALE") setEmphasizedTeam(null);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-all duration-300"
                      style={{
                        background:
                          gravMode === mode
                            ? isDark
                              ? "rgba(0, 212, 255, 0.12)"
                              : "rgba(8, 145, 178, 0.1)"
                            : isDark
                              ? "rgba(255, 255, 255, 0.02)"
                              : "rgba(0, 0, 0, 0.02)",
                        color:
                          gravMode === mode
                            ? "var(--cyan)"
                            : "var(--table-header-color)",
                      }}
                    >
                      {mode === "FOCUSED" ? (
                        <Layers size={10} />
                      ) : (
                        <Eye size={10} />
                      )}
                      {mode}
                    </button>
                  ))}
                </div>
                <CardInsightToggle
                  isOpen={showGravInsights}
                  onToggle={() => setShowGravInsights(v => !v)}
                  isDark={isDark}
                />
                <MaximizeButton onClick={() => setMaximized("gravity")} />
              </div>
            }
          />
          <CardInsightSection
            isOpen={showGravInsights}
            insights={gravInsights}
            isDark={isDark}
          />

          {/* Pottery Focus Badge (FOCUSED mode) */}
          {emphasizedTeam &&
            gravMode === "FOCUSED" &&
            (() => {
              const empTeam = getTeam(emphasizedTeam);
              return (
                <div className="flex items-center gap-2 mb-2 ml-6">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                    style={{
                      background: isDark
                        ? "rgba(0, 212, 255, 0.08)"
                        : "rgba(8, 145, 178, 0.06)",
                      border: `1px solid ${isDark ? "rgba(0, 212, 255, 0.2)" : "rgba(8, 145, 178, 0.2)"}`,
                      color: mutedTeamColor(emphasizedTeam, isDark),
                      fontFamily: "Space Grotesk, sans-serif",
                    }}
                  >
                    <Eye size={10} />
                    Viewing: {empTeam?.short}
                    <button
                      onClick={() => setEmphasizedTeam(null)}
                      className="ml-0.5 hover:opacity-70 transition-opacity"
                      style={{ color: "var(--table-header-color)" }}
                    >
                      <X size={10} />
                    </button>
                  </span>
                </div>
              );
            })()}

          {/* Selected team (drill-down) indicator */}
          {selectedTeam && !emphasizedTeam && (
            <div className="flex items-center gap-2 mb-2 ml-6">
              <span className="text-[10px] text-muted-foreground">
                Selected:
              </span>
              <span
                className="text-xs font-semibold"
                style={{
                  color: mutedTeamColor(selectedTeam, isDark),
                  fontFamily: "Space Grotesk, sans-serif",
                }}
              >
                {selectedTeamObj?.name}
              </span>
              <button
                onClick={() => {
                  setSelectedTeam(null);
                  setTrendTeamOverride("");
                }}
                className="text-[10px] text-muted-foreground hover:text-foreground ml-1 underline"
              >
                Clear
              </button>
            </div>
          )}
          <GravitationalPullContent />
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            {gravMode === "FOCUSED"
              ? "Click any team bar to highlight it and drill down into their away impact below."
              : "Showing top 10 teams on a true linear scale. Switch to FOCUSED to see all 30 teams with pottery focus."}
          </p>
        </NeuCard>
      </StaggerItem>

      {/* Drill-Down Panels — always visible, show placeholder when no team selected */}
      <StaggerItem>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <NeuCard delay={0.1} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <Target
                    size={14}
                    style={{
                      color: selectedTeam
                        ? mutedTeamColor(selectedTeam, isDark)
                        : "var(--muted-foreground)",
                    }}
                  />
                  <h3
                    className="text-sm font-semibold"
                    style={{ fontFamily: "Space Grotesk, sans-serif" }}
                  >
                    {selectedTeam ? (
                      <>
                        <span className="text-muted-foreground">
                          City Excitement —{" "}
                        </span>
                        <span
                          style={{
                            color: mutedTeamColor(selectedTeam, isDark),
                          }}
                        >
                          {selectedTeamObj?.short}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          on the Road
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">
                        City Excitement — Away Impact
                      </span>
                    )}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 ml-6">
                  {selectedTeam ? (
                    <>
                      How each city responds to the spectacle of{" "}
                      <span
                        style={{ color: mutedTeamColor(selectedTeam, isDark) }}
                      >
                        {selectedTeamObj?.short}
                      </span>{" "}
                      visiting — positive bars mean the host city drew more fans
                      than their own season average.
                    </>
                  ) : (
                    "Select a team from any chart above to see how cities respond when they visit."
                  )}
                </p>
              </div>
              {selectedTeam && (
                <div className="flex items-center gap-2">
                  <CardInsightToggle
                    isOpen={showAwayImpactInsights}
                    onToggle={() => setShowAwayImpactInsights(v => !v)}
                    isDark={isDark}
                  />
                  <MaximizeButton onClick={() => setMaximized("awayImpact")} />
                </div>
              )}
            </div>
            <CardInsightSection
              isOpen={showAwayImpactInsights}
              insights={awayImpactInsights}
              isDark={isDark}
            />
            <AwayImpactContent />
          </NeuCard>

          <NeuCard delay={0.15} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <Home
                    size={14}
                    style={{
                      color: selectedTeam
                        ? mutedTeamColor(selectedTeam, isDark)
                        : "var(--muted-foreground)",
                    }}
                  />
                  <h3
                    className="text-sm font-semibold"
                    style={{ fontFamily: "Space Grotesk, sans-serif" }}
                  >
                    {selectedTeam ? (
                      <>
                        <span
                          style={{
                            color: mutedTeamColor(selectedTeam, isDark),
                          }}
                        >
                          {selectedTeamObj?.short}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          — Home Response
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">
                        Home Response
                      </span>
                    )}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 ml-6">
                  {selectedTeam ? (
                    <>
                      How {selectedTeamObj?.short}'s home attendance responds to
                      each visitor. Avg:{" "}
                      <span className="text-cyan font-mono">
                        {selectedHomeAvg.toLocaleString()}
                      </span>
                    </>
                  ) : (
                    "Select a team from any chart above to see their home response breakdown"
                  )}
                </p>
              </div>
              {selectedTeam && (
                <div className="flex items-center gap-2">
                  <CardInsightToggle
                    isOpen={showHomeResponseInsights}
                    onToggle={() => setShowHomeResponseInsights(v => !v)}
                    isDark={isDark}
                  />
                  <MaximizeButton
                    onClick={() => setMaximized("homeResponse")}
                  />
                </div>
              )}
            </div>
            <CardInsightSection
              isOpen={showHomeResponseInsights}
              insights={homeResponseInsights}
              isDark={isDark}
            />
            <HomeResponseContent />
          </NeuCard>
        </div>
      </StaggerItem>

      {/* Maximize Modals */}
      <ChartModal
        isOpen={maximized === "home"}
        onClose={() => setMaximized(null)}
        title={
          showFillRate
            ? "Stadium Fill Rate by Team"
            : "Average Home Attendance by Team"
        }
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFillRate(!showFillRate)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-all duration-300"
              style={{
                background: showFillRate
                  ? isDark
                    ? "rgba(0, 212, 255, 0.12)"
                    : "rgba(8, 145, 178, 0.1)"
                  : isDark
                    ? "rgba(255, 255, 255, 0.04)"
                    : "rgba(0, 0, 0, 0.04)",
                color: showFillRate
                  ? "var(--cyan)"
                  : "var(--table-header-color)",
                border: `1px solid ${showFillRate ? (isDark ? "rgba(0, 212, 255, 0.3)" : "rgba(8, 145, 178, 0.3)") : isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)"}`,
              }}
            >
              {showFillRate ? <BarChart3 size={11} /> : <Percent size={11} />}
              {showFillRate ? "Absolute" : "Fill Rate"}
            </button>
            <CardInsightToggle
              isOpen={showCapacityInsights}
              onToggle={() => setShowCapacityInsights(v => !v)}
              isDark={isDark}
            />
          </div>
          {!showFillRate && (
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block w-5 border-t-2 border-dashed"
                style={{
                  borderColor: isDark
                    ? "rgba(255,255,255,0.5)"
                    : "rgba(0,0,0,0.25)",
                }}
              />
              <span
                className="text-[9px] text-muted-foreground"
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                Stadium Capacity
              </span>
            </div>
          )}
        </div>
        <CardInsightSection
          isOpen={showCapacityInsights}
          insights={capacityFillInsights}
          isDark={isDark}
        />
        <HomeBarContent height={600} />
      </ChartModal>
      <ChartModal
        isOpen={maximized === "weekly"}
        onClose={() => setMaximized(null)}
        title={`Home Attendance by Matchweek${trendTeamObj ? ` — ${trendTeamObj.short}` : ""}`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <select
              value={
                trendTeamOverride ||
                (filters.selectedTeams.length === 1
                  ? filters.selectedTeams[0]
                  : "")
              }
              onChange={e => setTrendTeamOverride(e.target.value)}
              className="text-[10px] font-semibold uppercase tracking-wider rounded-md px-2 py-1 transition-all duration-200"
              style={{
                background: effectiveTrendTeam
                  ? isDark
                    ? "rgba(0, 212, 255, 0.08)"
                    : "rgba(8, 145, 178, 0.08)"
                  : "var(--neu-bg-flat)",
                color: effectiveTrendTeam
                  ? trendColor
                  : "var(--table-header-color)",
                border: `1px solid ${effectiveTrendTeam ? (isDark ? "rgba(0, 212, 255, 0.25)" : "rgba(8, 145, 178, 0.25)") : isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)"}`,
                outline: "none",
              }}
            >
              <option value="">All Teams</option>
              {TEAMS.slice()
                .sort((a, b) => a.short.localeCompare(b.short))
                .map(t => (
                  <option key={t.id} value={t.id}>
                    {t.short}
                  </option>
                ))}
            </select>
            <CardInsightToggle
              isOpen={showTrendInsights}
              onToggle={() => setShowTrendInsights(v => !v)}
              isDark={isDark}
            />
          </div>
        </div>
        <CardInsightSection
          isOpen={showTrendInsights}
          insights={trendInsights}
          isDark={isDark}
        />
        <WeeklyContent height={600} />
      </ChartModal>
      <ChartModal
        isOpen={maximized === "gravity"}
        onClose={() => setMaximized(null)}
        title="Gravitational Pull — League-Wide Away Team Impact"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="flex rounded-md overflow-hidden"
              style={{
                border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
              }}
            >
              {(["FOCUSED", "FULL SCALE"] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => {
                    setGravMode(mode);
                    if (mode === "FULL SCALE") setEmphasizedTeam(null);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-all duration-300"
                  style={{
                    background:
                      gravMode === mode
                        ? isDark
                          ? "rgba(0, 212, 255, 0.12)"
                          : "rgba(8, 145, 178, 0.1)"
                        : isDark
                          ? "rgba(255, 255, 255, 0.02)"
                          : "rgba(0, 0, 0, 0.02)",
                    color:
                      gravMode === mode
                        ? "var(--cyan)"
                        : "var(--table-header-color)",
                  }}
                >
                  {mode === "FOCUSED" ? (
                    <Layers size={10} />
                  ) : (
                    <Eye size={10} />
                  )}
                  {mode}
                </button>
              ))}
            </div>
            <CardInsightToggle
              isOpen={showGravInsights}
              onToggle={() => setShowGravInsights(v => !v)}
              isDark={isDark}
            />
          </div>
          {emphasizedTeam &&
            gravMode === "FOCUSED" &&
            (() => {
              const empTeam = getTeam(emphasizedTeam);
              return (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                  style={{
                    background: isDark
                      ? "rgba(0, 212, 255, 0.08)"
                      : "rgba(8, 145, 178, 0.06)",
                    border: `1px solid ${isDark ? "rgba(0, 212, 255, 0.2)" : "rgba(8, 145, 178, 0.2)"}`,
                    color: mutedTeamColor(emphasizedTeam, isDark),
                    fontFamily: "Space Grotesk, sans-serif",
                  }}
                >
                  <Eye size={10} />
                  Viewing: {empTeam?.short}
                  <button
                    onClick={() => setEmphasizedTeam(null)}
                    className="ml-0.5 hover:opacity-70 transition-opacity"
                    style={{ color: "var(--table-header-color)" }}
                  >
                    <X size={10} />
                  </button>
                </span>
              );
            })()}
        </div>
        <CardInsightSection
          isOpen={showGravInsights}
          insights={gravInsights}
          isDark={isDark}
        />
        <GravitationalPullContent height={800} />
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          {gravMode === "FOCUSED"
            ? "Click any team bar to highlight it and drill down into their away impact below."
            : "Showing top 10 teams on a true linear scale. Switch to FOCUSED to see all 30 teams with pottery focus."}
        </p>
      </ChartModal>
      <ChartModal
        isOpen={maximized === "awayImpact"}
        onClose={() => setMaximized(null)}
        title={`${selectedTeamObj?.short || "Team"} — Away Impact at Each Stadium`}
      >
        <AwayImpactContent height={600} />
      </ChartModal>
      <ChartModal
        isOpen={maximized === "homeResponse"}
        onClose={() => setMaximized(null)}
        title={`${selectedTeamObj?.short || "Team"} — Home Response to Each Visitor`}
      >
        <HomeResponseContent height={600} />
      </ChartModal>
    </StaggerContainer>
  );
}
