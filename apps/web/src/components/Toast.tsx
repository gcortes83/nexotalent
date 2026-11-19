import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useI18n } from '../i18n';

export type ToastTone = 'success' | 'info' | 'warning';
export interface ToastInput {
  title: string;
  body?: string;
  tone?: ToastTone;
  link?: { to: string; label: string };
  /** ms; 0 = no se cierra solo. */
  duration?: number;
  onClose?: () => void;
}
interface ToastItem extends ToastInput {
  id: number;
}

const ToastContext = createContext<{ show: (t: ToastInput) => void } | null>(null);

const ICON: Record<ToastTone, string> = { success: '🎉', info: '✦', warning: '⚠' };

/** Toasts accesibles: región aria-live, cierre manual y automático. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((list) => {
      list.find((t) => t.id === id)?.onClose?.();
      return list.filter((t) => t.id !== id);
    });
  }, []);

  const show = useCallback(
    (t: ToastInput) => {
      const id = ++seq.current;
      setItems((list) => [...list.slice(-3), { ...t, id }]);
      const duration = t.duration ?? 8000;
      if (duration > 0) setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ show }), [show]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="region" aria-label={t.notifications.region} aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className={`toast toast--${item.tone ?? 'info'}`} data-testid="toast">
            <span className="toast__icon" aria-hidden>{ICON[item.tone ?? 'info']}</span>
            <div className="toast__content">
              <strong>{item.title}</strong>
              {item.body && <p>{item.body}</p>}
              {item.link && <Link to={item.link.to} onClick={() => dismiss(item.id)}>{item.link.label}</Link>}
            </div>
            <button className="toast__close" aria-label={t.notifications.closeToast} onClick={() => dismiss(item.id)}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast fuera de ToastProvider');
  return ctx;
}
