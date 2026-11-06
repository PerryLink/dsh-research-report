#!/usr/bin/env python3
"""Generate the README visuals for dsh-research-report (docs/assets/).

Outputs (idempotent overwrite):
  dsh-research-report-hero-{zh,en}-{light,dark}.webp   1440x576 raster (Pillow)
  dsh-research-report-flow-v5-{light,dark}.svg         1100x660 hand-written SVG

Design notes
------------
* Hero -- the left column is prose (kicker / title / two value lines / one
  subtitle / one meta line / footer).  The right column is this repository's
  own figure: the sealed report directory as a HASH FAN-IN.  Four inputs
  (report.md, the evidence snapshots' hashes, verification.jsonl,
  disconfirmation.jsonl) bracket into one manifest plate, and the seal is the
  SHA-256 of that plate's exact bytes; the strip underneath is the standalone
  verifier recomputing it from the directory.  Nothing here is invented: the
  four files, the manifest contents (report hash, evidence hashes, claim /
  verdict arrays, journal hashes) and `seal = sha256(manifest.json)` are the
  contract in src/assemble.ts + src/provider-local.ts, and the CLI flags are
  src/cli.ts.

* Flow -- grammar: a THREE-PANEL AUDIT BOARD plus an out-of-boundary auditor
  rail.  Not a row of five boxes, and not an arrow chain: the three panels are
  the three real durable surfaces, and the middle one is a decision comb.
    Panel 1 (EVIDENCE LEDGER): capture -> sha256(content) -> objects/<sha256>
      (immutable, deduped by content, re-hashed on every read) -> the four
      append-only journals index / claims / verdicts / disproofs.
    Panel 2 (VERDICT ENGINE): one claim enters with its bound snapshot bytes
      and drops through five first-match prongs, each a real branch of
      verifyClaimText() / the provider's integrity gate, leaving as exactly one
      of the five verdict words; verdicts and disproofs are written back to
      the left panel.
    Panel 3 (SEALED REPORT): three artifacts bracket into manifest.json, whose
      SHA-256 is the seal -- the stamp at the bottom of the panel.
    Rail: the standalone `dsh-research-verify` binary sits outside the
      workspace boundary (zero @deepseek-ai imports) and recomputes the seal,
    the report hash, the journal hashes and every claim verdict.
  All SVG text is command-surface tokens and short English labels, so the one
  light/dark pair serves all five README languages.

Run once:  python scripts/gen-readme-assets.py
Requires:  Python 3.10+ with Pillow; Windows fonts msyh.ttc / msyhbd.ttc /
           consola.ttf (consolab.ttf is used for mono bold when present).
"""
from __future__ import annotations

import os
from html import escape

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "assets")
NAME = "dsh-research-report"

FONT_FILES = {
    "cjk": r"C:\Windows\Fonts\msyh.ttc",
    "cjk_bold": r"C:\Windows\Fonts\msyhbd.ttc",
    "mono": r"C:\Windows\Fonts\consola.ttf",
    "mono_bold": (r"C:\Windows\Fonts\consolab.ttf"
                  if os.path.exists(r"C:\Windows\Fonts\consolab.ttf")
                  else r"C:\Windows\Fonts\consola.ttf"),
}
for _kind, _path in FONT_FILES.items():
    if not os.path.exists(_path):
        raise SystemExit(f"FATAL: font missing: {_path}")

FONT_CSS_SANS = ("'Microsoft YaHei','Segoe UI','PingFang SC',"
                 "'Noto Sans CJK SC',sans-serif")
FONT_CSS_MONO = "'Consolas','Microsoft YaHei',ui-monospace,monospace"

WARNINGS: list[str] = []
os.makedirs(OUT, exist_ok=True)

# --- palette: PerryLink family accent + the required light/dark grounds -----
SKIN = {
    "light": dict(
        bg_from="#f9f6fd", bg_to="#e4eaf8",
        card="#ffffff", edge="#e6e2ef", rowbg="#ffffff",
        band="#f5f2fb", pill="#ece7f9",
        text="#141419", sub="#4d5261", faint="#8f94a4",
        accent="#4B67B4", ok="#15803d", warn="#b45309",
        bad="#b91c1c", bad2="#9a3412",
        ok_bg="#e8f5ec", warn_bg="#fbf1e4", bad_bg="#fbeaea",
        neutral_bg="#eeeaf5", bus="#c3bde3", grid="#e7e4f0",
        shadow=(43, 35, 80), shadow_alpha=46, glow=30,
    ),
    "dark": dict(
        bg_from="#131a2a", bg_to="#0c1016",
        card="#1b2231", edge="#2e374b", rowbg="#212a3b",
        band="#202839", pill="#242d42",
        text="#f0f3f9", sub="#a8b1c4", faint="#737b8d",
        accent="#8496f5", ok="#3fb950", warn="#d9a441",
        bad="#f87171", bad2="#fb923c",
        ok_bg="#1b2b22", warn_bg="#2f2718", bad_bg="#33201f",
        neutral_bg="#242b3a", bus="#3a4560", grid="#2b3348",
        shadow=(0, 0, 0), shadow_alpha=150, glow=42,
    ),
}

FLOW = {
    "light": dict(
        bg_from="#f9f6fd", bg_to="#e4eaf8",
        panel="#ffffff", card="#ffffff", edge="#e6e2ef",
        band="#f5f2fb", pill="#ece7f9",
        text="#141419", sub="#4d5261", faint="#8f94a4",
        accent="#4B67B4", ok="#15803d", warn="#b45309",
        bad="#b91c1c", bad2="#9a3412",
        ok_bg="#e8f5ec", warn_bg="#fbf1e4", bad_bg="#fbeeea",
        neutral_bg="#eeeaf5", rule="#e7e4f0", bus="#c3bde3",
        shadow="#2b2440", shadow_op="0.13", dot="#cfc8e2",
    ),
    "dark": dict(
        bg_from="#131a2a", bg_to="#0c1016",
        panel="#1b2231", card="#1b2231", edge="#2e374b",
        band="#202839", pill="#242d42",
        text="#f0f3f9", sub="#a8b1c4", faint="#737b8d",
        accent="#8496f5", ok="#3fb950", warn="#d9a441",
        bad="#f87171", bad2="#fb923c",
        ok_bg="#1b2b22", warn_bg="#2f2718", bad_bg="#352322",
        neutral_bg="#242b3a", rule="#2b3348", bus="#3a4560",
        shadow="#000000", shadow_op="0.55", dot="#2a3346",
    ),
}

# ---------------------------------------------------------------------------
# fonts + measuring
# ---------------------------------------------------------------------------
_font_cache: dict[tuple[str, int], ImageFont.FreeTypeFont] = {}
_MEASURE = ImageDraw.Draw(Image.new("RGB", (8, 8)))


def font(size: float, kind: str = "cjk") -> ImageFont.FreeTypeFont:
    key = (kind, max(8, int(round(size))))
    if key not in _font_cache:
        _font_cache[key] = ImageFont.truetype(FONT_FILES[kind], key[1])
    return _font_cache[key]


def measure(text: str, size: float, kind: str = "cjk") -> float:
    return _MEASURE.textlength(text, font=font(size, kind))


def require_w(text: str, size: float, kind: str, max_w: float,
              what: str) -> None:
    got = measure(text, size, kind)
    if got > max_w + 0.6:
        raise SystemExit(f"FATAL: {what} overflows: {text!r} needs "
                         f"{got:.1f}px > {max_w:.0f}px")


def fit(text: str, kind: str, max_w: float, start: float,
        minimum: float) -> float:
    size = float(start)
    while size > minimum:
        if measure(text, size, kind) <= max_w:
            return size
        size -= 1
    got = measure(text, minimum, kind)
    if got > max_w + 0.6:
        raise SystemExit(f"FATAL: text does not fit {max_w:.0f}px at >= "
                         f"{minimum:.0f}px ({got:.1f}px): {text!r}")
    return minimum


def fit_lines(lines, kind: str, max_w: float, start: float,
              minimum: float) -> float:
    return min(fit(line, kind, max_w, start, minimum) for line in lines)


def hx(color: str) -> tuple[int, int, int]:
    color = color.lstrip("#")
    return tuple(int(color[i:i + 2], 16) for i in (0, 2, 4))


def has_cjk(text: str) -> bool:
    return any("\u3400" <= ch <= "\u9fff" for ch in text)


def kind_auto(text: str, bold: bool = False) -> str:
    """Consolas has no CJK glyphs: never set a Chinese string in mono."""
    base = "cjk" if has_cjk(text) else "mono"
    return base + ("_bold" if bold else "")


# ---------------------------------------------------------------------------
# raster primitives
# ---------------------------------------------------------------------------
def gradient(w: int, h: int, top: str, bottom: str) -> Image.Image:
    base = Image.new("RGB", (w, h))
    draw = ImageDraw.Draw(base)
    a, b = hx(top), hx(bottom)
    for y in range(h):
        t = 0.16 * (y / h) + 0.84 * (y / h) ** 1.4
        draw.line([(0, y), (w, y)],
                  fill=tuple(int(p + (q - p) * t) for p, q in zip(a, b)))
    return base


def glow(img: Image.Image, cx: int, cy: int, r: int, color: str,
         alpha: int) -> Image.Image:
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    rgb = hx(color)
    for i in range(10, 0, -1):
        rr = r * i / 10
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr],
                  fill=rgb + (int(alpha * (1 - i / 11)),))
    return Image.alpha_composite(
        img.convert("RGBA"), layer.filter(ImageFilter.GaussianBlur(28))
    ).convert("RGB")


def card(img: Image.Image, box: tuple[int, int, int, int], s: dict,
         radius: int = 22, shadow: int = 24, fill: str | None = None,
         edge: str | None = None, width: int = 2) -> Image.Image:
    x0, y0, x1, y1 = box
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle([x0 + 2, y0 + max(5, shadow // 2), x1 + 2,
                         y1 + max(6, shadow // 2)],
                        radius=radius, fill=s["shadow"] + (s["shadow_alpha"],))
    base = Image.alpha_composite(
        img.convert("RGBA"), layer.filter(ImageFilter.GaussianBlur(shadow / 2)))
    d = ImageDraw.Draw(base)
    d.rounded_rectangle(box, radius=radius, fill=hx(fill or s["card"]),
                        outline=hx(edge or s["edge"]), width=width)
    return base.convert("RGB")


def write(img: Image.Image, xy: tuple[float, float], text: str, s: dict,
          size: float, kind: str = "cjk", color: str = "text",
          max_w: float | None = None, min_size: float = 13,
          tag: str = "", anchor: str | None = None) -> float:
    d = ImageDraw.Draw(img)
    if max_w is not None:
        size = fit(text, kind, max_w, size, min_size)
        if measure(text, size, kind) > max_w + 0.6:
            WARNINGS.append(f"{tag}: {text!r} exceeds {max_w:.0f}px at "
                            f"{size:.0f}px")
    d.text(xy, text, font=font(size, kind), fill=hx(s[color]), anchor=anchor)
    return float(size)


def chip_right(img: Image.Image, right: float, top: float, text: str, s: dict,
               size: float = 11.5, kind: str = "mono_bold",
               fg: str = "sub", bg: str = "band", pad: float = 10,
               height: float = 24) -> float:
    d = ImageDraw.Draw(img)
    w = measure(text, size, kind) + pad * 2
    x = right - w
    d.rounded_rectangle([x, top, right, top + height], radius=height / 2,
                        fill=hx(s[bg]))
    d.text((x + pad, top + height / 2), text, font=font(size, kind),
           fill=hx(s[fg]), anchor="lm")
    return x


def line(img: Image.Image, p0, p1, color: str, width: int = 2) -> None:
    ImageDraw.Draw(img).line([p0, p1], fill=hx(color), width=width)


def arrow_head(img: Image.Image, tip, direction: str, color: str,
               size: int = 7) -> None:
    x, y = tip
    if direction == "down":
        pts = [(x, y), (x - size * 0.7, y - size), (x + size * 0.7, y - size)]
    elif direction == "right":
        pts = [(x, y), (x - size, y - size * 0.7), (x - size, y + size * 0.7)]
    else:  # left
        pts = [(x, y), (x + size, y - size * 0.7), (x + size, y + size * 0.7)]
    ImageDraw.Draw(img).polygon(pts, fill=hx(color))


def dashes(img: Image.Image, p0, p1, color: str, width: int = 2,
           dash: int = 7, gap: int = 6) -> None:
    import math

    d = ImageDraw.Draw(img)
    (x0, y0), (x1, y1) = p0, p1
    length = math.hypot(x1 - x0, y1 - y0)
    if length == 0:
        return
    ux, uy = (x1 - x0) / length, (y1 - y0) / length
    pos = 0.0
    while pos < length:
        end = min(pos + dash, length)
        d.line([x0 + ux * pos, y0 + uy * pos, x0 + ux * end, y0 + uy * end],
               fill=hx(color), width=width)
        pos = end + gap


# ---------------------------------------------------------------------------
# hero copy
# ---------------------------------------------------------------------------
HERO = {
    "zh": dict(
        kicker="DeepSeek Harness · dsh-research-report",
        title="可核查报告",
        value=["每条结论绑定不可变证据快照", "改过任何一个字节，封印就对不上"],
        sub="claim → 快照绑定 · 五态判定 · manifest 封印",
        meta="纯 TypeScript · 零网络核查 · 无凭据 · 不调模型",
        foot="Apache-2.0 · PerryLink DSH plugin family",
        card_kicker="封存报告目录 · 哈希汇封",
        card_chip="版本化 · 只追加",
        card_path="research-reports/<slug(topic)>/<YYYYMMDD-HHmmss>/",
        files=["report.md", "objects/<sha256>", "verification.jsonl",
               "disconfirmation.jsonl"],
        notes=["正文 + 附录 A/B/C/D", "证据快照哈希（存在于账本）",
               "交付前逐 claim 重审计", "证伪与矛盾记录"],
        manifest=["sha256(report.md)", "证据哈希 + claim + verdict",
                  "sha256(verification.jsonl)", "sha256(disconfirmation.jsonl)"],
        seal_word="SEAL",
        seal_label="seal = sha256(manifest.json)",
        seal_note="从目录本身重算 · 不挂插件",
        caption=["哈希只随内容变：", "改一个字节，重算就不再等于封印。"],
        verify_cmd="dsh-research-verify --report <dir>",
        verify_chip="MATCH · exit 0",
        card_note="封存前重审计：verdict 漂移 · 证据被篡改或缺失 · 日志写不出 → 拒绝封存",
    ),
    "en": dict(
        kicker="DeepSeek Harness · dsh-research-report",
        title="Sealed report",
        value=["Every claim bound to a snapshot", "Change one byte, the seal breaks"],
        sub="binding · 5-state verdict · sha256 seal",
        meta="pure TypeScript · offline check · no credentials",
        foot="Apache-2.0 · PerryLink DSH plugin family",
        card_kicker="sealed report directory · hash fan-in",
        card_chip="versioned · append-only",
        card_path="research-reports/<slug(topic)>/<YYYYMMDD-HHmmss>/",
        files=["report.md", "objects/<sha256>", "verification.jsonl",
               "disconfirmation.jsonl"],
        notes=["body + Appendix A-D", "evidence hashes (kept in the ledger)",
               "pre-seal re-audit per claim", "disproven / contradicted log"],
        manifest=["sha256(report.md)", "evidence hashes + claims + verdicts",
                  "sha256(verification.jsonl)", "sha256(disconfirmation.jsonl)"],
        seal_word="SEAL",
        seal_label="seal = sha256(manifest.json)",
        seal_note="recomputed from the directory, plugin unmounted",
        caption=["Hashes follow content, nothing else:",
                 "change one byte: the recompute stops matching"],
        verify_cmd="dsh-research-verify --report <dir>",
        verify_chip="MATCH · exit 0",
        card_note="pre-seal re-audit: verdict drift · tampered/missing evidence · unwritable journal → seal refused",
    ),
}

CARD = (700, 44, 1392, 552)
IN_L, IN_R = 726, 1366
ROWS_R = 1020
BUS_X = 1032
PLATE = (1052, 190, 1366, 300)
SEAL_CX, SEAL_CY, SEAL_R = 1209, 356, 44


def draw_seal_fanin(img: Image.Image, s: dict, m: dict) -> Image.Image:
    """The right-hand figure: four hashed inputs, one manifest, one seal."""
    d = ImageDraw.Draw(img)

    # --- card header -------------------------------------------------------
    write(img, (IN_L, 66), m["card_kicker"], s, 13.5,
          kind_auto(m["card_kicker"], bold=True), "accent", 420, 11,
          "hero.card_kicker")
    chip_right(img, IN_R, 63, m["card_chip"], s, size=11.5,
               kind=kind_auto(m["card_chip"], bold=True), height=24)
    d = ImageDraw.Draw(img)

    # --- the directory path ------------------------------------------------
    d.rounded_rectangle([IN_L, 96, IN_R, 134], radius=10, fill=hx(s["band"]))
    write(img, (IN_L + 12, 104), m["card_path"], s, 12.5, "mono", "text",
          IN_R - IN_L - 24, 11, "hero.card_path")

    # --- four hashed inputs ------------------------------------------------
    row_h, row_gap = 46, 9
    centers: list[float] = []
    for index, (name, note) in enumerate(zip(m["files"], m["notes"])):
        top = 146 + index * (row_h + row_gap)
        d.rounded_rectangle([IN_L, top, ROWS_R, top + row_h], radius=10,
                            fill=hx(s["rowbg"]), outline=hx(s["edge"]),
                            width=1)
        d.rounded_rectangle([IN_L + 12, top + 12, IN_L + 16, top + 34],
                            radius=2, fill=hx(s["accent"]))
        write(img, (IN_L + 26, top + 5), name, s, 14.5, "mono_bold", "text",
              ROWS_R - IN_L - 40, 11, f"hero.file{index}")
        write(img, (IN_L + 26, top + 26), note, s, 11.5, "cjk", "sub",
              ROWS_R - IN_L - 40, 10.5, f"hero.note{index}")
        centers.append(top + row_h / 2)

    # --- fan-in bus into the manifest plate --------------------------------
    for cy in centers:
        line(img, (ROWS_R, cy), (BUS_X, cy), s["bus"], 2)
        d.ellipse([BUS_X - 2.6, cy - 2.6, BUS_X + 2.6, cy + 2.6],
                  fill=hx(s["accent"]))
    line(img, (BUS_X, centers[0]), (BUS_X, centers[-1]), s["bus"], 2)
    plate_cy = (PLATE[1] + PLATE[3]) / 2
    line(img, (BUS_X, plate_cy), (PLATE[0] - 10, plate_cy), s["accent"], 2)
    arrow_head(img, (PLATE[0] - 2, plate_cy), "right", s["accent"], 7)

    # --- manifest plate ----------------------------------------------------
    img = card(img, PLATE, s, radius=14, shadow=16, edge=s["accent"],
               fill=s["rowbg"], width=2)
    d = ImageDraw.Draw(img)
    write(img, (PLATE[0] + 16, PLATE[1] + 12), "manifest.json", s, 15,
          "mono_bold", "text", 260, 12, "hero.manifest_title")
    for index, content in enumerate(m["manifest"]):
        write(img, (PLATE[0] + 16, PLATE[1] + 38 + index * 17), content, s,
              11.5, kind_auto(content), "sub",
              PLATE[2] - PLATE[0] - 28, 10.5, f"hero.manifest{index}")

    # --- manifest -> seal --------------------------------------------------
    line(img, (SEAL_CX, PLATE[3]), (SEAL_CX, SEAL_CY - SEAL_R - 8),
         s["accent"], 2)
    arrow_head(img, (SEAL_CX, SEAL_CY - SEAL_R), "down", s["accent"], 7)

    # --- the seal ----------------------------------------------------------
    d = ImageDraw.Draw(img)
    d.ellipse([SEAL_CX - SEAL_R, SEAL_CY - SEAL_R,
               SEAL_CX + SEAL_R, SEAL_CY + SEAL_R],
              fill=hx(s["pill"]), outline=hx(s["accent"]), width=3)
    d.ellipse([SEAL_CX - SEAL_R + 8, SEAL_CY - SEAL_R + 8,
               SEAL_CX + SEAL_R - 8, SEAL_CY + SEAL_R - 8],
              outline=hx(s["accent"]), width=1)
    d.text((SEAL_CX, SEAL_CY - 7), m["seal_word"], font=font(14, "mono_bold"),
           fill=hx(s["accent"]), anchor="mm")
    d.text((SEAL_CX, SEAL_CY + 14), "sha256", font=font(11, "mono"),
           fill=hx(s["faint"]), anchor="mm")

    # --- seal captions -----------------------------------------------------
    size = fit(m["seal_label"], "mono_bold", 300, 13, 11)
    d.text((SEAL_CX, 404), m["seal_label"], font=font(size, "mono_bold"),
           fill=hx(s["accent"]), anchor="ma")
    cap = fit(m["seal_note"], "cjk", 300, 11, 10.5)
    d.text((SEAL_CX, 424), m["seal_note"], font=font(cap, "cjk"),
           fill=hx(s["faint"]), anchor="ma")

    # --- the standalone verifier strip -------------------------------------
    d.rounded_rectangle([IN_L, 452, IN_R, 492], radius=12, fill=hx(s["band"]))
    write(img, (IN_L + 14, 461), m["verify_cmd"], s, 13.5, "mono_bold",
          "accent", 430, 11, "hero.verify_cmd")
    chip_right(img, IN_R - 8, 460, m["verify_chip"], s, size=11.5,
               fg="ok", bg="ok_bg", height=24)

    # --- the ledger-side caption -------------------------------------------
    for index, content in enumerate(m["caption"]):
        write(img, (IN_L + 12, 374 + index * 21), content, s, 12.5, "cjk",
              "sub" if index == 0 else "faint", ROWS_R - IN_L - 24, 11,
              f"hero.caption{index}")

    # --- footer note -------------------------------------------------------
    write(img, (IN_L, 504), m["card_note"], s, 11.5, "cjk", "faint",
          IN_R - IN_L - 8, 10.5, "hero.card_note")
    return img


def hero(lang: str, skin_name: str) -> None:
    s = SKIN[skin_name]
    m = HERO[lang]
    w, h = 1440, 576
    img = gradient(w, h, s["bg_from"], s["bg_to"])
    img = glow(img, 1240, 20, 470, s["accent"],
               16 if skin_name == "light" else 30)
    img = glow(img, 92, 560, 320, s["accent"],
               8 if skin_name == "light" else 14)

    # ------------------------------------------------------------ left copy
    d = ImageDraw.Draw(img)
    kicker_w = measure(m["kicker"], 16.5, "mono_bold") + 36
    d.rounded_rectangle([58, 56, 58 + kicker_w, 96], radius=20,
                        fill=hx(s["pill"]))
    d.text((76, 76), m["kicker"], font=font(16.5, "mono_bold"),
           fill=hx(s["accent"]), anchor="lm")

    title_kind = "cjk_bold"
    tsize = fit(m["title"], title_kind, 600, 96 if lang == "zh" else 86, 80)
    d.text((58, 118), m["title"], font=font(tsize, title_kind),
           fill=hx(s["text"]))
    if tsize * 880 / 1440 < 48:
        raise SystemExit(f"FATAL: hero.{lang} title displays at "
                         f"{tsize * 880 / 1440:.1f}px (<48px)")

    vkind = "cjk_bold"
    vsize = fit_lines(m["value"], vkind, 600, 36 if lang == "zh" else 31, 24)
    y = 262
    for index, content in enumerate(m["value"]):
        write(img, (58, y), content, s, vsize, vkind, "text", 600, 24,
              f"hero.{lang}.value{index}")
        y += vsize + 16

    sub_size = write(img, (58, 384), m["sub"], s, 26,
                     "cjk" if lang == "zh" else "mono", "sub", 600, 24,
                     f"hero.{lang}.sub")
    if sub_size * 880 / 1440 < 15:
        raise SystemExit(f"FATAL: hero.{lang} sub displays at "
                         f"{sub_size * 880 / 1440:.1f}px (<15px)")

    meta_size = write(img, (58, 432), m["meta"], s, 20, "cjk", "faint",
                      600, 19, f"hero.{lang}.meta")
    if meta_size * 880 / 1440 < 12:
        raise SystemExit(f"FATAL: hero.{lang} meta displays at "
                         f"{meta_size * 880 / 1440:.1f}px (<12px)")

    d = ImageDraw.Draw(img)
    d.line([58, 468, 632, 468], fill=hx(s["grid"]), width=2)
    write(img, (58, 484), m["foot"], s, 17, "mono", "faint", 560, 14,
          f"hero.{lang}.foot")

    # ------------------------------------------------------- the fan-in card
    img = card(img, CARD, s, radius=22, shadow=26)
    img = draw_seal_fanin(img, s, m)

    img.save(os.path.join(OUT, f"{NAME}-hero-{lang}-{skin_name}.webp"),
             "WEBP", quality=92, method=6)
    print(f"wrote {NAME}-hero-{lang}-{skin_name}.webp")


# ---------------------------------------------------------------------------
# flow (hand-written SVG, 1100x660)
# ---------------------------------------------------------------------------
class Svg:
    """Tiny SVG writer that measures every label before it is emitted."""

    def __init__(self, s: dict) -> None:
        self.s = s
        self.parts: list[str] = []
        self.bad: list[str] = []

    def add(self, markup: str) -> None:
        self.parts.append(markup)

    @staticmethod
    def _kind(mono: bool, weight: int | None) -> str:
        return ("mono" if mono else "cjk") + ("_bold" if weight else "")

    def text(self, x: float, y: float, content: str, size: float, color: str,
             *, weight: int | None = None, mono: bool = False,
             anchor: str = "start", max_w: float | None = None,
             opacity: float | None = None) -> None:
        kind = self._kind(mono, weight)
        got = measure(content, size, kind)
        if max_w is not None and got > max_w + 0.6:
            self.bad.append(f"{content!r} needs {got:.1f}px > {max_w:.0f}px")
        attrs = [f'x="{x}"', f'y="{y}"', f'fill="{color}"',
                 f'font-family="{FONT_CSS_MONO if mono else FONT_CSS_SANS}"',
                 f'font-size="{size}"']
        if anchor != "start":
            attrs.append(f'text-anchor="{anchor}"')
        if weight:
            attrs.append(f'font-weight="{weight}"')
        if opacity is not None:
            attrs.append(f'opacity="{opacity}"')
        self.add(f'<text {" ".join(attrs)}>{escape(content)}</text>')

    def rect(self, x: float, y: float, w: float, h: float, *, fill: str,
             rx: float = 0, stroke: str | None = None, sw: float = 1.5,
             shadow: bool = False, dash: str | None = None,
             opacity: float | None = None) -> None:
        attrs = [f'x="{x}"', f'y="{y}"', f'width="{w}"', f'height="{h}"']
        if rx:
            attrs.append(f'rx="{rx}"')
        attrs.append(f'fill="{fill}"')
        if stroke:
            attrs += [f'stroke="{stroke}"', f'stroke-width="{sw}"']
        if dash:
            attrs.append(f'stroke-dasharray="{dash}"')
        if opacity is not None:
            attrs.append(f'opacity="{opacity}"')
        if shadow:
            attrs.append('filter="url(#soft)"')
        self.add(f'<rect {" ".join(attrs)}/>')

    def line(self, x1: float, y1: float, x2: float, y2: float, *, stroke: str,
             sw: float = 1.5, dash: str | None = None,
             opacity: float | None = None) -> None:
        attrs = [f'x1="{x1}"', f'y1="{y1}"', f'x2="{x2}"', f'y2="{y2}"',
                 f'stroke="{stroke}"', f'stroke-width="{sw}"']
        if dash:
            attrs.append(f'stroke-dasharray="{dash}"')
        if opacity is not None:
            attrs.append(f'opacity="{opacity}"')
        self.add(f'<line {" ".join(attrs)}/>')

    def path(self, d: str, *, stroke: str, sw: float = 1.5,
             fill: str = "none", dash: str | None = None,
             opacity: float | None = None) -> None:
        attrs = [f'd="{d}"', f'fill="{fill}"', f'stroke="{stroke}"',
                 f'stroke-width="{sw}"', 'stroke-linejoin="round"',
                 'stroke-linecap="round"']
        if dash:
            attrs.append(f'stroke-dasharray="{dash}"')
        if opacity is not None:
            attrs.append(f'opacity="{opacity}"')
        self.add(f'<path {" ".join(attrs)}/>')

    def circle(self, cx: float, cy: float, r: float, *, fill: str,
               stroke: str | None = None, sw: float = 1.5,
               dash: str | None = None) -> None:
        attrs = [f'cx="{cx}"', f'cy="{cy}"', f'r="{r}"', f'fill="{fill}"']
        if stroke:
            attrs += [f'stroke="{stroke}"', f'stroke-width="{sw}"']
        if dash:
            attrs.append(f'stroke-dasharray="{dash}"')
        self.add(f'<circle {" ".join(attrs)}/>')

    def chip(self, x: float, y: float, label: str, fg: str, bg: str, *,
             size: float = 11, pad: float = 9, height: float = 22,
             mono: bool = True, weight: int | None = None,
             max_w: float | None = None) -> float:
        kind = self._kind(mono, weight)
        w = measure(label, size, kind) + pad * 2
        if max_w is not None and w > max_w + 0.6:
            self.bad.append(f"chip {label!r} needs {w:.1f}px > {max_w:.0f}px")
        self.rect(x, y, w, height, fill=bg, rx=height / 2)
        self.text(x + pad, y + height / 2 + size * 0.36, label, size, fg,
                  mono=mono, weight=weight)
        return w

    def chip_right(self, right: float, y: float, label: str, fg: str, bg: str,
                   *, size: float = 11, pad: float = 9, height: float = 22,
                   mono: bool = True, weight: int | None = None) -> float:
        kind = self._kind(mono, weight)
        w = measure(label, size, kind) + pad * 2
        x = right - w
        self.rect(x, y, w, height, fill=bg, rx=height / 2)
        self.text(x + pad, y + height / 2 + size * 0.36, label, size, fg,
                  mono=mono, weight=weight)
        return x

    def arrow(self, x1: float, y1: float, x2: float, y2: float, color: str,
              sw: float = 1.8, dash: str | None = None) -> None:
        self.path(f"M{x1} {y1}L{x2} {y2}", stroke=color, sw=sw, dash=dash)
        if abs(x2 - x1) < 0.5:  # vertical
            direction = 1 if y2 > y1 else -1
            tip = f"M{x2} {y2}l-4.8 {-7 * direction}h9.6z"
        else:  # horizontal
            direction = 1 if x2 > x1 else -1
            tip = f"M{x2} {y2}l{-7 * direction} -4.8v9.6z"
        self.add(f'<path d="{tip}" fill="{color}"/>')

    def svg(self, w: int, h: int, title: str, desc: str) -> str:
        head = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" '
                f'height="{h}" viewBox="0 0 {w} {h}" role="img" '
                f'aria-labelledby="title desc">')
        return "\n".join([head, f'<title id="title">{escape(title)}</title>',
                          f'<desc id="desc">{escape(desc)}</desc>',
                          *self.parts, "</svg>"]) + "\n"


LEDGER_IN = [
    ("index.jsonl", "evidence id → sha256 · bytes"),
    ("claims.jsonl", "claim id → text + evidenceIds"),
    ("verdicts.jsonl", "latest verdict per claim wins"),
    ("disproofs.jsonl", "negative knowledge · claim hash"),
]

COMB = [
    ("integrity ≠ ok", "object bytes ≠ indexed hash", "contradicted",
     "bad", "bad_bg"),
    ("no binding · no literal", "nothing to locate", "unverified",
     "sub", "neutral_bg"),
    ("label, another number", "claim X vs snapshot Y", "disproven",
     "bad2", "bad_bg"),
    ("literal not located", "bound evidence insufficient", "insufficient",
     "warn", "warn_bg"),
    ("all literals located", "verbatim in the bound snapshot", "verified",
     "ok", "ok_bg"),
]

SEALED = [
    ("report.md", "body + Appendix A-D"),
    ("verification.jsonl", "pre-seal re-audit per claim"),
    ("disconfirmation.jsonl", "disproven · contradicted"),
]


def flow_svg(skin: str) -> str:
    f = FLOW[skin]
    W, H = 1100, 660
    v = Svg(f)

    v.add("<defs>")
    v.add(f'<linearGradient id="bg" x1="0" y1="0" x2="0.22" y2="1">'
          f'<stop offset="0" stop-color="{f["bg_from"]}"/>'
          f'<stop offset="1" stop-color="{f["bg_to"]}"/></linearGradient>')
    v.add(f'<filter id="soft" x="-30%" y="-30%" width="160%" height="180%">'
          f'<feDropShadow dx="0" dy="7" stdDeviation="9" '
          f'flood-color="{f["shadow"]}" flood-opacity="{f["shadow_op"]}"/>'
          f'</filter>')
    v.add(f'<pattern id="dots" width="24" height="24" '
          f'patternUnits="userSpaceOnUse">'
          f'<circle cx="1.2" cy="1.2" r="1.2" fill="{f["dot"]}"/>'
          f'</pattern>')
    v.add("</defs>")

    v.rect(0, 0, W, H, fill="url(#bg)")
    v.rect(0, 0, W, H, fill="url(#dots)", opacity=0.45)

    # ---- header -----------------------------------------------------------
    v.text(44, 54, NAME, 23, f["text"], weight=700, mono=True, max_w=430)
    v.text(44, 80,
           "evidence snapshot → byte verdict → sealed report; "
           "the seal is sha256(manifest.json)",
           12, f["sub"], max_w=690)
    v.chip_right(1056, 28, "evidence_add · research_report · ledger_query",
                 f["accent"], f["pill"], size=11, height=24)
    v.chip_right(1056, 60, "5 verdicts · 4 journals · 1 seal",
                 f["sub"], f["band"], size=11, height=24)
    v.line(44, 96, 1056, 96, stroke=f["rule"], sw=1, dash="4 5", opacity=0.9)

    # ---- three panels ------------------------------------------------------
    LEFT = (44, 108, 296, 436)
    MID = (366, 108, 380, 436)
    RIGHT = (770, 108, 286, 436)
    for box in (LEFT, MID, RIGHT):
        v.rect(box[0], box[1], box[2], box[3], fill=f["panel"], rx=20,
               stroke=f["edge"], sw=1.5, shadow=True)

    def panel_head(box, number, title, sub):
        x, y = box[0], box[1]
        v.circle(x + 24, y + 26, 11, fill=f["accent"])
        v.text(x + 24, y + 26 + 4.2, str(number), 11.5, f["panel"],
               weight=700, mono=True, anchor="middle")
        v.text(x + 42, y + 31, title, 13, f["text"], weight=700, mono=True,
               max_w=box[2] - 60)
        v.text(x + 16, y + 52, sub, 11, f["faint"], max_w=box[2] - 32)
        v.line(x + 16, y + 62, x + box[2] - 16, y + 62, stroke=f["rule"],
               sw=1, opacity=0.9)

    panel_head(LEFT, 1, "EVIDENCE LEDGER", "ledgerRoot · objects + 4 journals")
    panel_head(MID, 2, "VERDICT ENGINE", "verifyClaimText · integrity first")
    panel_head(RIGHT, 3, "SEALED REPORT", "reportRoot · one dir per assemble")

    # the board reads left to right: two short bridges across the gutters
    for x_from, x_to in ((LEFT[0] + LEFT[2] + 5, MID[0] - 3),
                         (MID[0] + MID[2] + 5, RIGHT[0] - 3)):
        v.arrow(x_from, 300, x_to, 300, f["accent"], sw=1.5, dash="5 4")

    # ======================= panel 1: the ledger ===========================
    x0 = LEFT[0] + 18
    iw = LEFT[2] - 36
    v.text(x0, 192, "in · URL · file · DOI · content", 11, f["sub"], mono=True,
           max_w=iw)
    v.text(x0, 208, "ctx.web · fs (no escape) · syntax", 11, f["faint"],
           mono=True, max_w=iw)
    v.rect(x0, 216, iw, 30, fill=f["band"], rx=9)
    v.text(x0 + iw / 2, 236, "sha256(content)", 13, f["accent"], weight=700,
           mono=True, anchor="middle")
    v.arrow(x0 + iw / 2, 246, x0 + iw / 2, 254, f["accent"], sw=1.6)
    v.rect(x0, 256, iw, 56, fill=f["card"], rx=10, stroke=f["accent"], sw=1.4)
    v.text(x0 + 12, 278, "objects/<sha256>", 13, f["text"], weight=700,
           mono=True, max_w=iw - 24)
    v.text(x0 + 12, 296, "immutable · dedupe · re-hash on read", 11,
           f["faint"], mono=True, max_w=iw - 24)
    v.text(x0, 332, "journals · append-only", 11, f["faint"], mono=True,
           max_w=iw)
    for index, (name, note) in enumerate(LEDGER_IN):
        top = 340 + index * 46
        v.rect(x0, top, iw, 42, fill=f["band"], rx=9)
        v.text(x0 + 10, top + 16, name, 13, f["text"], weight=700, mono=True,
               max_w=iw - 20)
        v.text(x0 + 10, top + 33, note, 11, f["faint"], mono=True,
               max_w=iw - 20)

    # ======================= panel 2: the verdict comb =====================
    mx = MID[0] + 18
    mw = MID[2] - 36
    v.rect(mx, 186, mw, 32, fill=f["band"], rx=9)
    v.text(mx + 12, 207, "claim c1", 13, f["text"], weight=700, mono=True,
           max_w=110)
    v.text(mx + 94, 207, "· text + evidenceIds[]", 11, f["sub"], mono=True,
           max_w=mw - 112)
    v.arrow(mx + mw / 2, 218, mx + mw / 2, 226, f["accent"], sw=1.6)
    v.rect(mx, 228, mw, 32, fill=f["card"], rx=9, stroke=f["edge"], sw=1.3)
    v.text(mx + 12, 249, "bound snapshot bytes · objects/<sha256>", 11,
           f["sub"], mono=True, max_w=mw - 24)
    v.text(mx, 276, "first match wins ↓", 11, f["faint"], mono=True, max_w=180)

    comb_top, comb_h, comb_gap = 286, 42, 3
    rail_x = mx + 8
    comb_bottom = comb_top + 5 * comb_h + 4 * comb_gap
    v.line(rail_x, comb_top + 10, rail_x, comb_bottom - 10, stroke=f["rule"],
           sw=1.5)
    for index, (cond, detail, verdict, fg, bg) in enumerate(COMB):
        top = comb_top + index * (comb_h + comb_gap)
        cy = top + comb_h / 2
        v.rect(mx, top, mw, comb_h, fill=f["card"], rx=10, stroke=f["edge"],
               sw=1.1)
        v.circle(rail_x, cy, 3.4, fill=f["accent"])
        chip_x = v.chip_right(mx + mw - 10, cy - 12, verdict, f[fg], f[bg],
                              size=13, pad=9, height=24, mono=True,
                              weight=700)
        cond_w = chip_x - (rail_x + 12) - 10
        v.text(rail_x + 12, cy - 3, cond, 11.5, f["text"], mono=True,
               max_w=cond_w)
        v.text(rail_x + 12, cy + 13, detail, 11, f["faint"], mono=True,
               max_w=cond_w)

    v.text(mx, 530, "↩ write-back: verdicts.jsonl · disproofs.jsonl", 11,
           f["faint"], mono=True, max_w=mw)

    # ======================= panel 3: the sealed report ====================
    rx = RIGHT[0] + 18
    rw = RIGHT[2] - 36
    v.rect(rx, 180, rw, 38, fill=f["band"], rx=9)
    v.text(rx + 10, 195, "research-reports/", 11, f["sub"], mono=True,
           max_w=rw - 20)
    v.text(rx + 10, 212, "<slug(topic)>/<YYYYMMDD-HHmmss>/", 11, f["faint"],
           mono=True, max_w=rw - 20)

    art_right = rx + rw - 26
    for index, (name, note) in enumerate(SEALED):
        top = 228 + index * 46
        v.rect(rx, top, art_right - rx, 40, fill=f["card"], rx=9,
               stroke=f["edge"], sw=1.1)
        v.text(rx + 10, top + 16, name, 13, f["text"], weight=700, mono=True,
               max_w=art_right - rx - 20)
        v.text(rx + 10, top + 31, note, 11, f["faint"], mono=True,
               max_w=art_right - rx - 20)

    # bracket: the three artifacts fold into one manifest
    bus_x = rx + rw - 14
    centers = [228 + index * 46 + 20 for index in range(3)]
    for cy in centers:
        v.line(art_right, cy, bus_x, cy, stroke=f["bus"], sw=1.8)
        v.circle(bus_x, cy, 2.6, fill=f["accent"])
    plate_top, plate_h = 370, 74
    plate_cx = rx + rw / 2
    v.line(bus_x, centers[0], bus_x, plate_top - 8, stroke=f["bus"], sw=1.8)
    v.add(f'<path d="M{bus_x} {plate_top}l-4.8 -8h9.6z" fill="{f["accent"]}"/>')
    v.rect(rx, plate_top, rw, plate_h, fill=f["card"], rx=12,
           stroke=f["accent"], sw=1.8, shadow=True)
    v.text(rx + 12, plate_top + 22, "manifest.json", 13, f["text"], weight=700,
           mono=True, max_w=rw - 24)
    v.text(rx + 12, plate_top + 40, "report + evidence + journal hashes", 11,
           f["faint"], mono=True, max_w=rw - 24)
    v.text(rx + 12, plate_top + 57, "seal = sha256(this file)", 11,
           f["accent"], mono=True, max_w=rw - 24)

    # the seal itself
    v.arrow(plate_cx, plate_top + plate_h, plate_cx, plate_top + plate_h + 10,
            f["accent"], sw=1.6)
    seal_cy, seal_r = 482, 29
    v.circle(plate_cx, seal_cy, seal_r, fill=f["pill"], stroke=f["accent"],
             sw=2.4)
    v.circle(plate_cx, seal_cy, seal_r - 6, fill="none", stroke=f["accent"],
             sw=1, dash="3 3")
    v.text(plate_cx, seal_cy - 2, "SEAL", 13, f["accent"], weight=700,
           mono=True, anchor="middle")
    v.text(plate_cx, seal_cy + 14, "sha256", 11, f["faint"], mono=True,
           anchor="middle")
    v.text(plate_cx, 530, "seal = sha256(manifest.json)", 11.5, f["sub"],
           mono=True, anchor="middle", max_w=rw)

    # ======================= the auditor rail (outside) ====================
    v.rect(44, 556, 1012, 74, fill=f["band"], rx=18, stroke=f["accent"],
           sw=1.4, dash="7 6")
    v.text(62, 578,
           "outside the plugin · reads the report directory · "
           "zero @deepseek-ai imports",
           11, f["faint"], mono=True, max_w=620)
    v.text(62, 603, "dsh-research-verify --report <dir> [--seal <sha256>] "
                    "[--ledger <dir>]", 13, f["accent"], weight=700, mono=True,
           max_w=700)
    v.text(1038, 598, "recompute seal · report hash · journal hashes", 11,
           f["sub"], mono=True, anchor="end", max_w=380)
    v.text(1038, 616, "per-claim recheck → MATCH exit 0 · MISMATCH exit 1", 11,
           f["sub"], mono=True, anchor="end", max_w=380)
    v.line(LEFT[0] + LEFT[2] / 2, 544, LEFT[0] + LEFT[2] / 2, 556,
           stroke=f["faint"], sw=1.4, dash="3 4", opacity=0.6)
    v.line(RIGHT[0] + RIGHT[2] / 2, 544, RIGHT[0] + RIGHT[2] / 2, 556,
           stroke=f["accent"], sw=1.6, dash="5 4", opacity=0.8)

    # ---- footer -----------------------------------------------------------
    v.text(44, 650, "src/ledger.ts · src/verify.ts · src/assemble.ts · "
                    "src/verify-sealed.ts · src/cli.ts", 11, f["faint"],
           mono=True, max_w=600)
    v.text(1056, 650, "1 service key · 0 waterfall listeners · no direct fetch",
           11, f["faint"], mono=True, anchor="end", max_w=420)

    if v.bad:
        raise SystemExit("FATAL: SVG label overflow:\n  " + "\n  ".join(v.bad))
    return v.svg(
        W, H,
        f"{NAME}: ledger | verdict comb | sealed report, with an offline auditor",
        "A three-panel audit board. Panel 1 is the content-addressed evidence "
        "ledger: a URL, a workspace file, a DOI or inline content is captured "
        "(HTTP only through ctx.web, local reads confined to the workspace, a "
        "DOI checked syntactically), hashed with SHA-256, stored once as "
        "objects/<sha256> (immutable, re-hashed on every read) and journalled "
        "in index.jsonl, claims.jsonl, verdicts.jsonl and disproofs.jsonl. "
        "Panel 2 is the verdict comb: one claim with its bound snapshot bytes "
        "drops through five first-match prongs and leaves as exactly one of "
        "the five verdict words, the first being the integrity gate (unequal "
        "bytes mean contradicted) and the rest the byte-level branches of "
        "verifyClaimText: no binding or no literal to locate means unverified, "
        "a label carrying another number means disproven, an unlocatable "
        "literal means insufficient, every literal located means verified. "
        "Verdicts and disproofs are written back to the ledger. Panel 3 is "
        "the sealed report directory: report.md, verification.jsonl and "
        "disconfirmation.jsonl fold into manifest.json, and the seal is the "
        "SHA-256 of that file's bytes. The rail under the board sits outside "
        "the plugin: the standalone dsh-research-verify binary, with zero "
        "@deepseek-ai imports, recomputes the seal, the report hash, the "
        "journal hashes and every claim verdict from the directory alone.",
    )


def main() -> None:
    for skin in ("light", "dark"):
        for lang in ("zh", "en"):
            hero(lang, skin)
    for skin in ("light", "dark"):
        with open(os.path.join(OUT, f"{NAME}-flow-v5-{skin}.svg"), "w",
                  encoding="utf-8", newline="\n") as fh:
            fh.write(flow_svg(skin))
        print(f"wrote {NAME}-flow-v5-{skin}.svg")
    if WARNINGS:
        raise SystemExit("FATAL: label warnings:\n  " + "\n  ".join(WARNINGS))
    print("done: 4 hero webp + 2 flow svg")


if __name__ == "__main__":
    main()
