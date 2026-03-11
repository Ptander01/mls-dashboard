/**
 * TravelMap — Cinematic 3D Travel Visualization
 * Design: Craig Taylor (Mapzilla) / Julian Anton inspired
 * Real Natural Earth GeoJSON polygons for accurate cartographic rendering.
 * Dense glass marble stadiums, muted metallic arcs, team-colored particles,
 * vertical light pillars, ground reflections, textured terrain.
 * Three.js WebGL with orbit controls, bloom, animated particles.
 */
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useFilters } from '@/contexts/FilterContext';
import { TEAMS, MATCHES, getTeam, calculateDistance } from '@/lib/mlsData';
import { GEO_DATA } from '@/lib/geoData';
import NeuCard from '@/components/NeuCard';
import AnimatedCounter from '@/components/AnimatedCounter';
import { ChartModal, MaximizeButton } from '@/components/ChartModal';
import { Play, Pause, SkipForward, SkipBack, MapPin, Plane, Route, RotateCcw } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import earcut from 'earcut';

// ─── Geo projection ───
const CENTER = { lat: 39.0, lng: -96.0 };
const SCALE = 2.2; // world units per degree

function project(lng: number, lat: number): [number, number] {
  const x = (lng - CENTER.lng) * Math.cos(CENTER.lat * Math.PI / 180) * SCALE;
  const z = -(lat - CENTER.lat) * SCALE;
  return [x, z];
}

// ─── Visibility-enhanced team colors ───
const VIS_COLORS: Record<string, string> = {
  'MTL': '#4488cc', 'CLB': '#ffc72c', 'DC': '#c8102e',
  'NE': '#4477bb', 'PHI': '#4488aa', 'POR': '#00aa44',
  'LAG': '#5588cc', 'VAN': '#5599dd',
};
function visColor(id: string, orig: string): string {
  return VIS_COLORS[id] || orig;
}

// ─── Triangulate a polygon ring (array of [lng,lat]) ───
function triangulatePoly(rings: number[][][]): { vertices: number[]; indices: number[] } {
  // earcut expects flat coords and hole indices
  const flatCoords: number[] = [];
  const holeIndices: number[] = [];
  let vertexCount = 0;

  rings.forEach((ring, i) => {
    if (i > 0) holeIndices.push(vertexCount);
    ring.forEach(([lng, lat]) => {
      const [x, z] = project(lng, lat);
      flatCoords.push(x, z);
      vertexCount++;
    });
  });

  const indices = earcut(flatCoords, holeIndices.length > 0 ? holeIndices : undefined, 2);
  return { vertices: flatCoords, indices };
}

// ─── Build a Three.js mesh from polygon rings ───
function buildPolygonMesh(
  rings: number[][][],
  color: THREE.Color,
  y: number,
  opacity: number
): THREE.Mesh | null {
  try {
    const { vertices, indices } = triangulatePoly(rings);
    if (indices.length === 0) return null;

    const geo = new THREE.BufferGeometry();
    // Convert 2D vertices to 3D (x, y, z)
    const positions = new Float32Array(vertices.length / 2 * 3);
    for (let i = 0; i < vertices.length / 2; i++) {
      positions[i * 3] = vertices[i * 2];
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = vertices[i * 2 + 1];
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setIndex(Array.from(indices));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity,
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    return new THREE.Mesh(geo, mat);
  } catch {
    return null;
  }
}

// ─── Build border line from ring ───
function buildBorderLine(ring: number[][], y: number, color: string, opacity: number, linewidth?: number): THREE.Line {
  const pts = ring.map(([lng, lat]) => {
    const [x, z] = project(lng, lat);
    return new THREE.Vector3(x, y, z);
  });
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
  });
  return new THREE.Line(geo, mat);
}

// ═══════════════════════════════════════════
// Scene context
// ═══════════════════════════════════════════
interface SceneCtx {
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

// ═══════════════════════════════════════════
// Create the full 3D scene
// ═══════════════════════════════════════════
function createScene(container: HTMLDivElement): SceneCtx {
  const w = container.clientWidth;
  const h = container.clientHeight;

  // ── Renderer ──
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.45;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // ── Scene ──
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#050a12');
  scene.fog = new THREE.FogExp2('#050a12', 0.0018);

  // ── Camera ──
  const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 800);
  camera.position.set(8, 80, 90);
  camera.lookAt(0, 0, 5);

  // ── Controls ──
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 15;
  controls.maxDistance = 180;
  controls.maxPolarAngle = Math.PI / 2.05;
  controls.minPolarAngle = 0.1;
  controls.target.set(0, 0, 5);
  controls.enablePan = true;
  controls.panSpeed = 0.4;
  controls.rotateSpeed = 0.4;

  // ══════════════════════════════════════════
  // OCEAN FLOOR — deep dark water
  // ══════════════════════════════════════════
  const oceanGeo = new THREE.PlaneGeometry(400, 300, 1, 1);
  const oceanMat = new THREE.MeshStandardMaterial({
    color: '#020508',
    roughness: 0.7,
    metalness: 0.2,
  });
  const ocean = new THREE.Mesh(oceanGeo, oceanMat);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = -0.2;
  ocean.receiveShadow = true;
  scene.add(ocean);

  // ══════════════════════════════════════════
  // LAND MASSES — Real GeoJSON polygons
  // ══════════════════════════════════════════
  const landGroup = new THREE.Group();
  scene.add(landGroup);

  const landColor = new THREE.Color('#111e2e');
  const landColorLight = new THREE.Color('#142030');

  // Helper to deeply clone readonly arrays to mutable
  const toMut = (ring: readonly (readonly number[])[]) => ring.map(pt => [...pt]) as number[][];

  // US States
  GEO_DATA.usStates.forEach((state) => {
    // Skip Alaska and Hawaii for continental map
    if (state.name === 'Alaska') return;

    state.rings.forEach((ring) => {
      const r = toMut(ring);
      const mesh = buildPolygonMesh([r], landColor, 0.02, 0.95);
      if (mesh) landGroup.add(mesh);

      // State border line
      const line = buildBorderLine(r, 0.025, '#2a4060', 0.55);
      landGroup.add(line);
    });
  });

  // Canadian Provinces
  GEO_DATA.caProvinces.forEach((prov) => {
    prov.rings.forEach((ring) => {
      const r = toMut(ring);
      const mesh = buildPolygonMesh([r], landColorLight, 0.01, 0.85);
      if (mesh) landGroup.add(mesh);

      const line = buildBorderLine(r, 0.025, '#1a2a42', 0.35);
      landGroup.add(line);
    });
  });

  // Mexico
  GEO_DATA.mexicoRings.forEach((ring) => {
    const r = toMut(ring);
    const mesh = buildPolygonMesh([r], landColor, 0.01, 0.75);
    if (mesh) landGroup.add(mesh);

    const line = buildBorderLine(r, 0.02, '#152238', 0.25);
    landGroup.add(line);
  });

  // ── Coastline highlight — subtle bright edge around US states ──
  GEO_DATA.usStates.forEach((state) => {
    if (state.name === 'Alaska') return;
    // Only draw the first (outer) ring as coastline
    const ring = toMut(state.rings[0]);
    const pts = ring.map(([lng, lat]) => {
      const [x, z] = project(lng, lat);
      return new THREE.Vector3(x, 0.035, z);
    });
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: '#2a5080',
      transparent: true,
      opacity: 0.2,
    });
    landGroup.add(new THREE.Line(geo, mat));
  });

  // Great Lakes — water cutouts rendered above land
  const lakeColor = new THREE.Color('#030610');
  GEO_DATA.greatLakes.forEach((lake) => {
    lake.rings.forEach((ring) => {
      const r = toMut(ring);
      const mesh = buildPolygonMesh([r], lakeColor, 0.03, 0.98);
      if (mesh) landGroup.add(mesh);

      // Lake border — subtle blue glow edge
      const line = buildBorderLine(r, 0.04, '#2a4870', 0.6);
      landGroup.add(line);
    });
  });

  // ══════════════════════════════════════════
  // TERRAIN TEXTURE — Canvas overlay for noise/detail
  // ══════════════════════════════════════════
  const texCanvas = document.createElement('canvas');
  texCanvas.width = 2048;
  texCanvas.height = 1400;
  const tctx = texCanvas.getContext('2d')!;

  // Transparent base
  tctx.clearRect(0, 0, 2048, 1400);

  const bbox = GEO_DATA.bbox;
  const toUV = (lng: number, lat: number): [number, number] => {
    const u = ((lng - bbox[0]) / (bbox[2] - bbox[0])) * 2048;
    const v = ((bbox[3] - lat) / (bbox[3] - bbox[1])) * 1400;
    return [u, v];
  };

  // Terrain noise dots — more visible
  for (let i = 0; i < 60000; i++) {
    const u = Math.random() * 2048;
    const v = Math.random() * 1400;
    const brightness = 14 + Math.random() * 20;
    const g = brightness + Math.random() * 6;
    const b = brightness + Math.random() * 12;
    tctx.fillStyle = `rgba(${brightness}, ${g}, ${b}, ${Math.random() * 0.12 + 0.02})`;
    tctx.fillRect(u, v, Math.random() * 2.5 + 0.5, Math.random() * 2.5 + 0.5);
  }

  // City light clusters — warm glow at metro areas
  const metros: [number, number, number][] = [
    [-73.9, 40.7, 1.8], [-87.6, 41.9, 1.5], [-118.2, 34.0, 1.6], [-95.4, 29.8, 1.2],
    [-122.3, 47.6, 1.1], [-80.2, 25.8, 1.2], [-84.4, 33.8, 1.3], [-97.7, 30.3, 0.9],
    [-104.9, 39.7, 1.0], [-93.3, 45.0, 0.8], [-90.2, 38.6, 0.8], [-86.8, 36.2, 0.7],
    [-75.2, 40.0, 1.1], [-83.0, 39.9, 0.7], [-81.4, 28.5, 0.9], [-79.4, 43.7, 0.8],
    [-123.1, 49.3, 0.7], [-73.6, 45.5, 0.7], [-80.8, 35.2, 0.7], [-94.8, 39.1, 0.7],
    [-71.1, 42.4, 0.9], [-76.6, 39.3, 0.8], [-112.0, 33.4, 0.8], [-96.8, 32.8, 1.0],
    [-105.0, 40.0, 0.6], [-111.9, 40.8, 0.6], [-121.5, 38.6, 0.5], [-82.5, 27.9, 0.6],
  ];
  metros.forEach(([lng, lat, intensity]) => {
    const [cx, cy] = toUV(lng, lat);
    const r = 25 * intensity;
    const grad = tctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, `rgba(255, 210, 130, ${0.10 * intensity})`);
    grad.addColorStop(0.4, `rgba(220, 180, 110, ${0.04 * intensity})`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    tctx.fillStyle = grad;
    tctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  });

  // Subtle grid overlay
  tctx.strokeStyle = 'rgba(25, 45, 75, 0.08)';
  tctx.lineWidth = 0.5;
  for (let lng = -130; lng <= -60; lng += 5) {
    const [u1, v1] = toUV(lng, 55);
    const [u2, v2] = toUV(lng, 24);
    tctx.beginPath();
    tctx.moveTo(u1, v1);
    tctx.lineTo(u2, v2);
    tctx.stroke();
  }
  for (let lat = 25; lat <= 55; lat += 5) {
    const [u1, v1] = toUV(-135, lat);
    const [u2, v2] = toUV(-60, lat);
    tctx.beginPath();
    tctx.moveTo(u1, v1);
    tctx.lineTo(u2, v2);
    tctx.stroke();
  }

  const texTex = new THREE.CanvasTexture(texCanvas);
  texTex.minFilter = THREE.LinearFilter;
  texTex.magFilter = THREE.LinearFilter;

  // Map the texture plane to cover the geographic area
  const [texMinX, texMinZ] = project(bbox[0], bbox[3]);
  const [texMaxX, texMaxZ] = project(bbox[2], bbox[1]);
  const texW = texMaxX - texMinX;
  const texH = texMaxZ - texMinZ;
  const texPlaneGeo = new THREE.PlaneGeometry(texW, texH, 1, 1);
  const texPlaneMat = new THREE.MeshBasicMaterial({
    map: texTex,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  });
  const texPlane = new THREE.Mesh(texPlaneGeo, texPlaneMat);
  texPlane.rotation.x = -Math.PI / 2;
  texPlane.position.set((texMinX + texMaxX) / 2, 0.05, (texMinZ + texMaxZ) / 2);
  scene.add(texPlane);

  // ══════════════════════════════════════════
  // ATMOSPHERIC DUST
  // ══════════════════════════════════════════
  const dustCount = 150;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 200;
    dustPos[i * 3 + 1] = Math.random() * 20 + 2;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 140;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    color: '#1a2540',
    size: 0.06,
    transparent: true,
    opacity: 0.15,
  });
  const dustPts = new THREE.Points(dustGeo, dustMat);
  dustPts.userData.isDust = true;
  scene.add(dustPts);

  // ══════════════════════════════════════════
  // LIGHTING — Cinematic three-point + subtle rim
  // ══════════════════════════════════════════
  // Ambient — slightly brighter for land visibility
  scene.add(new THREE.AmbientLight('#101828', 0.65));

  // Key light — cool blue from upper-left
  const keyLight = new THREE.DirectionalLight('#2a55bb', 1.0);
  keyLight.position.set(-40, 70, 40);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  scene.add(keyLight);

  // Fill light — warm from right for color contrast
  const fillLight = new THREE.DirectionalLight('#443322', 0.4);
  fillLight.position.set(50, 30, -25);
  scene.add(fillLight);

  // Rim light — back edge definition
  const rimLight = new THREE.DirectionalLight('#1a2244', 0.55);
  rimLight.position.set(0, 20, -60);
  scene.add(rimLight);

  // Top down light — for ground illumination
  const topLight = new THREE.DirectionalLight('#182440', 0.45);
  topLight.position.set(0, 90, 0);
  scene.add(topLight);

  // Subtle hemisphere light for overall fill
  const hemiLight = new THREE.HemisphereLight('#1a2a44', '#060a14', 0.3);
  scene.add(hemiLight);

  // ── Groups ──
  const markerGroup = new THREE.Group();
  const arcGroup = new THREE.Group();
  const particleGroup = new THREE.Group();
  const labelGroup = new THREE.Group();
  scene.add(markerGroup, arcGroup, particleGroup, labelGroup);

  // ── Post-processing — bloom ──
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(w, h),
    0.65,  // strength — slightly stronger for dramatic glow
    0.4,   // radius
    0.2    // threshold — lower to catch more light sources
  );
  composer.addPass(bloomPass);

  return {
    renderer, scene, camera, controls, composer,
    markerGroup, arcGroup, particleGroup, labelGroup,
    clock: new THREE.Clock(), animId: 0, disposed: false,
  };
}

// ═══════════════════════════════════════════
// GLASS MARBLE SPHERE — Dense jewel-like orb
// with vertical light pillar and ground reflection
// ═══════════════════════════════════════════
function createMarble(
  teamId: string, color: string, size: number,
  isActive: boolean, isAway: boolean, pos: [number, number]
): THREE.Group {
  const group = new THREE.Group();
  const [x, z] = pos;
  const yBase = size + 0.08;
  const vc = visColor(teamId, color);
  const col = new THREE.Color(vc);

  // ── Main glass sphere ──
  const sGeo = new THREE.SphereGeometry(size, 48, 48);
  const sMat = new THREE.MeshPhysicalMaterial({
    color: col.clone().multiplyScalar(0.65),
    roughness: 0.02,
    metalness: 0.0,
    transmission: 0.45,
    thickness: size * 4,
    ior: 2.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.01,
    specularIntensity: 3.0,
    specularColor: new THREE.Color('#ffffff'),
    emissive: col.clone(),
    emissiveIntensity: isActive ? 0.7 : isAway ? 0.4 : 0.15,
    envMapIntensity: 1.5,
    transparent: true,
    opacity: 0.95,
    attenuationColor: col.clone(),
    attenuationDistance: size * 2,
    side: THREE.FrontSide,
  });
  const sphere = new THREE.Mesh(sGeo, sMat);
  sphere.position.set(x, yBase, z);
  sphere.castShadow = true;
  group.add(sphere);

  // ── Inner core — bright center ──
  const cGeo = new THREE.SphereGeometry(size * 0.35, 16, 16);
  const cMat = new THREE.MeshBasicMaterial({
    color: col.clone().lerp(new THREE.Color('#ffffff'), 0.6),
    transparent: true,
    opacity: isActive ? 0.7 : isAway ? 0.4 : 0.2,
  });
  const core = new THREE.Mesh(cGeo, cMat);
  core.position.set(x, yBase, z);
  group.add(core);

  // ── Specular highlight ──
  const spGeo = new THREE.SphereGeometry(size * 0.12, 10, 10);
  const spMat = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.55,
  });
  const spec = new THREE.Mesh(spGeo, spMat);
  spec.position.set(x - size * 0.22, yBase + size * 0.28, z - size * 0.18);
  group.add(spec);

  // ── Tight rim glow ──
  const rimGeo = new THREE.SphereGeometry(size * 1.1, 24, 24);
  const rimMat = new THREE.MeshBasicMaterial({
    color: col.clone().lerp(new THREE.Color('#ffffff'), 0.15),
    transparent: true,
    opacity: isActive ? 0.07 : 0.025,
    side: THREE.BackSide,
  });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.position.set(x, yBase, z);
  group.add(rim);

  // ── Ground reflection pool ──
  const poolGeo = new THREE.CircleGeometry(size * (isActive ? 2.0 : 1.2), 32);
  const poolMat = new THREE.MeshBasicMaterial({
    color: col,
    transparent: true,
    opacity: isActive ? 0.15 : 0.05,
    side: THREE.DoubleSide,
  });
  const pool = new THREE.Mesh(poolGeo, poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(x, 0.03, z);
  group.add(pool);

  // ── Active stadium extras ──
  if (isActive) {
    // Vertical light pillar — bright tapered beam
    const pillarGeo = new THREE.CylinderGeometry(0.015, size * 0.22, 14, 8);
    const pillarMat = new THREE.MeshBasicMaterial({
      color: col.clone().lerp(new THREE.Color('#ffffff'), 0.4),
      transparent: true,
      opacity: 0.07,
    });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(x, 7.5, z);
    group.add(pillar);

    // Second wider, fainter pillar for volume
    const pillar2Geo = new THREE.CylinderGeometry(0.03, size * 0.45, 12, 8);
    const pillar2Mat = new THREE.MeshBasicMaterial({
      color: col,
      transparent: true,
      opacity: 0.025,
    });
    const pillar2 = new THREE.Mesh(pillar2Geo, pillar2Mat);
    pillar2.position.set(x, 6.5, z);
    group.add(pillar2);

    // Third ultra-wide atmospheric haze pillar
    const pillar3Geo = new THREE.CylinderGeometry(0.05, size * 0.7, 8, 8);
    const pillar3Mat = new THREE.MeshBasicMaterial({
      color: col.clone().multiplyScalar(0.5),
      transparent: true,
      opacity: 0.012,
    });
    const pillar3 = new THREE.Mesh(pillar3Geo, pillar3Mat);
    pillar3.position.set(x, 4.5, z);
    group.add(pillar3);

    // Pulse ring
    const pulseGeo = new THREE.RingGeometry(size * 1.4, size * 1.6, 48);
    const pulseMat = new THREE.MeshBasicMaterial({
      color: col,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
    });
    const pulse = new THREE.Mesh(pulseGeo, pulseMat);
    pulse.rotation.x = -Math.PI / 2;
    pulse.position.set(x, 0.04, z);
    pulse.userData.isPulse = true;
    group.add(pulse);

    // Point light — brighter for visible ground illumination
    const pLight = new THREE.PointLight(col, 1.0, size * 8);
    pLight.position.set(x, yBase + size * 0.5, z);
    group.add(pLight);
  }

  // Away marker extras — subtle
  if (isAway && !isActive) {
    const awayPulse = new THREE.RingGeometry(size * 1.1, size * 1.25, 32);
    const awayPulseMat = new THREE.MeshBasicMaterial({
      color: col,
      transparent: true,
      opacity: 0.04,
      side: THREE.DoubleSide,
    });
    const awayRing = new THREE.Mesh(awayPulse, awayPulseMat);
    awayRing.rotation.x = -Math.PI / 2;
    awayRing.position.set(x, 0.03, z);
    group.add(awayRing);
  }

  return group;
}

// ─── Create label sprite ───
function createLabel(
  text: string, pos: [number, number], teamId: string,
  color: string, isActive: boolean
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = 512;
  canvas.height = 128;
  ctx.clearRect(0, 0, 512, 128);

  const vc = visColor(teamId, color);
  const fs = isActive ? 24 : 16;
  ctx.font = `${isActive ? 'bold ' : ''}${fs}px "Space Grotesk", Arial, sans-serif`;
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
  ctx.shadowColor = isActive ? vc : '#000000';
  ctx.fillStyle = isActive ? '#d8dce8' : '#3a4060';
  ctx.fillText(text, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.position.set(pos[0], isActive ? 3.2 : 1.6, pos[1]);
  sprite.scale.set(6, 1.5, 1);
  return sprite;
}

// ─── Create muted metallic arc ───
function createArc(
  from: [number, number], to: [number, number],
  distance: number, isAllView: boolean
): { tube: THREE.Mesh; points: THREE.Vector3[] } {
  const height = Math.min(distance / 100, 10) * (isAllView ? 0.25 : 1);
  const midX = (from[0] + to[0]) / 2;
  const midZ = (from[1] + to[1]) / 2;

  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(from[0], 0.2, from[1]),
    new THREE.Vector3(midX, height, midZ),
    new THREE.Vector3(to[0], 0.2, to[1])
  );

  const points = curve.getPoints(60);

  const tubeGeo = new THREE.TubeGeometry(curve, 40, isAllView ? 0.015 : 0.04, 6, false);
  const tubeMat = new THREE.MeshPhysicalMaterial({
    color: '#4a5878',
    roughness: 0.25,
    metalness: 0.85,
    clearcoat: 0.4,
    clearcoatRoughness: 0.15,
    transparent: true,
    opacity: isAllView ? 0.12 : 0.55,
    emissive: '#2a3858',
    emissiveIntensity: 0.08,
  });

  return { tube: new THREE.Mesh(tubeGeo, tubeMat), points };
}

// ─── Animated particle ───
function createParticle(teamId: string, color: string): THREE.Group {
  const group = new THREE.Group();
  const vc = visColor(teamId, color);
  const col = new THREE.Color(vc);

  // Core dot — brighter
  const geo = new THREE.SphereGeometry(0.15, 8, 8);
  const mat = new THREE.MeshBasicMaterial({
    color: col.clone().lerp(new THREE.Color('#ffffff'), 0.5),
    transparent: true,
    opacity: 0.95,
  });
  group.add(new THREE.Mesh(geo, mat));

  // Glow — wider and brighter
  const gGeo = new THREE.SphereGeometry(0.35, 8, 8);
  const gMat = new THREE.MeshBasicMaterial({
    color: col,
    transparent: true,
    opacity: 0.35,
    side: THREE.BackSide,
  });
  group.add(new THREE.Mesh(gGeo, gMat));

  return group;
}

// ─── Tooltip ───
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
      <div className="glass-sm p-3 min-w-[200px]" style={{ borderLeft: `3px solid ${info.color}` }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full" style={{
            background: `radial-gradient(ellipse at 30% 25%, rgba(255,255,255,0.5), ${info.color} 40%, rgba(0,0,0,0.5))`,
            boxShadow: `0 0 6px ${info.color}66`,
          }} />
          <span className="text-xs font-bold text-foreground" style={{ fontFamily: 'Space Grotesk' }}>{info.name}</span>
        </div>
        <div className="text-[10px] text-muted-foreground font-mono">{info.stadium}</div>
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
  const ctxRef = useRef<SceneCtx | null>(null);
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

  // Playback
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentWeek(prev => {
          if (prev >= 33) { setIsPlaying(false); return 33; }
          return prev + 1;
        });
      }, 1500);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying]);

  // Dispose helper
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

  // Update overlays
  const updateOverlays = useCallback((ctx: SceneCtx) => {
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

    // Stadium markers
    filteredTeams.forEach(team => {
      const isActive = weekMatches.some(m => m.homeTeam === team.id);
      const isAway = weekMatches.some(m => m.awayTeam === team.id);
      const pos = project(team.lng, team.lat);
      const size = isActive ? 0.55 : isAway ? 0.38 : 0.24;
      const marble = createMarble(team.id, team.color, size, isActive, isAway, pos);
      marble.userData = { teamId: team.id };
      ctx.markerGroup.add(marble);

      const label = createLabel(team.short, pos, team.id, team.color, isActive);
      ctx.labelGroup.add(label);
    });

    // Travel arcs
    currentArcs.forEach(arc => {
      const from = project(arc.away.lng, arc.away.lat);
      const to = project(arc.home.lng, arc.home.lat);
      const { tube, points } = createArc(from, to, arc.distance, showAllArcs);
      ctx.arcGroup.add(tube);

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

  // Initialize scene
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
            const vc = visColor(team.id, team.color);
            setTooltip({ name: team.name, stadium: team.stadium, color: vc });
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

      // Particles along arcs
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
        const offset = Math.sin(time * 0.8 + i * 0.4) * 0.015;
        group.children.forEach(child => {
          if (child instanceof THREE.Mesh && child.geometry.type === 'SphereGeometry' && child.position.y > 0.1) {
            child.position.y += offset * 0.01;
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
      const dustObj = ctx.scene.children.find(c => c instanceof THREE.Points && (c as THREE.Points).userData?.isDust) as THREE.Points | undefined;
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
      ctx.camera.position.set(8, 80, 90);
      ctx.controls.target.set(0, 0, 5);
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

          <div className="absolute bottom-3 left-3 text-[9px] text-muted-foreground/30 font-mono space-y-0.5 pointer-events-none">
            <div>DRAG to orbit · SCROLL to zoom · RIGHT-CLICK to pan</div>
            <div>TILT by dragging vertically</div>
          </div>
        </div>

        {/* Legend */}
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
              onClick={() => { setCurrentWeek(Math.min(33, currentWeek + 1)); setIsPlaying(false); }}
              className="neu-raised p-1.5 rounded-lg hover:text-cyan transition-colors"
            >
              <SkipForward size={14} />
            </button>
          </div>

          <div className="flex-1">
            <input
              type="range" min={1} max={33} value={currentWeek}
              onChange={e => { setCurrentWeek(+e.target.value); setIsPlaying(false); }}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-1">
              <span>Week 1</span>
              <span className="text-cyan">Week {currentWeek}</span>
              <span>Week 33</span>
            </div>
          </div>
        </div>

        {/* Current week matches */}
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {weekMatches.slice(0, 10).map(m => {
            const home = getTeam(m.homeTeam);
            const away = getTeam(m.awayTeam);
            const dist = home && away ? calculateDistance(away.lat, away.lng, home.lat, home.lng) : 0;
            const awayC = away ? visColor(away.id, away.color) : '#888';
            const homeC = home ? visColor(home.id, home.color) : '#888';
            return (
              <div key={m.id} className="neu-concave rounded-lg p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: awayC }} />
                  <span className="text-muted-foreground">{away?.short}</span>
                  <span className="text-cyan/60 mx-0.5">@</span>
                  <span>{home?.short}</span>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: homeC }} />
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
