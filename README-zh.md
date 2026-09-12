<div align="center">

# 📑 dsh-research-report
- **1024 商店渠道**：先 `npm i -g dsh1024`，再 `dsh1024 plugin --profile web add dsh-research-report`（计入 [deepseek1024.com](https://deepseek1024.com) 安装排行）。

**DeepSeek Harness 的可核查研究报告引擎。**

*每条结论（claim）都绑定到不可变的证据快照，逐字节核查，并封存进版本化报告——其 manifest 哈希任何人都可重算验证。*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-research-report)
[![DSH plugin](https://img.shields.io/badge/dsh--plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![dsh-doctor](https://raw.githubusercontent.com/PerryLink/dsh-plugin-doctor/main/badges/PerryLink__dsh-research-report.svg)](https://github.com/PerryLink/dsh-plugin-doctor#verified-徽章)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-research-report/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-research-report/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-research-report?label=version)](https://github.com/PerryLink/dsh-research-report/releases)
[![npm version](https://img.shields.io/npm/v/dsh-research-report)](https://www.npmjs.com/package/dsh-research-report)
[![npm downloads](https://img.shields.io/npm/dm/dsh-research-report)](https://www.npmjs.com/package/dsh-research-report)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

</div>

---

## Compatibility

- DeepSeek Harness `dsh-v0.1.5-rc.2`（GitHub tag，2026-09-11 已核验）。npm 依赖线 `0.1.5-rc.2`；peers `>=0.1.2-rc.1 <0.2.0 || >=0.1.5-alpha.1 <0.2.0`。
0.1.5-alpha.1（2026-09-09 已适配）：会话信封保留 ignorable 字段但仅用于存量日志读取兼容——Session.append 仍无法盖章，门控行为不变。已于 2026-09-11 对照已发布的 0.1.5-rc.2 类型核验通过（完整本地门禁链）；compat workflow 同时钉住两条已声明 peer 线。
- Node `^22.19.0 || >=24.0.0`，仅 ESM（`"type": "module"`）。
- Peer 依赖：`@deepseek-ai/cordis ^4.0.2`、`@deepseek-ai/schemastery ^3.18.2`，以及 `>=0.1.2-rc.1 <0.2.0 || >=0.1.5-alpha.1 <0.2.0` 的 `@deepseek-ai/dsh-session`、`@deepseek-ai/dsh-tools`、`@deepseek-ai/dsh-system-prompt`、`@deepseek-ai/dsh-web`、`@deepseek-ai/dsh-jobs`。
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

## Install & uninstall

```sh
dsh plugin --profile demo add dsh-research-report       # 安装
dsh plugin --profile demo remove dsh-research-report    # 卸载
```

验证行已挂载：`dsh --profile demo --dump-config | grep dsh-research-report`。

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

- `typecheck` 经已安装的 0.1.5-rc.2 peer 解析 `@deepseek-ai/*`；`typecheck:ci` 关闭 `skipLibCheck` 并开启 `verbatimModuleSyntax` 对照已发布类型。两者都必须保持绿。
- 测试使用 0.1.5-rc.2 peer 的真实 `Context`/`Session`/`ToolRuntime`/`LocalJobRegistry`/`WebRuntime`；只有网络后端是注册进真实 `ctx.web` 注册表的脚本化 provider。
- 发布：`node scripts/release.mjs <x.y.z>`（bump、盖 CHANGELOG、重跑门禁、提交 + 打 tag；绝不 push）。

## Topics

`dsh`、`dsh-plugin`、`deepseek-harness`、`cordis`、`research`、`evidence-ledger`、`verifiable-report`、`audit`、`citation-verification`

## Contributors

- [PerryLink](https://github.com/PerryLink) —— 原作者与维护者：插件架构、证据账本、字节级核验、密封报告、五语文档、CI 与发布自动化。

## PerryLink DSH Plugin Family

这是 [PerryLink](https://github.com/PerryLink) 维护的 [40 个 DeepSeek Harness 插件](https://github.com/PerryLink) 之一。如果它能帮到你，其他的也会：

| Plugin | One-liner |
|---|---|
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** | 审批链上的第二模型自动审查，默认失败关闭 | |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | 带 Web UI 侧栏、消息与中断的持久后台子代理 | |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | DeepSeek Harness 的成本治理：预算、碳排与延迟一屏呈现。 | |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** | Claude Code /rewind 等价：快照、会话 fork、一次性恢复 | |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | 把 Claude Code 会话、记忆、技能与 CLAUDE.md 迁入 DSH | |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** | 跨平台原生桌面控制（DeepSeek Harness），Windows 优先。 | |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** | Web 输入框的终端式历史：方向键、Ctrl+R 搜索 | |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** | 数据集质量检查与引文核查（本插件可选消费的数字核查桥） | |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | DeepSeek Harness 的提示注入、越狱与密钥泄露防护。 | |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** | 工程纪律守卫：需求质询、测试门禁、对手评审 | |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | DeepSeek Harness 的统一静态图像生成路由。 | |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** | DeepSeek Harness 只读性能诊断。 | |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** | 面向中国公募基金的确定性研究报告 | |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** | 面向 DSH 的 GitHub PR/issues 集成，每次写入经审批门控 | |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** | 行业研究编排，经本插件的 `ctx.researchReport.assemble` 封存交付物 | |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** | DeepSeek Harness 的本地文档知识库。 | |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** | DeepSeek Harness 的本地模型（Ollama）接入。 | |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** | 通过语言服务器的 LSP 诊断、格式化、补全、代码操作与重命名 | |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** | PII 脱敏中间件：模型边界匿名化、展示层还原 | |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** | 只读 MCP 运行时面板：/mcp 命令 + 带状态、工具与错误的 Settings 标签页 | |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** | 审批门控的跨会话记忆：ctx.memory 接缝 + SQLite + 记忆工具 | |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** | DeepSeek Harness 的 OpenTelemetry 与 Langfuse 可观测导出器。 | |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** | Claude Code outputStyles 等价的运行时风格切换 | |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** | Claude Code 风格声明式 allow/deny/ask 权限规则，带审计 | |
| **[dsh-personal-directive](https://github.com/PerryLink/dsh-personal-directive)** | 个人指令注入器:顶栏开关(框架版) |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** | 作为按需代理技能的插件开发知识库 | |
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** | Zero-dependency static + sandbox smoke detector for DSH plugins | |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | 多渠道审批/提问桥接:微信/Telegram/飞书,会话控制台 |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** | DeepSeek Harness 插件的多维质量评分。 | |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | 在 Web 侧栏置顶会话，带持久排序 | |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** | DeepSeek Harness 的跨设备会话同步——会话存储的专用 git 镜像。 | |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** | 安全审计技能包：密钥扫描、依赖与供应链审查 | |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** | DeepSeek Harness 的语音优先会话闭环：对它说，听它答。 | |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** | DeepSeek Harness 插件的隔离试装冒烟。 | |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** | TickTick/滴答清单任务桥接:会话头面板 + 11 个工具 |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** | DeepSeek Harness 的厂商参数翻译与确定性 JSON 修复。 | |
| **[dsh-wechat](https://github.com/pan17/dsh-wechat)** | 微信 ↔ DSH 桥接(Tencent iLink 机器人):文本/图片/文件/语音,聊天内审批卡片 |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** | Automatic strong/cheap model-tier routing with deterministic risk guards and a `/tier` command | |
| **[dsh-catalog](https://github.com/PerryLink/dsh-catalog)** | DSH Desktop Market standard catalog source for the PerryLink family | |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** | Read-only MCP server exposing the certification registry: grades, snapshots and five-dimension evidence | |
| **[dsh-kit](https://github.com/PerryLink/dsh-kit)** | One-command starter pack that installs the core family | |
| **[dsh-plugin-certification](https://github.com/PerryLink/dsh-plugin-certification)** | Community certification registry with repro-checkable grades and badges | |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** | Shared zero-runtime-dependency toolkit for the PerryLink DSH plugins | |
| **[dsh-plugin-portal](https://github.com/PerryLink/dsh-plugin-portal)** | Zero-dependency static portal rendering the whole plugin family as one page | |
| **[dsh-plugin-upgrade-015](https://github.com/PerryLink/dsh-plugin-upgrade-015)** | Merged `0.1.3-alpha.1` → `0.1.5-rc.1` upgrade corridor card plus a zero-dependency seam scanner | |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | Cross-session team rooms: shared message bus, task board and timeline | |

## License

Apache-2.0 — 见 [LICENSE](LICENSE)。

### 从 DSH Desktop 市场安装

所有 PerryLink 插件均可在 DSH Desktop 内置市场中浏览：**市场 → 来源 → 添加来源 → 粘贴** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ 选中**。安装仍需通过市场的 npm 身份校验与你的确认。
