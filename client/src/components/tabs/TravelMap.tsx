/**
 * TravelMap — Cinematic 3D Travel Visualization
 * Design: Craig Taylor (Mapzilla) / Julian Anton inspired
 * Rich terrain basemap, muted metallic arcs, team-colored traveling particles,
 * dense glass marble stadiums with contained glow
 * Three.js WebGL with orbit controls, bloom, animated particles
 */
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useFilters } from '@/contexts/FilterContext';
import { TEAMS, MATCHES, getTeam, calculateDistance } from '@/lib/mlsData';
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

// ─── Visibility-enhanced team colors ───
// Dark teams get brighter alternates so they pop against dark basemap
const VISIBILITY_COLORS: Record<string, string> = {
  'MTL': '#4488cc',   // CF Montréal — black → blue
  'CLB': '#ffc72c',   // Columbus Crew — black → gold
  'DC':  '#c8102e',   // D.C. United — black → red
  'NE':  '#4477bb',   // NE Revolution — dark navy → brighter blue
  'PHI': '#4488aa',   // Philadelphia — dark navy → teal blue
  'POR': '#00aa44',   // Portland — very dark green → brighter green
  'LAG': '#5588cc',   // LA Galaxy — dark navy → brighter blue
  'VAN': '#5599dd',   // Vancouver — dark navy → brighter blue
};

function getVisibleColor(teamId: string, originalColor: string): string {
  return VISIBILITY_COLORS[teamId] || originalColor;
}

// ─── US/Canada coastline + state borders (simplified) ───
const US_COASTLINE: [number, number][][] = [
  // Continental US outline
  [[-124.7,48.4],[-123.1,48.4],[-123.1,46.2],[-124.1,43.0],[-124.4,40.4],[-122.4,37.8],
   [-120.5,34.0],[-117.1,32.5],[-114.7,32.7],[-111.0,31.3],[-108.2,31.3],[-106.4,31.8],
   [-103.0,29.0],[-99.0,26.0],[-97.1,25.9],[-97.1,27.8],[-94.0,29.7],[-89.6,29.0],
   [-88.9,30.4],[-85.0,29.2],[-84.0,30.0],[-82.0,28.5],[-81.1,25.1],[-80.0,25.8],
   [-80.4,27.8],[-80.6,31.2],[-78.5,33.9],[-75.5,35.2],[-75.0,38.0],[-73.9,40.5],
   [-71.8,41.3],[-70.0,41.7],[-69.8,43.8],[-67.0,44.8],[-67.0,47.0],[-69.0,47.4],
   [-75.0,45.0],[-79.0,43.2],[-82.4,41.7],[-83.5,46.1],[-84.8,46.0],[-88.0,48.0],
   [-89.5,48.0],[-95.2,49.0],[-123.3,49.0],[-124.7,48.4]],
  // Great Lakes
  [[-87.8,42.0],[-86.8,41.8],[-84.8,41.7],[-83.0,42.3],[-82.4,43.0],[-82.7,44.8],
   [-83.5,46.1],[-84.6,46.5],[-84.8,46.0],[-86.0,44.8],[-87.8,42.0]],
  // Lake Michigan
  [[-87.8,42.0],[-87.0,43.0],[-86.5,44.8],[-85.5,45.8],[-86.5,44.0],[-87.8,42.0]],
  // Southern Canada
  [[-79.0,43.2],[-76.0,44.0],[-75.0,45.0],[-73.6,45.5],[-71.0,45.0],[-67.0,47.0]],
  // Florida detail
  [[-82.0,28.5],[-82.7,27.5],[-82.0,26.0],[-81.1,25.1]],
];

// State borders (major ones for geographic context)
const STATE_BORDERS: [number, number][][] = [
  // US-Canada border
  [[-124.7,49.0],[-95.2,49.0]],
  // Mississippi River (approximate)
  [[-89.5,48.0],[-90.0,46.0],[-91.5,44.0],[-91.0,42.0],[-90.5,40.0],[-89.5,37.0],[-89.0,35.0],[-90.0,33.0],[-91.0,31.0],[-89.6,29.0]],
  // Appalachian line (approximate)
  [[-80.0,41.0],[-80.5,39.0],[-81.0,37.0],[-82.0,35.0],[-83.5,33.5],[-84.0,30.0]],
  // Rockies line
  [[-109.0,49.0],[-109.0,46.0],[-108.5,43.0],[-107.5,40.0],[-106.5,37.0],[-105.5,34.0],[-106.4,31.8]],
];

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

  // Renderer — high quality
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Scene — deep dark blue-black (not pure black — has depth)
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#060a14');
  scene.fog = new THREE.FogExp2('#060a14', 0.004);

  // Camera — cinematic tilt angle
  const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 500);
  camera.position.set(5, 50, 55);
  camera.lookAt(0, 0, 0);

  // Controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 12;
  controls.maxDistance = 120;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.minPolarAngle = 0.15;
  controls.target.set(0, 0, 2);
  controls.enablePan = true;
  controls.panSpeed = 0.4;
  controls.rotateSpeed = 0.4;

  // ══════════════════════════════════════════
  // BASEMAP — Rich terrain with land/water distinction
  // ══════════════════════════════════════════

  // Water plane — deep dark blue
  const waterGeo = new THREE.PlaneGeometry(220, 160, 1, 1);
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: '#050810',
    roughness: 0.6,
    metalness: 0.2,
    clearcoat: 0.3,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.15;
  water.receiveShadow = true;
  scene.add(water);

  // Land mass — procedural canvas texture with terrain coloring
  const landCanvas = document.createElement('canvas');
  landCanvas.width = 2048;
  landCanvas.height = 1400;
  const lctx = landCanvas.getContext('2d')!;

  // Dark ocean base
  lctx.fillStyle = '#050810';
  lctx.fillRect(0, 0, 2048, 1400);

  // Convert lat/lng to canvas coordinates
  const toCanvasXY = (lng: number, lat: number): [number, number] => {
    const cx = ((lng - (-130)) / ((-60) - (-130))) * 2048;
    const cy = ((50 - lat) / (50 - 24)) * 1400;
    return [cx, cy];
  };

  // Draw land mass shape
  lctx.beginPath();
  const coastline = US_COASTLINE[0];
  const [sx, sy] = toCanvasXY(coastline[0][0], coastline[0][1]);
  lctx.moveTo(sx, sy);
  coastline.forEach(([lng, lat]) => {
    const [cx, cy] = toCanvasXY(lng, lat);
    lctx.lineTo(cx, cy);
  });
  lctx.closePath();

  // Land fill — subtle dark green-gray (like satellite imagery at night)
  const landGrad = lctx.createLinearGradient(0, 0, 2048, 1400);
  landGrad.addColorStop(0, '#0c1018');
  landGrad.addColorStop(0.3, '#0d1119');
  landGrad.addColorStop(0.6, '#0b0f16');
  landGrad.addColorStop(1, '#0a0e15');
  lctx.fillStyle = landGrad;
  lctx.fill();

  // Subtle terrain noise on land
  for (let i = 0; i < 80000; i++) {
    const x = Math.random() * 2048;
    const y = Math.random() * 1400;
    // Check if point is roughly on land (simple bounding)
    const lng = -130 + (x / 2048) * 70;
    const lat = 50 - (y / 1400) * 26;
    if (lng > -125 && lng < -66 && lat > 25 && lat < 49) {
      const brightness = Math.random() * 12 + 14;
      const g = brightness + Math.random() * 4;
      const b = brightness + Math.random() * 8;
      lctx.fillStyle = `rgba(${brightness}, ${g}, ${b}, ${Math.random() * 0.3 + 0.05})`;
      lctx.fillRect(x, y, Math.random() * 3 + 0.5, Math.random() * 3 + 0.5);
    }
  }

  // City light clusters — subtle warm dots where cities are
  const cityLights: [number, number, number][] = [
    [-73.9, 40.7, 1.5], [-87.6, 41.9, 1.3], [-118.2, 34.0, 1.4], [-95.4, 29.8, 1.0],
    [-122.3, 47.6, 0.9], [-80.2, 25.8, 1.0], [-84.4, 33.8, 1.1], [-97.7, 30.3, 0.8],
    [-104.9, 39.7, 0.8], [-93.3, 45.0, 0.7], [-90.2, 38.6, 0.7], [-86.8, 36.2, 0.7],
    [-75.2, 40.0, 0.9], [-83.0, 39.9, 0.6], [-81.4, 28.5, 0.8], [-79.4, 43.7, 0.7],
    [-123.1, 49.3, 0.6], [-73.6, 45.5, 0.6], [-80.8, 35.2, 0.6], [-94.8, 39.1, 0.6],
  ];
  cityLights.forEach(([lng, lat, intensity]) => {
    const [cx, cy] = toCanvasXY(lng, lat);
    const grad = lctx.createRadialGradient(cx, cy, 0, cx, cy, 30 * intensity);
    grad.addColorStop(0, `rgba(255, 220, 150, ${0.08 * intensity})`);
    grad.addColorStop(0.5, `rgba(200, 180, 120, ${0.03 * intensity})`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    lctx.fillStyle = grad;
    lctx.fillRect(cx - 40, cy - 40, 80, 80);
  });

  // Coastline stroke — subtle bright edge
  lctx.beginPath();
  lctx.moveTo(sx, sy);
  coastline.forEach(([lng, lat]) => {
    const [cx, cy] = toCanvasXY(lng, lat);
    lctx.lineTo(cx, cy);
  });
  lctx.closePath();
  lctx.strokeStyle = 'rgba(40, 60, 90, 0.6)';
  lctx.lineWidth = 1.5;
  lctx.stroke();

  // Great Lakes — cut out as water
  US_COASTLINE.slice(1, 3).forEach(lake => {
    lctx.beginPath();
    const [lx, ly] = toCanvasXY(lake[0][0], lake[0][1]);
    lctx.moveTo(lx, ly);
    lake.forEach(([lng, lat]) => {
      const [cx, cy] = toCanvasXY(lng, lat);
      lctx.lineTo(cx, cy);
    });
    lctx.closePath();
    lctx.fillStyle = '#050810';
    lctx.fill();
    lctx.strokeStyle = 'rgba(30, 50, 80, 0.4)';
    lctx.lineWidth = 1;
    lctx.stroke();
  });

  // State borders — very subtle
  STATE_BORDERS.forEach(border => {
    lctx.beginPath();
    const [bx, by] = toCanvasXY(border[0][0], border[0][1]);
    lctx.moveTo(bx, by);
    border.forEach(([lng, lat]) => {
      const [cx, cy] = toCanvasXY(lng, lat);
      lctx.lineTo(cx, cy);
    });
    lctx.strokeStyle = 'rgba(25, 40, 65, 0.35)';
    lctx.lineWidth = 0.8;
    lctx.stroke();
  });

  const landTexture = new THREE.CanvasTexture(landCanvas);
  landTexture.minFilter = THREE.LinearFilter;
  landTexture.magFilter = THREE.LinearFilter;

  // Map the texture to cover the same geographic area
  const landPlaneGeo = new THREE.PlaneGeometry(220, 160, 1, 1);
  const landPlaneMat = new THREE.MeshBasicMaterial({
    map: landTexture,
    transparent: true,
    opacity: 0.9,
  });
  const landPlane = new THREE.Mesh(landPlaneGeo, landPlaneMat);
  landPlane.rotation.x = -Math.PI / 2;
  landPlane.position.y = -0.05;
  scene.add(landPlane);

  // ── 3D Coastline lines for crisp edges ──
  US_COASTLINE.forEach(polyline => {
    const pts = polyline.map(([lng, lat]) => {
      const [x, z] = latLngToXZ(lat, lng);
      return new THREE.Vector3(x, 0.02, z);
    });
    const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const lineMat = new THREE.LineBasicMaterial({
      color: '#1c3050',
      transparent: true,
      opacity: 0.45,
    });
    scene.add(new THREE.Line(lineGeo, lineMat));
  });

  // State borders as 3D lines
  STATE_BORDERS.forEach(border => {
    const pts = border.map(([lng, lat]) => {
      const [x, z] = latLngToXZ(lat, lng);
      return new THREE.Vector3(x, 0.01, z);
    });
    const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const lineMat = new THREE.LineBasicMaterial({
      color: '#141e30',
      transparent: true,
      opacity: 0.25,
    });
    scene.add(new THREE.Line(lineGeo, lineMat));
  });

  // ── Atmospheric dust — sparse, slow ──
  const dustCount = 100;
  const dustGeo = new THREE.BufferGeometry();
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 140;
    dustPositions[i * 3 + 1] = Math.random() * 15 + 2;
    dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 100;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustMat = new THREE.PointsMaterial({ color: '#1a2540', size: 0.04, transparent: true, opacity: 0.2 });
  scene.add(new THREE.Points(dustGeo, dustMat));

  // ══════════════════════════════════════════
  // LIGHTING — Cinematic three-point
  // ══════════════════════════════════════════
  scene.add(new THREE.AmbientLight('#0a0e1a', 0.4));

  // Key light — cool blue from upper-left
  const keyLight = new THREE.DirectionalLight('#2244aa', 0.8);
  keyLight.position.set(-30, 60, 30);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  scene.add(keyLight);

  // Fill light — warm from right
  const fillLight = new THREE.DirectionalLight('#332211', 0.3);
  fillLight.position.set(40, 25, -20);
  scene.add(fillLight);

  // Rim light — back edge definition
  const rimLight = new THREE.DirectionalLight('#1a2244', 0.5);
  rimLight.position.set(0, 15, -50);
  scene.add(rimLight);

  // Top down light — subtle for ground illumination
  const topLight = new THREE.DirectionalLight('#111828', 0.3);
  topLight.position.set(0, 80, 0);
  scene.add(topLight);

  // Groups
  const markerGroup = new THREE.Group();
  const arcGroup = new THREE.Group();
  const particleGroup = new THREE.Group();
  const labelGroup = new THREE.Group();
  scene.add(markerGroup, arcGroup, particleGroup, labelGroup);

  // Post-processing — bloom (restrained elegance)
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(w, h),
    0.6,   // strength — restrained
    0.4,   // radius — tight
    0.3    // threshold — only bright things bloom
  );
  composer.addPass(bloomPass);

  return {
    renderer, scene, camera, controls, composer,
    markerGroup, arcGroup, particleGroup, labelGroup,
    clock: new THREE.Clock(), animId: 0, disposed: false,
  };
}

// ══════════════════════════════════════════
// GLASS MARBLE SPHERE — Dense, jewel-like
// Tight glow, contained light, like a real glass marble
// ══════════════════════════════════════════
function createMarbleSphere(
  teamId: string, color: string, size: number, isActive: boolean, isAway: boolean, position: [number, number]
): THREE.Group {
  const group = new THREE.Group();
  const [x, z] = position;
  const yBase = size + 0.05;
  const visColor = getVisibleColor(teamId, color);
  const col = new THREE.Color(visColor);

  // ── Main glass sphere — dense refractive glass ──
  const sphereGeo = new THREE.SphereGeometry(size, 48, 48);
  const sphereMat = new THREE.MeshPhysicalMaterial({
    color: col.clone().multiplyScalar(0.7),
    roughness: 0.02,
    metalness: 0.0,
    transmission: 0.5,
    thickness: size * 4,
    ior: 2.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.01,
    specularIntensity: 3.0,
    specularColor: new THREE.Color('#ffffff'),
    emissive: col.clone(),
    emissiveIntensity: isActive ? 0.6 : isAway ? 0.35 : 0.12,
    envMapIntensity: 1.5,
    transparent: true,
    opacity: 0.95,
    attenuationColor: col.clone(),
    attenuationDistance: size * 2,
    side: THREE.FrontSide,
  });
  const sphere = new THREE.Mesh(sphereGeo, sphereMat);
  sphere.position.set(x, yBase, z);
  sphere.castShadow = true;
  group.add(sphere);

  // ── Inner core — bright concentrated center ──
  const coreGeo = new THREE.SphereGeometry(size * 0.35, 16, 16);
  const coreMat = new THREE.MeshBasicMaterial({
    color: col.clone().lerp(new THREE.Color('#ffffff'), 0.6),
    transparent: true,
    opacity: isActive ? 0.7 : isAway ? 0.4 : 0.2,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.set(x, yBase, z);
  group.add(core);

  // ── Specular highlight — glass reflection dot ──
  const specGeo = new THREE.SphereGeometry(size * 0.12, 10, 10);
  const specMat = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.55,
  });
  const spec = new THREE.Mesh(specGeo, specMat);
  spec.position.set(x - size * 0.22, yBase + size * 0.28, z - size * 0.18);
  group.add(spec);

  // ── Tight rim — very contained, not bleeding ──
  const rimGeo = new THREE.SphereGeometry(size * 1.08, 24, 24);
  const rimMat = new THREE.MeshBasicMaterial({
    color: col.clone().lerp(new THREE.Color('#ffffff'), 0.15),
    transparent: true,
    opacity: isActive ? 0.06 : 0.02,
    side: THREE.BackSide,
  });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.position.set(x, yBase, z);
  group.add(rim);

  // ── Ground reflection pool — small, tight ──
  const poolGeo = new THREE.CircleGeometry(size * (isActive ? 1.4 : 0.9), 32);
  const poolMat = new THREE.MeshBasicMaterial({
    color: col,
    transparent: true,
    opacity: isActive ? 0.12 : 0.04,
    side: THREE.DoubleSide,
  });
  const pool = new THREE.Mesh(poolGeo, poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(x, 0.01, z);
  group.add(pool);

  // ── Active stadium extras ──
  if (isActive) {
    // Subtle vertical beam
    const beamGeo = new THREE.CylinderGeometry(0.008, size * 0.12, 6, 6);
    const beamMat = new THREE.MeshBasicMaterial({
      color: col.clone().lerp(new THREE.Color('#ffffff'), 0.3),
      transparent: true,
      opacity: 0.03,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(x, 3.5, z);
    group.add(beam);

    // Pulse ring — single, subtle
    const pulseGeo = new THREE.RingGeometry(size * 1.3, size * 1.5, 48);
    const pulseMat = new THREE.MeshBasicMaterial({
      color: col,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
    });
    const pulse = new THREE.Mesh(pulseGeo, pulseMat);
    pulse.rotation.x = -Math.PI / 2;
    pulse.position.set(x, 0.02, z);
    pulse.userData.isPulse = true;
    group.add(pulse);

    // Point light — contained
    const pointLight = new THREE.PointLight(col, 0.5, size * 5);
    pointLight.position.set(x, yBase + size * 0.5, z);
    group.add(pointLight);
  }

  return group;
}

// ─── Create label ───
function createLabel(text: string, position: [number, number], teamId: string, color: string, isActive: boolean): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = 512;
  canvas.height = 128;
  ctx.clearRect(0, 0, 512, 128);

  const visColor = getVisibleColor(teamId, color);
  const fontSize = isActive ? 24 : 16;
  ctx.font = `${isActive ? 'bold ' : ''}${fontSize}px "Space Grotesk", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Dark outline
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 10;
  ctx.strokeText(text, 256, 64);

  // Main text
  ctx.shadowBlur = isActive ? 12 : 4;
  ctx.shadowColor = isActive ? visColor : '#000000';
  ctx.fillStyle = isActive ? '#d8dce8' : '#3a4060';
  ctx.fillText(text, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.set(position[0], isActive ? 2.8 : 1.5, position[1]);
  sprite.scale.set(6, 1.5, 1);
  return sprite;
}

// ─── Create muted metallic arc ───
function createArc(
  from: [number, number], to: [number, number], distance: number, isAllView: boolean
): { tube: THREE.Mesh; points: THREE.Vector3[] } {
  const height = Math.min(distance / 100, 8) * (isAllView ? 0.3 : 1);
  const midX = (from[0] + to[0]) / 2;
  const midZ = (from[1] + to[1]) / 2;

  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(from[0], 0.15, from[1]),
    new THREE.Vector3(midX, height, midZ),
    new THREE.Vector3(to[0], 0.15, to[1])
  );

  const points = curve.getPoints(60);

  // Thin muted metallic tube — like infrastructure
  const tubeGeo = new THREE.TubeGeometry(curve, 40, isAllView ? 0.015 : 0.03, 6, false);
  const tubeMat = new THREE.MeshPhysicalMaterial({
    color: '#3a4258',
    roughness: 0.35,
    metalness: 0.85,
    clearcoat: 0.3,
    clearcoatRoughness: 0.2,
    transparent: true,
    opacity: isAllView ? 0.1 : 0.45,
    emissive: '#1a2038',
    emissiveIntensity: 0.05,
  });
  const tube = new THREE.Mesh(tubeGeo, tubeMat);

  return { tube, points };
}

// ─── Animated particle — team-colored traveling dot ───
function createParticle(teamId: string, color: string): THREE.Group {
  const group = new THREE.Group();
  const visColor = getVisibleColor(teamId, color);
  const col = new THREE.Color(visColor);

  // Core — small bright dot
  const geo = new THREE.SphereGeometry(0.1, 8, 8);
  const mat = new THREE.MeshBasicMaterial({
    color: col.clone().lerp(new THREE.Color('#ffffff'), 0.4),
    transparent: true,
    opacity: 0.9,
  });
  group.add(new THREE.Mesh(geo, mat));

  // Tight glow
  const glowGeo = new THREE.SphereGeometry(0.2, 8, 8);
  const glowMat = new THREE.MeshBasicMaterial({
    color: col,
    transparent: true,
    opacity: 0.25,
    side: THREE.BackSide,
  });
  group.add(new THREE.Mesh(glowGeo, glowMat));

  return group;
}

// ─── Tooltip overlay ───
function TooltipOverlay({ info, position }: {
  info: { name: string; stadium: string; color: string } | null;
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
            boxShadow: `0 0 6px ${info.color}66`,
          }} />
          <span className="text-xs font-bold text-foreground" style={{ fontFamily: 'Space Grotesk' }}>{info.name}</span>
        </div>
        <div className="text-[10px] text-muted-foreground font-mono">
          {info.stadium}
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
  const [tooltip, setTooltip] = useState<{ name: string; stadium: string; color: string } | null>(null);
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
      const home = getTeam(m.homeTeam);
      const away = getTeam(m.awayTeam);
      if (!home || !away) return null;
      const dist = calculateDistance(away.lat, away.lng, home.lat, home.lng);
      return { match: m, home, away, distance: dist };
    }).filter(Boolean) as { match: typeof MATCHES[0]; home: typeof TEAMS[0]; away: typeof TEAMS[0]; distance: number }[],
    [filteredMatches]
  );

  const currentArcs = useMemo(() =>
    showAllArcs ? allArcs : allArcs.filter(a => a.match.week === currentWeek),
    [allArcs, currentWeek, showAllArcs]
  );

  const totalMiles = useMemo(() => allArcs.reduce((s, a) => s + a.distance, 0), [allArcs]);
  const avgDistance = allArcs.length > 0 ? totalMiles / allArcs.length : 0;
  const longestTrip = allArcs.length > 0 ? Math.max(...allArcs.map(a => a.distance)) : 0;

  // Playback — auto-advance through weeks
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentWeek(prev => {
          if (prev >= 34) { setIsPlaying(false); return 34; }
          return prev + 1;
        });
      }, 1500);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying]);

  // ─── Dispose helper ───
  const disposeGroup = (group: THREE.Group) => {
    while (group.children.length) {
      const c = group.children[0];
      group.remove(c);
      c.traverse((obj: THREE.Object3D) => {
        if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
        if ((obj as THREE.Mesh).material) {
          const mat = (obj as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach(m => m.dispose());
          else (mat as THREE.Material).dispose();
        }
      });
    }
  };

  // Update scene overlays
  const updateOverlays = useCallback((ctx: SceneContext) => {
    if (ctx.disposed) return;

    disposeGroup(ctx.markerGroup);
    disposeGroup(ctx.arcGroup);
    disposeGroup(ctx.particleGroup);
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

    // ── Stadium markers ──
    filteredTeams.forEach(team => {
      const isActive = weekMatches.some(m => m.homeTeam === team.id);
      const isAway = weekMatches.some(m => m.awayTeam === team.id);
      const pos = latLngToXZ(team.lat, team.lng);
      const size = isActive ? 0.5 : isAway ? 0.35 : 0.22;
      const marbleGroup = createMarbleSphere(team.id, team.color, size, isActive, isAway, pos);
      marbleGroup.userData = { teamId: team.id };
      ctx.markerGroup.add(marbleGroup);

      const label = createLabel(team.short, pos, team.id, team.color, isActive);
      ctx.labelGroup.add(label);
    });

    // ── Travel arcs ──
    currentArcs.forEach(arc => {
      const from = latLngToXZ(arc.away.lat, arc.away.lng);
      const to = latLngToXZ(arc.home.lat, arc.home.lng);
      const { tube, points } = createArc(from, to, arc.distance, showAllArcs);
      ctx.arcGroup.add(tube);

      // Animated particle — away team's color
      if (!showAllArcs) {
        const particle = createParticle(arc.away.id, arc.away.color);
        particle.position.copy(points[0]);
        ctx.particleGroup.add(particle);
        particleDataRef.current.push({
          mesh: particle,
          points,
          t: Math.random(),
          speed: 0.003 + Math.random() * 0.002,
        });
      }
    });
  }, [filteredTeams, weekMatches, currentArcs, showAllArcs]);

  // Initialize Three.js scene
  const initScene = useCallback((container: HTMLDivElement) => {
    if (ctxRef.current) {
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
            const visColor = getVisibleColor(team.id, team.color);
            setTooltip({ name: team.name, stadium: team.stadium, color: visColor });
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
      const time = ctx.clock.getElapsedTime();

      // Animate particles along arcs
      particleDataRef.current.forEach(pd => {
        pd.t += pd.speed;
        if (pd.t >= 1) pd.t = 0;
        const idx = Math.floor(pd.t * (pd.points.length - 1));
        const nextIdx = Math.min(idx + 1, pd.points.length - 1);
        const frac = pd.t * (pd.points.length - 1) - idx;
        pd.mesh.position.lerpVectors(pd.points[idx], pd.points[nextIdx], frac);
      });

      // Subtle marble float
      ctx.markerGroup.children.forEach((group, i) => {
        const floatOffset = Math.sin(time * 0.8 + i * 0.4) * 0.015;
        group.children.forEach(child => {
          if (child instanceof THREE.Mesh && child.geometry.type === 'SphereGeometry' && child.position.y > 0.1) {
            child.position.y += floatOffset * 0.01;
          }
        });
      });

      // Pulse rings
      ctx.markerGroup.children.forEach(group => {
        group.children.forEach(child => {
          if (child instanceof THREE.Mesh && child.userData?.isPulse) {
            const scale = 1 + Math.sin(time * 1.2) * 0.15;
            child.scale.set(scale, scale, 1);
            (child.material as THREE.MeshBasicMaterial).opacity = 0.06 * (1 - Math.sin(time * 1.2) * 0.3);
          }
        });
      });

      // Dust drift
      const dustObj = ctx.scene.children.find(c => c instanceof THREE.Points) as THREE.Points | undefined;
      if (dustObj) {
        const pos = dustObj.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          pos.setY(i, pos.getY(i) + Math.sin(time * 0.15 + i * 0.1) * 0.001);
        }
        pos.needsUpdate = true;
      }

      ctx.composer.render();
    };
    animate();

    // Resize
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
      ctx.camera.position.set(5, 50, 55);
      ctx.controls.target.set(0, 0, 2);
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

        <div className="relative rounded-xl overflow-hidden" style={{ height: '560px' }}>
          <div ref={containerRef} className="w-full h-full" style={{ cursor: 'grab' }} />
          <TooltipOverlay info={tooltip} position={tooltipPos} />

          {/* HUD overlay */}
          <div className="absolute bottom-3 left-3 text-[9px] text-muted-foreground/30 font-mono space-y-0.5 pointer-events-none">
            <div>DRAG to orbit · SCROLL to zoom · RIGHT-CLICK to pan</div>
            <div>TILT by dragging vertically</div>
          </div>
        </div>

        {/* Minimal legend */}
        <div className="flex justify-center gap-6 mt-3 text-[10px] text-muted-foreground/50">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-[1.5px] rounded-full bg-[#3a4258]" />
            <span>Travel Route</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan/60 shadow-[0_0_3px_rgba(0,212,255,0.3)]" />
            <span>Away Team in Transit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{
              background: 'radial-gradient(ellipse at 30% 25%, rgba(255,255,255,0.4), #4488aa 50%, rgba(0,0,0,0.5))',
            }} />
            <span>Stadium</span>
          </div>
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
              <span className="text-cyan">Week {currentWeek}</span>
              <span>Week 34</span>
            </div>
          </div>
        </div>

        {/* Current week matches */}
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {weekMatches.slice(0, 10).map(m => {
            const home = getTeam(m.homeTeam);
            const away = getTeam(m.awayTeam);
            const dist = home && away ? calculateDistance(away.lat, away.lng, home.lat, home.lng) : 0;
            const awayColor = away ? getVisibleColor(away.id, away.color) : '#888';
            const homeColor = home ? getVisibleColor(home.id, home.color) : '#888';
            return (
              <div key={m.id} className="neu-concave rounded-lg p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: awayColor }} />
                  <span className="text-muted-foreground">{away?.short}</span>
                  <span className="text-cyan/60 mx-0.5">@</span>
                  <span>{home?.short}</span>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: homeColor }} />
                </div>
                <div className="text-[9px] text-muted-foreground font-mono mt-0.5">
                  {dist.toLocaleString()} mi · {m.homeGoals}-{m.awayGoals}
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
