import { useMemo, useState } from 'react';
import { useFilters } from '@/contexts/FilterContext';
import { getTeam } from '@/lib/mlsData';
import NeuCard from '@/components/NeuCard';
import AnimatedCounter from '@/components/AnimatedCounter';
import { ChartModal, MaximizeButton } from '@/components/ChartModal';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ScatterChart, Scatter
} from 'recharts';
import { DollarSign, TrendingUp, Users, Trophy } from 'lucide-react';

export default function TeamBudget() {
  const { filteredTeams, filteredPlayers } = useFilters();
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [maximized, setMaximized] = useState<string | null>(null);

  const budgetData = useMemo(() =>
    [...filteredTeams].sort((a, b) => b.budget - a.budget).map(t => ({
      name: t.shortName, id: t.id, budget: t.budget, dp: t.dpSpend, tam: t.tamSpend, gam: t.gamSpend, points: t.points, color: t.primaryColor,
    })),
    [filteredTeams]
  );

  const totalBudget = filteredTeams.reduce((s, t) => s + t.budget, 0);
  const avgBudget = filteredTeams.length > 0 ? totalBudget / filteredTeams.length : 0;
  const maxBudget = Math.max(...filteredTeams.map(t => t.budget), 0);
  const costPerPoint = useMemo(() => {
    const valid = filteredTeams.filter(t => t.points > 0);
    return valid.length > 0 ? valid.reduce((s, t) => s + t.budget / t.points, 0) / valid.length : 0;
  }, [filteredTeams]);

  const efficiencyData = useMemo(() =>
    filteredTeams.map(t => ({
      name: t.shortName, budget: t.budget, points: t.points, color: t.primaryColor,
      ppd: +(t.points / t.budget).toFixed(2),
    })),
    [filteredTeams]
  );

  const selTeam = selectedTeam ? filteredTeams.find(t => t.id === selectedTeam) : null;
  const selPlayers = selectedTeam ? filteredPlayers.filter(p => p.teamId === selectedTeam) : [];
  const salaryBreakdown = useMemo(() => {
    if (!selPlayers.length) return [];
    const byPos: Record<string, number> = {};
    selPlayers.forEach(p => { byPos[p.position] = (byPos[p.position] || 0) + p.salary; });
    return Object.entries(byPos).map(([pos, total]) => ({
      name: pos === 'FW' ? 'Forwards' : pos === 'MF' ? 'Midfielders' : pos === 'DF' ? 'Defenders' : 'Goalkeepers',
      value: +(total / 1000000).toFixed(2),
      color: pos === 'FW' ? '#ff6b6b' : pos === 'MF' ? '#00d4ff' : pos === 'DF' ? '#00c897' : '#ffb347',
    }));
  }, [selPlayers]);

  const topEarners = useMemo(() => [...selPlayers].sort((a, b) => b.salary - a.salary).slice(0, 8), [selPlayers]);

  const BudgetBarContent = ({ height = 350 }: { height?: number }) => (
    <div style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={budgetData} margin={{ top: 5, right: 10, bottom: 60, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="name" stroke="#8892b0" fontSize={9} tickLine={false} angle={-45} textAnchor="end" interval={0} />
          <YAxis stroke="#8892b0" fontSize={10} tickLine={false} />
          <Tooltip contentStyle={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11, fontFamily: 'JetBrains Mono' }} />
          <Bar dataKey="dp" stackId="a" fill="#00d4ff" name="DP Spend" radius={[0, 0, 0, 0]} />
          <Bar dataKey="tam" stackId="a" fill="#ffb347" name="TAM Spend" />
          <Bar dataKey="gam" stackId="a" fill="#00c897" name="GAM Spend" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  const EfficiencyContent = ({ height = 280 }: { height?: number }) => (
    <div style={{ height }}>
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="budget" name="Budget ($M)" stroke="#8892b0" fontSize={10} tickLine={false}
            label={{ value: 'Budget ($M)', position: 'bottom', fill: '#8892b0', fontSize: 10 }} />
          <YAxis dataKey="points" name="Points" stroke="#8892b0" fontSize={10} tickLine={false}
            label={{ value: 'Points', angle: -90, position: 'insideLeft', fill: '#8892b0', fontSize: 10 }} />
          <Tooltip
            content={({ payload }) => {
              if (!payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="neu-raised p-2 rounded-lg text-xs" style={{ fontFamily: 'JetBrains Mono' }}>
                  <div className="text-cyan font-semibold">{d.name}</div>
                  <div>Budget: <span className="text-amber">${d.budget}M</span></div>
                  <div>Points: <span className="text-emerald">{d.points}</span></div>
                  <div>Points/$M: <span className="text-purple-400">{d.ppd}</span></div>
                </div>
              );
            }}
          />
          <Scatter data={efficiencyData}>
            {efficiencyData.map((d, i) => (
              <Cell key={i} fill={d.color} fillOpacity={0.7} r={6} cursor="pointer"
                onClick={() => setSelectedTeam(d.name === selTeam?.shortName ? null : filteredTeams.find(t => t.shortName === d.name)?.id || null)}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="space-y-4 mt-4">
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
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Avg $/Point</span>
          </div>
          <AnimatedCounter value={costPerPoint} prefix="$" suffix="M" decimals={2} className="text-2xl text-purple-400" />
        </NeuCard>
      </div>

      {/* Budget Breakdown */}
      <NeuCard delay={0.15} className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>Team Budget Breakdown ($ Millions)</h3>
          <MaximizeButton onClick={() => setMaximized('budget')} />
        </div>
        <BudgetBarContent />
        <div className="flex justify-center gap-6 mt-2">
          {[{ label: 'Designated Players', color: '#00d4ff' }, { label: 'TAM', color: '#ffb347' }, { label: 'GAM', color: '#00c897' }].map(l => (
            <div key={l.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      </NeuCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Efficiency */}
        <NeuCard delay={0.25} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>Budget vs Points (Efficiency)</h3>
            <MaximizeButton onClick={() => setMaximized('efficiency')} />
          </div>
          <EfficiencyContent />
        </NeuCard>

        {/* Salary Pie */}
        <NeuCard delay={0.35} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>Team Salary by Position</h3>
            <MaximizeButton onClick={() => setMaximized('salary')} />
          </div>
          <div className="flex flex-wrap gap-1 mb-3">
            {filteredTeams.slice(0, 15).map(t => (
              <button key={t.id} onClick={() => setSelectedTeam(t.id === selectedTeam ? null : t.id)}
                className={`text-[10px] px-2 py-1 rounded transition-all ${selectedTeam === t.id ? 'neu-pressed text-cyan' : 'neu-raised text-muted-foreground hover:text-foreground'}`}>
                {t.shortName}
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
                  <Tooltip contentStyle={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">Select a team to view salary breakdown</div>
          )}
        </NeuCard>
      </div>

      {/* Top Earners */}
      {selTeam && topEarners.length > 0 && (
        <NeuCard delay={0} animate={false} className="overflow-hidden">
          <div className="p-3 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>Top Earners — {selTeam.name}</h3>
            <MaximizeButton onClick={() => setMaximized('earners')} />
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>#</th><th>Player</th><th>Position</th><th>Salary</th><th>Goals</th><th>Assists</th><th>Minutes</th><th>$/Goal</th></tr>
              </thead>
              <tbody>
                {topEarners.map((p, i) => (
                  <tr key={p.id}>
                    <td className="text-muted-foreground">{i + 1}</td>
                    <td className="font-sans text-xs font-medium">{p.name}</td>
                    <td><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${p.position === 'FW' ? 'bg-red-500/15 text-red-400' : p.position === 'MF' ? 'bg-blue-500/15 text-blue-400' : p.position === 'DF' ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>{p.position}</span></td>
                    <td className="text-amber">{p.salary >= 1000000 ? `$${(p.salary/1000000).toFixed(1)}M` : `$${(p.salary/1000).toFixed(0)}K`}</td>
                    <td className="text-cyan">{p.goals}</td>
                    <td>{p.assists}</td>
                    <td>{p.minutesPlayed.toLocaleString()}</td>
                    <td className="text-muted-foreground">{p.goals > 0 ? `$${(p.salary / p.goals / 1000).toFixed(0)}K` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </NeuCard>
      )}

      {/* Maximize Modals */}
      <ChartModal isOpen={maximized === 'budget'} onClose={() => setMaximized(null)} title="Team Budget Breakdown ($ Millions)">
        <BudgetBarContent height={600} />
      </ChartModal>
      <ChartModal isOpen={maximized === 'efficiency'} onClose={() => setMaximized(null)} title="Budget vs Points (Efficiency)">
        <EfficiencyContent height={600} />
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
                <Tooltip contentStyle={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="h-96 flex items-center justify-center text-muted-foreground">Select a team first</div>}
      </ChartModal>
      <ChartModal isOpen={maximized === 'earners'} onClose={() => setMaximized(null)} title={`Top Earners${selTeam ? ` — ${selTeam.name}` : ''}`}>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr><th>#</th><th>Player</th><th>Position</th><th>Salary</th><th>Goals</th><th>Assists</th><th>Minutes</th><th>$/Goal</th></tr>
            </thead>
            <tbody>
              {[...selPlayers].sort((a, b) => b.salary - a.salary).map((p, i) => (
                <tr key={p.id}>
                  <td className="text-muted-foreground">{i + 1}</td>
                  <td className="font-sans text-xs font-medium">{p.name}</td>
                  <td><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${p.position === 'FW' ? 'bg-red-500/15 text-red-400' : p.position === 'MF' ? 'bg-blue-500/15 text-blue-400' : p.position === 'DF' ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>{p.position}</span></td>
                  <td className="text-amber">{p.salary >= 1000000 ? `$${(p.salary/1000000).toFixed(1)}M` : `$${(p.salary/1000).toFixed(0)}K`}</td>
                  <td className="text-cyan">{p.goals}</td>
                  <td>{p.assists}</td>
                  <td>{p.minutesPlayed.toLocaleString()}</td>
                  <td className="text-muted-foreground">{p.goals > 0 ? `$${(p.salary / p.goals / 1000).toFixed(0)}K` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartModal>
    </div>
  );
}
