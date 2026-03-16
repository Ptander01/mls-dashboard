import { useMemo, useState, useEffect } from 'react';
import { useFilters } from '@/contexts/FilterContext';
import { TEAMS, MATCHES, getTeam } from '@/lib/mlsData';
import { mutedTeamColor, Extruded3DBar, Extruded3DHorizontalBar, Extruded3DBarWithCeiling } from '@/lib/chartUtils';
import NeuCard from '@/components/NeuCard';
import AnimatedCounter from '@/components/AnimatedCounter';
import { ChartModal, MaximizeButton } from '@/components/ChartModal';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Line, Cell, ReferenceLine
} from 'recharts';
import { Users, TrendingUp, TrendingDown, MapPin, Globe, Target, Home, BarChart3, Percent } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { InsightPanel, InsightHeadline } from '@/components/InsightPanel';
import { attendanceHeadline, attendanceInsights, attendanceTrendCardInsights, capacityFillCardInsights, gravPullCardInsights } from '@/lib/insightEngine';
import { CardInsightToggle, CardInsightSection } from '@/components/CardInsight';

// ─── Stadium Capacities (expandable max for multi-use venues) ───
const STADIUM_CAPACITY: Record<string, number> = {
  ATL: 71000, ATX: 20738, MTL: 19619, CLT: 75000, CHI: 61500,
  COL: 18061, CLB: 20371, DC: 20000, CIN: 26000, DAL: 20500,
  HOU: 22039, MIA: 21550, LAG: 27000, LAFC: 22000, MIN: 19400,
  NSH: 30000, NE: 65878, NYRB: 25000, NYC: 28000, ORL: 25500,
  PHI: 18500, POR: 25218, RSL: 20213, SD: 35000, SEA: 37722,
  SJ: 18000, SKC: 18467, STL: 22500, TOR: 30000, VAN: 22120,
};

export default function Attendance() {
  const { filters, filteredTeams, filteredMatches } = useFilters();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [maximized, setMaximized] = useState<string | null>(null);
  const [showFillRate, setShowFillRate] = useState(false);
  const [trendTeamOverride, setTrendTeamOverride] = useState<string | ''>('');
  const [showCapacityInsights, setShowCapacityInsights] = useState(false);
  const [showTrendInsights, setShowTrendInsights] = useState(false);
  const [showGravInsights, setShowGravInsights] = useState(false);

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
    return '';
  }, [trendTeamOverride, filters.selectedTeams]);

  // ═══ SUMMARY STATS ═══
  const avgAttendance = useMemo(() => {
    const withAtt = filteredMatches.filter(m => m.attendance > 0);
    if (withAtt.length === 0) return 0;
    return withAtt.reduce((s, m) => s + m.attendance, 0) / withAtt.length;
  }, [filteredMatches]);

  const totalAttendance = useMemo(() => filteredMatches.reduce((s, m) => s + m.attendance, 0), [filteredMatches]);

  const highestMatch = useMemo(() => {
    if (filteredMatches.length === 0) return null;
    return [...filteredMatches].sort((a, b) => b.attendance - a.attendance)[0];
  }, [filteredMatches]);

  // ═══ HOME AVERAGE ATTENDANCE ═══
  const homeAvgData = useMemo(() => {
    return filteredTeams.map(t => {
      const homeMatches = filteredMatches.filter(m => m.homeTeam === t.id && m.attendance > 0);
      const avg = homeMatches.length > 0 ? homeMatches.reduce((s, m) => s + m.attendance, 0) / homeMatches.length : 0;
      const cap = STADIUM_CAPACITY[t.id] || 0;
      const fillPct = cap > 0 ? Math.round((avg / cap) * 100) : 0;
      return { name: t.short, id: t.id, avg: Math.round(avg), capacity: cap, fillPct, color: mutedTeamColor(t.id, isDark) };
    }).sort((a, b) => showFillRate ? b.fillPct - a.fillPct : b.avg - a.avg);
  }, [filteredTeams, filteredMatches, showFillRate, isDark]);

  // ═══ WEEKLY TREND ═══
  const weeklyData = useMemo(() => {
    const matchesForTrend = effectiveTrendTeam
      ? filteredMatches.filter(m => m.homeTeam === effectiveTrendTeam && m.attendance > 0)
      : filteredMatches.filter(m => m.attendance > 0);
    const byWeek: Record<number, number[]> = {};
    matchesForTrend.forEach(m => {
      if (!byWeek[m.week]) byWeek[m.week] = [];
      byWeek[m.week].push(m.attendance);
    });
    return Object.entries(byWeek).map(([week, atts]) => ({
      week: +week, avg: Math.round(atts.reduce((s, a) => s + a, 0) / atts.length),
      max: Math.max(...atts), min: Math.min(...atts),
    })).sort((a, b) => a.week - b.week);
  }, [filteredMatches, effectiveTrendTeam]);

  const trendCapacity = useMemo(() => {
    if (effectiveTrendTeam) return STADIUM_CAPACITY[effectiveTrendTeam] || 0;
    const caps = filteredTeams.map(t => STADIUM_CAPACITY[t.id] || 0).filter(c => c > 0);
    return caps.length > 0 ? Math.round(caps.reduce((s, c) => s + c, 0) / caps.length) : 0;
  }, [filteredTeams, effectiveTrendTeam]);

  const trendTeamObj = effectiveTrendTeam ? getTeam(effectiveTrendTeam) : null;
  const trendColor = effectiveTrendTeam ? mutedTeamColor(effectiveTrendTeam, isDark) : 'var(--cyan)';

  // ═══ GRAVITATIONAL PULL ═══
  const gravitationalPull = useMemo(() => {
    const homeAvgs: Record<string, number> = {};
    TEAMS.forEach(t => {
      const hm = MATCHES.filter(m => m.homeTeam === t.id && m.attendance > 0);
      homeAvgs[t.id] = hm.length > 0 ? hm.reduce((s, m) => s + m.attendance, 0) / hm.length : 0;
    });
    return TEAMS.map(t => {
      const awayGames = MATCHES.filter(m => m.awayTeam === t.id && m.attendance > 0);
      let totalDelta = 0, matchCount = 0;
      awayGames.forEach(m => {
        const homeAvg = homeAvgs[m.homeTeam] || 0;
        if (homeAvg > 0) { totalDelta += m.attendance - homeAvg; matchCount++; }
      });
      return {
        name: t.short, id: t.id,
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
      homeAvgs[t.id] = hm.length > 0 ? hm.reduce((s, m) => s + m.attendance, 0) / hm.length : 0;
    });
    const byHost: Record<string, number[]> = {};
    MATCHES.filter(m => m.awayTeam === selectedTeam && m.attendance > 0).forEach(m => {
      if (!byHost[m.homeTeam]) byHost[m.homeTeam] = [];
      byHost[m.homeTeam].push(m.attendance);
    });
    return Object.entries(byHost).map(([hostId, atts]) => {
      const avgAtt = atts.reduce((s, a) => s + a, 0) / atts.length;
      const hostAvg = homeAvgs[hostId] || 0;
      return {
        hostTeam: getTeam(hostId)?.short || hostId, hostId,
        delta: Math.round(avgAtt - hostAvg),
        avgAtt: Math.round(avgAtt), hostAvg: Math.round(hostAvg),
        matches: atts.length, color: mutedTeamColor(hostId, isDark),
      };
    }).sort((a, b) => b.delta - a.delta);
  }, [selectedTeam, isDark]);

  // ═══ DRILL-DOWN: Home Response ═══
  const homeResponseData = useMemo(() => {
    if (!selectedTeam) return [];
    const homeMatches = MATCHES.filter(m => m.homeTeam === selectedTeam && m.attendance > 0);
    if (homeMatches.length === 0) return [];
    const avgHome = homeMatches.reduce((s, m) => s + m.attendance, 0) / homeMatches.length;
    const byAway: Record<string, number[]> = {};
    homeMatches.forEach(m => {
      if (!byAway[m.awayTeam]) byAway[m.awayTeam] = [];
      byAway[m.awayTeam].push(m.attendance);
    });
    return Object.entries(byAway).map(([awayId, atts]) => {
      const awayAvg = atts.reduce((s, a) => s + a, 0) / atts.length;
      return {
        awayTeam: getTeam(awayId)?.short || awayId, awayId,
        delta: Math.round(awayAvg - avgHome),
        avgAtt: Math.round(awayAvg), homeAvg: Math.round(avgHome),
        matches: atts.length, color: mutedTeamColor(awayId, isDark),
      };
    }).sort((a, b) => b.delta - a.delta);
  }, [selectedTeam, isDark]);

  /* Insight engine */
  const headline = useMemo(() =>
    attendanceHeadline(filteredMatches, filteredTeams),
    [filteredMatches, filteredTeams]
  );

  const attInsights = useMemo(() =>
    attendanceInsights(filteredMatches, filteredTeams),
    [filteredMatches, filteredTeams]
  );

  /* Per-card insights */
  const capacityFillInsights = useMemo(() => capacityFillCardInsights(filteredTeams, filteredMatches), [filteredTeams, filteredMatches]);
  const trendInsights = useMemo(() => attendanceTrendCardInsights(filteredMatches, filteredTeams), [filteredMatches, filteredTeams]);
  const gravInsights = useMemo(() => gravPullCardInsights(filteredTeams, filteredMatches), [filteredTeams, filteredMatches]);

  const selectedTeamObj = selectedTeam ? getTeam(selectedTeam) : null;
  const selectedHomeAvg = useMemo(() => {
    if (!selectedTeam) return 0;
    const hm = MATCHES.filter(m => m.homeTeam === selectedTeam && m.attendance > 0);
    return hm.length > 0 ? Math.round(hm.reduce((s, m) => s + m.attendance, 0) / hm.length) : 0;
  }, [selectedTeam]);

  // ═══════════════════════════════════════════
  // CHART COMPONENTS
  // ═══════════════════════════════════════════

  const HomeBarContent = ({ height = 320 }: { height?: number }) => {
    const dataKey = showFillRate ? 'fillPct' : 'avg';
    return (
      <div style={{ height }}>
        <ResponsiveContainer>
          <BarChart data={homeAvgData} margin={{ top: 5, right: 10, bottom: 60, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--table-border)" />
            <XAxis dataKey="name" stroke="var(--table-header-color)" fontSize={9} tickLine={false} angle={-45} textAnchor="end" interval={0} />
            <YAxis stroke="var(--table-header-color)" fontSize={10} tickLine={false}
              domain={showFillRate ? [0, Math.ceil(Math.max(...homeAvgData.map(d => d.fillPct), 100) * 1.15)] : [0, 'auto']}
              tickFormatter={showFillRate ? (v: number) => `${v}%` : undefined}
            />
            <Tooltip content={({ payload }) => {
              if (!payload?.length) return null;
              const d = payload[0].payload;
              const pct = d.capacity > 0 ? Math.round((d.avg / d.capacity) * 100) : 0;
              return (
                <div className="glass-sm p-2 text-xs" style={{ fontFamily: 'JetBrains Mono' }}>
                  <div className="font-semibold" style={{ color: d.color }}>{d.name}</div>
                  <div>Avg: <span className="text-amber">{d.avg.toLocaleString()}</span></div>
                  {d.capacity > 0 && (
                    <>
                      <div style={{ color: 'var(--glass-text-muted)' }}>Capacity: {d.capacity.toLocaleString()}</div>
                      <div>Fill Rate: <span className={pct >= 90 ? 'text-emerald' : pct >= 70 ? 'text-amber' : 'text-coral'}>{pct}%</span></div>
                    </>
                  )}
                </div>
              );
            }} />
            {showFillRate && (
              <ReferenceLine y={100} stroke={isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)'} strokeDasharray="6 3" strokeWidth={2} strokeOpacity={1}
                style={{ filter: isDark ? 'drop-shadow(0 1px 2px rgba(255,255,255,0.3)) drop-shadow(0 -1px 0 rgba(255,255,255,0.15))' : 'drop-shadow(0 1px 2px rgba(0,0,0,0.15)) drop-shadow(0 -1px 0 rgba(255,255,255,0.5))' }}
                label={{ value: '100% Capacity', position: 'right', fill: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
            )}
            <Bar dataKey={dataKey} radius={[4, 4, 0, 0]} cursor="pointer"
              onClick={(d: any) => { setSelectedTeam(d.id); setTrendTeamOverride(d.id); }}
              animationDuration={600} animationEasing="ease-in-out"
              shape={showFillRate ? (props: any) => <Extruded3DBar {...props} /> : (props: any) => <Extruded3DBarWithCeiling {...props} />}
            >
              {homeAvgData.map((d, i) => (
                <Cell key={i} fill={d.color}
                  stroke={selectedTeam === d.id ? (isDark ? '#ffffff' : '#333333') : 'none'}
                  strokeWidth={selectedTeam === d.id ? 2 : 0} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const WeeklyContent = ({ height = 220 }: { height?: number }) => {
    const areaColor = effectiveTrendTeam ? trendColor : (isDark ? '#3A6A7A' : '#4A7A8A');
    return (
      <div style={{ height }}>
        <ResponsiveContainer>
          <AreaChart data={weeklyData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="attGrad3d" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={areaColor} stopOpacity={isDark ? 0.4 : 0.3} />
                <stop offset="50%" stopColor={areaColor} stopOpacity={isDark ? 0.15 : 0.1} />
                <stop offset="100%" stopColor={areaColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--table-border)" />
            <XAxis dataKey="week" stroke="var(--table-header-color)" fontSize={10} tickLine={false} />
            <YAxis stroke="var(--table-header-color)" fontSize={10} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--glass-bg)', backdropFilter: 'blur(20px) saturate(1.4)', WebkitBackdropFilter: 'blur(20px) saturate(1.4)', border: '1px solid var(--glass-border)', borderRadius: 12, fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--glass-text)', boxShadow: 'var(--glass-shadow)' }} />
            {trendCapacity > 0 && (
              <ReferenceLine y={trendCapacity} stroke={isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)'} strokeDasharray="6 3" strokeWidth={2} strokeOpacity={1}
                style={{ filter: isDark ? 'drop-shadow(0 1px 2px rgba(255,255,255,0.3)) drop-shadow(0 -1px 0 rgba(255,255,255,0.15))' : 'drop-shadow(0 1px 2px rgba(0,0,0,0.15)) drop-shadow(0 -1px 0 rgba(255,255,255,0.5))' }}
                label={{
                  value: effectiveTrendTeam
                    ? `${trendTeamObj?.short} Capacity ${(trendCapacity / 1000).toFixed(1)}k`
                    : `Avg Capacity ${(trendCapacity / 1000).toFixed(1)}k`,
                  position: 'right', fill: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)', fontSize: 9, fontFamily: 'JetBrains Mono'
                }} />
            )}
            <Area type="monotone" dataKey="avg" stroke={areaColor} fill="url(#attGrad3d)" strokeWidth={2.5}
              name={effectiveTrendTeam ? `${trendTeamObj?.short} Home Attendance` : 'Avg Attendance'}
              animationDuration={500}
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))' }}
            />
            {!effectiveTrendTeam && (
              <Line type="monotone" dataKey="max" stroke={isDark ? '#8B7B2A' : '#9A8A3A'} strokeWidth={1} strokeDasharray="4 4" dot={false} name="Max" />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const GravitationalPullContent = ({ height = 700 }: { height?: number }) => (
    <div style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={gravitationalPull} layout="vertical" margin={{ top: 5, right: 60, bottom: 5, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--table-border)" />
          <XAxis type="number" stroke="var(--table-header-color)" fontSize={10} tickLine={false}
            tickFormatter={(v: number) => v >= 0 ? `+${(v/1000).toFixed(0)}k` : `${(v/1000).toFixed(0)}k`} />
          <YAxis dataKey="name" type="category" stroke="var(--table-header-color)" fontSize={9} tickLine={false} width={110}
            tick={({ x, y, payload }: any) => {
              const item = gravitationalPull.find(d => d.name === payload.value);
              return (
                <g transform={`translate(${x},${y})`}>
                  <circle cx={-100} cy={0} r={4} fill={item?.color || '#666'} />
                  <text x={-92} y={0} dy={4} textAnchor="start" fill="var(--table-header-color)" fontSize={9}
                    style={{ cursor: 'pointer' }}>{payload.value}</text>
                </g>
              );
            }}
          />
          <ReferenceLine x={0} stroke="var(--border)" strokeWidth={1} />
          <Tooltip content={({ payload }) => {
            if (!payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div className="glass-sm p-3 text-xs" style={{ fontFamily: 'JetBrains Mono' }}>
                <div className="font-semibold mb-1" style={{ color: d.color }}>{d.name}</div>
                <div>Net Impact: <span className={d.totalDelta >= 0 ? 'text-emerald' : 'text-coral'}>
                  {d.totalDelta >= 0 ? '+' : ''}{d.totalDelta.toLocaleString()}</span></div>
                <div>Avg Delta/Game: <span className={d.avgDelta >= 0 ? 'text-emerald' : 'text-coral'}>
                  {d.avgDelta >= 0 ? '+' : ''}{d.avgDelta.toLocaleString()}</span></div>
                <div style={{ color: 'var(--glass-text-muted)' }}>Away Games: {d.matches}</div>
              </div>
            );
          }} />
          <Bar dataKey="totalDelta" radius={[0, 4, 4, 0]} cursor="pointer"
            onClick={(d: any) => { setSelectedTeam(d.id); setTrendTeamOverride(d.id); }}
            shape={(props: any) => <Extruded3DHorizontalBar {...props} />}
          >
            {gravitationalPull.map((d, i) => (
              <Cell key={i} fill={d.color}
                stroke={selectedTeam === d.id ? (isDark ? '#ffffff' : '#333333') : 'none'}
                strokeWidth={selectedTeam === d.id ? 2 : 0} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  const AwayImpactContent = ({ height = 400 }: { height?: number }) => {
    if (!selectedTeam || awayImpactData.length === 0) {
      return (
        <div className="flex items-center justify-center text-muted-foreground text-sm" style={{ height }}>
          Click a team in the Gravitational Pull chart to see their away impact
        </div>
      );
    }
    return (
      <div style={{ height }}>
        <ResponsiveContainer>
          <BarChart data={awayImpactData} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--table-border)" />
            <XAxis type="number" stroke="var(--table-header-color)" fontSize={10} tickLine={false}
              tickFormatter={(v: number) => v >= 0 ? `+${v.toLocaleString()}` : v.toLocaleString()} />
            <YAxis dataKey="hostTeam" type="category" stroke="var(--table-header-color)" fontSize={9} tickLine={false} width={110}
              tick={({ x, y, payload }: any) => {
                const item = awayImpactData.find(d => d.hostTeam === payload.value);
                return (
                  <g transform={`translate(${x},${y})`}>
                    <circle cx={-100} cy={0} r={4} fill={item?.color || '#666'} />
                    <text x={-92} y={0} dy={4} textAnchor="start" fill="var(--table-header-color)" fontSize={9}>{payload.value}</text>
                  </g>
                );
              }}
            />
            <ReferenceLine x={0} stroke="var(--border)" strokeWidth={1} />
            <Tooltip content={({ payload }) => {
              if (!payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="glass-sm p-3 text-xs" style={{ fontFamily: 'JetBrains Mono' }}>
                  <div className="font-semibold mb-1">
                    <span style={{ color: mutedTeamColor(selectedTeam!, isDark) }}>{selectedTeamObj?.short}</span>
                    <span style={{ color: 'var(--glass-text-muted)' }}> visiting </span>
                    <span style={{ color: d.color }}>{d.hostTeam}</span>
                  </div>
                  <div>Delta: <span className={d.delta >= 0 ? 'text-emerald' : 'text-coral'}>
                    {d.delta >= 0 ? '+' : ''}{d.delta.toLocaleString()}</span></div>
                  <div>Actual Attendance: <span className="text-cyan">{d.avgAtt.toLocaleString()}</span></div>
                  <div style={{ color: 'var(--glass-text-muted)' }}>Host Avg: {d.hostAvg.toLocaleString()}</div>
                  <div style={{ color: 'var(--glass-text-muted)' }}>Matches: {d.matches}</div>
                </div>
              );
            }} />
            <Bar dataKey="delta" radius={[0, 4, 4, 0]}
              shape={(props: any) => <Extruded3DHorizontalBar {...props} />}
            >
              {awayImpactData.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const HomeResponseContent = ({ height = 400 }: { height?: number }) => {
    if (!selectedTeam || homeResponseData.length === 0) {
      return (
        <div className="flex items-center justify-center text-muted-foreground text-sm" style={{ height }}>
          Click a team in the Gravitational Pull chart to see their home response
        </div>
      );
    }
    return (
      <div style={{ height }}>
        <ResponsiveContainer>
          <BarChart data={homeResponseData} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--table-border)" />
            <XAxis type="number" stroke="var(--table-header-color)" fontSize={10} tickLine={false}
              tickFormatter={(v: number) => v >= 0 ? `+${v.toLocaleString()}` : v.toLocaleString()} />
            <YAxis dataKey="awayTeam" type="category" stroke="var(--table-header-color)" fontSize={9} tickLine={false} width={110}
              tick={({ x, y, payload }: any) => {
                const item = homeResponseData.find(d => d.awayTeam === payload.value);
                return (
                  <g transform={`translate(${x},${y})`}>
                    <circle cx={-100} cy={0} r={4} fill={item?.color || '#666'} />
                    <text x={-92} y={0} dy={4} textAnchor="start" fill="var(--table-header-color)" fontSize={9}>{payload.value}</text>
                  </g>
                );
              }}
            />
            <ReferenceLine x={0} stroke="var(--border)" strokeWidth={1} />
            <Tooltip content={({ payload }) => {
              if (!payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="glass-sm p-3 text-xs" style={{ fontFamily: 'JetBrains Mono' }}>
                  <div className="font-semibold mb-1">
                    <span style={{ color: d.color }}>{d.awayTeam}</span>
                    <span style={{ color: 'var(--glass-text-muted)' }}> visiting </span>
                    <span style={{ color: mutedTeamColor(selectedTeam!, isDark) }}>{selectedTeamObj?.short}</span>
                  </div>
                  <div>Delta: <span className={d.delta >= 0 ? 'text-emerald' : 'text-coral'}>
                    {d.delta >= 0 ? '+' : ''}{d.delta.toLocaleString()}</span></div>
                  <div>Actual Attendance: <span className="text-cyan">{d.avgAtt.toLocaleString()}</span></div>
                  <div style={{ color: 'var(--glass-text-muted)' }}>{selectedTeamObj?.short} Home Avg: {d.homeAvg.toLocaleString()}</div>
                  <div style={{ color: 'var(--glass-text-muted)' }}>Matches: {d.matches}</div>
                </div>
              );
            }} />
            <Bar dataKey="delta" radius={[0, 4, 4, 0]}
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
    <div className="space-y-4 mt-4">
      {/* Tab Description / Insight Headline */}
      <div className="px-1">
        <InsightHeadline
          headline={headline}
          isAnalyzing={false}
          staticTitle={<><span className="font-semibold text-foreground">Attendance</span> — Explore match-day attendance across all MLS venues. The bar chart ranks teams by average home attendance (toggle to fill rate to see stadium utilization). The dotted white line shows stadium capacity. The trend chart tracks weekly attendance patterns, and the drill-down panels reveal how specific away teams affect turnout.</>}
          isDark={isDark}
        />
      </div>

      {/* Insight Panel */}
      <InsightPanel insights={attInsights} isDark={isDark} />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <NeuCard delay={0.05} className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} className="text-cyan" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Attendance</span>
          </div>
          <AnimatedCounter value={totalAttendance} className="text-2xl text-cyan" />
        </NeuCard>
        <NeuCard delay={0.12} className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-amber" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Avg per Match</span>
          </div>
          <AnimatedCounter value={avgAttendance} className="text-2xl text-amber" />
        </NeuCard>
        <NeuCard delay={0.2} className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={14} className="text-emerald" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Highest</span>
          </div>
          <AnimatedCounter value={highestMatch?.attendance || 0} className="text-2xl text-emerald" />
          {highestMatch && (
            <div className="text-[10px] text-muted-foreground mt-1 font-mono">
              {getTeam(highestMatch.homeTeam)?.short} vs {getTeam(highestMatch.awayTeam)?.short}
            </div>
          )}
        </NeuCard>
        <NeuCard delay={0.3} className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={14} className="text-purple-400" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Matches</span>
          </div>
          <AnimatedCounter value={filteredMatches.length} className="text-2xl text-purple-400" />
        </NeuCard>
      </div>

      {/* Home Attendance with Fill Rate Toggle */}
      <NeuCard delay={0.15} className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
              {showFillRate ? 'Stadium Fill Rate by Team' : 'Average Home Attendance by Team'}
            </h3>
            {!showFillRate && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-block w-5 border-t-2 border-dashed" style={{ borderColor: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.25)' }} />
                <span className="text-[9px] text-muted-foreground" style={{ fontFamily: 'JetBrains Mono' }}>Stadium Capacity</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFillRate(!showFillRate)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-all duration-300"
              style={{
                background: showFillRate ? (isDark ? 'rgba(0, 212, 255, 0.12)' : 'rgba(8, 145, 178, 0.1)') : (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)'),
                color: showFillRate ? 'var(--cyan)' : 'var(--table-header-color)',
                border: `1px solid ${showFillRate ? (isDark ? 'rgba(0, 212, 255, 0.3)' : 'rgba(8, 145, 178, 0.3)') : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)')}`,
              }}
            >
              {showFillRate ? <BarChart3 size={11} /> : <Percent size={11} />}
              {showFillRate ? 'Absolute' : 'Fill Rate'}
            </button>
            <CardInsightToggle isOpen={showCapacityInsights} onToggle={() => setShowCapacityInsights(v => !v)} isDark={isDark} />
            <MaximizeButton onClick={() => setMaximized('home')} />
          </div>
        </div>
        <CardInsightSection isOpen={showCapacityInsights} insights={capacityFillInsights} isDark={isDark} />
        <HomeBarContent />
      </NeuCard>

      {/* Weekly Trend with Team Filter */}
      <NeuCard delay={0.25} className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
            Attendance Trend by Matchweek
            {trendTeamObj && (
              <span className="ml-2 text-xs font-normal" style={{ color: trendColor }}>
                — {trendTeamObj.short} Home Games
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            <select
              value={trendTeamOverride || (filters.selectedTeams.length === 1 ? filters.selectedTeams[0] : '')}
              onChange={(e) => setTrendTeamOverride(e.target.value)}
              className="text-[10px] font-semibold uppercase tracking-wider rounded-md px-2 py-1 transition-all duration-200"
              style={{
                background: effectiveTrendTeam ? (isDark ? 'rgba(0, 212, 255, 0.08)' : 'rgba(8, 145, 178, 0.08)') : 'var(--neu-bg-flat)',
                color: effectiveTrendTeam ? trendColor : 'var(--table-header-color)',
                border: `1px solid ${effectiveTrendTeam ? (isDark ? 'rgba(0, 212, 255, 0.25)' : 'rgba(8, 145, 178, 0.25)') : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)')}`,
                outline: 'none',
              }}
            >
              <option value="">All Teams</option>
              {TEAMS.slice().sort((a, b) => a.short.localeCompare(b.short)).map(t => (
                <option key={t.id} value={t.id}>{t.short}</option>
              ))}
            </select>
            <CardInsightToggle isOpen={showTrendInsights} onToggle={() => setShowTrendInsights(v => !v)} isDark={isDark} />
            <MaximizeButton onClick={() => setMaximized('weekly')} />
          </div>
        </div>
        <CardInsightSection isOpen={showTrendInsights} insights={trendInsights} isDark={isDark} />
        <WeeklyContent />
      </NeuCard>

      {/* Gravitational Pull */}
      <NeuCard delay={0.35} className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-cyan" />
              <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
                Gravitational Pull — League-Wide Away Team Impact
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1 ml-6">
              Cumulative attendance delta across all away games. Positive = team draws more fans than the host's average when visiting.
            </p>
          </div>
          <CardInsightToggle isOpen={showGravInsights} onToggle={() => setShowGravInsights(v => !v)} isDark={isDark} />
          <MaximizeButton onClick={() => setMaximized('gravity')} />
        </div>
        <CardInsightSection isOpen={showGravInsights} insights={gravInsights} isDark={isDark} />
        {selectedTeam && (
          <div className="flex items-center gap-2 mb-2 ml-6">
            <span className="text-[10px] text-muted-foreground">Selected:</span>
            <span className="text-xs font-semibold" style={{ color: mutedTeamColor(selectedTeam, isDark), fontFamily: 'Space Grotesk' }}>
              {selectedTeamObj?.name}
            </span>
            <button onClick={() => { setSelectedTeam(null); setTrendTeamOverride(''); }}
              className="text-[10px] text-muted-foreground hover:text-foreground ml-1 underline">
              Clear
            </button>
          </div>
        )}
        <GravitationalPullContent />
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Click any team bar to drill down into their specific away impact and home response data.
        </p>
      </NeuCard>

      {/* Drill-Down Panels */}
      {selectedTeam && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <NeuCard delay={0.1} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <Target size={14} style={{ color: mutedTeamColor(selectedTeam, isDark) }} />
                  <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
                    <span style={{ color: mutedTeamColor(selectedTeam, isDark) }}>{selectedTeamObj?.short}</span>
                    <span className="text-muted-foreground"> — Away Impact</span>
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 ml-6">
                  Attendance delta at each stadium when {selectedTeamObj?.short} visits
                </p>
              </div>
              <MaximizeButton onClick={() => setMaximized('awayImpact')} />
            </div>
            <AwayImpactContent />
          </NeuCard>

          <NeuCard delay={0.15} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <Home size={14} style={{ color: mutedTeamColor(selectedTeam, isDark) }} />
                  <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
                    <span style={{ color: mutedTeamColor(selectedTeam, isDark) }}>{selectedTeamObj?.short}</span>
                    <span className="text-muted-foreground"> — Home Response</span>
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 ml-6">
                  How {selectedTeamObj?.short}'s home attendance responds to each visitor. Avg: <span className="text-cyan font-mono">{selectedHomeAvg.toLocaleString()}</span>
                </p>
              </div>
              <MaximizeButton onClick={() => setMaximized('homeResponse')} />
            </div>
            <HomeResponseContent />
          </NeuCard>
        </div>
      )}

      {/* Maximize Modals */}
      <ChartModal isOpen={maximized === 'home'} onClose={() => setMaximized(null)}
        title={showFillRate ? 'Stadium Fill Rate by Team' : 'Average Home Attendance by Team'}>
        <HomeBarContent height={600} />
      </ChartModal>
      <ChartModal isOpen={maximized === 'weekly'} onClose={() => setMaximized(null)}
        title={`Attendance Trend by Matchweek${trendTeamObj ? ` — ${trendTeamObj.short}` : ''}`}>
        <WeeklyContent height={600} />
      </ChartModal>
      <ChartModal isOpen={maximized === 'gravity'} onClose={() => setMaximized(null)} title="Gravitational Pull — League-Wide Away Team Impact">
        <GravitationalPullContent height={800} />
      </ChartModal>
      <ChartModal isOpen={maximized === 'awayImpact'} onClose={() => setMaximized(null)}
        title={`${selectedTeamObj?.short || 'Team'} — Away Impact at Each Stadium`}>
        <AwayImpactContent height={600} />
      </ChartModal>
      <ChartModal isOpen={maximized === 'homeResponse'} onClose={() => setMaximized(null)}
        title={`${selectedTeamObj?.short || 'Team'} — Home Response to Each Visitor`}>
        <HomeResponseContent height={600} />
      </ChartModal>
    </div>
  );
}
