# Changelog

## 0.1.0 — 2026-05-23

Initial release.

### Added

- `cloak` — generate anonymized shadow schema + local mapping dictionary
- `reveal` — restore original domain names from AI output locally
- `translate` — convert original names to shadow names before sharing
- `inspect` — print the anonymization dictionary
- `check` — CI guard that fails if shadow schema leaks original identifiers
- `demo` — guided walkthrough of the full workflow
- `--watch` flag on `cloak` for live re-generation
- stdin piping support on `reveal` and `translate`
- Multi-file Prisma schema directory support
- GitHub Actions CI workflow
