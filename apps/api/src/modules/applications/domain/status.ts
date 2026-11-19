/**
 * Estados de la postulación (docs/07-api.md ApplicationStatus) — fuente única en código.
 */
export const APPLICATION_STATUSES = [
  'submitted',
  'in_review',
  'shortlisted',
  'interview_scheduled',
  'interview_done',
  'offer',
  'hired',
  'rejected',
  'withdrawn',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Estados que un reclutador puede fijar con PATCH /v1/applications/{id}/status. */
export const RECRUITER_SETTABLE_STATUSES = [
  'in_review',
  'shortlisted',
  'interview_scheduled',
  'interview_done',
  'offer',
  'hired',
  'rejected',
] as const satisfies readonly ApplicationStatus[];
export type RecruiterSettableStatus = (typeof RECRUITER_SETTABLE_STATUSES)[number];

export type Actor = { kind: 'recruiter' | 'candidate' | 'system'; userId: string };

export const TERMINAL_STATUSES: readonly ApplicationStatus[] = ['hired', 'rejected', 'withdrawn'];
export const ACTIVE_STATUSES: readonly ApplicationStatus[] = APPLICATION_STATUSES.filter(
  (s) => !TERMINAL_STATUSES.includes(s),
);

/** Avances del pipeline (sin rejected/withdrawn, que se tratan aparte). */
const FORWARD: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  submitted: ['in_review'],
  in_review: ['shortlisted'],
  shortlisted: ['interview_scheduled'],
  interview_scheduled: ['interview_done', 'shortlisted'],
  interview_done: ['offer'],
  offer: ['hired'],
  hired: [],
  rejected: [],
  withdrawn: [],
};

/** Transiciones que puede hacer una automatización (MVP: ninguna; v2: webhook de Calendly). */
const SYSTEM_ALLOWED: ReadonlyArray<[ApplicationStatus, ApplicationStatus]> = [
  ['shortlisted', 'interview_scheduled'],
  ['interview_scheduled', 'shortlisted'],
];

export const isTerminal = (s: ApplicationStatus): boolean => TERMINAL_STATUSES.includes(s);

export function canTransition(from: ApplicationStatus, to: ApplicationStatus, actor: Actor): boolean {
  if (isTerminal(from) || from === to) return false;
  switch (actor.kind) {
    case 'candidate':
      return to === 'withdrawn';
    case 'recruiter':
      return to === 'rejected' || FORWARD[from].includes(to);
    case 'system':
      return SYSTEM_ALLOWED.some(([f, t]) => f === from && t === to);
  }
}
