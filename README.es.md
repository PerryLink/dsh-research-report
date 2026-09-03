<div align="center">

# 📑 dsh-research-report
- **Canal 1024 store**: `npm i -g dsh1024` una vez, luego `dsh1024 plugin --profile web add dsh-research-report` (cuenta para el ranking de instalaciones de [deepseek1024.com](https://deepseek1024.com)).

**Un motor de informes de investigación verificables para DeepSeek Harness.**

*Cada afirmación (claim) queda vinculada a instantáneas de evidencia inmutables, se verifica byte a byte y se sella en un informe versionado cuyo hash de manifiesto cualquiera puede recomputar.*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/dsh-plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-research-report/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-research-report/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-research-report?label=version)](https://github.com/PerryLink/dsh-research-report/releases)
[![npm version](https://img.shields.io/npm/v/dsh-research-report)](https://www.npmjs.com/package/dsh-research-report)
[![npm downloads](https://img.shields.io/npm/dm/dsh-research-report)](https://www.npmjs.com/package/dsh-research-report)

[English](README.md) · [简体中文](README.zh.md) · [Español](README.es.md) · [Português](README.pt.md) · [हिन्दी](README.hi.md)

</div>

---

## Compatibility

- DeepSeek Harness `0.1.2-alpha.5` (peers fijados a `0.1.2-alpha.5`).
0.1.2-alpha.5 (adaptado el 2026-09-02): el sobre de sesión conserva su campo ignorable solo para compatibilidad de lectura de logs almacenados - Session.append aún no puede estamparlo, por lo que el comportamiento de la puerta no cambia.
- Node `^22.19.0 || >=24.0.0`, solo ESM (`"type": "module"`).
- Dependencias peer: `@deepseek-ai/cordis ^4.0.1`, `@deepseek-ai/schemastery ^3.18.0`, y `@deepseek-ai/dsh-session`, `@deepseek-ai/dsh-tools`, `@deepseek-ai/dsh-system-prompt`, `@deepseek-ai/dsh-web`, `@deepseek-ai/dsh-jobs` en `0.1.2-alpha.5`.
- Hermanos opcionales (nunca obligatorios): proveedores de `ctx.web` para captura URL/recolección, `ctx.jobs` para ensamblado en segundo plano, `ctx.dataQuality` (dsh-data-quality) para verificación de citas sobre datasets.

## What you get

- **Libro de evidencia (evidence ledger)** — almacén de instantáneas direccionado por contenido (`<ledgerRoot>/objects/<sha256>` + diarios JSONL). El mismo contenido se guarda una sola vez; las instantáneas son inmutables; cada lectura recomputa el hash, de modo que la manipulación o el borrado se detectan en lugar de confiarse.
- **Vínculo claim ↔ evidencia** — los claims se registran con los ids de evidencia en que se apoyan; el libro conserva el vínculo y cada veredicto de verificación (gana el más reciente).
- **Verificación a nivel de byte** — cada número y cada fragmento entrecomillado de un claim debe poder localizarse literalmente en las instantáneas vinculadas. Sin evidencia vinculada, o sin literal comprobable, el claim se marca `unverified`; evidencia vinculada que no puede confirmar ni desmentir los literales citados lo marca `insufficient`; una etiqueta cuyo valor difiere en la instantánea (y el valor citado está ausente) lo marca `disproven`; instantáneas manipuladas o ausentes lo marcan `contradicted`. Sin semántica, sin embeddings — solo comprobaciones de bytes auditables.
- **Puente numérico opcional** — cuando un claim cita un dataset estructurado del workspace (CSV/JSON) y `dsh-data-quality` está montado, las citas se verifican con tolerancias mediante su contrato congelado `verifyCitations`; una discrepancia del dataset desmiente (disproves) el claim.
- **Evidencia DOI (sin red)** — los orígenes DOI se validan determinísticamente (estructura `10.xxxx/xxxx`, lista blanca de prefijos y juego de caracteres DOI); los DOI inválidos fallan ruidosamente. Se acepta metadato opcional de revista/año, y `requireJournalMetadata` solo restringe la evidencia DOI académica cuando está habilitado.
- **Informes sellados versionados** — `<reportRoot>/<slug(topic)>/<YYYYMMDD-HHmmss>/report.md` + `manifest.json` + `verification.jsonl` + `disconfirmation.jsonl`; el hash de sellado es el SHA-256 del manifiesto, que a su vez lleva el hash del informe, los hashes de toda la evidencia y el hash de cada diario de auditoría.
- **Reauditoría previa a la entrega e interceptación del sellado** — antes de sellar, cada claim vinculado se re-verifica sin conexión y se registra en `verification.jsonl`; el drift de veredicto, la evidencia vinculada manipulada/ausente, o un fallo de serialización del diario bloquean el sellado (falla ruidosamente, sin tunable).
- **Libro de falsificación** — cada claim contradicho o desmentido se registra en `disconfirmation.jsonl` (claim + referencias de evidencia + motivo) y se lista en el apéndice `证伪记录` del informe.
- **Conocimiento negativo** — un claim desmentido se recuerda por su hash de contenido (`disproofs.jsonl`); el mismo texto re-reportado contra evidencia sin cambios se fuerza de nuevo a `disproven` y solo se re-verifica cuando la evidencia cambia.
- **Bucle de verificación de solo lectura** — tras sellar, el respaldo determinista `verifySealedReport` (sin red, sin modelo) recomputa el sello y los hashes de auditoría y re-comprueba cada claim, escribiendo la sección de comprobación de máquina en `verifier-note.md`; con `ctx.jobs` montado también se lanza un trabajo de verificación de solo lectura (la revisión del modelo es una mejora, nunca un reemplazo).
- **Evidencia anclada a sesión** — `evidence_add` acepta un `sessionRef` opcional (`sessionId` + `eventRange`, validado ruidosamente); el ancla se guarda y se registra en el Apéndice B, el manifiesto y `verification.jsonl`. La evidencia anclada a sesión se verifica honestamente como `unverified` (`会话锚定证据需人工回查会话日志`).
- **Brechas honestas** — los claims no verificados, insuficientes, contradichos o desmentidos conservan una marca visible `[未核实]` / `[证据不足]` / `[与证据矛盾]` / `[已证伪]` en el cuerpo del informe y se listan en el Apéndice A. Nada se aprueba en silencio.
- **Sin bucle de deep-research** — la orquestación de recuperación se reutiliza deliberadamente: `ctx.web` para buscar/descargar, `ctx.jobs` para trabajos largos. La planificación y la síntesis quedan en el modelo (o en un plugin upstream).

## Quick start

### Canal git

```sh
# Desde un profile de pruebas (fija el commit; ejecuta el build `prepare` autocontenido)
dsh plugin --profile demo add "github:YOUR_ORG/dsh-research-report#<sha>"
# El primer add añade una entrada allowBuilds para dsh-research-report al pnpm-workspace.yaml del profile.
```

### Canal npm

```sh
dsh plugin --profile demo add dsh-research-report
```

Ambos canales instalan la fila del bundle (ver `cordis.patch.yml`) en la pila `dsh.profile.bundles` del profile y surten efecto al reiniciar.

Luego, en una sesión:

```
evidence_add({ origin: "docs/market.md", title: "Market snapshot" })     # → ev-1a2b3c4d5e6f
research_report({ topic: "示例行业概览", sections: [...], claims: [...], evidenceRefs: ["ev-1a2b…"] })
ledger_query({ claimId: "c1" })                                          # vínculos + veredicto
```

## Install & uninstall

```sh
dsh plugin --profile demo add dsh-research-report       # instalar
dsh plugin --profile demo remove dsh-research-report    # desinstalar
```

Verifica que la fila se monta: `dsh --profile demo --dump-config | grep dsh-research-report`.

## Configuration

Todos los ajustes son campos `Config` de Schemastery; los valores inválidos fallan ruidosamente al cargar el profile. Las raíces relativas se resuelven contra el directorio de trabajo del harness (el workspace).

| Key | Default | Description |
| --- | --- | --- |
| `enabled` | `true` | Interruptor maestro; `false` no monta nada. |
| `ledgerRoot` | `.research-ledger` | Directorio del libro de evidencia (objetos + diarios JSONL). |
| `reportRoot` | `research-reports` | Raíz de informes sellados (versionados por tema y timestamp). |
| `maxEvidenceBytes` | `2097152` | Tope duro de bytes UTF-8 por instantánea de evidencia. |
| `maxEvidencePerReport` | `200` | Tope duro de evidencias vinculadas a un informe. |
| `fetchTimeoutMs` | `20000` | Plazo (ms) de cada `ctx.web` fetch durante la captura. |
| `requireJournalMetadata` | `false` | Cuando es `true`, la evidencia de tipo DOI debe traer nombre de revista y año de publicación al registrarse (falla ruidosamente en caso contrario). |

## Tools & surfaces

- **`evidence_add({ origin, content?, title? })`** — registra una instantánea de evidencia. Con `content` el texto se guarda literal; sin él, un origen URL se descarga vía `ctx.web` y una ruta relativa del workspace se lee de disco (las lecturas nunca escapan del workspace). Devuelve el id de evidencia y su hash SHA-256.
- **`research_report({ topic, title?, sections, claims, evidenceRefs, gather?, depth?, background? })`** — ensambla y sella un informe: valida (las referencias a claims no registrados se rechazan ruidosamente), verifica cada claim, renderiza `report.md` con marcas visibles, escribe `manifest.json` y devuelve el hash de sellado. `gather: true` ejecuta UNA ronda de búsqueda sobre `ctx.web` y devuelve evidencia candidata capturada más una lista explícita de brechas — nunca ensambla automáticamente. `background: true` devuelve `{ kind: 'background', jobId }` sobre `ctx.jobs`.
- **`ledger_query({ claimId? | evidenceId? })`** — consultas de solo lectura de vínculos/veredictos; la evidencia se re-hashea al leer, así que una instantánea manipulada o ausente se reporta explícitamente. Sin id, devuelve un resumen del libro.
- **`ctx.researchReport.assemble(request)`** — la superficie de servicio congelada para plugins hermanos (ver `src/service.ts`; protegida byte a byte por `scripts/verify-frozen-contract.mjs`).

## Permissions & data

`dsh-research-report` consume solo seams públicos: `ctx.tools`, `ctx.systemPrompt`, y opcionalmente `ctx.web` / `ctx.jobs` / `ctx.dataQuality` (consultados en el momento de la llamada, nunca inyectados). Solo escribe dentro de las raíces de libro e informes configuradas (ambas por defecto son directorios locales del workspace), lee archivos del workspace solo dentro del workspace, y sale a la red exclusivamente por el seam web del harness — nunca un `fetch` directo. Las instantáneas de evidencia son inmutables y direccionadas por contenido; los registros de claims son inmutables; los veredictos son solo de anexado.

## Security boundaries

- **Evidencia de manipulación por construcción** — cada lectura de instantánea recomputa el SHA-256 contra el índice; una discrepancia verifica los claims vinculados como `contradicted` y `ledger_query` reporta `integrity: tampered`/`missing`.
- **Confinamiento al workspace** — las lecturas locales de evidencia se resuelven contra la raíz del workspace y rechazan escapes (ambos lados pasan por `path.resolve` antes de comparar).
- **Configuración que falla ruidosamente** — los límites inválidos lanzan al montar; las referencias a claims no registrados, ids de evidencia desconocidos y conflictos id/contenido lanzan al ensamblar.
- **Sin manejo de credenciales, sin red oculta** — la captura de URLs pasa por `ctx.web` (la selección de proveedor, la taxonomía de errores y cualquier política SSRF quedan en los proveedores web del despliegue).
- **Registros reversibles** — cada contribución pasa por `ctx.effect()` / `register()`, así que desinstalar y recargar en caliente son limpios.

## Known limitations

- **A nivel de byte, no semántico** — la comprobación incorporada localiza literales numéricos/entrecomillados verbatim; los claims parafraseados sin literal comprobable quedan `unverified`, y un claim verdadero cuyo número está ausente mientras su etiqueta aparece con otro valor queda `contradicted`. Es una decisión deliberada de v1 (auditable antes que listo).
- **Eventos de sesión adaptativos** — el plugin declara los eventos de sesión tipados `research-report/evidence`, `research-report/verify` y `research-report/seal`, pero el `Session.append` de rc.2 sigue sin opción `ignorable` ni superficie de registro de eventos para plugins, así que los appends se activan solo cuando el build del host conoce los tipos (si no, la capa de persistencia rechazaría el log al restaurar). Los diarios del libro son siempre la fuente durable de verdad.
- **Los profiles por defecto no montan proveedor de fetch** — el `dsh-base` distribuido monta solo búsqueda, así que la captura de URLs falla ruidosamente (`WEB_UNAVAILABLE`/`WEB_PROVIDER_UNAVAILABLE`) hasta configurar un proveedor de fetch; el `gather` basado en búsqueda lista las fuentes no capturadas en la lista de brechas.
- **Ámbito de un solo workspace** — las raíces de libro e informes se resuelven contra el directorio de trabajo del harness al montar; los despliegues multi-workspace deben configurar raíces absolutas por profile.

## Verifier CLI

El binario independiente `dsh-research-verify` (empaquetado como `lib/cli.js`, sin imports de `@deepseek-ai`) audita cualquier directorio de informe sellado sin montar el plugin:

```sh
dsh-research-verify --report <dir> [--seal <sha256>] [--ledger <dir>] [--format json|sarif]
```

- `--report <dir>` — directorio sellado (`manifest.json` + `report.md` + diarios de auditoría).
- `--seal <sha256>` — hash de sello esperado para comparar con el hash del manifest recalculado; omitido = solo se informa el valor, sin comparar.
- `--ledger <dir>` — raíz del libro de evidencias (`objects/<sha256>` + `index.jsonl`) para re-verificar claims a nivel de bytes; omitido = los re-checks de claims se omiten honestamente.
- `--format` — `json` (por defecto) o `sarif` (SARIF 2.1.0).

Recalcula el hash de sello, el hash de `report.md` y los hashes de los diarios, re-ejecuta la verificación byte-level + integridad por claim, y sale con código no nulo si alguna comprobación falla. `verifySealedReport` / `buildVerificationReport` / `renderSarif` / `renderVerificationJson` se exportan del paquete para uso como librería.

## Development

```sh
pnpm install
pnpm run typecheck && pnpm run typecheck:ci
pnpm test
pnpm run build
pnpm run verify:self-contained && pnpm run verify:artifacts
node scripts/check-readme-sync.mjs
node scripts/verify-frozen-contract.mjs
pnpm pack
```

- `typecheck` resuelve `@deepseek-ai/*` a través de los peers 0.1.2-alpha.5 instalados; `typecheck:ci` desactiva `skipLibCheck` y activa `verbatimModuleSyntax` contra los tipos publicados. Ambos deben permanecer verdes.
- Las pruebas usan los `Context`/`Session`/`ToolRuntime`/`LocalJobRegistry`/`WebRuntime` reales de los peers 0.1.2-alpha.5; solo los backends de red son proveedores scriptados registrados a través de los registros reales de `ctx.web`.
- Release: `node scripts/release.mjs <x.y.z>` (sube versión, sella CHANGELOG, re-ejecuta la puerta, commitea + etiqueta; nunca hace push).

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `cordis`, `research`, `evidence-ledger`, `verifiable-report`, `audit`, `citation-verification`

## Contributors

- [PerryLink](https://github.com/PerryLink) — autor original y mantenedor: arquitectura del plugin, ledger de evidencias, verificación a nivel de byte, informes sellados, documentación en cinco idiomas y automatización de CI/publicación.

## PerryLink DSH Plugin Family

Este proyecto es uno de los [33 complementos de DeepSeek Harness](https://github.com/PerryLink) mantenidos por [PerryLink](https://github.com/PerryLink). Si este te ayuda, probablemente los demás también:

| Plugin | One-liner |
|---|---|
| **[dsh-dsh-auto-review](https://github.com/PerryLink/dsh-dsh-auto-review)** | Auto-revisión de segundo modelo en la cadena de aprobación, con cierre en fallo por defecto | |
| **[dsh-dsh-background-agents](https://github.com/PerryLink/dsh-dsh-background-agents)** | Agentes hijos en segundo plano durables con barra lateral de UI web, mensajería e interrupción | |
| **[dsh-dsh-budget](https://github.com/PerryLink/dsh-dsh-budget)** | Gobernanza de costes para DeepSeek Harness: presupuestos, carbono y latencia en un panel. | |
| **[dsh-dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-dsh-checkpoint-rewind)** | Equivalente a /rewind de Claude Code: instantáneas, bifurcaciones de sesión, restauración de un solo uso | |
| **[dsh-dsh-claude-move](https://github.com/PerryLink/dsh-dsh-claude-move)** | Migra sesiones, memoria, habilidades y CLAUDE.md de Claude Code a DSH | |
| **[dsh-dsh-click](https://github.com/PerryLink/dsh-dsh-click)** | Control de escritorio nativo multiplataforma para DeepSeek Harness — Windows primero. | |
| **[dsh-dsh-composer-history](https://github.com/PerryLink/dsh-dsh-composer-history)** | Historial de entrada estilo terminal para el compositor web: flechas, búsqueda Ctrl+R | |
| **[dsh-dsh-data-quality](https://github.com/PerryLink/dsh-dsh-data-quality)** | Comprobaciones de calidad de datasets y verificación de citas (el puente numérico opcional consumido aquí) | |
| **[dsh-dsh-defend](https://github.com/PerryLink/dsh-dsh-defend)** | Defensa contra inyección de prompts, jailbreak y fuga de secretos para DeepSeek Harness. | |
| **[dsh-dsh-doublecheck](https://github.com/PerryLink/dsh-dsh-doublecheck)** | Guardián de disciplina de ingeniería: interrogatorio de requisitos, puertas de pruebas, revisión adversaria | |
| **[dsh-dsh-draw](https://github.com/PerryLink/dsh-dsh-draw)** | Enrutamiento unificado de generación de imágenes estáticas para DeepSeek Harness. | |
| **[dsh-dsh-fast](https://github.com/PerryLink/dsh-dsh-fast)** | Diagnóstico de rendimiento de solo lectura para DeepSeek Harness. | |
| **[dsh-dsh-fund-research](https://github.com/PerryLink/dsh-dsh-fund-research)** | Informes de investigación deterministas para fondos mutuos públicos chinos | |
| **[dsh-dsh-github](https://github.com/PerryLink/dsh-dsh-github)** | Integración de PR/issues de GitHub para DSH, cada escritura controlada por aprobación | |
| **[dsh-dsh-industry-research](https://github.com/PerryLink/dsh-dsh-industry-research)** | Orquestación de investigación sectorial que sella sus entregables mediante el `ctx.researchReport.assemble` de este plugin | |
| **[dsh-dsh-library](https://github.com/PerryLink/dsh-dsh-library)** | Base de conocimiento documental local para DeepSeek Harness. | |
| **[dsh-dsh-local-ai](https://github.com/PerryLink/dsh-dsh-local-ai)** | Integración de modelos locales (Ollama) para DeepSeek Harness. | |
| **[dsh-dsh-lsp-actions](https://github.com/PerryLink/dsh-dsh-lsp-actions)** | Diagnósticos, formato, autocompletado, acciones de código y renombrado LSP sobre servidores de lenguaje | |
| **[dsh-dsh-mask](https://github.com/PerryLink/dsh-dsh-mask)** | Middleware de enmascaramiento de PII: anonimiza en el límite del modelo, restaura en la capa de visualización | |
| **[dsh-dsh-mcp-panel](https://github.com/PerryLink/dsh-dsh-mcp-panel)** | Panel de tiempo de ejecución MCP de solo lectura: comando /mcp + pestaña Settings con estado, herramientas y errores | |
| **[dsh-dsh-memento](https://github.com/PerryLink/dsh-dsh-memento)** | Memoria entre sesiones controlada por aprobación: costura ctx.memory + SQLite + herramienta de memoria | |
| **[dsh-dsh-observe](https://github.com/PerryLink/dsh-dsh-observe)** | Exportador de observabilidad OpenTelemetry y Langfuse para DeepSeek Harness. | |
| **[dsh-dsh-output-styles](https://github.com/PerryLink/dsh-dsh-output-styles)** | Cambio de estilo en tiempo de ejecución equivalente a outputStyles de Claude Code | |
| **[dsh-dsh-permission-rules](https://github.com/PerryLink/dsh-dsh-permission-rules)** | Reglas de permisos declarativas allow/deny/ask estilo Claude Code con auditoría | |
| **[dsh-dsh-plugin-guide](https://github.com/PerryLink/dsh-dsh-plugin-guide)** | Base de conocimiento de desarrollo de plugins como habilidad de agente bajo demanda | |
| **[dsh-dsh-score](https://github.com/PerryLink/dsh-dsh-score)** | Puntuación de calidad multidimensional para plugins de DeepSeek Harness. | |
| **[dsh-dsh-session-pin](https://github.com/PerryLink/dsh-dsh-session-pin)** | Fija sesiones en la barra lateral web con orden durable | |
| **[dsh-dsh-session-sync](https://github.com/PerryLink/dsh-dsh-session-sync)** | Sincronización de sesiones entre dispositivos para DeepSeek Harness — un espejo git dedicado de tu almacén de sesiones. | |
| **[dsh-dsh-skill-pack-security](https://github.com/PerryLink/dsh-dsh-skill-pack-security)** | Paquete de habilidades de auditoría de seguridad: escaneo de secretos, revisión de dependencias y cadena de suministro | |
| **[dsh-dsh-talk](https://github.com/PerryLink/dsh-dsh-talk)** | Bucle de sesión con voz para DeepSeek Harness: háblale y escucha su respuesta. | |
| **[dsh-dsh-test-drive](https://github.com/PerryLink/dsh-dsh-test-drive)** | Pruebas de instalación y humo aisladas para plugins de DeepSeek Harness. | |
| **[dsh-dsh-translate](https://github.com/PerryLink/dsh-dsh-translate)** | Traducción de parámetros entre proveedores y reparación determinista de JSON para DeepSeek Harness. | |

## License

Apache-2.0 — ver [LICENSE](LICENSE).

### Instalar desde el mercado de DSH Desktop

Todos los plugins de PerryLink pueden explorarse en el mercado integrado de DSH Desktop: **Market → Sources → add source → pegar** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ seleccionarlo**. La instalación sigue pasando por la verificación de identidad npm del mercado y tu confirmación.
