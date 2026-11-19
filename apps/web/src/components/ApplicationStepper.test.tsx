import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { stepper } from '../test/fixtures';
import { ApplicationStepper } from './ApplicationStepper';

describe('ApplicationStepper', () => {
  it('muestra los 7 pasos y marca el actual con aria-current="step"', () => {
    render(<ApplicationStepper stepper={stepper('shortlisted')} />);
    const list = screen.getByRole('list', { name: 'Avance de tu postulación' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(7);
    expect(items[2]).toHaveAttribute('aria-current', 'step');
    expect(items[2]).toHaveTextContent('Preseleccionado');
    expect(items[0]).toHaveTextContent('(completado)');
    expect(items[3]).toHaveTextContent('(pendiente)');
  });

  it('muestra el estado terminal negativo y no celebra', () => {
    render(<ApplicationStepper stepper={stepper('in_review', 'rejected')} />);
    expect(screen.getByRole('status')).toHaveTextContent('No seleccionado');
    expect(screen.getAllByRole('listitem')[1]).toHaveClass('step--stopped');
  });

  it('cambia el paso actual al actualizar las props', () => {
    const { rerender } = render(<ApplicationStepper stepper={stepper('submitted')} />);
    expect(screen.getAllByRole('listitem')[0]).toHaveAttribute('aria-current', 'step');
    rerender(<ApplicationStepper stepper={stepper('interview_scheduled')} />);
    expect(screen.getAllByRole('listitem')[3]).toHaveAttribute('aria-current', 'step');
    expect(screen.getAllByRole('listitem')[0]).not.toHaveAttribute('aria-current');
  });
});
