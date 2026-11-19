import type { StatusChange } from './application.js';
import { isTerminal, type ApplicationStatus } from './status.js';

export const STEPPER_STEPS = [
  { key: 'submitted', label: 'Postulado' },
  { key: 'in_review', label: 'En revisión' },
  { key: 'shortlisted', label: 'Preseleccionado' },
  { key: 'interview_scheduled', label: 'Entrevista agendada' },
  { key: 'interview_done', label: 'Entrevista realizada' },
  { key: 'offer', label: 'Oferta' },
  { key: 'hired', label: 'Contratado' },
] as const satisfies readonly { key: ApplicationStatus; label: string }[];

export type StepState = 'done' | 'current' | 'upcoming';

export interface StepperView {
  steps: { key: ApplicationStatus; label: string; state: StepState; date: string | null }[];
  current: ApplicationStatus;
  terminal: 'rejected' | 'withdrawn' | 'hired' | null;
  terminalLabel: string | null;
}

const TERMINAL_LABEL = { rejected: 'No seleccionado', withdrawn: 'Retirado por ti', hired: 'Contratado' } as const;

/**
 * Proyección del historial al stepper de docs/01 §6. Las cancelaciones de entrevista
 * (interview_scheduled → shortlisted) regresan el paso actual.
 */
export function toStepper(status: ApplicationStatus, history: StatusChange[]): StepperView {
  const order = STEPPER_STEPS.map((s) => s.key) as ApplicationStatus[];
  const lastDate = new Map<ApplicationStatus, Date>();
  for (const h of history) lastDate.set(h.to, h.at);

  // Último paso del pipeline alcanzado (si el estado es terminal negativo, el anterior a él).
  let reached: ApplicationStatus = status;
  if (status === 'rejected' || status === 'withdrawn') {
    const before = [...history].reverse().find((h) => order.includes(h.to) && h.to !== status);
    reached = before?.to ?? 'submitted';
  }
  const currentIdx = order.indexOf(reached);

  return {
    steps: STEPPER_STEPS.map((s, i) => ({
      key: s.key,
      label: s.label,
      state: i < currentIdx || (i === currentIdx && status === 'hired') ? 'done' : i === currentIdx ? 'current' : 'upcoming',
      date: i <= currentIdx ? (lastDate.get(s.key)?.toISOString() ?? null) : null,
    })),
    current: reached,
    terminal: isTerminal(status) ? (status as 'rejected' | 'withdrawn' | 'hired') : null,
    terminalLabel: isTerminal(status) ? TERMINAL_LABEL[status as keyof typeof TERMINAL_LABEL] : null,
  };
}
