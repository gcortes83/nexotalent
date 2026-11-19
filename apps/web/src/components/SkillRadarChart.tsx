import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { RadarPoint } from '../api/types';
import { useI18n } from '../i18n';

export interface SkillRadarChartProps {
  data: RadarPoint[];
  size?: number;
  ariaLabel?: string;
  showLegend?: boolean;
  /** «soft»: radar de soft skills (área y ejes en verde). */
  variant?: 'default' | 'soft';
  /** Encabezado de la columna de ejes en la tabla accesible (por defecto «Categoría»). */
  axisHeader?: string;
}

// Recharts se carga lazy para no inflar el bundle inicial (TK-FE-021).
const RadarSvg = lazy(() => import('./RadarSvg'));

/**
 * Radar vacante (línea discontinua) vs. candidato (área). Incluye una tabla alternativa
 * accesible (sr-only) para lectores de pantalla y para cuando no hay datos.
 */
export function SkillRadarChart({ data: raw, size = 480, ariaLabel, showLegend = true, variant = 'default', axisHeader }: SkillRadarChartProps) {
  const { t } = useI18n();
  ariaLabel ??= t.radar.aria;
  // Ejes = categorías de la taxonomía (en español en la API): se traducen para mostrar.
  // El eje «Soft skills» se marca para pintarlo de verde.
  const data = raw.map((p) => ({ ...p, axis: t.categories[p.axis] ?? p.axis, soft: variant === 'soft' || p.axis === 'Soft skills' }));
  const hasSoft = data.some((p) => p.soft);
  // Responsivo: el radar nunca es más ancho que su contenedor (móviles de 320–360 px).
  const box = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(size);
  useEffect(() => {
    const el = box.current?.parentElement;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => entry && setAvailable(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const side = Math.max(220, Math.min(size, available || size));
  if (data.length === 0) {
    return <p className="muted">{t.radar.empty}</p>;
  }
  return (
    <figure className="radar" aria-label={ariaLabel}>
      <div ref={box} aria-hidden="true" style={{ width: side, height: side, maxWidth: '100%' }}>
        <Suspense fallback={<div className="skeleton" style={{ width: side, height: side }} />}>
          <RadarSvg data={data} size={side} showLegend={showLegend} labels={{ job: t.radar.job, you: t.radar.you }} variant={variant} />
        </Suspense>
      </div>
      {hasSoft && showLegend && variant !== 'soft' && (
        <figcaption className="radar-soft-legend small" data-testid="radar-soft-legend">
          <span className="radar-soft-legend__dot" aria-hidden="true" /> {t.soft.legend}
        </figcaption>
      )}
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">{axisHeader ?? t.radar.category}</th>
            <th scope="col">{t.radar.required}</th>
            <th scope="col">{t.radar.yours}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p) => (
            <tr key={p.axis}>
              <th scope="row">{p.axis}</th>
              <td>{p.required}</td>
              <td>{p.candidate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
