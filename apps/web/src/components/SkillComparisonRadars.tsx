import type { CandidateSkill, JobSkill, RadarPoint } from '../api/types';
import { useI18n } from '../i18n';
import { SkillRadarChart } from './SkillRadarChart';

const SOFT = 'Soft skills';
/** Soft skills comunes para completar el radar cuando faltan ejes. */
const COMMON_SOFT = ['Comunicación', 'Trabajo en equipo', 'Resolución de problemas'];
const MIN_AXES = 3;
const MAX_AXES = 8;

export interface RadarSeries {
  points: RadarPoint[];
  /** Ejes agregados (no los pide la vacante) para llegar al mínimo de 3. */
  padded: boolean;
}

/**
 * Radar por skill: un eje por cada skill que pide la vacante (nivel requerido vs. tu nivel confirmado).
 * Si hay menos de 3, se completa con skills confirmadas del candidato y, para soft skills, con comunes.
 */
export function buildSkillSeries(jobSkills: JobSkill[], candidate: CandidateSkill[], soft: boolean): RadarSeries {
  const ofKind = (category: string) => (category === SOFT) === soft;
  const mine = new Map(candidate.filter((s) => s.confirmed && ofKind(s.category)).map((s) => [s.name, s.level]));
  const points: RadarPoint[] = jobSkills
    .filter((s) => ofKind(s.category))
    .slice(0, MAX_AXES)
    .map((s) => ({ axis: s.name, required: s.level, candidate: mine.get(s.name) ?? 0 }));
  if (!points.length) return { points, padded: false };
  let padded = false;
  const extras = [...[...mine.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name), ...(soft ? COMMON_SOFT : [])];
  for (const name of extras) {
    if (points.length >= MIN_AXES) break;
    if (points.some((p) => p.axis === name)) continue;
    points.push({ axis: name, required: 0, candidate: mine.get(name) ?? 0 });
    padded = true;
  }
  return { points, padded };
}

/** Dos radares: skills técnicas y soft skills (vacante vs. candidato). */
export function SkillComparisonRadars({ jobSkills, candidateSkills, size = 480 }: { jobSkills: JobSkill[]; candidateSkills: CandidateSkill[]; size?: number }) {
  const { t } = useI18n();
  const tech = buildSkillSeries(jobSkills, candidateSkills, false);
  const soft = buildSkillSeries(jobSkills, candidateSkills, true);
  const panel = (title: string, aria: string, series: RadarSeries, variant: 'default' | 'soft', testId: string) =>
    series.points.length > 0 && (
      <section className={`radar-panel radar-panel--${variant}`} aria-label={title} data-testid={testId}>
        <h3 className={variant === 'soft' ? 'soft-skills-heading' : undefined}>{title}</h3>
        <SkillRadarChart data={series.points} size={size} ariaLabel={aria} variant={variant} axisHeader={t.radar.skill} />
        {series.padded && <p className="small muted radar-panel__note">{t.radar.padded}</p>}
      </section>
    );
  return (
    <div className="radar-pair">
      {panel(t.radar.techTitle, t.radar.techAria, tech, 'default', 'radar-tech')}
      {panel(t.radar.softTitle, t.radar.softAria, soft, 'soft', 'radar-soft')}
    </div>
  );
}
