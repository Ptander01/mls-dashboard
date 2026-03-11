/**
 * PitchMatch — Heatmaps, Shot Maps, Passing Networks
 * Uses procedurally generated pitch data derived from real player statistics
 */
import { useState, useMemo, useRef, useEffect } from 'react';
import { useFilters } from '@/contexts/FilterContext';
import { PLAYERS, getTeam } from '@/lib/mlsData';
import NeuCard from '@/components/NeuCard';
import { ChartModal, MaximizeButton } from '@/components/ChartModal';
import { Flame, Crosshair, Share2 } from 'lucide-react';

const PITCH_BG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663348511113/fBEeqeVYwBHXg2g2gjhenP/pitch-bg-SCSoxY6mUL64vxkYMYHLEF.webp';

type PitchView = 'heatmap' | 'shotmap' | 'passing';

// Seeded random for deterministic generation
function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

// Generate heatmap zones based on player position and stats
function generateHeatmap(player: typeof PLAYERS[0]): number[][] {
  const rng = seededRandom(player.id * 31 + player.minutes);
  const zones: number[][] = Array.from({ length: 8 }, () => Array(12).fill(0));
  const pos = player.position;

  // Position-based base distribution
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 12; x++) {
      let base = 5 + rng() * 10;
      if (pos === 'GK') {
        base += x < 2 ? 60 : x < 4 ? 15 : 2;
        if (y >= 2 && y <= 5 && x < 2) base += 20;
      } else if (pos === 'DF') {
        base += x < 4 ? 40 : x < 6 ? 20 : 5;
        if (y >= 1 && y <= 6 && x < 5) base += 15;
      } else if (pos === 'MF') {
        const center = Math.abs(x - 5.5);
        base += Math.max(0, 35 - center * 8);
        if (y >= 2 && y <= 5) base += 10;
      } else { // FW
        base += x > 7 ? 45 : x > 5 ? 25 : 5;
        if (y >= 2 && y <= 5 && x > 8) base += 20;
      }
      base += rng() * 15 - 7;
      zones[y][x] = Math.min(100, Math.max(0, Math.round(base)));
    }
  }
  return zones;
}

// Generate shots from player stats
function generateShots(player: typeof PLAYERS[0]): { x: number; y: number; xG: number; result: string }[] {
  if (player.shots === 0) return [];
  const rng = seededRandom(player.id * 17 + player.goals);
  const shots: { x: number; y: number; xG: number; result: string }[] = [];
  const numShots = Math.min(player.shots, 100);
  const goalRate = player.goals / Math.max(1, player.shots);

  for (let i = 0; i < numShots; i++) {
    const x = 60 + rng() * 38;
    const y = 15 + rng() * 35;
    const distToGoal = Math.sqrt((100 - x) ** 2 + (32.5 - y) ** 2);
    const xG = Math.max(0.01, Math.min(0.95, 0.5 - distToGoal * 0.012 + rng() * 0.15));

    let result: string;
    const roll = rng();
    if (roll < goalRate * 1.2) result = 'goal';
    else if (roll < goalRate * 1.2 + 0.25) result = 'saved';
    else if (roll < goalRate * 1.2 + 0.45) result = 'blocked';
    else result = 'off_target';

    shots.push({ x, y, xG, result });
  }
  return shots;
}

// Generate team shots
function generateTeamShots(teamId: string): { x: number; y: number; xG: number; result: string }[] {
  const teamPlayers = PLAYERS.filter(p => p.team === teamId && p.shots > 0);
  const allShots: { x: number; y: number; xG: number; result: string }[] = [];
  teamPlayers.forEach(p => {
    allShots.push(...generateShots(p));
  });
  return allShots;
}

// Generate passing network
function generatePassingNetwork(teamId: string) {
  const teamPlayers = PLAYERS.filter(p => p.team === teamId && p.starts > 3).slice(0, 11);
  if (teamPlayers.length < 5) return null;

  const rng = seededRandom(teamId.charCodeAt(0) * 100 + teamPlayers.length);

  const nodes = teamPlayers.map(p => {
    let x: number, y: number;
    if (p.position === 'GK') { x = 10 + rng() * 5; y = 28 + rng() * 10; }
    else if (p.position === 'DF') { x = 20 + rng() * 15; y = 10 + rng() * 45; }
    else if (p.position === 'MF') { x = 40 + rng() * 20; y = 10 + rng() * 45; }
    else { x = 65 + rng() * 25; y = 15 + rng() * 35; }
    return { playerId: p.id, name: p.name, x, y, passes: Math.round(p.minutes / 10 + rng() * 30) };
  });

  const links: { source: number; target: number; weight: number }[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dist = Math.sqrt((nodes[i].x - nodes[j].x) ** 2 + (nodes[i].y - nodes[j].y) ** 2);
      if (dist < 40 && rng() > 0.3) {
        links.push({ source: nodes[i].playerId, target: nodes[j].playerId, weight: Math.round(5 + rng() * 20 * (1 - dist / 50)) });
      }
    }
  }
  return { nodes, links };
}

function PitchLines() {
  return (
    <svg viewBox="0 0 1050 680" className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
      <rect x="30" y="30" width="990" height="620" fill="none" stroke="var(--pitch-line)" strokeWidth="2" />
      <line x1="525" y1="30" x2="525" y2="650" stroke="var(--pitch-line-soft)" strokeWidth="1.5" />
      <circle cx="525" cy="340" r="91.5" fill="none" stroke="var(--pitch-line-soft)" strokeWidth="1.5" />
      <circle cx="525" cy="340" r="3" fill="var(--pitch-dot)" />
      <rect x="30" y="138" width="165" height="404" fill="none" stroke="var(--pitch-line-soft)" strokeWidth="1.5" />
      <rect x="30" y="220" width="55" height="240" fill="none" stroke="var(--pitch-line-soft)" strokeWidth="1.5" />
      <rect x="855" y="138" width="165" height="404" fill="none" stroke="var(--pitch-line-soft)" strokeWidth="1.5" />
      <rect x="965" y="220" width="55" height="240" fill="none" stroke="var(--pitch-line-soft)" strokeWidth="1.5" />
      <circle cx="140" cy="340" r="3" fill="var(--pitch-dot)" />
      <circle cx="910" cy="340" r="3" fill="var(--pitch-dot)" />
    </svg>
  );
}

export default function PitchMatch() {
  const { filteredTeams, filteredPlayers } = useFilters();
  const [view, setView] = useState<PitchView>('heatmap');
  const [selectedTeam, setSelectedTeam] = useState<string>(filteredTeams[0]?.id || 'MIA');
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  const [maximized, setMaximized] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasModalRef = useRef<HTMLCanvasElement>(null);

  const teamPlayers = useMemo(() =>
    filteredPlayers.filter(p => p.team === selectedTeam && p.starts > 3),
    [filteredPlayers, selectedTeam]
  );

  const playerHeatmap = useMemo(() => {
    const pid = selectedPlayer || teamPlayers[0]?.id;
    const player = PLAYERS.find(p => p.id === pid);
    if (!player) return null;
    return generateHeatmap(player);
  }, [selectedPlayer, teamPlayers]);

  const teamShots = useMemo(() => generateTeamShots(selectedTeam), [selectedTeam]);
  const playerShots = useMemo(() => {
    if (!selectedPlayer) return teamShots;
    const player = PLAYERS.find(p => p.id === selectedPlayer);
    return player ? generateShots(player) : teamShots;
  }, [selectedPlayer, teamShots]);

  const passNetwork = useMemo(() => generatePassingNetwork(selectedTeam), [selectedTeam]);

  const selPlayerData = selectedPlayer ? PLAYERS.find(p => p.id === selectedPlayer) : null;

  // Draw heatmap on canvas
  const drawHeatmap = (canvas: HTMLCanvasElement | null) => {
    if (!playerHeatmap || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const cellW = w / 12;
    const cellH = h / 8;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 12; x++) {
        const intensity = playerHeatmap[y][x] / 100;
        const r = Math.floor(255 * Math.min(1, intensity * 2));
        const g = Math.floor(255 * Math.max(0, 1 - intensity * 1.5) * intensity);
        const b = Math.floor(100 * (1 - intensity));
        const cx = x * cellW + cellW / 2;
        const cy = y * cellH + cellH / 2;
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, cellW * 0.8);
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.15 + intensity * 0.55})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(x * cellW, y * cellH, cellW, cellH);
      }
    }
  };

  useEffect(() => {
    if (view === 'heatmap') {
      drawHeatmap(canvasRef.current);
      if (maximized === 'pitch') drawHeatmap(canvasModalRef.current);
    }
  }, [view, playerHeatmap, maximized]);

  const shotStats = useMemo(() => {
    const shots = playerShots;
    return {
      total: shots.length,
      goals: shots.filter(s => s.result === 'goal').length,
      saved: shots.filter(s => s.result === 'saved').length,
      blocked: shots.filter(s => s.result === 'blocked').length,
      offTarget: shots.filter(s => s.result === 'off_target').length,
      avgXG: shots.length > 0 ? +(shots.reduce((s, sh) => s + sh.xG, 0) / shots.length).toFixed(3) : 0,
    };
  }, [playerShots]);

  const PitchVisualization = ({ isModal = false }: { isModal?: boolean }) => (
    <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '16/10' }}>
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${PITCH_BG})`, filter: 'brightness(0.6)' }} />
      <PitchLines />

      {view === 'heatmap' && (
        <canvas
          ref={isModal ? canvasModalRef : canvasRef}
          width={1050}
          height={680}
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: 2, mixBlendMode: 'screen' }}
        />
      )}

      {view === 'shotmap' && (
        <svg viewBox="0 0 100 65" className="absolute inset-0 w-full h-full" style={{ zIndex: 2 }}>
          {playerShots.slice(0, 200).map((shot, i) => {
            const color = shot.result === 'goal' ? '#00c897' : shot.result === 'saved' ? '#ffb347' : shot.result === 'off_target' ? '#ff6b6b' : '#666';
            const size = shot.result === 'goal' ? 1.2 + shot.xG * 2 : 0.6 + shot.xG * 1.5;
            return (
              <g key={i}>
                <circle cx={shot.x} cy={shot.y} r={size} fill={color} fillOpacity={0.6}
                  stroke={color} strokeWidth={shot.result === 'goal' ? 0.3 : 0} strokeOpacity={0.8} />
                {shot.result === 'goal' && (
                  <circle cx={shot.x} cy={shot.y} r={size + 1} fill="none" stroke={color} strokeWidth={0.2} strokeOpacity={0.3} />
                )}
              </g>
            );
          })}
        </svg>
      )}

      {view === 'passing' && passNetwork && (
        <svg viewBox="0 0 100 65" className="absolute inset-0 w-full h-full" style={{ zIndex: 2 }}>
          {passNetwork.links.map((link, i) => {
            const source = passNetwork.nodes.find(n => n.playerId === link.source);
            const target = passNetwork.nodes.find(n => n.playerId === link.target);
            if (!source || !target) return null;
            const opacity = Math.min(0.8, link.weight / 25);
            const width = Math.max(0.3, link.weight / 15);
            return (
              <line key={i} x1={source.x} y1={source.y} x2={target.x} y2={target.y}
                stroke="var(--cyan)" strokeWidth={width} strokeOpacity={opacity} />
            );
          })}
          {passNetwork.nodes.map((node, i) => {
            const size = Math.max(1.5, node.passes / 20);
            return (
              <g key={i}>
                <circle cx={node.x} cy={node.y} r={size + 0.5} fill="var(--pitch-line-soft)" />
                <circle cx={node.x} cy={node.y} r={size}
                  fill={getTeam(selectedTeam)?.color || 'var(--cyan)'} stroke="#fff" strokeWidth={0.3} />
                <text x={node.x} y={node.y - size - 1.5} textAnchor="middle"
                  fill="var(--foreground)" fontSize={2.5} fontFamily="Space Grotesk">
                  {node.name.split(' ').pop() || ''}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );

  return (
    <div className="space-y-4 mt-4">
      {/* View Selector */}
      <div className="flex items-center gap-3">
        {([
          { id: 'heatmap' as PitchView, label: 'Player Heatmap', icon: Flame },
          { id: 'shotmap' as PitchView, label: 'Shot Map', icon: Crosshair },
          { id: 'passing' as PitchView, label: 'Passing Network', icon: Share2 },
        ]).map(v => {
          const Icon = v.icon;
          return (
            <button key={v.id} onClick={() => setView(v.id)}
              className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg transition-all ${
                view === v.id ? 'neu-pressed text-cyan' : 'neu-raised text-muted-foreground hover:text-foreground'
              }`}>
              <Icon size={14} />
              {v.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Team/Player Selector */}
        <NeuCard delay={0.05} className="p-4 lg:col-span-1">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Select Team</h4>
          <div className="space-y-0.5 max-h-32 overflow-y-auto mb-3">
            {filteredTeams.map(t => (
              <button key={t.id} onClick={() => { setSelectedTeam(t.id); setSelectedPlayer(null); }}
                className={`w-full text-left text-xs py-1 px-2 rounded flex items-center gap-2 transition-colors ${
                  selectedTeam === t.id ? 'text-cyan bg-white/5' : 'text-muted-foreground hover:text-foreground'
                }`}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                {t.short}
              </button>
            ))}
          </div>

          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Select Player</h4>
          <div className="space-y-0.5 max-h-48 overflow-y-auto">
            <button onClick={() => setSelectedPlayer(null)}
              className={`w-full text-left text-xs py-1 px-2 rounded transition-colors ${
                !selectedPlayer ? 'text-cyan bg-white/5' : 'text-muted-foreground hover:text-foreground'
              }`}>
              All Players (Team)
            </button>
            {teamPlayers.map(p => (
              <button key={p.id} onClick={() => setSelectedPlayer(p.id)}
                className={`w-full text-left text-xs py-1 px-2 rounded flex items-center justify-between transition-colors ${
                  selectedPlayer === p.id ? 'text-cyan bg-white/5' : 'text-muted-foreground hover:text-foreground'
                }`}>
                <span className="truncate">{p.name}</span>
                <span className={`text-[10px] px-1 rounded ${
                  p.position === 'FW' ? 'bg-red-500/15 text-red-400' :
                  p.position === 'MF' ? 'bg-blue-500/15 text-blue-400' :
                  p.position === 'DF' ? 'bg-green-500/15 text-green-400' :
                  'bg-yellow-500/15 text-yellow-400'
                }`}>{p.position}</span>
              </button>
            ))}
          </div>
        </NeuCard>

        {/* Pitch Visualization */}
        <NeuCard delay={0.12} className="p-4 lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
              {view === 'heatmap' && `Heatmap — ${selPlayerData?.name || teamPlayers[0]?.name || 'Team'}`}
              {view === 'shotmap' && `Shot Map — ${selPlayerData?.name || getTeam(selectedTeam)?.short || 'Team'}`}
              {view === 'passing' && `Passing Network — ${getTeam(selectedTeam)?.short || 'Team'}`}
            </h3>
            <div className="flex items-center gap-3">
              {view === 'shotmap' && (
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Goal</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Saved</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Off Target</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400" /> Blocked</span>
                </div>
              )}
              <MaximizeButton onClick={() => setMaximized('pitch')} />
            </div>
          </div>

          <PitchVisualization />

          {/* Stats below pitch */}
          {view === 'shotmap' && (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-3">
              {[
                { label: 'Total Shots', value: shotStats.total, color: 'var(--table-header-color)' },
                { label: 'Goals', value: shotStats.goals, color: '#00c897' },
                { label: 'Saved', value: shotStats.saved, color: '#ffb347' },
                { label: 'Blocked', value: shotStats.blocked, color: '#666' },
                { label: 'Off Target', value: shotStats.offTarget, color: '#ff6b6b' },
                { label: 'Avg xG', value: shotStats.avgXG, color: 'var(--cyan)' },
              ].map(s => (
                <div key={s.label} className="neu-concave rounded-lg p-2 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase">{s.label}</div>
                  <div className="font-mono text-sm font-bold" style={{ color: s.color }}>
                    {typeof s.value === 'number' && s.value < 1 ? s.value.toFixed(3) : s.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'heatmap' && selPlayerData && (
            <div className="grid grid-cols-4 gap-2 mt-3">
              {[
                { label: 'Minutes', value: selPlayerData.minutes.toLocaleString() },
                { label: 'Position', value: selPlayerData.position },
                { label: 'Games', value: selPlayerData.games },
                { label: 'Starts', value: selPlayerData.starts },
              ].map(s => (
                <div key={s.label} className="neu-concave rounded-lg p-2 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase">{s.label}</div>
                  <div className="font-mono text-xs font-bold text-cyan">{s.value}</div>
                </div>
              ))}
            </div>
          )}

          {view === 'passing' && passNetwork && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="neu-concave rounded-lg p-2 text-center">
                <div className="text-[10px] text-muted-foreground uppercase">Players</div>
                <div className="font-mono text-sm font-bold text-cyan">{passNetwork.nodes.length}</div>
              </div>
              <div className="neu-concave rounded-lg p-2 text-center">
                <div className="text-[10px] text-muted-foreground uppercase">Connections</div>
                <div className="font-mono text-sm font-bold text-amber">{passNetwork.links.length}</div>
              </div>
              <div className="neu-concave rounded-lg p-2 text-center">
                <div className="text-[10px] text-muted-foreground uppercase">Avg Passes</div>
                <div className="font-mono text-sm font-bold text-emerald">
                  {passNetwork.links.length > 0
                    ? (passNetwork.links.reduce((s: number, l: { weight: number }) => s + l.weight, 0) / passNetwork.links.length).toFixed(1)
                    : 0}
                </div>
              </div>
            </div>
          )}
        </NeuCard>
      </div>

      {/* Maximize Modal */}
      <ChartModal isOpen={maximized === 'pitch'} onClose={() => setMaximized(null)}
        title={view === 'heatmap' ? `Heatmap — ${selPlayerData?.name || teamPlayers[0]?.name || 'Team'}` :
               view === 'shotmap' ? `Shot Map — ${selPlayerData?.name || getTeam(selectedTeam)?.short || 'Team'}` :
               `Passing Network — ${getTeam(selectedTeam)?.short || 'Team'}`}>
        <PitchVisualization isModal />
      </ChartModal>
    </div>
  );
}
