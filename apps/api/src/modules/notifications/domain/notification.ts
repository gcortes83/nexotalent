import type { ApplicationStatus } from '../../applications/domain/status.js';

export const NOTIFICATION_KINDS = ['selected', 'status_changed', 'job_closed'] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export interface Notification {
  id: string;
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** Datos para que el cliente redacte el aviso en el idioma del usuario (ES/EN). */
  data: { jobId?: string; applicationId?: string; status?: string; jobTitle?: string; organizationName?: string };
  readAt: Date | null;
  createdAt: Date;
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

/** Estatus que cuentan como "seleccionado" para el candidato (toast destacado + email). */
export const SELECTED_STATUSES: ApplicationStatus[] = ['shortlisted', 'offer', 'hired'];

/**
 * Mensaje para el candidato según el nuevo estatus. `email: true` cuando el cambio amerita correo
 * (selección, oferta, contratación o cierre del proceso); los pasos intermedios solo van in-app.
 */
export function statusChangeMessage(
  status: ApplicationStatus,
  jobTitle: string,
): { kind: NotificationKind; title: string; body: string; email: boolean } {
  switch (status) {
    case 'shortlisted':
      return { kind: 'selected', title: '¡Fuiste preseleccionado!', body: `Avanzaste en el proceso de «${jobTitle}». El equipo de reclutamiento te contactará para la entrevista.`, email: true };
    case 'offer':
      return { kind: 'selected', title: '¡Tienes una oferta!', body: `Recibiste una oferta para «${jobTitle}». Revisa los detalles con el reclutador.`, email: true };
    case 'hired':
      return { kind: 'selected', title: '¡Fuiste seleccionado!', body: `¡Felicidades! Quedaste seleccionado para «${jobTitle}».`, email: true };
    case 'rejected':
      return { kind: 'status_changed', title: 'Actualización de tu postulación', body: `El proceso de «${jobTitle}» continuará con otros perfiles. ¡Gracias por postularte!`, email: true };
    default:
      return { kind: 'status_changed', title: 'Tu postulación avanzó', body: `Tu postulación a «${jobTitle}» cambió de estatus.`, email: false };
  }
}

export const jobClosedMessage = (jobTitle: string, organizationName: string) => ({
  kind: 'job_closed' as const,
  title: 'Vacante cerrada',
  body: `${organizationName} cerró la vacante «${jobTitle}». Tu postulación queda en tu historial.`,
});
