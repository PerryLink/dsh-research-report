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
4. 发布会话按 PHASE2-GROUP-PROMPTS.md §0.3 收尾链执行（社区反馈检查 → 标准件 B → 标准件 A → 标准件 C）；本仓库 10 个本地 conventional commits 待推送，`node scripts/release.mjs 0.1.0` 可待发布时直接 stamp。
