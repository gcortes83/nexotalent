/**
 * TK-BE-012 · Fórmula de matching híbrido (docs/03-arquitectura-ai.md §3).
 *
 * score = 0.45·skill_coverage + 0.30·cosine + 0.15·seniority_fit + 0.10·preference_fit − penalty
 *
 * Tests escritos ANTES de la implementación (TDD). Evidencia del rojo:
 * docs/evidence/tdd-match-red.log
 */
import { describe, expect, it } from 'vitest';
import { computeMatch, MATCH_MODEL_VERSION } from '../../src/modules/matching/domain/match-formula.js';
import type { MatchCandidate } from '../../src/modules/matching/domain/types.js';
import { aCandidate, aJob, has, req } from '../support/factories.js';

describe('computeMatch · fórmula híbrida', () => {
  it('cobertura total: todas las skills cubiertas da cobertura 1 y score alto', () => {
    const result = computeMatch(aCandidate(), aJob(), 0.8);

    expect(result.factors.skillCoverage).toBe(1);
    expect(result.factors.mustHavePenalty).toBe(0);
    expect(result.missingMustHaves).toEqual([]);
    // 0.45·1 + 0.30·0.8 + 0.15·1 + 0.10·1 = 0.94
    expect(result.score).toBeCloseTo(0.94, 4);
    expect(result.scorePercent).toBe(94);
    expect(result.modelVersion).toBe(MATCH_MODEL_VERSION);
  });

  it('skill obligatoria faltante: penaliza 0.10 y la lista en missingMustHaves', () => {
    const candidate = aCandidate({
      skills: [has('TypeScript', 'Lenguajes', 4), has('PostgreSQL', 'Datos', 3), has('AWS', 'Cloud', 3)],
    });

    const result = computeMatch(candidate, aJob(), 0.8);

    // cobertura = (2·1 + 2·0 + 1 + 1) / 6
    expect(result.factors.skillCoverage).toBeCloseTo(4 / 6, 4);
    expect(result.factors.mustHavePenalty).toBeCloseTo(0.1, 4);
    expect(result.missingMustHaves).toEqual(['Node.js']);
    // 0.45·0.6667 + 0.24 + 0.15 + 0.10 − 0.10 = 0.69
    expect(result.score).toBeCloseTo(0.69, 4);
  });

  it('candidata sin skills: score 0, radar del candidato en 0 y sin error', () => {
    const result = computeMatch(aCandidate({ skills: [] }), aJob(), 0.9);

    expect(result.score).toBe(0);
    expect(result.scorePercent).toBe(0);
    expect(result.radar.length).toBeGreaterThan(0);
    expect(result.radar.every((p) => p.candidate === 0)).toBe(true);
    expect(result.gaps.map((g) => g.skill)).toEqual(
      expect.arrayContaining(['TypeScript', 'Node.js', 'PostgreSQL', 'AWS']),
    );
    expect(result.explanation).toMatch(/confirma/i);
  });

  it('solo cuentan las skills confirmadas', () => {
    const candidate = aCandidate({
      skills: [
        has('TypeScript', 'Lenguajes', 4),
        has('Node.js', 'Frameworks', 5, false), // propuesta por la IA, sin confirmar
        has('PostgreSQL', 'Datos', 3),
        has('AWS', 'Cloud', 3),
      ],
    });

    const result = computeMatch(candidate, aJob(), 0.8);

    expect(result.missingMustHaves).toEqual(['Node.js']);
    expect(result.factors.skillCoverage).toBeCloseTo(4 / 6, 4);
  });

  it('respeta los pesos: medio nivel en una skill de peso 2 equivale a faltar una de peso 1', () => {
    const halfHeavy = aCandidate({
      skills: [
        has('TypeScript', 'Lenguajes', 2),
        has('Node.js', 'Frameworks', 4),
        has('PostgreSQL', 'Datos', 3),
        has('AWS', 'Cloud', 3),
      ],
    });
    const missingLight = aCandidate({
      skills: [has('TypeScript', 'Lenguajes', 4), has('Node.js', 'Frameworks', 4), has('AWS', 'Cloud', 3)],
    });

    const a = computeMatch(halfHeavy, aJob(), 0.5);
    const b = computeMatch(missingLight, aJob(), 0.5);

    expect(a.factors.skillCoverage).toBeCloseTo(5 / 6, 4);
    expect(b.factors.skillCoverage).toBeCloseTo(5 / 6, 4);
  });

  it('un nivel superior al requerido no da cobertura mayor a 1', () => {
    const job = aJob({ skills: [req('Go', 'Lenguajes', 2)] });
    const candidate = aCandidate({ skills: [has('Go', 'Lenguajes', 5)] });

    expect(computeMatch(candidate, job, 1).factors.skillCoverage).toBe(1);
  });

  it('la penalización por obligatorias se limita a 0.30 y el score nunca es negativo', () => {
    const job = aJob({
      seniority: 'lead',
      modality: 'onsite',
      country: 'AR',
      salaryMax: 10000,
      skills: ['Rust', 'Kafka', 'Kubernetes', 'Terraform'].map((n) => req(n, 'Cloud', 5, { mustHave: true })),
    });
    const candidate = aCandidate({
      seniority: 'junior',
      preferredModalities: ['remote'],
      salaryExpectation: 90000,
      skills: [has('Excel', 'Herramientas', 3)],
    });

    const result = computeMatch(candidate, job, -0.2);

    expect(result.factors.mustHavePenalty).toBeCloseTo(0.3, 4);
    expect(result.factors.semanticSimilarity).toBe(0);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('la similitud semántica se acota a [0, 1]', () => {
    expect(computeMatch(aCandidate(), aJob(), 1.7).factors.semanticSimilarity).toBe(1);
    expect(computeMatch(aCandidate(), aJob(), -1).factors.semanticSimilarity).toBe(0);
  });
});

describe('computeMatch · seniority y preferencias', () => {
  it.each([
    ['lead', 1],
    ['senior', 1],
    ['mid', 0.5],
    ['junior', 0],
  ] as const)('candidato %s para vacante senior → seniorityFit %d', (seniority, expected) => {
    expect(computeMatch(aCandidate({ seniority }), aJob(), 0.5).factors.seniorityFit).toBe(expected);
  });

  it('seniority desconocida del candidato → 0.5 (neutral)', () => {
    expect(computeMatch(aCandidate({ seniority: null }), aJob(), 0.5).factors.seniorityFit).toBe(0.5);
  });

  it('modalidad no deseada reduce preferenceFit a 2/3', () => {
    const candidate = aCandidate({ preferredModalities: ['onsite'] });

    expect(computeMatch(candidate, aJob(), 0.5).factors.preferenceFit).toBeCloseTo(2 / 3, 4);
  });

  it('vacante presencial en otro país y salario menor al esperado', () => {
    const job = aJob({ modality: 'onsite', country: 'CO', salaryMax: 35000 });
    const candidate = aCandidate({ preferredModalities: ['onsite'], country: 'MX', salaryExpectation: 70000 });

    // modalidad 1, país 0, salario 35000/70000 = 0.5 → (1 + 0 + 0.5) / 3
    expect(computeMatch(candidate, job, 0.5).factors.preferenceFit).toBeCloseTo(0.5, 4);
  });
});

describe('computeMatch · ética', () => {
  it('ignora atributos protegidos aunque lleguen en la entrada', () => {
    const clean = aCandidate();
    const withProtected = {
      ...clean,
      gender: 'female',
      age: 52,
      maritalStatus: 'married',
      nationality: 'VE',
      photoUrl: 'https://example.com/p.png',
      address: 'Calle Falsa 123',
    } as unknown as MatchCandidate;

    expect(computeMatch(withProtected, aJob(), 0.7)).toEqual(computeMatch(clean, aJob(), 0.7));
  });
});

describe('computeMatch · radar, fortalezas, brechas y explicación', () => {
  it('agrupa por categoría con promedio ponderado (0–5, 1 decimal)', () => {
    const job = aJob({
      skills: [
        req('TypeScript', 'Lenguajes', 4, { weight: 2 }),
        req('Python', 'Lenguajes', 2, { weight: 1 }),
        req('AWS', 'Cloud', 3),
      ],
    });
    const candidate = aCandidate({ skills: [has('TypeScript', 'Lenguajes', 4), has('AWS', 'Cloud', 5)] });

    const { radar } = computeMatch(candidate, job, 0.5);

    expect(radar).toEqual([
      { axis: 'Lenguajes', required: 3.3, candidate: 2.7 },
      { axis: 'Cloud', required: 3, candidate: 5 },
    ]);
  });

  it('limita el radar a 8 ejes agrupando el resto en "Otros"', () => {
    const categories = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const job = aJob({ skills: categories.map((c, i) => req(`S${i}`, c, 3, { weight: 10 - i })) });

    const { radar } = computeMatch(aCandidate(), job, 0.5);

    expect(radar).toHaveLength(8);
    expect(radar.map((p) => p.axis)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'Otros']);
  });

  it('separa fortalezas y brechas; obligatorias primero en brechas', () => {
    const candidate = aCandidate({
      skills: [has('TypeScript', 'Lenguajes', 5), has('AWS', 'Cloud', 1)],
    });

    const result = computeMatch(candidate, aJob(), 0.5);

    expect(result.strengths).toEqual(['TypeScript']);
    expect(result.gaps[0]).toEqual({ skill: 'Node.js', required: 4, candidate: 0, mustHave: true });
    expect(result.gaps.map((g) => g.skill)).toEqual(['Node.js', 'PostgreSQL', 'AWS']);
  });

  it('genera una explicación determinista con fortalezas, brechas y obligatorias faltantes', () => {
    const candidate = aCandidate({
      skills: [has('TypeScript', 'Lenguajes', 4), has('PostgreSQL', 'Datos', 3), has('AWS', 'Cloud', 1)],
    });

    const result = computeMatch(candidate, aJob(), 0.5);

    expect(result.explanation).toContain('Cumples 2 de 4 skills requeridas');
    expect(result.explanation).toContain('Fortalezas: TypeScript, PostgreSQL');
    expect(result.explanation).toContain('AWS (requiere 3, tienes 1)');
    expect(result.explanation).toContain('Falta skill obligatoria: Node.js');
    expect(computeMatch(candidate, aJob(), 0.5).explanation).toBe(result.explanation);
  });
});
