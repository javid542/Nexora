import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { AvatarForm, CORE_MOODS, CoreMood } from '../data/stonicData';

interface ParticleAvatarCanvasProps {
  form: AvatarForm;
  mood?: CoreMood;
  activeEnergy?: number; // 0..1 when AI is thinking or speaking
  interactive?: boolean;
  className?: string;
  showStarfield?: boolean;
}

const PARTICLE_COUNT = 2800;
const STAR_COUNT = 900;

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

function createSoftParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.28, 'rgba(191, 219, 254, 0.85)');
  grad.addColorStop(0.65, 'rgba(59, 130, 246, 0.28)');
  grad.addColorStop(1, 'rgba(59, 130, 246, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildTargetPositions(count: number) {
  const core = new Float32Array(count * 3);
  const female = new Float32Array(count * 3);
  const male = new Float32Array(count * 3);

  // Deterministic pseudo-random generator for clean reproducible particle forms
  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < count; i++) {
    const idx = i * 3;
    const t = i / count;

    // 1. CORE: Luminous neural sphere with subtle spiral bands
    const phi = Math.acos(1 - 2 * t);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const shellNoise = 0.82 + 0.34 * rand();
    const rCore = 1.45 * shellNoise;
    core[idx] = rCore * Math.sin(phi) * Math.cos(theta);
    core[idx + 1] = rCore * Math.cos(phi);
    core[idx + 2] = rCore * Math.sin(phi) * Math.sin(theta);

    // 2. FEMALE: Sculpted holographic bust (graceful crown, cheekbones, neck, contoured shoulders)
    const u = rand();
    const ang = rand() * Math.PI * 2;
    let fx = 0;
    let fy = 0;
    let fz = 0;
    if (u < 0.44) {
      // Head + flowing hair aura
      const headPhi = Math.acos(1 - 2 * rand());
      const rx = 0.52;
      const ry = 0.66;
      const rz = 0.56;
      const layer = rand() < 0.32 ? 1.18 : 0.96;
      fx = rx * layer * Math.sin(headPhi) * Math.cos(ang);
      fy = 0.68 + ry * layer * Math.cos(headPhi);
      fz = rz * layer * Math.sin(headPhi) * Math.sin(ang);
      // Taper chin slightly
      if (fy < 0.45) {
        fx *= 0.84;
        fz *= 0.88;
      }
    } else if (u < 0.56) {
      // Slender neck
      const nh = rand();
      const nr = 0.22 + (1 - nh) * 0.08;
      fx = nr * Math.cos(ang);
      fy = -0.08 + nh * 0.32;
      fz = nr * Math.sin(ang);
    } else if (u < 0.88) {
      // Shoulders & upper torso
      const ty = rand(); // 0 bottom .. 1 top
      const width = 0.56 + Math.sin(ty * Math.PI * 0.85) * 0.55;
      const depth = 0.28 + Math.sin(ty * Math.PI) * 0.14;
      fx = width * Math.cos(ang) * (0.85 + 0.15 * rand());
      fy = -1.25 + ty * 1.18;
      fz = depth * Math.sin(ang);
    } else {
      // Orbital halo ring around avatar
      const hr = 1.65 + (rand() - 0.5) * 0.12;
      fx = hr * Math.cos(ang);
      fy = -0.3 + Math.sin(ang * 2) * 0.18;
      fz = hr * Math.sin(ang) * 0.55;
    }
    female[idx] = fx;
    female[idx + 1] = fy;
    female[idx + 2] = fz;

    // 3. MALE: Structured angular JARVIS bust (defined brow/jaw, broad shoulders, tactical chest arc)
    const mu = rand();
    const mang = rand() * Math.PI * 2;
    let mx = 0;
    let my = 0;
    let mz = 0;
    if (mu < 0.40) {
      const headPhi = Math.acos(1 - 2 * rand());
      const rx = 0.56;
      const ry = 0.68;
      const rz = 0.60;
      mx = rx * Math.sin(headPhi) * Math.cos(mang);
      my = 0.72 + ry * Math.cos(headPhi);
      mz = rz * Math.sin(headPhi) * Math.sin(mang);
      // Squared jawline
      if (my < 0.46) {
        mx *= 0.94;
        mz = Math.sign(mz) * Math.min(Math.abs(mz), 0.46);
      }
    } else if (mu < 0.52) {
      // Neck
      const nh = rand();
      const nr = 0.28 + (1 - nh) * 0.09;
      mx = nr * Math.cos(mang);
      my = -0.05 + nh * 0.30;
      mz = nr * Math.sin(mang);
    } else if (mu < 0.90) {
      // Broad shoulders & tapered torso
      const ty = rand();
      const width = 0.66 + Math.pow(ty, 0.7) * 0.76;
      const depth = 0.34 + ty * 0.14;
      mx = width * Math.cos(mang) * (0.86 + 0.14 * rand());
      my = -1.32 + ty * 1.28;
      mz = depth * Math.sin(mang);
    } else {
      // Dual chest / shoulder telemetry ring
      const hr = 1.75 + (rand() - 0.5) * 0.1;
      mx = hr * Math.cos(mang);
      my = -0.25 + Math.cos(mang) * 0.22;
      mz = hr * Math.sin(mang) * 0.52;
    }
    male[idx] = mx;
    male[idx + 1] = my;
    male[idx + 2] = mz;
  }

  return { core, female, male };
}

export function ParticleAvatarCanvas({
  form,
  mood = 'standby',
  activeEnergy = 0,
  interactive = true,
  className = '',
  showStarfield = true,
}: ParticleAvatarCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<AvatarForm>(form);
  const moodRef = useRef<CoreMood>(mood);
  const energyRef = useRef<number>(activeEnergy);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    moodRef.current = mood;
  }, [mood]);

  useEffect(() => {
    energyRef.current = activeEnergy;
  }, [activeEnergy]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 320);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.1, 5.2);

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

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const targets = buildTargetPositions(PARTICLE_COUNT);
    const currentPositions = new Float32Array(targets[formRef.current]);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    const cPrimary = new THREE.Color('#60A5FA');
    const cHighlight = new THREE.Color('#E0F2FE');
    const cDeep = new THREE.Color('#2563EB');

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const mix = (i % 17) / 16;
      const col = mix > 0.72 ? cHighlight : mix > 0.32 ? cPrimary : cDeep;
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    const avatarGeo = new THREE.BufferGeometry();
    avatarGeo.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3));
    avatarGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleTex = createSoftParticleTexture();
    const avatarMat = new THREE.PointsMaterial({
      size: 0.085,
      map: particleTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const avatarPoints = new THREE.Points(avatarGeo, avatarMat);
    const avatarGroup = new THREE.Group();
    avatarGroup.add(avatarPoints);

    // Subtle orbital wireframe rings around the core
    const ringGeo = new THREE.TorusGeometry(1.95, 0.006, 8, 96);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.22,
    });
    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.rotation.x = Math.PI * 0.42;
    ring1.rotation.y = Math.PI * 0.14;
    avatarGroup.add(ring1);

    const ring2 = new THREE.Mesh(ringGeo, ringMat.clone());
    ring2.scale.setScalar(1.14);
    ring2.rotation.x = -Math.PI * 0.36;
    ring2.rotation.z = Math.PI * 0.2;
    avatarGroup.add(ring2);

    scene.add(avatarGroup);

    // Starfield background
    let starPoints: THREE.Points | null = null;
    let starGeo: THREE.BufferGeometry | null = null;
    let starMat: THREE.PointsMaterial | null = null;
    if (showStarfield) {
      const starPositions = new Float32Array(STAR_COUNT * 3);
      for (let i = 0; i < STAR_COUNT; i++) {
        starPositions[i * 3] = (Math.random() - 0.5) * 32;
        starPositions[i * 3 + 1] = (Math.random() - 0.5) * 20;
        starPositions[i * 3 + 2] = -4 - Math.random() * 18;
      }
      starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      starMat = new THREE.PointsMaterial({
        size: 0.045,
        color: 0x93c5fd,
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
      });
      starPoints = new THREE.Points(starGeo, starMat);
      scene.add(starPoints);
    }

    // Pointer parallax state
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const handlePointerMove = (e: PointerEvent) => {
      if (!interactive) return;
      const rect = container.getBoundingClientRect();
      pointer.targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    const handleResize = () => {
      if (!container) return;
      const w = Math.max(container.clientWidth, 320);
      const h = Math.max(container.clientHeight, 320);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let elapsed = 0;

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

    const colorMoodStandby = new THREE.Color('#60A5FA');
    const colorMoodFocus = new THREE.Color('#F59E0B');
    const colorMoodBriefing = new THREE.Color('#BAE6FD');
    const colorMoodNight = new THREE.Color('#818CF8');
    const activeColor = new THREE.Color('#60A5FA');

    function tick() {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      elapsed += dt;

      const activeTarget = targets[formRef.current];
      const currentMoodCfg = CORE_MOODS.find((m) => m.id === moodRef.current) || CORE_MOODS[0];
      const posAttr = avatarGeo.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const energy = energyRef.current;

      const morphSpeed = reducedMotion ? 1 : 1 - Math.exp(-5.5 * dt);
      const pulseAmp = reducedMotion ? 0 : currentMoodCfg.pulseAmplitude + energy * 0.085;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const ix = i * 3;
        const tx = activeTarget[ix];
        const ty = activeTarget[ix + 1];
        const tz = activeTarget[ix + 2];

        const wave = Math.sin(elapsed * (2.0 * currentMoodCfg.ringSpeedMultiplier) + i * 0.03) * pulseAmp;
        const targetX = tx * (1 + wave);
        const targetY = ty * (1 + wave * 0.7);
        const targetZ = tz * (1 + wave);

        arr[ix] += (targetX - arr[ix]) * morphSpeed;
        arr[ix + 1] += (targetY - arr[ix + 1]) * morphSpeed;
        arr[ix + 2] += (targetZ - arr[ix + 2]) * morphSpeed;
      }
      posAttr.needsUpdate = true;

      const targetTint =
        moodRef.current === 'focus'
          ? colorMoodFocus
          : moodRef.current === 'briefing'
            ? colorMoodBriefing
            : moodRef.current === 'night'
              ? colorMoodNight
              : colorMoodStandby;
      activeColor.lerp(targetTint, morphSpeed);
      avatarMat.color.copy(activeColor);
      ringMat.color.copy(activeColor);
      (ring2.material as THREE.MeshBasicMaterial).color.copy(activeColor);
      avatarMat.size = (moodRef.current === 'night' ? 0.074 : 0.082) + energy * 0.026;

      if (!reducedMotion) {
        pointer.x = THREE.MathUtils.damp(pointer.x, pointer.targetX, 4, dt);
        pointer.y = THREE.MathUtils.damp(pointer.y, pointer.targetY, 4, dt);
        const rotRate = 0.22 * currentMoodCfg.ringSpeedMultiplier;
        avatarGroup.rotation.y = elapsed * rotRate + pointer.x * 0.35;
        avatarGroup.rotation.x = pointer.y * 0.16;
        ring1.rotation.z += dt * (0.28 * currentMoodCfg.ringSpeedMultiplier + energy * 0.6);
        ring2.rotation.y -= dt * (0.22 * currentMoodCfg.ringSpeedMultiplier + energy * 0.45);
        if (starPoints) {
          starPoints.rotation.y = elapsed * 0.015;
        }
      }

      renderer.render(scene, camera);

      if (reducedMotion) return;
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      avatarGeo.dispose();
      avatarMat.dispose();
      particleTex.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      (ring2.material as THREE.Material).dispose();
      starGeo?.dispose();
      starMat?.dispose();
      renderer.dispose();

      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [interactive, showStarfield]);

  if (contextLost) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-blue-500/10 border border-blue-400/20 ${className}`}
      >
        <span className="text-xs font-mono text-blue-300">Core Visual Standby</span>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      data-testid="particle-avatar-canvas"
      data-form={form}
      data-mood={mood}
      className={`relative w-full h-full ${className}`}
      aria-label={`Interactive 3D ${form} particle character in ${mood} mode`}
    />
  );
}
