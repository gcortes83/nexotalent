import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { descriptionExcerpt, JobDescription } from './JobDescription';

const TEXT = `## Sobre el rol
Construirás servicios. Te sumarás al equipo.

## Responsabilidades
- Diseñar APIs.
- Escribir pruebas.

## Requisitos
- TypeScript: nivel avanzado (4/5) · obligatorio.
Texto libre al final.`;

describe('JobDescription', () => {
  it('convierte secciones en encabezados, viñetas en listas y el resto en párrafos', () => {
    render(<JobDescription text={TEXT} />);
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Sobre el rol', 'Responsabilidades', 'Requisitos']);
    const lists = screen.getAllByRole('list');
    expect(within(lists[0]!).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Diseñar APIs.', 'Escribir pruebas.']);
    expect(screen.getByText('Texto libre al final.').tagName).toBe('P');
  });

  it('una descripción simple (sin formato) se muestra como párrafo y no interpreta HTML', () => {
    render(<JobDescription text={'Vacante de QA <script>alert(1)</script>'} />);
    expect(screen.getByText('Vacante de QA <script>alert(1)</script>')).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });

  it('el extracto es el primer párrafo', () => {
    expect(descriptionExcerpt(TEXT)).toBe('Construirás servicios. Te sumarás al equipo.');
    expect(descriptionExcerpt('- solo viñeta')).toBe('');
  });
});
