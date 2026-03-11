import { useMemo, useState } from 'react';
import { useFilters } from '@/contexts/FilterContext';
import { TEAMS, getTeam } from '@/lib/mlsData';
import NeuCard from '@/components/NeuCard';
import AnimatedCounter from '@/components/AnimatedCounter';
import { ChartModal, MaximizeButton } from '@/components/ChartModal';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Line, Cell
} from 'recharts';
import { Users, TrendingUp, TrendingDown, MapPin } from 'lucide-react';

export default function Attendance() {
  const { filteredTeams, filteredMatches } = useFilters();
  const [selectedHome, setSelectedHome] = useState<string>('MIA');
  const [maximized, setMaximized] = useState<string | null>(null);

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

  const homeAvgData = useMemo(() => {
    return filteredTeams.map(t => {
      const homeMatches = filteredMatches.filter(m => m.homeTeam === t.id && m.attendance > 0);
      const avg = homeMatches.length > 0 ? homeMatches.reduce((s, m) => s + m.attendance, 0) / homeMatches.length : 0;
      return { name: t.short, id: t.id, avg: Math.round(avg), color: t.color };
    }).sort((a, b) => b.avg - a.avg);
  }, [filteredTeams, filteredMatches]);

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

  const awayEffect = useMemo(() => {
    const homeMatches = filteredMatches.filter(m => m.homeTeam === selectedHome && m.attendance > 0);
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
        delta: Math.round(awayAvg - avgHome), avgAtt: Math.round(awayAvg),
        matches: atts.length, color: getTeam(awayId)?.color || '#666',
      };
    }).sort((a, b) => b.delta - a.delta);
  }, [filteredMatches, selectedHome]);

  const homeTeam = getTeam(selectedHome);
  const homeAvg = useMemo(() => {
    const hm = filteredMatches.filter(m => m.homeTeam === selectedHome && m.attendance > 0);
    return hm.length > 0 ? Math.round(hm.reduce((s, m) => s + m.attendance, 0) / hm.length) : 0;
  }, [filteredMatches, selectedHome]);

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
            return (
              <div className="neu-raised p-2 rounded-lg text-xs" style={{ fontFamily: 'JetBrains Mono' }}>
                <div className="text-cyan font-semibold">{d.name}</div>
                <div>Avg: <span className="text-amber">{d.avg.toLocaleString()}</span></div>
              </div>
            );
          }} />
          <Bar dataKey="avg" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(d: any) => setSelectedHome(d.id)}>
            {homeAvgData.map((d, i) => (
              <Cell key={i} fill={d.id === selectedHome ? '#00d4ff' : d.color} fillOpacity={d.id === selectedHome ? 1 : 0.6} />
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
          <Area type="monotone" dataKey="avg" stroke="#00d4ff" fill="url(#attGrad)" strokeWidth={2} name="Avg Attendance" />
          <Line type="monotone" dataKey="max" stroke="#ffb347" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Max" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  const AwayEffectContent = ({ height = 300 }: { height?: number }) => (
    <div style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={awayEffect} margin={{ top: 5, right: 10, bottom: 60, left: 0 }} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis type="number" stroke="#8892b0" fontSize={10} tickLine={false} />
          <YAxis dataKey="awayTeam" type="category" stroke="#8892b0" fontSize={9} tickLine={false} width={80} />
          <Tooltip content={({ payload }) => {
            if (!payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div className="neu-raised p-2 rounded-lg text-xs" style={{ fontFamily: 'JetBrains Mono' }}>
                <div className="font-semibold">{d.awayTeam} visiting {homeTeam?.short}</div>
                <div>Delta: <span className={d.delta >= 0 ? 'text-emerald' : 'text-coral'}>{d.delta >= 0 ? '+' : ''}{d.delta.toLocaleString()}</span></div>
                <div>Avg Attendance: <span className="text-cyan">{d.avgAtt.toLocaleString()}</span></div>
                <div>Matches: <span className="text-muted-foreground">{d.matches}</span></div>
              </div>
            );
          }} />
          <Bar dataKey="delta" radius={[0, 4, 4, 0]}>
            {awayEffect.map((d, i) => (
              <Cell key={i} fill={d.delta >= 0 ? '#00c897' : '#ff6b6b'} fillOpacity={0.7} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

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

      {/* Travel Away Effect */}
      <NeuCard delay={0.35} glow="cyan" className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
              Travel Away Effect — {homeTeam?.name || 'Select Team'}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Attendance delta when each away team visits. Baseline avg: <span className="text-cyan font-mono">{homeAvg.toLocaleString()}</span>
            </p>
          </div>
          <MaximizeButton onClick={() => setMaximized('away')} />
        </div>
        <div className="flex flex-wrap gap-1 mb-3">
          {filteredTeams.map(t => (
            <button key={t.id} onClick={() => setSelectedHome(t.id)}
              className={`text-[10px] px-2 py-0.5 rounded transition-all ${selectedHome === t.id ? 'neu-pressed text-cyan' : 'text-muted-foreground hover:text-foreground'}`}>
              {t.short}
            </button>
          ))}
        </div>
        <AwayEffectContent />
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Positive delta = away team draws more fans than average. Negative = fewer fans than average home attendance.
        </p>
      </NeuCard>

      {/* Maximize Modals */}
      <ChartModal isOpen={maximized === 'home'} onClose={() => setMaximized(null)} title="Average Home Attendance by Team">
        <HomeBarContent height={600} />
      </ChartModal>
      <ChartModal isOpen={maximized === 'weekly'} onClose={() => setMaximized(null)} title="Attendance Trend by Matchweek">
        <WeeklyContent height={600} />
      </ChartModal>
      <ChartModal isOpen={maximized === 'away'} onClose={() => setMaximized(null)} title={`Travel Away Effect — ${homeTeam?.name || 'Select Team'}`}>
        <AwayEffectContent height={600} />
      </ChartModal>
    </div>
  );
}
