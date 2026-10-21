# 08 · Frontend, design system y experiencia de usuario

## 1. Stack

| Capa | Elección |
|---|---|
| Framework | **React 19** + **Vite 7** + TypeScript estricto |
| Routing | TanStack Router (type-safe, *loaders* con prefetch) |
| Datos | TanStack Query (caché, `staleTime`, *optimistic updates*, prefetch on hover) |
| Estado UI | Zustand (mínimo) |
| Estilos | Tailwind CSS v4 + CSS variables (tokens) |
| Componentes base | Radix UI primitives + componentes propios en `nexo-ui` (estilo shadcn) |
| Charts | **Recharts** (`RadarChart`, `FunnelChart`, `AreaChart`) envueltos en componentes del design system |
| Animación | Motion (Framer Motion) con `prefers-reduced-motion` |
| Formularios | React Hook Form + Zod (schemas generados desde OpenAPI) |
| Tiempo real | WebSocket nativo con reconexión; SSE para streaming de IA |
| i18n | i18next (`es-MX`, `en`) |
| Testing | Vitest + Testing Library, Storybook 9 (interaction + a11y), Playwright (E2E y visual) |

## 2. Dirección visual: "AI-native, calm & luminous"

- **Modo oscuro por defecto** con modo claro completo; fondo con un **aurora gradient** sutil (violeta → índigo → cian) animado lentamente.
- **Superficies glass** (blur 16 px, borde 1 px con 10 % de opacidad) solo en tarjetas destacadas; el resto, superficies planas para legibilidad.
- **Tipografía:** *Geist* (UI) y *Geist Mono* (datos, scores).
- **Señales de IA consistentes:** ícono ✦ *sparkle* en todo lo generado por IA, borde con **gradiente animado** mientras la IA trabaja, *shimmer skeletons*, texto con *streaming* token a token y chip "Generado por IA · revisar".
- **Command palette (⌘K)** con búsqueda semántica y acciones ("agendar entrevista con Ana").
- **Micro-interacciones:** confeti discreto al ser contratado, *haptics* en móvil, transiciones de layout en el kanban.
- Accesibilidad **WCAG 2.2 AA**: contraste ≥ 4.5:1, foco visible, navegación por teclado, gráficas con tabla alternativa.

### 2.1 Tokens (extracto)

```css
:root {
  --nx-bg: #0B0B14;           --nx-surface: #14141F;    --nx-surface-2: #1C1C2B;
  --nx-text: #EDEDF5;         --nx-text-muted: #A1A1B5;  --nx-border: rgb(255 255 255 / .08);
  --nx-primary: #7C5CFF;      --nx-primary-2: #22D3EE;   --nx-accent: #F472B6;
  --nx-success: #34D399;      --nx-warning: #FBBF24;     --nx-danger: #F87171;
  --nx-ai-gradient: linear-gradient(135deg, #7C5CFF 0%, #22D3EE 50%, #F472B6 100%);
  --nx-radius-sm: 8px; --nx-radius-md: 12px; --nx-radius-lg: 20px;
  --nx-shadow-glow: 0 0 0 1px rgb(124 92 255 / .25), 0 8px 32px rgb(124 92 255 / .18);
}
```

## 3. Componentes clave de `nexo-ui`

| Componente | Descripción |
|---|---|
| `SkillRadarChart` | Radar vacante (línea discontinua cian) vs. candidato (área violeta semitransparente); tooltip por eje; leyenda; `aria-label` + tabla oculta; modo comparación de hasta 3 candidatos para el reclutador. |
| `MatchScoreRing` | Anillo animado 0–100 con color por rango y explicación al hover. |
| `ApplicationStepper` | Stepper horizontal (desktop) / vertical (móvil) con estados `done`, `current`, `upcoming`, `terminal-negative`; fecha por paso; tooltip con mensaje del reclutador. |
| `JobCard` | Título, empresa, modalidad, salario, **posiciones disponibles** (`2 de 3`), **postulantes** (`48`), score de match. |
| `KanbanBoard` | Columnas por estatus con drag & drop (dnd-kit), badges de estancamiento (ámbar 3 días, rojo 5 días). |
| `AIStreamText`, `AIBadge`, `AIShimmer` | Señales de IA. |
| `FileDropzone` | Drag & drop de CV/CSV/PDF con progreso a S3. |
| `ImportPreviewTable` | Tabla virtualizada editable con errores por celda y nivel de confianza. |
| `CalendarView` | Mes/semana/agenda de entrevistas. |
| `KPIStatCard`, `FunnelChart`, `TrendArea` | Dashboards. |
| `DataTable` | TanStack Table con filtros, orden, selección, acciones masivas (admin). |
| `NotificationCenter` | Panel con tiempo real y "marcar como leído". |

## 4. Pantallas

### 4.1 Candidato (`nexo-web`, área `/c`)
1. **Landing + registro** (social login).
2. **Onboarding de CV:** "Importa tu CV" o "Créalo en 3 minutos"; skills extraídas como *chips* editables con nivel (slider 0–5).
3. **Mejorar CV:** vista dividida (original ↔ propuesta IA) con aceptar/rechazar por bloque; exportar PDF.
4. **Explorar vacantes:** buscador semántico, filtros, tarjetas con score.
5. **Detalle de vacante:** descripción, `SkillRadarChart`, fortalezas/brechas, botón "Postular" y "Activar auto-apply para vacantes similares".
6. **Dashboard de postulaciones:** KPIs (activas, entrevistas, ofertas), lista con `ApplicationStepper` por vacante, filtro por estatus, mensajes.
7. **Calendario de entrevistas** + botón "Sincronizar con Google Calendar" / "Copiar feed ICS".
8. **Auto-apply:** reglas, consentimiento, bitácora de postulaciones automáticas.
9. **Notificaciones y preferencias** por canal.

### 4.2 Empleador (`nexo-web`, área `/e`)
1. **Dashboard:** KPIs (vacantes activas, postulantes, tiempo a primer contacto, estancadas), funnel, tabla de vacantes con `positions_filled/positions_total` y `applicants_count`.
2. **Crear vacante** con asistente IA → **pago** (Stripe Checkout) → publicada.
3. **Importar vacantes:** pestañas API / Endpoint / CSV / PDF / Conectores / MCP; preview y costo en créditos.
4. **Vacante → candidatos:** ranking por match, comparación de radar, resumen IA, kanban de estatus, mensajes, "Agendar con Calendly".
5. **Cerrar vacante:** modal con motivo (`Ocupada`, `Cancelada`, `En pausa`) y mensaje a postulantes.
6. **Integraciones:** Calendly, Slack, Teams, SAP/CRM, API keys, webhooks.
7. **Facturación:** plan, créditos, facturas.
8. **Copiloto** (panel lateral RAG).

### 4.3 Admin (`nexo-admin`)
Usuarios, organizaciones, vacantes, candidatos (CRUD, suspensión, *impersonation* auditada), planes y cupones, integraciones y DLQ, auditoría de IA (trazas, sesgo), métricas de plataforma.

## 5. Rendimiento frontend

- *Code splitting* por ruta y por área (`/c`, `/e`), Recharts cargado *lazy*.
- Prefetch de la ruta y datos al hover/viewport (`router.preloadRoute`).
- `staleTime` de 60 s para catálogos, 0 s para estatus (actualizados por WebSocket que invalida la query).
- Virtualización de listas largas (TanStack Virtual).
- Imágenes AVIF/WebP, fuentes `font-display: swap` con *subset*.
- Presupuesto: **LCP < 2.0 s**, **INP < 200 ms**, **CLS < 0.05**, JS inicial < 180 KB gzip; verificado con Lighthouse CI.
