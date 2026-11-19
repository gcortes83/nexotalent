# NexoTalent AI · atajos de desarrollo. `make help` lista todo.
SHELL         := /bin/bash
.DEFAULT_GOAL := help

API_DIR  := apps/api
WEB_DIR  := apps/web
COMPOSE  := docker compose
API_URL  ?= http://localhost:4000
WEB_URL  ?= http://localhost:5173
DOCKER_WEB_URL := http://localhost:8080

# ── make build [backend|frontend] (alias: make buid …) ──────────────────────────────
# La segunda palabra se toma como argumento y se declara como objetivo vacío.
ifneq ($(filter build buid,$(firstword $(MAKECMDGOALS))),)
  BUILD_TARGET := $(word 2,$(MAKECMDGOALS))
  ifneq ($(BUILD_TARGET),)
    $(eval $(BUILD_TARGET):;@:)
  endif
endif

define require_docker
	@docker info >/dev/null 2>&1 || { echo "✖ Docker no está corriendo. Abre Docker Desktop (o inicia el daemon) y reintenta."; exit 1; }
endef

define wait_http
	@printf "Esperando %s " "$(1)"; \
	for i in $$(seq 1 90); do \
	  if curl -fsS -o /dev/null "$(1)"; then echo "✔"; exit 0; fi; printf "."; sleep 2; \
	done; echo " ✖ no respondió en 180 s"; exit 1
endef

.PHONY: help setup env install build buid db-up mail-up db-down db-migrate migrate db-seed db-reset start start-memory stop \
        test test-unit test-api test-web test-hooks coverage typecheck test-int test-functional test-e2e test-all \
        docker-build docker-up docker-down docker-logs docker-seed docker-test clean

help: ## Lista todos los atajos
	@echo "NexoTalent AI · comandos make"
	@echo
	@awk 'BEGIN {FS = ":.*## "} /^[a-zA-Z0-9_-]+:.*## / {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo
	@echo "  make build backend   compila solo el backend   ·   make build frontend   compila solo el frontend"
	@echo "  Variables: API_URL=$(API_URL) WEB_URL=$(WEB_URL) (para Docker: WEB_URL=$(DOCKER_WEB_URL))"

# ── Primera vez ──────────────────────────────────────────────────────────────────────
setup: ## Solo la primera vez: instala dependencias, crea los .env, levanta las bases y migra
	@node -e 'const [M]=process.versions.node.split(".").map(Number); if (M<24) { console.error("✖ Se requiere Node >= 24 (tienes "+process.version+")"); process.exit(1) }'
	@$(MAKE) --no-print-directory install env db-up db-migrate db-seed
	@echo "✔ Listo. Arranca con: make start   ·   API $(API_URL)   ·   Web $(WEB_URL)"

install: ## Instala dependencias (npm ci)
	npm ci --no-audit --no-fund

env: ## Crea apps/api/.env y apps/web/.env a partir de las plantillas (no sobrescribe)
	@for app in $(API_DIR) $(WEB_DIR); do \
	  if [ -f $$app/.env ]; then echo "• $$app/.env ya existe (no se toca)"; \
	  else cp $$app/env.example $$app/.env && echo "✔ creado $$app/.env"; fi; \
	done

# ── Compilación ──────────────────────────────────────────────────────────────────────
build: ## Compila backend y frontend (make build backend | make build frontend)
	@case "$(BUILD_TARGET)" in \
	  ""|all)    npm run build -w @nexo/api && npm run build -w @nexo/web ;; \
	  backend)  npm run build -w @nexo/api ;; \
	  frontend) npm run build -w @nexo/web ;; \
	  *) echo "✖ Objetivo desconocido: $(BUILD_TARGET). Usa: make build [backend|frontend]"; exit 1 ;; \
	esac

buid: build ## Alias de build (make buid [backend|frontend])

typecheck: ## Typecheck de API y web
	npm run typecheck

# ── Bases de datos (Docker) ──────────────────────────────────────────────────────────
db-up: ## Levanta las dos bases de datos (dev :5432, test :5433) y espera a que estén sanas
	$(require_docker)
	$(COMPOSE) up -d --wait postgres postgres-test
	@echo "✔ postgres (localhost:5432/nexotalent) y postgres-test (localhost:5433/nexotalent_test) sanas"

mail-up: ## Levanta Mailpit (SMTP :1025, UI http://localhost:8025) para ver los correos de desarrollo
	$(require_docker)
	$(COMPOSE) up -d mailpit
	@echo "✔ Mailpit en http://localhost:8025 · usa EMAIL_PROVIDER=smtp en apps/api/.env"

db-down: ## Detiene las bases de datos (conserva los datos de desarrollo)
	$(COMPOSE) stop postgres postgres-test

db-migrate: ## Aplica migraciones pendientes a la base de desarrollo
	npm run db:migrate

migrate: db-migrate ## Alias de db-migrate

db-seed: ## Recarga los datos sintéticos de demo (borra y recrea)
	npm run db:seed

db-reset: db-migrate db-seed ## Migra y recarga los datos de demo

# ── Ejecución local ──────────────────────────────────────────────────────────────────
start: ## Levanta backend y frontend a la vez; Ctrl-C para los dos
	@test -f $(API_DIR)/.env || { echo "✖ Falta $(API_DIR)/.env: ejecuta make setup (o make env)"; exit 1; }
	@echo "API → $(API_URL)   ·   Web → $(WEB_URL)   ·   Ctrl-C detiene ambos"
	@trap 'kill 0' INT TERM; \
	npm run dev -w @nexo/api & \
	npm run dev -w @nexo/web & \
	wait

start-memory: ## Igual que start pero sin base de datos (STORAGE=memory)
	@STORAGE=memory $(MAKE) --no-print-directory start

stop: ## Detiene backend y frontend levantados con make start / start-memory (no toca Docker)
	@pkill -f "tsx watch --env-file-if-exists=.env src/main.ts" 2>/dev/null || true
	@pkill -f "node_modules/.bin/vite" 2>/dev/null || true
	@pkill -f "make.*start" 2>/dev/null || true
	@for port in 4000 5173; do \
	  pids=$$(lsof -ti tcp:$$port -sTCP:LISTEN 2>/dev/null); \
	  if [ -n "$$pids" ]; then kill $$pids 2>/dev/null || true; fi; \
	done
	@sleep 1
	@if lsof -ti tcp:4000 -sTCP:LISTEN >/dev/null 2>&1 || lsof -ti tcp:5173 -sTCP:LISTEN >/dev/null 2>&1; then \
	  echo "✖ Aún hay procesos en :4000 o :5173 (revisa con: lsof -i :4000 -i :5173)"; exit 1; \
	else echo "✔ API (:4000) y web (:5173) detenidas. Para Docker usa: make docker-down"; fi

# ── Pruebas ──────────────────────────────────────────────────────────────────────────
test: ## Unitarias + HTTP (API), componentes y páginas (web) y hooks del harness
	npm test

test-unit: test ## Alias de test

test-api: ## Solo pruebas de la API
	npm run test:api

test-web: ## Solo pruebas del frontend
	npm run test:web

test-hooks: ## Pruebas de los hooks del harness
	npm run test:hooks

coverage: ## Cobertura (umbral 80 % en dominio y aplicación)
	npm run coverage

test-int: db-up ## Integración con PostgreSQL + pgvector reales (base de pruebas :5433)
	@set -a; . $(API_DIR)/.env; set +a; npm run test:int

test-functional: ## Pruebas funcionales en vivo contra la app levantada (API_URL, WEB_URL)
	API_URL=$(API_URL) WEB_URL=$(WEB_URL) npm run test:functional

test-e2e: ## E2E en navegador (Playwright + Chrome) contra la app levantada (WEB_URL)
	WEB_URL=$(WEB_URL) npm run test:e2e

test-all: typecheck test test-int ## Typecheck + unitarias + integración

# ── Docker (stack completo) ──────────────────────────────────────────────────────────
docker-build: ## Construye las imágenes de API y web
	$(require_docker)
	$(COMPOSE) build migrate web

docker-up: ## Levanta todo en Docker: bases, migrate+seed, API :4000 y web :8080
	$(require_docker)
	$(COMPOSE) up -d --build
	$(call wait_http,$(DOCKER_WEB_URL)/health)
	@echo "✔ Web $(DOCKER_WEB_URL)   ·   API http://localhost:4000   ·   Correos http://localhost:8025   ·   make docker-logs"

docker-down: ## Detiene y elimina los contenedores (conserva el volumen de datos)
	$(COMPOSE) down

docker-logs: ## Sigue los logs de API y web
	$(COMPOSE) logs -f api web

docker-seed: ## Vuelve a migrar y recargar los datos de demo en Docker
	$(COMPOSE) run --rm migrate

docker-test: ## Funcionales + E2E contra el stack de Docker
	API_URL=http://localhost:4000 WEB_URL=$(DOCKER_WEB_URL) npm run test:functional
	WEB_URL=$(DOCKER_WEB_URL) npm run test:e2e

clean: ## Borra artefactos de compilación y reportes
	rm -r -f $(API_DIR)/dist $(WEB_DIR)/dist $(API_DIR)/coverage $(WEB_DIR)/coverage playwright-report test-results
