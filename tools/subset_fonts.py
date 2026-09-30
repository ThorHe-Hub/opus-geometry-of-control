"""Subset the source TTFs to the glyphs actually used and emit base64 WOFF2 @font-face CSS.

Usage: python tools/subset_fonts.py <text-file> <out-css>
The text file is the concatenated app source; every character in it is kept,
plus printable ASCII and a fixed set of math/punctuation symbols.
"""
import base64
import io
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent / "fonts-src"

# SIL OFL: a modified font (a subset is one) may not keep a Reserved Font Name. IBM Plex Mono reserves "Plex" (its
# OFL.txt) and IM Fell English reserves "IM FELL English Roman/Italic" (its copyright string), so both are renamed,
# in their name tables and in CSS. STIX reserves only "TM Math"; Noto Serif SC, Michroma, Caveat and Cormorant
# Garamond reserve nothing. Copyright notices (name ID 0) are kept untouched. Full texts: LICENSES/fonts/.
RENAME = [  # (old, new) substrings, applied in order to the identifying name records
    ("IBM Plex Mono", "GoC Mono"), ("IBMPlexMono", "GoCMono"),
    ("Igino Marini's FELL English", "GoC Oldstyle"), ("IM FELL English", "GoC Oldstyle"), ("IM_FELL_English", "GoCOldstyle"),
]
RENAMED_FROM = {"GoC Mono": "IBM Plex Mono", "GoC Oldstyle": "IM Fell English"}  # attribution only
NAME_IDS = (1, 3, 4, 6, 16, 17, 18, 21)  # family, unique ID, full name, PostScript name, typographic / WWS names
RESERVED = ("plex", "fell")
OFL_NOTICE = "This Font Software is licensed under the SIL Open Font License, Version 1.1."
OFL_URL = "https://openfontlicense.org"

# (family, weight, style, file, keep_cjk)
FACES = [
    ("Noto Serif SC", 400, "normal", "NotoSerifSC-400.ttf", True),
    ("Noto Serif SC", 600, "normal", "NotoSerifSC-600.ttf", True),
    ("Noto Serif SC", 900, "normal", "NotoSerifSC-900.ttf", True),
    ("Michroma", 400, "normal", "Michroma-400.ttf", False),
    ("GoC Mono", 400, "normal", "IBMPlexMono-400.ttf", False),  # IBM Plex Mono, renamed (RFN "Plex")
    ("GoC Mono", 500, "normal", "IBMPlexMono-500.ttf", False),
    ("STIX Two Text", 400, "normal", "STIXTwoText-400.ttf", False),
    ("STIX Two Text", 400, "italic", "STIXTwoText-400i.ttf", False),
    ("STIX Two Math", 400, "normal", "STIXTwoMath-Regular.otf", False),  # operators STIX Two Text lacks (∈ ⇒ ∞ …)
    ("Cormorant Garamond", 500, "normal", "CormorantGaramond-500.ttf", False),
    ("Cormorant Garamond", 500, "italic", "CormorantGaramond-500i.ttf", False),
    ("Caveat", 500, "normal", "Caveat-500.ttf", False),
    ("GoC Oldstyle", 400, "normal", "IMFellEnglish-400.ttf", False),  # IM Fell English, renamed (RFN)
    ("GoC Oldstyle", 400, "italic", "IMFellEnglish-400i.ttf", False),
]


def relabel(font: TTFont, family: str) -> str:
    """Drop reserved names from the identifying records, make sure the OFL notice travels with the font,
    and return a one-line credit for the CSS header."""
    name = font["name"]
    for rec in name.names:
        if rec.nameID in NAME_IDS:
            s = rec.toUnicode()
            for old, new in RENAME:
                s = s.replace(old, new)
            rec.string = s
            assert not any(w in s.lower() for w in RESERVED), f"{family}: reserved name left in {s!r}"
    for nid, text in ((13, OFL_NOTICE), (14, OFL_URL)):
        if not name.getName(nid, 3, 1, 0x409):
            name.setName(text, nid, 3, 1, 0x409)
    src = f" (from {RENAMED_FROM[family]})" if family in RENAMED_FROM else ""
    return f"{family}{src}: {name.getDebugName(0)}"

EXTRA = (
    "".join(chr(c) for c in range(0x20, 0x7F))
    + "·—–‘’“”…•×÷±∓≈≠≤≥∞∑∏∫∂∇√∈∉⊂⊆∪∩→←↔⇒⇐⇔↦°′″ℂℝℤℕℚ"
    + "αβγδεζηθικλμνξοπρστυφχψωΓΔΘΛΞΠΣΦΨΩϕϑϵ"
    + "ÀÁÂÄÅÉÈÊËÍÎÏÓÔÖÚÛÜÇÑáàâäåéèêëíîïóôöúûüçñőŐáÁ"
    + "̇̂̄   "
)


def is_cjk(ch: str) -> bool:
    o = ord(ch)
    return (0x2E80 <= o <= 0x9FFF) or (0xF900 <= o <= 0xFAFF) or (0xFF00 <= o <= 0xFFEF) or (0x3000 <= o <= 0x303F)


def main() -> None:
    text = Path(sys.argv[1]).read_text(encoding="utf-8")
    out_css = Path(sys.argv[2])
    used = set(text) | set(EXTRA)
    latin = "".join(sorted(ch for ch in used if not is_cjk(ch) and ord(ch) >= 0x20))
    cjk = "".join(sorted(ch for ch in used if is_cjk(ch)))
    blocks, credits = [], []
    total = 0
    for family, weight, style, fname, keep_cjk in FACES:
        font = TTFont(ROOT / fname)
        credit = relabel(font, family)
        if credit not in credits:
            credits.append(credit)
        opts = subset.Options()
        opts.flavor = "woff2"
        opts.layout_features = ["*"]
        opts.name_IDs = ["*"]
        opts.notdef_outline = True
        opts.hinting = False
        sub = subset.Subsetter(opts)
        sub.populate(text=latin + (cjk if keep_cjk else ""))
        sub.subset(font)
        buf = io.BytesIO()
        font.flavor = "woff2"
        font.save(buf)
        data = buf.getvalue()
        total += len(data)
        b64 = base64.b64encode(data).decode("ascii")
        blocks.append(
            "@font-face{font-family:'%s';font-weight:%d;font-style:%s;font-display:block;"
            "src:url(data:font/woff2;base64,%s) format('woff2')}" % (family, weight, style, b64)
        )
        print(f"  {fname:32s} {len(data)/1024:8.1f} KB")
    head = ["/* Embedded fonts (subsets), each under the SIL Open Font License 1.1 (" + OFL_URL + "); full texts in LICENSES/fonts/."]
    head += ["   " + c.replace("*/", "* /") for c in credits] + ["*/"]
    out_css.write_text("\n".join(head + blocks), encoding="utf-8")
    print(f"  fonts total {total/1024:.1f} KB, CJK glyphs {len(cjk)}")


if __name__ == "__main__":
    main()
