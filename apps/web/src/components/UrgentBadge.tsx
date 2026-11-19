import { useI18n } from '../i18n';

/** Llama (SVG propio, hereda el color con currentColor). */
export function FlameIcon({ size = 14 }: { size?: number }) {
  return (
    <svg className="flame-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M13.5 1.6c.3 2.5-.6 4.3-2 5.9-1.3 1.5-3 2.9-3.8 5-.4-1-.4-2.2 0-3.3C5.6 10.8 4 13.4 4 16.2 4 20.5 7.6 23 12 23s8-2.6 8-6.8c0-3-1.5-5.3-3-7.2-.3 1.2-1 2.2-2 2.8.4-3.7-.5-7.4-1.5-10.2Zm-1.2 19.2c-2 0-3.5-1.3-3.5-3.2 0-1.6 1-2.7 2.2-3.8.3 1 .9 1.7 1.8 2.1-.1-1.4.4-2.6 1.3-3.7.9 1.3 1.9 2.8 1.9 4.7 0 2.2-1.6 3.9-3.7 3.9Z"
      />
    </svg>
  );
}

/** Marca de vacante urgente («hot»). `compact` muestra solo el ícono (con nombre accesible). */
export function UrgentBadge({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <span className={`urgent-badge${compact ? ' urgent-badge--compact' : ''}`} title={t.urgent.title} aria-label={compact ? t.urgent.compact : undefined}>
      <FlameIcon />
      {!compact && <span>{t.urgent.badge}</span>}
    </span>
  );
}
