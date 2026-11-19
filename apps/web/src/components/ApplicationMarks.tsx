import type { ApplicationStatus } from '../api/types';
import { useI18n } from '../i18n';

export const SELECTED_STATUSES: ApplicationStatus[] = ['shortlisted', 'offer', 'hired'];

/** Marcas visibles en la lista de vacantes aplicadas: seleccionado y vacante cerrada. */
export function ApplicationMarks({ status, jobStatus }: { status: ApplicationStatus; jobStatus?: string | null }) {
  const { t } = useI18n();
  const selected = SELECTED_STATUSES.includes(status);
  const closed = jobStatus === 'closed';
  if (!selected && !closed) return null;
  return (
    <span className="row marks">
      {selected && <span className="badge badge--positive">{t.marks.selected(t.status[status])}</span>}
      {closed && <span className="badge badge--negative">{t.marks.closed}</span>}
    </span>
  );
}
