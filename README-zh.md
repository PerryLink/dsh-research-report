<div align="center">

# 📑 dsh-research-report
- **1024 商店渠道**：先 `npm i -g dsh1024`，再 `dsh1024 plugin --profile web add dsh-research-report`（计入 [deepseek1024.com](https://deepseek1024.com) 安装排行）。

**DeepSeek Harness 的可核查研究报告引擎。**

*每条结论（claim）都绑定到不可变的证据快照，逐字节核查，并封存进版本化报告——其 manifest 哈希任何人都可重算验证。*

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
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-research-report?metric=downloads&lang=zh)](https://dshfind.com/zh/plugins/PerryLink/dsh-research-report?ref=badge)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

```sh
dsh plugin --profile <name> add dsh-research-report
```


</div>

---


**📖 生态实测知识库**（实测数据，不是营销）：[插件开发指南 · 选型实测数据 · 维护取舍判据](https://perrylink.github.io/dsh-plugin-guide/)。

<!-- star-cta -->
## Install & uninstall

```sh
dsh plugin --profile demo add dsh-research-report       # 安装
dsh plugin --profile demo remove dsh-research-report    # 卸载
```

验证行已挂载：`dsh --profile demo --dump-config | grep dsh-research-report`。

## ⭐ 如果它帮到了你

这个插件是 [DSH 插件家族](https://github.com/PerryLink)的一员（95 个，全部 Apache-2.0）。如果你在用，**给个 star** —— 它不会解锁任何功能，但会让下一个人在搜索里更容易找到它。

*English:* part of a 95 plugin family for DeepSeek Harness. If it is useful, **a star helps the next person find it** — nothing is gated behind it.

## What is dsh-research-report?

DeepSeek Harness 的可核查研究报告引擎。

每条结论（claim）都绑定到不可变的证据快照，逐字节核查，并封存进版本化报告——其 manifest 哈希任何人都可重算验证。

![dsh-research-report 终端演示：dsh-research-report — evidence ledger, claims, and the seal](https://raw.githubusercontent.com/PerryLink/dsh-research-report/main/docs/assets/dsh-research-report-hero.png)

![Animated terminal demo of dsh-research-report](https://raw.githubusercontent.com/PerryLink/dsh-research-report/main/docs/assets/dsh-research-report-demo.gif)

*同一次运行，动图版。*

## Compatibility

- DeepSeek Harness `dsh-v0.2.1-alpha.1`（2026-09-24 已核验）。npm dev/test 线 `0.1.7-rc.2`；peers `>=0.1.6-0 <0.2.0 || >=0.1.7-0 <0.2.0`。compat 矩阵同时钉住四条已声明 peer 线。该线上 `Session.append` 的第三参仅对表面事件类型为 `SurfaceIntent`，因此 `research-report/*` 事件仍不落盘：账本日志才是持久真相，审计镜像仅在宿主认识该词表后自动激活（`test/events-gate.spec.ts` 的回归锁钉住此语义）。
0.1.5-alpha.1（2026-09-09 已适配）：会话信封保留 ignorable 字段但仅用于存量日志读取兼容——Session.append 仍无法盖章，门控行为不变。已于 2026-09-11 对照已发布的 0.1.5-rc.2 类型核验通过（完整本地门禁链）；compat workflow 同时钉住两条已声明 peer 线。
- Node `^22.19.0 || >=24.0.0`，仅 ESM（`"type": "module"`）。
- Peer 依赖：`@deepseek-ai/cordis ^4.0.2`、`@deepseek-ai/schemastery ^3.18.2`，以及 `>=0.1.6-0 <0.2.0 || >=0.1.7-0 <0.2.0` 的 `@deepseek-ai/dsh-session`、`@deepseek-ai/dsh-tools`、`@deepseek-ai/dsh-system-prompt`、`@deepseek-ai/dsh-web`、`@deepseek-ai/dsh-jobs`。
- 可选协同（绝不强制）：URL 抓取/检索用 `ctx.web` provider；后台组装用 `ctx.jobs`；数据集引文核查用 `ctx.dataQuality`（dsh-data-quality）。

## What you get

- **证据账本**——内容寻址快照存储（`<ledgerRoot>/objects/<sha256>` + JSONL 日志）。同一内容只存一份；快照不可变；每次读取都重算哈希——篡改或删除会被发现，而不是被信任。
- **claim ↔ 证据绑定**——claim 登记时声明其依赖的证据 id；账本保存绑定关系与每一次核查结论（最新为准）。
- **字节级核查**——claim 文本中的每个数字与引文子串都必须能在其绑定快照中字面定位。无绑定证据或无核查字面量 → `unverified`；证据存在但不足以证实或证伪声称字面量 → `insufficient`；标签在快照中对应不同数值（且声称值不存在）→ `disproven`；快照被篡改/缺失 → `contradicted`。不做语义理解、不做向量相似——只做可审计的字节核对。
- **可选数字核查桥**——当 claim 引用 workspace 内结构化数据集（CSV/JSON）且 `dsh-data-quality` 已挂载时，经其冻结的 `verifyCitations` 契约做容差核对；数据集不一致即证伪该 claim。
- **DOI 证据（零网络）**——DOI 源做确定性语法校验（`10.xxxx/xxxx` 结构 + 前缀白名单 + DOI 字符集）；非法 DOI 响亮失败。可选期刊/年份元数据被接受；`requireJournalMetadata` 仅在启用时门禁学术 DOI 证据。
- **版本化封存报告**——`<reportRoot>/<slug(topic)>/<YYYYMMDD-HHmmss>/report.md` + `manifest.json` + `verification.jsonl` + `disconfirmation.jsonl`；封印哈希 = manifest 的 SHA-256，manifest 内含报告哈希、全部证据哈希与各审计日志哈希。
- **交付前重审计与封存拦截**——封存前对每条绑定证据的 claim 离线重跑一次核查并写入 `verification.jsonl`；verdict drift、绑定证据被篡改/缺失、或审计日志序列化失败都会拦截封存（响亮失败，无 tunable）。
- **证伪账本**——每条被证伪（disproven）或矛盾（contradicted）的 claim 记录进 `disconfirmation.jsonl`（claim + 证据引用 + 原因），并在报告的「证伪记录」附录列明。
- **负知识**——被证伪的 claim 按其内容哈希记入 `disproofs.jsonl`；同一文本在证据未变时被复报会被强制置回 `disproven`，证据变化后才允许重新核验。
- **只读 verifier 回环**——封存后先跑确定性兜底 `verifySealedReport`（零网络零模型）：重算封印与审计哈希、逐 claim 复核，把 machine-check 段落写入 `verifier-note.md`；挂载 `ctx.jobs` 时再派生只读 verifier job（模型复核为增强，绝不替代）。
- **会话锚定证据**——`evidence_add` 支持可选 `sessionRef`（`sessionId` + `eventRange`，格式校验响亮失败）；锚点入账并在附录 B、manifest、`verification.jsonl` 登记。会话锚定证据诚实判 `unverified`（`会话锚定证据需人工回查会话日志`）。
- **诚实缺口**——未核实/证据不足/有矛盾/已证伪的 claim 在正文中保留醒目标记 `[未核实]` / `[证据不足]` / `[与证据矛盾]` / `[已证伪]`，并在附录 A 列明。绝不静默通过。
- **不做深研循环**——检索编排刻意复用官方底座：搜索/抓取走 `ctx.web`，长任务走 `ctx.jobs`。规划与综合交给模型（或上游插件）。

## Quick start

```sh
dsh plugin --profile web add github:PerryLink/dsh-research-report
```

### git 通道

```sh
# 在 scratch profile 中（钉住 commit；运行自包含的 `prepare` 构建）
dsh plugin --profile demo add "github:YOUR_ORG/dsh-research-report#<sha>"
# 首次 add 时，profile 的 pnpm-workspace.yaml 会增加 dsh-research-report 的 allowBuilds 条目。
```

### npm 通道

```sh
dsh plugin --profile demo add dsh-research-report
```

两条通道都会把 bundle 行（见 `cordis.patch.yml`）装入 profile 的 `dsh.profile.bundles` 层栈，**重启生效**。

然后，在会话中：

```
evidence_add({ origin: "docs/market.md", title: "市场快照" })            # → ev-1a2b3c4d5e6f
research_report({ topic: "示例行业概览", sections: [...], claims: [...], evidenceRefs: ["ev-1a2b…"] })
ledger_query({ claimId: "c1" })                                          # 绑定关系 + 核查结论
```

## Configuration

全部可调项都是 Schemastery `Config` 字段；非法值在加载期响亮失败。相对路径根目录相对 harness 工作目录（workspace）解析。

| Key | Default | Description |
| --- | --- | --- |
| `enabled` | `true` | 总开关；`false` 时什么都不挂载。 |
| `ledgerRoot` | `.research-ledger` | 证据账本目录（对象 + JSONL 日志）。 |
| `reportRoot` | `research-reports` | 封存报告根目录（按主题 + 时间戳版本化）。 |
| `maxEvidenceBytes` | `2097152` | 单条证据快照的 UTF-8 字节硬上限。 |
| `maxEvidencePerReport` | `200` | 单份报告可绑定证据条数硬上限。 |
| `fetchTimeoutMs` | `20000` | 抓取时单次 `ctx.web` fetch 的超时（毫秒）。 |
| `requireJournalMetadata` | `false` | 为 `true` 时，DOI 类证据登记必须带期刊名与出版年份（否则响亮失败）。 |

## Tools & surfaces

- **`evidence_add({ origin, content?, title? })`**——登记一条证据。给 `content` 则按原文存储；不给时 URL 源经 `ctx.web` 抓取、workspace 相对路径从磁盘读取（读取绝不逃逸 workspace）。返回证据 id 与 SHA-256 哈希。
- **`research_report({ topic, title?, sections, claims, evidenceRefs, gather?, depth?, background? })`**——组装并封存报告：校验（claim 引用不全响亮拒绝）→ 逐条核查 → 渲染带醒目标记的 `report.md` → 写 `manifest.json` → 返回封印哈希。`gather: true` 先经 `ctx.web` 做一轮检索，返回已捕获候选证据与显式缺口清单——绝不自动成稿。`background: true` 经 `ctx.jobs` 返回 `{ kind: 'background', jobId }`。
- **`ledger_query({ claimId? | evidenceId? })`**——只读查询绑定关系与核查结论；证据读取时重算哈希，篡改/丢失会显式报告。不带 id 时返回账本摘要。
- **`ctx.researchReport.assemble(request)`**——面向兄弟插件的冻结服务表面（见 `src/service.ts`；由 `scripts/verify-frozen-contract.mjs` 逐字节门禁）。

## Permissions & data

`dsh-research-report` 只消费公开 seam：`ctx.tools`、`ctx.systemPrompt`，以及可选的 `ctx.web` / `ctx.jobs` / `ctx.dataQuality`（调用时经 `ctx.get` 判空使用，绝不写入 inject）。写入只发生在配置的账本与报告根目录内（默认都是 workspace 本地目录）；本地文件读取不越出 workspace；网络访问只经 harness web seam——绝不直接 `fetch`。证据快照不可变且内容寻址；claim 登记不可变；核查结论只追加。

## Security boundaries

- **构造级防篡改**——每次快照读取都对照索引重算 SHA-256；不匹配时绑定 claim 核查为 `contradicted`，`ledger_query` 报告 `integrity: tampered`/`missing`。
- **workspace 限制**——本地证据读取相对 workspace 根解析并拒绝逃逸（比较前两侧都经 `path.resolve`）。
- **配置响亮失败**——非法边界在挂载期抛错；claim 引用不全、未知证据 id、id/内容冲突在组装期抛错。
- **不碰凭据、无隐藏网络**——URL 抓取走 `ctx.web`（provider 选择、错误分类、SSRF 策略都留在部署方的 web provider）。
- **注册可逆**——所有贡献经 `ctx.effect()` / `register()`，卸载与热重载干净。

## Known limitations

- **字节级而非语义级**——内置核查只做数字/引文字面定位；没有可核查字面量的转述性 claim 判 `unverified`；声称值缺失而标签对应其他数值时判 `contradicted`。这是 v1 的刻意选择（可审计优先于聪明）。
- **会话事件自适应**——插件声明了类型化的 `research-report/evidence`、`research-report/verify`、`research-report/seal` 会话事件，但 0.1.5-alpha.1 的 `Session.append` 仍不提供 `ignorable` 选项、也没有插件事件注册面，所以只有宿主 build 认识这些类型时才真正落盘（否则持久化层会在恢复时拒绝该日志）。账本日志始终是权威的持久事实源。
- **默认 profile 不挂载 fetch provider**——官方 `dsh-base` 只挂搜索，所以配置 fetch provider 之前 URL 抓取会响亮失败（`WEB_UNAVAILABLE`/`WEB_PROVIDER_UNAVAILABLE`）；基于搜索的 `gather` 会把未捕获的来源列入缺口清单。
- **单 workspace 作用域**——账本与报告根目录在挂载时相对 harness 工作目录解析；多 workspace 部署应在各 profile 配置绝对路径。

## Verifier CLI

独立的 `dsh-research-verify` 二进制（打包为 `lib/cli.js`，零 `@deepseek-ai` 导入）无需挂载插件即可审计任意密封报告目录：

```sh
dsh-research-verify --report <dir> [--seal <sha256>] [--ledger <dir>] [--format json|sarif]
```

- `--report <dir>`：密封报告目录（`manifest.json` + `report.md` + 审计日志）。
- `--seal <sha256>`：期望的 seal 哈希，用于与重算的 manifest 哈希比对；缺省则只报告重算值、不比对。
- `--ledger <dir>`：证据账本根目录（`objects/<sha256>` + `index.jsonl`），用于逐 claim 字节级复检；缺省则如实跳过 claim 复检。
- `--format`：`json`（默认）或 `sarif`（SARIF 2.1.0）。

它重算 seal 哈希（`manifest.json` 的 SHA-256）、`report.md` 哈希与审计日志哈希，逐 claim 重跑字节级 + 完整性检查，任一已执行检查失败则以非零码退出。`verifySealedReport` / `buildVerificationReport` / `renderSarif` / `renderVerificationJson` 亦从包导出供库调用。

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

- `typecheck` 经已安装的 0.1.7-rc.2 peer 解析 `@deepseek-ai/*`；`typecheck:ci` 关闭 `skipLibCheck` 并开启 `verbatimModuleSyntax` 对照已发布类型。两者都必须保持绿。
- 测试使用 0.1.7-rc.2 peer 的真实 `Context`/`Session`/`ToolRuntime`/`LocalJobRegistry`/`WebRuntime`；只有网络后端是注册进真实 `ctx.web` 注册表的脚本化 provider。
- 发布：`node scripts/release.mjs <x.y.z>`（bump、盖 CHANGELOG、重跑门禁、提交 + 打 tag；绝不 push）。

## Topics

`dsh`、`dsh-plugin`、`deepseek-harness`、`cordis`、`research`、`evidence-ledger`、`verifiable-report`、`audit`、`citation-verification`

## Contributors

- [PerryLink](https://github.com/PerryLink) —— 原作者与维护者：插件架构、证据账本、字节级核验、密封报告、五语文档、CI 与发布自动化。

## PerryLink DSH Plugin Family

本项目是 [PerryLink](https://github.com/PerryLink) 维护的 DeepSeek Harness 插件家族成员。完整名单默认折叠，避免每个 README 的首屏被长表淹没；点击展开可查看每一行及其状态。

<details>
<summary>展开全部插件</summary>

| 插件 | 状态 |
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
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | 🧊 已冻结 — 见仓库 README |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | 🧊 已冻结 — 见仓库 README |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | 🧊 已冻结 — 见仓库 README |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | 🧊 已冻结 — 见仓库 README |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | 🧊 已冻结 — 见仓库 README |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | 🚫 已退役 — 见仓库 README |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | 🚫 已退役 — 见仓库 README |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | 🚫 已退役 — 见仓库 README |

</details>

## License

Apache-2.0 — 见 [LICENSE](LICENSE)。

### 从 DSH Desktop 市场安装

所有 PerryLink 插件均可在 DSH Desktop 内置市场中浏览：**市场 → 来源 → 添加来源 → 粘贴** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ 选中**。安装仍需通过市场的 npm 身份校验与你的确认。
