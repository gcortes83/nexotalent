/**
 * Datos del sitio y de la compañía para el footer y páginas legales.
 * ⚠️ PLACEHOLDERS: reemplaza los valores entre [corchetes] y los enlaces "#" por los reales antes de publicar.
 * Usa solo datos de contacto corporativos (nunca datos personales).
 */
export const SITE = {
  name: 'NexoTalent AI',
  company: {
    legalName: '[Razón social de la compañía S.A. de C.V.]',
    taxId: '[RFC de la compañía]',
    address: '[Calle y número], [Colonia], [Ciudad], [Estado], [C.P.], México',
    email: 'contacto@example.com',
    phone: '555-000-0000',
    supportHours: '[Lunes a viernes, 9:00 a 18:00 (hora del centro de México)]',
  },
  /** ⚠️ PLACEHOLDERS: URLs de descarga de las apps móviles (reemplazar al publicar en las tiendas). */
  apps: {
    ios: 'https://apps.apple.com/app/nexotalent/id0000000000',
    android: 'https://play.google.com/store/apps/details?id=com.example.nexotalent',
  },
  links: {
    // `key` → texto traducido en i18n (footer.links).
    product: [
      { key: 'jobs', to: '/jobs' },
      { key: 'forCandidates', to: '/registro/candidato' },
      { key: 'forEmployers', to: '/registro/empleador' },
      { key: 'signIn', to: '/login' },
    ],
    company: [
      { key: 'about', href: '#' },
      { key: 'blog', href: '#' },
      { key: 'careers', href: '#' },
      { key: 'press', href: '#' },
      { key: 'contact', href: 'mailto:contacto@example.com' },
    ],
    legal: [
      { key: 'privacy', href: '#' },
      { key: 'terms', href: '#' },
      { key: 'cookies', href: '#' },
      { key: 'aiEthics', href: '#' },
      { key: 'arco', href: '#' },
    ],
    social: [
      { label: 'LinkedIn', href: '#', icon: 'in' },
      { label: 'X (Twitter)', href: '#', icon: '𝕏' },
      { label: 'Instagram', href: '#', icon: '◎' },
      { label: 'YouTube', href: '#', icon: '▶' },
    ],
  },
} as const;
