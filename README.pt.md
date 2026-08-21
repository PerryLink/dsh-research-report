<div align="center">

# 📑 dsh-research-report

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

- DeepSeek Harness `0.1.0-rc.8` (peers fixados em `0.1.0-rc.8`).
- Node `^22.19.0 || >=24.0.0`, apenas ESM (`"type": "module"`).
- Dependências peer: `@deepseek-ai/cordis ^4.0.1`, `@deepseek-ai/schemastery ^3.18.0`, e `@deepseek-ai/dsh-session`, `@deepseek-ai/dsh-tools`, `@deepseek-ai/dsh-system-prompt`, `@deepseek-ai/dsh-web`, `@deepseek-ai/dsh-jobs` em `0.1.0-rc.8`.
- Irmãos opcionais (nunca obrigatórios): providers de `ctx.web` para captura de URL/coleta, `ctx.jobs` para montagem em segundo plano, `ctx.dataQuality` (dsh-data-quality) para verificação de citações em datasets.

## What you get

- **Livro-razão de evidência** — armazenamento de snapshots endereçado por conteúdo (`<ledgerRoot>/objects/<sha256>` + diários JSONL). O mesmo conteúdo é guardado exatamente uma vez; snapshots são imutáveis; cada leitura recomputa o hash, de modo que adulteração ou remoção é detetada em vez de confiada.
- **Vínculo claim ↔ evidência** — claims registam-se com os ids de evidência em que se apoiam; o livro guarda o vínculo e cada veredito de verificação (o mais recente vence).
- **Verificação ao nível do byte** — cada número e cada trecho entre aspas de um claim tem de ser localizável literalmente nos snapshots vinculados. Citações em falta marcam o claim como `unverified`; um rótulo cujo valor difere no snapshot (estando o valor citado ausente) marca-o como `contradicted`. Sem semântica, sem embeddings — apenas verificações de bytes auditáveis.
- **Ponte numérica opcional** — quando um claim cita um dataset estruturado do workspace (CSV/JSON) e o `dsh-data-quality` está montado, as citações são verificadas com tolerâncias através do seu contrato congelado `verifyCitations`.
- **Relatórios selados versionados** — `<reportRoot>/<slug(topic)>/<YYYYMMDD-HHmmss>/report.md` + `manifest.json`; o hash de selo é o SHA-256 do manifesto, que por sua vez carrega o hash do relatório e os hashes de toda a evidência.
- **Lacunas honestas** — claims não verificados ou contraditos mantêm uma marca visível `[未核实]` / `[与证据矛盾]` no corpo do relatório e são listados no Apêndice A. Nada passa em silêncio.
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
- **Eventos de sessão adaptativos** — o plugin declara os eventos de sessão tipados `research-report/evidence`, `research-report/verify` e `research-report/seal`, mas o `Session.append` de rc.8 continua sem opção `ignorable` nem superficie de registo de eventos para plugins, por isso os appends só ativam quando o build do host conhece os tipos (caso contrário a camada de persistência recusaria o log no restore). Os diários do livro são sempre a fonte durável da verdade.
- **Profiles por omissão não montam provider de fetch** — o `dsh-base` distribuído monta apenas pesquisa, por isso a captura de URLs falha ruidosamente (`WEB_UNAVAILABLE`/`WEB_PROVIDER_UNAVAILABLE`) até configurar um provider de fetch; o `gather` baseado em pesquisa lista as fontes não capturadas na lista de lacunas.
- **Âmbito de um só workspace** — as raízes de livro e relatórios resolvem contra o diretório de trabalho do harness no mount; deployments multi-workspace devem configurar raízes absolutas por profile.

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

- `typecheck` resolve `@deepseek-ai/*` através dos peers 0.1.0-rc.8 instalados; `typecheck:ci` desativa `skipLibCheck` e ativa `verbatimModuleSyntax` contra os tipos publicados. Ambos têm de ficar verdes.
- Os testes usam os `Context`/`Session`/`ToolRuntime`/`LocalJobRegistry`/`WebRuntime` reais dos peers 0.1.0-rc.8; apenas os backends de rede são providers scriptados registados através dos registos reais de `ctx.web`.
- Release: `node scripts/release.mjs <x.y.z>` (sobe versão, carimba CHANGELOG, re-executa a gate, commita + etiqueta; nunca faz push).

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `cordis`, `research`, `evidence-ledger`, `verifiable-report`, `audit`, `citation-verification`

## Contributors

Contribuidores de `dsh-research-report`.

## PerryLink DSH Plugin Family

Este projeto é um dos plugins de DeepSeek Harness mantidos por [PerryLink](https://github.com/PerryLink). Se este te ajuda, os outros provavelmente também:

| Plugin | One-liner |
|---|---|
| [dsh-data-quality](https://github.com/PerryLink/dsh-data-quality) | Verificações de qualidade de datasets e verificação de citações (a ponte numérica opcional consumida aqui) |
| [dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck) | Guarda de disciplina de engenharia: interrogatório de requisitos, gates de testes, revisão adversarial |
| [dsh-fast](https://github.com/PerryLink/dsh-fast) | Diagnóstico de desempenho só de leitura para DeepSeek Harness. |
| [dsh-industry-research](https://github.com/PerryLink/dsh-industry-research) | Orquestração de pesquisa setorial que sela as suas entregas através do `ctx.researchReport.assemble` deste plugin |
| [dsh-memento](https://github.com/PerryLink/dsh-memento) | Memória entre sessões com porta de aprovação: seam ctx.memory + SQLite + ferramenta memory |
| [dsh-score](https://github.com/PerryLink/dsh-score) | Pontuação de qualidade multidimensional para plugins de DeepSeek Harness. |
| [dsh-test-drive](https://github.com/PerryLink/dsh-test-drive) | Test drives isolados de instalação e smoke para plugins de DeepSeek Harness. |

## License

Apache-2.0 — ver [LICENSE](LICENSE).
