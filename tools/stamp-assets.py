#!/usr/bin/env python3
"""스타일 · 스크립트 · 글꼴 주소에 내용 해시를 꼬리표로 붙인다 (`styles.css?v=1a2b3c4d`).

브라우저는 같은 주소의 파일을 캐시에서 다시 쓴다. 꼬리표가 없으면 index.html 만 새로 받고 스크립트는 예전 것을 써서
고친 내용이 반만 보인다 (2026-10-11 — 영어 시연이 고정 글만 영어로 보였다). 파일이 바뀌면 해시가 바뀌므로 주소가 바뀌고, 브라우저가 새로 받는다.

글을 고치거나 글꼴을 다시 만든 뒤(tools/build-fonts.py) 이 스크립트를 돌린다:  python3 tools/stamp-assets.py
"""
import hashlib, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent

def digest(rel):
    return hashlib.sha1((ROOT / rel).read_bytes()).hexdigest()[:8]

def stamp(text, pattern, attr_group=1):
    def sub(m):
        rel = m.group(attr_group)
        return m.group(0).replace(m.group(attr_group) + (m.group(attr_group + 1) or ''), rel + '?v=' + digest(rel))
    return re.sub(pattern, sub, text)

# 1) 스타일시트 안의 글꼴 · 그림 주소 (먼저 — 스타일시트의 해시가 이것을 따라 바뀐다)
for css in ['styles.css', 'relay.css']:
    p = ROOT / css
    s = p.read_text(encoding='utf-8')
    s2 = stamp(s, r'url\("((?:fonts|assets)/[^"?]+\.(?:woff2|svg|webp|png))(\?v=[0-9a-f]+)?"\)')
    if s2 != s:
        p.write_text(s2, encoding='utf-8')

# 2) index.html 의 스타일시트 · 스크립트 · 미리 읽는 글꼴
p = ROOT / 'index.html'
s = p.read_text(encoding='utf-8')
s = stamp(s, r'<link rel="stylesheet" href="([^"?]+\.css)(\?v=[0-9a-f]+)?"')
s = stamp(s, r'<script src="(js/[^"?]+\.js)(\?v=[0-9a-f]+)?"')
s = stamp(s, r'<link rel="preload" href="(fonts/[^"?]+\.woff2)(\?v=[0-9a-f]+)?"')
p.write_text(s, encoding='utf-8')
print('\n'.join(re.findall(r'(?:href|src)="((?:js|fonts)/[^"]+\?v=[0-9a-f]+|[a-z]+\.css\?v=[0-9a-f]+)"', s)))
