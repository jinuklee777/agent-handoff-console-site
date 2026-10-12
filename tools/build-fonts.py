#!/usr/bin/env python3
"""페이지에 쓰인 한글(과 Geist 에 없는 기호)만 남긴 Pretendard 를 fonts/hangul-subset.woff2 로 만든다.

라틴 글자는 Geist · Geist Mono 가 맡고, 이 글꼴은 styles.css 의 @font-face unicode-range 로
한글 · 한글 문장 부호 · Geist 에 없는 기호(⌘ ⌃ ⌥ ↺ ✓ ※ 등)에만 쓰인다.

글을 고친 뒤에는 다시 실행한다 (새 한글이 빠지면 그 글자만 시스템 글꼴로 보인다).

    python3 tools/build-fonts.py <PretendardVariable.woff2 경로>
    PRETENDARD_FONT=<경로> python3 tools/build-fonts.py

원본은 https://github.com/orioncactus/pretendard 의 릴리스에 있는 PretendardVariable.woff2 다.
필요한 것: fonttools, brotli (pip install fonttools brotli)

Pretendard 는 SIL OFL 1.1 이고 "Pretendard" 가 예약된 글꼴 이름(Reserved Font Name)이다. 글자를 덜어 낸 이 파일은
수정본이라 그 이름을 쓸 수 없으므로, 글꼴 안의 이름을 "AHC Hangul" 로 바꾼다 (저작권 · 상표 · 라이선스 줄은 그대로 둔다).
라이선스 전문은 fonts/LICENSE-Pretendard.txt.
"""
import html
import os
import pathlib
import re
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

SITE = pathlib.Path(__file__).resolve().parent.parent
OUT = SITE / "fonts" / "hangul-subset.woff2"
RENAMED_FAMILY = "AHC Hangul"
# 이름 표에서 그대로 둘 줄: 저작권(0) · 상표(7) · 만든 곳(8) · 디자이너(9) · 라이선스(13 · 14) — 출처를 밝히는 줄이다.
KEEP_NAME_IDS = {0, 7, 8, 9, 13, 14}
GEIST = SITE / "fonts" / "Geist-Variable.woff2"

# styles.css 의 unicode-range 와 맞춘다 — 이 범위 밖의 글자는 넣어도 쓰이지 않는다.
RANGES = [
    (0x1100, 0x11FF),  # 한글 자모
    (0x2000, 0x206F),  # 일반 문장 부호 (※ 등 — Geist 에 있는 것은 Geist 가 먼저 쓰인다)
    (0x2190, 0x21FF),  # 화살표 (↺ 등)
    (0x2300, 0x23FF),  # ⌘ ⌃ ⌥
    (0x2460, 0x24FF),  # ① ②
    (0x25A0, 0x25FF),  # 도형
    (0x2700, 0x27BF),  # ✓
    (0x3000, 0x303F),  # 한중일 문장 부호
    (0x3130, 0x318F),  # 한글 호환 자모
    (0xAC00, 0xD7AF),  # 한글 음절
    (0xFF00, 0xFFEF),  # 전각 문장 부호
]


def in_ranges(c: str) -> bool:
    o = ord(c)
    return any(lo <= o <= hi for lo, hi in RANGES)


def page_text() -> str:
    parts = [(SITE / "index.html").read_text(encoding="utf-8")]
    for js in sorted((SITE / "js").glob("*.js")):
        parts.append(js.read_text(encoding="utf-8"))
    text = "".join(parts)
    # HTML 개체(&#4352; · &middot; …)로 쓴 글자도 넣는다
    text += html.unescape("".join(re.findall(r"&#?\w+;", text)))
    return text


def rename(font: TTFont) -> None:
    """예약된 글꼴 이름(Pretendard)을 RENAMED_FAMILY 로 바꾼다 — 이름 · 전체 이름 · PostScript 이름 · 인스턴스 이름."""
    ps = RENAMED_FAMILY.replace(" ", "")
    for record in font["name"].names:
        if record.nameID in KEEP_NAME_IDS:
            continue
        text = record.toUnicode()
        if "Pretendard" not in text:
            continue
        text = text.replace("Pretendard Variable", RENAMED_FAMILY).replace("PretendardVariable", ps)
        record.string = text.replace("Pretendard", RENAMED_FAMILY)
    left = [r.nameID for r in font["name"].names if r.nameID not in KEEP_NAME_IDS and "Pretendard" in r.toUnicode()]
    if left:
        sys.exit(f"이름 표에 예약된 이름이 남았다: nameID {sorted(set(left))}")


def main() -> None:
    arg = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("PRETENDARD_FONT", "")
    if not arg:
        sys.exit("원본 글꼴 경로를 인수나 PRETENDARD_FONT 로 주세요 (PretendardVariable.woff2).")
    src = pathlib.Path(arg).expanduser()
    if not src.exists():
        sys.exit(f"글꼴을 찾지 못했습니다: {src}")
    geist = TTFont(GEIST).getBestCmap()
    font = TTFont(src)
    cmap = font.getBestCmap()

    used = {c for c in page_text() if in_ranges(c)}
    hangul = {c for c in used if 0xAC00 <= ord(c) <= 0xD7AF or 0x1100 <= ord(c) <= 0x11FF or 0x3130 <= ord(c) <= 0x318F}
    # 한글이 아닌 기호는 Geist 에 없고 Pretendard 에 있는 것만 넣는다
    symbols = {c for c in used - hangul if ord(c) not in geist and ord(c) in cmap}
    missing = sorted(c for c in used - hangul if ord(c) not in geist and ord(c) not in cmap)
    chars = hangul | symbols

    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.notdef_outline = True
    subsetter = subset.Subsetter(options)
    subsetter.populate(text="".join(sorted(chars)))
    subsetter.subset(font)
    rename(font)
    font.flavor = "woff2"
    OUT.parent.mkdir(exist_ok=True)
    font.save(OUT)

    print(f"{OUT.relative_to(SITE.parent)}: 한글 {len(hangul)}자 + 기호 {len(symbols)}개 "
          f"({''.join(sorted(symbols))}), {OUT.stat().st_size / 1024:.0f} KB")
    if missing:
        print("어느 글꼴에도 없는 기호 (시스템 글꼴로 보인다 — 가능하면 SVG 로):", " ".join(missing))


if __name__ == "__main__":
    main()
