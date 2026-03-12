import { useMemo, useState, useEffect } from 'react';
import { useFilters } from '@/contexts/FilterContext';
import { getTeam, TEAM_BUDGETS } from '@/lib/mlsData';
import { Extruded3DStackedBar } from '@/lib/chartUtils';
import { useTheme } from '@/contexts/ThemeContext';
import NeuCard from '@/components/NeuCard';
import AnimatedCounter from '@/components/AnimatedCounter';
import { ChartModal, MaximizeButton } from '@/components/ChartModal';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { DollarSign, TrendingUp, Users, Trophy } from 'lucide-react';

export default function TeamBudget() {
  const { filteredTeams, filteredPlayers } = useFilters();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [maximized, setMaximized] = useState<string | null>(null);

  // Auto-select team when exactly one team is filtered globally
  useEffect(() => {
    if (filteredTeams.length === 1) {
      setSelectedTeam(filteredTeams[0].id);
    }
  }, [filteredTeams]);

  const budgetData = useMemo(() =>
    [...filteredTeams].map(t => {
      const b = TEAM_BUDGETS[t.id];
      return {
        name: t.short, id: t.id,
        total: b ? +(b.totalSalary / 1000000).toFixed(2) : 0,
        dp: b ? +(b.dpSalary / 1000000).toFixed(2) : 0,
        tam: b ? +(b.tamSalary / 1000000).toFixed(2) : 0,
        regular: b ? +(b.regularSalary / 1000000).toFixed(2) : 0,
        color: t.color,
      };
    }).sort((a, b) => b.total - a.total),
    [filteredTeams]
  );

  const totalBudget = budgetData.reduce((s, t) => s + t.total, 0);
  const avgBudget = budgetData.length > 0 ? totalBudget / budgetData.length : 0;
  const maxBudget = Math.max(...budgetData.map(t => t.total), 0);

  const selTeam = selectedTeam ? getTeam(selectedTeam) : null;
  const selBudget = selectedTeam ? TEAM_BUDGETS[selectedTeam] : null;
  const selPlayers = selectedTeam ? filteredPlayers.filter(p => p.team === selectedTeam) : [];

  const salaryBreakdown = useMemo(() => {
    if (!selPlayers.length) return [];
    const byPos: Record<string, number> = {};
    selPlayers.forEach(p => { byPos[p.position] = (byPos[p.position] || 0) + p.salary; });
    return Object.entries(byPos).map(([pos, total]) => ({
      name: pos === 'FW' ? 'Forwards' : pos === 'MF' ? 'Midfielders' : pos === 'DF' ? 'Defenders' : 'Goalkeepers',
      value: +(total / 1000000).toFixed(2),
      color: pos === 'FW' ? (isDark ? '#7A2020' : '#8A3030') : pos === 'MF' ? (isDark ? '#1A4A6A' : '#2A5A7A') : pos === 'DF' ? (isDark ? '#1A3A1A' : '#2A4A2A') : (isDark ? '#8B6914' : '#9A7828'),
    }));
  }, [selPlayers]);

  const topEarners = useMemo(() => [...selPlayers].sort((a, b) => b.salary - a.salary).slice(0, 8), [selPlayers]);

  const BudgetBarContent = ({ height = 350 }: { height?: number }) => (
    <div style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={budgetData} margin={{ top: 5, right: 10, bottom: 60, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--table-border)" />
          <XAxis dataKey="name" stroke="var(--table-header-color)" fontSize={9} tickLine={false} angle={-45} textAnchor="end" interval={0} tickMargin={6} />
          <YAxis stroke="var(--table-header-color)" fontSize={10} tickLine={false} label={{ value: '$ Millions', angle: -90, position: 'insideLeft', fill: 'var(--table-header-color)', fontSize: 10 }} />
          <Tooltip
            content={({ payload }) => {
              if (!payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="glass-sm p-2 text-xs" style={{ fontFamily: 'JetBrains Mono' }}>
                  <div className="text-amber font-semibold">{d.name}</div>
                  <div>Total: <span className="text-amber">${d.total}M</span></div>
                  <div>DP: <span className="text-cyan">${d.dp}M</span></div>
                  <div>TAM: <span className="text-emerald">${d.tam}M</span></div>
                  <div style={{ color: 'var(--glass-text-muted)' }}>Regular: ${d.regular}M</div>
                </div>
              );
            }}
          />
          <Bar dataKey="dp" stackId="a" fill={isDark ? '#1A4A6A' : '#2A5A7A'} name="DP Spend" radius={[0, 0, 0, 0]}
            shape={(props: any) => <Extruded3DStackedBar {...props} stackPosition="bottom" />} />
          <Bar dataKey="tam" stackId="a" fill={isDark ? '#8B6914' : '#9A7828'} name="TAM Spend"
            shape={(props: any) => <Extruded3DStackedBar {...props} stackPosition="middle" />} />
          <Bar dataKey="regular" stackId="a" fill={isDark ? '#1A3A1A' : '#2A4A2A'} name="Regular" radius={[3, 3, 0, 0]}
            shape={(props: any) => <Extruded3DStackedBar {...props} stackPosition="top" />} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="space-y-4 mt-4">
      {/* Tab Description */}
      <div className="px-1">
        <p className="text-xs text-muted-foreground leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
          <span className="font-semibold text-foreground">Team Budget</span> — Analyze how each MLS club allocates its salary budget across Designated Players, TAM, and regular contracts. Click a bar to drill into that team's positional salary breakdown and top earners. Use this to identify which teams invest heavily in attack vs. defense and spot potential value signings.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <NeuCard delay={0.05} glow="amber" className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={14} className="text-amber" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Spend</span>
          </div>
          <AnimatedCounter value={totalBudget} prefix="$" suffix="M" decimals={1} className="text-2xl text-amber" />
        </NeuCard>
        <NeuCard delay={0.12} glow="cyan" className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-cyan" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Avg Budget</span>
          </div>
          <AnimatedCounter value={avgBudget} prefix="$" suffix="M" decimals={1} className="text-2xl text-cyan" />
        </NeuCard>
        <NeuCard delay={0.2} glow="emerald" className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={14} className="text-emerald" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Highest</span>
          </div>
          <AnimatedCounter value={maxBudget} prefix="$" suffix="M" decimals={1} className="text-2xl text-emerald" />
        </NeuCard>
        <NeuCard delay={0.3} className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} className="text-purple-400" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Teams</span>
          </div>
          <AnimatedCounter value={filteredTeams.length} className="text-2xl text-purple-400" />
        </NeuCard>
      </div>

      {/* Budget Breakdown */}
      <NeuCard delay={0.15} className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>Team Salary Breakdown ($ Millions)</h3>
          <MaximizeButton onClick={() => setMaximized('budget')} />
        </div>
        <BudgetBarContent />
        <div className="flex justify-center gap-6 mt-2">
          {[{ label: 'Designated Players', color: isDark ? '#1A4A6A' : '#2A5A7A' }, { label: 'TAM', color: isDark ? '#8B6914' : '#9A7828' }, { label: 'Regular', color: isDark ? '#1A3A1A' : '#2A4A2A' }].map(l => (
            <div key={l.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      </NeuCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Salary Pie */}
        <NeuCard delay={0.25} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>Team Salary by Position</h3>
            <MaximizeButton onClick={() => setMaximized('salary')} />
          </div>
          <div className="flex flex-wrap gap-1 mb-3">
            {filteredTeams.slice(0, 15).map(t => (
              <button key={t.id} onClick={() => setSelectedTeam(t.id === selectedTeam ? null : t.id)}
                className={`text-[10px] px-2 py-1 rounded transition-all ${selectedTeam === t.id ? 'neu-pressed text-cyan' : 'neu-raised text-muted-foreground hover:text-foreground'}`}>
                {t.short}
              </button>
            ))}
          </div>
          {salaryBreakdown.length > 0 ? (
            <div style={{ height: 200 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={salaryBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value"
                    label={({ name, value }) => `${name}: $${value}M`} labelLine={false}>
                    {salaryBreakdown.map((d, i) => (<Cell key={i} fill={d.color} />))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--glass-bg)', backdropFilter: 'blur(20px) saturate(1.4)', WebkitBackdropFilter: 'blur(20px) saturate(1.4)', border: '1px solid var(--glass-border)', borderRadius: 12, fontSize: 11, color: 'var(--glass-text)', boxShadow: 'var(--glass-shadow)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">Select a team to view salary breakdown</div>
          )}
        </NeuCard>

        {/* Top Earners */}
        <NeuCard delay={0.35} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
              {selTeam ? `${selTeam.short} — Top Earners` : 'Top Earners (select team)'}
            </h3>
            {selTeam && <button onClick={() => setSelectedTeam(null)} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>}
          </div>
          {topEarners.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr><th>#</th><th>Player</th><th>Pos</th><th>Salary</th><th>Goals</th><th>Min</th><th>$/Goal</th></tr>
                </thead>
                <tbody>
                  {topEarners.map((p, i) => (
                    <tr key={p.id}>
                      <td className="text-muted-foreground">{i + 1}</td>
                      <td className="font-sans text-xs font-medium">{p.name}</td>
                      <td><span className={`px-1 py-0.5 rounded text-[9px] ${p.position === 'FW' ? 'bg-red-500/15 text-red-400' : p.position === 'MF' ? 'bg-blue-500/15 text-blue-400' : p.position === 'DF' ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>{p.position}</span></td>
                      <td className="text-amber">{p.salary >= 1000000 ? `$${(p.salary/1000000).toFixed(1)}M` : `$${(p.salary/1000).toFixed(0)}K`}</td>
                      <td className="text-cyan">{p.goals}</td>
                      <td>{p.minutes.toLocaleString()}</td>
                      <td className="text-muted-foreground">{p.goals > 0 ? `$${(p.salary / p.goals / 1000).toFixed(0)}K` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">Select a team above</div>
          )}
        </NeuCard>
      </div>

      {/* Maximize Modals */}
      <ChartModal isOpen={maximized === 'budget'} onClose={() => setMaximized(null)} title="Team Salary Breakdown ($ Millions)">
        <BudgetBarContent height={600} />
      </ChartModal>
      <ChartModal isOpen={maximized === 'salary'} onClose={() => setMaximized(null)} title={`Salary by Position${selTeam ? ` — ${selTeam.name}` : ''}`}>
        {salaryBreakdown.length > 0 ? (
          <div style={{ height: 500 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={salaryBreakdown} cx="50%" cy="50%" innerRadius={100} outerRadius={180} paddingAngle={3} dataKey="value"
                  label={({ name, value }) => `${name}: $${value}M`}>
                  {salaryBreakdown.map((d, i) => (<Cell key={i} fill={d.color} />))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--glass-bg)', backdropFilter: 'blur(20px) saturate(1.4)', WebkitBackdropFilter: 'blur(20px) saturate(1.4)', border: '1px solid var(--glass-border)', borderRadius: 12, fontSize: 13, color: 'var(--glass-text)', boxShadow: 'var(--glass-shadow)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="h-96 flex items-center justify-center text-muted-foreground">Select a team first</div>}
      </ChartModal>
    </div>
  );
}
