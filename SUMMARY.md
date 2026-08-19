# dsh-research-report — 开发交付摘要

## 实现清单

**能力缝隙（单包三角色）**
- Service Definition：`src/service.ts` — `ResearchReportService extends Service`（`ctx.researchReport`），含逐字节冻结的 `assemble(request: AssembleReportRequest): Promise<AssembleReportResult>` 契约块（`ReportSectionInput`/`EvidenceInput`/`AssembleReportRequest`/`AssembleReportResult`），以及 `addEvidence`/`verifyClaim`/`getEvidence`/`readEvidenceContent`/`getClaim`/`listEvidence`/`listClaims`/`summarize` 内部方法。`scripts/verify-frozen-contract.mjs` 对两块冻结文本（assemble 契约 + `CitationCheckRequest`/`CitationCheckResult` 桥）做逐字节门禁。
- Provider：`src/provider-local.ts` — `LocalResearchReportService`：策略上限（maxEvidenceBytes/maxEvidencePerReport）、账本编排、核查结论回写、封印目录分配（`<reportRoot>/<slug(topic)>/<YYYYMMDD-HHmmss>/`，同秒冲突追加序号）。
- Consumer：`src/tools/` — `evidence_add`、`research_report`、`ledger_query` 三个 defineTool。

**证据账本（`src/ledger.ts`，纯 Node 零 DSH 依赖）**
- 布局：`<ledgerRoot>/objects/<sha256>`（不可变快照，tmp+rename 提交）+ `index.jsonl`（id→hash/origin/title/capturedAt/bytes）+ `claims.jsonl`（claim→evidenceIds 绑定，不可变登记）+ `verdicts.jsonl`（结论回写，最新为准）。
- 同内容去重（默认 id 为 `ev-<hash12>`）；同 id 不同内容响亮拒绝（ID_CONFLICT）；读取时重算哈希 → `ok`/`tampered`/`missing`；JSONL 损坏响亮报错；写入经内部队列串行化。

**核查（`src/verify.ts`）**
- 第 1 级（内置字节级）：claim 文本中的数字与引文子串（`"…"`/`「…」`/`“…”`）必须能在绑定快照中字面定位。数字采用 presence-first：能定位即支持；声称值**缺失**且其左上下文标签在快照中对应**不同**数值 → `contradicted`；既定位不到也无矛盾信息 → `unverified`；无可核查字面量 → `unverified`。
- 第 2 级（可选数字核查桥）：claim 带 `dataset`+`citations` 且 `ctx.get('dataQuality')` 命中时，经冻结契约 `verifyCitations` 容差核对（mismatch→contradicted，not-found/unverifiable→unverified）；未命中时仅第 1 级并在 note 中显式说明。绝不 import 对方包、绝不写入 inject。

**组装与封存（`src/assemble.ts`，纯函数）**
- 校验响亮失败（`RequestValidationError`）：claim 引用不全、未知证据 id、重复 id、超限、空标题/主题、capturedAt 不可解析。
- `report.md`：标题/主题/生成时间/结论统计 + 各章节正文（unverified/contradicted 的 claim 在引用段落保留 `[未核实]`/`[与证据矛盾]` 醒目行内标记）+ 附录 A 核查表（claim|verdict|evidence|note）+ 附录 B 证据清单（含 origin 与 sha256）+ 附录 C 封印信息（含配置指纹）。
- `manifest.json`：固定键序 JSON（schema `dsh-research-report/v1`、报告哈希、证据哈希列表、claims、verdicts、配置指纹、生成器版本）；`sealHash` = manifest 字节的 SHA-256，可重算一致。

**采集（`src/gather.ts`）**
- URL 源经 `ctx.web.fetch`（超时经 `AbortSignal.timeout/any` 链接 `fetchTimeoutMs` 与 `exec.signal`）；本地源经 `node:fs`，路径双侧 `path.resolve` 后做 workspace 逃逸检查。
- `gather` 候选轮：`ctx.web.search` → 逐源抓取注册；未捕获源带原因列入缺口清单；绝不自动成稿。

**工具**
- `evidence_add({origin, content?, title?})` → `{ok:true, evidenceId, hash, bytes, title, origin, capturedAt, deduplicated}` 或 `{ok:false, error:{code,message}}`；`ctx.web` 缺席时 URL 源**抛出**（isError 响亮失败）。
- `research_report({topic, title?, sections, claims, evidenceRefs, gather?, depth?, background?})` → 三分支规范值：`sealed`（reportDir/reportFile/manifestFile/sealHash/verdicts/counts/evidenceCount）| `background`（`{kind:'background', jobId}`，`research-report` 作业种类经 JobKindMap 合并，真实 `ctx.jobs`）| `gathered`（candidates+gaps）。`presentResult` 以 `kind:'edit'` + locations 把 report.md/manifest.json 暴露为 Web UI deliverables。
- `ledger_query({claimId?|evidenceId?})` → `evidence`（含实时 integrity）| `claim`（含最新 verdict）| `summary` | `not-found`；只读。

**会话事件（`SessionEventMap` 声明合并，typed + JSDoc @mode/@param）**
- `research-report/evidence`、`research-report/verify`、`research-report/seal`。rc.6 的 `Session.append` 无 `ignorable` 标记且无插件事件注册面，追加未知类型会让持久化层在恢复时拒绝该日志——因此采用 dsh-memento 实测过的自适应模式：仅当 `KNOWN_SESSION_EVENT_TYPES` 认识该类型时才追加。账本 JSONL 始终是权威持久层；宿主未来收录词汇后事件自动激活。

**配置（Schemastery，`src/config.ts` + `cordis.patch.yml` 注释 + 五语 README 表）**
- `enabled`(true)、`ledgerRoot`(.research-ledger)、`reportRoot`(research-reports)、`maxEvidenceBytes`(2097152)、`maxEvidencePerReport`(200)、`fetchTimeoutMs`(20000)；`resolveConfig` 显式校验边界，加载期响亮失败。

**服务 inject**：`['tools', 'systemPrompt']`；`web`/`jobs`/`dataQuality` 一律 `ctx.get` 调用时判空（缺席可挂载，受影响路径响亮失败）。注入提示词段以一句角色陈述开头，共两句。

## 验收逐项

1. **检查链全绿**（Windows 11 + Node v22.22.3 + pnpm 11.7.0）：
   - `pnpm install` ✅（独立 pnpm-lock.yaml）
   - `pnpm run typecheck` ✅ exit 0（src + test 双 tsconfig）
   - `pnpm run typecheck:ci` ✅ exit 0（skipLibCheck=false + verbatimModuleSyntax，对照已发布 0.1.0-rc.6 类型）
   - `pnpm test` ✅ **66/66**（8 个 spec 文件）
   - `pnpm run test:coverage` ✅ 聚合 statements 92.52% / branches 81.71% / functions 95.87% / lines 92.52%（阈值 90/80/90/90）
   - `pnpm run build` ✅（tsdown + tsc declarations + fix-dts，无 `.ts` 残留导入）
   - `pnpm run verify:self-contained` ✅（无仓库外依赖规格）
   - `pnpm run verify:artifacts` ✅（语法检查 + 纯 Node ESM import + 插件面 + 冻结服务导出）
   - `pnpm run verify:frozen-contract` ✅（两块冻结文本逐字节在 src/ 中）
   - `node scripts/check-readme-sync.mjs` ✅（五语标题结构 + 配置表键一致）
   - `pnpm run pack:check` ✅（tarball 含 lib/src/cordis.patch.yml/CHANGELOG/五语 README/LICENSE/THIRD_PARTY_NOTICES）
   - `pnpm run lint` ✅ oxlint 0 warnings/0 errors（32 files）
2. **测试覆盖**（真实 Context/Session/ToolRuntime/LocalJobRegistry/WebRuntime，仅网络后端为注册进真实 `ctx.web` 注册表的脚本化 provider）：账本内容寻址与去重（`test/ledger.spec.ts`）、篡改检测（改 objects 文件 → integrity tampered → contradicted）、字节级三态（`test/verify.spec.ts`）、claim 引用不全/未知证据响亮拒绝（`test/assemble.spec.ts` + `test/index.spec.ts`）、manifest/sealHash 可重算一致、`ctx.web` 缺席时 URL 源响亮失败（isError + WEB_UNAVAILABLE）、后台作业经真实 ctx.jobs（`research-report-N`）。
3. **端到端（keyless）**：`test/e2e.spec.ts` — fixtures 三份本地文档（workspace 相对路径）→ `evidence_add` ×3 → `research_report`（主题"示例行业概览"）→ 版本化封存目录（`reports/示例行业概览/<YYYYMMDD-HHmmss>/`）→ 附录 A 三行 ✅ verified → manifest 重算哈希 == sealHash → 篡改一份证据对象 → `ledger_query` 报 `integrity: tampered` → 重跑 assemble → `c-growth` 判 `contradicted` 且正文含 `[与证据矛盾]`。
4. **试装**：手动临时 profile（`DSH_HOME` 在本插件 `.tmp\` 内，已清理）——`dsh plugin --profile smoke add dsh-base + dsh-headless + 本包 tgz` ✅ → `--dump-config` 含 `dsh-research-report` 行 ✅ → keyless headless 冒烟得 `MISSING_CREDENTIAL`（证明插件树完整加载）✅ → `remove` 可逆卸载 ✅。（dsh-test-drive 本身需先装入一个运行中的宿主 profile 才能驱动目标，故采用其等价的手动步骤矩阵。）
5. **冻结契约自查**：`scripts/verify-frozen-contract.mjs` 将 §6.2 与 §7 文本嵌入脚本并断言逐字节存在于 `src/service.ts`/`src/verify.ts` ✅；`ctx.researchReport.assemble(request)` 按冻结签名可调（provider 实现签名仅多一个可选 `context` 参数，对冻结表面赋值兼容）。

## 偏差说明（提示词 vs 官方 seam/模板核对）

- **`ctx.attachment` 在 rc.6 不存在于所需形态**：官方附件 seam 是 `ctx.attachments` 且**仅支持图片**（PNG/JPEG/WebP/GIF），无法落 markdown/manifest。rc.6 中"产出出现在 Web UI deliverables"的真实机制是工具卡片的 `locations`（diff 卡或 `kind:'edit'` 的 generic 卡）。已按真实机制实现：`research_report` 的 `presentResult` 经 `presentationMeta`（持久化于 `tool/result.meta`，回放安全）把 `report.md`/`manifest.json` 声明为产出路径。报告文件本身写入 workspace（`<reportRoot>/...`）。
- **会话事件自适应**：任务要求"记 session event"，但 rc.6 追加未收录事件类型会在恢复时拒读会话日志（dsh-fast/dsh-memento 均已实测记录此坑）。已声明完整 typed 事件并自适应追加；账本 JSONL 为权威持久层。
- **默认 profile 无 fetch provider**：`dsh-base` 只挂搜索（fetch 因 SSRF 考量默认关闭）。因此 URL 抓取在默认部署响亮失败（`WEB_UNAVAILABLE`/`WEB_PROVIDER_UNAVAILABLE`，README 已载明），`gather` 把未捕获源列入缺口清单而非编造证据。
- **目录命名**：采用家族一致的 `test/`（任务示意写 `tests/`）与五语 README（英文为源，任务示意行括注"中文"与 §6.1 五语条款不一致，以五语条款为准）。

## 已知限制

- 字节级核查**非语义**：转述性结论无字面量 → `unverified`；标签冲突检测是确定性启发式（presence-first，声称值缺失时才可能判 contradicted），不做全文相似度/语义对齐（v1 明确不做）。
- 会话事件在 rc.6 为声明态（宿主收录词汇后自动落盘）。
- 单 workspace 作用域：账本/报告根在挂载时相对 harness cwd 解析；多 workspace 部署需逐 profile 配绝对路径。
- 快照以 UTF-8 文本存储；二进制源（PDF 等）未纳入 v1。
- 后台作业测试以 unowned 方式运行（最小 harness agent 未注册进真实 agents 注册表——作业所有权校验要求真实注册；生产 profile 中 agent 由 agent loop 提供，属正常路径）。

## 后续建议

1. 宿主支持 `ignorable` 或插件事件注册面后，移除 `KNOWN_SESSION_EVENT_TYPES` 自适应门（事件定义已就绪）。
2. fetch provider 进入默认部署后，`gather` 的候选捕获率自动提升；可在 README 补一节部署方配置示例。
3. v2 可评估：引文定位增强（更多引号风格/跨段数字归一）、`ctx.dataQuality` 命中时的 CSV 列名启发式自动映射、报告目录的 attachment 化（待官方附件 seam 支持通用文件）。
4. 发布会话按 PHASE2-GROUP-PROMPTS.md §0.3 收尾链执行（社区反馈检查 → 标准件 B → 标准件 A → 标准件 C）。截至本摘要更新：仓库 14+ 个 conventional commit 已推送 `main`（tag `v0.1.0`、npm `0.1.0`、GitHub Release 均已存在）；收尾链执行状态与全部待办/草稿/命令清单见文末「## 发布交接（§0.3 收尾链执行状态）」，未完成项以「待发布会话执行」标注。

## 发布交接（§0.3 收尾链执行状态）

**凭据边界（如实记录）**：Windows 凭据管理器持有可用 GitHub 凭据，git push 与 gh CLI（自装 Windows 版 gh 2.97.0 于 `.tmp\gh-win\`）均以已登录账号 PerryLink 透明使用（token 全程掩码，未进入会话上下文）；npm 登录缺失（ENEADAUTH），npm 发布由仓库 release workflow（NPM_TOKEN secret）完成。除被目标仓库规则阻塞（bruc3van stars 门槛）或被目标侧故障阻塞（hub issue 管线）的项外，全部收尾操作已实际执行。

### 步骤 0 · 社区反馈检查（已执行，结果）

- 本仓库 0 issue / 0 PR（open/closed 均为空）→ 无未回复社区评论，无回复草稿需要。
- Discussions 已开启，欢迎帖 #1（Announcements「Welcome to dsh-research-report」）已存在。
- 外发 PR 状态：awesome-dsh-plugin [PR #1990](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/1990)（open，0 comments，0 review comments，等维护者合并）；AdamPlatin123 [PR #260](https://github.com/AdamPlatin123/awesome-dsh-plugins/pull/260)（closed=已合并，PLUGINS.md 在列）。
- 无 bug 类反馈需要修复。

### 步骤 1 · 标准件 B 现状（盘点完成）

- topics（9 个，含 `dsh-plugin`）✅；About description ✅；homepage→npm ✅。
- 徽章（License/DSH/Node/CI/Version/npm version/npm downloads）✅；Contributors 段 ✅。
- P0：`.github/ISSUE_TEMPLATE/bug_report.yml`、`feature_request.yml`、`PULL_REQUEST_TEMPLATE.md`、`SECURITY.md` 已存在 ✅。
- Discussions 开启 + 欢迎帖 ✅。
- ✅ **main 分支保护已核实**（gh api 读回，2026-08-19）：`required_status_checks: {strict:false, contexts:["gates"]}`、`required_signatures:false`、`enforce_admins:false`、`required_linear_history:false`、`allow_force_pushes:true`、`allow_deletions:false`、`block_creations:false`、`required_conversation_resolution:false`、`lock_branch:false`、`allow_fork_syncing:false`——与 §0.3 规范一致（contexts 用字面 job 名 `gates`）。

### 步骤 2 · 标准件 A：生态投递执行状态

阶段 0 合规自查：公开 ✅、`dsh-plugin` topic ✅、`dsh.bundle.patch`→cordis.patch.yml ✅、真实代码+LICENSE+中英 README ✅、npm 已发布 ✅。

| 目标 | 状态 | 交接物 |
|---|---|---|
| 一-1 awesome-dsh-plugin | PR #1990 open 待合并（无 review 意见） | 跟踪合并 |
| 一-2 AdamPlatin123 | ✅ 已收录（PR #260 merged） | 无 |
| 一-3 0xsline/awesome-deepseek-harness | ✅ **PR [#422](https://github.com/0xsline/awesome-deepseek-harness/pull/422) 已创建**（fork `PerryLink/awesome-deepseek-harness` 分支 `add/dsh-research-report`，mergeable，2 文件 +2 行双语条目，Output & Deliverables） | patch 留档 `release-handoff/0xsline-dsh-research-report.patch` |
| 一-4 bruc3van 自荐区 | ⛔ 被规则阻塞：自荐要求 `stargazers_count > 10`，本仓库实测 0 stars，CI 会拒绝。规则原文（CONTRIBUTING.md）：「自荐仓库的 Star 数必须超过 10 个…不达标的 PR 将被拒绝。」→ 如实不投；其 topic 自动目录为每日快照 | 重投条件：stars>10 |
| 二（OMDSH hub） | 🟡 **Issue [#78](https://github.com/omdsh-dev/dsh-hub-workshop/issues/78) 已创建**；bot 预检因 **hub 侧既有故障**未生成 pending-review（见下） | 清单 + 诊断评论已在 Issue 内 |
| 三（官方 Discussions） | ✅ **帖 [#3447](https://github.com/deepseek-ai/deepseek-harness/discussions/3447) 已发布**（Show Your Plugins! 类目） | 无 |
| 四（聚合仓核验） | Oh-My-DSH/YELEBAI/bruc3van CATALOG 当前均无（预期每日/≤8h 自动快照同步）；AdamPlatin123 已现 | 复核命令见下 |

**一-3（0xsline）已执行**：fork `PerryLink/awesome-deepseek-harness` → 分支 `add/dsh-research-report`（commit `3daee8f`，对上游 `baa2debf23c9859e63e2163887036ecef530f691` 的 2 文件 +2 行最小改动）→ PR [#422](https://github.com/0xsline/awesome-deepseek-harness/pull/422)（mergeable）。patch 留档 `release-handoff/0xsline-dsh-research-report.patch`。

条目原文（EN）：`- [dsh-research-report](https://github.com/PerryLink/dsh-research-report) - Verifiable research-report engine for DeepSeek Harness: content-addressed evidence ledger (claim-to-snapshot binding, tamper-evident) and versioned sealed reports with per-claim verification verdicts and a manifest SHA-256 seal.`
条目原文（ZH）：`- [dsh-research-report](https://github.com/PerryLink/dsh-research-report) - DeepSeek Harness 可核查研究报告引擎：内容寻址证据账本（claim ↔ 快照绑定、防篡改）与版本化封存报告，每条 claim 带核查结论，manifest SHA-256 封印报告目录。`

**二（OMDSH hub）已执行**：清单（本地已通过官方 validator，workshop HEAD `928cb55b8bb876b8b5d6f278eb849fbefc285dba`；固定 commit `b95f2d187b43945693f808382cc3cad6536c5bda`）已作为 Issue [#78](https://github.com/omdsh-dev/dsh-hub-workshop/issues/78) 提交。bot 预检结果：**解析通过并生成 typed Harness plan**（日志：`prepared dsh-research-report@0.1.1 from Issue #78 with a typed Harness plan; Registry remains ineligible`），但 `npm run validate` 在 hub 自身 `check-public-site.mjs:135` 失败（`verification inventory must cover every Catalog project...`）。**已核实为 hub 侧既有故障**：相同错误同样出现在 8/18 Issue #77 的运行（run `32160313736`）及 8/16 起全部 issue 触发的 intake 运行，而 schedule 触发运行（run `31993384728`）成功。诊断证据已作为评论贴入 Issue #78（[comment](https://github.com/omdsh-dev/dsh-hub-workshop/issues/78#issuecomment-5345569152)）。后续：hub 侧管线恢复后由维护者重新触发，或手动生成 pending-review 记录与审核 PR。

**三（官方 Discussions）已执行**：帖 [#3447](https://github.com/deepseek-ai/deepseek-harness/discussions/3447) 已发布（类目 `Show Your Plugins!`，id `DIC_kwDOT3T1g84DDSUe`，GraphQL `createDiscussion`）。标题：`Showcase: dsh-research-report - 可核查研究报告引擎（证据账本 + 版本化封存报告）`；正文含一句话定位、解决的问题、安装命令、仓库/npm 链接与三个榜单收录链接（含 0xsline PR #422）。

**四（聚合仓复核命令，发布会话执行）**：
```bash
curl -s https://raw.githubusercontent.com/like-study1/Oh-My-DSH/main/PLUGINS.md | grep -c dsh-research-report
curl -s https://raw.githubusercontent.com/YELEBAI/dsh-plugin-marketplace/main/README.md | grep -c dsh-research-report
curl -s https://raw.githubusercontent.com/bruc3van/awesome-dsh-plugin/main/CATALOG.md | grep -c dsh-research-report
curl -s https://raw.githubusercontent.com/AdamPlatin123/awesome-dsh-plugins/main/PLUGINS.md | grep -c dsh-research-report
```

### 步骤 3 · 标准件 C：发布状态（已执行完毕）

- `main` 已推送 ✅（`3ecd2ce..fc6d882`，含 `fix:` dshWorkshop 合规 / `ci:` provenance / `docs:` 交接 / `chore(release): 0.1.1` / 固定提交 5 个 commit）。
- tag `v0.1.0` ✅ + `v0.1.1` ✅（`git push origin main --follow-tags`）。
- npm：`0.1.0` ✅（无 provenance，无法回补）+ **`0.1.1` ✅ 带 provenance**（release.yml `npm publish --access public --provenance` 生效；registry attestations 端点实测 `dsh-research-report@0.1.1: attestations=2, predicate https://github.com/npm/attestation/tree/main/specs/publish/v0.1`）。
- GitHub Release `v0.1.0` ✅ + `v0.1.1` ✅（2026-08-19T16:39:33Z）；Release workflow 双 job（publish/release）success。
- 远端 push 回执证实 main 分支保护已配置（required_status_checks `gates`，本会话凭据以 bypass 通过）。

**遗留（如实记录，非本会话可解）**：① OMDSH hub pending-review 记录/审核 PR——被 hub 侧 issue 管线既有故障阻塞（Issue #78 已留诊断证据）；② bruc3van 自荐——stars>10 规则门槛（当前 0）；③ 聚合仓（Oh-My-DSH/YELEBAI/bruc3van CATALOG）——每日/≤8h 自动快照预期内未出现；④ awesome-dsh-plugin PR #1990——等维护者合并。

### 人工待办（无法自动化）

1. Discord 分享（官方 Discord 无自动化渠道）。
2. 中文渠道推广（掘金/知乎/公众号等，按发布方口径）。
3. 跟踪合并：awesome-dsh-plugin PR #1990、0xsline PR #422。
4. bruc3van 自荐：stars>10 后提交。
5. OMDSH hub：hub 侧 issue 管线恢复后重触发 Issue #78，bot 生成 pending-review 与审核 PR；维护者侧补运行证据（`intake/evidence/`，profile 生命周期需 macOS sandbox-exec 或等价隔离执行器，Windows 环境无法直接产出该项证据——如实申报）。
6. 「项目总览」现状更新建议一行：`dsh-research-report：v0.1.1 已带 provenance 发布；生态投递 4/6 落定——AdamPlatin123 已收录、0xsline PR #422 已开、官方 Discussions 帖 #3447 已发、awesome-dsh-plugin PR #1990 待合并；OMDSH hub Issue #78 已提交（pending-review 被 hub 侧管线故障阻塞，诊断已留证）；bruc3van 自荐待 stars>10。`
