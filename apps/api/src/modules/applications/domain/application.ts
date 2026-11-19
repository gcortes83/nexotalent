import type { Actor, ApplicationStatus } from './status.js';

export interface StatusChange {
  from: ApplicationStatus | null;
  to: ApplicationStatus;
  actor: Actor;
  reason: string | null;
  at: Date;
}

export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  organizationId: string;
  status: ApplicationStatus;
  /** Concurrencia optimista: ETag/If-Match. */
  version: number;
  matchScore: number | null;
  createdAt: Date;
  statusChangedAt: Date;
  history: StatusChange[];
}

export const STALE_DAYS = { warning: 3, escalation: 5 } as const;

/** Días completos desde el último cambio de estatus (0 si terminal). */
export function staleDays(app: Pick<Application, 'statusChangedAt'>, now: Date): number {
  return Math.floor((now.getTime() - app.statusChangedAt.getTime()) / 86_400_000);
}
