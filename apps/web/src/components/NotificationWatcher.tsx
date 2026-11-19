import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { api } from '../api/client';
import type { AppNotification } from '../api/types';
import { useSession } from '../auth/session';
import { type Dict, useI18n } from '../i18n';
import { type ToastTone, useToast } from './Toast';

const TONE: Record<AppNotification['kind'], ToastTone> = { selected: 'success', job_closed: 'warning', status_changed: 'info' };

/**
 * Redacta el aviso en el idioma activo a partir del tipo y los datos de la notificación.
 * Si faltan datos (notificaciones antiguas), usa el texto guardado por la API.
 */
export function localizeNotification(n: AppNotification, t: Dict): { title: string; body: string } {
  const job = n.data.jobTitle;
  if (!job) return { title: n.title, body: n.body };
  if (n.kind === 'job_closed') return { title: t.notifications.jobClosed.title, body: t.notifications.jobClosed.body(job, n.data.organizationName ?? '') };
  const s = n.data.status;
  if (s === 'shortlisted' || s === 'offer' || s === 'hired') {
    const m = t.notifications.selected[s];
    return { title: m.title, body: m.body(job) };
  }
  if (s === 'rejected') return { title: t.notifications.rejected.title, body: t.notifications.rejected.body(job) };
  return { title: t.notifications.advanced.title, body: t.notifications.advanced.body(job) };
}

/**
 * Consulta las notificaciones no leídas del usuario y las muestra como toast una sola vez.
 * Al mostrarse se marcan como leídas y se refrescan el dashboard y el perfil (marcas en la lista).
 * En v2 el polling se reemplaza por WebSocket (docs/05-eventos-notificaciones.md).
 */
export function NotificationWatcher({ intervalMs = 10_000 }: { intervalMs?: number }) {
  const { user } = useSession();
  const { show } = useToast();
  const { t } = useI18n();
  const qc = useQueryClient();
  const shown = useRef(new Set<string>());

  const unread = useQuery({
    queryKey: ['notifications', 'unread', user?.id],
    queryFn: () => api.notifications(true),
    enabled: !!user,
    refetchInterval: intervalMs,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    const fresh = (unread.data?.items ?? []).filter((n) => !shown.current.has(n.id)).reverse();
    if (!fresh.length) return;
    for (const n of fresh) {
      shown.current.add(n.id);
      show({
        ...localizeNotification(n, t),
        tone: TONE[n.kind],
        link: user?.role === 'candidate' ? { to: '/c/profile#postulaciones', label: t.notifications.seeApplications } : undefined,
        duration: n.kind === 'status_changed' ? 6000 : 12_000,
      });
      void api.markNotificationRead(n.id).catch(() => undefined);
    }
    qc.invalidateQueries({ queryKey: ['candidate-dashboard'] });
  }, [unread.data, show, qc, user?.role, t]);

  return null;
}
