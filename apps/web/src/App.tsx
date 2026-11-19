import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, NavLink, Outlet, RouterProvider, useLocation } from 'react-router';
import type { Role } from './api/types';
import { homeFor, SessionProvider, useSession } from './auth/session';
import { I18nProvider, useI18n } from './i18n';
import { CandidateDashboardPage } from './pages/CandidateDashboardPage';
import { EmployerDashboardPage } from './pages/EmployerDashboardPage';
import { JobApplicantsPage } from './pages/JobApplicantsPage';
import { JobDetailPage } from './pages/JobDetailPage';
import { AiBackground } from './components/AiBackground';
import { NotificationWatcher } from './components/NotificationWatcher';
import { MobileAppsSection } from './components/MobileAppsSection';
import { SiteFooter } from './components/SiteFooter';
import { ToastProvider } from './components/Toast';
import { EmployerJobsPage } from './pages/EmployerJobsPage';
import { ImportJobsPage } from './pages/ImportJobsPage';
import { JobFormPage } from './pages/JobFormPage';
import { JobsPage } from './pages/JobsPage';
import { LandingPage } from './pages/LandingPage';
import { RegisterCandidatePage, RegisterEmployerPage } from './pages/RegisterPages';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';

/** Preferencia del usuario: ocultar la sección de apps móviles. */
const APPS_HIDDEN_KEY = 'nexo.hideApps';

function Layout() {
  const { user, logout } = useSession();
  const { t } = useI18n();
  const isEmployer = user?.role === 'recruiter' || user?.role === 'employer_admin';
  // Menú plegable en pantallas angostas; se cierra al navegar.
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setMenuOpen(false), [location.pathname, location.search]);
  // Sección de apps móviles: se puede ocultar (se recuerda) y volver a mostrar desde el footer.
  const [appsHidden, setAppsHidden] = useState(() => {
    try { return localStorage.getItem(APPS_HIDDEN_KEY) === '1'; } catch { return false; }
  });
  const setAppsVisibility = (hidden: boolean) => {
    setAppsHidden(hidden);
    try { hidden ? localStorage.setItem(APPS_HIDDEN_KEY, '1') : localStorage.removeItem(APPS_HIDDEN_KEY); } catch { /* almacenamiento bloqueado */ }
    if (!hidden) {
      requestAnimationFrame(() => {
        const el = document.getElementById('apps-moviles');
        el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
        el?.focus({ preventScroll: true });
      });
    }
  };
  const appsAllowed = !location.pathname.startsWith('/e/');
  return (
    <ToastProvider>
      <NotificationWatcher />
      {/* Fondo animado de IA (el de la landing) en todas las páginas. */}
      <AiBackground />
      <a href="#main" className="skip-link">{t.nav.skip}</a>
      <header className={`topbar${location.pathname === '/' ? ' topbar--landing' : ''}`}>
        <NavLink to={homeFor(user)} className="brand">Nexo<span className="gradient-text">Talent</span> ✦</NavLink>
        <button type="button" className="menu-toggle btn btn--ghost" aria-expanded={menuOpen} aria-controls="main-nav"
          aria-label={t.nav.menu} onClick={() => setMenuOpen((o) => !o)}>
          <span className="menu-toggle__bars" aria-hidden="true" />
        </button>
        <nav id="main-nav" aria-label={t.nav.main} className={`row main-nav${menuOpen ? ' main-nav--open' : ''}`}>
          <NavLink to="/jobs">{t.nav.jobs}</NavLink>
          {user?.role === 'candidate' && (<><NavLink to="/c/dashboard">{t.nav.myApplications}</NavLink><NavLink to="/c/profile">{t.nav.myProfile}</NavLink></>)}
          {isEmployer && (<><NavLink to="/e/dashboard">{t.nav.dashboard}</NavLink><NavLink to="/e/vacantes" end>{t.nav.myJobs}</NavLink><NavLink to="/e/importar">{t.nav.import}</NavLink></>)}
          {user ? <button className="btn btn--ghost small" onClick={logout}>{t.nav.signOut(user.fullName.split(' ')[0]!)}</button> : (
            <><NavLink to="/login">{t.nav.signIn}</NavLink><NavLink to="/registro/candidato" className="btn btn--primary small nav-cta">{t.nav.signUp}</NavLink></>
          )}
        </nav>
      </header>
      <main id="main" className="container has-ai-bg"><Outlet /></main>
      {/* Apps móviles antes del footer (para candidatos: se omite en el portal del empleador). */}
      {appsAllowed && !appsHidden && <MobileAppsSection onHide={() => setAppsVisibility(true)} />}
      <SiteFooter onShowApps={appsAllowed && appsHidden ? () => setAppsVisibility(false) : undefined} />
    </ToastProvider>
  );
}

function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, loading } = useSession();
  const { t } = useI18n();
  const location = useLocation();
  if (loading) return <p className="muted">{t.nav.loadingSession}</p>;
  // Sin sesión: al login, recordando a dónde volver.
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />;
  return <>{children}</>;
}

function NotFound() {
  const { t } = useI18n();
  return <p>{t.nav.notFound}</p>;
}

export const routes = [
  {
    element: <Layout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/registro/candidato', element: <RegisterCandidatePage /> },
      { path: '/registro/empleador', element: <RegisterEmployerPage /> },
      { path: '/jobs', element: <JobsPage /> },
      { path: '/jobs/:jobId', element: <JobDetailPage /> },
      { path: '/c/dashboard', element: <RequireRole roles={['candidate']}><CandidateDashboardPage /></RequireRole> },
      { path: '/c/profile', element: <RequireRole roles={['candidate']}><ProfilePage /></RequireRole> },
      { path: '/e/dashboard', element: <RequireRole roles={['recruiter', 'employer_admin']}><EmployerDashboardPage /></RequireRole> },
      { path: '/e/jobs/:jobId', element: <RequireRole roles={['recruiter', 'employer_admin']}><JobApplicantsPage /></RequireRole> },
      { path: '/e/vacantes', element: <RequireRole roles={['recruiter', 'employer_admin']}><EmployerJobsPage /></RequireRole> },
      { path: '/e/vacantes/nueva', element: <RequireRole roles={['recruiter', 'employer_admin']}><JobFormPage /></RequireRole> },
      { path: '/e/vacantes/:jobId/editar', element: <RequireRole roles={['recruiter', 'employer_admin']}><JobFormPage key="edit" /></RequireRole> },
      { path: '/e/importar', element: <RequireRole roles={['recruiter', 'employer_admin']}><ImportJobsPage /></RequireRole> },
      { path: '*', element: <NotFound /> },
    ],
  },
];

export function App({ queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 15_000 } } }) }: { queryClient?: QueryClient }) {
  const router = createBrowserRouter(routes);
  return (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <RouterProvider router={router} />
        </SessionProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
}
