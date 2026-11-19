---
description: Implementa un escenario con TDD estricto (rojo → verde → refactor)
argument-hint: <escenario o ticket>
---
Implementa con TDD: $ARGUMENTS

1. Usa el subagente `test-writer` para escribir la prueba que falla y muéstrame el ROJO.
2. Implementa el mínimo código para pasar a VERDE. Respeta la arquitectura hexagonal (`domain/` no importa de `infra/`).
3. Refactoriza con las pruebas en verde. Ejecuta `npm test` y `npm run typecheck`.
4. Marca la tarea en `openspec/changes/<change>/tasks.md`.
5. Lanza el subagente `adversarial-reviewer` sobre el diff.
