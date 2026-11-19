import { describe, expect, it } from 'vitest';
import type { StatusChange } from '../../src/modules/applications/domain/application.js';
import type { ApplicationStatus } from '../../src/modules/applications/domain/status.js';
import { toStepper } from '../../src/modules/applications/domain/stepper.js';

const hist = (...path: ApplicationStatus[]): StatusChange[] =>
  path.map((to, i) => ({
    from: i ? path[i - 1]! : null,
    to,
    actor: { kind: 'recruiter', userId: 'u' },
    reason: null,
    at: new Date(Date.UTC(2026, 10, 1 + i)),
  }));

describe('toStepper', () => {
  it('marca done/current/upcoming con fechas de los pasos alcanzados', () => {
    const v = toStepper('shortlisted', hist('submitted', 'in_review', 'shortlisted'));
    expect(v.steps.map((s) => s.state)).toEqual(['done', 'done', 'current', 'upcoming', 'upcoming', 'upcoming', 'upcoming']);
    expect(v.steps[2]!.date).toBe('2026-11-03T00:00:00.000Z');
    expect(v.steps[3]!.date).toBeNull();
    expect(v.terminal).toBeNull();
  });

  it('rechazado: se queda en el último paso alcanzado y marca terminal', () => {
    const v = toStepper('rejected', hist('submitted', 'in_review', 'rejected'));
    expect(v.current).toBe('in_review');
    expect(v.terminal).toBe('rejected');
    expect(v.terminalLabel).toBe('No seleccionado');
  });

  it('retirado desde submitted', () => {
    const v = toStepper('withdrawn', hist('submitted', 'withdrawn'));
    expect(v.current).toBe('submitted');
    expect(v.terminalLabel).toBe('Retirado por ti');
  });

  it('entrevista cancelada regresa a preseleccionado', () => {
    const v = toStepper('shortlisted', hist('submitted', 'in_review', 'shortlisted', 'interview_scheduled', 'shortlisted'));
    expect(v.current).toBe('shortlisted');
    expect(v.steps[3]!.state).toBe('upcoming');
  });

  it('contratado: todos los pasos done', () => {
    const v = toStepper('hired', hist('submitted', 'in_review', 'shortlisted', 'interview_scheduled', 'interview_done', 'offer', 'hired'));
    expect(v.steps.every((s) => s.state === 'done')).toBe(true);
    expect(v.terminal).toBe('hired');
  });
});
