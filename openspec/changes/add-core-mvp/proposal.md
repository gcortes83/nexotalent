# Change: add-core-mvp

## Why
El feedback de la primera entrega (2 de noviembre de 2026) pide congelar un núcleo pequeño de punta a punta y simular lo demás.

## What Changes
- Monolito modular `apps/api` con los módulos identity, jobs, candidates, matching y applications.
- Frontend `apps/web` con los portales de candidato y empleador del núcleo.
- Datos sintéticos (TK-DATA-001) que sustituyen a la ingesta; pago simulado (`paid_simulated`); login de demo en lugar de Cognito.
- Specs: matching, applications-pipeline y candidate-profile.

## Out of scope (v2)
Stripe, Calendly (OAuth y webhooks), ingesta CSV/PDF/API, notificaciones y recordatorios por canal, auto-apply, copiloto RAG
(tabla `rag_chunks`), servidor MCP, conectores empresariales, admin, **apps móviles iOS y Android (PENDIENTE, ver `add-mobile-support`)**.
