import { Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, Tooltip } from 'recharts';
import type { RadarPoint } from '../api/types';

/** Verde de soft skills: combina con el violeta (tú) y el cian (vacante) del radar. */
export const SOFT_GREEN = '#34d399';

export type RadarDatum = RadarPoint & { soft?: boolean };

/** Parte etiquetas largas en dos líneas (p. ej. «Testing / automatizado») para que no se corten. */
export function wrapLabel(label: string, max = 12): string[] {
  if (label.length <= max || !label.includes(' ')) return [label];
  const words = label.split(' ');
  let best = [label];
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const diff = Math.max(a.length, b.length);
    if (diff < bestDiff) { bestDiff = diff; best = [a, b]; }
  }
  return best;
}

const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface TickProps { x?: number | string; y?: number | string; textAnchor?: string; payload?: { value: string; index?: number } }
interface DotProps { cx?: number; cy?: number; index?: number; payload?: RadarDatum }

export default function RadarSvg({
  data, size, showLegend, labels = { job: 'Vacante', you: 'Tú' }, variant = 'default',
}: { data: RadarDatum[]; size: number; showLegend: boolean; labels?: { job: string; you: string }; variant?: 'default' | 'soft' }) {
  const youColor = variant === 'soft' ? SOFT_GREEN : 'var(--nx-primary)';
  const animate = !reduceMotion();
  // Escala de textos y puntos con el tamaño (radar al doble: 640 px).
  const scale = Math.max(1, size / 320);
  const fontSize = size < 300 ? 10 : Math.round(12 * Math.min(scale, 1.4));
  // Margen lateral para etiquetas de skills (más estrecho en móvil).
  const side = size < 360 ? 44 : 64 * Math.min(scale, 1.4);
  const softLabels = new Set(data.filter((d) => d.soft).map((d) => d.axis));

  // Etiqueta del eje: verde y en negrita si es de soft skills.
  // Etiquetas de varias líneas hacia fuera: arriba del centro suben, abajo bajan, a los lados se centran.
  const center = size / 2;
  const firstLineOffset = (y: number, n: number, lh: number) =>
    y < center - size * 0.15 ? -(n - 1) * lh : y > center + size * 0.15 ? 0 : -((n - 1) * lh) / 2;
  const tick = ({ x, y, textAnchor, payload }: TickProps) => {
    const soft = softLabels.has(payload?.value ?? '');
    const lines = wrapLabel(payload?.value ?? '');
    const lineHeight = fontSize * 1.15;
    return (
      <text x={x} y={y} textAnchor={textAnchor as 'start' | 'middle' | 'end'} dominantBaseline="central" fontSize={fontSize}
        fill={soft ? SOFT_GREEN : 'var(--nx-text-muted)'} fontWeight={soft ? 700 : 400} className={soft ? 'radar-tick--soft' : undefined}>
        {lines.map((line, i) => (
          <tspan key={i} x={x} dy={i === 0 ? firstLineOffset(Number(y), lines.length, lineHeight) : lineHeight}>{line}</tspan>
        ))}
      </text>
    );
  };
  // Puntos: en el eje de soft skills se pintan de verde (ambas series).
  const dot = (fill: string, base: number) => ({ cx, cy, index, payload }: DotProps) => {
    const r = base * Math.min(scale, 1.6);
    return (
    <circle key={`d${index}`} cx={cx} cy={cy} r={payload?.soft ? r + 1.5 : r}
      fill={payload?.soft ? SOFT_GREEN : fill} stroke={payload?.soft ? '#0b0d14' : 'none'} strokeWidth={payload?.soft ? 1 : 0}
      className={payload?.soft ? 'radar-dot--soft' : undefined} />
    );
  };

  return (
    <RadarChart width={size} height={size} data={data} outerRadius={size < 360 ? '70%' : '80%'} margin={{ top: 24, right: side, bottom: 24, left: side }}>
      <PolarGrid stroke="var(--nx-border)" />
      <PolarAngleAxis dataKey="axis" tick={tick} />
      <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={false} axisLine={false} />
      <Radar name={labels.job} dataKey="required" stroke="var(--nx-primary-2)" strokeWidth={Math.min(scale, 1.5)} strokeDasharray="5 4" fill="transparent"
        dot={dot('var(--nx-primary-2)', 2.5)} isAnimationActive={animate} />
      <Radar name={labels.you} dataKey="candidate" stroke={youColor} strokeWidth={Math.min(scale, 2)} fill={youColor} fillOpacity={0.35}
        dot={dot(youColor, 3)} isAnimationActive={animate} animationDuration={600} />
      <Tooltip contentStyle={{ background: 'var(--nx-surface)', border: '1px solid var(--nx-border)' }} />
      {showLegend && <Legend />}
    </RadarChart>
  );
}
