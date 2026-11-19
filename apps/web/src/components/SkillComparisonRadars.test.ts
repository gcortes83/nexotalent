import { describe, expect, it } from 'vitest';
import type { CandidateSkill, JobSkill } from '../api/types';
import { buildSkillSeries } from './SkillComparisonRadars';

const job = (name: string, category: string, level: number): JobSkill => ({ name, category, level, mustHave: false });
const mine = (name: string, category: string, level: number, confirmed = true): CandidateSkill =>
  ({ skillId: name, name, category, level, confirmed, source: 'declared', evidence: null });

describe('buildSkillSeries', () => {
  const jobSkills = [job('TypeScript', 'Lenguajes', 4), job('React', 'Frameworks', 4), job('AWS', 'Cloud', 3), job('Empatía', 'Soft skills', 3)];

  it('técnicas: un eje por skill de la vacante con el nivel confirmado del candidato (0 si no la tiene)', () => {
    const r = buildSkillSeries(jobSkills, [mine('TypeScript', 'Lenguajes', 5), mine('AWS', 'Cloud', 4, false)], false);
    expect(r).toEqual({
      padded: false,
      points: [{ axis: 'TypeScript', required: 4, candidate: 5 }, { axis: 'React', required: 4, candidate: 0 }, { axis: 'AWS', required: 3, candidate: 0 }],
    });
  });

  it('soft: completa hasta 3 ejes con las soft skills del candidato (mayor nivel primero) y luego comunes', () => {
    const r = buildSkillSeries(jobSkills, [mine('Liderazgo', 'Soft skills', 2), mine('Negociación', 'Soft skills', 5)], true);
    expect(r.padded).toBe(true);
    expect(r.points).toEqual([
      { axis: 'Empatía', required: 3, candidate: 0 },
      { axis: 'Negociación', required: 0, candidate: 5 },
      { axis: 'Liderazgo', required: 0, candidate: 2 },
    ]);
    expect(buildSkillSeries(jobSkills, [], true).points.map((p) => p.axis)).toEqual(['Empatía', 'Comunicación', 'Trabajo en equipo']);
  });

  it('sin skills de ese tipo en la vacante no hay radar', () => {
    expect(buildSkillSeries([job('SQL', 'Lenguajes', 3)], [], true)).toEqual({ points: [], padded: false });
  });
});

describe('wrapLabel', () => {
  it('parte etiquetas largas en dos líneas equilibradas y deja las cortas igual', async () => {
    const { wrapLabel } = await import('./RadarSvg');
    expect(wrapLabel('Testing automatizado')).toEqual(['Testing', 'automatizado']);
    expect(wrapLabel('Resolución de problemas')).toEqual(['Resolución', 'de problemas']);
    expect(wrapLabel('TypeScript')).toEqual(['TypeScript']);
  });
});
