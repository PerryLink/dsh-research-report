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

这个插件是 [DSH 插件家族](https://github.com/PerryLink)的一员（40+ 个，全部 Apache-2.0）。如果你在用，**给个 star** —— 它不会解锁任何功能，但会让下一个人在搜索里更容易找到它。

*English:* part of a 40+ plugin family for DeepSeek Harness. If it is useful, **a star helps the next person find it** — nothing is gated behind it.

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

本项目是 [PerryLink](https://github.com/PerryLink) 维护的 DeepSeek Harness 插件家族成员：**87 个活跃维护**，名册共 **95** 个，其中 **5 个已冻结**、**3 个已退役**。完整名单默认折叠，避免每个 README 的首屏被长表淹没；点击展开可查看每一行，原因见「状态」列。

<details>
<summary>展开全部 95 个插件</summary>

| 插件 | 一句话 | 状态 |
|---|---|---|
| **[dsh-aqua-input-check](https://github.com/PerryLink/dsh-aqua-input-check)** | 水产养殖投入品记录核对（按投入品用量、休药期与起捕间隔核对记录自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-archive-check](https://github.com/PerryLink/dsh-archive-check)** | 档案归档完整性与保管期限核对（依据《档案法》及配套规定，仅提示差异，不作出定性结论） |  |
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** | Second-model auto-review on the approval chain, fail-closed by default |  |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** | Automatic strong/cheap model-tier routing with deterministic risk guards and a `/tier` command |  |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | Durable background child agents with a Web UI sidebar, messaging and interrupt | 🚫 已退役 — 见仓库 README |
| **[dsh-bid-ca-precheck](https://github.com/PerryLink/dsh-bid-ca-precheck)** | 投标文件符合性预检（按招标文件逐条核对响应情况，仅提示差异，不作出定性结论） |  |
| **[dsh-bid-qual-check](https://github.com/PerryLink/dsh-bid-qual-check)** | 投标人资格条件核对（按资格条件与证明材料核对逐条响应，仅提示差异，不作出定性结论） |  |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | Cost governance for DeepSeek Harness: budgets, carbon, and latency in one panel. | 🧊 已冻结 — 见仓库 README |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** | Read-only MCP server exposing the certification registry: grades, snapshots and five-dimension evidence |  |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** | Claude Code /rewind-equivalent: snapshots, session forks, one-shot restore |  |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | Migrate Claude Code sessions, memory, skills and CLAUDE.md into DSH | 🧊 已冻结 — 见仓库 README |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** | Cross-platform native desktop control for DeepSeek Harness — Windows first. |  |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** | Terminal-style input history for the web composer: arrows, Ctrl+R search |  |
| **[dsh-contract-stance](https://github.com/PerryLink/dsh-contract-stance)** | 合同条款立场台账核对（按立场、风险等级与退让底线核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-customs-doc-check](https://github.com/PerryLink/dsh-customs-doc-check)** | 报关单证一致性核对（按公开的报关单填制规范核对单证间字段一致性，仅提示差异，不作出定性结论） |  |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** | Dataset quality checks and citation cross-checks (the optional numeric bridge consumed here) |  |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | Prompt-injection, jailbreak, and secret-leak defense for DeepSeek Harness. | 🧊 已冻结 — 见仓库 README |
| **[dsh-demurrage-ledger](https://github.com/PerryLink/dsh-demurrage-ledger)** | 滞箱费台账核对（按免箱期与费率核对超期天数与金额的自洽性，仅提示差异，不作出定性结论） |  |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** | Engineering-discipline guard: requirements grill, test gates, adversary review |  |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | Unified static-image generation routing for DeepSeek Harness. | 🧊 已冻结 — 见仓库 README |
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
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | Multi-channel approval/question bridge: WeChat/Telegram/Feishu, session console | 🧊 已冻结 — 见仓库 README |
| **[dsh-repair-order-qc](https://github.com/PerryLink/dsh-repair-order-qc)** | 维修工单结算核对（按项目金额、配件工时合计与结算总额核对算术自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** | Verifiable research-report engine: content-addressed evidence ledger and sealed versions |  |
| **[dsh-review-reply-check](https://github.com/PerryLink/dsh-review-reply-check)** | 审稿意见逐条回应覆盖核对（按意见与回应一一对应核对覆盖完整性，仅提示差异，不作出定性结论） |  |
| **[dsh-rulefile-check](https://github.com/PerryLink/dsh-rulefile-check)** | 规则库文件自检核对（按条款引用纪律与效力上限核对规则库自身合规，仅提示差异，不作出定性结论） |  |
| **[dsh-safety-brief-check](https://github.com/PerryLink/dsh-safety-brief-check)** | 安全技术交底记录要素齐备性与签字闭环核对（依据公开的安全生产法规与检查标准，仅提示差异，不作出定性结论） |  |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** | Multi-dimensional quality scoring for DeepSeek Harness plugins. |  |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | Pin sessions in the Web sidebar with durable ordering | 🚫 已退役 — 见仓库 README |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** | Cross-device session sync for DeepSeek Harness — a dedicated git mirror of your session store. |  |
| **[dsh-site-log-check](https://github.com/PerryLink/dsh-site-log-check)** | 监理日志跨日连续性与旁站覆盖提示（依据 GB/T 50319-2013 等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** | Security-audit skill pack: secret scan, dependency and supply-chain review |  |
| **[dsh-soe-decision-check](https://github.com/PerryLink/dsh-soe-decision-check)** | 三重一大决策台账核对（按前置研究、会议审议与决议记录核对程序留痕，仅提示差异，不作出定性结论） |  |
| **[dsh-soilwater-check](https://github.com/PerryLink/dsh-soilwater-check)** | 土壤与地下水监测台账核对（按点位、监测项目、限值与超标判定核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-sop-sync-check](https://github.com/PerryLink/dsh-sop-sync-check)** | 作业规程与 FMEA／控制计划一致性核对（按编号与版本核对三份文件是否同步，仅提示差异，不作出定性结论） |  |
| **[dsh-spc-gbt-adapter](https://github.com/PerryLink/dsh-spc-gbt-adapter)** | 控制图常数与过程能力指数核对（按 GB/T 4091 的常规控制图常数表核对控制限与 Cp/Cpk 的自洽性，仅提示差异，不作出定性结论） |  |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** | Voice-first session loop for DeepSeek Harness: talk to it, hear it answer. |  |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | Cross-session team rooms: shared message bus, task board and timeline | 🚫 已退役 — 见仓库 README |
| **[dsh-tender-extract](https://github.com/PerryLink/dsh-tender-extract)** | 招标文件条款摘录核对（按出处与原文逐字核对摘录完整性，仅提示差异，不作出定性结论） |  |
| **[dsh-tender-matrix](https://github.com/PerryLink/dsh-tender-matrix)** | 评标因素评分矩阵核对（按分值上限与合计核对矩阵自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** | Isolated install-and-smoke test drives for DeepSeek Harness plugins. |  |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** | TickTick/Dida365 task bridge: session-header panel + 11 tools |  |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** | Vendor parameter translation and deterministic JSON repair for DeepSeek Harness. |  |
| **[dsh-warranty-calc](https://github.com/PerryLink/dsh-warranty-calc)** | 质保期与索赔金额核对（按质保期月数与里程、索赔金额算式核对自洽，仅提示差异，不作出定性结论） |  |

</details>

</details>

</details>## License

Apache-2.0 — 见 [LICENSE](LICENSE)。

### 从 DSH Desktop 市场安装

所有 PerryLink 插件均可在 DSH Desktop 内置市场中浏览：**市场 → 来源 → 添加来源 → 粘贴** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ 选中**。安装仍需通过市场的 npm 身份校验与你的确认。
