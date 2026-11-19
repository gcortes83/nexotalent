/**
 * Datos 100 % sintéticos (dominio example.com) para demo, desarrollo y tests.
 * Sustituyen en el MVP a la ingesta de vacantes (CSV/PDF/API → v2) y permiten
 * probar el match de punta a punta. Ticket: TK-DATA-001 (docs/14-tickets-trabajo.md).
 */
import type { Application } from '../modules/applications/domain/application.js';
import type { ApplicationStatus } from '../modules/applications/domain/status.js';
import type { Candidate, CandidateSkillRecord } from '../modules/candidates/domain/candidate.js';
import type { Skill } from '../modules/candidates/domain/skill.js';
import type { Organization, User } from '../modules/identity/domain/user.js';
import { hashPassword } from '../shared/password.js';
import { describeJob } from './job-descriptions.js';
import type { Job } from '../modules/jobs/domain/job.js';
import { hashEmbedding, profileText } from '../modules/matching/domain/embedding.js';
import type { Modality, RequiredSkill, Seniority } from '../modules/matching/domain/types.js';

export type { Organization };

/** Contraseña de todas las cuentas sembradas (solo desarrollo/demo). */
export const DEMO_PASSWORD = 'Demo1234';
let demoHash: string | null = null;
/** Se calcula una sola vez por proceso (scrypt es deliberadamente lento). */
export const demoPasswordHash = (): string => (demoHash ??= hashPassword(DEMO_PASSWORD));

export interface SeedData {
  organizations: Organization[];
  users: User[];
  /** userId → hash de contraseña. */
  passwordHashes: Record<string, string>;
  skills: Skill[];
  jobs: Job[];
  candidates: Candidate[];
  applications: Application[];
}

const TAXONOMY: [string, string, string[]][] = [
  ['TypeScript', 'Lenguajes', ['TS']],
  ['JavaScript', 'Lenguajes', ['JS', 'ECMAScript']],
  ['Python', 'Lenguajes', []],
  ['Java', 'Lenguajes', []],
  ['Go', 'Lenguajes', ['Golang']],
  ['SQL', 'Lenguajes', []],
  ['Node.js', 'Frameworks', ['Node', 'NodeJS']],
  ['React', 'Frameworks', ['React.js', 'ReactJS']],
  ['Fastify', 'Frameworks', []],
  ['Spring Boot', 'Frameworks', ['Spring']],
  ['Django', 'Frameworks', []],
  ['GraphQL', 'Frameworks', []],
  ['Vue.js', 'Frameworks', ['Vue', 'VueJS']],
  ['Angular', 'Frameworks', ['AngularJS']],
  ['AWS', 'Cloud', ['Amazon Web Services']],
  ['Docker', 'Cloud', ['contenedores']],
  ['Kubernetes', 'Cloud', ['K8s']],
  ['Terraform', 'Cloud', []],
  ['PostgreSQL', 'Datos', ['Postgres']],
  ['Redis', 'Datos', ['Valkey']],
  ['Pandas', 'Datos', []],
  ['Machine Learning', 'Datos', ['ML', 'aprendizaje automático']],
  ['Power BI', 'Datos', []],
  ['MongoDB', 'Datos', ['Mongo']],
  ['Git', 'Herramientas', ['GitHub', 'GitLab']],
  ['Figma', 'Herramientas', []],
  ['Jira', 'Herramientas', []],
  ['CI/CD', 'Herramientas', ['integración continua', 'despliegue continuo', 'GitHub Actions']],
  ['Testing automatizado', 'Herramientas', ['Vitest', 'Jest', 'Playwright', 'TDD']],
  ['Comunicación', 'Soft skills', ['comunicación efectiva']],
  ['Liderazgo', 'Soft skills', ['liderazgo de equipos']],
  ['Trabajo en equipo', 'Soft skills', ['colaboración']],
  ['Resolución de problemas', 'Soft skills', ['problem solving', 'solución de problemas']],
  ['Adaptabilidad', 'Soft skills', ['flexibilidad', 'adaptación al cambio']],
  ['Pensamiento crítico', 'Soft skills', ['pensamiento analítico', 'critical thinking']],
  ['Orientación al cliente', 'Soft skills', ['servicio al cliente', 'customer focus']],
  ['Gestión del tiempo', 'Soft skills', ['organización', 'time management']],
  ['Negociación', 'Soft skills', ['negotiation']],
  ['Empatía', 'Soft skills', ['empathy', 'escucha activa']],
  ['Inglés', 'Idiomas', ['English']],
  ['Pagos y fintech', 'Dominio', ['fintech', 'pagos']],
  ['E-commerce', 'Dominio', ['comercio electrónico', 'retail']],
];

const slug = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

export const SEED_PASSWORDLESS_NOTE = 'Login de demo sin contraseña (DEMO_AUTH=true). Cognito en v2.';

/** Introducción de las 8 vacantes del núcleo (el resto de la descripción la arma describeJob). */
const CORE_INTROS: Record<string, string> = {
  job_backend_node: 'Construirás los servicios que procesan pagos y cuentas de miles de usuarios cada día.',
  job_frontend_react: 'Darás forma a la app web con la que nuestros clientes administran su dinero.',
  job_data_scientist: 'Desarrollarás modelos de riesgo y recomendación con explicabilidad y control de sesgo.',
  job_platform: 'Serás responsable de la plataforma en la nube sobre la que corren todos nuestros productos.',
  job_java_retail: 'Mantendrás y evolucionarás los sistemas de inventario y pedidos de nuestras tiendas.',
  job_bi_retail: 'Ayudarás a las áreas comerciales a decidir con tableros claros y datos confiables.',
  job_fullstack_retail: 'Construirás funcionalidades de la tienda en línea de punta a punta.',
  job_lead_retail: 'Liderarás al equipo que impulsa la estrategia de comercio digital de la compañía.',
};

/** Vacantes sembradas marcadas como urgentes («hot»). */
const URGENT_SEED_JOBS = new Set(['job_platform', 'job_java_retail', 'job_salud_ml', 'job_log_sre', 'job_edtech_front_jr', 'job_log_java_jr']);

/** Total de vacantes publicadas del catálogo de demo. */
export const SEED_PUBLISHED_JOBS = 100;

type ReqFn = (name: string, level: number, weight?: number, mustHave?: boolean) => RequiredSkill;
type RoleSpec = { title: string; seniority: Seniority; salary: [number, number]; skills: [string, number, boolean?][]; about: string };

/** 24 roles × 3 empresas = 72 vacantes generadas de forma determinista (sin aleatoriedad: pruebas estables). */
const GENERATED_ROLES: RoleSpec[] = [
  { title: 'Desarrollador Backend Node.js', seniority: 'mid', salary: [3000, 4000], skills: [['Node.js', 4, true], ['TypeScript', 3, true], ['PostgreSQL', 3], ['Docker', 2]], about: 'Construye y mantiene APIs REST y servicios internos.' },
  { title: 'Desarrollador Backend Node.js Sr.', seniority: 'senior', salary: [4500, 5800], skills: [['Node.js', 5, true], ['TypeScript', 4, true], ['AWS', 3], ['Redis', 3], ['Testing automatizado', 3]], about: 'Diseña servicios escalables y guía buenas prácticas de ingeniería.' },
  { title: 'Desarrollador Frontend React', seniority: 'mid', salary: [2800, 3700], skills: [['React', 4, true], ['TypeScript', 3], ['Testing automatizado', 2], ['Figma', 2]], about: 'Crea interfaces accesibles y rápidas para clientes web.' },
  { title: 'Desarrollador Frontend React Jr.', seniority: 'junior', salary: [1300, 1800], skills: [['React', 3, true], ['JavaScript', 3, true], ['Git', 2]], about: 'Aprende junto a un equipo senior construyendo componentes reutilizables.' },
  { title: 'Ingeniero Full-stack', seniority: 'mid', salary: [3200, 4200], skills: [['TypeScript', 4, true], ['React', 3], ['Node.js', 3], ['PostgreSQL', 3]], about: 'Entrega funcionalidades de punta a punta, del diseño a producción.' },
  { title: 'Ingeniero de Datos', seniority: 'senior', salary: [4200, 5500], skills: [['Python', 4, true], ['SQL', 4, true], ['AWS', 3], ['Pandas', 3]], about: 'Construye pipelines confiables y modelos de datos para analítica.' },
  { title: 'Analista de Datos', seniority: 'mid', salary: [2200, 3000], skills: [['SQL', 4, true], ['Power BI', 3], ['Python', 2], ['Comunicación', 3]], about: 'Convierte datos en tableros y recomendaciones para el negocio.' },
  { title: 'Analista de Datos Jr.', seniority: 'junior', salary: [1200, 1600], skills: [['SQL', 3, true], ['Power BI', 2], ['Comunicación', 3]], about: 'Prepara reportes recurrentes y aprende modelado de datos.' },
  { title: 'Científico de Datos', seniority: 'senior', salary: [4800, 6200], skills: [['Python', 5, true], ['Machine Learning', 4, true], ['SQL', 3], ['Pandas', 4]], about: 'Desarrolla modelos predictivos con métricas de impacto y sesgo.' },
  { title: 'Ingeniero de Machine Learning', seniority: 'senior', salary: [5200, 6800], skills: [['Python', 5, true], ['Machine Learning', 4, true], ['Docker', 3], ['Kubernetes', 2]], about: 'Lleva modelos a producción con monitoreo y despliegue continuo.' },
  { title: 'Ingeniero DevOps', seniority: 'mid', salary: [3400, 4500], skills: [['Docker', 4, true], ['AWS', 3, true], ['Terraform', 3], ['Git', 3]], about: 'Automatiza la entrega de software y la infraestructura en la nube.' },
  { title: 'SRE Sr.', seniority: 'senior', salary: [5000, 6400], skills: [['Kubernetes', 4, true], ['AWS', 4, true], ['Terraform', 4], ['Go', 2]], about: 'Garantiza disponibilidad con SLOs, observabilidad y respuesta a incidentes.' },
  { title: 'Arquitecto de Software', seniority: 'lead', salary: [7000, 8800], skills: [['Liderazgo', 4, true], ['AWS', 4, true], ['Node.js', 3], ['Inglés', 4]], about: 'Define la arquitectura y acompaña a los equipos en decisiones técnicas.' },
  { title: 'Tech Lead', seniority: 'lead', salary: [6500, 8200], skills: [['Liderazgo', 4, true], ['TypeScript', 4], ['Comunicación', 4, true], ['Inglés', 3]], about: 'Lidera un equipo de producto y su crecimiento profesional.' },
  { title: 'QA Engineer', seniority: 'mid', salary: [2300, 3100], skills: [['Testing automatizado', 4, true], ['JavaScript', 3], ['Jira', 2], ['Git', 2]], about: 'Asegura la calidad con pruebas automatizadas y exploratorias.' },
  { title: 'QA Analyst Jr.', seniority: 'junior', salary: [1100, 1500], skills: [['Testing automatizado', 2, true], ['Jira', 2], ['Comunicación', 3]], about: 'Diseña casos de prueba y reporta defectos con claridad.' },
  { title: 'Desarrollador Java', seniority: 'mid', salary: [2800, 3800], skills: [['Java', 4, true], ['Spring Boot', 4, true], ['SQL', 3], ['Git', 3]], about: 'Mantiene y evoluciona servicios críticos del negocio.' },
  { title: 'Desarrollador Python (Django)', seniority: 'mid', salary: [2700, 3600], skills: [['Python', 4, true], ['Django', 4, true], ['PostgreSQL', 3], ['Docker', 2]], about: 'Desarrolla aplicaciones web y APIs con Django.' },
  { title: 'Desarrollador Go', seniority: 'senior', salary: [4500, 5800], skills: [['Go', 4, true], ['PostgreSQL', 3], ['Kubernetes', 3], ['Redis', 3]], about: 'Construye servicios de alto rendimiento y baja latencia.' },
  { title: 'Product Designer UX/UI', seniority: 'mid', salary: [2500, 3400], skills: [['Figma', 4, true], ['Comunicación', 4, true], ['Trabajo en equipo', 3]], about: 'Investiga, diseña y prueba experiencias centradas en las personas.' },
  { title: 'Product Manager', seniority: 'senior', salary: [4500, 6000], skills: [['Comunicación', 5, true], ['Liderazgo', 3], ['Jira', 3], ['Inglés', 3]], about: 'Define la estrategia del producto con datos y clientes.' },
  { title: 'Scrum Master', seniority: 'mid', salary: [2500, 3300], skills: [['Jira', 4, true], ['Comunicación', 4, true], ['Trabajo en equipo', 4]], about: 'Facilita equipos ágiles y la mejora continua.' },
  { title: 'Soporte Técnico N2', seniority: 'junior', salary: [900, 1300], skills: [['SQL', 2, true], ['Comunicación', 3, true], ['Trabajo en equipo', 3]], about: 'Resuelve incidentes de usuarios y documenta soluciones.' },
  { title: 'Ingeniero de Seguridad Cloud', seniority: 'senior', salary: [5000, 6500], skills: [['AWS', 4, true], ['Terraform', 3], ['Kubernetes', 3], ['Inglés', 3]], about: 'Protege la infraestructura con controles, monitoreo y respuesta a amenazas.' },
];

const GENERATED_ORGS: { org: string; slug: string; domain: string }[] = [
  { org: 'org_banca', slug: 'banca', domain: 'banca digital' },
  { org: 'org_agro', slug: 'agro', domain: 'agricultura de precisión' },
  { org: 'org_turismo', slug: 'turismo', domain: 'reservas de viajes' },
];

const LOCATIONS: { country: string; city: string | null; modality: Modality }[] = [
  { country: 'MX', city: null, modality: 'remote' },
  { country: 'MX', city: 'Ciudad de México', modality: 'hybrid' },
  { country: 'MX', city: 'Guadalajara', modality: 'onsite' },
  { country: 'CO', city: null, modality: 'remote' },
  { country: 'MX', city: 'Monterrey', modality: 'hybrid' },
  { country: 'AR', city: 'Buenos Aires', modality: 'hybrid' },
  { country: 'MX', city: 'Mérida', modality: 'onsite' },
  { country: 'CL', city: null, modality: 'remote' },
  { country: 'MX', city: 'Querétaro', modality: 'hybrid' },
  { country: 'PE', city: 'Lima', modality: 'onsite' },
  { country: 'MX', city: 'Puebla', modality: 'onsite' },
  { country: 'ES', city: null, modality: 'remote' },
];

/** Soft skills que se reparten entre las vacantes generadas. */
const SOFT_POOL = ['Comunicación', 'Resolución de problemas', 'Trabajo en equipo', 'Adaptabilidad', 'Pensamiento crítico', 'Orientación al cliente', 'Gestión del tiempo', 'Empatía', 'Negociación', 'Liderazgo'];

function generatedJobs(organizations: Organization[], req: ReqFn, daysAgo: (d: number) => Date): Job[] {
  const jobs: Job[] = [];
  GENERATED_ORGS.forEach((o, oi) => {
    const organizationName = organizations.find((x) => x.id === o.org)!.name;
    GENERATED_ROLES.forEach((r, ri) => {
      const i = oi * GENERATED_ROLES.length + ri;
      const loc = LOCATIONS[(ri * 5 + oi * 7) % LOCATIONS.length]!;
      const bump = (oi * 3 + ri) % 4 * 100; // variación salarial entre empresas
      const skills = r.skills.map(([n, l, must]) => req(n, l, must ? 2 : 1, !!must));
      // Soft skills opcionales: 2 de cada 3 vacantes generadas las piden (1 o 2), el resto no.
      if (i % 3 !== 0) {
        const wanted = [SOFT_POOL[i % SOFT_POOL.length]!, ...(i % 2 ? [SOFT_POOL[(i + 3) % SOFT_POOL.length]!] : [])];
        for (const name of wanted) if (!skills.some((s) => s.name === name)) skills.push(req(name, 3 + (i % 2)));
      }
      const days = ((i * 7) % 29) + 1;
      jobs.push({
        id: `job_${o.slug}_${String(ri + 1).padStart(2, '0')}`,
        organizationId: o.org,
        organizationName,
        title: r.title,
        description: r.about,
        status: 'published',
        seniority: r.seniority,
        modality: loc.modality,
        country: loc.country,
        city: loc.city,
        salaryMin: r.salary[0] + bump,
        salaryMax: r.salary[1] + bump,
        currency: 'USD',
        positionsTotal: 1 + (i % 3),
        positionsFilled: 0,
        applicantsCount: 0,
        skills,
        embedding: hashEmbedding(profileText(r.title, skills)),
        publishedAt: daysAgo(days),
        updatedAt: daysAgo(days),
        closedAt: null,
        sourceType: 'seed',
        externalId: null,
        urgent: i % 6 === 2,
      });
    });
  });
  return jobs;
}

export function buildSeed(now: Date): SeedData {
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);
  const skills: Skill[] = TAXONOMY.map(([name, category, aliases]) => ({ id: `sk_${slug(name)}`, name, category, aliases }));
  const skill = (name: string) => {
    const s = skills.find((x) => x.name === name);
    if (!s) throw new Error(`Skill desconocida en seed: ${name}`);
    return s;
  };
  const req = (name: string, level: number, weight = 1, mustHave = false): RequiredSkill => {
    const s = skill(name);
    return { skillId: s.id, name: s.name, category: s.category, level, weight, mustHave };
  };

  const organizations: Organization[] = [
    { id: 'org_fintech', name: 'Fintech Ejemplo S.A.' },
    { id: 'org_retail', name: 'Retail Ejemplo S.A.' },
    { id: 'org_salud', name: 'Salud Digital Ejemplo S.A.' },
    { id: 'org_logistica', name: 'Logística Ejemplo S.A. de C.V.' },
    { id: 'org_edtech', name: 'EdTech Ejemplo S.A.S.' },
    { id: 'org_banca', name: 'Banca Digital Ejemplo S.A.' },
    { id: 'org_agro', name: 'AgroTech Ejemplo S.A.' },
    { id: 'org_turismo', name: 'Turismo Ejemplo S.A. de C.V.' },
  ];

  const users: User[] = [
    { id: 'usr_ana', email: 'candidata@example.com', fullName: 'Ana Ejemplo', role: 'candidate', organizationId: null },
    { id: 'usr_luis', email: 'candidato@example.com', fullName: 'Luis Prueba', role: 'candidate', organizationId: null },
    { id: 'usr_sofia', email: 'nueva@example.com', fullName: 'Sofía Demo', role: 'candidate', organizationId: null },
    { id: 'usr_valeria', email: 'valeria@example.com', fullName: 'Valeria Datos', role: 'candidate', organizationId: null },
    { id: 'usr_diego', email: 'diego@example.com', fullName: 'Diego Nube', role: 'candidate', organizationId: null },
    { id: 'usr_mariana', email: 'mariana@example.com', fullName: 'Mariana Diseño', role: 'candidate', organizationId: null },
    { id: 'usr_jorge', email: 'jorge@example.com', fullName: 'Jorge Interfaz', role: 'candidate', organizationId: null },
    { id: 'usr_rec', email: 'reclutador@example.com', fullName: 'Rubén Reclutador', role: 'recruiter', organizationId: 'org_fintech' },
    { id: 'usr_rec2', email: 'reclutadora@example.com', fullName: 'Rita Retail', role: 'recruiter', organizationId: 'org_retail' },
    { id: 'usr_rec_salud', email: 'salud@example.com', fullName: 'Sara Salud', role: 'recruiter', organizationId: 'org_salud' },
    { id: 'usr_rec_logistica', email: 'logistica@example.com', fullName: 'Leo Logística', role: 'recruiter', organizationId: 'org_logistica' },
    { id: 'usr_rec_edtech', email: 'edtech@example.com', fullName: 'Eva EdTech', role: 'recruiter', organizationId: 'org_edtech' },
    { id: 'usr_rec_banca', email: 'banca@example.com', fullName: 'Bruno Banca', role: 'recruiter', organizationId: 'org_banca' },
    { id: 'usr_rec_agro', email: 'agro@example.com', fullName: 'Alma Agro', role: 'recruiter', organizationId: 'org_agro' },
    { id: 'usr_rec_turismo', email: 'turismo@example.com', fullName: 'Tomás Turismo', role: 'recruiter', organizationId: 'org_turismo' },
    { id: 'usr_admin', email: 'admin@example.com', fullName: 'Admin NexoTalent', role: 'platform_admin', organizationId: null },
  ];

  type JobSpec = [string, string, string, Seniority, Modality, string, number, number, RequiredSkill[], number?];
  const jobSpecs: JobSpec[] = [
    ['job_backend_node', 'org_fintech', 'Backend Engineer Node.js', 'senior', 'remote', 'MX', 5500, 2,
      [req('TypeScript', 4, 2, true), req('Node.js', 4, 2, true), req('PostgreSQL', 3), req('AWS', 3), req('Testing automatizado', 3), req('Inglés', 3)]],
    ['job_frontend_react', 'org_fintech', 'Frontend Engineer React', 'mid', 'hybrid', 'MX', 4000, 1,
      [req('React', 4, 2, true), req('TypeScript', 3, 2), req('Testing automatizado', 3), req('Figma', 2), req('Comunicación', 3)]],
    ['job_data_scientist', 'org_fintech', 'Data Scientist', 'senior', 'remote', 'MX', 6000, 1,
      [req('Python', 4, 2, true), req('Machine Learning', 4, 2, true), req('Pandas', 4), req('SQL', 3), req('Pagos y fintech', 2)]],
    ['job_platform', 'org_fintech', 'Platform Engineer (AWS)', 'senior', 'remote', 'MX', 6500, 1,
      [req('AWS', 4, 2, true), req('Terraform', 4, 2), req('Kubernetes', 3), req('Docker', 4), req('Go', 2), req('Liderazgo', 2)]],
    ['job_java_retail', 'org_retail', 'Desarrollador Java Spring', 'mid', 'onsite', 'MX', 3500, 3,
      [req('Java', 4, 2, true), req('Spring Boot', 4, 2, true), req('SQL', 3), req('Git', 3), req('E-commerce', 2)]],
    ['job_bi_retail', 'org_retail', 'Analista BI', 'junior', 'hybrid', 'MX', 2000, 2,
      [req('SQL', 3, 2, true), req('Power BI', 3, 2), req('Python', 2), req('Comunicación', 3)]],
    ['job_fullstack_retail', 'org_retail', 'Full-stack JavaScript', 'mid', 'remote', 'CO', 3200, 1,
      [req('JavaScript', 4, 2, true), req('React', 3), req('Node.js', 3), req('PostgreSQL', 2), req('E-commerce', 2), req('Trabajo en equipo', 3)]],
    ['job_lead_retail', 'org_retail', 'Tech Lead E-commerce', 'lead', 'hybrid', 'MX', 8000, 1,
      [req('Liderazgo', 4, 2, true), req('Node.js', 4), req('AWS', 3), req('E-commerce', 4, 2), req('Inglés', 4)]],
  ];

  const jobs: Job[] = jobSpecs.map(([id, org, title, seniority, modality, country, salaryMax, positions, reqs]) => ({
    id,
    organizationId: org,
    organizationName: organizations.find((o) => o.id === org)!.name,
    title,
    description: CORE_INTROS[id] ?? '',
    status: 'published',
    seniority,
    modality,
    country,
    city: modality === 'remote' ? null : 'Ciudad de México',
    salaryMin: Math.round((salaryMax * 0.75) / 100) * 100,
    salaryMax,
    currency: 'USD',
    positionsTotal: positions,
    positionsFilled: 0,
    applicantsCount: 0,
    skills: reqs,
    embedding: hashEmbedding(profileText(title, reqs)),
    publishedAt: daysAgo(10),
    updatedAt: daysAgo(10),
    closedAt: null,
    sourceType: 'seed',
    externalId: null,
    urgent: URGENT_SEED_JOBS.has(id),
  }));
  jobs.push({ ...jobs[0]!, id: 'job_draft', title: 'Vacante en borrador', status: 'draft', publishedAt: null });

  // Salarios: mensuales, en USD (moneda única de la plataforma).
  // 20 vacantes adicionales en otras empresas, países y fechas (catálogo más realista para búsqueda y filtros).
  type ExtraSpec = {
    id: string; org: string; title: string; seniority: Seniority; modality: Modality; country: string; city: string | null;
    salary: [number, number]; positions: number; days: number; reqs: RequiredSkill[]; about: string;
  };
  const extra: ExtraSpec[] = [
    { id: 'job_salud_data_eng', org: 'org_salud', title: 'Ingeniero de Datos Clínicos', seniority: 'senior', modality: 'hybrid', country: 'MX', city: 'Monterrey',
      salary: [4000, 5000], positions: 1, days: 2, reqs: [req('Python', 4, 2, true), req('SQL', 4, 2, true), req('PostgreSQL', 3), req('AWS', 3), req('Pandas', 3)],
      about: 'Diseña pipelines de datos clínicos anonimizados y modelos de datos para analítica de pacientes.' },
    { id: 'job_salud_django', org: 'org_salud', title: 'Desarrollador Backend Python (Django)', seniority: 'mid', modality: 'remote', country: 'MX', city: null,
      salary: [2800, 3600], positions: 2, days: 1, reqs: [req('Python', 4, 2, true), req('Django', 4, 2, true), req('PostgreSQL', 3), req('Docker', 3), req('Git', 3)],
      about: 'Construye APIs para la plataforma de citas médicas y expedientes digitales.' },
    { id: 'job_salud_qa', org: 'org_salud', title: 'QA Automation Engineer', seniority: 'mid', modality: 'remote', country: 'MX', city: null,
      salary: [2300, 3000], positions: 1, days: 5, reqs: [req('Testing automatizado', 4, 2, true), req('TypeScript', 3), req('Git', 3), req('Jira', 2), req('Comunicación', 3)],
      about: 'Automatiza pruebas E2E y de API con Playwright en un equipo ágil de producto.' },
    { id: 'job_salud_ux', org: 'org_salud', title: 'Product Designer (UX/UI)', seniority: 'mid', modality: 'hybrid', country: 'MX', city: 'Guadalajara',
      salary: [2500, 3200], positions: 1, days: 3, reqs: [req('Figma', 4, 2, true), req('Comunicación', 4, 2, true), req('Trabajo en equipo', 3), req('Inglés', 3)],
      about: 'Diseña experiencias accesibles para pacientes y personal médico, desde la investigación hasta el prototipo.' },
    { id: 'job_salud_ml', org: 'org_salud', title: 'Machine Learning Engineer', seniority: 'senior', modality: 'remote', country: 'MX', city: null,
      salary: [5500, 7000], positions: 1, days: 7, reqs: [req('Python', 5, 2, true), req('Machine Learning', 4, 2, true), req('Docker', 3), req('Kubernetes', 2), req('AWS', 3), req('Inglés', 3)],
      about: 'Lleva modelos de triaje a producción con monitoreo de sesgo y explicabilidad.' },
    { id: 'job_salud_analyst', org: 'org_salud', title: 'Analista de Datos Jr.', seniority: 'junior', modality: 'onsite', country: 'MX', city: 'Querétaro',
      salary: [1300, 1600], positions: 2, days: 12, reqs: [req('SQL', 3, 2, true), req('Power BI', 3), req('Python', 2), req('Comunicación', 3)],
      about: 'Prepara reportes operativos y tableros para las clínicas de la red.' },
    { id: 'job_salud_em', org: 'org_salud', title: 'Engineering Manager', seniority: 'lead', modality: 'hybrid', country: 'MX', city: 'Ciudad de México',
      salary: [7000, 8500], positions: 1, days: 15, reqs: [req('Liderazgo', 5, 2, true), req('Comunicación', 4, 2, true), req('Node.js', 3), req('AWS', 3), req('Inglés', 4)],
      about: 'Lidera dos equipos de producto y acompaña el crecimiento profesional de 10 personas.' },
    { id: 'job_log_sre', org: 'org_logistica', title: 'SRE / DevOps Engineer', seniority: 'senior', modality: 'remote', country: 'MX', city: null,
      salary: [5000, 6200], positions: 1, days: 4, reqs: [req('Kubernetes', 4, 2, true), req('Terraform', 4, 2, true), req('AWS', 4), req('Docker', 4), req('Go', 2)],
      about: 'Opera la plataforma de rastreo de envíos 24/7 con SLOs, observabilidad e infraestructura como código.' },
    { id: 'job_log_go', org: 'org_logistica', title: 'Desarrollador Go', seniority: 'mid', modality: 'remote', country: 'MX', city: null,
      salary: [3400, 4200], positions: 2, days: 6, reqs: [req('Go', 4, 2, true), req('PostgreSQL', 3), req('Redis', 3), req('Docker', 3), req('Git', 3)],
      about: 'Desarrolla microservicios de ruteo y asignación de flotillas en tiempo real.' },
    { id: 'job_log_java_jr', org: 'org_logistica', title: 'Desarrollador Java Backend Jr.', seniority: 'junior', modality: 'onsite', country: 'MX', city: 'Monterrey',
      salary: [1400, 1900], positions: 3, days: 9, reqs: [req('Java', 3, 2, true), req('Spring Boot', 2), req('SQL', 3), req('Git', 2)],
      about: 'Primer empleo o trainee: mantenimiento del sistema de almacenes con mentoría diaria.' },
    { id: 'job_log_scrum', org: 'org_logistica', title: 'Scrum Master', seniority: 'mid', modality: 'hybrid', country: 'MX', city: 'Ciudad de México',
      salary: [2600, 3300], positions: 1, days: 11, reqs: [req('Jira', 4, 2, true), req('Comunicación', 4, 2, true), req('Liderazgo', 3), req('Trabajo en equipo', 4)],
      about: 'Facilita tres equipos de desarrollo y mejora continua del flujo de entrega.' },
    { id: 'job_log_architect', org: 'org_logistica', title: 'Arquitecto Cloud AWS', seniority: 'lead', modality: 'remote', country: 'MX', city: null,
      salary: [7800, 9200], positions: 1, days: 20, reqs: [req('AWS', 5, 2, true), req('Terraform', 4), req('Kubernetes', 4), req('Liderazgo', 3), req('Inglés', 4)],
      about: 'Define la arquitectura multi-cuenta y la estrategia de costos de la nube.' },
    { id: 'job_log_support', org: 'org_logistica', title: 'Soporte de Aplicaciones (Nivel 2)', seniority: 'junior', modality: 'onsite', country: 'MX', city: 'Guadalajara',
      salary: [1000, 1300], positions: 2, days: 25, reqs: [req('SQL', 2, 2, true), req('Git', 2), req('Comunicación', 3), req('Trabajo en equipo', 3)],
      about: 'Atiende incidentes de usuarios internos y documenta soluciones en la base de conocimiento.' },
    { id: 'job_edtech_front_jr', org: 'org_edtech', title: 'Frontend Developer React Jr.', seniority: 'junior', modality: 'remote', country: 'CO', city: null,
      salary: [1400, 1800], positions: 2, days: 1, reqs: [req('React', 3, 2, true), req('JavaScript', 3, 2, true), req('Git', 2), req('Testing automatizado', 2)],
      about: 'Construye componentes de la plataforma de cursos en línea junto a desarrolladores senior.' },
    { id: 'job_edtech_fullstack', org: 'org_edtech', title: 'Full-stack TypeScript', seniority: 'mid', modality: 'hybrid', country: 'CO', city: 'Bogotá',
      salary: [3000, 3800], positions: 1, days: 2, reqs: [req('TypeScript', 4, 2, true), req('React', 4), req('Node.js', 4), req('PostgreSQL', 3)],
      about: 'Desarrolla de punta a punta el aula virtual: editor de lecciones, evaluaciones y progreso.' },
    { id: 'job_edtech_analyst', org: 'org_edtech', title: 'Data Analyst (Learning Analytics)', seniority: 'mid', modality: 'remote', country: 'AR', city: null,
      salary: [2200, 2800], positions: 1, days: 8, reqs: [req('SQL', 4, 2, true), req('Python', 3), req('Pandas', 3), req('Power BI', 3)],
      about: 'Mide el aprendizaje y la retención de estudiantes para mejorar los cursos.' },
    { id: 'job_edtech_backend', org: 'org_edtech', title: 'Backend Engineer Node.js + Redis', seniority: 'senior', modality: 'remote', country: 'CL', city: null,
      salary: [4600, 5700], positions: 1, days: 3, reqs: [req('Node.js', 4, 2, true), req('TypeScript', 4, 2, true), req('Redis', 4), req('PostgreSQL', 3), req('Docker', 3)],
      about: 'Escala el motor de clases en vivo y la mensajería en tiempo real.' },
    { id: 'job_edtech_web', org: 'org_edtech', title: 'Mobile-first Web Developer', seniority: 'mid', modality: 'onsite', country: 'PE', city: 'Lima',
      salary: [2100, 2600], positions: 1, days: 14, reqs: [req('JavaScript', 4, 2, true), req('React', 3), req('Figma', 2), req('Testing automatizado', 2)],
      about: 'Optimiza la experiencia móvil y el rendimiento en conexiones lentas.' },
    { id: 'job_edtech_lead', org: 'org_edtech', title: 'Líder Técnico de Plataforma', seniority: 'lead', modality: 'remote', country: 'ES', city: null,
      salary: [8000, 9500], positions: 1, days: 6, reqs: [req('Liderazgo', 4, 2, true), req('Inglés', 4, 2, true), req('Kubernetes', 4), req('AWS', 4), req('Comunicación', 4)],
      about: 'Guía la evolución técnica de la plataforma para la expansión a Europa.' },
    { id: 'job_edtech_payments', org: 'org_edtech', title: 'Especialista en Pagos (Fintech)', seniority: 'senior', modality: 'hybrid', country: 'CO', city: 'Medellín',
      salary: [4200, 5200], positions: 1, days: 10, reqs: [req('Pagos y fintech', 4, 2, true), req('Java', 3), req('SQL', 3), req('Inglés', 3)],
      about: 'Integra pasarelas de pago y suscripciones para estudiantes de toda Latinoamérica.' },
  ];
  for (const e of extra) {
    const organizationName = organizations.find((o) => o.id === e.org)!.name;
    jobs.push({
      id: e.id,
      organizationId: e.org,
      organizationName,
      title: e.title,
      description: e.about,
      status: 'published',
      seniority: e.seniority,
      modality: e.modality,
      country: e.country,
      city: e.city,
      salaryMin: e.salary[0],
      salaryMax: e.salary[1],
      currency: 'USD',
      positionsTotal: e.positions,
      positionsFilled: 0,
      applicantsCount: 0,
      skills: e.reqs,
      embedding: hashEmbedding(profileText(e.title, e.reqs)),
      publishedAt: daysAgo(e.days),
      updatedAt: daysAgo(e.days),
      closedAt: null,
      sourceType: 'seed',
      externalId: null,
      urgent: URGENT_SEED_JOBS.has(e.id),
    });
  }

  jobs.push(...generatedJobs(organizations, req, daysAgo));

  // Descripciones detalladas: la descripción corta inicial se usa como introducción de «Sobre el rol».
  for (const j of jobs) j.description = describeJob(j, j.description || undefined);

  const has = (name: string, level: number, confirmed = true): CandidateSkillRecord => {
    const s = skill(name);
    return { skillId: s.id, name: s.name, category: s.category, level, confirmed, source: 'declared', evidence: null };
  };
  const candidate = (
    id: string,
    userId: string,
    headline: string | null,
    seniority: Seniority | null,
    prefs: Modality[],
    salary: number | null,
    skillList: CandidateSkillRecord[],
  ): Candidate => ({
    id,
    userId,
    fullName: users.find((u) => u.id === userId)!.fullName,
    headline,
    seniority,
    country: 'MX',
    preferredModalities: prefs,
    salaryExpectation: salary,
    resumeText: null,
    skills: skillList,
    embedding: skillList.some((s) => s.confirmed) ? hashEmbedding(profileText(headline, skillList.filter((s) => s.confirmed))) : null,
    updatedAt: daysAgo(7),
  });

  const candidates: Candidate[] = [
    candidate('cand_ana', 'usr_ana', 'Backend developer TypeScript', 'senior', ['remote', 'hybrid'], 4500, [
      // Técnicas
      has('TypeScript', 5), has('Node.js', 4), has('PostgreSQL', 3), has('AWS', 2), has('Docker', 3), has('Git', 4), has('Inglés', 3),
      has('Fastify', 4), has('Testing automatizado', 4), has('Redis', 3), has('GraphQL', 3), has('CI/CD', 3),
      // Soft skills
      has('Comunicación', 4), has('Resolución de problemas', 5), has('Trabajo en equipo', 4), has('Pensamiento crítico', 4), has('Liderazgo', 3),
    ]),
    candidate('cand_luis', 'usr_luis', 'Desarrollador Java', 'mid', ['onsite', 'hybrid'], 3000, [
      // Técnicas
      has('Java', 4), has('Spring Boot', 3), has('SQL', 3), has('Git', 3), has('PostgreSQL', 3),
      has('Docker', 2), has('JavaScript', 2), has('Testing automatizado', 3), has('MongoDB', 2), has('Jira', 3),
      // Soft skills
      has('Trabajo en equipo', 4), has('Comunicación', 3), has('Adaptabilidad', 4), has('Orientación al cliente', 4), has('Gestión del tiempo', 3),
    ]),
    candidate('cand_sofia', 'usr_sofia', null, null, [], null, []),
    // Candidatos registrados adicionales: skills técnicas + soft skills (datos sintéticos).
    candidate('cand_valeria', 'usr_valeria', 'Analista de datos con foco en negocio', 'senior', ['remote', 'hybrid'], 3200, [
      has('SQL', 5), has('Python', 4), has('Pandas', 4), has('Power BI', 4), has('Machine Learning', 2), has('Git', 3),
      has('Comunicación', 5), has('Pensamiento crítico', 4), has('Orientación al cliente', 3),
    ]),
    candidate('cand_diego', 'usr_diego', 'DevOps / SRE en la nube', 'senior', ['remote'], 5200, [
      has('AWS', 4), has('Docker', 5), has('Kubernetes', 4), has('Terraform', 4), has('CI/CD', 4), has('Go', 2), has('Git', 4),
      has('Resolución de problemas', 5), has('Trabajo en equipo', 4), has('Adaptabilidad', 3),
    ]),
    candidate('cand_mariana', 'usr_mariana', 'Product designer UX/UI', 'mid', ['hybrid', 'remote'], 2900, [
      has('Figma', 5), has('React', 2), has('JavaScript', 2), has('Inglés', 4),
      has('Empatía', 5), has('Comunicación', 4), has('Trabajo en equipo', 4), has('Gestión del tiempo', 3),
    ]),
    candidate('cand_jorge', 'usr_jorge', 'Frontend developer React y Vue', 'mid', ['remote', 'hybrid'], 3300, [
      has('React', 4), has('TypeScript', 4), has('JavaScript', 4), has('Vue.js', 3), has('Testing automatizado', 3), has('Git', 4),
      has('Comunicación', 4), has('Liderazgo', 3), has('Negociación', 3),
    ]),
  ];

  const app = (
    id: string,
    jobId: string,
    candidateId: string,
    path: ApplicationStatus[],
    lastChangeDaysAgo: number,
    matchScore: number,
  ): Application => {
    const job = jobs.find((j) => j.id === jobId)!;
    const created = daysAgo(lastChangeDaysAgo + path.length);
    const history = path.map((to, i) => ({
      from: i === 0 ? null : path[i - 1]!,
      to,
      actor: i === 0 ? { kind: 'candidate' as const, userId: candidates.find((c) => c.id === candidateId)!.userId } : { kind: 'recruiter' as const, userId: 'usr_rec' },
      reason: null,
      at: i === path.length - 1 ? daysAgo(lastChangeDaysAgo) : daysAgo(lastChangeDaysAgo + path.length - i),
    }));
    return {
      id,
      jobId,
      candidateId,
      organizationId: job.organizationId,
      status: path.at(-1)!,
      version: path.length,
      matchScore,
      createdAt: created,
      statusChangedAt: daysAgo(lastChangeDaysAgo),
      history,
    };
  };

  const applications: Application[] = [
    app('app_ana_frontend', 'job_frontend_react', 'cand_ana', ['submitted', 'in_review', 'shortlisted'], 1, 0.62),
    app('app_ana_platform', 'job_platform', 'cand_ana', ['submitted'], 4, 0.55),
    app('app_luis_java', 'job_java_retail', 'cand_luis', ['submitted', 'in_review'], 6, 0.81),
    // Postulaciones recientes (no estancadas) de los candidatos adicionales.
    app('app_valeria_banca', 'job_banca_07', 'cand_valeria', ['submitted', 'in_review'], 1, 0.78),
    app('app_valeria_agro', 'job_agro_06', 'cand_valeria', ['submitted'], 0, 0.71),
    app('app_diego_turismo', 'job_turismo_11', 'cand_diego', ['submitted', 'in_review', 'shortlisted'], 1, 0.84),
    app('app_mariana_banca', 'job_banca_20', 'cand_mariana', ['submitted'], 2, 0.8),
    app('app_jorge_agro', 'job_agro_03', 'cand_jorge', ['submitted', 'in_review'], 1, 0.76),
    app('app_jorge_turismo', 'job_turismo_05', 'cand_jorge', ['submitted'], 0, 0.69),
  ];
  for (const a of applications) jobs.find((j) => j.id === a.jobId)!.applicantsCount++;

  const passwordHashes = Object.fromEntries(users.map((u) => [u.id, demoPasswordHash()]));
  return { organizations, users, passwordHashes, skills, jobs, candidates, applications };
}
