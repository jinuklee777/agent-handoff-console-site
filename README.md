# Agent Handoff Console — website

The landing page for [Agent Handoff Console](https://github.com/jinuklee777/agent-handoff-console), a macOS app that runs Claude Code, Codex and Antigravity side by side and hands a conversation from one agent to another.

It is a single static page in English and Korean: `index.html`, plus `styles.css` and `relay.css`, the scripts in `js/`, and `fonts/` and `assets/`. There is no build step. The app screens on the page are redrawn in HTML from the real app, not screenshots.

## Preview

```bash
python3 -m http.server 4325
```

Then open http://localhost:4325. Add `?lang=ko` or `?lang=en` to pick a language, and `?motion=reduce` to check the page with reduced motion.

## After editing

- **New Korean text:** rebuild the Hangul subset font. Otherwise the new characters fall back to the system font. You need the original `PretendardVariable.woff2` from the [Pretendard releases](https://github.com/orioncactus/pretendard/releases), and `pip install fonttools brotli`.
  ```bash
  python3 tools/build-fonts.py /path/to/PretendardVariable.woff2
  ```
- **Any change to text, scripts, styles or fonts:** re-stamp the asset URLs with content hashes, so browsers don't mix a new `index.html` with cached old scripts. The script gives the same result however many times it runs.
  ```bash
  python3 tools/stamp-assets.py
  ```

## Publishing

The page works from any static host, for example GitHub Pages from the repository root. The share-preview tags (`og:image`, `twitter:image`) use relative paths for now. Once the address is final, change them to absolute URLs and add `og:url`; the HTML comment near the top of `index.html` marks the place.

## License

The site's code is MIT ([LICENSE](LICENSE)). Fonts and other third-party parts are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
