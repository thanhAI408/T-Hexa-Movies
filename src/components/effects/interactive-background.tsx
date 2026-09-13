"use client";

import { useEffect, useRef, useState, useCallback, useSyncExternalStore } from "react";
import { subscribeLocal, readLocal, PREFERENCES_KEY } from '@/lib/movie-library';
import { usePathname } from "next/navigation";
import { BackgroundSwitcher } from "./background-switcher";

export interface ProjectorLightingConfig {
  ambientBg: string;
  primaryColor: string;
  accentColor: string;
  spotlightColor: string;
}

export const PROJECTOR_CONFIG: ProjectorLightingConfig = {
  ambientBg:
    "radial-gradient(ellipse 90% 60% at 50% -10%, rgba(245, 158, 11, 0.28), transparent 70%), radial-gradient(ellipse 70% 50% at 10% 80%, rgba(217, 119, 6, 0.16), transparent 60%), #080603",
  primaryColor: "#fbbf24",
  accentColor: "#f59e0b",
  spotlightColor: "rgba(251, 191, 36, 0.5)",
};

interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseSize: number;
  opacity: number;
  color: string;
  phase: number;
}

const STORAGE_KEY_SPOTLIGHT = "thexa_35mm_spotlight_enabled";
const STORAGE_KEY_DUST = "thexa_35mm_dust_enabled";
const STORAGE_KEY_INTENSITY = "thexa_35mm_intensity";

const subscribeHydration = () => () => {};
function savedPreference(key: string, fallback: string) { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }
export function InteractiveBackground() {
  const pathname = usePathname();
  const preferences = useSyncExternalStore(subscribeLocal, () => readLocal(PREFERENCES_KEY, '{}'), () => '{}');
  const reduced = (()=>{try{return JSON.parse(preferences).reduced===true;}catch{return false;}})();
  useEffect(()=>{document.documentElement.dataset.reducedEffects=String(reduced);return()=>{delete document.documentElement.dataset.reducedEffects;};},[reduced]);
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  return hydrated && !reduced && pathname !== "/youtube" && pathname !== "/tro-ly-phim" && !pathname.includes("/watch/") && !pathname.startsWith("/xem/") ? <HydratedBackground /> : null;
}
function HydratedBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [spotlightEnabled, setSpotlightEnabled] = useState(() => savedPreference(STORAGE_KEY_SPOTLIGHT, "true") === "true");
  const [dustEnabled, setDustEnabled] = useState(() => savedPreference(STORAGE_KEY_DUST, "true") === "true");
  const [intensity, setIntensity] = useState<"low" | "medium" | "high">(() => { const value = savedPreference(STORAGE_KEY_INTENSITY, "medium"); return value === "low" || value === "high" ? value : "medium"; });
  const mounted = true;

  // Mouse & Animation refs
  const mouseRef = useRef({
    x: -1000,
    y: -1000,
    targetX: -1000,
    targetY: -1000,
    isHovering: false,
    lastMoveTime: 0,
  });

  const particlesRef = useRef<DustParticle[]>([]);
  const animFrameIdRef = useRef<number | null>(null);

  const handleToggleSpotlight = useCallback(() => {
    setSpotlightEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_SPOTLIGHT, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const handleToggleDust = useCallback(() => {
    setDustEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_DUST, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const handleChangeIntensity = useCallback((newIntensity: "low" | "medium" | "high") => {
    setIntensity(newIntensity);
    try {
      localStorage.setItem(STORAGE_KEY_INTENSITY, newIntensity);
    } catch {
      // ignore
    }
  }, []);

  // Dedicated 35mm Cinema Projector & Dust Canvas Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    if (mouseRef.current.targetX < 0) {
      mouseRef.current.x = width * 0.5;
      mouseRef.current.y = height * 0.38;
      mouseRef.current.targetX = width * 0.5;
      mouseRef.current.targetY = height * 0.38;
    }

    // Initialize 35mm celluloid dust particles
    const initParticles = () => {
      const isMobile = width < 640;
      const count = isMobile
        ? (intensity === "low" ? 45 : intensity === "high" ? 115 : 85)
        : (intensity === "low" ? 95 : intensity === "high" ? 255 : 190);
      const particles: DustParticle[] = [];

      const dustColors = ["#fef08a", "#fde047", "#fbbf24", "#f59e0b", "#d97706", "#fed7aa"];

      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.35,
          vy: -Math.random() * 0.55 - 0.15, // drifting upward like dust in projector light
          size: Math.random() * 2.8 + 0.8,
          baseSize: Math.random() * 2.8 + 0.8,
          opacity: Math.random() * 0.65 + 0.25,
          color: dustColors[Math.floor(Math.random() * dustColors.length)],
          phase: Math.random() * Math.PI * 2,
        });
      }
      particlesRef.current = particles;
    };

    initParticles();

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initParticles();
    };

    const handlePointerMove = (e: PointerEvent) => {
      const mouse = mouseRef.current;
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.isHovering = true;
      mouse.lastMoveTime = performance.now();
    };

    const handlePointerLeave = () => {
      mouseRef.current.isHovering = false;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("mouseleave", handlePointerLeave);

    const mult = intensity === "low" ? 0.55 : intensity === "high" ? 1.55 : 1.0;

    let isVisible = !document.hidden;
    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    let lastTime = performance.now();

    // 60 FPS RENDER LOOP
    const render = (now: number) => {
      if (!isVisible) {
        animFrameIdRef.current = requestAnimationFrame(render);
        return;
      }

      const dt = Math.min((now - lastTime) / 16.667, 2.5);
      lastTime = now;

      const mouse = mouseRef.current;
      const lerp = 0.12 * dt;

      // Cosmic Idle drift if not interacted
      const isIdle = !mouse.isHovering || now - mouse.lastMoveTime > 3500;
      if (isIdle) {
        const t = now * 0.0006;
        const idleX = width * 0.5 + Math.cos(t) * (width * 0.28);
        const idleY = height * 0.4 + Math.sin(t * 1.3) * (height * 0.2);
        mouse.targetX += (idleX - mouse.targetX) * 0.02 * dt;
        mouse.targetY += (idleY - mouse.targetY) * 0.02 * dt;
      }

      mouse.x += (mouse.targetX - mouse.x) * lerp;
      mouse.y += (mouse.targetY - mouse.y) * lerp;

      ctx.clearRect(0, 0, width, height);

      // Mechanical 24fps Shutter Flicker of classic 35mm projector
      const flicker = 1 + (Math.sin(now * 0.08) * 0.06 + (Math.random() - 0.5) * 0.035);

      // 1. VOLUMETRIC PROJECTOR BEAM
      if (spotlightEnabled) {
        // Projection booth source point (simulated behind viewer at top center)
        const sourceX = width * 0.5 + (mouse.x - width * 0.5) * 0.18;
        const sourceY = -120;

        const beamDirX = mouse.x - sourceX;
        const beamDirY = mouse.y - sourceY;
        const beamLen = Math.sqrt(beamDirX * beamDirX + beamDirY * beamDirY);
        const normX = beamDirX / (beamLen || 1);
        const normY = beamDirY / (beamLen || 1);
        const perpX = -normY;
        const perpY = normX;

        const baseRadius = 280 * mult;
        const p1X = mouse.x + perpX * baseRadius;
        const p1Y = mouse.y + perpY * baseRadius;
        const p2X = mouse.x - perpX * baseRadius;
        const p2Y = mouse.y - perpY * baseRadius;

        // Volumetric conical light beam
        const coneGrad = ctx.createRadialGradient(
          sourceX,
          sourceY,
          80,
          mouse.x,
          mouse.y,
          baseRadius * 1.6
        );
        coneGrad.addColorStop(0, `rgba(254, 240, 138, ${0.46 * mult * flicker})`);
        coneGrad.addColorStop(0.35, `rgba(251, 191, 36, ${0.2 * mult * flicker})`);
        coneGrad.addColorStop(0.7, `rgba(245, 158, 11, ${0.08 * mult * flicker})`);
        coneGrad.addColorStop(1, "rgba(217, 119, 6, 0)");

        ctx.save();
        ctx.fillStyle = coneGrad;
        ctx.beginPath();
        ctx.moveTo(sourceX, sourceY);
        ctx.lineTo(p1X, p1Y);
        ctx.arc(
          mouse.x,
          mouse.y,
          baseRadius,
          Math.atan2(p1Y - mouse.y, p1X - mouse.x),
          Math.atan2(p2Y - mouse.y, p2X - mouse.x)
        );
        ctx.lineTo(sourceX, sourceY);
        ctx.closePath();
        ctx.fill();

        // Projector Focal Hotspot on content surface
        const hotGrad = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          baseRadius * 0.65
        );
        hotGrad.addColorStop(0, `rgba(255, 255, 255, ${0.68 * mult * flicker})`);
        hotGrad.addColorStop(0.28, `rgba(251, 191, 36, ${0.38 * mult * flicker})`);
        hotGrad.addColorStop(0.65, `rgba(245, 158, 11, ${0.12 * mult * flicker})`);
        hotGrad.addColorStop(1, "rgba(251, 191, 36, 0)");

        ctx.fillStyle = hotGrad;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, baseRadius * 0.65, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 2. SWIRLING 35MM CELLULOID DUST PARTICLES
      if (dustEnabled) {
        const list = particlesRef.current;
        for (let i = 0; i < list.length; i++) {
          const p = list[i];
          p.phase += 0.025 * dt;
          p.x += (p.vx + Math.sin(p.phase) * 0.45) * dt;
          p.y += p.vy * dt;

          // Screen wrap
          if (p.y < -20) {
            p.y = height + 20;
            p.x = Math.random() * width;
          }
          if (p.x < -20) p.x = width + 20;
          else if (p.x > width + 20) p.x = -20;

          // Turbulence & illumination when dust enters projector light
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const d = Math.sqrt(dx * dx + dy * dy);

          let alpha = p.opacity * mult;
          let size = p.baseSize;

          if (d < 260) {
            const boost = 1 - d / 260;
            alpha = Math.min(0.98, alpha + boost * 0.7);
            size = p.baseSize * (1 + boost * 1.9);

            // Subtle swirling wake around cursor
            p.x += (dx / (d || 1)) * 0.3 * dt;
            p.y += (dy / (d || 1)) * 0.3 * dt;
          }

          ctx.beginPath();
          ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha;
          ctx.shadowBlur = d < 260 ? 12 : 3;
          ctx.shadowColor = p.color;
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
        }
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("mouseleave", handlePointerLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [spotlightEnabled, dustEnabled, intensity]);

  return (
    <>
      {/* 1. Warm Cinema Atmosphere Layer */}
      <div
        className="pointer-events-none fixed inset-0 z-0 transition-all duration-700 ease-out"
        style={{ background: PROJECTOR_CONFIG.ambientBg }}
        aria-hidden="true"
      />

      {/* 2. Bespoke 35mm Projector Canvas Layer (z-20, non-blocking) */}
      <div
        className="pointer-events-none fixed inset-0 z-20 overflow-hidden"
        aria-hidden="true"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full pointer-events-none"
        />
      </div>

      {/* 3. Floating Cinema Lighting Control (Compact & Clean) */}
      {mounted && (
        <BackgroundSwitcher
          spotlightEnabled={spotlightEnabled}
          dustEnabled={dustEnabled}
          intensity={intensity}
          onToggleSpotlight={handleToggleSpotlight}
          onToggleDust={handleToggleDust}
          onChangeIntensity={handleChangeIntensity}
        />
      )}
    </>
  );
}
