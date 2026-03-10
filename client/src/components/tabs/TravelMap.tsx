import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useFilters } from '@/contexts/FilterContext';
import { teams, matches, getTeam, calculateDistance } from '@/lib/mlsData';
import NeuCard from '@/components/NeuCard';
import AnimatedCounter from '@/components/AnimatedCounter';
import { Play, Pause, SkipForward, SkipBack, MapPin, Plane, Route } from 'lucide-react';

const MAP_BG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663348511113/fBEeqeVYwBHXg2g2gjhenP/travel-map-bg-RsZcb7Xt5858rejPgFo8hQ.webp';

// Map projection: simple Mercator for US/Canada
const projectPoint = (lat: number, lng: number, width: number, height: number) => {
  const minLat = 24, maxLat = 52, minLng = -130, maxLng = -65;
  const x = ((lng - minLng) / (maxLng - minLng)) * width;
  const y = ((maxLat - lat) / (maxLat - minLat)) * height;
  return { x, y };
};

// Arc path between two points
const getArcPath = (x1: number, y1: number, x2: number, y2: number) => {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const curvature = Math.min(dist * 0.3, 80);
  const cx = midX - (dy / dist) * curvature;
  const cy = midY + (dx / dist) * curvature;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
};

// Distance to color
const distanceColor = (miles: number) => {
  if (miles < 500) return '#00c897';
  if (miles < 1000) return '#00d4ff';
  if (miles < 1500) return '#ffb347';
  if (miles < 2000) return '#ff8c42';
  return '#ff6b6b';
};

export default function TravelMap() {
  const { filteredTeams, filteredMatches } = useFilters();
  const [currentWeek, setCurrentWeek] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAllArcs, setShowAllArcs] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const mapWidth = 900;
  const mapHeight = 520;

  // Matches for current week
  const weekMatches = useMemo(() =>
    filteredMatches.filter(m => m.week === currentWeek),
    [filteredMatches, currentWeek]
  );

  // All travel arcs data
  const allArcs = useMemo(() =>
    filteredMatches.map(m => {
      const home = getTeam(m.homeTeamId);
      const away = getTeam(m.awayTeamId);
      if (!home || !away) return null;
      const dist = calculateDistance(away.lat, away.lng, home.lat, home.lng);
      return { match: m, home, away, distance: dist };
    }).filter(Boolean) as { match: typeof matches[0]; home: typeof teams[0]; away: typeof teams[0]; distance: number }[],
    [filteredMatches]
  );

  const currentArcs = useMemo(() =>
    showAllArcs ? allArcs : allArcs.filter(a => a.match.week === currentWeek),
    [allArcs, currentWeek, showAllArcs]
  );

  const totalMiles = useMemo(() =>
    allArcs.reduce((s, a) => s + a.distance, 0),
    [allArcs]
  );

  const avgDistance = allArcs.length > 0 ? totalMiles / allArcs.length : 0;
  const longestTrip = allArcs.length > 0 ? Math.max(...allArcs.map(a => a.distance)) : 0;

  // Animation
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentWeek(prev => {
          if (prev >= 34) { setIsPlaying(false); return 34; }
          return prev + 1;
        });
      }, 800);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying]);

  const [animPhase, setAnimPhase] = useState(0);
  useEffect(() => {
    setAnimPhase(0);
    const t = setTimeout(() => setAnimPhase(1), 50);
    return () => clearTimeout(t);
  }, [currentWeek]);

  return (
    <div className="space-y-4 mt-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <NeuCard delay={0.05} glow="cyan" className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Route size={14} className="text-cyan" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Miles</span>
          </div>
          <AnimatedCounter value={totalMiles} className="text-2xl text-cyan" />
        </NeuCard>
        <NeuCard delay={0.12} glow="amber" className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Plane size={14} className="text-amber" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Avg Trip</span>
          </div>
          <AnimatedCounter value={avgDistance} suffix=" mi" className="text-2xl text-amber" />
        </NeuCard>
        <NeuCard delay={0.2} glow="emerald" className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={14} className="text-emerald" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Longest Trip</span>
          </div>
          <AnimatedCounter value={longestTrip} suffix=" mi" className="text-2xl text-emerald" />
        </NeuCard>
        <NeuCard delay={0.3} className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={14} className="text-purple-400" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Week {currentWeek} Matches</span>
          </div>
          <AnimatedCounter value={weekMatches.length} className="text-2xl text-purple-400" />
        </NeuCard>
      </div>

      {/* Map */}
      <NeuCard delay={0.15} className="p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
            League Travel Map — Matchweek {currentWeek}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAllArcs(!showAllArcs)}
              className={`text-[10px] px-2 py-1 rounded transition-all ${showAllArcs ? 'neu-pressed text-cyan' : 'neu-raised text-muted-foreground'}`}
            >
              {showAllArcs ? 'All Routes' : 'Current Week'}
            </button>
          </div>
        </div>

        <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: `${mapWidth}/${mapHeight}` }}>
          {/* Background map image */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${MAP_BG})`,
              filter: 'brightness(0.5) saturate(0.8)',
            }}
          />

          {/* SVG overlay */}
          <svg
            ref={svgRef}
            viewBox={`0 0 ${mapWidth} ${mapHeight}`}
            className="absolute inset-0 w-full h-full"
            style={{ zIndex: 2 }}
          >
            <defs>
              {/* Glow filter */}
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="stadiumGlow">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Animated dash */}
              <linearGradient id="arcGradShort" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00c897" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#00c897" stopOpacity="0.2" />
              </linearGradient>
            </defs>

            {/* Travel arcs */}
            {currentArcs.map((arc, i) => {
              const from = projectPoint(arc.away.lat, arc.away.lng, mapWidth, mapHeight);
              const to = projectPoint(arc.home.lat, arc.home.lng, mapWidth, mapHeight);
              const path = getArcPath(from.x, from.y, to.x, to.y);
              const color = distanceColor(arc.distance);
              return (
                <g key={`arc-${i}`}>
                  <path
                    d={path}
                    fill="none"
                    stroke={color}
                    strokeWidth={showAllArcs ? 0.8 : 1.5}
                    strokeOpacity={showAllArcs ? 0.15 : 0.6}
                    strokeDasharray={showAllArcs ? "none" : "8 4"}
                    filter={showAllArcs ? undefined : "url(#glow)"}
                    style={{
                      transition: 'all 0.5s ease-out',
                      strokeDashoffset: animPhase === 0 ? 1000 : 0,
                    }}
                  >
                    {!showAllArcs && (
                      <animate
                        attributeName="stroke-dashoffset"
                        from="24"
                        to="0"
                        dur="1.5s"
                        repeatCount="indefinite"
                      />
                    )}
                  </path>
                  {/* Traveling dot */}
                  {!showAllArcs && (
                    <circle r="3" fill={color} filter="url(#glow)">
                      <animateMotion dur="2s" repeatCount="indefinite" path={path} />
                    </circle>
                  )}
                </g>
              );
            })}

            {/* Stadium markers - 3D styled */}
            {filteredTeams.map(team => {
              const pos = projectPoint(team.lat, team.lng, mapWidth, mapHeight);
              const isActive = weekMatches.some(m => m.homeTeamId === team.id);
              const isAway = weekMatches.some(m => m.awayTeamId === team.id);
              return (
                <g key={team.id} transform={`translate(${pos.x}, ${pos.y})`}>
                  {/* Base glow */}
                  <circle
                    r={isActive ? 12 : 6}
                    fill={team.primaryColor}
                    opacity={0.15}
                    filter="url(#stadiumGlow)"
                  />
                  {/* 3D stadium icon - outer ring */}
                  <ellipse
                    cx={0}
                    cy={1}
                    rx={isActive ? 7 : 4}
                    ry={isActive ? 4 : 2.5}
                    fill="none"
                    stroke={team.primaryColor}
                    strokeWidth={isActive ? 1.5 : 0.8}
                    opacity={0.6}
                  />
                  {/* 3D stadium icon - inner field */}
                  <ellipse
                    cx={0}
                    cy={0}
                    rx={isActive ? 5 : 3}
                    ry={isActive ? 3 : 1.8}
                    fill={isActive ? team.primaryColor : '#1a1a2e'}
                    stroke={team.primaryColor}
                    strokeWidth={isActive ? 1.5 : 0.8}
                    opacity={isActive ? 0.9 : 0.5}
                  />
                  {/* Vertical pillars for 3D effect */}
                  {isActive && (
                    <>
                      <line x1={-5} y1={0} x2={-5} y2={4} stroke={team.primaryColor} strokeWidth={1} opacity={0.4} />
                      <line x1={5} y1={0} x2={5} y2={4} stroke={team.primaryColor} strokeWidth={1} opacity={0.4} />
                      <line x1={0} y1={-3} x2={0} y2={-6} stroke={team.primaryColor} strokeWidth={1} opacity={0.3} />
                    </>
                  )}
                  {/* Center dot */}
                  <circle
                    r={isActive ? 2 : 1.2}
                    fill={isActive ? '#ffffff' : team.primaryColor}
                    opacity={isActive ? 1 : 0.7}
                  >
                    {isActive && (
                      <animate attributeName="r" values="2;3;2" dur="2s" repeatCount="indefinite" />
                    )}
                  </circle>
                  {/* Label */}
                  <text
                    y={isActive ? -12 : -8}
                    textAnchor="middle"
                    fill={isActive ? '#ffffff' : '#8892b0'}
                    fontSize={isActive ? 8 : 6}
                    fontFamily="Space Grotesk"
                    fontWeight={isActive ? 700 : 400}
                  >
                    {team.shortName}
                  </text>
                  {/* Away indicator */}
                  {isAway && !isActive && (
                    <circle r={1.5} cy={-4} fill="#ffb347" opacity={0.8}>
                      <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Distance Legend */}
        <div className="flex justify-center gap-4 mt-3">
          {[
            { label: '<500 mi', color: '#00c897' },
            { label: '500-1000', color: '#00d4ff' },
            { label: '1000-1500', color: '#ffb347' },
            { label: '1500-2000', color: '#ff8c42' },
            { label: '2000+', color: '#ff6b6b' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="w-3 h-1 rounded-full" style={{ backgroundColor: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      </NeuCard>

      {/* Timeline Controls */}
      <NeuCard delay={0.25} className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
              className="neu-raised p-1.5 rounded-lg hover:text-cyan transition-colors"
            >
              <SkipBack size={14} />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`neu-raised p-2 rounded-lg transition-colors ${isPlaying ? 'text-amber' : 'text-cyan'}`}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              onClick={() => setCurrentWeek(Math.min(34, currentWeek + 1))}
              className="neu-raised p-1.5 rounded-lg hover:text-cyan transition-colors"
            >
              <SkipForward size={14} />
            </button>
          </div>

          <div className="flex-1">
            <input
              type="range"
              min={1}
              max={34}
              value={currentWeek}
              onChange={e => { setCurrentWeek(+e.target.value); setIsPlaying(false); }}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-1">
              <span>Week 1</span>
              <span>Week {currentWeek}</span>
              <span>Week 34</span>
            </div>
          </div>
        </div>

        {/* Current week matches */}
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {weekMatches.slice(0, 10).map(m => {
            const home = getTeam(m.homeTeamId);
            const away = getTeam(m.awayTeamId);
            const dist = home && away ? calculateDistance(away.lat, away.lng, home.lat, home.lng) : 0;
            return (
              <div key={m.id} className="neu-concave rounded-lg p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: away?.primaryColor }} />
                  <span className="text-muted-foreground">{away?.shortName}</span>
                  <span className="text-cyan mx-0.5">@</span>
                  <span>{home?.shortName}</span>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: home?.primaryColor }} />
                </div>
                <div className="text-[9px] text-muted-foreground font-mono mt-0.5">
                  {dist.toLocaleString()} mi · {m.homeScore}-{m.awayScore}
                </div>
              </div>
            );
          })}
        </div>
      </NeuCard>
    </div>
  );
}
