import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ParticlesProps {
  className?: string;
  quantity?: number;
  color?: string;
}

export const Particles = ({ className, quantity = 60, color = "hsl(22 100% 52%)" }: ParticlesProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let particles: Array<{ x: number; y: number; vx: number; vy: number; r: number; alpha: number }> = [];

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = parent.clientWidth * dpr;
      canvas.height = parent.clientHeight * dpr;
      canvas.style.width = parent.clientWidth + "px";
      canvas.style.height = parent.clientHeight + "px";
      ctx.scale(dpr, dpr);
      init();
    };

    const init = () => {
      particles = Array.from({ length: quantity }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.8 + 0.4,
        alpha: Math.random() * 0.6 + 0.2,
      }));
    };

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.fillStyle = color.replace(")", ` / ${p.alpha})`).replace("hsl(", "hsla(");
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };

    resize();
    tick();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [quantity, color]);

  return <canvas ref={canvasRef} className={cn("pointer-events-none absolute inset-0", className)} />;
};
