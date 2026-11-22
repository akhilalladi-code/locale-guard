# LocaleGuard

**Catch translation issues before they ship.** LocaleGuard is a local-first preflight tool for comparing nested JSON locale files. It checks translation coverage, empty values, interpolation placeholders, HTML tags, line breaks and potentially risky text expansion—without uploading your copy.

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![Runtime: Node 20+](https://img.shields.io/badge/Node.js-20%2B-43853d.svg)
![Dependencies: none](https://img.shields.io/badge/runtime%20dependencies-none-2f6f56.svg)

## Why LocaleGuard?

A translation can be grammatically correct and still break an interface: a `{name}` token gets renamed, a closing HTML tag disappears, a string is left empty, or a longer translation no longer fits its button. LocaleGuard provides a repeatable technical check before a localization change is merged or released.

## Features

- Compare one source locale against any number of target JSON files.
- Flatten nested objects into stable dot-path keys; array strings use `[index]` paths.
- Report missing keys, empty translations and target-only keys.
- Compare common interpolation forms: `{name}`, `{{name}}`, ICU-style `{count, plural, ...}`, printf tokens and `:name` placeholders.
- Compare HTML tag counts and line-break counts.
- Flag text expansion using a configurable ratio and absolute character limit.
- Filter findings by error, warning or informational severity.
- Export JSON, CSV and Markdown reports.
- Load the included English, Telugu and Hindi sample files.
- Responsive, dependency-free interface. Files are processed in memory and are not saved or sent to a server.

## Quick start

Requirements: Node.js 20 or newer.

```bash
git clone https://github.com/akhilalladi-code/locale-guard.git
cd locale-guard
npm run dev
```

Open [http://127.0.0.1:4177](http://127.0.0.1:4177).

You can also serve the static folder with any local HTTP server. The included Node server uses only built-in modules.

## How to use

1. Export your source and translated messages as `.json` files.
2. Drop or select all files in LocaleGuard. Nested JSON is supported.
3. Choose the source locale by selecting its radio button in the locale list.
4. Set the text-expansion ratio and maximum target-character threshold if needed.
5. Select **Run translation preflight**.
6. Filter findings, inspect the source and target strings, and export a JSON, CSV or Markdown report.

The sample set demonstrates English-to-Telugu and English-to-Hindi checks. It intentionally contains a few issues in Hindi so you can see how findings are reported.

## Supported input

Locale files must be UTF-8 JSON objects containing string values, nested objects or arrays of those values. Arrays are flattened using numeric path segments. Non-string leaves are skipped and reported as input diagnostics in the core API; a file with no translatable string values is rejected.

Example:

```json
{
  "account": {
    "welcome": "Welcome, {name}",
    "items": "{count, plural, one {# item} other {# items}}"
  }
}
```

The key paths become `account.welcome` and `account.items`.

## Checks and severity

| Check | Severity | Meaning |
|---|---|---|
| Missing key | Error | Source key is absent from the target file |
| Empty translation | Error | Target value is empty or whitespace-only |
| Placeholder mismatch | Error | Interpolation token sets differ |
| HTML markup mismatch | Warning | HTML tag counts differ |
| Line-break mismatch | Warning | Newline counts differ |
| Text expansion | Warning | Target exceeds the configured ratio or character limit |
| Extra key | Info | Target contains a key absent from the source |

These are deterministic heuristics, not a linguistic quality score. Placeholder parsing supports common token styles but is not a complete ICU MessageFormat parser. Markup checking compares tag counts, not DOM validity or attribute semantics. Text expansion is a layout-risk signal; it cannot know the actual width of a component or the font metrics used in your product.

## Quality checks

```bash
npm run check
```

The test suite uses Node's built-in test runner and has no third-party dependencies.

## Privacy

- Locale JSON is read in the current browser tab and processed locally.
- The application has no upload endpoint, analytics, account, API key or backend.
- Imported data is not written to localStorage or IndexedDB.
- Exported reports are created locally by your browser.

Do not load untrusted files into a browser you use for sensitive work. LocaleGuard treats JSON as data and does not execute imported strings as HTML.

## Scope and limitations

LocaleGuard does not translate text, assess grammar or cultural suitability, validate locale-specific plural rules, render your actual application, measure real component widths, or guarantee that a release is ready. Always review translations with qualified language reviewers and test the UI at real breakpoints, font settings and text directions. Right-to-left visual testing is not included in this MVP.

## License

MIT. See [LICENSE](LICENSE).
