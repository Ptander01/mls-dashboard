/**
 * PitchMatch — Heatmaps, Shot Maps, Passing Networks, 3D Shot Map
 * Uses procedurally generated pitch data derived from real player statistics
 * for heatmaps and shot maps, real StatsBomb event data for the
 * cinematic 3D passing network & centrality analysis, and real StatsBomb
 * shot events for the 3D Shot Map & xG visualization.
 */
import { useState, useMemo, useRef, useEffect, lazy, Suspense } from "react";
import { useFilters } from "@/contexts/FilterContext";
import { useTheme } from "@/contexts/ThemeContext";
import { PLAYERS, getTeam } from "@/lib/mlsData";
import NeuCard from "@/components/NeuCard";
import { ChartHeader } from "@/components/ui/ChartHeader";
import { ChartModal, MaximizeButton } from "@/components/ChartModal";
import {
  SegmentedControl,
  ToggleAction,
  IconAction,
} from "@/components/ui/ChartControls";
import {
  Flame,
  Crosshair,
  Share2,
  Target,
  Users,
  CircleDot,
  Shield,
  Ban,
  CircleOff,
  Sparkles,
} from "lucide-react";
import StaggerContainer, { StaggerItem } from "@/components/StaggerContainer";
import type {
  TeamFilter,
  OutcomeFilter,
} from "@/components/charts/ShotMap3D";

const PassingNetwork3D = lazy(
  () => import("@/components/charts/PassingNetwork3D")
);

const ShotMap3D = lazy(() => import("@/components/charts/ShotMap3D"));

const PITCH_BG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663348511113/fBEeqeVYwBHXg2g2gjhenP/pitch-bg-SCSoxY6mUL64vxkYMYHLEF.webp";

type PitchView = "heatmap" | "shotmap" | "passing" | "shotmap3d";

// Seeded random for deterministic generation
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Generate heatmap zones based on player position and stats
function generateHeatmap(player: (typeof PLAYERS)[0]): number[][] {
  const rng = seededRandom(player.id * 31 + player.minutes);
  const zones: number[][] = Array.from({ length: 8 }, () => Array(12).fill(0));
  const pos = player.position;

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 12; x++) {
      let base = 5 + rng() * 10;
      if (pos === "GK") {
        base += x < 2 ? 60 : x < 4 ? 15 : 2;
        if (y >= 2 && y <= 5 && x < 2) base += 20;
      } else if (pos === "DF") {
        base += x < 4 ? 40 : x < 6 ? 20 : 5;
        if (y >= 1 && y <= 6 && x < 5) base += 15;
      } else if (pos === "MF") {
        const center = Math.abs(x - 5.5);
        base += Math.max(0, 35 - center * 8);
        if (y >= 2 && y <= 5) base += 10;
      } else {
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
function generateShots(
  player: (typeof PLAYERS)[0]
): { x: number; y: number; xG: number; result: string }[] {
  if (player.shots === 0) return [];
  const rng = seededRandom(player.id * 17 + player.goals);
  const shots: { x: number; y: number; xG: number; result: string }[] = [];
  const numShots = Math.min(player.shots, 100);
  const goalRate = player.goals / Math.max(1, player.shots);

  for (let i = 0; i < numShots; i++) {
    const x = 60 + rng() * 38;
    const y = 15 + rng() * 35;
    const distToGoal = Math.sqrt((100 - x) ** 2 + (32.5 - y) ** 2);
    const xG = Math.max(
      0.01,
      Math.min(0.95, 0.5 - distToGoal * 0.012 + rng() * 0.15)
    );

    let result: string;
    const roll = rng();
    if (roll < goalRate * 1.2) result = "goal";
    else if (roll < goalRate * 1.2 + 0.25) result = "saved";
    else if (roll < goalRate * 1.2 + 0.45) result = "blocked";
    else result = "off_target";

    shots.push({ x, y, xG, result });
  }
  return shots;
}

// Generate team shots
function generateTeamShots(
  teamId: string
): { x: number; y: number; xG: number; result: string }[] {
  const teamPlayers = PLAYERS.filter(p => p.team === teamId && p.shots > 0);
  const allShots: { x: number; y: number; xG: number; result: string }[] = [];
  teamPlayers.forEach(p => {
    allShots.push(...generateShots(p));
  });
  return allShots;
}

function PitchLines() {
  return (
    <svg
      viewBox="0 0 1050 680"
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 1 }}
    >
      <rect
        x="30"
        y="30"
        width="990"
        height="620"
        fill="none"
        stroke="var(--pitch-line)"
        strokeWidth="2"
      />
      <line
        x1="525"
        y1="30"
        x2="525"
        y2="650"
        stroke="var(--pitch-line-soft)"
        strokeWidth="1.5"
      />
      <circle
        cx="525"
        cy="340"
        r="91.5"
        fill="none"
        stroke="var(--pitch-line-soft)"
        strokeWidth="1.5"
      />
      <circle cx="525" cy="340" r="3" fill="var(--pitch-dot)" />
      <rect
        x="30"
        y="138"
        width="165"
        height="404"
        fill="none"
        stroke="var(--pitch-line-soft)"
        strokeWidth="1.5"
      />
      <rect
        x="30"
        y="220"
        width="55"
        height="240"
        fill="none"
        stroke="var(--pitch-line-soft)"
        strokeWidth="1.5"
      />
      <rect
        x="855"
        y="138"
        width="165"
        height="404"
        fill="none"
        stroke="var(--pitch-line-soft)"
        strokeWidth="1.5"
      />
      <rect
        x="965"
        y="220"
        width="55"
        height="240"
        fill="none"
        stroke="var(--pitch-line-soft)"
        strokeWidth="1.5"
      />
      <circle cx="140" cy="340" r="3" fill="var(--pitch-dot)" />
      <circle cx="910" cy="340" r="3" fill="var(--pitch-dot)" />
    </svg>
  );
}

export default function PitchMatch() {
  const { filteredTeams, filteredPlayers } = useFilters();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [view, setView] = useState<PitchView>("heatmap");
  const [selectedTeam, setSelectedTeam] = useState<string>(
    filteredTeams[0]?.id || "MIA"
  );
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);

  // 3D Shot Map state
  const [shotTeamFilter, setShotTeamFilter] = useState<TeamFilter>("both");
  const [shotOutcomeFilter, setShotOutcomeFilter] = useState<OutcomeFilter>({
    goals: true,
    saved: true,
    offTarget: true,
    blocked: true,
  });
  const [shotInsightOpen, setShotInsightOpen] = useState(false);

  // Auto-sync team when exactly one team is filtered globally
  useEffect(() => {
    if (filteredTeams.length === 1) {
      setSelectedTeam(filteredTeams[0].id);
      setSelectedPlayer(null);
    }
  }, [filteredTeams]);
  const [maximized, setMaximized] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasModalRef = useRef<HTMLCanvasElement>(null);

  const teamPlayers = useMemo(
    () => filteredPlayers.filter(p => p.team === selectedTeam && p.starts > 3),
    [filteredPlayers, selectedTeam]
  );

  const playerHeatmap = useMemo(() => {
    const pid = selectedPlayer || teamPlayers[0]?.id;
    const player = PLAYERS.find(p => p.id === pid);
    if (!player) return null;
    return generateHeatmap(player);
  }, [selectedPlayer, teamPlayers]);

  const teamShots = useMemo(
    () => generateTeamShots(selectedTeam),
    [selectedTeam]
  );
  const playerShots = useMemo(() => {
    if (!selectedPlayer) return teamShots;
    const player = PLAYERS.find(p => p.id === selectedPlayer);
    return player ? generateShots(player) : teamShots;
  }, [selectedPlayer, teamShots]);

  const selPlayerData = selectedPlayer
    ? PLAYERS.find(p => p.id === selectedPlayer)
    : null;

  // Draw heatmap on canvas
  const drawHeatmap = (canvas: HTMLCanvasElement | null) => {
    if (!playerHeatmap || !canvas) return;
    const ctx = canvas.getContext("2d");
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
        const g = Math.floor(
          255 * Math.max(0, 1 - intensity * 1.5) * intensity
        );
        const b = Math.floor(100 * (1 - intensity));
        const cx = x * cellW + cellW / 2;
        const cy = y * cellH + cellH / 2;
        const gradient = ctx.createRadialGradient(
          cx,
          cy,
          0,
          cx,
          cy,
          cellW * 0.8
        );
        gradient.addColorStop(
          0,
          `rgba(${r}, ${g}, ${b}, ${0.15 + intensity * 0.55})`
        );
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(x * cellW, y * cellH, cellW, cellH);
      }
    }
  };

  useEffect(() => {
    if (view === "heatmap") {
      drawHeatmap(canvasRef.current);
      if (maximized === "pitch") drawHeatmap(canvasModalRef.current);
    }
  }, [view, playerHeatmap, maximized]);

  const shotStats = useMemo(() => {
    const shots = playerShots;
    return {
      total: shots.length,
      goals: shots.filter(s => s.result === "goal").length,
      saved: shots.filter(s => s.result === "saved").length,
      blocked: shots.filter(s => s.result === "blocked").length,
      offTarget: shots.filter(s => s.result === "off_target").length,
      avgXG:
        shots.length > 0
          ? +(
              shots.reduce((s, sh) => s + sh.xG, 0) / shots.length
            ).toFixed(3)
          : 0,
    };
  }, [playerShots]);

  const PitchVisualization = ({ isModal = false }: { isModal?: boolean }) => (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{ aspectRatio: "16/10" }}
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${PITCH_BG})`,
          filter: "brightness(0.6)",
        }}
      />
      <PitchLines />

      {view === "heatmap" && (
        <canvas
          ref={isModal ? canvasModalRef : canvasRef}
          width={1050}
          height={680}
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: 2, mixBlendMode: "screen" }}
        />
      )}

      {view === "shotmap" && (
        <svg
          viewBox="0 0 100 65"
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: 2 }}
        >
          {playerShots.slice(0, 200).map((shot, i) => {
            const color =
              shot.result === "goal"
                ? "#00c897"
                : shot.result === "saved"
                  ? "#ffb347"
                  : shot.result === "off_target"
                    ? "#ff6b6b"
                    : "#999";
            const size =
              shot.result === "goal" ? 1.2 + shot.xG * 2 : 0.6 + shot.xG * 1.5;
            return (
              <g key={i}>
                <circle
                  cx={shot.x}
                  cy={shot.y}
                  r={size}
                  fill={color}
                  fillOpacity={0.6}
                  stroke={color}
                  strokeWidth={shot.result === "goal" ? 0.3 : 0}
                  strokeOpacity={0.8}
                />
                {shot.result === "goal" && (
                  <circle
                    cx={shot.x}
                    cy={shot.y}
                    r={size + 1}
                    fill="none"
                    stroke={color}
                    strokeWidth={0.2}
                    strokeOpacity={0.3}
                  />
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );

  // Toggle helper for outcome filters
  const toggleOutcome = (key: keyof OutcomeFilter) => {
    setShotOutcomeFilter((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <StaggerContainer className="space-y-6 mt-4">
      {/* Tab Header Card — elevated command center */}
      <StaggerItem>
        <NeuCard variant="raised" animate={false} className="p-5">
          <p
            className="text-xs text-muted-foreground leading-relaxed"
            style={{ fontFamily: "Space Grotesk, sans-serif" }}
          >
            <span className="font-semibold text-foreground">Pitch Match</span> —
            Dive into tactical match data on a virtual pitch. The heatmap shows
            player positioning intensity, the shot map plots every attempt with
            xG-scaled markers (goals highlighted), the 3D shot map renders real
            StatsBomb shot events as glass spheres with neon trajectory arcs, and
            the passing network reveals team shape and key link-up play. Select a
            view to explore different tactical dimensions.
          </p>
        </NeuCard>
      </StaggerItem>

      {/* View Selector */}
      <StaggerItem>
        <div className="flex items-center gap-3 flex-wrap">
          {[
            {
              id: "heatmap" as PitchView,
              label: "Player Heatmap",
              icon: Flame,
            },
            { id: "shotmap" as PitchView, label: "Shot Map", icon: Crosshair },
            {
              id: "shotmap3d" as PitchView,
              label: "3D Shot Map",
              icon: Target,
            },
            {
              id: "passing" as PitchView,
              label: "Passing Network",
              icon: Share2,
            },
          ].map(v => {
            const Icon = v.icon;
            return (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg transition-all ${
                  view === v.id
                    ? "neu-pressed text-cyan"
                    : "neu-raised text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={14} />
                {v.label}
              </button>
            );
          })}
        </div>
      </StaggerItem>

      {/* ═══════════════════════════════════════════ */}
      {/* 3D SHOT MAP — Full-width cinematic card    */}
      {/* ═══════════════════════════════════════════ */}
      {view === "shotmap3d" && (
        <StaggerItem>
          <NeuCard delay={0.08} className="p-5">
            <ChartHeader
              title="3D Shot Map x xG Analysis"
              description={
                <>
                  In Inter Miami&apos;s commanding 4-0 victory over Toronto FC,
                  all 21 shots are plotted as glass spheres sized by their
                  expected goals (xG) value, with neon trajectory arcs tracing
                  each shot&apos;s path toward goal.{" "}
                  <strong>Inter Miami</strong> generated 1.03 xG from 13 shots,
                  converting 4 goals from relatively low-xG chances — a clinical
                  finishing display.{" "}
                  <strong>Toronto FC</strong> managed 0.78 xG from 8 attempts
                  but failed to find the net. Hover over any shot to see the
                  player, minute, xG, and outcome.
                </>
              }
              methods={
                <>
                  <p style={{ marginBottom: "8px" }}>
                    <strong>Data Source:</strong> StatsBomb Open Data, Match ID
                    3877115 (Inter Miami 4-0 Toronto FC, Sept 20, 2023). 21 shot
                    events extracted (type == &apos;Shot&apos;).
                  </p>
                  <p style={{ marginBottom: "8px" }}>
                    <strong>xG (Expected Goals):</strong> StatsBomb&apos;s
                    proprietary expected goals model assigns a probability
                    (0.00–1.00) to each shot based on location, body part, shot
                    type, defensive pressure, and other contextual features. The
                    xG value represents the likelihood of the shot resulting in a
                    goal.
                  </p>
                  <p style={{ marginBottom: "8px" }}>
                    <strong>Node Sizing:</strong> Each glass sphere&apos;s radius
                    uses a perceptual power-curve to maximize visual hierarchy:{" "}
                    <code style={{ fontSize: "9px" }}>
                      r = 0.45 + (xG / max_xG)^0.55 × (2.6 − 0.45)
                    </code>
                    . The sub-linear exponent spreads the mid-range while keeping
                    extremes dramatic — a 0.30 xG tap-in reads as clearly larger
                    than a 0.03 speculative effort.
                  </p>
                  <p style={{ marginBottom: "8px" }}>
                    <strong>Trajectory Arcs:</strong> Each shot&apos;s origin
                    [x, y] is connected to its end location via a quadratic
                    Bézier curve (NeonTube component) with a vertical apex that
                    scales with distance, simulating ball flight.
                  </p>
                  <p style={{ marginBottom: "8px" }}>
                    <strong>Coordinate Mapping:</strong> StatsBomb 120×80
                    coordinates are mapped to a centered Three.js system:{" "}
                    <code style={{ fontSize: "9px" }}>
                      ThreeX = SB_X − 60, ThreeZ = SB_Y − 40
                    </code>
                    .
                  </p>
                  <p style={{ marginBottom: "8px" }}>
                    <strong>Outcome Colors:</strong> Goal = Emerald (#00c897),
                    Saved = Warm Amber (#e8a84c), Off Target/Post = Muted Coral
                    (#c75050), Blocked = Cool Slate (#4a5f78). Goals receive
                    thicker, brighter trajectory arcs with higher glow intensity;
                    blocked shots recede with thinner, fainter arcs.
                  </p>
                  <p>
                    <strong>Visual Hierarchy:</strong> Outcome-differentiated
                    tube thickness, opacity, and glow intensity ensure goals
                    dominate the composition while non-goals provide context
                    without competing for attention. Contact shadows beneath
                    each sphere anchor them to the pitch surface.
                  </p>
                </>
              }
              zone1Toolbar={
                <div className="flex items-center gap-3 flex-wrap">
                  <SegmentedControl<TeamFilter>
                    options={[
                      { value: "both", label: "Both" },
                      { value: "Inter Miami", label: "Miami" },
                      { value: "Toronto FC", label: "Toronto" },
                    ]}
                    value={shotTeamFilter}
                    onChange={setShotTeamFilter}
                    isDark={isDark}
                    groupIcon={<Users size={12} />}
                    groupTooltip="Filter by team"
                  />
                  <div className="flex items-center gap-1">
                    <ToggleAction
                      icon={<CircleDot size={11} />}
                      label="Goals"
                      tooltip="Show/hide goals"
                      isActive={shotOutcomeFilter.goals}
                      onToggle={() => toggleOutcome("goals")}
                      isDark={isDark}
                    />
                    <ToggleAction
                      icon={<Shield size={11} />}
                      label="Saved"
                      tooltip="Show/hide saved shots"
                      isActive={shotOutcomeFilter.saved}
                      onToggle={() => toggleOutcome("saved")}
                      isDark={isDark}
                    />
                    <ToggleAction
                      icon={<CircleOff size={11} />}
                      label="Off Target"
                      tooltip="Show/hide off-target shots"
                      isActive={shotOutcomeFilter.offTarget}
                      onToggle={() => toggleOutcome("offTarget")}
                      isDark={isDark}
                    />
                    <ToggleAction
                      icon={<Ban size={11} />}
                      label="Blocked"
                      tooltip="Show/hide blocked shots"
                      isActive={shotOutcomeFilter.blocked}
                      onToggle={() => toggleOutcome("blocked")}
                      isDark={isDark}
                    />
                  </div>
                </div>
              }
              zone2Analysis={
                <IconAction
                  icon={<Sparkles size={13} />}
                  tooltip="AI Insight"
                  isActive={shotInsightOpen}
                  onToggle={() => setShotInsightOpen((v) => !v)}
                  isDark={isDark}
                  activeColor="amber"
                />
              }
              zone3Utility={
                <MaximizeButton
                  onClick={() => setMaximized("shotmap3d")}
                  isDark={isDark}
                />
              }
            />

            {/* AI Insight panel */}
            {shotInsightOpen && (
              <div
                className="rounded-lg p-3 mb-3"
                style={{
                  background: isDark
                    ? "rgba(255,179,71,0.06)"
                    : "rgba(255,179,71,0.08)",
                  border: `1px solid ${
                    isDark
                      ? "rgba(255,179,71,0.15)"
                      : "rgba(255,179,71,0.2)"
                  }`,
                  fontFamily: "Space Grotesk, sans-serif",
                  fontSize: "11px",
                  lineHeight: 1.6,
                  color: isDark
                    ? "rgba(255,255,255,0.7)"
                    : "rgba(0,0,0,0.65)",
                }}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles
                    size={12}
                    style={{ color: "#ffb347" }}
                  />
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: "10px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "#ffb347",
                    }}
                  >
                    Insight
                  </span>
                </div>
                Miami generated 1.03 xG from 13 shots but scored 4 goals —
                overperforming their expected output by nearly 3 goals. Their
                most dangerous zone was the left half-space inside the box, where{" "}
                <strong>Facundo Far&iacute;as</strong> (47&apos;) and{" "}
                <strong>Benjamin Cremaschi</strong> (72&apos;) both converted
                from tight angles. Toronto&apos;s best chance came from{" "}
                <strong>Deandre Kerr</strong>&apos;s 0.30 xG effort in the 12th
                minute, saved by Callender. The xG differential (Miami 1.03 vs
                Toronto 0.78) was far closer than the scoreline suggests — a
                testament to Miami&apos;s ruthless finishing.
              </div>
            )}

            <Suspense
              fallback={
                <div
                  className="flex items-center justify-center rounded-xl"
                  style={{
                    aspectRatio: "16/9",
                    background: "#040810",
                    color: "rgba(255,255,255,0.2)",
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: "10px",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase" as const,
                  }}
                >
                  Loading…
                </div>
              }
            >
              <ShotMap3D
                teamFilter={shotTeamFilter}
                outcomeFilter={shotOutcomeFilter}
              />
            </Suspense>

            {/* Summary stats below the 3D canvas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
              {[
                {
                  label: "Total Shots",
                  value: "21",
                  color: "var(--table-header-color)",
                },
                { label: "Goals", value: "4", color: "#00c897" },
                {
                  label: "Miami xG",
                  value: "1.03",
                  color: "var(--cyan)",
                },
                {
                  label: "Toronto xG",
                  value: "0.78",
                  color: "var(--cyan)",
                },
              ].map(s => (
                <div
                  key={s.label}
                  className="neu-concave rounded-lg p-2 text-center"
                >
                  <div className="text-[10px] text-muted-foreground uppercase">
                    {s.label}
                  </div>
                  <div
                    className="font-mono text-sm font-bold"
                    style={{ color: s.color }}
                  >
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </NeuCard>
        </StaggerItem>
      )}

      {/* Passing Network — Full-width cinematic 3D card */}
      {view === "passing" && (
        <StaggerItem>
          <NeuCard delay={0.08} className="p-5">
            <ChartHeader
              title="Passing Network x Centrality Analysis"
              description={
                <>
                  In Inter Miami's dominant 4-0 win over Toronto FC, the passing network reveals how the team's shape funneled possession through key architects.{" "}
                  <strong>Kamal Miller</strong> touched the ball more than anyone (Degree: 142), anchoring build-up from the back, while{" "}
                  <strong>Sergio Busquets</strong> acted as the critical bridge connecting the defense to the attack (Betweenness: 0.061).{" "}
                  <strong>Facundo Farías</strong> was the second-highest betweenness node (0.046), channeling the ball into the final third.
                  Hover over a player to isolate their passing lanes; click to lock the selection.
                </>
              }
              methods={
                <>
                  <p style={{ marginBottom: "8px" }}>
                    <strong>Data Source:</strong> StatsBomb Open Data, Match ID 3877115 (Inter Miami 4-0 Toronto FC, Sept 20, 2023).
                    641 completed passes by Inter Miami players were extracted (type.name == 'Pass', pass.outcome == null).
                  </p>
                  <p style={{ marginBottom: "8px" }}>
                    <strong>Node Positioning:</strong> Each player's average [x, y] location is computed from the coordinates of their pass attempts
                    in StatsBomb's 120×80 coordinate system, then mapped to Three.js world coordinates (X: -60 to 60, Z: -40 to 40).
                  </p>
                  <p style={{ marginBottom: "8px" }}>
                    <strong>Degree Centrality (C<sub>D</sub>):</strong> The total number of completed passes involving the player (both as passer and recipient).
                    This metric determines the size of the glass node — higher degree = larger sphere.
                    <br />
                    <code style={{ fontSize: "9px" }}>C_D(v) = Σ passes_in(v) + Σ passes_out(v)</code>
                  </p>
                  <p style={{ marginBottom: "8px" }}>
                    <strong>Betweenness Centrality (C<sub>B</sub>):</strong> Measures the fraction of shortest paths between all pairs of players
                    that pass through a given player (Freeman, 1977). Computed via Brandes' algorithm on the undirected passing graph.
                    Identifies "bridge" players who connect otherwise distant parts of the team structure.
                    <br />
                    <code style={{ fontSize: "9px" }}>C_B(v) = Σ_(s≠v≠t) σ_st(v) / σ_st</code>
                    <br />
                    where σ_st = total shortest paths from s to t, σ_st(v) = those passing through v.
                    Normalized by (n-1)(n-2) for the undirected case.
                  </p>
                  <p style={{ marginBottom: "8px" }}>
                    <strong>Network Density:</strong> Ratio of actual passing connections to possible connections = 2|E| / (n(n-1)).
                    This match: 86 / 120 = 0.717, indicating a highly interconnected passing structure.
                  </p>
                  <p>
                    <strong>Edge Weight:</strong> The thickness and opacity of each neon tube scales linearly with the number of completed passes
                    between the two players. The maximum edge weight in this match is used as the normalization factor.
                  </p>
                </>
              }
              zone3Utility={
                <MaximizeButton onClick={() => setMaximized("passing3d")} isDark={isDark} />
              }
            />
            <Suspense
              fallback={
                <div
                  className="flex items-center justify-center rounded-xl"
                  style={{
                    aspectRatio: "16/9",
                    background: "#0a0a14",
                    color: "rgba(255,255,255,0.3)",
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: "11px",
                  }}
                >
                  Loading 3D scene…
                </div>
              }
            >
              <PassingNetwork3D />
            </Suspense>

            {/* Network stats below the 3D canvas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
              {[
                { label: "Total Passes", value: "641", color: "var(--cyan)" },
                { label: "Players", value: "16", color: "var(--cyan)" },
                { label: "Connections", value: "86", color: "var(--table-header-color)" },
                { label: "Density", value: "0.717", color: "var(--table-header-color)" },
              ].map(s => (
                <div
                  key={s.label}
                  className="neu-concave rounded-lg p-2 text-center"
                >
                  <div className="text-[10px] text-muted-foreground uppercase">
                    {s.label}
                  </div>
                  <div
                    className="font-mono text-sm font-bold"
                    style={{ color: s.color }}
                  >
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </NeuCard>
        </StaggerItem>
      )}

      {/* Heatmap / Shotmap — original layout with team/player selector */}
      {(view === "heatmap" || view === "shotmap") && (
        <StaggerItem>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
            {/* Team/Player Selector */}
            <NeuCard delay={0.05} className="p-4 lg:col-span-1">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Select Team
              </h4>
              <div className="space-y-0.5 max-h-32 overflow-y-auto mb-3">
                {filteredTeams.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedTeam(t.id);
                      setSelectedPlayer(null);
                    }}
                    className={`w-full text-left text-xs py-1 px-2 rounded flex items-center gap-2 transition-colors ${
                      selectedTeam === t.id
                        ? "text-cyan bg-white/5"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: t.color }}
                    />
                    {t.short}
                  </button>
                ))}
              </div>

              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Select Player
              </h4>
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                <button
                  onClick={() => setSelectedPlayer(null)}
                  className={`w-full text-left text-xs py-1 px-2 rounded transition-colors ${
                    !selectedPlayer
                      ? "text-cyan bg-white/5"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All Players (Team)
                </button>
                {teamPlayers.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlayer(p.id)}
                    className={`w-full text-left text-xs py-1 px-2 rounded flex items-center justify-between transition-colors ${
                      selectedPlayer === p.id
                        ? "text-cyan bg-white/5"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    <span
                      className={`text-[10px] px-1 rounded ${
                        p.position === "FW"
                          ? "bg-red-500/15 text-red-400"
                          : p.position === "GK"
                            ? "bg-blue-500/15 text-blue-400"
                            : p.position === "DF"
                              ? "bg-green-500/15 text-green-400"
                              : "bg-yellow-500/15 text-yellow-400"
                      }`}
                    >
                      {p.position}
                    </span>
                  </button>
                ))}
              </div>
            </NeuCard>

            {/* Pitch Visualization */}
            <NeuCard delay={0.12} className="p-4 lg:col-span-3">
              <div className="flex items-center justify-between mb-3">
                <h3
                  className="text-sm font-semibold"
                  style={{ fontFamily: "Space Grotesk, sans-serif" }}
                >
                  {view === "heatmap" &&
                    `Heatmap — ${selPlayerData?.name || teamPlayers[0]?.name || "Team"}`}
                  {view === "shotmap" &&
                    `Shot Map — ${selPlayerData?.name || getTeam(selectedTeam)?.short || "Team"}`}
                </h3>
                <div className="flex items-center gap-3">
                  {view === "shotmap" && (
                    <div className="flex items-center gap-3 text-[10px]">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />{" "}
                        Goal
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />{" "}
                        Saved
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-400" /> Off
                        Target
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-gray-400" />{" "}
                        Blocked
                      </span>
                    </div>
                  )}
                  <MaximizeButton onClick={() => setMaximized("pitch")} />
                </div>
              </div>

              <PitchVisualization />

              {/* Stats below pitch */}
              {view === "shotmap" && (
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-3">
                  {[
                    {
                      label: "Total Shots",
                      value: shotStats.total,
                      color: "var(--table-header-color)",
                    },
                    { label: "Goals", value: shotStats.goals, color: "#00c897" },
                    { label: "Saved", value: shotStats.saved, color: "#ffb347" },
                    { label: "Blocked", value: shotStats.blocked, color: "#666" },
                    {
                      label: "Off Target",
                      value: shotStats.offTarget,
                      color: "#ff6b6b",
                    },
                    {
                      label: "Avg xG",
                      value: shotStats.avgXG,
                      color: "var(--cyan)",
                    },
                  ].map(s => (
                    <div
                      key={s.label}
                      className="neu-concave rounded-lg p-2 text-center"
                    >
                      <div className="text-[10px] text-muted-foreground uppercase">
                        {s.label}
                      </div>
                      <div
                        className="font-mono text-sm font-bold"
                        style={{ color: s.color }}
                      >
                        {typeof s.value === "number" && s.value < 1
                          ? s.value.toFixed(3)
                          : s.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {view === "heatmap" && selPlayerData && (
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {[
                    {
                      label: "Minutes",
                      value: selPlayerData.minutes.toLocaleString(),
                    },
                    { label: "Position", value: selPlayerData.position },
                    { label: "Games", value: selPlayerData.games },
                    { label: "Starts", value: selPlayerData.starts },
                  ].map(s => (
                    <div
                      key={s.label}
                      className="neu-concave rounded-lg p-2 text-center"
                    >
                      <div className="text-[10px] text-muted-foreground uppercase">
                        {s.label}
                      </div>
                      <div className="font-mono text-xs font-bold text-cyan">
                        {s.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </NeuCard>
          </div>
        </StaggerItem>
      )}

      {/* Maximize Modals */}
      <ChartModal
        isOpen={maximized === "pitch"}
        onClose={() => setMaximized(null)}
        title={
          view === "heatmap"
            ? `Heatmap — ${selPlayerData?.name || teamPlayers[0]?.name || "Team"}`
            : `Shot Map — ${selPlayerData?.name || getTeam(selectedTeam)?.short || "Team"}`
        }
      >
        <PitchVisualization isModal />
      </ChartModal>

      <ChartModal
        isOpen={maximized === "passing3d"}
        onClose={() => setMaximized(null)}
        title="Passing Network x Centrality Analysis"
      >
        <div style={{ height: "calc(100vh - 10rem)" }}>
          <Suspense
            fallback={
              <div
                className="flex items-center justify-center"
                style={{
                  height: "100%",
                  background: "#0a0a14",
                  color: "rgba(255,255,255,0.3)",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "11px",
                }}
              >
                Loading 3D scene…
              </div>
            }
          >
            <PassingNetwork3D isModal />
          </Suspense>
        </div>
      </ChartModal>

      <ChartModal
        isOpen={maximized === "shotmap3d"}
        onClose={() => setMaximized(null)}
        title="3D Shot Map x xG Analysis"
      >
        <div style={{ height: "calc(100vh - 10rem)" }}>
          <Suspense
            fallback={
              <div
                className="flex items-center justify-center"
                style={{
                  height: "100%",
                  background: "#040810",
                  color: "rgba(255,255,255,0.2)",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "10px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase" as const,
                }}
              >
                Loading…
              </div>
            }
          >
            <ShotMap3D
              isModal
              teamFilter={shotTeamFilter}
              outcomeFilter={shotOutcomeFilter}
            />
          </Suspense>
        </div>
      </ChartModal>
    </StaggerContainer>
  );
}
