/**
 * TravelMap — Cinematic 3D Travel Visualization
 * Inspired by Craig Taylor (Mapzilla) and Julian Hoffmann Anton
 * Three.js WebGL with orbit controls, bloom glow, 3D marble stadiums, animated particle arcs
 */
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useFilters } from '@/contexts/FilterContext';
import { teams, matches, getTeam, calculateDistance } from '@/lib/mlsData';
import NeuCard from '@/components/NeuCard';
import AnimatedCounter from '@/components/AnimatedCounter';
import { ChartModal, MaximizeButton } from '@/components/ChartModal';
import { Play, Pause, SkipForward, SkipBack, MapPin, Plane, Route, RotateCcw } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// ─── Geo helpers ───
const US_CENTER = { lat: 39.0, lng: -98.0 };
const MAP_SCALE = 60;

function latLngToXZ(lat: number, lng: number): [number, number] {
  const x = (lng - US_CENTER.lng) * Math.cos(US_CENTER.lat * Math.PI / 180) * (MAP_SCALE / 30);
  const z = -(lat - US_CENTER.lat) * (MAP_SCALE / 30);
  return [x, z];
}

const distanceColor = (miles: number): string => {
  if (miles < 500) return '#00c897';
  if (miles < 1000) return '#00d4ff';
  if (miles < 1500) return '#ffb347';
  if (miles < 2000) return '#ff8c42';
  return '#ff6b6b';
};

// ─── 3D Scene Builder ───
interface SceneContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  composer: EffectComposer;
  markerGroup: THREE.Group;
  arcGroup: THREE.Group;
  particleGroup: THREE.Group;
  labelGroup: THREE.Group;
  clock: THREE.Clock;
  animId: number;
  disposed: boolean;
}

function createScene(container: HTMLDivElement): SceneContext {
  const w = container.clientWidth;
  const h = container.clientHeight;

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#07070f');
  scene.fog = new THREE.FogExp2('#07070f', 0.005);

  // Camera — cinematic tilt
  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 500);
  camera.position.set(5, 50, 45);
  camera.lookAt(0, 0, 0);

  // Controls — orbit, tilt, zoom
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 10;
  controls.maxDistance = 150;
  controls.maxPolarAngle = Math.PI / 2.2;
  controls.minPolarAngle = 0.2;
  controls.target.set(0, 0, 0);
  controls.enablePan = true;
  controls.panSpeed = 0.5;
  controls.rotateSpeed = 0.5;

  // Ground plane — dark terrain with subtle grid
  const groundGeo = new THREE.PlaneGeometry(200, 140, 80, 56);
  const groundMat = new THREE.MeshStandardMaterial({
    color: '#08081a',
    roughness: 0.95,
    metalness: 0.05,
    transparent: true,
    opacity: 0.95,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.1;
  scene.add(ground);

  // Grid overlay — subtle hex grid feel
  const gridHelper = new THREE.GridHelper(200, 60, '#151530', '#0c0c20');
  gridHelper.position.y = 0;
  scene.add(gridHelper);

  // Concentric range rings for distance reference
  [20, 35, 48].forEach((r, i) => {
    const ringGeo = new THREE.RingGeometry(r, r + 0.15, 96);
    const ringMat = new THREE.MeshBasicMaterial({ color: '#1a1a3a', side: THREE.DoubleSide, transparent: true, opacity: 0.15 - i * 0.03 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    scene.add(ring);
  });

  // Atmospheric dust particles
  const dustCount = 300;
  const dustGeo = new THREE.BufferGeometry();
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 160;
    dustPositions[i * 3 + 1] = Math.random() * 25 + 0.5;
    dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 120;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustMat = new THREE.PointsMaterial({ color: '#3a4060', size: 0.08, transparent: true, opacity: 0.4 });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  // Lighting — dramatic
  const ambientLight = new THREE.AmbientLight('#2a2a4a', 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight('#6688cc', 0.8);
  dirLight.position.set(30, 50, 20);
  scene.add(dirLight);

  const pointLight1 = new THREE.PointLight('#00d4ff', 0.5, 150);
  pointLight1.position.set(-30, 20, -20);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight('#ffb347', 0.4, 150);
  pointLight2.position.set(30, 20, 20);
  scene.add(pointLight2);

  // Groups
  const markerGroup = new THREE.Group();
  const arcGroup = new THREE.Group();
  const particleGroup = new THREE.Group();
  const labelGroup = new THREE.Group();
  scene.add(markerGroup, arcGroup, particleGroup, labelGroup);

  // Post-processing — bloom for glow
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(w, h),
    0.8,  // strength
    0.4,  // radius
    0.3   // threshold
  );
  composer.addPass(bloomPass);

  const clock = new THREE.Clock();

  return {
    renderer, scene, camera, controls, composer,
    markerGroup, arcGroup, particleGroup, labelGroup,
    clock, animId: 0, disposed: false,
  };
}

// ─── Create 3D marble sphere ───
function createMarbleSphere(
  color: string, size: number, isActive: boolean, position: [number, number]
): THREE.Group {
  const group = new THREE.Group();
  const [x, z] = position;

  // Main sphere — marble material
  const sphereGeo = new THREE.SphereGeometry(size, 32, 32);
  const sphereMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    roughness: 0.15,
    metalness: 0.3,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    emissive: new THREE.Color(color),
    emissiveIntensity: isActive ? 0.8 : 0.35,
    transparent: true,
    opacity: 0.95,
  });
  const sphere = new THREE.Mesh(sphereGeo, sphereMat);
  sphere.position.set(x, size + 0.1, z);
  group.add(sphere);

  // Inner specular highlight sphere
  const specGeo = new THREE.SphereGeometry(size * 0.4, 16, 16);
  const specMat = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.25,
  });
  const spec = new THREE.Mesh(specGeo, specMat);
  spec.position.set(x - size * 0.2, size + 0.1 + size * 0.25, z - size * 0.2);
  group.add(spec);

  // Glow halo
  const glowGeo = new THREE.SphereGeometry(size * (isActive ? 2.5 : 1.8), 16, 16);
  const glowMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: isActive ? 0.15 : 0.07,
    side: THREE.BackSide,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.copy(sphere.position);
  group.add(glow);

  // Second outer glow for depth
  if (isActive) {
    const outerGlowGeo = new THREE.SphereGeometry(size * 3.5, 16, 16);
    const outerGlowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.04,
      side: THREE.BackSide,
    });
    const outerGlow = new THREE.Mesh(outerGlowGeo, outerGlowMat);
    outerGlow.position.copy(sphere.position);
    group.add(outerGlow);
  }

  // Ground ring
  const ringGeo2 = new THREE.RingGeometry(size * 1.2, size * 1.5, 32);
  const ringMat2 = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: isActive ? 0.25 : 0.1,
    side: THREE.DoubleSide,
  });
  const groundRing = new THREE.Mesh(ringGeo2, ringMat2);
  groundRing.rotation.x = -Math.PI / 2;
  groundRing.position.set(x, 0.02, z);
  group.add(groundRing);

  // Vertical beam for active stadiums — tapered
  if (isActive) {
    const beamGeo = new THREE.CylinderGeometry(0.02, 0.06, 15, 8);
    const beamMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.12,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(x, 7.5, z);
    group.add(beam);

    // Ground pulse ring
    const pulseGeo = new THREE.RingGeometry(size * 2, size * 2.5, 32);
    const pulseMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    const pulse = new THREE.Mesh(pulseGeo, pulseMat);
    pulse.rotation.x = -Math.PI / 2;
    pulse.position.set(x, 0.03, z);
    pulse.userData.isPulse = true;
    group.add(pulse);
  }

  return group;
}

// ─── Create CSS2D-style label ───
function createLabel(text: string, position: [number, number], color: string, isActive: boolean): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = 512;
  canvas.height = 128;

  ctx.clearRect(0, 0, 512, 128);
  ctx.font = `${isActive ? 'bold ' : ''}${isActive ? 28 : 20}px "Space Grotesk", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Text shadow
  // Dark outline for readability
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 12;
  ctx.strokeText(text, 256, 64);

  // Main text
  ctx.shadowBlur = isActive ? 16 : 6;
  ctx.shadowColor = isActive ? color : '#000000';
  ctx.fillStyle = isActive ? '#ffffff' : '#8a90b0';
  ctx.fillText(text, 256, 64);

  if (isActive) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 256, 64);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.set(position[0], isActive ? 3.8 : 2.2, position[1]);
  sprite.scale.set(8, 2, 1);
  return sprite;
}

// ─── Create curved 3D arc ───
function createArc(
  from: [number, number], to: [number, number], color: string, distance: number, isAllView: boolean
): { line: THREE.Line; points: THREE.Vector3[] } {
  const height = Math.min(distance / 80, 12) * (isAllView ? 0.5 : 1);
  const midX = (from[0] + to[0]) / 2;
  const midZ = (from[1] + to[1]) / 2;

  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(from[0], 0.3, from[1]),
    new THREE.Vector3(midX, height, midZ),
    new THREE.Vector3(to[0], 0.3, to[1])
  );

  const points = curve.getPoints(50);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: isAllView ? 0.12 : 0.45,
    linewidth: 1,
  });

  return { line: new THREE.Line(geometry, material), points };
}

// ─── Animated particle on arc ───
function createParticle(color: string): THREE.Group {
  const group = new THREE.Group();
  // Core particle
  const geo = new THREE.SphereGeometry(0.2, 8, 8);
  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.95,
  });
  const core = new THREE.Mesh(geo, mat);
  group.add(core);

  // Glow around particle
  const glowGeo = new THREE.SphereGeometry(0.5, 8, 8);
  const glowMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.2,
    side: THREE.BackSide,
  });
  group.add(new THREE.Mesh(glowGeo, glowMat));
  return group;
}

// ─── Tooltip overlay ───
function TooltipOverlay({ info, position }: {
  info: { name: string; stadium: string; record: string; points: number; color: string } | null;
  position: { x: number; y: number };
}) {
  if (!info) return null;
  return (
    <div
      className="absolute pointer-events-none z-50"
      style={{ left: position.x + 12, top: position.y - 60 }}
    >
      <div className="neu-raised rounded-lg p-3 min-w-[200px]" style={{ borderLeft: `3px solid ${info.color}` }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full" style={{
            background: `radial-gradient(ellipse at 30% 25%, rgba(255,255,255,0.5), ${info.color} 40%, rgba(0,0,0,0.5))`,
            boxShadow: `0 0 8px ${info.color}88`,
          }} />
          <span className="text-xs font-bold text-foreground" style={{ fontFamily: 'Space Grotesk' }}>{info.name}</span>
        </div>
        <div className="text-[10px] text-muted-foreground font-mono space-y-0.5">
          <div>{info.stadium}</div>
          <div>{info.record}</div>
          <div>Points: <span className="text-cyan">{info.points}</span></div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════
export default function TravelMap() {
  const { filteredTeams, filteredMatches } = useFilters();
  const [currentWeek, setCurrentWeek] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAllArcs, setShowAllArcs] = useState(false);
  const [maximized, setMaximized] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ name: string; stadium: string; record: string; points: number; color: string } | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<SceneContext | null>(null);
  const particleDataRef = useRef<{ mesh: THREE.Object3D; points: THREE.Vector3[]; t: number; speed: number }[]>([]);

  const weekMatches = useMemo(() =>
    filteredMatches.filter(m => m.week === currentWeek),
    [filteredMatches, currentWeek]
  );

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

  const totalMiles = useMemo(() => allArcs.reduce((s, a) => s + a.distance, 0), [allArcs]);
  const avgDistance = allArcs.length > 0 ? totalMiles / allArcs.length : 0;
  const longestTrip = allArcs.length > 0 ? Math.max(...allArcs.map(a => a.distance)) : 0;

  // Playback
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentWeek(prev => {
          if (prev >= 34) { setIsPlaying(false); return 34; }
          return prev + 1;
        });
      }, 1200);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying]);

  // Update scene overlays
  const updateOverlays = useCallback((ctx: SceneContext) => {
    if (ctx.disposed) return;

    // Clear groups
    while (ctx.markerGroup.children.length) {
      const c = ctx.markerGroup.children[0];
      ctx.markerGroup.remove(c);
      c.traverse((obj: THREE.Object3D) => {
        if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
        if ((obj as THREE.Mesh).material) {
          const mat = (obj as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach(m => m.dispose());
          else (mat as THREE.Material).dispose();
        }
      });
    }
    while (ctx.arcGroup.children.length) {
      const c = ctx.arcGroup.children[0];
      ctx.arcGroup.remove(c);
      c.traverse((obj: THREE.Object3D) => {
        if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
        if ((obj as THREE.Mesh).material) {
          const mat = (obj as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach(m => m.dispose());
          else (mat as THREE.Material).dispose();
        }
      });
    }
    while (ctx.particleGroup.children.length) {
      const c = ctx.particleGroup.children[0];
      ctx.particleGroup.remove(c);
    }
    while (ctx.labelGroup.children.length) {
      const c = ctx.labelGroup.children[0];
      ctx.labelGroup.remove(c);
      if ((c as THREE.Sprite).material) {
        const mat = (c as THREE.Sprite).material as THREE.SpriteMaterial;
        if (mat.map) mat.map.dispose();
        mat.dispose();
      }
    }
    particleDataRef.current = [];

    // Stadium markers
    filteredTeams.forEach(team => {
      const isActive = weekMatches.some(m => m.homeTeamId === team.id);
      const isAway = weekMatches.some(m => m.awayTeamId === team.id);
      const pos = latLngToXZ(team.lat, team.lng);
      const size = isActive ? 0.7 : isAway ? 0.5 : 0.35;
      const marbleGroup = createMarbleSphere(team.primaryColor, size, isActive, pos);
      // Store team data for raycasting
      marbleGroup.userData = { teamId: team.id };
      ctx.markerGroup.add(marbleGroup);

      const label = createLabel(team.shortName, pos, team.primaryColor, isActive);
      ctx.labelGroup.add(label);
    });

    // Travel arcs
    currentArcs.forEach(arc => {
      const from = latLngToXZ(arc.away.lat, arc.away.lng);
      const to = latLngToXZ(arc.home.lat, arc.home.lng);
      const color = distanceColor(arc.distance);
      const { line, points } = createArc(from, to, color, arc.distance, showAllArcs);
      ctx.arcGroup.add(line);

      // Glow line (wider)
      const glowGeo = new THREE.BufferGeometry().setFromPoints(points);
      const glowMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: showAllArcs ? 0.04 : 0.15,
      });
      ctx.arcGroup.add(new THREE.Line(glowGeo, glowMat));

      // Animated particle
      if (!showAllArcs) {
        const particle = createParticle(color);
        particle.position.copy(points[0]);
        ctx.particleGroup.add(particle);
        particleDataRef.current.push({
          mesh: particle,
          points,
          t: Math.random(),
          speed: 0.003 + Math.random() * 0.004,
        });
      }
    });
  }, [filteredTeams, weekMatches, currentArcs, showAllArcs]);

  // Initialize Three.js scene
  const initScene = useCallback((container: HTMLDivElement) => {
    if (ctxRef.current) {
      // Dispose old scene
      ctxRef.current.disposed = true;
      cancelAnimationFrame(ctxRef.current.animId);
      ctxRef.current.renderer.dispose();
      ctxRef.current.composer.dispose();
      ctxRef.current.controls.dispose();
      if (ctxRef.current.renderer.domElement.parentNode) {
        ctxRef.current.renderer.domElement.parentNode.removeChild(ctxRef.current.renderer.domElement);
      }
    }

    const ctx = createScene(container);
    ctxRef.current = ctx;

    updateOverlays(ctx);

    // Raycaster for hover
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

      raycaster.setFromCamera(mouse, ctx.camera);
      const intersects = raycaster.intersectObjects(ctx.markerGroup.children, true);
      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj && !obj.userData?.teamId) obj = obj.parent;
        if (obj?.userData?.teamId) {
          const team = getTeam(obj.userData.teamId);
          if (team) {
            setTooltip({
              name: team.name,
              stadium: team.stadium,
              record: `${team.wins}W-${team.draws}D-${team.losses}L`,
              points: team.points,
              color: team.primaryColor,
            });
            container.style.cursor = 'pointer';
            return;
          }
        }
      }
      setTooltip(null);
      container.style.cursor = 'grab';
    };

    container.addEventListener('mousemove', onMouseMove);

    // Animation loop
    const animate = () => {
      if (ctx.disposed) return;
      ctx.animId = requestAnimationFrame(animate);
      ctx.controls.update();

      // Animate particles
      particleDataRef.current.forEach(pd => {
        pd.t += pd.speed;
        if (pd.t >= 1) pd.t = 0;
        const idx = Math.floor(pd.t * (pd.points.length - 1));
        const nextIdx = Math.min(idx + 1, pd.points.length - 1);
        const frac = pd.t * (pd.points.length - 1) - idx;
        pd.mesh.position.lerpVectors(pd.points[idx], pd.points[nextIdx], frac);
      });

      // Subtle marble float animation
      const time = ctx.clock.getElapsedTime();
      ctx.markerGroup.children.forEach((group, i) => {
        group.children.forEach(child => {
          if (child instanceof THREE.Mesh && child.geometry.type === 'SphereGeometry') {
            const baseY = (child.geometry as THREE.SphereGeometry).parameters.radius + 0.1;
            child.position.y = baseY + Math.sin(time * 1.5 + i * 0.5) * 0.12;
          }
        });
      });

      // Animate pulse rings on active stadiums
      ctx.markerGroup.children.forEach(group => {
        group.children.forEach(child => {
          if (child instanceof THREE.Mesh && child.userData?.isPulse) {
            const scale = 1 + Math.sin(time * 2) * 0.3;
            child.scale.set(scale, scale, 1);
            (child.material as THREE.MeshBasicMaterial).opacity = 0.15 * (1 - Math.sin(time * 2) * 0.5);
          }
        });
      });

      // Animate dust particles
      const dustObj = ctx.scene.children.find(c => c instanceof THREE.Points) as THREE.Points | undefined;
      if (dustObj) {
        const pos = dustObj.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const y = pos.getY(i);
          pos.setY(i, y + Math.sin(time * 0.3 + i * 0.1) * 0.003);
        }
        pos.needsUpdate = true;
      }

      // Labels always face camera
      ctx.labelGroup.children.forEach(sprite => {
        if (sprite instanceof THREE.Sprite) {
          sprite.lookAt(ctx.camera.position);
        }
      });

      ctx.composer.render();
    };
    animate();

    // Resize handler
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      ctx.camera.aspect = w / h;
      ctx.camera.updateProjectionMatrix();
      ctx.renderer.setSize(w, h);
      ctx.composer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    return () => {
      ctx.disposed = true;
      cancelAnimationFrame(ctx.animId);
      container.removeEventListener('mousemove', onMouseMove);
      resizeObserver.disconnect();
      ctx.controls.dispose();
      ctx.renderer.dispose();
      if (ctx.renderer.domElement.parentNode) {
        ctx.renderer.domElement.parentNode.removeChild(ctx.renderer.domElement);
      }
    };
  }, [updateOverlays]);

  // Mount scene
  useEffect(() => {
    const container = maximized ? modalContainerRef.current : containerRef.current;
    if (!container) return;
    const cleanup = initScene(container);
    return cleanup;
  }, [initScene, maximized]);

  // Update overlays when data changes
  useEffect(() => {
    if (ctxRef.current && !ctxRef.current.disposed) {
      updateOverlays(ctxRef.current);
    }
  }, [updateOverlays]);

  const resetCamera = useCallback(() => {
    if (ctxRef.current) {
      const ctx = ctxRef.current;
      ctx.camera.position.set(5, 50, 45);
      ctx.controls.target.set(0, 0, 0);
      ctx.controls.update();
    }
  }, []);

  return (
    <div className="space-y-4 mt-4">
      {/* Summary cards */}
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

      {/* 3D Map */}
      <NeuCard delay={0.15} className="p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
            League Travel Map — Matchweek {currentWeek}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={resetCamera}
              className="text-[10px] px-2 py-1 rounded neu-raised text-muted-foreground hover:text-cyan transition-all flex items-center gap-1"
              title="Reset camera"
            >
              <RotateCcw size={10} /> Reset View
            </button>
            <button
              onClick={() => setShowAllArcs(!showAllArcs)}
              className={`text-[10px] px-2 py-1 rounded transition-all ${showAllArcs ? 'neu-pressed text-cyan' : 'neu-raised text-muted-foreground'}`}
            >
              {showAllArcs ? 'All Routes' : 'Current Week'}
            </button>
            <MaximizeButton onClick={() => setMaximized('map')} />
          </div>
        </div>

        <div className="relative rounded-xl overflow-hidden" style={{ height: '520px' }}>
          <div ref={containerRef} className="w-full h-full" style={{ cursor: 'grab' }} />
          <TooltipOverlay info={tooltip} position={tooltipPos} />

          {/* HUD overlay */}
          <div className="absolute bottom-3 left-3 text-[9px] text-muted-foreground/60 font-mono space-y-0.5 pointer-events-none">
            <div>DRAG to orbit · SCROLL to zoom · RIGHT-CLICK to pan</div>
            <div>TILT by dragging vertically</div>
          </div>
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
              onClick={() => { setCurrentWeek(Math.max(1, currentWeek - 1)); setIsPlaying(false); }}
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
              onClick={() => { setCurrentWeek(Math.min(34, currentWeek + 1)); setIsPlaying(false); }}
              className="neu-raised p-1.5 rounded-lg hover:text-cyan transition-colors"
            >
              <SkipForward size={14} />
            </button>
          </div>

          <div className="flex-1">
            <input
              type="range" min={1} max={34} value={currentWeek}
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

      {/* Maximize Modal */}
      <ChartModal isOpen={maximized === 'map'} onClose={() => setMaximized(null)} title={`League Travel Map — Matchweek ${currentWeek}`}>
        <div className="relative w-full" style={{ height: '75vh' }}>
          <div ref={modalContainerRef} className="w-full h-full" style={{ cursor: 'grab' }} />
          <TooltipOverlay info={tooltip} position={tooltipPos} />
        </div>
      </ChartModal>
    </div>
  );
}
