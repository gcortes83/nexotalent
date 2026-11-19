import { describe, expect, it } from 'vitest';
import {
  csvToRecords,
  CSV_TEMPLATE,
  jsonToRecords,
  normalizeModality,
  normalizeSeniority,
  parseCsv,
  parseSkillsCell,
  splitPdfText,
} from '../../src/modules/jobs/domain/job-import.js';
import { statusChangeMessage } from '../../src/modules/notifications/domain/notification.js';
import { hashPassword, PASSWORD_RULE, verifyPassword } from '../../src/shared/password.js';

describe('password (scrypt)', () => {
  it('verifica la contraseña correcta y rechaza la incorrecta o un hash corrupto', () => {
    const h = hashPassword('Secreta123');
    expect(h).toMatch(/^scrypt\$/);
    expect(verifyPassword('Secreta123', h)).toBe(true);
    expect(verifyPassword('secreta123', h)).toBe(false);
    expect(verifyPassword('Secreta123', 'md5$abc')).toBe(false);
    expect(verifyPassword('Secreta123', null)).toBe(false);
  });

  it('usa sal aleatoria (mismo texto → hashes distintos)', () => {
    expect(hashPassword('Secreta123')).not.toBe(hashPassword('Secreta123'));
  });

  it('política: 8+ caracteres con letras y números', () => {
    expect(PASSWORD_RULE.test('abc12345')).toBe(true);
    expect(PASSWORD_RULE.test('abcdefgh')).toBe(false);
    expect(PASSWORD_RULE.test('12345678')).toBe(false);
    expect(PASSWORD_RULE.test('ab1')).toBe(false);
  });
});

describe('CSV', () => {
  it('respeta comillas, comas y saltos de línea dentro de campos, y comillas escapadas', () => {
    const rows = parseCsv('a,b,c\r\n"x, y","línea 1\nlínea 2","dice ""hola"""\n\n');
    expect(rows).toEqual([['a', 'b', 'c'], ['x, y', 'línea 1\nlínea 2', 'dice "hola"']]);
  });

  it('skills "Nombre:nivel:must"', () => {
    expect(parseSkillsCell('TypeScript:4:must; Node.js:3 | AWS')).toEqual([
      { name: 'TypeScript', level: 4, mustHave: true },
      { name: 'Node.js', level: 3, mustHave: false },
      { name: 'AWS', level: 3, mustHave: false },
    ]);
  });

  it('la plantilla produce registros completos', () => {
    const [first, second] = csvToRecords(CSV_TEMPLATE);
    expect(first).toMatchObject({ externalId: 'REQ-001', title: 'Backend Engineer Node.js', seniority: 'senior', salaryMax: 5500, currency: 'USD', positionsTotal: 2 });
    expect(first!.skills).toHaveLength(3);
    expect(second).toMatchObject({ city: 'Ciudad de México', modality: 'hybrid' });
  });
});

describe('JSON CanonicalJob', () => {
  it('acepta un objeto, un arreglo o { jobs } y aplana location/salary', () => {
    const one = { externalId: 'X1', title: 'QA', location: { country: 'MX', modality: 'remote' }, salary: { min: 1, max: 2, currency: 'USD' }, positions: 2, skills: ['SQL'] };
    expect(jsonToRecords(one)[0]).toMatchObject({ country: 'MX', modality: 'remote', salaryMax: 2, currency: 'USD', positionsTotal: 2, skills: [{ name: 'SQL', level: 3 }] });
    expect(jsonToRecords([one, one])).toHaveLength(2);
    expect(jsonToRecords({ jobs: [one] })).toHaveLength(1);
  });
});

describe('PDF → vacantes', () => {
  it('separa por "Vacante:" y lee campos conocidos', () => {
    const text = `Ofertas de Retail Ejemplo
Vacante: Desarrollador Java
Nivel: Semi Senior
Modalidad: Presencial
Salario: $40,000 - 55,000 MXN
Posiciones: 2
Buscamos experiencia con Java y Spring Boot.
Vacante: Analista BI
Modalidad: remoto
Reportes con SQL y Power BI.`;
    const [a, b] = splitPdfText(text);
    expect(a).toMatchObject({ title: 'Desarrollador Java', seniority: 'Semi Senior', modality: 'Presencial', salaryMin: 40000, salaryMax: 55000, currency: 'MXN', positionsTotal: 2 });
    expect(a!.description).toContain('Spring Boot');
    expect(b).toMatchObject({ title: 'Analista BI', modality: 'remoto' });
  });

  it('sin marcadores, la primera línea es el título', () => {
    expect(splitPdfText('\nData Engineer\nPipelines con Python.')).toEqual([expect.objectContaining({ title: 'Data Engineer', description: 'Pipelines con Python.' })]);
    expect(splitPdfText('   ')).toEqual([]);
  });

  it('normaliza nivel y modalidad en español', () => {
    expect(normalizeSeniority('Semi Senior')).toBe('mid');
    expect(normalizeSeniority('Líder')).toBe('lead');
    expect(normalizeModality('Presencial')).toBe('onsite');
    expect(normalizeModality('Híbrido')).toBe('hybrid');
  });
});

describe('mensajes de notificación', () => {
  it('preselección, oferta y contratación son "selected" con email; pasos intermedios solo in-app', () => {
    expect(statusChangeMessage('shortlisted', 'QA')).toMatchObject({ kind: 'selected', email: true });
    expect(statusChangeMessage('hired', 'QA')).toMatchObject({ kind: 'selected', email: true });
    expect(statusChangeMessage('rejected', 'QA')).toMatchObject({ kind: 'status_changed', email: true });
    expect(statusChangeMessage('in_review', 'QA')).toMatchObject({ kind: 'status_changed', email: false });
  });
});

describe('importación: marca de urgente', () => {
  it('CSV (columna urgent), JSON (urgent/hot) y PDF (campo o palabra URGENTE en el título)', () => {
    const [a, b] = csvToRecords(CSV_TEMPLATE);
    expect(a!.urgent).toBe(true);
    expect(b!.urgent).toBe(false);
    expect(jsonToRecords([{ title: 'X', hot: true }, { title: 'Y', urgent: 'sí' }, { title: 'Z' }]).map((r) => r.urgent)).toEqual([true, true, false]);
    const [p1, p2] = splitPdfText('Vacante: Cajero (URGENTE)\nAtención.\nVacante: Gerente\nUrgente: sí\nLiderazgo.');
    expect(p1).toMatchObject({ title: 'Cajero', urgent: true });
    expect(p2).toMatchObject({ title: 'Gerente', urgent: true });
  });
});
