/**
 * Máquina de estados de la postulación (openspec/specs/applications-pipeline).
 * Tests escritos antes de la implementación (TDD).
 */
import { describe, expect, it } from 'vitest';
import {
  APPLICATION_STATUSES,
  canTransition,
  type Actor,
  type ApplicationStatus,
} from '../../src/modules/applications/domain/status.js';

const recruiter: Actor = { kind: 'recruiter', userId: 'usr_rec' };
const candidate: Actor = { kind: 'candidate', userId: 'usr_cand' };
const system: Actor = { kind: 'system', userId: 'system' };

describe('canTransition · reclutador', () => {
  it.each<[ApplicationStatus, ApplicationStatus]>([
    ['submitted', 'in_review'],
    ['in_review', 'shortlisted'],
    ['shortlisted', 'interview_scheduled'],
    ['interview_scheduled', 'interview_done'],
    ['interview_scheduled', 'shortlisted'], // entrevista cancelada
    ['interview_done', 'offer'],
    ['offer', 'hired'],
    ['submitted', 'rejected'],
    ['offer', 'rejected'],
  ])('permite %s → %s', (from, to) => {
    expect(canTransition(from, to, recruiter)).toBe(true);
  });

  it.each<[ApplicationStatus, ApplicationStatus]>([
    ['hired', 'in_review'],
    ['rejected', 'shortlisted'],
    ['withdrawn', 'in_review'],
    ['submitted', 'offer'], // no se salta etapas
    ['submitted', 'hired'],
    ['in_review', 'withdrawn'], // retirar es exclusivo del candidato
    ['in_review', 'in_review'],
  ])('rechaza %s → %s', (from, to) => {
    expect(canTransition(from, to, recruiter)).toBe(false);
  });
});

describe('canTransition · candidato', () => {
  it.each<ApplicationStatus>(['submitted', 'in_review', 'shortlisted', 'interview_scheduled', 'interview_done', 'offer'])(
    'puede retirarse desde %s',
    (from) => {
      expect(canTransition(from, 'withdrawn', candidate)).toBe(true);
    },
  );

  it('no puede avanzar su propia postulación', () => {
    expect(canTransition('submitted', 'in_review', candidate)).toBe(false);
  });

  it('no puede retirarse de un estado terminal', () => {
    expect(canTransition('hired', 'withdrawn', candidate)).toBe(false);
  });
});

describe('canTransition · sistema (automatizaciones)', () => {
  it('solo humanos pasan a rejected o hired', () => {
    expect(canTransition('offer', 'hired', system)).toBe(false);
    expect(canTransition('in_review', 'rejected', system)).toBe(false);
  });

  it('el sistema puede reflejar una entrevista agendada o cancelada (v2: webhook de Calendly)', () => {
    expect(canTransition('shortlisted', 'interview_scheduled', system)).toBe(true);
    expect(canTransition('interview_scheduled', 'shortlisted', system)).toBe(true);
  });
});

it('los estados terminales no tienen salida para nadie', () => {
  for (const terminal of ['hired', 'rejected', 'withdrawn'] as const) {
    for (const to of APPLICATION_STATUSES) {
      for (const actor of [recruiter, candidate, system]) {
        expect(canTransition(terminal, to, actor)).toBe(false);
      }
    }
  }
});
