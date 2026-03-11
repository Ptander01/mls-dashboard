import { useMemo, useState } from 'react';
import { useFilters } from '@/contexts/FilterContext';
import { TEAMS, MATCHES, getTeam } from '@/lib/mlsData';
import NeuCard from '@/components/NeuCard';
import AnimatedCounter from '@/components/AnimatedCounter';
import { ChartModal, MaximizeButton } from '@/components/ChartModal';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Line, Cell, ReferenceLine
} from 'recharts';
import { Users, TrendingUp, TrendingDown, MapPin, Globe, Target, Home } from 'lucide-react';

// ─── Stadium Capacities (MLS-specific seating for soccer config) ───
const STADIUM_CAPACITY: Record<string, number> = {
  ATL: 42500, ATX: 20738, MTL: 19619, CLT: 30000, CHI: 20000,
  COL: 18061, CLB: 20371, DC: 20000, CIN: 26000, DAL: 20500,
  HOU: 22039, MIA: 21550, LAG: 27000, LAFC: 22000, MIN: 19400,
  NSH: 30000, NE: 20000, NYRB: 25000, NYC: 17950, ORL: 25500,
  PHI: 18500, POR: 25218, RSL: 20213, SD: 35000, SEA: 37722,
  SJ: 18000, SKC: 18467, STL: 22500, TOR: 30000, VAN: 22120,
};

// ─── Visibility-enhanced team colors for dark backgrounds ───
const VIS_COLORS: Record<string, string> = {
  'MTL': '#4488cc', 'CLB': '#ffc72c', 'DC': '#c8102e',
  'NE': '#4477bb', 'PHI': '#4488aa', 'POR': '#00aa44',
  'LAG': '#5588cc', 'VAN': '#5599dd',
};
function teamColor(id: string): string {
  if (VIS_COLORS[id]) return VIS_COLORS[id];
  const t = getTeam(id);
  return t?.color || '#666';
}

export default function Attendance() {
  const { filteredTeams, filteredMatches } = useFilters();
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [maximized, setMaximized] = useState<string | null>(null);

  // ═══════════════════════════════════════════
  // SUMMARY STATS
  // ═══════════════════════════════════════════
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

  // ═══════════════════════════════════════════
  // HOME AVERAGE ATTENDANCE
  // ═══════════════════════════════════════════
  const homeAvgData = useMemo(() => {
    return filteredTeams.map(t => {
      const homeMatches = filteredMatches.filter(m => m.homeTeam === t.id && m.attendance > 0);
      const avg = homeMatches.length > 0 ? homeMatches.reduce((s, m) => s + m.attendance, 0) / homeMatches.length : 0;
      return { name: t.short, id: t.id, avg: Math.round(avg), capacity: STADIUM_CAPACITY[t.id] || 0, color: teamColor(t.id) };
    }).sort((a, b) => b.avg - a.avg);
  }, [filteredTeams, filteredMatches]);

  // ═══════════════════════════════════════════
  // WEEKLY TREND
  // ═══════════════════════════════════════════
  const weeklyData = useMemo(() => {
    const byWeek: Record<number, number[]> = {};
    filteredMatches.filter(m => m.attendance > 0).forEach(m => {
      if (!byWeek[m.week]) byWeek[m.week] = [];
      byWeek[m.week].push(m.attendance);
    });
    return Object.entries(byWeek).map(([week, atts]) => ({
      week: +week, avg: Math.round(atts.reduce((s, a) => s + a, 0) / atts.length),
      max: Math.max(...atts), min: Math.min(...atts),
    })).sort((a, b) => a.week - b.week);
  }, [filteredMatches]);

  // ═══════════════════════════════════════════
  // LEAGUE-AVERAGE CAPACITY (weighted by filtered teams)
  // ═══════════════════════════════════════════
  const avgCapacity = useMemo(() => {
    const caps = filteredTeams.map(t => STADIUM_CAPACITY[t.id] || 0).filter(c => c > 0);
    return caps.length > 0 ? Math.round(caps.reduce((s, c) => s + c, 0) / caps.length) : 0;
  }, [filteredTeams]);

  // ═══════════════════════════════════════════
  // GRAVITATIONAL PULL — League-wide net impact
  // For each team: sum of (attendance - home team's avg) across ALL their away games
  // ═══════════════════════════════════════════
  const gravitationalPull = useMemo(() => {
    // First compute each team's home average using ALL matches (not filtered)
    const homeAvgs: Record<string, number> = {};
    TEAMS.forEach(t => {
      const hm = MATCHES.filter(m => m.homeTeam === t.id && m.attendance > 0);
      homeAvgs[t.id] = hm.length > 0 ? hm.reduce((s, m) => s + m.attendance, 0) / hm.length : 0;
    });

    // For each team as away visitor, compute cumulative delta
    return TEAMS.map(t => {
      const awayGames = MATCHES.filter(m => m.awayTeam === t.id && m.attendance > 0);
      let totalDelta = 0;
      let matchCount = 0;
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
        color: teamColor(t.id),
      };
    }).sort((a, b) => b.totalDelta - a.totalDelta);
  }, []);

  // ═══════════════════════════════════════════
  // TEAM DRILL-DOWN: Away Impact (when selected team visits other stadiums)
  // ═══════════════════════════════════════════
  const awayImpactData = useMemo(() => {
    if (!selectedTeam) return [];
    // Home averages for all teams
    const homeAvgs: Record<string, number> = {};
    TEAMS.forEach(t => {
      const hm = MATCHES.filter(m => m.homeTeam === t.id && m.attendance > 0);
      homeAvgs[t.id] = hm.length > 0 ? hm.reduce((s, m) => s + m.attendance, 0) / hm.length : 0;
    });

    // Group away games by host stadium
    const byHost: Record<string, number[]> = {};
    MATCHES.filter(m => m.awayTeam === selectedTeam && m.attendance > 0).forEach(m => {
      if (!byHost[m.homeTeam]) byHost[m.homeTeam] = [];
      byHost[m.homeTeam].push(m.attendance);
    });

    return Object.entries(byHost).map(([hostId, atts]) => {
      const avgAtt = atts.reduce((s, a) => s + a, 0) / atts.length;
      const hostAvg = homeAvgs[hostId] || 0;
      const delta = Math.round(avgAtt - hostAvg);
      return {
        hostTeam: getTeam(hostId)?.short || hostId,
        hostId,
        delta,
        avgAtt: Math.round(avgAtt),
        hostAvg: Math.round(hostAvg),
        matches: atts.length,
        color: teamColor(hostId),
      };
    }).sort((a, b) => b.delta - a.delta);
  }, [selectedTeam]);

  // ═══════════════════════════════════════════
  // TEAM DRILL-DOWN: Home Response (how home attendance changes by visitor)
  // ═══════════════════════════════════════════
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
        awayTeam: getTeam(awayId)?.short || awayId,
        awayId,
        delta: Math.round(awayAvg - avgHome),
        avgAtt: Math.round(awayAvg),
        homeAvg: Math.round(avgHome),
        matches: atts.length,
        color: teamColor(awayId),
      };
    }).sort((a, b) => b.delta - a.delta);
  }, [selectedTeam]);

  const selectedTeamObj = selectedTeam ? getTeam(selectedTeam) : null;
  const selectedHomeAvg = useMemo(() => {
    if (!selectedTeam) return 0;
    const hm = MATCHES.filter(m => m.homeTeam === selectedTeam && m.attendance > 0);
    return hm.length > 0 ? Math.round(hm.reduce((s, m) => s + m.attendance, 0) / hm.length) : 0;
  }, [selectedTeam]);

  // ═══════════════════════════════════════════
  // CHART COMPONENTS
  // ═══════════════════════════════════════════

  const HomeBarContent = ({ height = 320 }: { height?: number }) => (
    <div style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={homeAvgData} margin={{ top: 5, right: 10, bottom: 60, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="name" stroke="#8892b0" fontSize={9} tickLine={false} angle={-45} textAnchor="end" interval={0} />
          <YAxis stroke="#8892b0" fontSize={10} tickLine={false} />
          <Tooltip content={({ payload }) => {
            if (!payload?.length) return null;
            const d = payload[0].payload;
            const pct = d.capacity > 0 ? Math.round((d.avg / d.capacity) * 100) : 0;
            return (
              <div className="neu-raised p-2 rounded-lg text-xs" style={{ fontFamily: 'JetBrains Mono' }}>
                <div className="font-semibold" style={{ color: d.color }}>{d.name}</div>
                <div>Avg: <span className="text-amber">{d.avg.toLocaleString()}</span></div>
                {d.capacity > 0 && (
                  <>
                    <div>Capacity: <span className="text-muted-foreground">{d.capacity.toLocaleString()}</span></div>
                    <div>Fill Rate: <span className={pct >= 90 ? 'text-emerald' : pct >= 70 ? 'text-amber' : 'text-coral'}>{pct}%</span></div>
                  </>
                )}
              </div>
            );
          }} />
          <Bar dataKey="avg" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(d: any) => setSelectedTeam(d.id)}
            shape={(props: any) => {
              const { x, y, width, height: h, payload } = props;
              const cap = payload?.capacity || 0;
              const avg = payload?.avg || 0;
              const fill = props.fill || '#666';
              const fillOp = props.fillOpacity ?? 0.7;
              const stroke = props.stroke || 'none';
              const sw = props.strokeWidth || 0;
              // Calculate capacity Y position relative to bar
              const yAxis = (y + h); // bottom of chart area
              const barScale = avg > 0 ? h / avg : 0;
              const capY = cap > 0 ? yAxis - (cap * barScale) : 0;
              return (
                <g>
                  {/* The actual bar */}
                  <rect x={x} y={y} width={width} height={h} rx={4} ry={4}
                    fill={fill} fillOpacity={fillOp} stroke={stroke} strokeWidth={sw} />
                  {/* Capacity ceiling marker */}
                  {cap > 0 && (
                    <>
                      <line x1={x - 2} y1={capY} x2={x + width + 2} y2={capY}
                        stroke="#ff6b9d" strokeWidth={1.5} strokeDasharray="3 2" strokeOpacity={0.7} />
                      <circle cx={x + width / 2} cy={capY} r={2} fill="#ff6b9d" fillOpacity={0.8} />
                    </>
                  )}
                </g>
              );
            }}>
            {homeAvgData.map((d, i) => (
              <Cell key={i} fill={d.color} fillOpacity={selectedTeam === d.id ? 1 : 0.7} stroke={selectedTeam === d.id ? '#ffffff' : 'none'} strokeWidth={selectedTeam === d.id ? 2 : 0} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  const WeeklyContent = ({ height = 220 }: { height?: number }) => (
    <div style={{ height }}>
      <ResponsiveContainer>
        <AreaChart data={weeklyData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <defs>
            <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="week" stroke="#8892b0" fontSize={10} tickLine={false} />
          <YAxis stroke="#8892b0" fontSize={10} tickLine={false} />
          <Tooltip contentStyle={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11, fontFamily: 'JetBrains Mono' }} />
          {avgCapacity > 0 && (
            <ReferenceLine y={avgCapacity} stroke="#ff6b9d" strokeDasharray="6 3" strokeWidth={1.5} strokeOpacity={0.6}
              label={{ value: `Avg Capacity ${(avgCapacity / 1000).toFixed(1)}k`, position: 'right', fill: '#ff6b9d', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
          )}
          <Area type="monotone" dataKey="avg" stroke="#00d4ff" fill="url(#attGrad)" strokeWidth={2} name="Avg Attendance" />
          <Line type="monotone" dataKey="max" stroke="#ffb347" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Max" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  // ─── Gravitational Pull Chart ───
  const GravitationalPullContent = ({ height = 700 }: { height?: number }) => (
    <div style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={gravitationalPull} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis type="number" stroke="#8892b0" fontSize={10} tickLine={false}
            tickFormatter={(v: number) => v >= 0 ? `+${(v/1000).toFixed(0)}k` : `${(v/1000).toFixed(0)}k`} />
          <YAxis dataKey="name" type="category" stroke="#8892b0" fontSize={9} tickLine={false} width={110}
            tick={({ x, y, payload }: any) => {
              const item = gravitationalPull.find(d => d.name === payload.value);
              return (
                <g transform={`translate(${x},${y})`}>
                  <circle cx={-100} cy={0} r={4} fill={item?.color || '#666'} />
                  <text x={-92} y={0} dy={4} textAnchor="start" fill="#8892b0" fontSize={9}
                    style={{ cursor: 'pointer' }}>{payload.value}</text>
                </g>
              );
            }}
          />
          <ReferenceLine x={0} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
          <Tooltip content={({ payload }) => {
            if (!payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div className="neu-raised p-3 rounded-lg text-xs" style={{ fontFamily: 'JetBrains Mono' }}>
                <div className="font-semibold mb-1" style={{ color: d.color }}>{d.name}</div>
                <div>Net Impact: <span className={d.totalDelta >= 0 ? 'text-emerald' : 'text-coral'}>
                  {d.totalDelta >= 0 ? '+' : ''}{d.totalDelta.toLocaleString()}</span></div>
                <div>Avg Delta/Game: <span className={d.avgDelta >= 0 ? 'text-emerald' : 'text-coral'}>
                  {d.avgDelta >= 0 ? '+' : ''}{d.avgDelta.toLocaleString()}</span></div>
                <div>Away Games: <span className="text-muted-foreground">{d.matches}</span></div>
              </div>
            );
          }} />
          <Bar dataKey="totalDelta" radius={[0, 4, 4, 0]} cursor="pointer"
            onClick={(d: any) => setSelectedTeam(d.id)}>
            {gravitationalPull.map((d, i) => (
              <Cell key={i} fill={d.color} fillOpacity={selectedTeam === d.id ? 1 : 0.75}
                stroke={selectedTeam === d.id ? '#ffffff' : 'none'} strokeWidth={selectedTeam === d.id ? 2 : 0} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  // ─── Away Impact Drill-Down ───
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
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis type="number" stroke="#8892b0" fontSize={10} tickLine={false}
              tickFormatter={(v: number) => v >= 0 ? `+${v.toLocaleString()}` : v.toLocaleString()} />
            <YAxis dataKey="hostTeam" type="category" stroke="#8892b0" fontSize={9} tickLine={false} width={110}
              tick={({ x, y, payload }: any) => {
                const item = awayImpactData.find(d => d.hostTeam === payload.value);
                return (
                  <g transform={`translate(${x},${y})`}>
                    <circle cx={-100} cy={0} r={4} fill={item?.color || '#666'} />
                    <text x={-92} y={0} dy={4} textAnchor="start" fill="#8892b0" fontSize={9}>{payload.value}</text>
                  </g>
                );
              }}
            />
            <ReferenceLine x={0} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
            <Tooltip content={({ payload }) => {
              if (!payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="neu-raised p-3 rounded-lg text-xs" style={{ fontFamily: 'JetBrains Mono' }}>
                  <div className="font-semibold mb-1">
                    <span style={{ color: teamColor(selectedTeam!) }}>{selectedTeamObj?.short}</span>
                    <span className="text-muted-foreground"> visiting </span>
                    <span style={{ color: d.color }}>{d.hostTeam}</span>
                  </div>
                  <div>Delta: <span className={d.delta >= 0 ? 'text-emerald' : 'text-coral'}>
                    {d.delta >= 0 ? '+' : ''}{d.delta.toLocaleString()}</span></div>
                  <div>Actual Attendance: <span className="text-cyan">{d.avgAtt.toLocaleString()}</span></div>
                  <div>Host Avg: <span className="text-muted-foreground">{d.hostAvg.toLocaleString()}</span></div>
                  <div>Matches: <span className="text-muted-foreground">{d.matches}</span></div>
                </div>
              );
            }} />
            <Bar dataKey="delta" radius={[0, 4, 4, 0]}>
              {awayImpactData.map((d, i) => (
                <Cell key={i} fill={d.color} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // ─── Home Response Drill-Down ───
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
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis type="number" stroke="#8892b0" fontSize={10} tickLine={false}
              tickFormatter={(v: number) => v >= 0 ? `+${v.toLocaleString()}` : v.toLocaleString()} />
            <YAxis dataKey="awayTeam" type="category" stroke="#8892b0" fontSize={9} tickLine={false} width={110}
              tick={({ x, y, payload }: any) => {
                const item = homeResponseData.find(d => d.awayTeam === payload.value);
                return (
                  <g transform={`translate(${x},${y})`}>
                    <circle cx={-100} cy={0} r={4} fill={item?.color || '#666'} />
                    <text x={-92} y={0} dy={4} textAnchor="start" fill="#8892b0" fontSize={9}>{payload.value}</text>
                  </g>
                );
              }}
            />
            <ReferenceLine x={0} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
            <Tooltip content={({ payload }) => {
              if (!payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="neu-raised p-3 rounded-lg text-xs" style={{ fontFamily: 'JetBrains Mono' }}>
                  <div className="font-semibold mb-1">
                    <span style={{ color: d.color }}>{d.awayTeam}</span>
                    <span className="text-muted-foreground"> visiting </span>
                    <span style={{ color: teamColor(selectedTeam!) }}>{selectedTeamObj?.short}</span>
                  </div>
                  <div>Delta: <span className={d.delta >= 0 ? 'text-emerald' : 'text-coral'}>
                    {d.delta >= 0 ? '+' : ''}{d.delta.toLocaleString()}</span></div>
                  <div>Actual Attendance: <span className="text-cyan">{d.avgAtt.toLocaleString()}</span></div>
                  <div>{selectedTeamObj?.short} Home Avg: <span className="text-muted-foreground">{d.homeAvg.toLocaleString()}</span></div>
                  <div>Matches: <span className="text-muted-foreground">{d.matches}</span></div>
                </div>
              );
            }} />
            <Bar dataKey="delta" radius={[0, 4, 4, 0]}>
              {homeResponseData.map((d, i) => (
                <Cell key={i} fill={d.color} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <NeuCard delay={0.05} glow="cyan" className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} className="text-cyan" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Attendance</span>
          </div>
          <AnimatedCounter value={totalAttendance} className="text-2xl text-cyan" />
        </NeuCard>
        <NeuCard delay={0.12} glow="amber" className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-amber" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Avg per Match</span>
          </div>
          <AnimatedCounter value={avgAttendance} className="text-2xl text-amber" />
        </NeuCard>
        <NeuCard delay={0.2} glow="emerald" className="p-4">
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

      {/* Home Attendance */}
      <NeuCard delay={0.15} className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>Average Home Attendance by Team</h3>
          <MaximizeButton onClick={() => setMaximized('home')} />
        </div>
        <HomeBarContent />
      </NeuCard>

      {/* Weekly Trend */}
      <NeuCard delay={0.25} className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>Attendance Trend by Matchweek</h3>
          <MaximizeButton onClick={() => setMaximized('weekly')} />
        </div>
        <WeeklyContent />
      </NeuCard>

      {/* ═══════════════════════════════════════════ */}
      {/* GRAVITATIONAL PULL — League-wide */}
      {/* ═══════════════════════════════════════════ */}
      <NeuCard delay={0.35} glow="cyan" className="p-4">
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
          <MaximizeButton onClick={() => setMaximized('gravity')} />
        </div>
        {selectedTeam && (
          <div className="flex items-center gap-2 mb-2 ml-6">
            <span className="text-[10px] text-muted-foreground">Selected:</span>
            <span className="text-xs font-semibold" style={{ color: teamColor(selectedTeam), fontFamily: 'Space Grotesk' }}>
              {selectedTeamObj?.name}
            </span>
            <button onClick={() => setSelectedTeam(null)}
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

      {/* ═══════════════════════════════════════════ */}
      {/* DRILL-DOWN: Away Impact */}
      {/* ═══════════════════════════════════════════ */}
      {selectedTeam && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <NeuCard delay={0.1} glow="emerald" className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <Target size={14} style={{ color: teamColor(selectedTeam) }} />
                  <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
                    <span style={{ color: teamColor(selectedTeam) }}>{selectedTeamObj?.short}</span>
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

          <NeuCard delay={0.15} glow="amber" className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <Home size={14} style={{ color: teamColor(selectedTeam) }} />
                  <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
                    <span style={{ color: teamColor(selectedTeam) }}>{selectedTeamObj?.short}</span>
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
      <ChartModal isOpen={maximized === 'home'} onClose={() => setMaximized(null)} title="Average Home Attendance by Team">
        <HomeBarContent height={600} />
      </ChartModal>
      <ChartModal isOpen={maximized === 'weekly'} onClose={() => setMaximized(null)} title="Attendance Trend by Matchweek">
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
