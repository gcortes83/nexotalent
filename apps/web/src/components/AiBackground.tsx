import { useEffect, useRef } from 'react';

interface Node { x: number; y: number; vx: number; vy: number; r: number; hue: number }
interface Pulse { a: number; b: number; t: number; speed: number }

const COLORS = [
  [124, 92, 255], // violeta (primario)
  [34, 211, 238], // cian
  [244, 114, 182], // rosa
] as const;
const LINK_DISTANCE = 150;
const POINTER_DISTANCE = 190;

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Fondo animado "red neuronal": nodos que flotan, se conectan por cercanía y por los que viajan
 * pulsos de datos; reacciona al puntero. Decorativo (aria-hidden), se pausa con la pestaña oculta
 * y respeta prefers-reduced-motion (dibuja un solo cuadro estático).
 */
export function AiBackground({ density = 1 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext?.('2d');
    if (!canvas || !ctx) return;

    const reduced = prefersReducedMotion();
    let width = 0;
    let height = 0;
    let nodes: Node[] = [];
    let pulses: Pulse[] = [];
    let frame = 0;
    let raf = 0;
    const pointer = { x: -9999, y: -9999 };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(110, Math.max(28, Math.round(((width * height) / 16000) * density)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: 1.2 + Math.random() * 1.8,
        hue: Math.floor(Math.random() * COLORS.length),
      }));
      pulses = [];
    };

    const rgba = (i: number, a: number) => `rgba(${COLORS[i]![0]}, ${COLORS[i]![1]}, ${COLORS[i]![2]}, ${a})`;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Conexiones entre nodos cercanos (el alfa decae con la distancia).
      const edges: [number, number][] = [];
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]!;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]!;
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK_DISTANCE) {
            edges.push([i, j]);
            const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
            const alpha = (1 - d / LINK_DISTANCE) * 0.35;
            grad.addColorStop(0, rgba(a.hue, alpha));
            grad.addColorStop(1, rgba(b.hue, alpha));
            ctx.strokeStyle = grad;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        // Conexión al puntero: la "atención" del modelo.
        const dp = Math.hypot(a.x - pointer.x, a.y - pointer.y);
        if (dp < POINTER_DISTANCE) {
          ctx.strokeStyle = rgba(1, (1 - dp / POINTER_DISTANCE) * 0.6);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }
      }

      // Nodos con halo.
      for (const n of nodes) {
        ctx.fillStyle = rgba(n.hue, 0.15);
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba(n.hue, 0.9);
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Pulsos de datos viajando por las conexiones.
      if (!reduced && edges.length && frame % 14 === 0 && pulses.length < 24) {
        const [a, b] = edges[Math.floor(Math.random() * edges.length)]!;
        pulses.push({ a, b, t: 0, speed: 0.012 + Math.random() * 0.02 });
      }
      pulses = pulses.filter((p) => p.t <= 1 && nodes[p.a] && nodes[p.b]);
      for (const p of pulses) {
        const a = nodes[p.a]!;
        const b = nodes[p.b]!;
        const x = a.x + (b.x - a.x) * p.t;
        const y = a.y + (b.y - a.y) * p.t;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 7);
        glow.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        glow.addColorStop(0.4, rgba(1, 0.7));
        glow.addColorStop(1, rgba(1, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();
        p.t += p.speed;
      }
    };

    const step = () => {
      frame++;
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -20) n.x = width + 20;
        if (n.x > width + 20) n.x = -20;
        if (n.y < -20) n.y = height + 20;
        if (n.y > height + 20) n.y = -20;
        // Leve atracción hacia el puntero.
        const dx = pointer.x - n.x;
        const dy = pointer.y - n.y;
        const d = Math.hypot(dx, dy);
        if (d < POINTER_DISTANCE && d > 1) {
          n.x += (dx / d) * 0.25;
          n.y += (dy / d) * 0.25;
        }
      }
      draw();
      raf = requestAnimationFrame(step);
    };

    const onMove = (e: PointerEvent) => { pointer.x = e.clientX; pointer.y = e.clientY; };
    const onLeave = () => { pointer.x = -9999; pointer.y = -9999; };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduced) raf = requestAnimationFrame(step);
    };

    resize();
    if (reduced) draw();
    else raf = requestAnimationFrame(step);
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [density]);

  return (
    <div className="ai-bg" aria-hidden="true" data-testid="ai-background">
      <canvas ref={ref} className="ai-bg__canvas" />
      <div className="ai-bg__aurora" />
      <div className="ai-bg__grid" />
    </div>
  );
}
