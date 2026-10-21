# 09 · Seguridad, privacidad y ética

## 1. Seguridad de aplicación e infraestructura

| Área | Práctica | Ejemplo |
|---|---|---|
| Identidad | Amazon Cognito (OIDC), MFA para empleadores y admins, social login, tokens de acceso de 15 min + refresh rotativo. | `aud`/`iss` validados en el BFF con `jose`. |
| Autorización | RBAC + verificación por recurso (ABAC: `organization_id` del token = del recurso). **Row Level Security** en PostgreSQL. | `SET app.tenant_id = $1` por transacción; política `USING (organization_id = current_setting('app.tenant_id'))`. |
| API | Validación JSON Schema en cada ruta (Fastify), `helmet`, CORS restringido, *rate limiting* por IP/usuario/API key (Redis), tamaño máximo de body. | 429 con `Retry-After`. |
| Webhooks | Verificación de firma (Stripe, Calendly, Slack), ventana de tiempo anti-replay, idempotencia. | `stripe.webhooks.constructEvent(raw, sig, secret)`. |
| Archivos | URLs prefirmadas de S3 con expiración de 5 min, validación de MIME real (magic bytes), antivirus (ClamAV), cifrado SSE-KMS, sin acceso público. | CV en `s3://nexo-resumes/{tenant}/{candidate}/{ulid}.pdf`. |
| Secretos | AWS Secrets Manager + rotación; nada en repos (gitleaks en CI y en hooks del agente). | — |
| Red | VPC con subredes privadas, servicios sin IP pública, VPC endpoints (S3, Bedrock, Secrets), Security Groups mínimos, WAF (OWASP managed rules, bot control). | — |
| Datos | Cifrado en tránsito (TLS 1.2+) y reposo (KMS), backups cifrados, PITR en Aurora. | — |
| Dependencias | Dependabot/Renovate, `npm audit`, SBOM (CycloneDX), escaneo de imágenes con ECR + Trivy. | — |
| Supply chain | Imágenes firmadas, OIDC GitHub → AWS (sin llaves de larga duración), *branch protection*. | — |
| Observabilidad | Logs estructurados sin PII (pino con *redact*), CloudTrail, GuardDuty, alarmas. | `redact: ['req.headers.authorization', '*.email', '*.phone']`. |
| OWASP | Top 10 web y **OWASP Top 10 para LLM** (injection, output handling, data leakage, excessive agency). | Ver 03-arquitectura-ai §7. |

## 2. Privacidad y regulación

### 2.1 México — Ley Federal de Protección de Datos Personales en Posesión de los Particulares (2025)
- **Aviso de privacidad** integral y simplificado, con finalidades primarias (reclutamiento) y secundarias (marketing, entrenamiento de modelos) separadas; las secundarias requieren consentimiento independiente.
- **Derechos ARCO** (acceso, rectificación, cancelación, oposición) desde el perfil: exportar mis datos (JSON/PDF), borrar cuenta (eliminación lógica inmediata, física en 30 días, incluyendo embeddings y chunks RAG).
- **Transferencias:** al postular, el candidato consiente compartir su perfil con *esa* empresa; los conectores externos (SAP, CRM) se documentan como transferencias/remisiones.
- **Datos sensibles:** no se solicitan (salud, religión, afiliación, origen étnico); si aparecen en un CV, el extractor los descarta.

### 2.2 Unión Europea (si se opera con empresas o candidatos de la UE)
- **GDPR:** base legal, DPA con proveedores, minimización, derecho a no ser objeto de decisiones exclusivamente automatizadas (art. 22).
- **AI Act:** los sistemas de IA para reclutamiento y selección se clasifican como **alto riesgo**; se prepara documentación técnica, gestión de riesgos, registro de logs, supervisión humana, transparencia hacia el candidato y monitoreo de sesgo.

### 2.3 Otras referencias
- Ley Local 144 de Nueva York (auditoría de sesgo en herramientas automatizadas de empleo) como buena práctica de auditoría anual.

## 3. Ética de la IA en reclutamiento

| Principio | Implementación |
|---|---|
| **Supervisión humana** | La IA ordena y resume; **solo humanos** cambian estatus a `rejected` o `hired`. |
| **Explicabilidad** | Radar + factores del score visibles para candidato y reclutador. |
| **No discriminación** | Atributos protegidos excluidos del modelo; evals contrafactuales (cambio de nombre/género) con Δ ≤ 0.02; reporte de **impacto adverso (regla 4/5)** por vacante con datos de autodeclaración voluntaria y agregada. |
| **Transparencia** | Aviso "Este proceso usa IA para ordenar candidatos" en cada vacante; chip ✦ en contenido generado. |
| **Consentimiento** | Auto-apply y uso de CV para entrenamiento requieren *opt-in* explícito, revocable. |
| **Minimización** | El LLM recibe CV **redactado** (sin datos de contacto). Bedrock no usa los datos para entrenar. |
| **Agencia limitada** | Agentes con lista blanca de tools, límites de iteraciones, presupuesto y confirmación humana para acciones con efecto. |
| **Rendición de cuentas** | `ai_audit_log`: input hash, prompt version, modelo, output, usuario, decisión humana posterior. |
| **No a la biometría** | Sin análisis facial, de voz o emocional en entrevistas. |

## 4. Guardrails del agente de desarrollo
Ver [12-harness-sdd-guardrails.md](12-harness-sdd-guardrails.md): los agentes que construyen el código tampoco pueden leer datos reales de candidatos; se usan *seeds* sintéticos generados con Faker.
