import type { ApplicationStatus } from '../api/types';
import { currentDict } from '../i18n';

/** Siguientes estatus permitidos para el reclutador (espejo de la máquina de estados del backend). */
export const NEXT_STATUSES: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
  submitted: ['in_review', 'rejected'],
  in_review: ['shortlisted', 'rejected'],
  shortlisted: ['interview_scheduled', 'rejected'],
  interview_scheduled: ['interview_done', 'shortlisted', 'rejected'],
  interview_done: ['offer', 'rejected'],
  offer: ['hired', 'rejected'],
};

/** Fecha corta en el idioma activo (13 nov · Nov 13). */
export const formatDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat(currentDict().locale, { day: 'numeric', month: 'short' }).format(new Date(iso)) : '';

/** Moneda única de los salarios de las vacantes: dólares estadounidenses (mensual). */
export const JOB_CURRENCY = 'USD';

/** US$5,500 para dólares (sin ambigüedad con el peso, que también usa "$"); otras monedas con su símbolo. */
export const formatMoney = (n: number, currency: string = JOB_CURRENCY) => {
  const value = new Intl.NumberFormat(currentDict().locale, { style: 'currency', currency, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 }).format(n);
  return currency === 'USD' ? `US${value}` : value;
};
