import { useState, useMemo } from 'react';
import { useFilters } from '@/contexts/FilterContext';
import { getTeam } from '@/lib/mlsData';
import { mutedTeamColor, Extruded3DDot } from '@/lib/chartUtils';
import { useTheme } from '@/contexts/ThemeContext';
import NeuCard from '@/components/NeuCard';
import AnimatedCounter from '@/components/AnimatedCounter';
import { ChartModal, MaximizeButton } from '@/components/ChartModal';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { ArrowUpDown, TrendingUp, Crosshair, Shield, Zap } from 'lucide-react';

type SortKey = 'goals' | 'assists' | 'minutes' | 'shotAccuracy' | 'tackles' | 'shots' | 'salary' | 'name';

/* ─── SCATTER AXIS OPTIONS ─── */
interface AxisOption {
  key: string;
  label: string;
  format?: (v: number) => string;
  minFilter?: number; // minimum value to include player (avoid clutter at 0)
}

const AXIS_OPTIONS: AxisOption[] = [
  { key: 'goals', label: 'Goals' },
  { key: 'assists', label: 'Assists' },
  { key: 'shots', label: 'Shots' },
  { key: 'shotsOnTarget', label: 'Shots on Target' },
  { key: 'shotAccuracy', label: 'Shot Accuracy %' },
  { key: 'minutes', label: 'Minutes Played' },
  { key: 'games', label: 'Games Played' },
  { key: 'age', label: 'Age' },
  { key: 'salary', label: 'Salary', format: (v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}K` },
  { key: 'tackles', label: 'Tackles' },
  { key: 'interceptions', label: 'Interceptions' },
  { key: 'fouls', label: 'Fouls Committed' },
  { key: 'fouled', label: 'Times Fouled' },
  { key: 'yellowCards', label: 'Yellow Cards' },
  { key: 'redCards', label: 'Red Cards' },
  { key: 'crosses', label: 'Crosses' },
  { key: 'offsides', label: 'Offsides' },
  { key: 'starts', label: 'Starts' },
];

function getAxisOption(key: string): AxisOption {
  return AXIS_OPTIONS.find(o => o.key === key) || AXIS_OPTIONS[0];
}

export default function PlayerStats() {
  const { filteredPlayers } = useFilters();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [sortKey, setSortKey] = useState<SortKey>('goals');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  const [maximized, setMaximized] = useState<string | null>(null);

  /* Scatter axis state */
  const [scatterX, setScatterX] = useState('shots');
  const [scatterY, setScatterY] = useState('goals');

  const sorted = useMemo(() => {
    return [...filteredPlayers].sort((a, b) => {
      const va = a[sortKey] as number | string;
      const vb = b[sortKey] as number | string;
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
      return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
  }, [filteredPlayers, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const topScorers = useMemo(() =>
    [...filteredPlayers].sort((a, b) => b.goals - a.goals).slice(0, 10),
    [filteredPlayers]
  );

  /* Dynamic scatter data based on selected axes */
  const scatterData = useMemo(() =>
    filteredPlayers
      .filter(p => p.minutes > 200) // minimum playing time filter
      .map(p => ({
        name: p.name,
        xVal: (p as any)[scatterX] as number,
        yVal: (p as any)[scatterY] as number,
        team: getTeam(p.team)?.short || '',
        teamId: p.team,
        position: p.position,
      })),
    [filteredPlayers, scatterX, scatterY]
  );

  const avgGoals = filteredPlayers.length > 0 ? filteredPlayers.reduce((s, p) => s + p.goals, 0) / filteredPlayers.length : 0;
  const avgAssists = filteredPlayers.length > 0 ? filteredPlayers.reduce((s, p) => s + p.assists, 0) / filteredPlayers.length : 0;
  const totalGoals = filteredPlayers.reduce((s, p) => s + p.goals, 0);
  const avgShotAcc = filteredPlayers.filter(p => p.shotAccuracy > 0).length > 0
    ? filteredPlayers.filter(p => p.shotAccuracy > 0).reduce((s, p) => s + p.shotAccuracy, 0) / filteredPlayers.filter(p => p.shotAccuracy > 0).length
    : 0;

  const selPlayer = selectedPlayer ? filteredPlayers.find(p => p.id === selectedPlayer) : null;
  const radarData = selPlayer ? [
    { stat: 'Goals', value: Math.min(100, (selPlayer.goals / 20) * 100) },
    { stat: 'Assists', value: Math.min(100, (selPlayer.assists / 15) * 100) },
    { stat: 'Shot Acc', value: selPlayer.shotAccuracy },
    { stat: 'Tackles', value: Math.min(100, (selPlayer.tackles / 80) * 100) },
    { stat: 'Shots', value: Math.min(100, (selPlayer.shots / 80) * 100) },
    { stat: 'Minutes', value: Math.min(100, (selPlayer.minutes / 3000) * 100) },
  ] : null;

  const xOpt = getAxisOption(scatterX);
  const yOpt = getAxisOption(scatterY);

  /* Format tick values for salary or large numbers */
  const formatTick = (opt: AxisOption) => (v: number) => {
    if (opt.format) return opt.format(v);
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 10_000) return `${(v / 1000).toFixed(0)}K`;
    return String(v);
  };

  const SortHeader = ({ label, k, w }: { label: string; k: SortKey; w?: string }) => (
    <th
      onClick={() => toggleSort(k)}
      className="cursor-pointer hover:text-cyan transition-colors select-none"
      style={{ width: w }}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortKey === k && <ArrowUpDown size={10} className="text-cyan" />}
      </span>
    </th>
  );

  /* ─── AXIS SELECTOR DROPDOWN ─── */
  const AxisDropdown = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}:</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-xs font-mono px-2 py-1 rounded-md border-0 cursor-pointer transition-all focus:outline-none focus:ring-1 focus:ring-cyan/50"
        style={{
          background: 'var(--card-bg)',
          color: 'var(--foreground)',
          boxShadow: isDark
            ? 'inset 2px 2px 4px rgba(0,0,0,0.4), inset -1px -1px 3px rgba(255,255,255,0.05)'
            : 'inset 2px 2px 4px rgba(0,0,0,0.08), inset -1px -1px 3px rgba(255,255,255,0.6)',
        }}
      >
        {AXIS_OPTIONS.map(opt => (
          <option key={opt.key} value={opt.key}>{opt.label}</option>
        ))}
      </select>
    </div>
  );

  /* ─── SCATTER CHART CONTENT ─── */
  const ScatterContent = ({ height = 280 }: { height?: number }) => (
    <div style={{ height }}>
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--table-border)" />
          <XAxis
            dataKey="xVal"
            name={xOpt.label}
            type="number"
            stroke="var(--table-header-color)"
            fontSize={10}
            tickLine={false}
            tickFormatter={formatTick(xOpt)}
            label={{ value: xOpt.label, position: 'bottom', fill: 'var(--table-header-color)', fontSize: 10 }}
          />
          <YAxis
            dataKey="yVal"
            name={yOpt.label}
            stroke="var(--table-header-color)"
            fontSize={10}
            tickLine={false}
            tickFormatter={formatTick(yOpt)}
            label={{ value: yOpt.label, angle: -90, position: 'insideLeft', fill: 'var(--table-header-color)', fontSize: 10 }}
          />
          <Tooltip
            content={({ payload }) => {
              if (!payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="neu-raised p-2 rounded-lg text-xs" style={{ fontFamily: 'JetBrains Mono' }}>
                  <div className="text-cyan font-semibold">{d.name}</div>
                  <div className="text-muted-foreground">{d.team} · {d.position}</div>
                  <div>
                    {xOpt.label}: <span className="text-amber">{xOpt.format ? xOpt.format(d.xVal) : d.xVal.toLocaleString()}</span>
                    {' | '}
                    {yOpt.label}: <span className="text-emerald">{yOpt.format ? yOpt.format(d.yVal) : d.yVal.toLocaleString()}</span>
                  </div>
                </div>
              );
            }}
          />
          <Scatter
            data={scatterData}
            fill={isDark ? '#3A6A7A' : '#4A7A8A'}
            fillOpacity={0.8}
            r={5}
            shape={(props: any) => {
              const teamColor = mutedTeamColor(props.payload?.teamId || '', isDark);
              return <Extruded3DDot {...props} fill={teamColor} />;
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="space-y-4 mt-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <NeuCard delay={0.05} glow="cyan" className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Crosshair size={14} className="text-cyan" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Goals</span>
          </div>
          <AnimatedCounter value={totalGoals} className="text-2xl text-cyan" />
        </NeuCard>
        <NeuCard delay={0.12} glow="amber" className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-amber" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Avg Goals/Player</span>
          </div>
          <AnimatedCounter value={avgGoals} decimals={1} className="text-2xl text-amber" />
        </NeuCard>
        <NeuCard delay={0.2} glow="emerald" className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={14} className="text-emerald" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Avg Assists</span>
          </div>
          <AnimatedCounter value={avgAssists} decimals={1} className="text-2xl text-emerald" />
        </NeuCard>
        <NeuCard delay={0.3} className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={14} className="text-purple-400" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Avg Shot Acc</span>
          </div>
          <AnimatedCounter value={avgShotAcc} decimals={1} suffix="%" className="text-2xl text-purple-400" />
        </NeuCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Scatter Plot with Axis Selectors */}
        <NeuCard delay={0.15} className="p-4 lg:col-span-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
              <Crosshair size={14} className="text-cyan" />
              Player Comparison
            </h3>
            <div className="flex items-center gap-3 flex-wrap">
              <AxisDropdown value={scatterX} onChange={setScatterX} label="X" />
              <AxisDropdown value={scatterY} onChange={setScatterY} label="Y" />
              <MaximizeButton onClick={() => setMaximized('scatter')} />
            </div>
          </div>
          <ScatterContent />
        </NeuCard>

        {/* Top Scorers */}
        <NeuCard delay={0.25} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>Top Scorers</h3>
            <MaximizeButton onClick={() => setMaximized('scorers')} />
          </div>
          <div className="space-y-1.5">
            {topScorers.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-accent transition-colors cursor-pointer"
                onClick={() => setSelectedPlayer(p.id)}
              >
                <span className="font-mono text-muted-foreground w-4">{i + 1}</span>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: mutedTeamColor(p.team, isDark) }} />
                <span className="flex-1 truncate">{p.name}</span>
                <span className="font-mono text-cyan font-semibold">{p.goals}</span>
                <div className="w-16 h-1.5 rounded-full bg-accent overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan to-cyan/40" style={{ width: `${(p.goals / (topScorers[0]?.goals || 1)) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </NeuCard>
      </div>

      {/* Player Radar (if selected) */}
      {selPlayer && radarData && (
        <NeuCard delay={0} animate={false} glow="cyan" className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>{selPlayer.name}</h3>
              <p className="text-xs text-muted-foreground">{getTeam(selPlayer.team)?.short} · {selPlayer.position} · Age {selPlayer.age}</p>
            </div>
            <div className="flex items-center gap-2">
              <MaximizeButton onClick={() => setMaximized('radar')} />
              <button onClick={() => setSelectedPlayer(null)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div style={{ height: 220 }}>
              <ResponsiveContainer>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--table-border)" />
                  <PolarAngleAxis dataKey="stat" tick={{ fill: 'var(--table-header-color)', fontSize: 10 }} />
                  <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                  <Radar dataKey="value" stroke="var(--cyan)" fill="var(--cyan)" fillOpacity={0.15} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([
                { label: 'Goals', value: selPlayer.goals, color: 'var(--cyan)' },
                { label: 'Assists', value: selPlayer.assists, color: '#ffb347' },
                { label: 'Shots', value: selPlayer.shots, color: '#00c897' },
                { label: 'Shot Acc', value: selPlayer.shotAccuracy, color: '#a78bfa', suffix: '%' },
                { label: 'Tackles', value: selPlayer.tackles, color: '#ff6b6b' },
                { label: 'Fouls', value: selPlayer.fouls, color: '#ff8c42' },
                { label: 'Minutes', value: selPlayer.minutes, color: 'var(--table-header-color)' },
                { label: 'Yellow', value: selPlayer.yellowCards, color: '#ffb347' },
                { label: 'Salary', value: selPlayer.salary, color: '#00c897' },
              ] as { label: string; value: number; color: string; suffix?: string }[]).map(s => (
                <div key={s.label} className="neu-inset rounded-lg p-2 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase">{s.label}</div>
                  <div className="font-mono text-sm font-bold" style={{ color: s.color }}>
                    {s.label === 'Salary' ? (s.value >= 1000000 ? `$${(s.value/1000000).toFixed(1)}M` : `$${(s.value/1000).toFixed(0)}K`) :
                     s.suffix ? `${s.value}${s.suffix}` : s.value.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </NeuCard>
      )}

      {/* Full Player Table */}
      <NeuCard delay={0.35} className="overflow-hidden">
        <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--table-border)' }}>
          <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>Player Database</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono">{sorted.length} players</span>
            <MaximizeButton onClick={() => setMaximized('table')} />
          </div>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto" style={{ background: 'var(--neu-bg-concave-from)', padding: '2px 0' }}>
          <table className="data-table">
            <thead>
              <tr>
                <SortHeader label="Player" k="name" w="160px" />
                <th>Team</th>
                <th>Pos</th>
                <th>Age</th>
                <th>GP</th>
                <SortHeader label="Min" k="minutes" />
                <SortHeader label="Goals" k="goals" />
                <SortHeader label="Assists" k="assists" />
                <SortHeader label="Shots" k="shots" />
                <th>SOT</th>
                <SortHeader label="Shot %" k="shotAccuracy" />
                <SortHeader label="Tackles" k="tackles" />
                <th>Int</th>
                <th>Fouls</th>
                <th>YC</th>
                <th>RC</th>
                <SortHeader label="Salary" k="salary" />
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, 100).map(p => (
                <tr key={p.id} className="cursor-pointer" onClick={() => setSelectedPlayer(p.id)}>
                  <td className="font-sans text-xs font-medium">{p.name}</td>
                  <td><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: mutedTeamColor(p.team, isDark) }} />{getTeam(p.team)?.short}</span></td>
                  <td><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${p.position === 'FW' ? 'bg-red-500/15 text-red-400' : p.position === 'MF' ? 'bg-blue-500/15 text-blue-400' : p.position === 'DF' ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>{p.position}</span></td>
                  <td>{p.age}</td>
                  <td>{p.games}</td>
                  <td>{p.minutes.toLocaleString()}</td>
                  <td className="text-cyan font-semibold">{p.goals}</td>
                  <td className="text-amber">{p.assists}</td>
                  <td>{p.shots}</td>
                  <td>{p.shotsOnTarget}</td>
                  <td>{p.shotAccuracy}%</td>
                  <td>{p.tackles}</td>
                  <td>{p.interceptions}</td>
                  <td>{p.fouls}</td>
                  <td className={p.yellowCards > 5 ? 'text-amber' : ''}>{p.yellowCards}</td>
                  <td className={p.redCards > 0 ? 'text-coral' : ''}>{p.redCards}</td>
                  <td className="text-emerald">{p.salary >= 1000000 ? `$${(p.salary/1000000).toFixed(1)}M` : `$${(p.salary/1000).toFixed(0)}K`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </NeuCard>

      {/* Maximize Modals */}
      <ChartModal isOpen={maximized === 'scatter'} onClose={() => setMaximized(null)} title={`${yOpt.label} vs ${xOpt.label}`}>
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <AxisDropdown value={scatterX} onChange={setScatterX} label="X Axis" />
          <AxisDropdown value={scatterY} onChange={setScatterY} label="Y Axis" />
        </div>
        <ScatterContent height={600} />
      </ChartModal>

      <ChartModal isOpen={maximized === 'scorers'} onClose={() => setMaximized(null)} title="Top Scorers">
        <div className="space-y-2">
          {[...filteredPlayers].sort((a, b) => b.goals - a.goals).slice(0, 30).map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 text-sm py-2 px-3 rounded-lg hover:bg-accent transition-colors">
              <span className="font-mono text-muted-foreground w-6 text-right">{i + 1}</span>
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: mutedTeamColor(p.team, isDark) }} />
              <span className="flex-1 font-medium">{p.name}</span>
              <span className="text-xs text-muted-foreground">{getTeam(p.team)?.short}</span>
              <span className="font-mono text-cyan font-bold text-lg">{p.goals}</span>
              <div className="w-32 h-2 rounded-full bg-accent overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan to-cyan/40" style={{ width: `${(p.goals / (filteredPlayers[0]?.goals || 1)) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </ChartModal>

      <ChartModal isOpen={maximized === 'radar'} onClose={() => setMaximized(null)} title={selPlayer ? `${selPlayer.name} — Performance Radar` : 'Player Radar'}>
        {selPlayer && radarData && (
          <div className="flex items-center justify-center" style={{ height: 500 }}>
            <ResponsiveContainer>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--table-border)" />
                <PolarAngleAxis dataKey="stat" tick={{ fill: 'var(--table-header-color)', fontSize: 14 }} />
                <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                <Radar dataKey="value" stroke="var(--cyan)" fill="var(--cyan)" fillOpacity={0.15} strokeWidth={3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartModal>

      <ChartModal isOpen={maximized === 'table'} onClose={() => setMaximized(null)} title={`Player Database — ${sorted.length} players`}>
        <div className="overflow-x-auto max-h-[75vh] overflow-y-auto">
          <table className="data-table">
            <thead>
              <tr>
                <SortHeader label="Player" k="name" w="180px" />
                <th>Team</th>
                <th>Pos</th>
                <th>Age</th>
                <th>GP</th>
                <SortHeader label="Min" k="minutes" />
                <SortHeader label="Goals" k="goals" />
                <SortHeader label="Assists" k="assists" />
                <SortHeader label="Shots" k="shots" />
                <th>SOT</th>
                <SortHeader label="Shot %" k="shotAccuracy" />
                <SortHeader label="Tackles" k="tackles" />
                <th>Int</th>
                <th>Fouls</th>
                <th>YC</th>
                <th>RC</th>
                <SortHeader label="Salary" k="salary" />
              </tr>
            </thead>
            <tbody>
              {sorted.map(p => (
                <tr key={p.id} className="cursor-pointer" onClick={() => { setSelectedPlayer(p.id); setMaximized(null); }}>
                  <td className="font-sans text-xs font-medium">{p.name}</td>
                  <td><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: mutedTeamColor(p.team, isDark) }} />{getTeam(p.team)?.short}</span></td>
                  <td><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${p.position === 'FW' ? 'bg-red-500/15 text-red-400' : p.position === 'MF' ? 'bg-blue-500/15 text-blue-400' : p.position === 'DF' ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>{p.position}</span></td>
                  <td>{p.age}</td>
                  <td>{p.games}</td>
                  <td>{p.minutes.toLocaleString()}</td>
                  <td className="text-cyan font-semibold">{p.goals}</td>
                  <td className="text-amber">{p.assists}</td>
                  <td>{p.shots}</td>
                  <td>{p.shotsOnTarget}</td>
                  <td>{p.shotAccuracy}%</td>
                  <td>{p.tackles}</td>
                  <td>{p.interceptions}</td>
                  <td>{p.fouls}</td>
                  <td className={p.yellowCards > 5 ? 'text-amber' : ''}>{p.yellowCards}</td>
                  <td className={p.redCards > 0 ? 'text-coral' : ''}>{p.redCards}</td>
                  <td className="text-emerald">{p.salary >= 1000000 ? `$${(p.salary/1000000).toFixed(1)}M` : `$${(p.salary/1000).toFixed(0)}K`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartModal>
    </div>
  );
}
