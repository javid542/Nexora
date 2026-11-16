import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { WORLD_HOTSPOTS, WorldHotspot } from '../data/stonicData';
import { latLonToVector3 } from '../utils/stonicLogic';

interface WorldMonitorGlobeProps {
  selectedHotspotId: string;
  onSelectHotspot: (id: string) => void;
}

function detectSoftwareWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createNightEarthTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Deep ocean obsidian gradient
  ctx.fillStyle = '#070B14';
  ctx.fillRect(0, 0, 1024, 512);

  // Subtle latitude/longitude command grid
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.16)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 1024; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 0; y <= 512; y += 42.66) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  // Stylized landmass silhouettes + luminous city clusters
  const drawLandCluster = (cx: number, cy: number, rx: number, ry: number, dots: number) => {
    ctx.fillStyle = '#111B2E';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(96, 165, 250, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    for (let i = 0; i < dots; i++) {
      const a = (i * 2.39996) % (Math.PI * 2);
      const r = Math.sqrt((i + 0.5) / dots);
      const px = cx + Math.cos(a) * rx * 0.78 * r;
      const py = cy + Math.sin(a) * ry * 0.78 * r;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(147, 197, 253, 0.75)' : 'rgba(59, 130, 246, 0.45)';
      ctx.fillRect(px, py, 2.2, 2.2);
    }
  };

  // North America, South America, Europe, Africa, Asia, Australia
  drawLandCluster(235, 165, 92, 62, 55);
  drawLandCluster(310, 325, 52, 82, 35);
  drawLandCluster(525, 145, 58, 42, 48);
  drawLandCluster(545, 275, 68, 86, 42);
  drawLandCluster(735, 175, 135, 78, 80);
  drawLandCluster(835, 355, 55, 38, 26);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function WorldMonitorGlobe({
  selectedHotspotId,
  onSelectHotspot,
}: WorldMonitorGlobeProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const selectedRef = useRef(selectedHotspotId);
  const onSelectRef = useRef(onSelectHotspot);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    selectedRef.current = selectedHotspotId;
  }, [selectedHotspotId]);

  useEffect(() => {
    onSelectRef.current = onSelectHotspot;
  }, [onSelectHotspot]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 320);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.1, 5.4);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setContextLost(true);
      return;
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => setContextLost(false);
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    // 3-point lighting
    const hemi = new THREE.HemisphereLight(0x93c5fd, 0x05070b, 0.7);
    scene.add(hemi);
    const keyLight = new THREE.DirectionalLight(0xbfdbfe, 1.05);
    keyLight.position.set(6, 4, 5);
    scene.add(keyLight);

    const globeGroup = new THREE.Group();
    globeGroup.rotation.y = 1.95;
    scene.add(globeGroup);

    const GLOBE_RADIUS = 1.72;
    const earthTex = createNightEarthTexture();
    earthTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const earthGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 48, 36);
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTex,
      roughness: 0.82,
      metalness: 0.12,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    globeGroup.add(earthMesh);

    // Subtle wireframe latitude/longitude cage + orbital satellite track
    const cageGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.015, 24, 18);
    const cageMat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      wireframe: true,
      transparent: true,
      opacity: 0.14,
    });
    const cageMesh = new THREE.Mesh(cageGeo, cageMat);
    globeGroup.add(cageMesh);

    const satOrbitGeo = new THREE.TorusGeometry(GLOBE_RADIUS * 1.28, 0.008, 8, 96);
    const satOrbitMat = new THREE.MeshStandardMaterial({
      color: 0x60a5fa,
      roughness: 0.25,
      metalness: 0.85,
      transparent: true,
      opacity: 0.45,
    });
    const satOrbit = new THREE.Mesh(satOrbitGeo, satOrbitMat);
    satOrbit.rotation.x = Math.PI * 0.34;
    satOrbit.rotation.y = -Math.PI * 0.18;
    globeGroup.add(satOrbit);

    // Hotspot pins on globe surface
    const pinGeo = new THREE.SphereGeometry(0.055, 16, 16);
    const ringGeo = new THREE.RingGeometry(0.075, 0.105, 24);
    const clickablePins: THREE.Mesh[] = [];
    const pinEntries: Array<{
      hotspot: WorldHotspot;
      pin: THREE.Mesh;
      ring: THREE.Mesh;
    }> = [];

    WORLD_HOTSPOTS.forEach((hs) => {
      const pos = latLonToVector3(hs.lat, hs.lon, GLOBE_RADIUS + 0.03);
      const pinMat = new THREE.MeshBasicMaterial({
        color: hs.id === selectedRef.current ? 0xfbbf24 : 0x60a5fa,
      });
      const pin = new THREE.Mesh(pinGeo, pinMat);
      pin.position.set(pos.x, pos.y, pos.z);
      pin.userData.hotspotId = hs.id;
      pin.layers.set(1);

      const ringMat = new THREE.MeshBasicMaterial({
        color: hs.id === selectedRef.current ? 0xfbbf24 : 0x3b82f6,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(pos.x * 1.01, pos.y * 1.01, pos.z * 1.01);
      ring.lookAt(pos.x * 2, pos.y * 2, pos.z * 2);

      globeGroup.add(pin);
      globeGroup.add(ring);
      clickablePins.push(pin);
      pinEntries.push({ hotspot: hs, pin, ring });
    });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 3.5;
    controls.maxDistance = 7.2;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.autoRotate = !isSoftwareGl;
    controls.autoRotateSpeed = 0.6;

    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const mouse = new THREE.Vector2();

    let disposed = false;
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function syncPinColors() {
      pinEntries.forEach(({ hotspot, pin, ring }) => {
        const active = hotspot.id === selectedRef.current;
        (pin.material as THREE.MeshBasicMaterial).color.setHex(active ? 0xfbbf24 : 0x60a5fa);
        (ring.material as THREE.MeshBasicMaterial).color.setHex(active ? 0xfbbf24 : 0x3b82f6);
        pin.scale.setScalar(active ? 1.45 : 1);
        ring.scale.setScalar(active ? 1.35 : 1);
      });
    }

    function requestRender() {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;
        syncPinColors();
        controls.update();
        renderer.render(scene, camera);
        const done = () => {
          renderBusy = false;
          if (renderDirty) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    const handleControlChange = () => requestRender();
    controls.addEventListener('change', handleControlChange);

    const handleClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(clickablePins, false);
      if (hits.length > 0) {
        const id = hits[0].object.userData.hotspotId as string | undefined;
        if (id) {
          onSelectRef.current(id);
          requestRender();
        }
      }
    };
    renderer.domElement.addEventListener('click', handleClick);

    const handleResize = () => {
      if (!container) return;
      const w = Math.max(container.clientWidth, 320);
      const h = Math.max(container.clientHeight, 320);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };
    window.addEventListener('resize', handleResize);

    // Gentle auto-rotation on GPU; on-demand on software WebGL
    let autoTimer = 0;
    if (!isSoftwareGl) {
      const autoLoop = () => {
        if (disposed) return;
        requestRender();
        autoTimer = requestAnimationFrame(autoLoop);
      };
      autoLoop();
    } else {
      globeGroup.rotation.y = -0.7;
      requestRender();
    }

    // Watch prop updates via lightweight interval only for pin highlight sync
    const syncInterval = window.setInterval(() => {
      if (!disposed) requestRender();
    }, 350);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      cancelAnimationFrame(autoTimer);
      clearTimeout(frameId);
      clearInterval(syncInterval);
      controls.removeEventListener('change', handleControlChange);
      controls.dispose();
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      window.removeEventListener('resize', handleResize);

      earthGeo.dispose();
      earthMat.dispose();
      earthTex.dispose();
      cageGeo.dispose();
      cageMat.dispose();
      satOrbitGeo.dispose();
      satOrbitMat.dispose();
      pinGeo.dispose();
      ringGeo.dispose();
      pinEntries.forEach(({ pin, ring }) => {
        (pin.material as THREE.Material).dispose();
        (ring.material as THREE.Material).dispose();
      });
      envTex.dispose();
      renderer.dispose();

      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (contextLost) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-xl bg-[#0B101B] border border-white/10">
        <span className="text-xs font-mono text-slate-400">3D Globe Standby — Switch to 2D Command Map</span>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      data-testid="world-monitor-globe"
      className="relative w-full h-full cursor-grab active:cursor-grabbing"
      aria-label="Interactive 3D World Monitor Globe"
    />
  );
}
