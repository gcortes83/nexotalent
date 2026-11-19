/**
 * Descripciones detalladas y deterministas para las vacantes sembradas (datos sintéticos).
 * Formato de texto ligero que la web renderiza: líneas «## Título» = sección, «- » = viñeta.
 * Evita nombrar tecnologías fuera de las skills de cada vacante para no distorsionar la búsqueda.
 */
import type { Modality, RequiredSkill, Seniority } from '../modules/matching/domain/types.js';

type Family =
  | 'backend' | 'frontend' | 'fullstack' | 'dataEng' | 'dataAnalyst' | 'dataScience' | 'platform' | 'qa'
  | 'design' | 'product' | 'agile' | 'support' | 'security' | 'leadership' | 'payments';

const FAMILY_RULES: [RegExp, Family][] = [
  [/seguridad/i, 'security'],
  [/pagos/i, 'payments'],
  [/(tech lead|líder|lider|engineering manager|arquitecto)/i, 'leadership'],
  [/(sre|devops|platform|cloud)/i, 'platform'],
  [/(machine learning|científico|scientist)/i, 'dataScience'],
  [/(ingenier[oa] de datos|data engineer)/i, 'dataEng'],
  [/(analista|analyst|\bbi\b)/i, 'dataAnalyst'],
  [/(qa|quality)/i, 'qa'],
  [/(designer|ux|ui)/i, 'design'],
  [/product manager/i, 'product'],
  [/scrum/i, 'agile'],
  [/soporte/i, 'support'],
  [/(full-stack|full stack|fullstack)/i, 'fullstack'],
  [/(frontend|front-end|web developer)/i, 'frontend'],
];

export const jobFamily = (title: string): Family => FAMILY_RULES.find(([re]) => re.test(title))?.[1] ?? 'backend';

const RESPONSIBILITIES: Record<Family, string[]> = {
  backend: [
    'Diseñar, construir y mantener servicios y APIs con contratos claros y documentados.',
    'Modelar datos y optimizar consultas para que el producto responda rápido bajo carga.',
    'Escribir pruebas automatizadas y participar en revisiones de código del equipo.',
    'Instrumentar los servicios con logs, métricas y trazas para operar con confianza.',
    'Colaborar con producto y diseño para convertir necesidades de negocio en soluciones técnicas.',
  ],
  frontend: [
    'Construir interfaces accesibles (WCAG 2.2 AA), rápidas y adaptables a móvil.',
    'Crear y mantener componentes reutilizables junto con el equipo de diseño.',
    'Integrar la interfaz con las APIs y manejar estados de carga, error y vacío.',
    'Cuidar el rendimiento percibido: tiempos de carga, tamaño del bundle y fluidez.',
    'Escribir pruebas de componentes y de flujos críticos.',
  ],
  fullstack: [
    'Entregar funcionalidades de punta a punta: interfaz, API y base de datos.',
    'Proponer soluciones simples y evolutivas, priorizando el valor para el usuario.',
    'Escribir pruebas en todas las capas y mantener la calidad del código.',
    'Participar en el diseño técnico y en la estimación del trabajo del equipo.',
    'Acompañar los despliegues y monitorear el comportamiento en producción.',
  ],
  dataEng: [
    'Diseñar y operar pipelines de datos confiables, idempotentes y observables.',
    'Modelar datos analíticos y documentar su linaje y calidad.',
    'Automatizar validaciones de calidad de datos y alertas ante anomalías.',
    'Colaborar con analistas y científicos de datos para habilitar nuevos casos de uso.',
    'Optimizar costos y tiempos de procesamiento de la plataforma de datos.',
  ],
  dataAnalyst: [
    'Construir tableros y reportes que respondan preguntas concretas del negocio.',
    'Definir métricas junto con las áreas usuarias y asegurar su consistencia.',
    'Explorar datos para encontrar oportunidades y explicar hallazgos con claridad.',
    'Documentar fuentes, supuestos y limitaciones de cada análisis.',
    'Automatizar reportes recurrentes para liberar tiempo de análisis.',
  ],
  dataScience: [
    'Formular problemas de negocio como problemas de modelado medibles.',
    'Entrenar, evaluar y explicar modelos, incluyendo métricas de sesgo y equidad.',
    'Llevar modelos a producción junto con ingeniería y monitorear su desempeño.',
    'Diseñar experimentos y comunicar resultados a audiencias no técnicas.',
    'Mantener la reproducibilidad: datos versionados, código revisado y resultados trazables.',
  ],
  platform: [
    'Diseñar y operar infraestructura como código, segura y reproducible.',
    'Automatizar la entrega de software con pipelines de integración y despliegue continuo.',
    'Definir SLOs, alertas y tableros de observabilidad junto con los equipos de producto.',
    'Atender incidentes, conducir postmortems sin culpables y eliminar trabajo repetitivo.',
    'Optimizar costos de nube y capacidad de la plataforma.',
  ],
  qa: [
    'Diseñar la estrategia de pruebas del equipo junto con desarrollo y producto.',
    'Automatizar pruebas de API y de interfaz para los flujos críticos.',
    'Ejecutar pruebas exploratorias y reportar defectos con pasos claros para reproducirlos.',
    'Integrar las pruebas al pipeline para detectar regresiones antes de producción.',
    'Medir y comunicar la calidad del producto con métricas útiles.',
  ],
  design: [
    'Investigar necesidades de usuarios con entrevistas, pruebas y datos de uso.',
    'Diseñar flujos, prototipos e interfaces accesibles y consistentes.',
    'Mantener y evolucionar el sistema de diseño junto con desarrollo.',
    'Validar soluciones con usuarios antes y después de lanzarlas.',
    'Comunicar decisiones de diseño con claridad a todo el equipo.',
  ],
  product: [
    'Definir la visión y la hoja de ruta del producto con base en datos y clientes.',
    'Priorizar el backlog equilibrando valor para el usuario, negocio y esfuerzo técnico.',
    'Escribir historias claras con criterios de aceptación medibles.',
    'Medir el impacto de cada lanzamiento y aprender de los resultados.',
    'Alinear a ingeniería, diseño y negocio alrededor de objetivos comunes.',
  ],
  agile: [
    'Facilitar las ceremonias ágiles y mantenerlas útiles y breves.',
    'Detectar y remover impedimentos junto con el equipo y otras áreas.',
    'Promover la mejora continua con métricas de flujo y retrospectivas accionables.',
    'Acompañar al equipo en la adopción de buenas prácticas de colaboración.',
    'Coordinar dependencias entre equipos para proteger el foco de entrega.',
  ],
  support: [
    'Atender incidentes de usuarios con empatía y dentro de los tiempos acordados.',
    'Diagnosticar problemas con consultas a datos y revisión de registros.',
    'Escalar con contexto completo a los equipos de desarrollo cuando sea necesario.',
    'Documentar soluciones en la base de conocimiento.',
    'Proponer mejoras al producto a partir de los casos recurrentes.',
  ],
  security: [
    'Diseñar e implementar controles de seguridad en la nube con el principio de menor privilegio.',
    'Monitorear amenazas y coordinar la respuesta a incidentes de seguridad.',
    'Revisar la arquitectura y el código de los equipos desde la perspectiva de seguridad.',
    'Automatizar verificaciones de cumplimiento en los pipelines de entrega.',
    'Capacitar a los equipos en prácticas de desarrollo seguro.',
  ],
  leadership: [
    'Liderar técnicamente al equipo y acompañar el crecimiento profesional de cada persona.',
    'Definir la arquitectura y los estándares técnicos junto con otros líderes.',
    'Equilibrar la entrega de valor con la salud técnica del sistema.',
    'Contratar, dar retroalimentación y construir una cultura de colaboración y aprendizaje.',
    'Representar al equipo ante producto y negocio en decisiones técnicas.',
  ],
  payments: [
    'Integrar y operar pasarelas de pago, suscripciones y conciliación.',
    'Garantizar la consistencia de las transacciones y el manejo de reintentos e idempotencia.',
    'Colaborar con riesgo y cumplimiento en prevención de fraude y regulación.',
    'Monitorear tasas de aprobación y tiempos de respuesta de los proveedores.',
    'Documentar los flujos de pago y sus casos borde.',
  ],
};

const NICE_TO_HAVE: Record<Family, string[]> = {
  backend: ['Experiencia con arquitecturas orientadas a eventos.', 'Participación en guardias o en la operación de servicios en producción.'],
  frontend: ['Experiencia con sistemas de diseño.', 'Conocimiento de métricas de rendimiento web (Core Web Vitals).'],
  fullstack: ['Experiencia en productos B2C con muchos usuarios.', 'Interés por la experiencia de usuario y la accesibilidad.'],
  dataEng: ['Experiencia con orquestadores de flujos de datos.', 'Conocimiento de gobierno y privacidad de datos.'],
  dataAnalyst: ['Experiencia presentando hallazgos a dirección.', 'Conocimientos básicos de estadística.'],
  dataScience: ['Publicaciones, proyectos o competencias en ciencia de datos.', 'Experiencia con evaluación de equidad algorítmica.'],
  platform: ['Certificaciones de nube.', 'Experiencia en ingeniería del caos o pruebas de resiliencia.'],
  qa: ['Experiencia con pruebas de rendimiento.', 'Conocimiento de pruebas de accesibilidad.'],
  design: ['Portafolio con casos de investigación.', 'Experiencia diseñando para accesibilidad.'],
  product: ['Experiencia con productos de datos o de IA.', 'Formación en análisis de datos.'],
  agile: ['Certificación ágil reconocida.', 'Experiencia con varios equipos a la vez.'],
  support: ['Experiencia con herramientas de mesa de ayuda.', 'Inglés para atender a clientes internacionales.'],
  security: ['Certificaciones de seguridad reconocidas.', 'Experiencia en auditorías de cumplimiento.'],
  leadership: ['Experiencia liderando equipos remotos o distribuidos.', 'Participación en comunidades técnicas.'],
  payments: ['Conocimiento de normativas de pagos.', 'Experiencia con pagos internacionales.'],
};

const ORG_ABOUT: Record<string, string> = {
  org_fintech: 'Fintech Ejemplo S.A. construye servicios financieros digitales para personas y pequeñas empresas de Latinoamérica, con foco en simplicidad y transparencia.',
  org_retail: 'Retail Ejemplo S.A. opera tiendas físicas y comercio electrónico en México; su equipo de tecnología impulsa la experiencia omnicanal de millones de clientes.',
  org_salud: 'Salud Digital Ejemplo S.A. conecta pacientes, clínicas y médicos con citas, expedientes y telemedicina, cuidando la privacidad de los datos de salud.',
  org_logistica: 'Logística Ejemplo S.A. de C.V. mueve miles de envíos al día con rastreo en tiempo real, rutas optimizadas y almacenes automatizados.',
  org_edtech: 'EdTech Ejemplo S.A.S. ofrece cursos en línea y clases en vivo a estudiantes de toda Latinoamérica y España.',
  org_banca: 'Banca Digital Ejemplo S.A. es un banco 100 % digital con cuentas, tarjetas y créditos que se contratan desde el celular.',
  org_agro: 'AgroTech Ejemplo S.A. ayuda a productores agrícolas a decidir mejor con sensores, imágenes satelitales y análisis de datos.',
  org_turismo: 'Turismo Ejemplo S.A. de C.V. opera una plataforma de reservas de viajes, hoteles y experiencias para viajeros de la región.',
};

const LEVEL_WORD = ['', 'básico', 'básico-intermedio', 'intermedio', 'avanzado', 'experto'];
const EXPERIENCE: Record<Seniority, string> = {
  junior: 'De 0 a 2 años de experiencia (prácticas, proyectos personales o bootcamp cuentan).',
  mid: 'De 2 a 4 años de experiencia en un rol similar.',
  senior: '5 años o más de experiencia, con autonomía para resolver problemas complejos.',
  lead: '7 años o más de experiencia, con al menos 2 liderando personas o iniciativas técnicas.',
};
const LEVEL_PHRASE: Record<Seniority, string> = {
  junior: 'Buscamos a alguien con muchas ganas de aprender, que crecerá con mentoría cercana del equipo.',
  mid: 'Buscamos a alguien que trabaje con autonomía en su día a día y aporte ideas para mejorar el producto.',
  senior: 'Buscamos a alguien que tome decisiones técnicas, eleve la calidad del equipo y acompañe a otras personas.',
  lead: 'Buscamos a alguien que marque el rumbo técnico, forme equipos sólidos y conecte la tecnología con el negocio.',
};

const COUNTRY: Record<string, string> = { MX: 'México', CO: 'Colombia', AR: 'Argentina', CL: 'Chile', PE: 'Perú', ES: 'España' };

const usd = (n: number) => `US$${n.toLocaleString('en-US')}`;

export interface DescribableJob {
  id: string;
  title: string;
  organizationId: string;
  organizationName: string;
  seniority: Seniority;
  modality: Modality;
  country: string;
  city: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  positionsTotal: number;
  skills: RequiredSkill[];
}

/** Descripción completa (Sobre el rol, Responsabilidades, Requisitos, Deseable, Ofrecemos, Empresa, Proceso). */
export function describeJob(j: DescribableJob, intro?: string): string {
  const family = jobFamily(j.title);
  const where = j.modality === 'remote'
    ? `100 % remoto desde ${COUNTRY[j.country] ?? j.country}`
    : j.modality === 'hybrid'
      ? `híbrido: 2 o 3 días por semana en la oficina de ${j.city ?? COUNTRY[j.country]}`
      : `presencial en ${j.city ?? COUNTRY[j.country]}`;
  const isSoft = (s: RequiredSkill) => s.category === 'Soft skills';
  const technical = j.skills.filter((s) => !isSoft(s));
  const soft = j.skills.filter(isSoft);
  const must = technical.filter((s) => s.mustHave);
  const other = technical.filter((s) => !s.mustHave);
  const skillLine = (s: RequiredSkill) => `- ${s.name}: nivel ${LEVEL_WORD[s.level] ?? s.level} (${s.level}/5)${s.mustHave ? ' · obligatorio' : ''}.`;
  const positions = j.positionsTotal > 1 ? ` Abrimos ${j.positionsTotal} posiciones.` : '';

  const benefits = [
    j.salaryMin && j.salaryMax ? `- Salario mensual de ${usd(j.salaryMin)} a ${usd(j.salaryMax)}, según experiencia.` : null,
    `- Modalidad ${where}.`,
    j.modality === 'remote' ? '- Horario flexible con colaboración en zonas horarias de América.' : '- Horario flexible y viernes de enfoque sin reuniones.',
    '- Presupuesto anual de aprendizaje para cursos, libros y conferencias.',
    '- Seguro de gastos médicos y días adicionales de vacaciones.',
    j.modality === 'remote' ? '- Equipo de cómputo y apoyo para internet y espacio de trabajo.' : '- Equipo de cómputo y espacio de trabajo cómodo.',
  ].filter(Boolean);

  return [
    '## Sobre el rol',
    `${intro ? `${intro} ` : ''}Te sumarás al equipo de ${j.organizationName} como ${j.title}.${positions} ${LEVEL_PHRASE[j.seniority]}`,
    '',
    '## Responsabilidades',
    ...RESPONSIBILITIES[family].map((r) => `- ${r}`),
    '',
    '## Requisitos',
    `- ${EXPERIENCE[j.seniority]}`,
    ...must.map(skillLine),
    ...other.map(skillLine),
    '',
    ...(soft.length ? ['## Habilidades blandas', ...soft.map(skillLine), ''] : []),
    '## Deseable',
    ...NICE_TO_HAVE[family].map((r) => `- ${r}`),
    '',
    '## Qué ofrecemos',
    ...(benefits as string[]),
    '',
    '## Sobre la empresa',
    ORG_ABOUT[j.organizationId] ?? `${j.organizationName} es una empresa en crecimiento de la región.`,
    '',
    '## Proceso de selección',
    '- Revisión de tu perfil con apoyo del match explicable (la decisión siempre es humana).',
    '- Entrevista inicial de 30 minutos con el equipo de reclutamiento.',
    '- Conversación técnica o caso práctico breve, sin tareas de varios días.',
    '- Entrevista con el equipo y oferta. Te avisamos de cada avance en la app y por correo.',
    '',
    'Vacante sintética para la demo de NexoTalent AI.',
  ].join('\n');
}
