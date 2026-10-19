<div align="center">

# 📑 dsh-research-report
- **Canal 1024 store**: `npm i -g dsh1024` una vez, luego `dsh1024 plugin --profile web add dsh-research-report` (cuenta para el ranking de instalaciones de [deepseek1024.com](https://deepseek1024.com)).

**Un motor de informes de investigación verificables para DeepSeek Harness.**

*Cada afirmación (claim) queda vinculada a instantáneas de evidencia inmutables, se verifica byte a byte y se sella en un informe versionado cuyo hash de manifiesto cualquiera puede recomputar.*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-research-report)
[![DSH plugin](https://img.shields.io/badge/dsh--plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![dsh-doctor](https://raw.githubusercontent.com/PerryLink/dsh-plugin-doctor/main/badges/PerryLink__dsh-research-report.svg)](https://github.com/PerryLink/dsh-plugin-doctor#verified-徽章)
[![DSH Market](https://raw.githubusercontent.com/2BingLing/dsh-market/master/assets/readme/badge-top-rated.svg)](https://dsh.market/)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-research-report/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-research-report/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-research-report?label=version)](https://github.com/PerryLink/dsh-research-report/releases)
[![npm version](https://img.shields.io/npm/v/dsh-research-report)](https://www.npmjs.com/package/dsh-research-report)
[![npm downloads](https://img.shields.io/npm/dm/dsh-research-report)](https://www.npmjs.com/package/dsh-research-report)
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-research-report?metric=downloads&lang=es)](https://dshfind.com/es/plugins/PerryLink/dsh-research-report?ref=badge)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

```sh
dsh plugin --profile <name> add dsh-research-report
```


</div>

---


**📖 Base de conocimiento del ecosistema** — datos medidos, no marketing: [guía de desarrollo · datos de selección · criterios de mantenimiento](https://perrylink.github.io/dsh-plugin-guide/).

<!-- star-cta -->
## Install & uninstall

```sh
dsh plugin --profile demo add dsh-research-report       # instalar
dsh plugin --profile demo remove dsh-research-report    # desinstalar
```

Verifica que la fila se monta: `dsh --profile demo --dump-config | grep dsh-research-report`.

## ⭐ 如果它帮到了你

Este plugin forma parte de la [familia de plugins DSH](https://github.com/PerryLink) (más de 40, todos Apache-2.0). Si te resulta útil, **dale una estrella**: no desbloquea nada, pero ayuda a que la siguiente persona lo encuentre antes.

*English:* part of a 95 plugin family for DeepSeek Harness. If it is useful, **a star helps the next person find it** — nothing is gated behind it.

## What is dsh-research-report?

Un motor de informes de investigación verificables para DeepSeek Harness.

Cada afirmación (claim) queda vinculada a instantáneas de evidencia inmutables, se verifica byte a byte y se sella en un informe versionado cuyo hash de manifiesto cualquiera puede recomputar.

![Diagrama de flujo de dsh-research-report: pregunta → fuentes selladas → informe.](docs/assets/dsh-research-report-flow.svg)

*Resumen del flujo: pregunta → fuentes selladas → informe. Los ejemplos siguientes usan la superficie de comandos real.*


*La misma ejecución, animada.*

## Compatibility

- DeepSeek Harness `dsh-v0.2.1-alpha.1` (verificado el 2026-09-25). Línea npm dev/test `0.1.7-rc.2`; peers `>=0.1.6-0 <0.2.0 || >=0.1.7-0 <0.2.0`. La matriz compat fija las cuatro líneas peer declaradas. En esta línea el tercer parámetro de `Session.append` es un `SurfaceIntent` solo para tipos de superficie, así que los eventos `research-report/*` siguen sin registrarse en el log de sesión: los diarios del ledger son la fuente duradera y el espejo de auditoría se activa cuando el host conoce el vocabulario (el candado de regresión en `test/events-gate.spec.ts` lo fija).
0.1.5-alpha.1 (adaptado el 2026-09-09): el sobre de sesión conserva su campo ignorable solo para compatibilidad de lectura de logs almacenados - Session.append aún no puede estamparlo, por lo que el comportamiento de la puerta no cambia. Verificado el 2026-09-11 contra los tipos publicados 0.1.5-rc.2 (cadena completa de puertas local); el workflow compat fija ambas líneas peer declaradas.
- Node `^22.19.0 || >=24.0.0`, solo ESM (`"type": "module"`).
- Dependencias peer: `@deepseek-ai/cordis ^4.0.2`, `@deepseek-ai/schemastery ^3.18.2`, y `@deepseek-ai/dsh-session`, `@deepseek-ai/dsh-tools`, `@deepseek-ai/dsh-system-prompt`, `@deepseek-ai/dsh-web`, `@deepseek-ai/dsh-jobs` en `>=0.1.6-0 <0.2.0 || >=0.1.7-0 <0.2.0`.
- Hermanos opcionales (nunca obligatorios): proveedores de `ctx.web` para captura URL/recolección, `ctx.jobs` para ensamblado en segundo plano, `ctx.dataQuality` (dsh-data-quality) para verificación de citas sobre datasets.

## What you get

- **Libro de evidencia (evidence ledger)** — almacén de instantáneas direccionado por contenido (`<ledgerRoot>/objects/<sha256>` + diarios JSONL). El mismo contenido se guarda una sola vez; las instantáneas son inmutables; cada lectura recomputa el hash, de modo que la manipulación o el borrado se detectan en lugar de confiarse.
- **Vínculo claim ↔ evidencia** — los claims se registran con los ids de evidencia en que se apoyan; el libro conserva el vínculo y cada veredicto de verificación (gana el más reciente).
- **Verificación a nivel de byte** — cada número y cada fragmento entrecomillado de un claim debe poder localizarse literalmente en las instantáneas vinculadas. Sin evidencia vinculada, o sin literal comprobable, el claim se marca `unverified`; evidencia vinculada que no puede confirmar ni desmentir los literales citados lo marca `insufficient`; una etiqueta cuyo valor difiere en la instantánea (y el valor citado está ausente) lo marca `disproven`; instantáneas manipuladas o ausentes lo marcan `contradicted`. Sin semántica, sin embeddings — solo comprobaciones de bytes auditables.
- **Puente numérico opcional** — cuando un claim cita un dataset estructurado del workspace (CSV/JSON) y `dsh-data-quality` está montado, las citas se verifican con tolerancias mediante su contrato congelado `verifyCitations`; una discrepancia del dataset desmiente (disproves) el claim.
- **Evidencia DOI (sin red)** — los orígenes DOI se validan determinísticamente (estructura `10.xxxx/xxxx`, lista blanca de prefijos y juego de caracteres DOI); los DOI inválidos fallan ruidosamente. Se acepta metadato opcional de revista/año, y `requireJournalMetadata` solo restringe la evidencia DOI académica cuando está habilitado.
- **Informes sellados versionados** — `<reportRoot>/<slug(topic)>/<YYYYMMDD-HHmmss>/report.md` + `manifest.json` + `verification.jsonl` + `disconfirmation.jsonl`; el hash de sellado es el SHA-256 del manifiesto, que a su vez lleva el hash del informe, los hashes de toda la evidencia y el hash de cada diario de auditoría.
- **Reauditoría previa a la entrega e interceptación del sellado** — antes de sellar, cada claim vinculado se re-verifica sin conexión y se registra en `verification.jsonl`; el drift de veredicto, la evidencia vinculada manipulada/ausente, o un fallo de serialización del diario bloquean el sellado (falla ruidosamente, sin tunable).
- **Libro de falsificación** — cada claim contradicho o desmentido se registra en `disconfirmation.jsonl` (claim + referencias de evidencia + motivo) y se lista en el apéndice `registro de falsificación` del informe.
- **Conocimiento negativo** — un claim desmentido se recuerda por su hash de contenido (`disproofs.jsonl`); el mismo texto re-reportado contra evidencia sin cambios se fuerza de nuevo a `disproven` y solo se re-verifica cuando la evidencia cambia.
- **Bucle de verificación de solo lectura** — tras sellar, el respaldo determinista `verifySealedReport` (sin red, sin modelo) recomputa el sello y los hashes de auditoría y re-comprueba cada claim, escribiendo la sección de comprobación de máquina en `verifier-note.md`; con `ctx.jobs` montado también se lanza un trabajo de verificación de solo lectura (la revisión del modelo es una mejora, nunca un reemplazo).
- **Evidencia anclada a sesión** — `evidence_add` acepta un `sessionRef` opcional (`sessionId` + `eventRange`, validado ruidosamente); el ancla se guarda y se registra en el Apéndice B, el manifiesto y `verification.jsonl`. La evidencia anclada a sesión se verifica honestamente como `unverified` (`la evidencia anclada a la sesión requiere una verificación manual en el registro de la sesión`).
- **Brechas honestas** — los claims no verificados, insuficientes, contradichos o desmentidos conservan una marca visible `[未核实]` / `[证据不足]` / `[与证据矛盾]` / `[已证伪]` en el cuerpo del informe y se listan en el Apéndice A. Nada se aprueba en silencio.
- **Sin bucle de deep-research** — la orquestación de recuperación se reutiliza deliberadamente: `ctx.web` para buscar/descargar, `ctx.jobs` para trabajos largos. La planificación y la síntesis quedan en el modelo (o en un plugin upstream).

## Quick start

```sh
dsh plugin --profile web add github:PerryLink/dsh-research-report
```

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

### Ejemplos

Son los puntos de entrada reales; instala y llama a uno.

#### Ejemplo detallado

**Comando**

~~~sh
research_report({
  topic: "示例行业概览",
  sections: [{ heading: "市场规模", paragraphs: [{ text: "2025 年全球示例行业市场规模为 1,280 亿元。", claimIds: ["c1"] }] }],
  claims: [{ id: "c1", text: "市场规模为 1,280 亿元", evidenceIds: ["ev-5dc0a84d0e48"] }],
  evidenceRefs: ["ev-5dc0a84d0e48", "ev-c6cf024e0916", "ev-61f8f4533cb7"]
})
~~~

**Salida**

~~~text
report sealed: /tmp/rr-test-4U2mlF/reports/示例行业概览/20261019-124904
seal (sha256 of manifest.json): 5c85c97597096ced281ca191d7abaaf7434f18b397d35ac81c31aa364a3b12f9
claims: 1 verified / 0 unverified / 0 contradicted / 0 insufficient / 0 disproven (of 1); evidence bound: 3
~~~

*Observado en `README.md:112-118,150; test/index.spec.ts:166-177; src/tools/research-report.ts:170-175`*

#### Ejemplos breves

- `research_report`
- `ledger_query`

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
- **Eventos de sesión adaptativos** — el plugin declara los eventos de sesión tipados `research-report/evidence`, `research-report/verify` y `research-report/seal`, pero el `Session.append` de 0.1.5-alpha.1 sigue sin opción `ignorable` ni superficie de registro de eventos para plugins, así que los appends se activan solo cuando el build del host conoce los tipos (si no, la capa de persistencia rechazaría el log al restaurar). Los diarios del libro son siempre la fuente durable de verdad.
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

- `typecheck` resuelve `@deepseek-ai/*` a través de los peers 0.1.7-rc.2 instalados; `typecheck:ci` desactiva `skipLibCheck` y activa `verbatimModuleSyntax` contra los tipos publicados. Ambos deben permanecer verdes.
- Las pruebas usan los `Context`/`Session`/`ToolRuntime`/`LocalJobRegistry`/`WebRuntime` reales de los peers 0.1.7-rc.2; solo los backends de red son proveedores scriptados registrados a través de los registros reales de `ctx.web`.
- Release: `node scripts/release.mjs <x.y.z>` (sube versión, sella CHANGELOG, re-ejecuta la puerta, commitea + etiqueta; nunca hace push).

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `cordis`, `research`, `evidence-ledger`, `verifiable-report`, `audit`, `citation-verification`

## Contributors

- [PerryLink](https://github.com/PerryLink) — autor original y mantenedor: arquitectura del plugin, ledger de evidencias, verificación a nivel de byte, informes sellados, documentación en cinco idiomas y automatización de CI/publicación.

## PerryLink DSH Plugin Family

Este proyecto forma parte de la familia de plugins de DeepSeek Harness de [PerryLink](https://github.com/PerryLink). El registro permanece plegado abajo para que cada README conserve una primera pantalla corta; expándelo para ver cada fila y su estado.

<details>
<summary>Expandir todos los plugins</summary>

| Plugin | Estado |
|---|---|
| **[dsh-aqua-input-check](https://github.com/PerryLink/dsh-aqua-input-check)** |  |
| **[dsh-archive-check](https://github.com/PerryLink/dsh-archive-check)** |  |
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** |  |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** |  |
| **[dsh-bid-ca-precheck](https://github.com/PerryLink/dsh-bid-ca-precheck)** |  |
| **[dsh-bid-qual-check](https://github.com/PerryLink/dsh-bid-qual-check)** |  |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** |  |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** |  |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** |  |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** |  |
| **[dsh-contract-stance](https://github.com/PerryLink/dsh-contract-stance)** |  |
| **[dsh-customs-doc-check](https://github.com/PerryLink/dsh-customs-doc-check)** |  |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** |  |
| **[dsh-demurrage-ledger](https://github.com/PerryLink/dsh-demurrage-ledger)** |  |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** |  |
| **[dsh-drill-script-check](https://github.com/PerryLink/dsh-drill-script-check)** |  |
| **[dsh-eia-guide-check](https://github.com/PerryLink/dsh-eia-guide-check)** |  |
| **[dsh-emergency-plan](https://github.com/PerryLink/dsh-emergency-plan)** |  |
| **[dsh-essay-rubric-check](https://github.com/PerryLink/dsh-essay-rubric-check)** |  |
| **[dsh-evidence-check](https://github.com/PerryLink/dsh-evidence-check)** |  |
| **[dsh-export-ctl-check](https://github.com/PerryLink/dsh-export-ctl-check)** |  |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** |  |
| **[dsh-fmea-table-check](https://github.com/PerryLink/dsh-fmea-table-check)** |  |
| **[dsh-forecast-penalty](https://github.com/PerryLink/dsh-forecast-penalty)** |  |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** |  |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** |  |
| **[dsh-gongwen-flow-check](https://github.com/PerryLink/dsh-gongwen-flow-check)** |  |
| **[dsh-gongwen-word-check](https://github.com/PerryLink/dsh-gongwen-word-check)** |  |
| **[dsh-guard-plan-qc](https://github.com/PerryLink/dsh-guard-plan-qc)** |  |
| **[dsh-hazchem-check](https://github.com/PerryLink/dsh-hazchem-check)** |  |
| **[dsh-hazplan-check](https://github.com/PerryLink/dsh-hazplan-check)** |  |
| **[dsh-hidden-risk-map](https://github.com/PerryLink/dsh-hidden-risk-map)** |  |
| **[dsh-hs-classify](https://github.com/PerryLink/dsh-hs-classify)** |  |
| **[dsh-icd-rule-check](https://github.com/PerryLink/dsh-icd-rule-check)** |  |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** |  |
| **[dsh-lawcite-adapter](https://github.com/PerryLink/dsh-lawcite-adapter)** |  |
| **[dsh-laya](https://github.com/PerryLink/dsh-laya)** |  |
| **[dsh-lc-doc-check](https://github.com/PerryLink/dsh-lc-doc-check)** |  |
| **[dsh-learning-gap-check](https://github.com/PerryLink/dsh-learning-gap-check)** |  |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** |  |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** |  |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** |  |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** |  |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** |  |
| **[dsh-medrec-qc](https://github.com/PerryLink/dsh-medrec-qc)** |  |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** |  |
| **[dsh-nsfc-form-check](https://github.com/PerryLink/dsh-nsfc-form-check)** |  |
| **[dsh-nurse-record-check](https://github.com/PerryLink/dsh-nurse-record-check)** |  |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** |  |
| **[dsh-origin-rvc-check](https://github.com/PerryLink/dsh-origin-rvc-check)** |  |
| **[dsh-ota-review-check](https://github.com/PerryLink/dsh-ota-review-check)** |  |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** |  |
| **[dsh-paper-doc-adapter](https://github.com/PerryLink/dsh-paper-doc-adapter)** |  |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** |  |
| **[dsh-permit-report-check](https://github.com/PerryLink/dsh-permit-report-check)** |  |
| **[dsh-pipeline-check](https://github.com/PerryLink/dsh-pipeline-check)** |  |
| **[dsh-pleading-draft](https://github.com/PerryLink/dsh-pleading-draft)** |  |
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** |  |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** |  |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** |  |
| **[dsh-plugin-upgrade](https://github.com/PerryLink/dsh-plugin-upgrade)** |  |
| **[dsh-policy-brief-draft](https://github.com/PerryLink/dsh-policy-brief-draft)** |  |
| **[dsh-power-loss-split](https://github.com/PerryLink/dsh-power-loss-split)** |  |
| **[dsh-power-ticket-check](https://github.com/PerryLink/dsh-power-ticket-check)** |  |
| **[dsh-ppap-check](https://github.com/PerryLink/dsh-ppap-check)** |  |
| **[dsh-protest-deadline](https://github.com/PerryLink/dsh-protest-deadline)** |  |
| **[dsh-railway-window](https://github.com/PerryLink/dsh-railway-window)** |  |
| **[dsh-repair-order-qc](https://github.com/PerryLink/dsh-repair-order-qc)** |  |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** |  |
| **[dsh-review-reply-check](https://github.com/PerryLink/dsh-review-reply-check)** |  |
| **[dsh-rulefile-check](https://github.com/PerryLink/dsh-rulefile-check)** |  |
| **[dsh-safety-brief-check](https://github.com/PerryLink/dsh-safety-brief-check)** |  |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** |  |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** |  |
| **[dsh-site-log-check](https://github.com/PerryLink/dsh-site-log-check)** |  |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** |  |
| **[dsh-soe-decision-check](https://github.com/PerryLink/dsh-soe-decision-check)** |  |
| **[dsh-soilwater-check](https://github.com/PerryLink/dsh-soilwater-check)** |  |
| **[dsh-sop-sync-check](https://github.com/PerryLink/dsh-sop-sync-check)** |  |
| **[dsh-spc-gbt-adapter](https://github.com/PerryLink/dsh-spc-gbt-adapter)** |  |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** |  |
| **[dsh-tender-extract](https://github.com/PerryLink/dsh-tender-extract)** |  |
| **[dsh-tender-matrix](https://github.com/PerryLink/dsh-tender-matrix)** |  |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** |  |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** |  |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** |  |
| **[dsh-warranty-calc](https://github.com/PerryLink/dsh-warranty-calc)** |  |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | 🚫 RETIRADO — ver el README del repositorio |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | 🚫 RETIRADO — ver el README del repositorio |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | 🚫 RETIRADO — ver el README del repositorio |

</details>

## License

Apache-2.0 — ver [LICENSE](LICENSE).

### Instalar desde el mercado de DSH Desktop

Todos los plugins de PerryLink pueden explorarse en el mercado integrado de DSH Desktop: **Market → Sources → add source → pegar** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ seleccionarlo**. La instalación sigue pasando por la verificación de identidad npm del mercado y tu confirmación.
