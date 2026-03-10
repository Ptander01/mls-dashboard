import { useState, useMemo, useRef, useEffect } from 'react';
import { useFilters } from '@/contexts/FilterContext';
import { teams, players, heatmaps, shotData, passingNetworks, getTeam, type ShotData } from '@/lib/mlsData';
import NeuCard from '@/components/NeuCard';
import { ChartModal, MaximizeButton } from '@/components/ChartModal';
import { Flame, Crosshair, Share2 } from 'lucide-react';

const PITCH_BG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663348511113/fBEeqeVYwBHXg2g2gjhenP/pitch-bg-SCSoxY6mUL64vxkYMYHLEF.webp';

type PitchView = 'heatmap' | 'shotmap' | 'passing';

function PitchLines() {
  return (
    <svg viewBox="0 0 1050 680" className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
      <rect x="30" y="30" width="990" height="620" fill="none" stroke="rgba(0,212,255,0.2)" strokeWidth="2" />
      <line x1="525" y1="30" x2="525" y2="650" stroke="rgba(0,212,255,0.15)" strokeWidth="1.5" />
      <circle cx="525" cy="340" r="91.5" fill="none" stroke="rgba(0,212,255,0.15)" strokeWidth="1.5" />
      <circle cx="525" cy="340" r="3" fill="rgba(0,212,255,0.3)" />
      <rect x="30" y="138" width="165" height="404" fill="none" stroke="rgba(0,212,255,0.15)" strokeWidth="1.5" />
      <rect x="30" y="220" width="55" height="240" fill="none" stroke="rgba(0,212,255,0.15)" strokeWidth="1.5" />
      <rect x="855" y="138" width="165" height="404" fill="none" stroke="rgba(0,212,255,0.15)" strokeWidth="1.5" />
      <rect x="965" y="220" width="55" height="240" fill="none" stroke="rgba(0,212,255,0.15)" strokeWidth="1.5" />
      <circle cx="140" cy="340" r="3" fill="rgba(0,212,255,0.3)" />
      <circle cx="910" cy="340" r="3" fill="rgba(0,212,255,0.3)" />
    </svg>
  );
}

export default function PitchMatch() {
  const { filteredTeams, filteredPlayers } = useFilters();
  const [view, setView] = useState<PitchView>('heatmap');
  const [selectedTeam, setSelectedTeam] = useState<string>(filteredTeams[0]?.id || 'MIA');
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [maximized, setMaximized] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasModalRef = useRef<HTMLCanvasElement>(null);

  const teamPlayers = useMemo(() =>
    filteredPlayers.filter(p => p.teamId === selectedTeam && p.gamesStarted > 5),
    [filteredPlayers, selectedTeam]
  );

  const playerHeatmap = useMemo(() => {
    const pid = selectedPlayer || teamPlayers[0]?.id;
    return heatmaps.find(h => h.playerId === pid);
  }, [selectedPlayer, teamPlayers]);

  const teamShots = useMemo(() => shotData.filter(s => s.teamId === selectedTeam), [selectedTeam]);
  const playerShots = useMemo(() =>
    selectedPlayer ? shotData.filter(s => s.playerId === selectedPlayer) : teamShots,
    [selectedPlayer, teamShots]
  );

  const passNetwork = useMemo(() => passingNetworks.find(pn => pn.teamId === selectedTeam), [selectedTeam]);

  // Draw heatmap on canvas
  const drawHeatmap = (canvas: HTMLCanvasElement | null) => {
    if (!playerHeatmap || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const zones = playerHeatmap.zones;
    const cellW = w / 12;
    const cellH = h / 8;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 12; x++) {
        const intensity = zones[y][x] / 100;
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

  const selPlayerData = selectedPlayer ? players.find(p => p.id === selectedPlayer) : null;

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
                <circle cx={shot.x} cy={shot.y * 0.65} r={size} fill={color} fillOpacity={0.6}
                  stroke={color} strokeWidth={shot.result === 'goal' ? 0.3 : 0} strokeOpacity={0.8} />
                {shot.result === 'goal' && (
                  <circle cx={shot.x} cy={shot.y * 0.65} r={size + 1} fill="none" stroke={color} strokeWidth={0.2} strokeOpacity={0.3} />
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
              <line key={i} x1={source.x} y1={source.y * 0.65} x2={target.x} y2={target.y * 0.65}
                stroke="#00d4ff" strokeWidth={width} strokeOpacity={opacity} />
            );
          })}
          {passNetwork.nodes.map((node, i) => {
            const player = players.find(p => p.id === node.playerId);
            const size = Math.max(1.5, node.passes / 20);
            return (
              <g key={i}>
                <circle cx={node.x} cy={node.y * 0.65} r={size + 0.5} fill="rgba(0,212,255,0.15)" />
                <circle cx={node.x} cy={node.y * 0.65} r={size}
                  fill={getTeam(selectedTeam)?.primaryColor || '#00d4ff'} stroke="#fff" strokeWidth={0.3} />
                <text x={node.x} y={node.y * 0.65 - size - 1.5} textAnchor="middle"
                  fill="#e8e8f0" fontSize={2.5} fontFamily="Space Grotesk">
                  {player?.name.split(' ').pop() || ''}
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
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.primaryColor }} />
                {t.shortName}
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
              {view === 'heatmap' && `Heatmap — ${selPlayerData?.name || 'Team'}`}
              {view === 'shotmap' && `Shot Map — ${selPlayerData?.name || getTeam(selectedTeam)?.shortName || 'Team'}`}
              {view === 'passing' && `Passing Network — ${getTeam(selectedTeam)?.shortName || 'Team'}`}
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
                { label: 'Total Shots', value: shotStats.total, color: '#8892b0' },
                { label: 'Goals', value: shotStats.goals, color: '#00c897' },
                { label: 'Saved', value: shotStats.saved, color: '#ffb347' },
                { label: 'Blocked', value: shotStats.blocked, color: '#666' },
                { label: 'Off Target', value: shotStats.offTarget, color: '#ff6b6b' },
                { label: 'Avg xG', value: shotStats.avgXG, color: '#00d4ff' },
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
                { label: 'Minutes', value: selPlayerData.minutesPlayed.toLocaleString() },
                { label: 'Position', value: selPlayerData.positionDetail },
                { label: 'Games', value: selPlayerData.gamesPlayed },
                { label: 'Starts', value: selPlayerData.gamesStarted },
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
                    ? (passNetwork.links.reduce((s, l) => s + l.weight, 0) / passNetwork.links.length).toFixed(1)
                    : 0}
                </div>
              </div>
            </div>
          )}
        </NeuCard>
      </div>

      {/* Maximize Modal */}
      <ChartModal isOpen={maximized === 'pitch'} onClose={() => setMaximized(null)}
        title={view === 'heatmap' ? `Heatmap — ${selPlayerData?.name || 'Team'}` :
               view === 'shotmap' ? `Shot Map — ${selPlayerData?.name || getTeam(selectedTeam)?.shortName || 'Team'}` :
               `Passing Network — ${getTeam(selectedTeam)?.shortName || 'Team'}`}>
        <PitchVisualization isModal />
      </ChartModal>
    </div>
  );
}
