<div align="center">

# 📑 dsh-research-report
- **1024 स्टोर चैनल**: एक बार `npm i -g dsh1024`, फिर `dsh1024 plugin --profile web add dsh-research-report` ([deepseek1024.com](https://deepseek1024.com) इंस्टॉल रैंकिंग में गिना जाता है)।

**DeepSeek Harness के लिए सत्यापन-योग्य (verifiable) रिसर्च-रिपोर्ट इंजन।**

*हर claim अपरिवर्तनीय साक्ष्य-स्नैपशॉट से बंधता है, बाइट-दर-बाइट जाँचा जाता है, और एक संस्करणित (versioned) रिपोर्ट में सील होता है — जिसका manifest हैश कोई भी दोबारा गिनकर सत्यापित कर सकता है।*

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

- DeepSeek Harness `0.1.1-rc.2` (peer डिपेंडेंसी `0.1.1-rc.2` पर पिन)।
- Node `^22.19.0 || >=24.0.0`, केवल ESM (`"type": "module"`)।
- Peer डिपेंडेंसी: `@deepseek-ai/cordis ^4.0.1`, `@deepseek-ai/schemastery ^3.18.0`, तथा `0.1.1-rc.2` के `@deepseek-ai/dsh-session`, `@deepseek-ai/dsh-tools`, `@deepseek-ai/dsh-system-prompt`, `@deepseek-ai/dsh-web`, `@deepseek-ai/dsh-jobs`।
- वैकल्पिक सहयोगी (कभी अनिवार्य नहीं): URL कैप्चर/गैदर के लिए `ctx.web` provider; बैकग्राउंड असेंबली के लिए `ctx.jobs`; डेटासेट उद्धरण जाँच के लिए `ctx.dataQuality` (dsh-data-quality)।

## What you get

- **साक्ष्य बही-खाता (evidence ledger)** — कंटेंट-एड्रेस्ड स्नैपशॉट स्टोर (`<ledgerRoot>/objects/<sha256>` + JSONL जर्नल)। एक ही कंटेंट ठीक एक बार सहेजा जाता है; स्नैपशॉट अपरिवर्तनीय हैं; हर रीड पर हैश दोबारा गिना जाता है — छेड़छाड़ या विलोपन "भरोसा" नहीं, "पकड़ा" जाता है।
- **claim ↔ साक्ष्य बाइंडिंग** — claim अपने आधार-साक्ष्यों की id के साथ पंजीकृत होते हैं; बही-खाता बाइंडिंग और हर सत्यापन निर्णय सहेजता है (नवीनतम मान्य)।
- **बाइट-स्तरीय जाँच** — claim के हर अंक और हर उद्धृत खंड को बंधे स्नैपशॉट में शाब्दिक रूप से मिलना चाहिए। बंधा साक्ष्य न हो, या जाँच-योग्य अक्षर न हो, तो claim `unverified`; बंधा साक्ष्य उद्धृत अक्षरों की पुष्टि या खंडन न कर सके तो `insufficient`; लेबल के सामने स्नैपशॉट में दूसरा मान हो (और उद्धृत मान अनुपस्थित हो) तो `disproven`; छेड़छाड़/लापता स्नैपशॉट हो तो `contradicted`। कोई सिमैंटिक्स नहीं, कोई एम्बेडिंग नहीं — केवल ऑडिट-योग्य बाइट जाँच।
- **वैकल्पिक संख्या-सेतु** — जब claim किसी संरचित workspace डेटासेट (CSV/JSON) को उद्धृत करता है और `dsh-data-quality` माउंट है, तो उद्धरण उसके फ्रोज़न `verifyCitations` अनुबंध से सहिष्णुता-सहित जाँचे जाते हैं; डेटासेट विसंगति claim को मिथ्या (disprove) कर देती है।
- **DOI साक्ष्य (शून्य नेटवर्क)** — DOI स्रोत नियतात्मक रूप से जाँचे जाते हैं (`10.xxxx/xxxx` संरचना, उपसर्ग श्वेतसूची और DOI वर्ण-समुच्चय); अमान्य DOI ठोंककर असफल होते हैं। वैकल्पिक जर्नल/वर्ष मेटाडेटा स्वीकारा जाता है, और `requireJournalMetadata` केवल सक्रिय होने पर शैक्षणिक DOI साक्ष्य को प्रतिबंधित करता है।
- **संस्करणित सील्ड रिपोर्ट** — `<reportRoot>/<slug(topic)>/<YYYYMMDD-HHmmss>/report.md` + `manifest.json` + `verification.jsonl` + `disconfirmation.jsonl`; सील हैश = manifest का SHA-256, और manifest में रिपोर्ट हैश, सभी साक्ष्य हैश व हर ऑडिट जर्नल का हैश होता है।
- **डिलीवरी-पूर्व पुनः ऑडिट व सील अवरोध** — सील करने से पहले हर बंधा claim ऑफ़लाइन पुनः जाँचा जाता है और `verification.jsonl` में दर्ज होता है; verdict drift, छेड़छाड़/लापता बंधा साक्ष्य, या जर्नल सीरियलाइज़ेशन विफलता सील को रोक देती है (ठोंककर असफल, कोई tunable नहीं)।
- **मिथ्याकरण बही-खाता** — हर contradicted या disproven claim `disconfirmation.jsonl` में (claim + साक्ष्य संदर्भ + कारण) दर्ज होता है और रिपोर्ट के `证伪记录` परिशिष्ट में सूचीबद्ध होता है।
- **नकारात्मक ज्ञान** — एक disproven claim अपने कंटेंट हैश से याद रखा जाता है (`disproofs.jsonl`); अपरिवर्तित साक्ष्य के विरुद्ध पुनः रिपोर्ट किया गया वही पाठ वापस `disproven` में बलपूर्वक डाला जाता है और साक्ष्य बदलने पर ही पुनः जाँचा जाता है।
- **रीड-ओनली verifier लूप** — सील करने के बाद नियतात्मक फॉलबैक `verifySealedReport` (शून्य नेटवर्क, शून्य मॉडल) सील व ऑडिट हैश दोबारा गिनता है और हर claim की पुनः जाँच करता है, `verifier-note.md` में मशीन-चेक भाग लिखता है; `ctx.jobs` माउंट होने पर एक रीड-ओनली verifier job भी चालू होता है (मॉडल समीक्षा वृद्धि है, प्रतिस्थापन नहीं)।
- **सत्र-आधारित साक्ष्य** — `evidence_add` वैकल्पिक `sessionRef` (`sessionId` + `eventRange`, ठोंककर सत्यापित) स्वीकारता है; एंकर सहेजा जाता है और परिशिष्ट B, manifest व `verification.jsonl` में दर्ज होता है। सत्र-आधारित साक्ष्य ईमानदारी से `unverified` होता है (`会话锚定证据需人工回查会话日志`)।
- **ईमानदार खाली-जगहें** — unverified/insufficient/contradicted/disproven claim रिपोर्ट के मुख्य भाग में दृश्य चिह्न `[未核实]` / `[证据不足]` / `[与证据矛盾]` / `[已证伪]` रखते हैं और परिशिष्ट A में सूचीबद्ध होते हैं। कुछ भी चुपचाप पारित नहीं होता।
- **कोई deep-research लूप नहीं** — रिट्रीवल ऑर्केस्ट्रेशन जानबूझकर पुनः उपयोगित है: खोज/फेच `ctx.web`, लंबे कार्य `ctx.jobs`। योजना और संश्लेषण मॉडल (या अपस्ट्रीम प्लगिन) के पास रहते हैं।

## Quick start

### git चैनल

```sh
# scratch profile से (commit पिन करें; स्व-संपूर्ण `prepare` बिल्ड चलता है)
dsh plugin --profile demo add "github:YOUR_ORG/dsh-research-report#<sha>"
# पहले add पर profile के pnpm-workspace.yaml में dsh-research-report की allowBuilds एंट्री जुड़ जाती है।
```

### npm चैनल

```sh
dsh plugin --profile demo add dsh-research-report
```

दोनों चैनल bundle पंक्ति (देखें `cordis.patch.yml`) को profile के `dsh.profile.bundles` स्टैक में डालते हैं और **रीस्टार्ट पर प्रभावी** होते हैं।

फिर, सत्र में:

```
evidence_add({ origin: "docs/market.md", title: "Market snapshot" })     # → ev-1a2b3c4d5e6f
research_report({ topic: "示例行业概览", sections: [...], claims: [...], evidenceRefs: ["ev-1a2b…"] })
ledger_query({ claimId: "c1" })                                          # बाइंडिंग + निर्णय
```

## Install & uninstall

```sh
dsh plugin --profile demo add dsh-research-report       # इंस्टॉल
dsh plugin --profile demo remove dsh-research-report    # अनइंस्टॉल
```

पंक्ति माउंट हुई या नहीं, जाँचें: `dsh --profile demo --dump-config | grep dsh-research-report`।

## Configuration

सभी ट्यूनेबल Schemastery `Config` फ़ील्ड हैं; अमान्य मान profile लोड पर ठोंककर (loudly) असफल होते हैं। सापेक्ष रूट harness वर्किंग डायरेक्टरी (workspace) के सापेक्ष resolve होते हैं।

| Key | Default | Description |
| --- | --- | --- |
| `enabled` | `true` | मास्टर स्विच; `false` पर कुछ भी माउंट नहीं होता। |
| `ledgerRoot` | `.research-ledger` | साक्ष्य बही-खाता डायरेक्टरी (ऑब्जेक्ट + JSONL जर्नल)। |
| `reportRoot` | `research-reports` | सील्ड रिपोर्ट रूट (विषय + टाइमस्टैम्प से संस्करणित)। |
| `maxEvidenceBytes` | `2097152` | एक साक्ष्य स्नैपशॉट की UTF-8 बाइट हार्ड सीमा। |
| `maxEvidencePerReport` | `200` | एक रिपोर्ट में बंधने वाली साक्ष्य-वस्तुओं की हार्ड सीमा। |
| `fetchTimeoutMs` | `20000` | कैप्चर के दौरान एक `ctx.web` fetch की समय-सीमा (ms)। |
| `requireJournalMetadata` | `false` | `true` होने पर, DOI-प्रकार साक्ष्य को पंजीकरण पर जर्नल नाम व प्रकाशन वर्ष देना अनिवार्य है (अन्यथा ठोंककर असफल)। |

## Tools & surfaces

- **`evidence_add({ origin, content?, title? })`** — एक साक्ष्य स्नैपशॉट पंजीकृत करता है। `content` देने पर पाठ यथावत सहेजा जाता है; न देने पर URL स्रोत `ctx.web` से फेच होता है और workspace-सापेक्ष पथ डिस्क से पढ़ा जाता है (रीड कभी workspace से बाहर नहीं निकलती)। साक्ष्य id और SHA-256 हैश लौटाता है।
- **`research_report({ topic, title?, sections, claims, evidenceRefs, gather?, depth?, background? })`** — रिपोर्ट असेंबल और सील करता है: मान्यकरण (अपंजीकृत claim संदर्भ ठोंककर अस्वीकृत), हर claim की जाँच, दृश्य चिह्नों सहित `report.md` रेंडर, `manifest.json` लेखन, और सील हैश वापसी। `gather: true` `ctx.web` पर एक खोज-चक्र चलाता है और कैप्चर की गई उम्मीदवार-साक्ष्य तथा स्पष्ट गैप-सूची लौटाता है — कभी स्वतः असेंबल नहीं करता। `background: true` `ctx.jobs` पर `{ kind: 'background', jobId }` लौटाता है।
- **`ledger_query({ claimId? | evidenceId? })`** — बाइंडिंग/निर्णय की रीड-ओनली क्वेरी; साक्ष्य रीड पर फिर से हैश होता है, इसलिए छेड़छाड़/लापता स्नैपशॉट स्पष्ट रूप से रिपोर्ट होता है। बिना id के बही-खाता सारांश लौटाता है।
- **`ctx.researchReport.assemble(request)`** — सिबलिंग प्लगिन के लिए फ्रोज़न सेवा सतह (देखें `src/service.ts`; `scripts/verify-frozen-contract.mjs` द्वारा बाइट-दर-बाइट गेटेड)।

## Permissions & data

`dsh-research-report` केवल सार्वजनिक seam उपभोग करता है: `ctx.tools`, `ctx.systemPrompt`, तथा वैकल्पिक रूप से `ctx.web` / `ctx.jobs` / `ctx.dataQuality` (कॉल के समय `ctx.get` से, कभी inject नहीं)। यह केवल कॉन्फ़िगर की गई बही-खाता व रिपोर्ट जड़ों के भीतर लिखता है (दोनों डिफ़ॉल्ट workspace-लोकल डायरेक्टरी हैं), workspace फ़ाइलें केवल workspace के भीतर पढ़ता है, और नेटवर्क तक केवल harness web seam से पहुँचता है — कभी सीधा `fetch` नहीं। साक्ष्य स्नैपशॉट अपरिवर्तनीय और कंटेंट-एड्रेस्ड हैं; claim पंजीकरण अपरिवर्तनीय हैं; निर्णय केवल जुड़ते (append) हैं।

## Security boundaries

- **रचना से ही छेड़छाड़-साक्ष्य** — हर स्नैपशॉट रीड इंडेक्स के विरुद्ध SHA-256 दोबारा गिनता है; मेल न खाए तो बंधे claim `contradicted` होते हैं और `ledger_query` `integrity: tampered`/`missing` रिपोर्ट करता है।
- **workspace सीमा** — स्थानीय साक्ष्य रीड workspace रूट के सापेक्ष resolve होती हैं और एस्केप अस्वीकार करती हैं (तुलना से पहले दोनों पक्ष `path.resolve` होते हैं)।
- **ठोंककर विफल कॉन्फ़िगरेशन** — अमान्य सीमाएँ माउंट पर throw करती हैं; अपंजीकृत claim संदर्भ, अज्ञात साक्ष्य id और id/कंटेंट टकराव असेंबली पर throw करते हैं।
- **कोई क्रेडेंशियल हैंडलिंग नहीं, कोई छिपा नेटवर्क नहीं** — URL कैप्चर `ctx.web` से गुजरता है (provider चयन, त्रुटि वर्गीकरण और कोई भी SSRF नीति deployment के web providers के पास रहती है)।
- **उतरने-योग्य पंजीकरण** — हर योगदान `ctx.effect()` / `register()` से होता है, इसलिए अनइंस्टॉल और हॉट रीलोड साफ़ हैं।

## Known limitations

- **बाइट-स्तरीय, सिमैंटिक नहीं** — अंतर्निर्मित जाँच अंक/उद्धरण शाब्दिक मिलान करती है; बिना जाँच-योग्य शाब्दिक वाले पुनःपरिभाषित claim `unverified` रहते हैं, और जिस claim का अंक अनुपस्थित है पर लेबल दूसरे मान के साथ मिलता है वह `contradicted` पढ़ा जाता है। यह v1 का जानबूझ निर्णय है (चतुर से बढ़कर ऑडिट-योग्य)।
- **अनुकूली सत्र-इवेंट** — प्लगिन टाइप किए गए `research-report/evidence`, `research-report/verify`, `research-report/seal` सत्र-इवेंट घोषित करता है, पर rc.2 के `Session.append` में `ignorable` विकल्प नहीं और न ही प्लगिन इवेंट-पंजीकरण सतह है; अतः append तभी सक्रिय होते हैं जब होस्ट बिल्ड उन प्रकारों को जानता हो (वरना persistence परत रिस्टोर पर लॉग अस्वीकार कर देगी)। बही-खाता जर्नल ही सदैव टिकाऊ सत्य का स्रोत है।
- **डिफ़ॉल्ट profile में fetch provider नहीं** — shipped `dsh-base` केवल search माउंट करता है, इसलिए fetch provider कॉन्फ़िगर होने तक URL कैप्चर ठोंककर विफल होता है (`WEB_UNAVAILABLE`/`WEB_PROVIDER_UNAVAILABLE`); search-आधारित `gather` अकैप्चर स्रोतों को गैप-सूची में डालता है।
- **एकल-workspace दायरा** — बही-खाता व रिपोर्ट रूट माउंट पर harness वर्किंग डायरेक्टरी के सापेक्ष resolve होते हैं; बहु-workspace डिप्लॉयमेंट को प्रति-profile निरपेक्ष रूट कॉन्फ़िगर करने चाहिए।

## Verifier CLI

स्वतंत्र `dsh-research-verify` बाइनरी (`lib/cli.js` के रूप में बंडल, कोई `@deepseek-ai` import नहीं) प्लगिन माउंट किए बिना किसी भी सील्ड रिपोर्ट निर्देशिका का ऑडिट करता है:

```sh
dsh-research-verify --report <dir> [--seal <sha256>] [--ledger <dir>] [--format json|sarif]
```

- `--report <dir>` — सील्ड रिपोर्ट निर्देशिका (`manifest.json` + `report.md` + ऑडिट जर्नल)।
- `--seal <sha256>` — पुनः गणित manifest हैश से तुलना हेतु अपेक्षित सील हैश; छोड़ने पर केवल मान बताया जाता है, तुलना नहीं।
- `--ledger <dir>` — एविडेंस लेजर रूट (`objects/<sha256>` + `index.jsonl`) दावों की बाइट-स्तरीय पुनः जाँच हेतु; छोड़ने पर दावों की पुनः जाँच ईमानदारी से छोड़ दी जाती है।
- `--format` — `json` (डिफ़ॉल्ट) या `sarif` (SARIF 2.1.0)।

यह सील हैश, `report.md` हैश और ऑडिट जर्नल हैश की पुनः गणना करता है, प्रत्येक दावे की बाइट-स्तरीय + अखंडता जाँच दोहराता है, और कोई भी जाँच विफल होने पर गैर-शून्य कोड से बाहर निकलता है। `verifySealedReport` / `buildVerificationReport` / `renderSarif` / `renderVerificationJson` पैकेज से लाइब्रेरी उपयोग हेतु निर्यात किए जाते हैं।

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

- `typecheck` इंस्टॉल किए गए 0.1.1-rc.2 peers से `@deepseek-ai/*` resolve करता है; `typecheck:ci` प्रकाशित टाइप्स के विरुद्ध `skipLibCheck` बंद और `verbatimModuleSyntax` चालू करता है। दोनों हरे रहने चाहिए।
- टेस्ट 0.1.1-rc.2 peers के वास्तविक `Context`/`Session`/`ToolRuntime`/`LocalJobRegistry`/`WebRuntime` उपयोग करते हैं; केवल नेटवर्क बैकएंड वास्तविक `ctx.web` रजिस्ट्री में पंजीकृत scripted providers हैं।
- रिलीज़: `node scripts/release.mjs <x.y.z>` (वर्ज़न बम्प, CHANGELOG स्टैम्प, गेट पुनःचालन, कमिट + टैग; कभी push नहीं)।

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `cordis`, `research`, `evidence-ledger`, `verifiable-report`, `audit`, `citation-verification`

## Contributors

- [PerryLink](https://github.com/PerryLink) — मूल लेखक और अनुरक्षक: प्लगइन आर्किटेक्चर, साक्ष्य लेजर, बाइट-स्तरीय सत्यापन, सीलबंद रिपोर्ट, पाँच-भाषा दस्तावेज़, CI और रिलीज़ स्वचालन।

## PerryLink DSH Plugin Family

यह प्रोजेक्ट [PerryLink](https://github.com/PerryLink) द्वारा अनुरक्षित [33 DeepSeek Harness प्लगइनों](https://github.com/PerryLink) में से एक है। अगर यह आपकी मदद करता है, तो बाकी भी करेंगे:

| Plugin | One-liner |
|---|---|
| **[dsh-dsh-auto-review](https://github.com/PerryLink/dsh-dsh-auto-review)** | अनुमोदन श्रृंखला पर द्वितीय-मॉडल स्वतः-समीक्षा, डिफ़ॉल्ट रूप से विफल-बंद | |
| **[dsh-dsh-background-agents](https://github.com/PerryLink/dsh-dsh-background-agents)** | वेब UI साइडबार, संदेश और अवरोधन के साथ टिकाऊ पृष्ठभूमि चाइल्ड एजेंट | |
| **[dsh-dsh-budget](https://github.com/PerryLink/dsh-dsh-budget)** | DeepSeek Harness के लिए लागत प्रशासन: बजट, कार्बन और विलंबता एक पैनल में। | |
| **[dsh-dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-dsh-checkpoint-rewind)** | Claude Code /rewind-समतुल्य: स्नैपशॉट, सत्र फ़ॉर्क, एक-बार पुनर्स्थापना | |
| **[dsh-dsh-claude-move](https://github.com/PerryLink/dsh-dsh-claude-move)** | Claude Code सत्र, मेमोरी, कौशल और CLAUDE.md को DSH में स्थानांतरित करें | |
| **[dsh-dsh-click](https://github.com/PerryLink/dsh-dsh-click)** | DeepSeek Harness के लिए क्रॉस-प्लेटफ़ॉर्म नेटिव डेस्कटॉप नियंत्रण — Windows पहले। | |
| **[dsh-dsh-composer-history](https://github.com/PerryLink/dsh-dsh-composer-history)** | वेब कंपोज़र के लिए टर्मिनल-शैली इनपुट इतिहास: तीर, Ctrl+R खोज | |
| **[dsh-dsh-data-quality](https://github.com/PerryLink/dsh-dsh-data-quality)** | डेटासेट गुणवत्ता जाँच व उद्धरण सत्यापन (यहाँ उपभोग किया गया वैकल्पिक संख्या-सेतु) | |
| **[dsh-dsh-defend](https://github.com/PerryLink/dsh-dsh-defend)** | DeepSeek Harness के लिए प्रॉम्प्ट-इंजेक्शन, जेलब्रेक और सीक्रेट-लीक रक्षा। | |
| **[dsh-dsh-doublecheck](https://github.com/PerryLink/dsh-dsh-doublecheck)** | इंजीनियरिंग-अनुशासन रक्षक: आवश्यकताओं की पूछताछ, परीक्षण द्वार, प्रतिद्वंद्वी समीक्षा | |
| **[dsh-dsh-draw](https://github.com/PerryLink/dsh-dsh-draw)** | DeepSeek Harness के लिए एकीकृत स्थैतिक-छवि निर्माण रूटिंग। | |
| **[dsh-dsh-fast](https://github.com/PerryLink/dsh-dsh-fast)** | DeepSeek Harness के लिए रीड-ओनली प्रदर्शन डायग्नोस्टिक्स। | |
| **[dsh-dsh-fund-research](https://github.com/PerryLink/dsh-dsh-fund-research)** | चीनी सार्वजनिक म्यूचुअल फंड के लिए नियतात्मक अनुसंधान रिपोर्ट | |
| **[dsh-dsh-github](https://github.com/PerryLink/dsh-dsh-github)** | DSH के लिए GitHub PR/issues एकीकरण, हर लेखन अनुमोदन-द्वारित | |
| **[dsh-dsh-industry-research](https://github.com/PerryLink/dsh-dsh-industry-research)** | उद्योग-अनुसंधान ऑर्केस्ट्रेशन जो इस प्लगिन के `ctx.researchReport.assemble` से डिलीवरेबल सील करता है | |
| **[dsh-dsh-library](https://github.com/PerryLink/dsh-dsh-library)** | DeepSeek Harness के लिए स्थानीय दस्तावेज़ ज्ञानकोश। | |
| **[dsh-dsh-local-ai](https://github.com/PerryLink/dsh-dsh-local-ai)** | DeepSeek Harness के लिए स्थानीय-मॉडल (Ollama) एकीकरण। | |
| **[dsh-dsh-lsp-actions](https://github.com/PerryLink/dsh-dsh-lsp-actions)** | भाषा सर्वरों पर LSP निदान, फ़ॉर्मेटिंग, पूर्णता, कोड क्रियाएँ और नाम बदलना | |
| **[dsh-dsh-mask](https://github.com/PerryLink/dsh-dsh-mask)** | PII मास्किंग मिडलवेयर: मॉडल सीमा पर अनाम करें, डिस्प्ले लेयर पर पुनर्स्थापित करें | |
| **[dsh-dsh-mcp-panel](https://github.com/PerryLink/dsh-dsh-mcp-panel)** | केवल-पढ़ने वाला MCP रनटाइम पैनल: /mcp कमांड + स्थिति, टूल और त्रुटियों वाला Settings टैब | |
| **[dsh-dsh-memento](https://github.com/PerryLink/dsh-dsh-memento)** | अनुमोदन-द्वारित क्रॉस-सत्र मेमोरी: ctx.memory सीम + SQLite + मेमोरी टूल | |
| **[dsh-dsh-observe](https://github.com/PerryLink/dsh-dsh-observe)** | DeepSeek Harness के लिए OpenTelemetry और Langfuse अवलोकनीयता निर्यातक। | |
| **[dsh-dsh-output-styles](https://github.com/PerryLink/dsh-dsh-output-styles)** | Claude Code outputStyles-समतुल्य रनटाइम शैली बदलाव | |
| **[dsh-dsh-permission-rules](https://github.com/PerryLink/dsh-dsh-permission-rules)** | ऑडिट के साथ Claude Code-शैली घोषणात्मक allow/deny/ask अनुमति नियम | |
| **[dsh-dsh-plugin-guide](https://github.com/PerryLink/dsh-dsh-plugin-guide)** | माँग पर एजेंट कौशल के रूप में प्लगइन-विकास ज्ञान आधार | |
| **[dsh-dsh-score](https://github.com/PerryLink/dsh-dsh-score)** | DeepSeek Harness प्लगिनों की बहु-आयामी गुणवत्ता स्कोरिंग। | |
| **[dsh-dsh-session-pin](https://github.com/PerryLink/dsh-dsh-session-pin)** | टिकाऊ क्रम के साथ वेब साइडबार में सत्र पिन करें | |
| **[dsh-dsh-session-sync](https://github.com/PerryLink/dsh-dsh-session-sync)** | DeepSeek Harness के लिए क्रॉस-डिवाइस सत्र सिंक — आपके सत्र स्टोर का एक समर्पित git मिरर। | |
| **[dsh-dsh-skill-pack-security](https://github.com/PerryLink/dsh-dsh-skill-pack-security)** | सुरक्षा-ऑडिट कौशल पैक: गुप्त स्कैन, निर्भरता और आपूर्ति-श्रृंखला समीक्षा | |
| **[dsh-dsh-talk](https://github.com/PerryLink/dsh-dsh-talk)** | DeepSeek Harness के लिए आवाज़-प्रथम सत्र लूप: बोलें और उत्तर सुनें। | |
| **[dsh-dsh-test-drive](https://github.com/PerryLink/dsh-dsh-test-drive)** | DeepSeek Harness प्लगिनों के लिए पृथक इंस्टॉल-एंड-स्मोक टेस्ट ड्राइव। | |
| **[dsh-dsh-translate](https://github.com/PerryLink/dsh-dsh-translate)** | DeepSeek Harness के लिए वेंडर पैरामीटर अनुवाद और नियतात्मक JSON मरम्मत। | |

## License

Apache-2.0 — देखें [LICENSE](LICENSE)।
