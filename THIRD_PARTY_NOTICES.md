# Third-party notices

The site's own code (HTML, CSS, JavaScript and the scripts in `tools/`) is under the MIT License in [LICENSE](LICENSE). The following parts come from others.

| What | Where | License |
|---|---|---|
| Geist and Geist Mono fonts, © 2023 Vercel in collaboration with basement.studio | `fonts/Geist-Variable.woff2`, `fonts/GeistMono-Variable.woff2` | SIL Open Font License 1.1, [fonts/LICENSE-Geist.txt](fonts/LICENSE-Geist.txt) |
| Pretendard, © 2021 Kil Hyung-jin, with Reserved Font Name "Pretendard" | `fonts/hangul-subset.woff2` | SIL Open Font License 1.1, [fonts/LICENSE-Pretendard.txt](fonts/LICENSE-Pretendard.txt) |
| thinking-orbs, © 2026 Jakub Antalik (the orb shapes redrawn in `js/orbs.js`) | `js/orbs.js` | MIT, [licenses/LICENSE-thinking-orbs.txt](licenses/LICENSE-thinking-orbs.txt) |

`fonts/hangul-subset.woff2` is a modified version of Pretendard. It keeps only the Hangul and symbols the page uses, built with `tools/build-fonts.py`. Because "Pretendard" is a Reserved Font Name, the font is renamed "AHC Hangul" inside the file and in the CSS. Its copyright, trademark and license entries are unchanged.

The Claude, OpenAI and Antigravity marks in `assets/agents/` appear only in the drawings of the app's screen. They identify which agent a row belongs to, as in the app itself. Claude, Codex, Gemini and Antigravity are trademarks of their respective owners. This is an independent open-source project, not affiliated with Anthropic, OpenAI or Google.
