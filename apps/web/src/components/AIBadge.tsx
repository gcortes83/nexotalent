import { useI18n } from '../i18n';

export function AIBadge({ children }: { children?: string }) {
  const { t } = useI18n();
  return <span className="ai-badge" title={t.ai.tooltip}>✦ {children ?? t.ai.badge}</span>;
}
