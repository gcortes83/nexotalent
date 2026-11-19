import type { Deps } from '../../../ports.js';
import { NotFoundError } from '../../../shared/errors.js';
import { newId } from '../../../shared/ids.js';
import type { Notification, NotificationKind } from '../domain/notification.js';

export interface NotifyInput {
  kind: NotificationKind;
  title: string;
  body: string;
  data?: Notification['data'];
  /** También enviar por correo (además de in-app). */
  email: boolean;
}

/**
 * Notifica a un usuario in-app y, si aplica, por correo. El correo es "best effort":
 * un fallo del proveedor nunca revierte la acción de negocio que lo originó.
 */
export async function notifyUser(deps: Deps, userId: string, input: NotifyInput): Promise<Notification> {
  const now = deps.clock.now();
  const n: Notification = {
    id: newId('ntf', now.getTime()),
    userId,
    kind: input.kind,
    title: input.title,
    body: input.body,
    data: input.data ?? {},
    readAt: null,
    createdAt: now,
  };
  await deps.notifications.create(n);
  if (input.email) {
    const user = await deps.users.getById(userId);
    if (user) {
      await deps.email
        .send({ to: user.email, subject: `NexoTalent · ${input.title}`, text: `Hola ${user.fullName}:\n\n${input.body}\n\n— NexoTalent AI` })
        .catch(() => undefined);
    }
  }
  return n;
}

export const toNotificationView = (n: Notification) => ({
  ...n,
  readAt: n.readAt?.toISOString() ?? null,
  createdAt: n.createdAt.toISOString(),
});

export async function listMyNotifications(deps: Deps, userId: string, unreadOnly = false) {
  const [items, unreadCount] = await Promise.all([
    deps.notifications.listByUser(userId, { unreadOnly, limit: 50 }),
    deps.notifications.countUnread(userId),
  ]);
  return { items: items.map(toNotificationView), unreadCount };
}

export async function markNotificationRead(deps: Deps, userId: string, id: string) {
  if (!(await deps.notifications.markRead(id, userId, deps.clock.now()))) throw new NotFoundError('Notificación');
}

export async function markAllNotificationsRead(deps: Deps, userId: string) {
  await deps.notifications.markAllRead(userId, deps.clock.now());
}
