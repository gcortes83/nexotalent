import type { Stepper } from '../api/types';
import { useI18n } from '../i18n';
import { formatDate } from './labels';

export interface ApplicationStepperProps {
  stepper: Stepper;
  orientation?: 'horizontal' | 'vertical';
}

/** Stepper del estatus de la postulación (HU-02 / TK-FE-021). */
export function ApplicationStepper({ stepper, orientation = 'horizontal' }: ApplicationStepperProps) {
  const { t } = useI18n();
  const negative = stepper.terminal === 'rejected' || stepper.terminal === 'withdrawn';
  return (
    <div className={`stepper stepper--${orientation}`}>
      <ol aria-label={t.stepper.aria}>
        {stepper.steps.map((s) => (
          <li
            key={s.key}
            className={`step step--${s.state}${negative && s.state === 'current' ? ' step--stopped' : ''}`}
            aria-current={s.state === 'current' ? 'step' : undefined}
          >
            <span className="step__dot" aria-hidden="true" />
            <span className="step__label">{t.status[s.key]}</span>
            {s.date && <time className="step__date" dateTime={s.date}>{formatDate(s.date)}</time>}
            <span className="sr-only">{s.state === 'done' ? t.stepper.done : s.state === 'current' ? t.stepper.current : t.stepper.pending}</span>
          </li>
        ))}
      </ol>
      {stepper.terminalLabel && stepper.terminal !== 'hired' && (
        <p className="badge badge--negative" role="status">{stepper.terminal ? t.status[stepper.terminal] : stepper.terminalLabel}</p>
      )}
      {stepper.terminal === 'hired' && <p className="badge badge--positive" role="status">{t.stepper.hired}</p>}
    </div>
  );
}
