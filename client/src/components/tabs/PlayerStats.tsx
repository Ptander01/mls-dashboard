import { useState, useMemo, useCallback } from 'react';
import { useFilters } from '@/contexts/FilterContext';
import { getTeam } from '@/lib/mlsData';
import { mutedTeamColor, positionColor, Extruded3DDot, linearRegression } from '@/lib/chartUtils';
import { useTheme } from '@/contexts/ThemeContext';
import NeuCard from '@/components/NeuCard';
import AnimatedCounter from '@/components/AnimatedCounter';
import { ChartModal, MaximizeButton } from '@/components/ChartModal';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ReferenceLine
} from 'recharts';
import { ArrowUpDown, TrendingUp, Crosshair, Shield, Zap, Palette } from 'lucide-react';
import { InsightPanel } from '@/components/InsightPanel';
import { playerStatsInsights, computeOutliers, scatterCardInsights, topScorersCardInsights, playerRadarCardInsights, playerTableCardInsights } from '@/lib/insightEngine';
import { CardInsightToggle, CardInsightSection } from '@/components/CardInsight';
import StatsPlayground from '@/components/charts/StatsPlayground';

type SortKey = 'name' | 'team' | 'position' | 'age' | 'games' | 'minutes' | 'goals' | 'assists' | 'shots' | 'shotsOnTarget' | 'shotAccuracy' | 'tackles' | 'interceptions' | 'fouls' | 'yellowCards' | 'redCards' | 'salary';

/* ─── SCATTER AXIS OPTIONS ─── */
interface AxisOption {
  key: string;
  label: string;
  format?: (v: number) => string;
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

/* Color mode for scatter dots */
type ColorMode = 'team' | 'position';

/* Position legend data */
const POSITION_LEGEND = [
  { pos: 'FW', label: 'Forward', darkColor: '#9A3A3A', lightColor: '#B04040' },
  { pos: 'MF', label: 'Midfielder', darkColor: '#3A5A8A', lightColor: '#4A6A9A' },
  { pos: 'DF', label: 'Defender', darkColor: '#3A6A4A', lightColor: '#4A7A5A' },
  { pos: 'GK', label: 'Goalkeeper', darkColor: '#8A7A3A', lightColor: '#9A8A4A' },
];

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

  /* Color mode toggle */
  const [colorMode, setColorMode] = useState<ColorMode>('team');

  /* Show/hide trend line */
  const [showTrendLine, setShowTrendLine] = useState(true);

  /* Insight engine state */
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  /* Per-card insight toggle states */
  const [showScatterInsights, setShowScatterInsights] = useState(false);
  const [showScorersInsights, setShowScorersInsights] = useState(false);
  const [showRadarInsights, setShowRadarInsights] = useState(false);
  const [showTableInsights, setShowTableInsights] = useState(false);

  const insights = useMemo(() =>
    playerStatsInsights(filteredPlayers),
    [filteredPlayers]
  );

  /* Per-card insights (non-scatter) */
  const scorersInsights = useMemo(() =>
    topScorersCardInsights(filteredPlayers),
    [filteredPlayers]
  );

  const tableInsights = useMemo(() =>
    playerTableCardInsights(filteredPlayers),
    [filteredPlayers]
  );

  const sorted = useMemo(() => {
    return [...filteredPlayers].sort((a, b) => {
      let va: any, vb: any;
      if (sortKey === 'team') {
        va = getTeam(a.team)?.short || '';
        vb = getTeam(b.team)?.short || '';
      } else {
        va = a[sortKey];
        vb = b[sortKey];
      }
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
      .filter(p => p.minutes > 200)
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

  /* Linear regression computation */
  const regression = useMemo(() => {
    const pts = scatterData
      .filter(d => d.xVal != null && d.yVal != null && isFinite(d.xVal) && isFinite(d.yVal))
      .map(d => ({ x: d.xVal, y: d.yVal }));
    return linearRegression(pts);
  }, [scatterData]);

  /* Outlier annotations for scatter plot */
  const outliers = useMemo(() =>
    computeOutliers(scatterData, regression, 2),
    [scatterData, regression]
  );

  /* Per-card insights for scatter (depends on regression) */
  const scatterInsights = useMemo(() =>
    scatterCardInsights(filteredPlayers, scatterX, scatterY, regression?.r2 ?? 0),
    [filteredPlayers, scatterX, scatterY, regression]
  );

  /* Trend line endpoints — extend slightly beyond data range */
  const trendLineData = useMemo(() => {
    if (!showTrendLine || scatterData.length < 3) return null;
    const xVals = scatterData.map(d => d.xVal).filter(v => isFinite(v));
    if (xVals.length < 2) return null;
    const xMin = Math.min(...xVals);
    const xMax = Math.max(...xVals);
    const pad = (xMax - xMin) * 0.02;
    const x1 = xMin - pad;
    const x2 = xMax + pad;
    return [
      { x: x1, y: regression.slope * x1 + regression.intercept },
      { x: x2, y: regression.slope * x2 + regression.intercept },
    ];
  }, [showTrendLine, scatterData, regression]);

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
          background: 'var(--neu-bg-pressed)',
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

  /* ─── COLOR MODE TOGGLE BUTTON ─── */
  const ColorModeToggle = () => (
    <button
      onClick={() => setColorMode(m => m === 'team' ? 'position' : 'team')}
      className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md transition-all"
      style={{
        background: 'var(--neu-bg-pressed)',
        color: colorMode === 'position' ? 'var(--cyan)' : 'var(--muted-foreground)',
        boxShadow: colorMode === 'position'
          ? (isDark
              ? 'inset 2px 2px 4px rgba(0,0,0,0.5), inset -1px -1px 3px rgba(60,60,80,0.08)'
              : 'inset 2px 2px 4px rgba(0,0,0,0.1), inset -1px -1px 3px rgba(255,255,255,0.5)')
          : (isDark
              ? '2px 2px 4px rgba(0,0,0,0.4), -1px -1px 3px rgba(60,60,80,0.08)'
              : '2px 2px 4px rgba(166,170,190,0.3), -1px -1px 3px rgba(255,255,255,0.7)'),
        fontFamily: 'Space Grotesk, sans-serif',
      }}
      title={colorMode === 'team' ? 'Switch to position colors' : 'Switch to team colors'}
    >
      <Palette size={11} />
      {colorMode === 'team' ? 'TEAM' : 'POS'}
    </button>
  );

  /* ─── TREND LINE TOGGLE ─── */
  const TrendLineToggle = () => (
    <button
      onClick={() => setShowTrendLine(v => !v)}
      className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md transition-all"
      style={{
        background: 'var(--neu-bg-pressed)',
        color: showTrendLine ? 'var(--amber)' : 'var(--muted-foreground)',
        boxShadow: showTrendLine
          ? (isDark
              ? 'inset 2px 2px 4px rgba(0,0,0,0.5), inset -1px -1px 3px rgba(60,60,80,0.08)'
              : 'inset 2px 2px 4px rgba(0,0,0,0.1), inset -1px -1px 3px rgba(255,255,255,0.5)')
          : (isDark
              ? '2px 2px 4px rgba(0,0,0,0.4), -1px -1px 3px rgba(60,60,80,0.08)'
              : '2px 2px 4px rgba(166,170,190,0.3), -1px -1px 3px rgba(255,255,255,0.7)'),
        fontFamily: 'Space Grotesk, sans-serif',
      }}
      title={showTrendLine ? 'Hide trend line' : 'Show trend line'}
    >
      <TrendingUp size={11} />
      TREND
    </button>
  );

  /* ─── POSITION LEGEND ─── */
  const PositionLegend = () => {
    if (colorMode !== 'position') return null;
    return (
      <div className="flex items-center gap-3 mt-1.5">
        {POSITION_LEGEND.map(p => (
          <div key={p.pos} className="flex items-center gap-1">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: isDark ? p.darkColor : p.lightColor }}
            />
            <span className="text-[9px] text-muted-foreground font-medium">{p.label}</span>
          </div>
        ))}
      </div>
    );
  };

  /* ─── R² BADGE ─── */
  const R2Badge = () => {
    if (!showTrendLine || scatterData.length < 3) return null;
    const r2 = regression.r2;
    const strength = r2 >= 0.7 ? 'Strong' : r2 >= 0.4 ? 'Moderate' : r2 >= 0.15 ? 'Weak' : 'Very Weak';
    const color = r2 >= 0.7 ? 'var(--emerald)' : r2 >= 0.4 ? 'var(--amber)' : 'var(--muted-foreground)';
    return (
      <div
        className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-mono"
        style={{
          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
          color,
        }}
      >
        <span>R<sup>2</sup> = {r2.toFixed(3)}</span>
        <span className="text-muted-foreground">({strength})</span>
      </div>
    );
  };

  /* ─── CUSTOM TREND LINE rendered as SVG inside Recharts ─── */
  const TrendLineSVG = ({ xAxisMap, yAxisMap }: any) => {
    if (!trendLineData || !xAxisMap || !yAxisMap) return null;
    // Access the first axis map entries
    const xAxis = Object.values(xAxisMap)[0] as any;
    const yAxis = Object.values(yAxisMap)[0] as any;
    if (!xAxis?.scale || !yAxis?.scale) return null;

    const x1 = xAxis.scale(trendLineData[0].x);
    const y1 = yAxis.scale(trendLineData[0].y);
    const x2 = xAxis.scale(trendLineData[1].x);
    const y2 = yAxis.scale(trendLineData[1].y);

    if ([x1, y1, x2, y2].some(v => !isFinite(v))) return null;

    const trendColor = isDark ? 'rgba(255,179,71,0.6)' : 'rgba(217,119,6,0.5)';
    const shadowColor = isDark ? 'rgba(255,179,71,0.15)' : 'rgba(217,119,6,0.1)';

    return (
      <g>
        {/* Shadow line underneath */}
        <line
          x1={x1} y1={y1 + 3}
          x2={x2} y2={y2 + 3}
          stroke={shadowColor}
          strokeWidth={4}
          strokeLinecap="round"
          style={{ filter: 'blur(3px)' }}
        />
        {/* Main trend line */}
        <line
          x1={x1} y1={y1}
          x2={x2} y2={y2}
          stroke={trendColor}
          strokeWidth={2}
          strokeDasharray="8 4"
          strokeLinecap="round"
        />
        {/* Bright highlight on top */}
        <line
          x1={x1} y1={y1 - 0.5}
          x2={x2} y2={y2 - 0.5}
          stroke={isDark ? 'rgba(255,220,150,0.2)' : 'rgba(217,119,6,0.15)'}
          strokeWidth={1}
          strokeDasharray="8 4"
          strokeLinecap="round"
        />
      </g>
    );
  };

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
                <div className="glass-sm p-2 text-xs" style={{ fontFamily: 'JetBrains Mono' }}>
                  <div className="text-cyan font-semibold">{d.name}</div>
                  <div style={{ color: 'var(--glass-text-muted)' }}>{d.team} · {d.position}</div>
                  <div>
                    {xOpt.label}: <span className="text-amber">{xOpt.format ? xOpt.format(d.xVal) : d.xVal.toLocaleString()}</span>
                    {' | '}
                    {yOpt.label}: <span className="text-emerald">{yOpt.format ? yOpt.format(d.yVal) : d.yVal.toLocaleString()}</span>
                  </div>
                </div>
              );
            }}
          />
          {/* Trend line rendered via customized layer */}
          <Scatter
            data={scatterData}
            fill={isDark ? '#3A6A7A' : '#4A7A8A'}
            fillOpacity={0.8}
            r={5}
            shape={(props: any) => {
              const dotColor = colorMode === 'position'
                ? positionColor(props.payload?.position || '', isDark)
                : mutedTeamColor(props.payload?.teamId || '', isDark);
              return <Extruded3DDot {...props} fill={dotColor} />;
            }}
          />
          {/* Render trend line using customized content */}
          {showTrendLine && trendLineData && (
            <Scatter
              data={[]}
              fill="transparent"
              isAnimationActive={false}
              legendType="none"
              // @ts-ignore — access internal axis maps via customized content
              shape={() => null}
            />
          )}
        </ScatterChart>
      </ResponsiveContainer>
      {/* Overlay trend line using a separate SVG approach */}
    </div>
  );

  return (
    <div className="space-y-6 mt-4">
      {/* Tab Header Card — elevated command center */}
      <NeuCard variant="raised" animate={true} delay={0.02} className="p-5">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">Player Stats</span> — Compare individual player performance across the 2025 MLS season. Use the scatter plot to explore relationships between any two metrics (e.g., Shots vs Goals). Toggle between team and position coloring, and use the trend line to gauge correlation strength. Click any player row or dot to view their full performance radar.
        </p>
        <InsightPanel insights={insights} isDark={isDark} onToggle={setIsAnalyzing} />
      </NeuCard>

      {/* League-Wide Totals */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-1 h-4 rounded-full bg-cyan" style={{ boxShadow: '0 0 6px var(--cyan)' }} />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" style={{ fontFamily: 'Space Grotesk' }}>League-Wide Totals</h2>
          <span className="text-[10px] text-muted-foreground/60 ml-1">Aggregate stats across all filtered players</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Scatter Plot with Axis Selectors, Color Mode, and Trend Line */}
        <NeuCard delay={0.15} className="p-4 lg:col-span-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-1">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
                <Crosshair size={14} className="text-cyan" />
                Player Comparison
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5 ml-5">Plot any two metrics to find correlations and outliers across the league</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <AxisDropdown value={scatterX} onChange={setScatterX} label="X" />
              <AxisDropdown value={scatterY} onChange={setScatterY} label="Y" />
              <ColorModeToggle />
              <TrendLineToggle />
              <CardInsightToggle isOpen={showScatterInsights} onToggle={() => setShowScatterInsights(v => !v)} isDark={isDark} compact />
              <MaximizeButton onClick={() => setMaximized('scatter')} />
            </div>
          </div>
          <CardInsightSection isOpen={showScatterInsights} insights={scatterInsights} isDark={isDark} />
          <div className="flex items-center justify-between mb-2">
            <PositionLegend />
            <R2Badge />
          </div>
          <ScatterChartWithTrend
            scatterData={scatterData}
            xOpt={xOpt}
            yOpt={yOpt}
            formatTick={formatTick}
            isDark={isDark}
            colorMode={colorMode}
            showTrendLine={showTrendLine}
            regression={regression}
            outliers={outliers}
            height={280}
          />
        </NeuCard>

        {/* Top Scorers */}
        <NeuCard delay={0.25} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>Top Scorers</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Season goal leaders ranked by total goals scored</p>
            </div>
            <div className="flex items-center gap-2">
              <CardInsightToggle isOpen={showScorersInsights} onToggle={() => setShowScorersInsights(v => !v)} isDark={isDark} compact />
              <MaximizeButton onClick={() => setMaximized('scorers')} />
            </div>
          </div>
          <CardInsightSection isOpen={showScorersInsights} insights={scorersInsights} isDark={isDark} />
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
              <CardInsightToggle isOpen={showRadarInsights} onToggle={() => setShowRadarInsights(v => !v)} isDark={isDark} compact />
              <MaximizeButton onClick={() => setMaximized('radar')} />
              <button onClick={() => setSelectedPlayer(null)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
            </div>
          </div>
          <CardInsightSection isOpen={showRadarInsights} insights={selPlayer ? playerRadarCardInsights(selPlayer, filteredPlayers) : []} isDark={isDark} />
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
          <div>
            <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>Player Database</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Full roster table — sort by any column, click a row to view the player radar</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono">{sorted.length} players</span>
            <CardInsightToggle isOpen={showTableInsights} onToggle={() => setShowTableInsights(v => !v)} isDark={isDark} compact />
            <MaximizeButton onClick={() => setMaximized('table')} />
          </div>
        </div>
        <CardInsightSection isOpen={showTableInsights} insights={tableInsights} isDark={isDark} />
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto" style={{ background: 'var(--neu-bg-concave-from)', padding: '2px 0' }}>
          <table className="data-table">
            <thead>
              <tr>
                <SortHeader label="Player" k="name" w="160px" />
                <SortHeader label="Team" k="team" />
                <SortHeader label="Pos" k="position" />
                <SortHeader label="Age" k="age" />
                <SortHeader label="GP" k="games" />
                <SortHeader label="Min" k="minutes" />
                <SortHeader label="Goals" k="goals" />
                <SortHeader label="Assists" k="assists" />
                <SortHeader label="Shots" k="shots" />
                <SortHeader label="SOT" k="shotsOnTarget" />
                <SortHeader label="Shot %" k="shotAccuracy" />
                <SortHeader label="Tackles" k="tackles" />
                <SortHeader label="Int" k="interceptions" />
                <SortHeader label="Fouls" k="fouls" />
                <SortHeader label="YC" k="yellowCards" />
                <SortHeader label="RC" k="redCards" />
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

      {/* Statistical Playground */}
      <StatsPlayground
        players={filteredPlayers}
        onAxisChange={(xKey, yKey) => { setScatterX(xKey); setScatterY(yKey); }}
      />

      {/* Maximize Modals */}
      <ChartModal isOpen={maximized === 'scatter'} onClose={() => setMaximized(null)} title={`${yOpt.label} vs ${xOpt.label}`}>
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <AxisDropdown value={scatterX} onChange={setScatterX} label="X Axis" />
          <AxisDropdown value={scatterY} onChange={setScatterY} label="Y Axis" />
          <ColorModeToggle />
          <TrendLineToggle />
        </div>
        <div className="flex items-center justify-between mb-3">
          <PositionLegend />
          <R2Badge />
        </div>
        <ScatterChartWithTrend
          scatterData={scatterData}
          xOpt={xOpt}
          yOpt={yOpt}
          formatTick={formatTick}
          isDark={isDark}
          colorMode={colorMode}
          showTrendLine={showTrendLine}
          regression={regression}
          outliers={outliers}
          height={600}
        />
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

      <ChartModal isOpen={maximized === 'radar'} onClose={() => setMaximized(null)} title={selPlayer ? `${selPlayer.name} \u2014 Performance Radar` : 'Player Radar'}>
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

      <ChartModal isOpen={maximized === 'table'} onClose={() => setMaximized(null)} title={`Player Database \u2014 ${sorted.length} players`}>
        <div className="overflow-x-auto max-h-[75vh] overflow-y-auto">
          <table className="data-table">
            <thead>
              <tr>
                <SortHeader label="Player" k="name" w="180px" />
                <SortHeader label="Team" k="team" />
                <SortHeader label="Pos" k="position" />
                <SortHeader label="Age" k="age" />
                <SortHeader label="GP" k="games" />
                <SortHeader label="Min" k="minutes" />
                <SortHeader label="Goals" k="goals" />
                <SortHeader label="Assists" k="assists" />
                <SortHeader label="Shots" k="shots" />
                <SortHeader label="SOT" k="shotsOnTarget" />
                <SortHeader label="Shot %" k="shotAccuracy" />
                <SortHeader label="Tackles" k="tackles" />
                <SortHeader label="Int" k="interceptions" />
                <SortHeader label="Fouls" k="fouls" />
                <SortHeader label="YC" k="yellowCards" />
                <SortHeader label="RC" k="redCards" />
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

/**
 * ScatterChartWithTrend — Scatter plot with an SVG overlay trend line
 * Uses a ref-based approach to draw the regression line directly on the SVG
 */
function ScatterChartWithTrend({
  scatterData,
  xOpt,
  yOpt,
  formatTick,
  isDark,
  colorMode,
  showTrendLine,
  regression,
  outliers = [],
  height = 280,
}: {
  scatterData: any[];
  xOpt: AxisOption;
  yOpt: AxisOption;
  formatTick: (opt: AxisOption) => (v: number) => string;
  isDark: boolean;
  colorMode: ColorMode;
  showTrendLine: boolean;
  regression: { slope: number; intercept: number; r2: number };
  outliers?: { name: string; xVal: number; yVal: number; direction: 'over' | 'under' }[];
  height?: number;
}) {
  /* Compute trend line reference line segment endpoints */
  const trendLinePoints = useMemo(() => {
    if (!showTrendLine || scatterData.length < 3) return null;
    const xVals = scatterData.map(d => d.xVal).filter((v: number) => isFinite(v));
    if (xVals.length < 2) return null;
    const xMin = Math.min(...xVals);
    const xMax = Math.max(...xVals);
    return { xMin, xMax, yMin: regression.slope * xMin + regression.intercept, yMax: regression.slope * xMax + regression.intercept };
  }, [showTrendLine, scatterData, regression]);

  return (
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
                <div className="glass-sm p-2 text-xs" style={{ fontFamily: 'JetBrains Mono' }}>
                  <div className="text-cyan font-semibold">{d.name}</div>
                  <div style={{ color: 'var(--glass-text-muted)' }}>{d.team} · {d.position}</div>
                  <div>
                    {xOpt.label}: <span className="text-amber">{xOpt.format ? xOpt.format(d.xVal) : d.xVal.toLocaleString()}</span>
                    {' | '}
                    {yOpt.label}: <span className="text-emerald">{yOpt.format ? yOpt.format(d.yVal) : d.yVal.toLocaleString()}</span>
                  </div>
                </div>
              );
            }}
          />
          {/* Trend line as ReferenceLine — using segment prop */}
          {showTrendLine && trendLinePoints && (
            <ReferenceLine
              segment={[
                { x: trendLinePoints.xMin, y: trendLinePoints.yMin },
                { x: trendLinePoints.xMax, y: trendLinePoints.yMax },
              ] as any}
              stroke={isDark ? 'rgba(255,179,71,0.55)' : 'rgba(180,100,20,0.45)'}
              strokeWidth={2}
              strokeDasharray="8 4"
              ifOverflow="extendDomain"
              style={{
                filter: isDark
                  ? 'drop-shadow(2px 3px 3px rgba(255,179,71,0.2))'
                  : 'drop-shadow(2px 3px 3px rgba(180,100,20,0.15))',
              }}
            />
          )}
          <Scatter
            data={scatterData}
            fill={isDark ? '#3A6A7A' : '#4A7A8A'}
            fillOpacity={0.8}
            r={5}
            shape={(props: any) => {
              const dotColor = colorMode === 'position'
                ? positionColor(props.payload?.position || '', isDark)
                : mutedTeamColor(props.payload?.teamId || '', isDark);
              return <Extruded3DDot {...props} fill={dotColor} />;
            }}
          />
          {/* Outlier annotation labels */}
          {outliers.map((outlier, i) => {
            const overColor = isDark ? '#00d4ff' : '#0891b2';
            const underColor = isDark ? '#ff6b6b' : '#dc2626';
            const color = outlier.direction === 'over' ? overColor : underColor;
            const yOffset = outlier.direction === 'over' ? -18 : 16;
            return (
              <ReferenceLine
                key={`outlier-${i}`}
                segment={[
                  { x: outlier.xVal, y: outlier.yVal },
                  { x: outlier.xVal, y: outlier.yVal },
                ] as any}
                ifOverflow="extendDomain"
                stroke="transparent"
                label={{
                  value: outlier.name.split(' ').slice(-1)[0],
                  position: outlier.direction === 'over' ? 'top' : 'bottom',
                  fill: color,
                  fontSize: 9,
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontWeight: 600,
                  offset: 8,
                }}
              />
            );
          })}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
