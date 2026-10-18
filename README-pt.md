<div align="center">

# 📑 dsh-research-report
- **Canal 1024 store**: `npm i -g dsh1024` uma vez, depois `dsh1024 plugin --profile web add dsh-research-report` (conta para o ranking de instalações do [deepseek1024.com](https://deepseek1024.com)).

**Um motor de relatórios de pesquisa verificáveis para DeepSeek Harness.**

*Cada afirmação (claim) fica vinculada a snapshots de evidência imutáveis, é verificada byte a byte e é selada num relatório versionado cujo hash de manifesto qualquer pessoa pode recomputar.*

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
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-research-report?metric=downloads&lang=pt)](https://dshfind.com/pt/plugins/PerryLink/dsh-research-report?ref=badge)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

```sh
dsh plugin --profile <name> add dsh-research-report
```


</div>

---


**📖 Base de conhecimento do ecossistema** — dados medidos, não marketing: [guia de desenvolvimento · dados de seleção · critérios de manutenção](https://perrylink.github.io/dsh-plugin-guide/).

<!-- star-cta -->
## Install & uninstall

```sh
dsh plugin --profile demo add dsh-research-report       # instalar
dsh plugin --profile demo remove dsh-research-report    # desinstalar
```

Verifica que a linha monta: `dsh --profile demo --dump-config | grep dsh-research-report`.

## ⭐ 如果它帮到了你

Este plugin faz parte da [família de plugins DSH](https://github.com/PerryLink) (mais de 40, todos Apache-2.0). Se for útil, **deixe uma estrela**: não desbloqueia nada, mas ajuda a próxima pessoa a encontrá-lo.

*English:* part of a 95 plugin family for DeepSeek Harness. If it is useful, **a star helps the next person find it** — nothing is gated behind it.

## What is dsh-research-report?

Um motor de relatórios de pesquisa verificáveis para DeepSeek Harness.

Cada afirmação (claim) fica vinculada a snapshots de evidência imutáveis, é verificada byte a byte e é selada num relatório versionado cujo hash de manifesto qualquer pessoa pode recomputar.

![Demonstração de terminal do dsh-research-report: dsh-research-report — evidence ledger, claims, and the seal](https://raw.githubusercontent.com/PerryLink/dsh-research-report/main/docs/assets/dsh-research-report-hero.png)

![Animated terminal demo of dsh-research-report](https://raw.githubusercontent.com/PerryLink/dsh-research-report/main/docs/assets/dsh-research-report-demo.gif)

*A mesma execução, animada.*

## Compatibility

- DeepSeek Harness `dsh-v0.2.1-alpha.1` (verificado em 2026-09-25). Linha npm dev/test `0.1.7-rc.2`; peers `>=0.1.6-0 <0.2.0 || >=0.1.7-0 <0.2.0`. A matriz compat fixa as quatro linhas peer declaradas. Nesta linha o terceiro parâmetro de `Session.append` é um `SurfaceIntent` apenas para tipos de superfície, então os eventos `research-report/*` continuam sem ser gravados no log de sessão: os diários do ledger são a fonte durável e o espelho de auditoria ativa quando o host conhece o vocabulário (o cadeado de regressão em `test/events-gate.spec.ts` fixa isso).
0.1.5-alpha.1 (adaptado em 2026-09-09): o envelope de sessão mantém seu campo ignorable apenas para compatibilidade de leitura de logs armazenados - o Session.append ainda não consegue estampá-lo, então o comportamento da porta não muda. Verificado em 2026-09-11 contra os tipos publicados 0.1.5-rc.2 (cadeia completa de portas local); o workflow compat fixa ambas as linhas peer declaradas.
- Node `^22.19.0 || >=24.0.0`, apenas ESM (`"type": "module"`).
- Dependências peer: `@deepseek-ai/cordis ^4.0.2`, `@deepseek-ai/schemastery ^3.18.2`, e `@deepseek-ai/dsh-session`, `@deepseek-ai/dsh-tools`, `@deepseek-ai/dsh-system-prompt`, `@deepseek-ai/dsh-web`, `@deepseek-ai/dsh-jobs` em `>=0.1.6-0 <0.2.0 || >=0.1.7-0 <0.2.0`.
- Irmãos opcionais (nunca obrigatórios): providers de `ctx.web` para captura de URL/coleta, `ctx.jobs` para montagem em segundo plano, `ctx.dataQuality` (dsh-data-quality) para verificação de citações em datasets.

## What you get

- **Livro-razão de evidência** — armazenamento de snapshots endereçado por conteúdo (`<ledgerRoot>/objects/<sha256>` + diários JSONL). O mesmo conteúdo é guardado exatamente uma vez; snapshots são imutáveis; cada leitura recomputa o hash, de modo que adulteração ou remoção é detetada em vez de confiada.
- **Vínculo claim ↔ evidência** — claims registam-se com os ids de evidência em que se apoiam; o livro guarda o vínculo e cada veredito de verificação (o mais recente vence).
- **Verificação ao nível do byte** — cada número e cada trecho entre aspas de um claim tem de ser localizável literalmente nos snapshots vinculados. Sem evidência vinculada, ou sem literal verificável, o claim marca-se `unverified`; evidência vinculada que não consegue confirmar nem desmentir os literais citados marca-o `insufficient`; um rótulo cujo valor difere no snapshot (estando o valor citado ausente) marca-o como `disproven`; snapshots adulterados/ausentes marcam-no `contradicted`. Sem semântica, sem embeddings — apenas verificações de bytes auditáveis.
- **Ponte numérica opcional** — quando um claim cita um dataset estruturado do workspace (CSV/JSON) e o `dsh-data-quality` está montado, as citações são verificadas com tolerâncias através do seu contrato congelado `verifyCitations`; uma discrepância do dataset desmente (disproves) o claim.
- **Evidência DOI (sem rede)** — origens DOI são validadas deterministicamente (estrutura `10.xxxx/xxxx`, lista branca de prefixos e conjunto de caracteres DOI); DOIs inválidos falham ruidosamente. Metadados opcionais de revista/ano são aceites, e `requireJournalMetadata` só restringe a evidência DOI académica quando ativado.
- **Relatórios selados versionados** — `<reportRoot>/<slug(topic)>/<YYYYMMDD-HHmmss>/report.md` + `manifest.json` + `verification.jsonl` + `disconfirmation.jsonl`; o hash de selo é o SHA-256 do manifesto, que por sua vez carrega o hash do relatório, os hashes de toda a evidência e o hash de cada diário de auditoria.
- **Reauditoria pré-entrega e interceção do selo** — antes de selar, cada claim vinculado é re-verificado offline e registado em `verification.jsonl`; drift de veredito, evidência vinculada adulterada/ausente, ou falha de serialização do diário bloqueiam o selo (falha ruidosamente, sem tunable).
- **Livro de falsificação** — cada claim contradito ou desmentido é registado em `disconfirmation.jsonl` (claim + referências de evidência + motivo) e listado no apêndice `registro de falsificação` do relatório.
- **Conhecimento negativo** — um claim desmentido é recordado pelo seu hash de conteúdo (`disproofs.jsonl`); o mesmo texto re-reportado contra evidência inalterada é forçado de volta a `disproven` e só se re-verifica quando a evidência muda.
- **Ciclo de verificação de só-leitura** — após selar, o recurso determinista `verifySealedReport` (sem rede, sem modelo) recomputa o selo e os hashes de auditoria e re-verifica cada claim, escrevendo a secção de verificação de máquina em `verifier-note.md`; com `ctx.jobs` montado também é lançado um trabalho de verificação de só-leitura (a revisão do modelo é uma melhoria, nunca uma substituição).
- **Evidência ancorada a sessão** — `evidence_add` aceita um `sessionRef` opcional (`sessionId` + `eventRange`, validado ruidosamente); a âncora é guardada e registada no Apêndice B, no manifesto e em `verification.jsonl`. A evidência ancorada a sessão verifica-se honestamente como `unverified` (`a evidência ancorada à sessão requer uma verificação manual no registo da sessão`).
- **Lacunas honestas** — claims não verificados, insuficientes, contraditos ou desmentidos mantêm uma marca visível `[未核实]` / `[证据不足]` / `[与证据矛盾]` / `[已证伪]` no corpo do relatório e são listados no Apêndice A. Nada passa em silêncio.
- **Sem ciclo de deep-research** — a orquestração de recuperação é deliberadamente reutilizada: `ctx.web` para pesquisa/download, `ctx.jobs` para trabalhos longos. Planeamento e síntese ficam com o modelo (ou um plugin a montante).

## Quick start

```sh
dsh plugin --profile web add github:PerryLink/dsh-research-report
```

### Canal git

```sh
# A partir de um profile de teste (fixa o commit; executa o build `prepare` autossuficiente)
dsh plugin --profile demo add "github:YOUR_ORG/dsh-research-report#<sha>"
# O primeiro add acrescenta uma entrada allowBuilds para dsh-research-report no pnpm-workspace.yaml do profile.
```

### Canal npm

```sh
dsh plugin --profile demo add dsh-research-report
```

Ambos os canais instalam a linha do bundle (ver `cordis.patch.yml`) na pilha `dsh.profile.bundles` do profile e entram em vigor após reiniciar.

Depois, numa sessão:

```
evidence_add({ origin: "docs/market.md", title: "Market snapshot" })     # → ev-1a2b3c4d5e6f
research_report({ topic: "示例行业概览", sections: [...], claims: [...], evidenceRefs: ["ev-1a2b…"] })
ledger_query({ claimId: "c1" })                                          # vínculos + veredito
```

## Configuration

Todos os ajustes são campos `Config` de Schemastery; valores inválidos falham ruidosamente no carregamento do profile. Raízes relativas resolvem contra o diretório de trabalho do harness (o workspace).

| Key | Default | Description |
| --- | --- | --- |
| `enabled` | `true` | Interruptor mestre; `false` não monta nada. |
| `ledgerRoot` | `.research-ledger` | Diretório do livro de evidência (objetos + diários JSONL). |
| `reportRoot` | `research-reports` | Raiz dos relatórios selados (versionados por tópico e timestamp). |
| `maxEvidenceBytes` | `2097152` | Teto rígido de bytes UTF-8 por snapshot de evidência. |
| `maxEvidencePerReport` | `200` | Teto rígido de evidências vinculadas a um relatório. |
| `fetchTimeoutMs` | `20000` | Prazo (ms) de cada `ctx.web` fetch durante a captura. |
| `requireJournalMetadata` | `false` | Quando `true`, a evidência de tipo DOI tem de trazer nome de revista e ano de publicação ao registar (falha ruidosamente caso contrário). |

## Tools & surfaces

- **`evidence_add({ origin, content?, title? })`** — regista um snapshot de evidência. Com `content`, o texto é guardado literal; sem ele, uma origem URL é descarregada via `ctx.web` e um caminho relativo do workspace é lido do disco (leituras nunca escapam do workspace). Devolve o id da evidência e o hash SHA-256.
- **`research_report({ topic, title?, sections, claims, evidenceRefs, gather?, depth?, background? })`** — monta e sela um relatório: valida (referências a claims não registados são rejeitadas ruidosamente), verifica cada claim, renderiza `report.md` com marcas visíveis, escreve `manifest.json` e devolve o hash de selo. `gather: true` executa UMA ronda de pesquisa sobre `ctx.web` e devolve evidência candidata capturada mais uma lista explícita de lacunas — nunca monta automaticamente. `background: true` devolve `{ kind: 'background', jobId }` sobre `ctx.jobs`.
- **`ledger_query({ claimId? | evidenceId? })`** — consultas só de leitura de vínculos/vereditos; a evidência é re-hasheada na leitura, por isso um snapshot adulterado ou em falta é reportado explicitamente. Sem id, devolve um resumo do livro.
- **`ctx.researchReport.assemble(request)`** — a superfície de serviço congelada para plugins irmãos (ver `src/service.ts`; protegida byte a byte por `scripts/verify-frozen-contract.mjs`).

## Permissions & data

`dsh-research-report` consome apenas seams públicos: `ctx.tools`, `ctx.systemPrompt`, e opcionalmente `ctx.web` / `ctx.jobs` / `ctx.dataQuality` (consultados no momento da chamada, nunca injetados). Escreve apenas dentro das raízes configuradas de livro e relatórios (ambas por omissão diretórios locais do workspace), lê ficheiros do workspace apenas dentro do workspace, e acede à rede exclusivamente através do seam web do harness — nunca um `fetch` direto. Snapshots de evidência são imutáveis e endereçados por conteúdo; registos de claims são imutáveis; vereditos são apenas de anexação.

## Security boundaries

- **Evidência de adulteração por construção** — cada leitura de snapshot recomputa o SHA-256 contra o índice; uma discrepância verifica os claims vinculados como `contradicted` e o `ledger_query` reporta `integrity: tampered`/`missing`.
- **Confinamento ao workspace** — leituras locais de evidência resolvem contra a raiz do workspace e recusam escapes (ambos os lados passam por `path.resolve` antes de comparar).
- **Configuração que falha ruidosamente** — limites inválidos lançam no mount; referências a claims não registados, ids de evidência desconhecidos e conflitos id/conteúdo lançam na montagem.
- **Sem gestão de credenciais, sem rede oculta** — a captura de URLs passa por `ctx.web` (seleção de provider, taxonomia de erros e qualquer política SSRF ficam nos providers web do deployment).
- **Registos reversíveis** — cada contribuição passa por `ctx.effect()` / `register()`, logo desinstalação e hot reload são limpos.

## Known limitations

- **Ao nível do byte, não semântico** — a verificação incorporada localiza literais numéricos/entre aspas verbatim; claims parafraseados sem literal verificável ficam `unverified`, e um claim verdadeiro cujo número está ausente enquanto o seu rótulo aparece com outro valor fica `contradicted`. É uma escolha deliberada da v1 (auditável acima de inteligente).
- **Eventos de sessão adaptativos** — o plugin declara os eventos de sessão tipados `research-report/evidence`, `research-report/verify` e `research-report/seal`, mas o `Session.append` de 0.1.5-alpha.1 continua sem opção `ignorable` nem superficie de registo de eventos para plugins, por isso os appends só ativam quando o build do host conhece os tipos (caso contrário a camada de persistência recusaria o log no restore). Os diários do livro são sempre a fonte durável da verdade.
- **Profiles por omissão não montam provider de fetch** — o `dsh-base` distribuído monta apenas pesquisa, por isso a captura de URLs falha ruidosamente (`WEB_UNAVAILABLE`/`WEB_PROVIDER_UNAVAILABLE`) até configurar um provider de fetch; o `gather` baseado em pesquisa lista as fontes não capturadas na lista de lacunas.
- **Âmbito de um só workspace** — as raízes de livro e relatórios resolvem contra o diretório de trabalho do harness no mount; deployments multi-workspace devem configurar raízes absolutas por profile.

## Verifier CLI

O binário independente `dsh-research-verify` (empacotado como `lib/cli.js`, sem imports de `@deepseek-ai`) audita qualquer diretório de relatório selado sem montar o plugin:

```sh
dsh-research-verify --report <dir> [--seal <sha256>] [--ledger <dir>] [--format json|sarif]
```

- `--report <dir>` — diretório selado (`manifest.json` + `report.md` + diários de auditoria).
- `--seal <sha256>` — hash de selo esperado para comparar com o hash do manifest recalculado; omitido = apenas o valor é informado, sem comparação.
- `--ledger <dir>` — raiz do ledger de evidências (`objects/<sha256>` + `index.jsonl`) para re-verificar claims byte a byte; omitido = os re-checks de claims são omitidos honestamente.
- `--format` — `json` (padrão) ou `sarif` (SARIF 2.1.0).

Recalcula o hash de selo, o hash de `report.md` e os hashes dos diários, re-executa a verificação byte-level + integridade por claim, e sai com código não nulo se alguma checagem falhar. `verifySealedReport` / `buildVerificationReport` / `renderSarif` / `renderVerificationJson` são exportados do pacote para uso como biblioteca.

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

- `typecheck` resolve `@deepseek-ai/*` através dos peers 0.1.7-rc.2 instalados; `typecheck:ci` desativa `skipLibCheck` e ativa `verbatimModuleSyntax` contra os tipos publicados. Ambos têm de ficar verdes.
- Os testes usam os `Context`/`Session`/`ToolRuntime`/`LocalJobRegistry`/`WebRuntime` reais dos peers 0.1.7-rc.2; apenas os backends de rede são providers scriptados registados através dos registos reais de `ctx.web`.
- Release: `node scripts/release.mjs <x.y.z>` (sobe versão, carimba CHANGELOG, re-executa a gate, commita + etiqueta; nunca faz push).

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `cordis`, `research`, `evidence-ledger`, `verifiable-report`, `audit`, `citation-verification`

## Contributors

- [PerryLink](https://github.com/PerryLink) — autor original e mantenedor: arquitetura do plugin, ledger de evidências, verificação em nível de byte, relatórios selados, documentação em cinco idiomas e automação de CI/lançamento.

## PerryLink DSH Plugin Family

Este projeto é um dos **87 plugins ativamente mantidos** do DeepSeek Harness da [PerryLink](https://github.com/PerryLink). O registro da família tem **95** plugins — **5 congelados**, **3 retirados** — e fica recolhido abaixo para que cada README mantenha uma primeira tela curta. Expanda para ver cada linha, com o motivo na coluna Status.

<details>
<summary>Expandir os 95 plugins</summary>

| Plugin | Uma linha | Status |
|---|---|---|
| **[dsh-aqua-input-check](https://github.com/PerryLink/dsh-aqua-input-check)** | 水产养殖投入品记录核对（按投入品用量、休药期与起捕间隔核对记录自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-archive-check](https://github.com/PerryLink/dsh-archive-check)** | 档案归档完整性与保管期限核对（依据《档案法》及配套规定，仅提示差异，不作出定性结论） |  |
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** | Second-model auto-review on the approval chain, fail-closed by default |  |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** | Automatic strong/cheap model-tier routing with deterministic risk guards and a `/tier` command |  |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | Durable background child agents with a Web UI sidebar, messaging and interrupt | 🚫 RETIRADO — ver o README do repositório |
| **[dsh-bid-ca-precheck](https://github.com/PerryLink/dsh-bid-ca-precheck)** | 投标文件符合性预检（按招标文件逐条核对响应情况，仅提示差异，不作出定性结论） |  |
| **[dsh-bid-qual-check](https://github.com/PerryLink/dsh-bid-qual-check)** | 投标人资格条件核对（按资格条件与证明材料核对逐条响应，仅提示差异，不作出定性结论） |  |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | Cost governance for DeepSeek Harness: budgets, carbon, and latency in one panel. | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** | Read-only MCP server exposing the certification registry: grades, snapshots and five-dimension evidence |  |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** | Claude Code /rewind-equivalent: snapshots, session forks, one-shot restore |  |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | Migrate Claude Code sessions, memory, skills and CLAUDE.md into DSH | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** | Cross-platform native desktop control for DeepSeek Harness — Windows first. |  |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** | Terminal-style input history for the web composer: arrows, Ctrl+R search |  |
| **[dsh-contract-stance](https://github.com/PerryLink/dsh-contract-stance)** | 合同条款立场台账核对（按立场、风险等级与退让底线核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-customs-doc-check](https://github.com/PerryLink/dsh-customs-doc-check)** | 报关单证一致性核对（按公开的报关单填制规范核对单证间字段一致性，仅提示差异，不作出定性结论） |  |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** | Dataset quality checks and citation cross-checks (the optional numeric bridge consumed here) |  |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | Prompt-injection, jailbreak, and secret-leak defense for DeepSeek Harness. | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-demurrage-ledger](https://github.com/PerryLink/dsh-demurrage-ledger)** | 滞箱费台账核对（按免箱期与费率核对超期天数与金额的自洽性，仅提示差异，不作出定性结论） |  |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** | Engineering-discipline guard: requirements grill, test gates, adversary review |  |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | Unified static-image generation routing for DeepSeek Harness. | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-drill-script-check](https://github.com/PerryLink/dsh-drill-script-check)** | 应急演练脚本核对（按阶段、响应分级、指挥与资源要素核对脚本齐备，仅提示差异，不作出定性结论） |  |
| **[dsh-eia-guide-check](https://github.com/PerryLink/dsh-eia-guide-check)** | 环评导则适用性核对（按要素、导则名称与执行标准核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-emergency-plan](https://github.com/PerryLink/dsh-emergency-plan)** | 应急预案要素齐备性与条款级页码定位（依据 GB/T 29639-2020 等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-essay-rubric-check](https://github.com/PerryLink/dsh-essay-rubric-check)** | 作文量表评分核对（按评分项、原文定位与分值算术核对评分自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-evidence-check](https://github.com/PerryLink/dsh-evidence-check)** | 证据清单齐备性核对（按待证事实与证据要素核对清单自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-export-ctl-check](https://github.com/PerryLink/dsh-export-ctl-check)** | 出口管制物项核对（按管制清单、最终用途与许可证核对台账齐备，仅提示差异，不作出定性结论） |  |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** | Read-only performance diagnostics for DeepSeek Harness. |  |
| **[dsh-fmea-table-check](https://github.com/PerryLink/dsh-fmea-table-check)** | FMEA 分析表要素齐备性与风险顺序数一致性核对（按公开的 FMEA 方法标准核对表内自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-forecast-penalty](https://github.com/PerryLink/dsh-forecast-penalty)** | 预测准确率考核核对（按准确率、门槛与考核单价核对考核费用的算术自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** | Deterministic research reports for Chinese public mutual funds |  |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** | GitHub PR/issues integration for DSH, every write gated by approval |  |
| **[dsh-gongwen-flow-check](https://github.com/PerryLink/dsh-gongwen-flow-check)** | 公文流转与办理时限核对（按公开的公文处理规范核对环节完整性与时限，仅提示差异，不作出定性结论） |  |
| **[dsh-gongwen-word-check](https://github.com/PerryLink/dsh-gongwen-word-check)** | 公文格式要素核对（按公开的党政机关公文格式标准核对版头与主体要素，仅提示差异，不作出定性结论） |  |
| **[dsh-guard-plan-qc](https://github.com/PerryLink/dsh-guard-plan-qc)** | 劳动保护与安全防护用品配置表核对（按公开的配备标准核对品名规格与配置数量，仅提示差异，不作出定性结论） |  |
| **[dsh-hazchem-check](https://github.com/PerryLink/dsh-hazchem-check)** | 危险化学品临界量与重大危险源辨识核对（按储存量与临界量核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-hazplan-check](https://github.com/PerryLink/dsh-hazplan-check)** | HAZOP 分析表要素齐备性与偏差推导一致性核对（依据公开的危险与可操作性分析标准，仅提示差异，不作出定性结论） |  |
| **[dsh-hidden-risk-map](https://github.com/PerryLink/dsh-hidden-risk-map)** | 安全隐患台账→《工贸企业重大事故隐患判定标准》（应急管理部令第10号）条款映射提示（仅提示差异，不作出定性结论） |  |
| **[dsh-hs-classify](https://github.com/PerryLink/dsh-hs-classify)** | 商品归类层级一致性核对（按章、品目、子目与商品编号的层级关系核对自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-icd-rule-check](https://github.com/PerryLink/dsh-icd-rule-check)** | ICD 合并编码与星剑号配对提示（依据 GB/T 14396-2016 与公开的 ICD 使用说明，仅提示差异，不作出定性结论） |  |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** | Industry research orchestration that seals its deliverables through this plugin's `ctx.researchReport.assemble` |  |
| **[dsh-lawcite-adapter](https://github.com/PerryLink/dsh-lawcite-adapter)** | 法条引用与文书要素核对（按名称、条号、原文与效力状态核对引用可核验性，仅提示差异，不作出定性结论） |  |
| **[dsh-laya](https://github.com/PerryLink/dsh-laya)** | Laya typed decisions (`noul`/`choice`/`score`) as a first-class Cordis service and model-visible tools |  |
| **[dsh-lc-doc-check](https://github.com/PerryLink/dsh-lc-doc-check)** | 信用证单据条款核对（按单据种类、份数、期限与不符点核对交单自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-learning-gap-check](https://github.com/PerryLink/dsh-learning-gap-check)** | 能力差距与培养计划核对（按能力等级差、培养措施与完成期限核对台账闭环，仅提示差异，不作出定性结论） |  |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** | Local document knowledge base for DeepSeek Harness. |  |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** | Local-model (Ollama) integration for DeepSeek Harness. |  |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** | LSP diagnostics, formatting, completion, code actions and rename over language servers |  |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** | PII masking middleware: anonymize at the model boundary, restore at the display layer |  |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** | Read-only MCP runtime panel: /mcp command + Settings tab with status, tools and errors |  |
| **[dsh-medrec-qc](https://github.com/PerryLink/dsh-medrec-qc)** | 病案首页形式质控与逻辑矛盾提示（依据国卫办医发〔2016〕24号等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** | Approval-gated cross-session memory: ctx.memory seam + SQLite + memory tool |  |
| **[dsh-nsfc-form-check](https://github.com/PerryLink/dsh-nsfc-form-check)** | 国家自然科学基金申请书形式审查与匿名化提示（依据《国家自然科学基金条例》与申请人导入的当年指南，仅提示差异，不作出定性结论） |  |
| **[dsh-nurse-record-check](https://github.com/PerryLink/dsh-nurse-record-check)** | 护理记录时限、签名与评估表完整性校验（依据《病历书写基本规范》等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** | OpenTelemetry and Langfuse observability exporter for DeepSeek Harness. |  |
| **[dsh-origin-rvc-check](https://github.com/PerryLink/dsh-origin-rvc-check)** | 原产地区域价值成分核对（按 RVC 定义式与门槛核对原产地判定自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-ota-review-check](https://github.com/PerryLink/dsh-ota-review-check)** | 在线点评回复台账核对（按回复时限、问题分类与整改状态核对台账闭环，仅提示差异，不作出定性结论） |  |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** | Claude Code outputStyles-equivalent runtime style switching |  |
| **[dsh-paper-doc-adapter](https://github.com/PerryLink/dsh-paper-doc-adapter)** | 试卷解析结构核对（按题型、答案、分值与 yotta 标识核对试卷结构自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** | Claude Code-style declarative allow/deny/ask permission rules with audit |  |
| **[dsh-permit-report-check](https://github.com/PerryLink/dsh-permit-report-check)** | 行政许可办理核对（按申请材料、法定时限与决定记录核对台账闭环，仅提示差异，不作出定性结论） |  |
| **[dsh-pipeline-check](https://github.com/PerryLink/dsh-pipeline-check)** | 项目全流程文件链条核对（按环节先后与金额口径核对链条自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-pleading-draft](https://github.com/PerryLink/dsh-pleading-draft)** | 起诉状要素齐备性核对（按诉请、事实、证据、法条四要素核对文书齐备，仅提示差异，不作出定性结论） |  |
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** | Zero-dependency static + sandbox smoke detector for DSH plugins |  |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** | Plugin-development knowledge base as an on-demand agent skill |  |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** | Shared zero-runtime-dependency toolkit for the PerryLink DSH plugins |  |
| **[dsh-plugin-upgrade](https://github.com/PerryLink/dsh-plugin-upgrade)** | One-package, one-corridor-index plugin upgrade skill: routes a repository to the matching closed corridor card |  |
| **[dsh-policy-brief-draft](https://github.com/PerryLink/dsh-policy-brief-draft)** | 政策专报要素核对（按观点、依据、出处与建议核对专报齐备，仅提示差异，不作出定性结论） |  |
| **[dsh-power-loss-split](https://github.com/PerryLink/dsh-power-loss-split)** | 线损电量拆分与考核表核对（依据公开的线损计算口径，仅提示差异，不作出定性结论） |  |
| **[dsh-power-ticket-check](https://github.com/PerryLink/dsh-power-ticket-check)** | 电力工作票要素齐备性与签发许可顺序核对（依据现行电力安全工作规程，仅提示差异，不作出定性结论） |  |
| **[dsh-ppap-check](https://github.com/PerryLink/dsh-ppap-check)** | PPAP 提交要素齐备性核对（按公开的 PPAP 手册与提交等级核对要素齐备与版本填写，仅提示差异，不作出定性结论） |  |
| **[dsh-protest-deadline](https://github.com/PerryLink/dsh-protest-deadline)** | 质疑与投诉期限核对（按公开的政府采购质疑投诉规定核对期限与台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-railway-window](https://github.com/PerryLink/dsh-railway-window)** | 铁路施工天窗台账核对（按时间窗、时长算术与命令号核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | Multi-channel approval/question bridge: WeChat/Telegram/Feishu, session console | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-repair-order-qc](https://github.com/PerryLink/dsh-repair-order-qc)** | 维修工单结算核对（按项目金额、配件工时合计与结算总额核对算术自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** | Verifiable research-report engine: content-addressed evidence ledger and sealed versions |  |
| **[dsh-review-reply-check](https://github.com/PerryLink/dsh-review-reply-check)** | 审稿意见逐条回应覆盖核对（按意见与回应一一对应核对覆盖完整性，仅提示差异，不作出定性结论） |  |
| **[dsh-rulefile-check](https://github.com/PerryLink/dsh-rulefile-check)** | 规则库文件自检核对（按条款引用纪律与效力上限核对规则库自身合规，仅提示差异，不作出定性结论） |  |
| **[dsh-safety-brief-check](https://github.com/PerryLink/dsh-safety-brief-check)** | 安全技术交底记录要素齐备性与签字闭环核对（依据公开的安全生产法规与检查标准，仅提示差异，不作出定性结论） |  |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** | Multi-dimensional quality scoring for DeepSeek Harness plugins. |  |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | Pin sessions in the Web sidebar with durable ordering | 🚫 RETIRADO — ver o README do repositório |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** | Cross-device session sync for DeepSeek Harness — a dedicated git mirror of your session store. |  |
| **[dsh-site-log-check](https://github.com/PerryLink/dsh-site-log-check)** | 监理日志跨日连续性与旁站覆盖提示（依据 GB/T 50319-2013 等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** | Security-audit skill pack: secret scan, dependency and supply-chain review |  |
| **[dsh-soe-decision-check](https://github.com/PerryLink/dsh-soe-decision-check)** | 三重一大决策台账核对（按前置研究、会议审议与决议记录核对程序留痕，仅提示差异，不作出定性结论） |  |
| **[dsh-soilwater-check](https://github.com/PerryLink/dsh-soilwater-check)** | 土壤与地下水监测台账核对（按点位、监测项目、限值与超标判定核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-sop-sync-check](https://github.com/PerryLink/dsh-sop-sync-check)** | 作业规程与 FMEA／控制计划一致性核对（按编号与版本核对三份文件是否同步，仅提示差异，不作出定性结论） |  |
| **[dsh-spc-gbt-adapter](https://github.com/PerryLink/dsh-spc-gbt-adapter)** | 控制图常数与过程能力指数核对（按 GB/T 4091 的常规控制图常数表核对控制限与 Cp/Cpk 的自洽性，仅提示差异，不作出定性结论） |  |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** | Voice-first session loop for DeepSeek Harness: talk to it, hear it answer. |  |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | Cross-session team rooms: shared message bus, task board and timeline | 🚫 RETIRADO — ver o README do repositório |
| **[dsh-tender-extract](https://github.com/PerryLink/dsh-tender-extract)** | 招标文件条款摘录核对（按出处与原文逐字核对摘录完整性，仅提示差异，不作出定性结论） |  |
| **[dsh-tender-matrix](https://github.com/PerryLink/dsh-tender-matrix)** | 评标因素评分矩阵核对（按分值上限与合计核对矩阵自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** | Isolated install-and-smoke test drives for DeepSeek Harness plugins. |  |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** | TickTick/Dida365 task bridge: session-header panel + 11 tools |  |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** | Vendor parameter translation and deterministic JSON repair for DeepSeek Harness. |  |
| **[dsh-warranty-calc](https://github.com/PerryLink/dsh-warranty-calc)** | 质保期与索赔金额核对（按质保期月数与里程、索赔金额算式核对自洽，仅提示差异，不作出定性结论） |  |

</details>

</details>

</details>

## License

Apache-2.0 — ver [LICENSE](LICENSE).

### Instalar a partir do mercado do DSH Desktop

Todos os plugins PerryLink podem ser explorados no mercado integrado do DSH Desktop: **Market → Sources → add source → colar** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ selecionar**. A instalação continua passando pela verificação de identidade npm do mercado e pela sua confirmação.
