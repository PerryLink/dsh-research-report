<div align="center">

# 📑 dsh-research-report

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

- DeepSeek Harness `0.1.0-rc.6` (peer डिपेंडेंसी `0.1.0-rc.6` पर पिन)।
- Node `^22.19.0 || >=24.0.0`, केवल ESM (`"type": "module"`)।
- Peer डिपेंडेंसी: `@deepseek-ai/cordis ^4.0.1`, `@deepseek-ai/schemastery ^3.18.0`, तथा `0.1.0-rc.6` के `@deepseek-ai/dsh-session`, `@deepseek-ai/dsh-tools`, `@deepseek-ai/dsh-system-prompt`, `@deepseek-ai/dsh-web`, `@deepseek-ai/dsh-jobs`।
- वैकल्पिक सहयोगी (कभी अनिवार्य नहीं): URL कैप्चर/गैदर के लिए `ctx.web` provider; बैकग्राउंड असेंबली के लिए `ctx.jobs`; डेटासेट उद्धरण जाँच के लिए `ctx.dataQuality` (dsh-data-quality)।

## What you get

- **साक्ष्य बही-खाता (evidence ledger)** — कंटेंट-एड्रेस्ड स्नैपशॉट स्टोर (`<ledgerRoot>/objects/<sha256>` + JSONL जर्नल)। एक ही कंटेंट ठीक एक बार सहेजा जाता है; स्नैपशॉट अपरिवर्तनीय हैं; हर रीड पर हैश दोबारा गिना जाता है — छेड़छाड़ या विलोपन "भरोसा" नहीं, "पकड़ा" जाता है।
- **claim ↔ साक्ष्य बाइंडिंग** — claim अपने आधार-साक्ष्यों की id के साथ पंजीकृत होते हैं; बही-खाता बाइंडिंग और हर सत्यापन निर्णय सहेजता है (नवीनतम मान्य)।
- **बाइट-स्तरीय जाँच** — claim के हर अंक और हर उद्धृत खंड को बंधे स्नैपशॉट में शाब्दिक रूप से मिलना चाहिए। उद्धरण न मिले तो claim `unverified`; लेबल के सामने स्नैपशॉट में दूसरा मान हो (और उद्धृत मान अनुपस्थित हो) तो `contradicted`। कोई सिमैंटिक्स नहीं, कोई एम्बेडिंग नहीं — केवल ऑडिट-योग्य बाइट जाँच।
- **वैकल्पिक संख्या-सेतु** — जब claim किसी संरचित workspace डेटासेट (CSV/JSON) को उद्धृत करता है और `dsh-data-quality` माउंट है, तो उद्धरण उसके फ्रोज़न `verifyCitations` अनुबंध से सहिष्णुता-सहित जाँचे जाते हैं।
- **संस्करणित सील्ड रिपोर्ट** — `<reportRoot>/<slug(topic)>/<YYYYMMDD-HHmmss>/report.md` + `manifest.json`; सील हैश = manifest का SHA-256, और manifest में रिपोर्ट हैश व सभी साक्ष्य हैश होते हैं।
- **ईमानदार खाली-जगहें** — unverified/contradicted claim रिपोर्ट के मुख्य भाग में दृश्य चिह्न `[未核实]` / `[与证据矛盾]` रखते हैं और परिशिष्ट A में सूचीबद्ध होते हैं। कुछ भी चुपचाप पारित नहीं होता।
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
- **अनुकूली सत्र-इवेंट** — प्लगिन टाइप किए गए `research-report/evidence`, `research-report/verify`, `research-report/seal` सत्र-इवेंट घोषित करता है, पर rc.6 का `Session.append` में `ignorable` मार्कर नहीं और न ही प्लगिन इवेंट-पंजीकरण सतह है; अतः append तभी सक्रिय होते हैं जब होस्ट बिल्ड उन प्रकारों को जानता हो (वरना persistence परत रिस्टोर पर लॉग अस्वीकार कर देगी)। बही-खाता जर्नल ही सदैव टिकाऊ सत्य का स्रोत है।
- **डिफ़ॉल्ट profile में fetch provider नहीं** — shipped `dsh-base` केवल search माउंट करता है, इसलिए fetch provider कॉन्फ़िगर होने तक URL कैप्चर ठोंककर विफल होता है (`WEB_UNAVAILABLE`/`WEB_PROVIDER_UNAVAILABLE`); search-आधारित `gather` अकैप्चर स्रोतों को गैप-सूची में डालता है।
- **एकल-workspace दायरा** — बही-खाता व रिपोर्ट रूट माउंट पर harness वर्किंग डायरेक्टरी के सापेक्ष resolve होते हैं; बहु-workspace डिप्लॉयमेंट को प्रति-profile निरपेक्ष रूट कॉन्फ़िगर करने चाहिए।

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

- `typecheck` इंस्टॉल किए गए 0.1.0-rc.6 peers से `@deepseek-ai/*` resolve करता है; `typecheck:ci` प्रकाशित टाइप्स के विरुद्ध `skipLibCheck` बंद और `verbatimModuleSyntax` चालू करता है। दोनों हरे रहने चाहिए।
- टेस्ट 0.1.0-rc.6 peers के वास्तविक `Context`/`Session`/`ToolRuntime`/`LocalJobRegistry`/`WebRuntime` उपयोग करते हैं; केवल नेटवर्क बैकएंड वास्तविक `ctx.web` रजिस्ट्री में पंजीकृत scripted providers हैं।
- रिलीज़: `node scripts/release.mjs <x.y.z>` (वर्ज़न बम्प, CHANGELOG स्टैम्प, गेट पुनःचालन, कमिट + टैग; कभी push नहीं)।

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `cordis`, `research`, `evidence-ledger`, `verifiable-report`, `audit`, `citation-verification`

## Contributors

`dsh-research-report` contributors.

## PerryLink DSH Plugin Family

यह प्रोजेक्ट [PerryLink](https://github.com/PerryLink) द्वारा रखरखित DeepSeek Harness प्लगिनों में से एक है। यह काम आया तो अन्य भी मदद करेंगे:

| Plugin | One-liner |
|---|---|
| [dsh-data-quality](https://github.com/PerryLink/dsh-data-quality) | डेटासेट गुणवत्ता जाँच व उद्धरण सत्यापन (यहाँ उपभोग किया गया वैकल्पिक संख्या-सेतु) |
| [dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck) | इंजीनियरिंग-अनुशासन गार्ड: आवश्यकता प्रश्नोत्तर, टेस्ट गेट, प्रतिवादी समीक्षा |
| [dsh-fast](https://github.com/PerryLink/dsh-fast) | DeepSeek Harness के लिए रीड-ओनली प्रदर्शन डायग्नोस्टिक्स। |
| [dsh-industry-research](https://github.com/PerryLink/dsh-industry-research) | उद्योग-अनुसंधान ऑर्केस्ट्रेशन जो इस प्लगिन के `ctx.researchReport.assemble` से डिलीवरेबल सील करता है |
| [dsh-memento](https://github.com/PerryLink/dsh-memento) | अप्रूवल-गेटेड क्रॉस-सेशन मेमोरी: ctx.memory seam + SQLite + memory टूल |
| [dsh-score](https://github.com/PerryLink/dsh-score) | DeepSeek Harness प्लगिनों की बहु-आयामी गुणवत्ता स्कोरिंग। |
| [dsh-test-drive](https://github.com/PerryLink/dsh-test-drive) | DeepSeek Harness प्लगिनों के लिए पृथक इंस्टॉल-एंड-स्मोक टेस्ट ड्राइव। |

## License

Apache-2.0 — देखें [LICENSE](LICENSE)।
