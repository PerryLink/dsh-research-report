<div align="center">

# 📑 dsh-research-report
- **1024 स्टोर चैनल**: एक बार `npm i -g dsh1024`, फिर `dsh1024 plugin --profile web add dsh-research-report` ([deepseek1024.com](https://deepseek1024.com) इंस्टॉल रैंकिंग में गिना जाता है)।

**DeepSeek Harness के लिए सत्यापन-योग्य (verifiable) रिसर्च-रिपोर्ट इंजन।**

*हर claim अपरिवर्तनीय साक्ष्य-स्नैपशॉट से बंधता है, बाइट-दर-बाइट जाँचा जाता है, और एक संस्करणित (versioned) रिपोर्ट में सील होता है — जिसका manifest हैश कोई भी दोबारा गिनकर सत्यापित कर सकता है।*

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
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-research-report?metric=downloads&lang=hi)](https://dshfind.com/hi/plugins/PerryLink/dsh-research-report?ref=badge)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

```sh
dsh plugin --profile <name> add dsh-research-report
```


</div>

---


**📖 इकोसिस्टम नॉलेज बेस** — मापे गए आँकड़े, मार्केटिंग नहीं: [डेवलपमेंट गाइड · चयन डेटा · रखरखाव मानदंड](https://perrylink.github.io/dsh-plugin-guide/)।

<!-- star-cta -->
## Install & uninstall

```sh
dsh plugin --profile demo add dsh-research-report       # इंस्टॉल
dsh plugin --profile demo remove dsh-research-report    # अनइंस्टॉल
```

पंक्ति माउंट हुई या नहीं, जाँचें: `dsh --profile demo --dump-config | grep dsh-research-report`।

## ⭐ 如果它帮到了你

यह प्लगइन [DSH प्लगइन परिवार](https://github.com/PerryLink) का हिस्सा है (40+ प्लगइन, सभी Apache-2.0)। अगर यह उपयोगी लगे, तो **एक स्टार दें** — इससे कोई सुविधा अनलॉक नहीं होती, पर अगला व्यक्ति इसे खोज में आसानी से पा लेता है।

*English:* part of a 40+ plugin family for DeepSeek Harness. If it is useful, **a star helps the next person find it** — nothing is gated behind it.

## What is dsh-research-report?

DeepSeek Harness के लिए सत्यापन-योग्य (verifiable) रिसर्च-रिपोर्ट इंजन।

हर claim अपरिवर्तनीय साक्ष्य-स्नैपशॉट से बंधता है, बाइट-दर-बाइट जाँचा जाता है, और एक संस्करणित (versioned) रिपोर्ट में सील होता है — जिसका manifest हैश कोई भी दोबारा गिनकर सत्यापित कर सकता है।

![dsh-research-report का टर्मिनल डेमो: dsh-research-report — evidence ledger, claims, and the seal](https://raw.githubusercontent.com/PerryLink/dsh-research-report/main/docs/assets/dsh-research-report-hero.png)

![Animated terminal demo of dsh-research-report](https://raw.githubusercontent.com/PerryLink/dsh-research-report/main/docs/assets/dsh-research-report-demo.gif)

*वही रन, एनिमेटेड।*

## Compatibility

- DeepSeek Harness `dsh-v0.2.1-alpha.1` (2026-09-25 को सत्यापित)। npm dev/test लाइन `0.1.7-rc.2`; peers `>=0.1.6-0 <0.2.0 || >=0.1.7-0 <0.2.0`। compat मैट्रिक्स चारों घोषित peer लाइनों को पिन करता है। इस लाइन पर `Session.append` का तीसरा पैरामीटर केवल सरफ़ेस प्रकारों के लिए `SurfaceIntent` है, इसलिए `research-report/*` इवेंट अब भी सत्र लॉग में दर्ज नहीं होते: लेजर जर्नल ही टिकाऊ स्रोत हैं और ऑडिट मिरर तभी सक्रिय होता है जब होस्ट शब्दावली जानता हो (`test/events-gate.spec.ts` का रिग्रेशन लॉक इसे पिन करता है)।
0.1.5-alpha.1 (2026-09-09 को अनुकूलित): सत्र लिफ़ाफ़ा अपना ignorable फ़ील्ड केवल संग्रहीत-लॉग पठन संगतता के लिए रखता है - Session.append अभी भी इसे स्टैम्प नहीं कर सकता, इसलिए गेट व्यवहार अपरिवर्तित है। 2026-09-11 को प्रकाशित 0.1.5-rc.2 टाइप्स के विरुद्ध सत्यापित (पूर्ण स्थानीय गेट-शृंखला); compat workflow दोनों घोषित peer लाइनों को पिन करता है।
- Node `^22.19.0 || >=24.0.0`, केवल ESM (`"type": "module"`)।
- Peer डिपेंडेंसी: `@deepseek-ai/cordis ^4.0.2`, `@deepseek-ai/schemastery ^3.18.2`, तथा `>=0.1.6-0 <0.2.0 || >=0.1.7-0 <0.2.0` के `@deepseek-ai/dsh-session`, `@deepseek-ai/dsh-tools`, `@deepseek-ai/dsh-system-prompt`, `@deepseek-ai/dsh-web`, `@deepseek-ai/dsh-jobs`।
- वैकल्पिक सहयोगी (कभी अनिवार्य नहीं): URL कैप्चर/गैदर के लिए `ctx.web` provider; बैकग्राउंड असेंबली के लिए `ctx.jobs`; डेटासेट उद्धरण जाँच के लिए `ctx.dataQuality` (dsh-data-quality)।

## What you get

- **साक्ष्य बही-खाता (evidence ledger)** — कंटेंट-एड्रेस्ड स्नैपशॉट स्टोर (`<ledgerRoot>/objects/<sha256>` + JSONL जर्नल)। एक ही कंटेंट ठीक एक बार सहेजा जाता है; स्नैपशॉट अपरिवर्तनीय हैं; हर रीड पर हैश दोबारा गिना जाता है — छेड़छाड़ या विलोपन "भरोसा" नहीं, "पकड़ा" जाता है।
- **claim ↔ साक्ष्य बाइंडिंग** — claim अपने आधार-साक्ष्यों की id के साथ पंजीकृत होते हैं; बही-खाता बाइंडिंग और हर सत्यापन निर्णय सहेजता है (नवीनतम मान्य)।
- **बाइट-स्तरीय जाँच** — claim के हर अंक और हर उद्धृत खंड को बंधे स्नैपशॉट में शाब्दिक रूप से मिलना चाहिए। बंधा साक्ष्य न हो, या जाँच-योग्य अक्षर न हो, तो claim `unverified`; बंधा साक्ष्य उद्धृत अक्षरों की पुष्टि या खंडन न कर सके तो `insufficient`; लेबल के सामने स्नैपशॉट में दूसरा मान हो (और उद्धृत मान अनुपस्थित हो) तो `disproven`; छेड़छाड़/लापता स्नैपशॉट हो तो `contradicted`। कोई सिमैंटिक्स नहीं, कोई एम्बेडिंग नहीं — केवल ऑडिट-योग्य बाइट जाँच।
- **वैकल्पिक संख्या-सेतु** — जब claim किसी संरचित workspace डेटासेट (CSV/JSON) को उद्धृत करता है और `dsh-data-quality` माउंट है, तो उद्धरण उसके फ्रोज़न `verifyCitations` अनुबंध से सहिष्णुता-सहित जाँचे जाते हैं; डेटासेट विसंगति claim को मिथ्या (disprove) कर देती है।
- **DOI साक्ष्य (शून्य नेटवर्क)** — DOI स्रोत नियतात्मक रूप से जाँचे जाते हैं (`10.xxxx/xxxx` संरचना, उपसर्ग श्वेतसूची और DOI वर्ण-समुच्चय); अमान्य DOI ठोंककर असफल होते हैं। वैकल्पिक जर्नल/वर्ष मेटाडेटा स्वीकारा जाता है, और `requireJournalMetadata` केवल सक्रिय होने पर शैक्षणिक DOI साक्ष्य को प्रतिबंधित करता है।
- **संस्करणित सील्ड रिपोर्ट** — `<reportRoot>/<slug(topic)>/<YYYYMMDD-HHmmss>/report.md` + `manifest.json` + `verification.jsonl` + `disconfirmation.jsonl`; सील हैश = manifest का SHA-256, और manifest में रिपोर्ट हैश, सभी साक्ष्य हैश व हर ऑडिट जर्नल का हैश होता है।
- **डिलीवरी-पूर्व पुनः ऑडिट व सील अवरोध** — सील करने से पहले हर बंधा claim ऑफ़लाइन पुनः जाँचा जाता है और `verification.jsonl` में दर्ज होता है; verdict drift, छेड़छाड़/लापता बंधा साक्ष्य, या जर्नल सीरियलाइज़ेशन विफलता सील को रोक देती है (ठोंककर असफल, कोई tunable नहीं)।
- **मिथ्याकरण बही-खाता** — हर contradicted या disproven claim `disconfirmation.jsonl` में (claim + साक्ष्य संदर्भ + कारण) दर्ज होता है और रिपोर्ट के `मिथ्याकरण अभिलेख` परिशिष्ट में सूचीबद्ध होता है।
- **नकारात्मक ज्ञान** — एक disproven claim अपने कंटेंट हैश से याद रखा जाता है (`disproofs.jsonl`); अपरिवर्तित साक्ष्य के विरुद्ध पुनः रिपोर्ट किया गया वही पाठ वापस `disproven` में बलपूर्वक डाला जाता है और साक्ष्य बदलने पर ही पुनः जाँचा जाता है।
- **रीड-ओनली verifier लूप** — सील करने के बाद नियतात्मक फॉलबैक `verifySealedReport` (शून्य नेटवर्क, शून्य मॉडल) सील व ऑडिट हैश दोबारा गिनता है और हर claim की पुनः जाँच करता है, `verifier-note.md` में मशीन-चेक भाग लिखता है; `ctx.jobs` माउंट होने पर एक रीड-ओनली verifier job भी चालू होता है (मॉडल समीक्षा वृद्धि है, प्रतिस्थापन नहीं)।
- **सत्र-आधारित साक्ष्य** — `evidence_add` वैकल्पिक `sessionRef` (`sessionId` + `eventRange`, ठोंककर सत्यापित) स्वीकारता है; एंकर सहेजा जाता है और परिशिष्ट B, manifest व `verification.jsonl` में दर्ज होता है। सत्र-आधारित साक्ष्य ईमानदारी से `unverified` होता है (`सत्र-आधारित साक्ष्य के लिए सत्र लॉग की मैन्युअल जाँच आवश्यक है`)।
- **ईमानदार खाली-जगहें** — unverified/insufficient/contradicted/disproven claim रिपोर्ट के मुख्य भाग में दृश्य चिह्न `[未核实]` / `[证据不足]` / `[与证据矛盾]` / `[已证伪]` रखते हैं और परिशिष्ट A में सूचीबद्ध होते हैं। कुछ भी चुपचाप पारित नहीं होता।
- **कोई deep-research लूप नहीं** — रिट्रीवल ऑर्केस्ट्रेशन जानबूझकर पुनः उपयोगित है: खोज/फेच `ctx.web`, लंबे कार्य `ctx.jobs`। योजना और संश्लेषण मॉडल (या अपस्ट्रीम प्लगिन) के पास रहते हैं।

## Quick start

```sh
dsh plugin --profile web add github:PerryLink/dsh-research-report
```

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
- **अनुकूली सत्र-इवेंट** — प्लगिन टाइप किए गए `research-report/evidence`, `research-report/verify`, `research-report/seal` सत्र-इवेंट घोषित करता है, पर 0.1.5-alpha.1 के `Session.append` में `ignorable` विकल्प नहीं और न ही प्लगिन इवेंट-पंजीकरण सतह है; अतः append तभी सक्रिय होते हैं जब होस्ट बिल्ड उन प्रकारों को जानता हो (वरना persistence परत रिस्टोर पर लॉग अस्वीकार कर देगी)। बही-खाता जर्नल ही सदैव टिकाऊ सत्य का स्रोत है।
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

- `typecheck` इंस्टॉल किए गए 0.1.7-rc.2 peers से `@deepseek-ai/*` resolve करता है; `typecheck:ci` प्रकाशित टाइप्स के विरुद्ध `skipLibCheck` बंद और `verbatimModuleSyntax` चालू करता है। दोनों हरे रहने चाहिए।
- टेस्ट 0.1.7-rc.2 peers के वास्तविक `Context`/`Session`/`ToolRuntime`/`LocalJobRegistry`/`WebRuntime` उपयोग करते हैं; केवल नेटवर्क बैकएंड वास्तविक `ctx.web` रजिस्ट्री में पंजीकृत scripted providers हैं।
- रिलीज़: `node scripts/release.mjs <x.y.z>` (वर्ज़न बम्प, CHANGELOG स्टैम्प, गेट पुनःचालन, कमिट + टैग; कभी push नहीं)।

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `cordis`, `research`, `evidence-ledger`, `verifiable-report`, `audit`, `citation-verification`

## Contributors

- [PerryLink](https://github.com/PerryLink) — मूल लेखक और अनुरक्षक: प्लगइन आर्किटेक्चर, साक्ष्य लेजर, बाइट-स्तरीय सत्यापन, सीलबंद रिपोर्ट, पाँच-भाषा दस्तावेज़, CI और रिलीज़ स्वचालन।

## PerryLink DSH Plugin Family

यह प्रोजेक्ट [PerryLink](https://github.com/PerryLink) के **87 सक्रिय रूप से अनुरक्षित** DeepSeek Harness प्लगइन में से एक है। पूरा परिवार **95** प्लगइन है — **5 फ़्रोज़न**, **3 सेवानिवृत्त** — और नीचे संक्षिप्त रखा गया है ताकि हर README की पहली स्क्रीन छोटी रहे। हर पंक्ति देखने के लिए इसे खोलें; कारण स्थिति कॉलम में है।

<details>
<summary>सभी 95 प्लगइन खोलें</summary>

| प्लगइन | एक पंक्ति | स्थिति |
|---|---|---|
| **[dsh-aqua-input-check](https://github.com/PerryLink/dsh-aqua-input-check)** | 水产养殖投入品记录核对（按投入品用量、休药期与起捕间隔核对记录自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-archive-check](https://github.com/PerryLink/dsh-archive-check)** | 档案归档完整性与保管期限核对（依据《档案法》及配套规定，仅提示差异，不作出定性结论） |  |
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** | Second-model auto-review on the approval chain, fail-closed by default |  |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** | Automatic strong/cheap model-tier routing with deterministic risk guards and a `/tier` command |  |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | Durable background child agents with a Web UI sidebar, messaging and interrupt | 🚫 सेवानिवृत्त — रिपॉज़िटरी README देखें |
| **[dsh-bid-ca-precheck](https://github.com/PerryLink/dsh-bid-ca-precheck)** | 投标文件符合性预检（按招标文件逐条核对响应情况，仅提示差异，不作出定性结论） |  |
| **[dsh-bid-qual-check](https://github.com/PerryLink/dsh-bid-qual-check)** | 投标人资格条件核对（按资格条件与证明材料核对逐条响应，仅提示差异，不作出定性结论） |  |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | Cost governance for DeepSeek Harness: budgets, carbon, and latency in one panel. | 🧊 फ़्रोज़न — रिपॉज़िटरी README देखें |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** | Read-only MCP server exposing the certification registry: grades, snapshots and five-dimension evidence |  |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** | Claude Code /rewind-equivalent: snapshots, session forks, one-shot restore |  |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | Migrate Claude Code sessions, memory, skills and CLAUDE.md into DSH | 🧊 फ़्रोज़न — रिपॉज़िटरी README देखें |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** | Cross-platform native desktop control for DeepSeek Harness — Windows first. |  |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** | Terminal-style input history for the web composer: arrows, Ctrl+R search |  |
| **[dsh-contract-stance](https://github.com/PerryLink/dsh-contract-stance)** | 合同条款立场台账核对（按立场、风险等级与退让底线核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-customs-doc-check](https://github.com/PerryLink/dsh-customs-doc-check)** | 报关单证一致性核对（按公开的报关单填制规范核对单证间字段一致性，仅提示差异，不作出定性结论） |  |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** | Dataset quality checks and citation cross-checks (the optional numeric bridge consumed here) |  |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | Prompt-injection, jailbreak, and secret-leak defense for DeepSeek Harness. | 🧊 फ़्रोज़न — रिपॉज़िटरी README देखें |
| **[dsh-demurrage-ledger](https://github.com/PerryLink/dsh-demurrage-ledger)** | 滞箱费台账核对（按免箱期与费率核对超期天数与金额的自洽性，仅提示差异，不作出定性结论） |  |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** | Engineering-discipline guard: requirements grill, test gates, adversary review |  |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | Unified static-image generation routing for DeepSeek Harness. | 🧊 फ़्रोज़न — रिपॉज़िटरी README देखें |
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
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | Multi-channel approval/question bridge: WeChat/Telegram/Feishu, session console | 🧊 फ़्रोज़न — रिपॉज़िटरी README देखें |
| **[dsh-repair-order-qc](https://github.com/PerryLink/dsh-repair-order-qc)** | 维修工单结算核对（按项目金额、配件工时合计与结算总额核对算术自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** | Verifiable research-report engine: content-addressed evidence ledger and sealed versions |  |
| **[dsh-review-reply-check](https://github.com/PerryLink/dsh-review-reply-check)** | 审稿意见逐条回应覆盖核对（按意见与回应一一对应核对覆盖完整性，仅提示差异，不作出定性结论） |  |
| **[dsh-rulefile-check](https://github.com/PerryLink/dsh-rulefile-check)** | 规则库文件自检核对（按条款引用纪律与效力上限核对规则库自身合规，仅提示差异，不作出定性结论） |  |
| **[dsh-safety-brief-check](https://github.com/PerryLink/dsh-safety-brief-check)** | 安全技术交底记录要素齐备性与签字闭环核对（依据公开的安全生产法规与检查标准，仅提示差异，不作出定性结论） |  |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** | Multi-dimensional quality scoring for DeepSeek Harness plugins. |  |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | Pin sessions in the Web sidebar with durable ordering | 🚫 सेवानिवृत्त — रिपॉज़िटरी README देखें |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** | Cross-device session sync for DeepSeek Harness — a dedicated git mirror of your session store. |  |
| **[dsh-site-log-check](https://github.com/PerryLink/dsh-site-log-check)** | 监理日志跨日连续性与旁站覆盖提示（依据 GB/T 50319-2013 等公开文件，仅提示差异，不作出定性结论） |  |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** | Security-audit skill pack: secret scan, dependency and supply-chain review |  |
| **[dsh-soe-decision-check](https://github.com/PerryLink/dsh-soe-decision-check)** | 三重一大决策台账核对（按前置研究、会议审议与决议记录核对程序留痕，仅提示差异，不作出定性结论） |  |
| **[dsh-soilwater-check](https://github.com/PerryLink/dsh-soilwater-check)** | 土壤与地下水监测台账核对（按点位、监测项目、限值与超标判定核对台账自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-sop-sync-check](https://github.com/PerryLink/dsh-sop-sync-check)** | 作业规程与 FMEA／控制计划一致性核对（按编号与版本核对三份文件是否同步，仅提示差异，不作出定性结论） |  |
| **[dsh-spc-gbt-adapter](https://github.com/PerryLink/dsh-spc-gbt-adapter)** | 控制图常数与过程能力指数核对（按 GB/T 4091 的常规控制图常数表核对控制限与 Cp/Cpk 的自洽性，仅提示差异，不作出定性结论） |  |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** | Voice-first session loop for DeepSeek Harness: talk to it, hear it answer. |  |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | Cross-session team rooms: shared message bus, task board and timeline | 🚫 सेवानिवृत्त — रिपॉज़िटरी README देखें |
| **[dsh-tender-extract](https://github.com/PerryLink/dsh-tender-extract)** | 招标文件条款摘录核对（按出处与原文逐字核对摘录完整性，仅提示差异，不作出定性结论） |  |
| **[dsh-tender-matrix](https://github.com/PerryLink/dsh-tender-matrix)** | 评标因素评分矩阵核对（按分值上限与合计核对矩阵自洽，仅提示差异，不作出定性结论） |  |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** | Isolated install-and-smoke test drives for DeepSeek Harness plugins. |  |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** | TickTick/Dida365 task bridge: session-header panel + 11 tools |  |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** | Vendor parameter translation and deterministic JSON repair for DeepSeek Harness. |  |
| **[dsh-warranty-calc](https://github.com/PerryLink/dsh-warranty-calc)** | 质保期与索赔金额核对（按质保期月数与里程、索赔金额算式核对自洽，仅提示差异，不作出定性结论） |  |

</details>

</details>

</details>## License

Apache-2.0 — देखें [LICENSE](LICENSE)।

### DSH Desktop मार्केट से इंस्टॉल करें

सभी PerryLink प्लगइन DSH Desktop के बिल्ट-इन मार्केट में देखे जा सकते हैं: **Market → Sources → add source → पेस्ट करें** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ चुनें**। इंस्टॉलेशन मार्केट के npm-identity सत्यापन और आपकी पुष्टि से ही होता है।
