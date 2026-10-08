import { useEffect, useRef } from "react";
import type { AudioEngine } from "./audio-engine";
import type { SoundscapeId, Pathway, AudioReactivity } from "../lib/settings";
import type { MotionPreference, ExperienceMode } from "../lib/settings";
import type { CycleShape } from "../lib/regulation-clock";
import { getBreathPhase, getShapedBreathPhase } from "../lib/regulation-clock";
import { getTimeOfDayShift } from "./time-palette";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hue: number;
  alpha: number;
  life: number;
  maxLife: number;
}

interface FlowField {
  cols: number;
  rows: number;
  resolution: number;
  field: number[];
}

type QualityTier = "high" | "medium" | "low";

const SOUNDSCAPE_PALETTES: Record<
  SoundscapeId,
  { hueRange: [number, number]; saturation: number; brightness: number }
> = {
  calm: { hueRange: [30, 50], saturation: 42, brightness: 58 },
  ground: { hueRange: [15, 40], saturation: 35, brightness: 48 },
  drift: { hueRange: [25, 55], saturation: 32, brightness: 52 },
};


const DAMPING_BASE = 0.92;
const FORCE_STRENGTH = 4.2;
const MAX_DELTA = 0.1;

function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768 || navigator.hardwareConcurrency <= 4;
}

function createParticle(
  width: number,
  height: number,
  palette: (typeof SOUNDSCAPE_PALETTES)[SoundscapeId],
): Particle {
  const hue =
    palette.hueRange[0] +
    Math.random() * (palette.hueRange[1] - palette.hueRange[0]);
  const gx = (Math.random() + Math.random() + Math.random()) / 3;
  const gy = (Math.random() + Math.random() + Math.random()) / 3;
  return {
    x: width * (0.1 + gx * 0.8),
    y: height * (0.1 + gy * 0.8),
    vx: 0,
    vy: 0,
    radius: 1.5 + Math.random() * 3.5,
    hue,
    alpha: 0,
    life: 0,
    maxLife: 5 + Math.random() * 8,
  };
}

function resolveMotion(pref: MotionPreference): "full" | "reduced" | "static" {
  if (pref === "system") {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return "reduced";
    }
    return "full";
  }
  return pref;
}

export function VisualCanvas({
  audioEngine,
  isPlaying,
  mode,
  brightness = 0.7,
  visualIntensity,
  rhythmHz = 0.095,
  motionPreference = "system",
  experienceMode = "audio-visuals",
  windDownProgress = 0,
  pathway = "ambient-rhythm",
  cycleShape = "longer-release",
  audioReactivity = "on",
}: {
  audioEngine: AudioEngine | null;
  isPlaying: boolean;
  mode: SoundscapeId;
  brightness?: number;
  visualIntensity?: number;
  rhythmHz?: number;
  motionPreference?: MotionPreference;
  experienceMode?: ExperienceMode;
  windDownProgress?: number;
  pathway?: Pathway;
  cycleShape?: CycleShape;
  audioReactivity?: AudioReactivity;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const audioRef = useRef(audioEngine);
  const isPlayingRef = useRef(isPlaying);
  const modeRef = useRef(mode);
  const brightnessRef = useRef(brightness);
  const intensityRef = useRef(visualIntensity ?? (isMobile() ? 0.5 : 0.65));
  const rhythmHzRef = useRef(rhythmHz);
  const motionRef = useRef(motionPreference);
  const experienceRef = useRef(experienceMode);
  const windDownRef = useRef(windDownProgress);
  const pathwayRef = useRef(pathway);
  const cycleShapeRef = useRef(cycleShape);
  const audioReactivityRef = useRef(audioReactivity);

  audioRef.current = audioEngine;
  isPlayingRef.current = isPlaying;
  brightnessRef.current = brightness;
  rhythmHzRef.current = rhythmHz;
  motionRef.current = motionPreference;
  experienceRef.current = experienceMode;
  windDownRef.current = windDownProgress;
  pathwayRef.current = pathway;
  cycleShapeRef.current = cycleShape;
  audioReactivityRef.current = audioReactivity;
  if (visualIntensity !== undefined) {
    intensityRef.current = visualIntensity;
  }

  const particleRefreshRef = useRef(false);
  const prevModeRef = useRef(mode);
  if (mode !== prevModeRef.current) {
    prevModeRef.current = mode;
    modeRef.current = mode;
    particleRefreshRef.current = true;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const mobile = isMobile();
    const flowResolution = mobile ? 30 : 20;

    let flowField: FlowField | null = null;
    let particles: Particle[] = [];
    let startTime = performance.now();
    let lastFrameTime = startTime;
    let timeShift = getTimeOfDayShift();
    let lastTimeShiftCheck = startTime;
    let accumulatedT = 0;
    const glowCache = new Map<string, HTMLCanvasElement>();

    // Adaptive quality
    let qualityTier: QualityTier = mobile ? "medium" : "high";
    const frameTimes: number[] = [];
    let sustainedFrames = 0;
    let pendingTier: QualityTier | null = null;

    // Cached layers
    let vignetteCache: HTMLCanvasElement | null = null;
    let basinCache: HTMLCanvasElement | null = null;
    let cachedBasinMode: SoundscapeId | null = null;
    let cachedBasinBrightness = -1;

    let paused = false;

    // Motion preference listener
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = () => {
      particleRefreshRef.current = true;
    };
    motionQuery.addEventListener("change", onMotionChange);

    const getEffectiveMotion = (): "full" | "reduced" | "static" => resolveMotion(motionRef.current);

    const getParticleCount = (w: number, h: number): number => {
      const motion = getEffectiveMotion();
      if (motion === "static") return 0;
      const fullCount = Math.min(140, Math.floor((w * h) / 8000));
      const tierMult = qualityTier === "high" ? 1.0 : qualityTier === "medium" ? 0.6 : 0.3;
      if (motion === "reduced") return Math.min(25, Math.floor(fullCount * tierMult));
      const intensity = intensityRef.current;
      const base = mobile ? Math.min(50, Math.floor(fullCount * intensity)) : Math.floor(fullCount * intensity);
      return Math.floor(base * tierMult);
    };

    const initFlowField = (w: number, h: number) => {
      const cols = Math.ceil(w / flowResolution);
      const rows = Math.ceil(h / flowResolution);
      flowField = { cols, rows, resolution: flowResolution, field: new Array(cols * rows).fill(0) };
    };

    const initParticles = (w: number, h: number) => {
      const palette = SOUNDSCAPE_PALETTES[modeRef.current];
      const count = getParticleCount(w, h);
      particles = Array.from({ length: count }, () => createParticle(w, h, palette));
      glowCache.clear();
      startTime = performance.now();
      lastFrameTime = startTime;
      accumulatedT = 0;
    };

    const buildVignetteCache = (w: number, h: number) => {
      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      const offCtx = off.getContext("2d");
      if (!offCtx) return null;
      const cx = w / 2;
      const cy = h / 2;
      const maxDist = Math.sqrt(cx * cx + cy * cy);
      const grad = offCtx.createRadialGradient(cx, cy, maxDist * 0.35, cx, cy, maxDist);
      grad.addColorStop(0, "rgba(10, 7, 3, 0)");
      grad.addColorStop(1, "rgba(10, 7, 3, 0.12)");
      offCtx.fillStyle = grad;
      offCtx.fillRect(0, 0, w, h);
      return off;
    };

    const buildBasinCache = (w: number, h: number, pal: typeof SOUNDSCAPE_PALETTES.calm, curBrightness: number) => {
      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      const offCtx = off.getContext("2d");
      if (!offCtx) return null;
      const cx = w / 2;
      const cy = h / 2;
      const basinRadius = Math.min(w, h) * 0.35;
      const basinHue = (pal.hueRange[0] + pal.hueRange[1]) / 2;
      const grad = offCtx.createRadialGradient(cx, cy, 0, cx, cy, basinRadius);
      grad.addColorStop(0, `hsla(${basinHue}, ${pal.saturation * 0.5}%, ${pal.brightness * 0.4}%, ${0.03 * curBrightness})`);
      grad.addColorStop(0.6, `hsla(${basinHue}, ${pal.saturation * 0.3}%, ${pal.brightness * 0.3}%, ${0.015 * curBrightness})`);
      grad.addColorStop(1, `hsla(${basinHue}, ${pal.saturation * 0.2}%, ${pal.brightness * 0.2}%, 0)`);
      offCtx.fillStyle = grad;
      offCtx.beginPath();
      offCtx.arc(cx, cy, basinRadius, 0, Math.PI * 2);
      offCtx.fill();
      return off;
    };

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const effectiveDpr = qualityTier === "low" ? Math.min(dpr, 1.5) : dpr;
      canvas.width = Math.round(w * effectiveDpr);
      canvas.height = Math.round(h * effectiveDpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(effectiveDpr, 0, 0, effectiveDpr, 0, 0);
      initFlowField(w, h);
      initParticles(w, h);
      vignetteCache = buildVignetteCache(w, h);
      basinCache = null;
      cachedBasinMode = null;
    };
    resize();
    window.addEventListener("resize", resize);

    const getGlowSprite = (
      radius: number, hue: number, saturation: number,
      brightnessVal: number, alpha: number,
    ): HTMLCanvasElement => {
      const qRadius = Math.round(radius);
      const qHue = Math.round(hue / 5) * 5;
      const qBrightness = Math.round(brightnessVal);
      const qAlpha = Math.round(alpha * 10) / 10;
      const key = `${qRadius}-${qHue}-${saturation}-${qBrightness}-${qAlpha}`;

      const cached = glowCache.get(key);
      if (cached) return cached;

      const size = qRadius * 8 + 2;
      const offscreen = document.createElement("canvas");
      offscreen.width = size;
      offscreen.height = size;
      const offCtx = offscreen.getContext("2d");
      if (!offCtx) return offscreen;

      const cx = size / 2;
      const gradient = offCtx.createRadialGradient(cx, cx, 0, cx, cx, qRadius * 4);
      gradient.addColorStop(0, `hsla(${qHue}, ${saturation}%, ${brightnessVal}%, ${qAlpha * 0.8})`);
      gradient.addColorStop(0.5, `hsla(${qHue}, ${saturation}%, ${brightnessVal}%, ${qAlpha * 0.2})`);
      gradient.addColorStop(1, `hsla(${qHue}, ${saturation}%, ${brightnessVal}%, 0)`);

      offCtx.beginPath();
      offCtx.arc(cx, cx, qRadius * 4, 0, Math.PI * 2);
      offCtx.fillStyle = gradient;
      offCtx.fill();

      offCtx.beginPath();
      offCtx.arc(cx, cx, qRadius, 0, Math.PI * 2);
      offCtx.fillStyle = `hsla(${qHue}, ${saturation - 10}%, ${brightnessVal + 20}%, ${qAlpha})`;
      offCtx.fill();

      glowCache.set(key, offscreen);
      return offscreen;
    };

    const updateQuality = (dt: number) => {
      frameTimes.push(dt);
      if (frameTimes.length > 30) frameTimes.shift();
      if (frameTimes.length < 10) return;

      const avgDt = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      const fps = 1 / avgDt;

      let target: QualityTier;
      if (fps > 45) target = "high";
      else if (fps > 30) target = "medium";
      else target = "low";

      if (target === qualityTier) {
        sustainedFrames = 0;
        pendingTier = null;
        return;
      }

      if (target === pendingTier) {
        sustainedFrames++;
        if (sustainedFrames >= 60) {
          qualityTier = target;
          sustainedFrames = 0;
          pendingTier = null;
          const w = window.innerWidth;
          const h = window.innerHeight;
          const newCount = getParticleCount(w, h);
          if (newCount < particles.length) {
            particles.length = newCount;
          }
        }
      } else {
        pendingTier = target;
        sustainedFrames = 0;
      }
    };

    const animate = (now: number) => {
      if (paused) return;

      const rawDt = (now - lastFrameTime) / 1000;
      const dt = Math.min(rawDt, MAX_DELTA);
      lastFrameTime = now;

      const w = window.innerWidth;
      const h = window.innerHeight;
      const curMode = modeRef.current;
      const curBrightness = brightnessRef.current;
      const curPlaying = isPlayingRef.current;
      const curAudio = audioRef.current;
      const motion = getEffectiveMotion();
      const curWindDown = windDownRef.current;
      const windDownMult = 1 - curWindDown * 0.6;

      updateQuality(dt);

      if (particleRefreshRef.current) {
        particleRefreshRef.current = false;
        const palette = SOUNDSCAPE_PALETTES[curMode];
        const targetCount = getParticleCount(w, h);
        for (let i = 0; i < particles.length; i++) {
          if (particles[i].life > particles[i].maxLife * 0.7) {
            particles[i] = createParticle(w, h, palette);
          }
        }
        if (targetCount !== particles.length) {
          if (targetCount < particles.length) {
            particles.length = targetCount;
          } else {
            while (particles.length < targetCount) {
              particles.push(createParticle(w, h, palette));
            }
          }
        }
        glowCache.clear();
        basinCache = null;
        cachedBasinMode = null;
      }

      if (now - lastTimeShiftCheck > 60_000) {
        timeShift = getTimeOfDayShift();
        lastTimeShiftCheck = now;
      }

      const basePal = SOUNDSCAPE_PALETTES[curMode];
      const pal = {
        hueRange: [
          basePal.hueRange[0] + timeShift.hueShift,
          basePal.hueRange[1] + timeShift.hueShift,
        ] as [number, number],
        saturation: Math.round(basePal.saturation * timeShift.saturationMult),
        brightness: Math.round(basePal.brightness * timeShift.brightnessMult),
      };

      accumulatedT += dt * (motion === "reduced" ? 0.03 : 0.15);

      const elapsedMs = now - startTime;
      const breath = pathwayRef.current === "external-focus"
        ? 0.5
        : getShapedBreathPhase(elapsedMs, rhythmHzRef.current, cycleShapeRef.current);

      let audioLevel = 0;
      if (curAudio && curPlaying) {
        audioLevel = curAudio.getAudioLevel();
      }
      const audioBreath = 0.85 + audioLevel * 0.15;

      // Trail fade (time-based)
      const trailAlpha = Math.min(1, 0.05 * dt * 60);
      ctx.fillStyle = `rgba(15, 10, 5, ${trailAlpha})`;
      ctx.fillRect(0, 0, w, h);

      const centerX = w / 2;
      const centerY = h / 2;
      const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

      // Vignette (cached)
      if (vignetteCache) {
        ctx.drawImage(vignetteCache, 0, 0);
      }

      // Breath luminance wash
      ctx.fillStyle = `rgba(25, 18, 10, ${breath * 0.008})`;
      ctx.fillRect(0, 0, w, h);

      // Rest basin (cached per mode+brightness)
      if (cachedBasinMode !== curMode || Math.abs(cachedBasinBrightness - curBrightness) > 0.05) {
        basinCache = buildBasinCache(w, h, pal, curBrightness);
        cachedBasinMode = curMode;
        cachedBasinBrightness = curBrightness;
      }
      if (basinCache) {
        ctx.drawImage(basinCache, 0, 0);
      }

      // Flow field update (time-based)
      if (flowField && motion !== "static") {
        const t = accumulatedT;
        for (let y = 0; y < flowField.rows; y++) {
          for (let x = 0; x < flowField.cols; x++) {
            const idx = y * flowField.cols + x;
            const nx = x * 0.02 + t * 0.5;
            const ny = y * 0.02 + t * 0.3;
            const largeDrift =
              Math.sin(nx * 0.3 + t * 0.2) * 1.5 +
              Math.cos(ny * 0.25 + t * 0.15) * 1.2;
            const localTurb = Math.sin(nx * 1.2 + ny * 0.9 + t * 0.4) * 0.4;
            flowField.field[idx] = largeDrift + localTurb;
          }
        }
      }

      // Fractal fog
      if (motion !== "static" && qualityTier !== "low") {
        const t = accumulatedT;
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        for (let i = 0; i < 3; i++) {
          const fogX = centerX + Math.sin(t * 0.12 + i * 2.1) * w * 0.2;
          const fogY = centerY + Math.cos(t * 0.09 + i * 1.7) * h * 0.15;
          const fogRadius = Math.min(w, h) * (0.15 + i * 0.05);
          const fogHue = pal.hueRange[0] + i * 5;
          const fogAlpha = (0.015 + i * 0.005) * curBrightness * audioBreath * windDownMult;
          const fogGrad = ctx.createRadialGradient(fogX, fogY, 0, fogX, fogY, fogRadius);
          fogGrad.addColorStop(0, `hsla(${fogHue}, ${pal.saturation * 0.4}%, ${pal.brightness * 0.5}%, ${fogAlpha})`);
          fogGrad.addColorStop(0.5, `hsla(${fogHue}, ${pal.saturation * 0.3}%, ${pal.brightness * 0.4}%, ${fogAlpha * 0.4})`);
          fogGrad.addColorStop(1, `hsla(${fogHue}, ${pal.saturation * 0.2}%, ${pal.brightness * 0.3}%, 0)`);
          ctx.beginPath();
          ctx.arc(fogX, fogY, fogRadius, 0, Math.PI * 2);
          ctx.fillStyle = fogGrad;
          ctx.fill();
        }
        ctx.restore();
      }

      // Particles (time-based)
      if (motion !== "static") {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.life += dt;

          const lifeRatio = p.life / p.maxLife;
          if (lifeRatio < 0.1) {
            p.alpha = lifeRatio / 0.1;
          } else if (lifeRatio > 0.85) {
            p.alpha = (1 - lifeRatio) / 0.15;
          } else {
            p.alpha = 1;
          }

          if (flowField) {
            const col = Math.floor(p.x / flowField.resolution);
            const row = Math.floor(p.y / flowField.resolution);
            if (col >= 0 && col < flowField.cols && row >= 0 && row < flowField.rows) {
              const angle = flowField.field[row * flowField.cols + col];
              p.vx += Math.cos(angle) * FORCE_STRENGTH * dt;
              p.vy += Math.sin(angle) * FORCE_STRENGTH * dt;
            }
          }

          // Frame-rate independent damping
          const dampFactor = Math.pow(DAMPING_BASE, dt * 60);
          p.vx *= dampFactor;
          p.vy *= dampFactor;
          p.x += p.vx * dt * 60;
          p.y += p.vy * dt * 60;

          if (p.x < 0) p.x = w;
          if (p.x > w) p.x = 0;
          if (p.y < 0) p.y = h;
          if (p.y > h) p.y = 0;

          if (p.life >= p.maxLife) {
            particles[i] = createParticle(w, h, pal);
            continue;
          }

          const dx = p.x - centerX;
          const dy = p.y - centerY;
          const distFromCenter = Math.sqrt(dx * dx + dy * dy);
          const distNorm = distFromCenter / maxDist;
          const horizonFactor = Math.max(0, 1 - Math.pow(distNorm, 1.8) * 0.85);

          const breathAlpha = 0.85 + breath * 0.15;
          const breathRadius = 0.92 + breath * 0.08;

          const effectiveAlpha =
            p.alpha * (0.75 + audioLevel * 0.15) * horizonFactor * curBrightness * breathAlpha * windDownMult;
          const effectiveRadius = p.radius * (1 + audioLevel * 0.3) * breathRadius * horizonFactor;
          const effectiveSaturation = Math.round(pal.saturation * (0.55 + horizonFactor * 0.25));
          const effectiveBrightness = Math.round(pal.brightness * (0.75 + horizonFactor * 0.2));

          const sprite = getGlowSprite(
            effectiveRadius,
            p.hue + timeShift.hueShift,
            effectiveSaturation,
            effectiveBrightness,
            effectiveAlpha,
          );
          ctx.drawImage(sprite, p.x - sprite.width / 2, p.y - sprite.height / 2);
        }
      }

      // Aurora
      const skipAurora = motion !== "full" || qualityTier === "low";
      if (!skipAurora) {
        drawAurora(ctx, w, h, accumulatedT, pal, audioLevel, curBrightness, breath, windDownMult);
      }

      // Breathing circle / steady anchor
      if (curPlaying) {
        const circleAudio = motion === "reduced" || motion === "static" ? 0 : audioLevel;
        const isExternalFocus = pathwayRef.current === "external-focus";
        const isReduced = motion === "reduced";
        drawBreathingCircle(
          ctx, w, h, pal,
          circleAudio,
          curBrightness,
          isExternalFocus ? 0.5 : breath,
          isExternalFocus || isReduced,
        );
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    // Visibility handling
    const onVisibility = () => {
      if (document.hidden) {
        paused = true;
        cancelAnimationFrame(animFrameRef.current);
      } else {
        paused = false;
        lastFrameTime = performance.now();
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      motionQuery.removeEventListener("change", onMotionChange);
      cancelAnimationFrame(animFrameRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ background: "#0f0a05" }}
      role="img"
      aria-label="Ambient visualization with flowing particles and gentle breathing glow"
    />
  );
}

function drawAurora(
  ctx: CanvasRenderingContext2D,
  w: number, h: number, t: number,
  palette: { hueRange: [number, number]; saturation: number; brightness: number },
  audioLevel: number,
  brightnessMultiplier: number,
  breath: number,
  windDownMult: number,
) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = (0.02 + audioLevel * 0.01) * brightnessMultiplier * (0.8 + breath * 0.2) * windDownMult;

  for (let i = 0; i < 2; i++) {
    const yBase = h * (0.35 + i * 0.18);
    const hue =
      palette.hueRange[0] +
      ((palette.hueRange[1] - palette.hueRange[0]) * i) / 2;

    ctx.beginPath();
    ctx.moveTo(0, yBase);

    for (let x = 0; x <= w; x += 10) {
      const y =
        yBase +
        Math.sin(x * 0.003 + t * (0.4 + i * 0.1)) * 60 +
        Math.sin(x * 0.007 - t * 0.3) * 30 +
        Math.cos(x * 0.001 + t * 0.2) * 40;
      ctx.lineTo(x, y);
    }

    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, yBase - 120, 0, yBase + 250);
    grad.addColorStop(0, `hsla(${hue}, ${palette.saturation}%, ${palette.brightness}%, 0)`);
    grad.addColorStop(0.3, `hsla(${hue}, ${palette.saturation}%, ${palette.brightness}%, 0.15)`);
    grad.addColorStop(1, `hsla(${hue}, ${palette.saturation}%, ${palette.brightness}%, 0)`);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  ctx.restore();
}

function drawBreathingCircle(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  palette: { hueRange: [number, number]; saturation: number; brightness: number },
  audioLevel: number,
  brightnessMultiplier: number,
  breath: number,
  steadyMode = false,
) {
  const cx = w / 2;
  const cy = h / 2;

  const breathPhase = breath * 2 - 1;

  const baseRadius = Math.min(w, h) * 0.12;
  const scaleAmount = steadyMode ? 0.05 : 0.2;
  const radius = baseRadius * (0.8 + breathPhase * scaleAmount + audioLevel * 0.1);

  ctx.save();
  ctx.globalCompositeOperation = "screen";

  const hue = (palette.hueRange[0] + palette.hueRange[1]) / 2;

  const outerGrad = ctx.createRadialGradient(cx, cy, radius * 0.5, cx, cy, radius * 3);
  const outerAlpha = (0.06 + audioLevel * 0.02) * brightnessMultiplier;
  outerGrad.addColorStop(0, `hsla(${hue}, ${palette.saturation}%, ${palette.brightness}%, ${outerAlpha})`);
  outerGrad.addColorStop(0.5, `hsla(${hue}, ${palette.saturation}%, ${palette.brightness}%, ${outerAlpha * 0.33})`);
  outerGrad.addColorStop(1, `hsla(${hue}, ${palette.saturation}%, ${palette.brightness}%, 0)`);

  ctx.beginPath();
  ctx.arc(cx, cy, radius * 3, 0, Math.PI * 2);
  ctx.fillStyle = outerGrad;
  ctx.fill();

  const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  const innerAlpha = (0.15 + audioLevel * 0.05) * brightnessMultiplier;
  innerGrad.addColorStop(0, `hsla(${hue}, ${palette.saturation - 20}%, ${palette.brightness + 20}%, ${innerAlpha})`);
  innerGrad.addColorStop(0.7, `hsla(${hue}, ${palette.saturation}%, ${palette.brightness}%, ${innerAlpha * 0.33})`);
  innerGrad.addColorStop(1, `hsla(${hue}, ${palette.saturation}%, ${palette.brightness}%, 0)`);

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = innerGrad;
  ctx.fill();

  ctx.restore();
}
