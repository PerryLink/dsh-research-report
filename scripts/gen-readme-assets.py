#!/usr/bin/env python3
"""Generate README image assets for dsh-research-report (docs/assets/).

Outputs (idempotent overwrite):
  dsh-research-report-flow-light.svg / dsh-research-report-flow-dark.svg
      Hero pipeline diagram. Two hand-written SVG files (vector - never
      rasterized to webp). Text inside is command-surface tokens only
      (evidence_add, objects/<sha256>, manifest.json, ...), so all five
      README languages share the same pair.
  No evidence chart here: this repository ships no benchmark dataset, so the
  asset set deliberately stops at the flow pair.

Run once:  python scripts/gen-readme-assets.py
Requires:  Pillow (pip install pillow)
"""
from __future__ import annotations

import os
import sys
from html import escape

from PIL import Image, ImageDraw, ImageFont  # noqa: F401  (Pillow is the family baseline)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "assets")

# --- palette: PerryLink family (accent) + GitHub page backgrounds ----------
FAMILY = "#4B67B4"   # family accent (badges labelColor family uses #2B3245)
GREEN = {"light": "#16a34a", "dark": "#3fb950"}
SKIN = {
    "light": dict(bg="#ffffff", box="#f6f8fa", border="#d0d7de",
                  text="#1f2328", sub="#57606a", track="#eaeef2"),
    "dark": dict(bg="#0d1117", box="#161b22", border="#30363d",
                 text="#f0f6fc", sub="#8b949e", track="#21262d"),
}

# --- CJK font probe: Chinese must never render as tofu boxes ----------------
# The flow SVG below is ASCII token text only; the probe stays because every
# family asset script must fail loud rather than silently render tofu the day
# a localized chart is added here.
FONT_CANDIDATES = [
    r"C:\Windows\Fonts\msyh.ttc",      # Microsoft YaHei
    r"C:\Windows\Fonts\simhei.ttf",    # SimHei
    r"C:\Windows\Fonts\Deng.ttf",      # DengXian
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/System/Library/Fonts/PingFang.ttc",
]
FONT_PATH = next((p for p in FONT_CANDIDATES if os.path.exists(p)), None)
if FONT_PATH is None:
    sys.exit("FATAL: no CJK font found (looked for msyh.ttc, simhei.ttf, "
             "Deng.ttf, Noto Sans CJK, PingFang). Refusing to render Chinese "
             "as tofu boxes; install one of the probed fonts and re-run.")


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_PATH, size)


# ---------------------------------------------------------------------------
# 1. Hero pipeline SVG (light + dark)
# ---------------------------------------------------------------------------
FLOW_NODES = [
    ("evidence_add", "URL / file / DOI"),
    ("objects/<sha256>", "content-addressed"),
    ("research_report", "claims ↔ evidence"),
    ("verify", "number · quote"),
    ("manifest.json", "sha256(manifest)"),
    ("dsh-research-verify", "--report <dir>"),
]


def flow_svg(skin: str) -> str:
    s = SKIN[skin]
    w, h = 1200, 430
    nw, nh, gap = 160, 100, 24
    y0 = 150
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
        f'viewBox="0 0 {w} {h}" role="img" aria-label="dsh-research-report pipeline">',
        '<title>dsh-research-report pipeline</title>',
        f'<rect width="{w}" height="{h}" rx="18" fill="{s["bg"]}"/>',
        f'<text x="60" y="62" fill="{s["text"]}" font-family="ui-sans-serif,'
        f'system-ui,sans-serif" font-size="30" font-weight="700">dsh-research-report</text>',
        f'<text x="60" y="94" fill="{s["sub"]}" font-family="ui-monospace,'
        f'monospace" font-size="16">claim → snapshot binding · byte-level verify · '
        f'tamper-evident seal</text>',
        f'<line x1="60" y1="116" x2="1140" y2="116" stroke="{s["border"]}"/>',
    ]
    for i, (label, sub) in enumerate(FLOW_NODES):
        label, sub = escape(label), escape(sub)
        x = 60 + i * (nw + gap)
        if i == len(FLOW_NODES) - 1:
            accent = GREEN[skin]
        elif i in (1, 4):
            accent = FAMILY
        else:
            accent = s["border"]
        parts.append(
            f'<rect x="{x}" y="{y0}" width="{nw}" height="{nh}" rx="14" '
            f'fill="{s["box"]}" stroke="{accent}" stroke-width="2"/>')
        parts.append(
            f'<text x="{x + nw // 2}" y="{y0 + 42}" fill="{s["text"]}" '
            f'text-anchor="middle" font-family="ui-monospace,monospace" '
            f'font-size="13" font-weight="700">{label}</text>')
        parts.append(
            f'<text x="{x + nw // 2}" y="{y0 + 72}" fill="{s["sub"]}" '
            f'text-anchor="middle" font-family="ui-monospace,monospace" '
            f'font-size="11">{sub}</text>')
        if i < len(FLOW_NODES) - 1:
            ax = x + nw + 5
            ay = y0 + nh // 2
            parts.append(
                f'<path d="M{ax} {ay}h{gap - 11}" stroke="{s["sub"]}" '
                f'stroke-width="3"/>')
            parts.append(
                f'<path d="M{ax + gap - 12} {ay - 7}l10 7-10 7" fill="none" '
                f'stroke="{s["sub"]}" stroke-width="3" '
                f'stroke-linecap="round" stroke-linejoin="round"/>')
    # seam bar: optional host services consumed on demand
    parts.append(
        f'<rect x="60" y="292" width="1080" height="48" rx="12" '
        f'fill="{s["box"]}" stroke="{FAMILY}" stroke-width="2"/>')
    parts.append(
        f'<text x="600" y="322" fill="{s["text"]}" text-anchor="middle" '
        f'font-family="ui-monospace,monospace" font-size="14">'
        f'optional seams: ctx.web · ctx.jobs · ctx.dataQuality</text>')
    # verdict vocabulary line
    parts.append(
        f'<text x="60" y="378" fill="{s["sub"]}" font-family="ui-monospace,'
        f'monospace" font-size="13">verdicts: verified · unverified · '
        f'insufficient · disproven · contradicted</text>')
    parts.append('</svg>')
    return "\n".join(parts) + "\n"


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    for skin in ("light", "dark"):
        with open(os.path.join(OUT, f"dsh-research-report-flow-{skin}.svg"),
                  "w", encoding="utf-8", newline="\n") as fh:
            fh.write(flow_svg(skin))
    print("wrote 2 SVG assets to docs/assets/")


if __name__ == "__main__":
    main()
