import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MatchScoreRing } from './MatchScoreRing';
import { SkillRadarChart } from './SkillRadarChart';

describe('SkillRadarChart', () => {
  it('expone una tabla accesible con requerido vs. candidato por eje', () => {
    render(<SkillRadarChart data={[{ axis: 'Lenguajes', required: 4, candidate: 5 }, { axis: 'Cloud', required: 3, candidate: 0 }]} />);
    const table = screen.getByRole('table', { name: /vacante vs\. tú/i });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(within(rows[2]!).getByRole('rowheader')).toHaveTextContent('Cloud');
    expect(within(rows[2]!).getAllByRole('cell').map((c) => c.textContent)).toEqual(['3', '0']);
  });

  it('estado vacío sin romper', () => {
    render(<SkillRadarChart data={[]} />);
    expect(screen.getByText(/no tiene skills requeridas/i)).toBeInTheDocument();
  });
});

describe('MatchScoreRing', () => {
  it.each([
    [82.4, '82', 'ring--high'],
    [55, '55', 'ring--mid'],
    [-3, '0', 'ring--low'],
    [140, '100', 'ring--high'],
  ])('%s → %s%% (%s)', (input, shown, tone) => {
    render(<MatchScoreRing percent={input} />);
    const meter = screen.getByRole('meter');
    expect(meter).toHaveAttribute('aria-valuenow', shown);
    expect(meter).toHaveClass(tone);
  });
});
