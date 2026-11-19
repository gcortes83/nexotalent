import { useI18n } from '../i18n';

export function MatchScoreRing({ percent, size = 96, label }: { percent: number; size?: number; label?: string }) {
  const { t } = useI18n();
  label ??= t.match.label;
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  const r = 42;
  const c = 2 * Math.PI * r;
  const tone = value >= 75 ? 'high' : value >= 50 ? 'mid' : 'low';
  return (
    <div className={`ring ring--${tone}`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label={`${label}: ${value}%`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        <circle cx="50" cy="50" r={r} className="ring__track" />
        <circle cx="50" cy="50" r={r} className="ring__value" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} transform="rotate(-90 50 50)" />
      </svg>
      <span className="ring__text">
        <strong>{value}%</strong>
        <small>{label}</small>
      </span>
    </div>
  );
}
