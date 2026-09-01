<div align="center">

# 📑 dsh-research-report
- **Canal 1024 store**: `npm i -g dsh1024` uma vez, depois `dsh1024 plugin --profile web add dsh-research-report` (conta para o ranking de instalações do [deepseek1024.com](https://deepseek1024.com)).

**Um motor de relatórios de pesquisa verificáveis para DeepSeek Harness.**

*Cada afirmação (claim) fica vinculada a snapshots de evidência imutáveis, é verificada byte a byte e é selada num relatório versionado cujo hash de manifesto qualquer pessoa pode recomputar.*

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

- DeepSeek Harness `0.1.1-rc.2` (peers fixados em `0.1.1-rc.2`).
0.1.2-alpha.3 (adaptado em 2026-09-01): o envelope de sessão mantém seu campo ignorable apenas para compatibilidade de leitura de logs armazenados - o Session.append ainda não consegue estampá-lo, então o comportamento da porta não muda.
- Node `^22.19.0 || >=24.0.0`, apenas ESM (`"type": "module"`).
- Dependências peer: `@deepseek-ai/cordis ^4.0.1`, `@deepseek-ai/schemastery ^3.18.0`, e `@deepseek-ai/dsh-session`, `@deepseek-ai/dsh-tools`, `@deepseek-ai/dsh-system-prompt`, `@deepseek-ai/dsh-web`, `@deepseek-ai/dsh-jobs` em `0.1.1-rc.2`.
- Irmãos opcionais (nunca obrigatórios): providers de `ctx.web` para captura de URL/coleta, `ctx.jobs` para montagem em segundo plano, `ctx.dataQuality` (dsh-data-quality) para verificação de citações em datasets.

## What you get

- **Livro-razão de evidência** — armazenamento de snapshots endereçado por conteúdo (`<ledgerRoot>/objects/<sha256>` + diários JSONL). O mesmo conteúdo é guardado exatamente uma vez; snapshots são imutáveis; cada leitura recomputa o hash, de modo que adulteração ou remoção é detetada em vez de confiada.
- **Vínculo claim ↔ evidência** — claims registam-se com os ids de evidência em que se apoiam; o livro guarda o vínculo e cada veredito de verificação (o mais recente vence).
- **Verificação ao nível do byte** — cada número e cada trecho entre aspas de um claim tem de ser localizável literalmente nos snapshots vinculados. Sem evidência vinculada, ou sem literal verificável, o claim marca-se `unverified`; evidência vinculada que não consegue confirmar nem desmentir os literais citados marca-o `insufficient`; um rótulo cujo valor difere no snapshot (estando o valor citado ausente) marca-o como `disproven`; snapshots adulterados/ausentes marcam-no `contradicted`. Sem semântica, sem embeddings — apenas verificações de bytes auditáveis.
- **Ponte numérica opcional** — quando um claim cita um dataset estruturado do workspace (CSV/JSON) e o `dsh-data-quality` está montado, as citações são verificadas com tolerâncias através do seu contrato congelado `verifyCitations`; uma discrepância do dataset desmente (disproves) o claim.
- **Evidência DOI (sem rede)** — origens DOI são validadas deterministicamente (estrutura `10.xxxx/xxxx`, lista branca de prefixos e conjunto de caracteres DOI); DOIs inválidos falham ruidosamente. Metadados opcionais de revista/ano são aceites, e `requireJournalMetadata` só restringe a evidência DOI académica quando ativado.
- **Relatórios selados versionados** — `<reportRoot>/<slug(topic)>/<YYYYMMDD-HHmmss>/report.md` + `manifest.json` + `verification.jsonl` + `disconfirmation.jsonl`; o hash de selo é o SHA-256 do manifesto, que por sua vez carrega o hash do relatório, os hashes de toda a evidência e o hash de cada diário de auditoria.
- **Reauditoria pré-entrega e interceção do selo** — antes de selar, cada claim vinculado é re-verificado offline e registado em `verification.jsonl`; drift de veredito, evidência vinculada adulterada/ausente, ou falha de serialização do diário bloqueiam o selo (falha ruidosamente, sem tunable).
- **Livro de falsificação** — cada claim contradito ou desmentido é registado em `disconfirmation.jsonl` (claim + referências de evidência + motivo) e listado no apêndice `证伪记录` do relatório.
- **Conhecimento negativo** — um claim desmentido é recordado pelo seu hash de conteúdo (`disproofs.jsonl`); o mesmo texto re-reportado contra evidência inalterada é forçado de volta a `disproven` e só se re-verifica quando a evidência muda.
- **Ciclo de verificação de só-leitura** — após selar, o recurso determinista `verifySealedReport` (sem rede, sem modelo) recomputa o selo e os hashes de auditoria e re-verifica cada claim, escrevendo a secção de verificação de máquina em `verifier-note.md`; com `ctx.jobs` montado também é lançado um trabalho de verificação de só-leitura (a revisão do modelo é uma melhoria, nunca uma substituição).
- **Evidência ancorada a sessão** — `evidence_add` aceita um `sessionRef` opcional (`sessionId` + `eventRange`, validado ruidosamente); a âncora é guardada e registada no Apêndice B, no manifesto e em `verification.jsonl`. A evidência ancorada a sessão verifica-se honestamente como `unverified` (`会话锚定证据需人工回查会话日志`).
- **Lacunas honestas** — claims não verificados, insuficientes, contraditos ou desmentidos mantêm uma marca visível `[未核实]` / `[证据不足]` / `[与证据矛盾]` / `[已证伪]` no corpo do relatório e são listados no Apêndice A. Nada passa em silêncio.
- **Sem ciclo de deep-research** — a orquestração de recuperação é deliberadamente reutilizada: `ctx.web` para pesquisa/download, `ctx.jobs` para trabalhos longos. Planeamento e síntese ficam com o modelo (ou um plugin a montante).

## Quick start

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

## Install & uninstall

```sh
dsh plugin --profile demo add dsh-research-report       # instalar
dsh plugin --profile demo remove dsh-research-report    # desinstalar
```

Verifica que a linha monta: `dsh --profile demo --dump-config | grep dsh-research-report`.

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
- **Eventos de sessão adaptativos** — o plugin declara os eventos de sessão tipados `research-report/evidence`, `research-report/verify` e `research-report/seal`, mas o `Session.append` de rc.2 continua sem opção `ignorable` nem superficie de registo de eventos para plugins, por isso os appends só ativam quando o build do host conhece os tipos (caso contrário a camada de persistência recusaria o log no restore). Os diários do livro são sempre a fonte durável da verdade.
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

- `typecheck` resolve `@deepseek-ai/*` através dos peers 0.1.1-rc.2 instalados; `typecheck:ci` desativa `skipLibCheck` e ativa `verbatimModuleSyntax` contra os tipos publicados. Ambos têm de ficar verdes.
- Os testes usam os `Context`/`Session`/`ToolRuntime`/`LocalJobRegistry`/`WebRuntime` reais dos peers 0.1.1-rc.2; apenas os backends de rede são providers scriptados registados através dos registos reais de `ctx.web`.
- Release: `node scripts/release.mjs <x.y.z>` (sobe versão, carimba CHANGELOG, re-executa a gate, commita + etiqueta; nunca faz push).

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `cordis`, `research`, `evidence-ledger`, `verifiable-report`, `audit`, `citation-verification`

## Contributors

- [PerryLink](https://github.com/PerryLink) — autor original e mantenedor: arquitetura do plugin, ledger de evidências, verificação em nível de byte, relatórios selados, documentação em cinco idiomas e automação de CI/lançamento.

## PerryLink DSH Plugin Family

Este projeto é um dos [33 plugins de DeepSeek Harness](https://github.com/PerryLink) mantidos por [PerryLink](https://github.com/PerryLink). Se este ajuda você, os outros provavelmente também:

| Plugin | One-liner |
|---|---|
| **[dsh-dsh-auto-review](https://github.com/PerryLink/dsh-dsh-auto-review)** | Auto-revisão de segundo modelo na cadeia de aprovação, com falha fechada por padrão | |
| **[dsh-dsh-background-agents](https://github.com/PerryLink/dsh-dsh-background-agents)** | Agentes filhos em segundo plano duráveis com barra lateral de UI web, mensagens e interrupção | |
| **[dsh-dsh-budget](https://github.com/PerryLink/dsh-dsh-budget)** | Governança de custos para DeepSeek Harness: orçamentos, carbono e latência em um painel. | |
| **[dsh-dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-dsh-checkpoint-rewind)** | Equivalente ao /rewind do Claude Code: instantâneos, bifurcações de sessão, restauração de uso único | |
| **[dsh-dsh-claude-move](https://github.com/PerryLink/dsh-dsh-claude-move)** | Migre sessões, memória, habilidades e CLAUDE.md do Claude Code para o DSH | |
| **[dsh-dsh-click](https://github.com/PerryLink/dsh-dsh-click)** | Controle de desktop nativo multiplataforma para DeepSeek Harness — Windows primeiro. | |
| **[dsh-dsh-composer-history](https://github.com/PerryLink/dsh-dsh-composer-history)** | Histórico de entrada estilo terminal para o compositor web: setas, busca Ctrl+R | |
| **[dsh-dsh-data-quality](https://github.com/PerryLink/dsh-dsh-data-quality)** | Verificações de qualidade de datasets e verificação de citações (a ponte numérica opcional consumida aqui) | |
| **[dsh-dsh-defend](https://github.com/PerryLink/dsh-dsh-defend)** | Defesa contra injeção de prompt, jailbreak e vazamento de segredos para DeepSeek Harness. | |
| **[dsh-dsh-doublecheck](https://github.com/PerryLink/dsh-dsh-doublecheck)** | Guardião de disciplina de engenharia: sabatina de requisitos, portões de teste, revisão adversária | |
| **[dsh-dsh-draw](https://github.com/PerryLink/dsh-dsh-draw)** | Roteamento unificado de geração de imagens estáticas para DeepSeek Harness. | |
| **[dsh-dsh-fast](https://github.com/PerryLink/dsh-dsh-fast)** | Diagnóstico de desempenho só de leitura para DeepSeek Harness. | |
| **[dsh-dsh-fund-research](https://github.com/PerryLink/dsh-dsh-fund-research)** | Relatórios de pesquisa deterministas para fundos mútuos públicos chineses | |
| **[dsh-dsh-github](https://github.com/PerryLink/dsh-dsh-github)** | Integração de PR/issues do GitHub para o DSH, cada escrita controlada por aprovação | |
| **[dsh-dsh-industry-research](https://github.com/PerryLink/dsh-dsh-industry-research)** | Orquestração de pesquisa setorial que sela as suas entregas através do `ctx.researchReport.assemble` deste plugin | |
| **[dsh-dsh-library](https://github.com/PerryLink/dsh-dsh-library)** | Base de conhecimento documental local para DeepSeek Harness. | |
| **[dsh-dsh-local-ai](https://github.com/PerryLink/dsh-dsh-local-ai)** | Integração de modelos locais (Ollama) para DeepSeek Harness. | |
| **[dsh-dsh-lsp-actions](https://github.com/PerryLink/dsh-dsh-lsp-actions)** | Diagnósticos, formatação, autocompletar, ações de código e renomeação LSP sobre servidores de linguagem | |
| **[dsh-dsh-mask](https://github.com/PerryLink/dsh-dsh-mask)** | Middleware de mascaramento de PII: anonimiza no limite do modelo, restaura na camada de exibição | |
| **[dsh-dsh-mcp-panel](https://github.com/PerryLink/dsh-dsh-mcp-panel)** | Painel de tempo de execução MCP somente leitura: comando /mcp + aba Settings com status, ferramentas e erros | |
| **[dsh-dsh-memento](https://github.com/PerryLink/dsh-dsh-memento)** | Memória entre sessões controlada por aprovação: costura ctx.memory + SQLite + ferramenta de memória | |
| **[dsh-dsh-observe](https://github.com/PerryLink/dsh-dsh-observe)** | Exportador de observabilidade OpenTelemetry e Langfuse para DeepSeek Harness. | |
| **[dsh-dsh-output-styles](https://github.com/PerryLink/dsh-dsh-output-styles)** | Troca de estilo em tempo de execução equivalente ao outputStyles do Claude Code | |
| **[dsh-dsh-permission-rules](https://github.com/PerryLink/dsh-dsh-permission-rules)** | Regras de permissão declarativas allow/deny/ask estilo Claude Code com auditoria | |
| **[dsh-dsh-plugin-guide](https://github.com/PerryLink/dsh-dsh-plugin-guide)** | Base de conhecimento de desenvolvimento de plugins como habilidade de agente sob demanda | |
| **[dsh-dsh-score](https://github.com/PerryLink/dsh-dsh-score)** | Pontuação de qualidade multidimensional para plugins de DeepSeek Harness. | |
| **[dsh-dsh-session-pin](https://github.com/PerryLink/dsh-dsh-session-pin)** | Fixe sessões na barra lateral web com ordenação durável | |
| **[dsh-dsh-session-sync](https://github.com/PerryLink/dsh-dsh-session-sync)** | Sincronização de sessões entre dispositivos para DeepSeek Harness — um espelho git dedicado do seu armazenamento de sessões. | |
| **[dsh-dsh-skill-pack-security](https://github.com/PerryLink/dsh-dsh-skill-pack-security)** | Pacote de habilidades de auditoria de segurança: varredura de segredos, revisão de dependências e cadeia de suprimentos | |
| **[dsh-dsh-talk](https://github.com/PerryLink/dsh-dsh-talk)** | Loop de sessão com voz para DeepSeek Harness: fale e ouça a resposta. | |
| **[dsh-dsh-test-drive](https://github.com/PerryLink/dsh-dsh-test-drive)** | Test drives isolados de instalação e smoke para plugins de DeepSeek Harness. | |
| **[dsh-dsh-translate](https://github.com/PerryLink/dsh-dsh-translate)** | Tradução de parâmetros entre fornecedores e reparo determinístico de JSON para DeepSeek Harness. | |

## License

Apache-2.0 — ver [LICENSE](LICENSE).
