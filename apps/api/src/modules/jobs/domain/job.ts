import type { MatchJob, Modality, RequiredSkill, Seniority } from '../../matching/domain/types.js';

/** docs/01-vision-producto.md §6. En el MVP el pago está simulado (`paid_simulated`). */
export const JOB_STATUSES = ['draft', 'pending_payment', 'published', 'on_hold', 'filled', 'cancelled', 'expired', 'closed'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/** Origen de la vacante (docs/04-integraciones.md). */
export const JOB_SOURCES = ['manual', 'seed', 'csv', 'json', 'pdf'] as const;
export type JobSource = (typeof JOB_SOURCES)[number];

/** Estados desde los que el empleador puede cerrar (soft delete) una vacante. */
export const CLOSABLE_STATUSES: JobStatus[] = ['draft', 'pending_payment', 'published', 'on_hold'];
/** Estados en los que el empleador aún puede editar la vacante. */
export const EDITABLE_STATUSES: JobStatus[] = ['draft', 'published', 'on_hold'];

export interface Job {
  id: string;
  organizationId: string;
  organizationName: string;
  title: string;
  description: string;
  status: JobStatus;
  seniority: Seniority;
  modality: Modality;
  country: string;
  city: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  positionsTotal: number;
  positionsFilled: number;
  applicantsCount: number;
  skills: RequiredSkill[];
  embedding: number[] | null;
  publishedAt: Date | null;
  updatedAt: Date;
  /** Cierre lógico: la fila nunca se borra. */
  closedAt: Date | null;
  sourceType: JobSource;
  /** Id en el sistema de origen; único por organización (upsert al reimportar). */
  externalId: string | null;
  /** Contratación urgente («hot»): el empleador la destaca con 🔥 en el catálogo. */
  urgent: boolean;
}

export const positionsAvailable = (j: Pick<Job, 'positionsTotal' | 'positionsFilled'>): number =>
  Math.max(0, j.positionsTotal - j.positionsFilled);

export const toMatchJob = (j: Job): MatchJob => ({
  id: j.id,
  seniority: j.seniority,
  modality: j.modality,
  country: j.country,
  salaryMax: j.salaryMax,
  skills: j.skills,
});
