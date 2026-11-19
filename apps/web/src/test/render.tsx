import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '../App';
import { SessionProvider } from '../auth/session';
import { I18nProvider, type Lang } from '../i18n';

export function renderAt(path: string, { token, lang = 'es' }: { token?: string; lang?: Lang } = {}) {
  if (token) localStorage.setItem('nexo.token', token);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const utils = render(
    <I18nProvider lang={lang}>
      <QueryClientProvider client={qc}>
        <SessionProvider>
          <RouterProvider router={router} />
        </SessionProvider>
      </QueryClientProvider>
    </I18nProvider>,
  );
  return { ...utils, router, qc };
}
