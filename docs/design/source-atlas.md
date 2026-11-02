# Source Atlas — first operator slice

Owning work: WB-DESIGN-001 #2 and WB-SHELL-001 #3. Selected visual: displayed ideation option 2. Eddie liked options 2 and 3 and delegated the final choice; Source Atlas was chosen for its enduring source-ledger/inspector workspace. No composite/new ideation was substituted for that selection.

## Research that changed the design

Public UX references were checked on October 30, 2026; no authenticated vendor workspace, copied source, or proprietary asset was used.

| Reference | Observed pattern | Workbench consequence |
| --- | --- | --- |
| [OpenSEO](https://openseo.so/features/site-audit) | Site context and exact affected-URL rows within one workspace | Persistent site/snapshot context and an exact-source drill-down |
| [KWHero](https://kwhero.com/) | Grouped prompt rows expand into provider answers and exact source context | Grouped evidence rows plus a persistent inspector; no blended score or ranking |
| [NotiQ](https://notiq.io/) | Public material separates finding, verifying, drafting, sending | Keep states explicitly named; authenticated gate UX was not verified. Accepted G.A.S. semantics, not NotiQ, govern request/record distinction |

## Actual product boundary

The reviewed #4 decoder/fixtures landed after ideation. Product consumes the existing `decodeWorkbenchProjection(...)` path without modifying `src/engine/**`. Source semantics, IDs, reasons, source counts, periods, human context and limitations come from that seam. Mock data is not a competing projection contract.

Quiet is zero supplied Attention with ready supplied modules, not a universal health/no-action conclusion. Limited is `current:coverage_partial`, not the mock's invented window mismatch. Human review is the accepted Page Focus candidate with an explicit separate SERP/result-validation ceiling. The supplied investigate statement is labelled separately from local draft preparation and does not imply canonical persistence.

## Exercised foundations and patterns

Manrope is locally hosted, with Tidal navy/teal/oyster/soft-white tokens, muted text, readiness tones, copper focus, 4/8px spacing rhythm and restrained radii. Shared `Icon`, `Badge`, `Notice` and `Facts` primitives serve grouped rows, inline details, native disclosure, status/filter announcements, a modal details surface, empty/error/loading states and labelled draft fields. Hover, focus, selected, unavailable and human/provider origin states carry text, not color alone.

The rail is navigation, never a completion funnel. Only Home, Evidence, Attention and Decision act as destinations. Measurement and Report are explicitly unavailable status presentations. No router, state framework, UI framework, charting, backend or provider SDK is added.

## Interaction contract

- Home explains the current supplied state and review ceiling.
- Evidence filters readiness/module/source identity without changing the projection. A source can stay selected even while filtered out; clearing filters restores its row. Missing modules remain inspectable through disclosure or the state filter.
- Source detail close returns focus to the opening/selected row, with filter input fallback when that row is no longer available. Modal Tab/Shift-Tab is contained and Escape returns focus to the opener.
- Attention selection retains exact identity through evidence inspection and draft preparation.
- Draft text is isolated by fixture plus selected Attention ID, retained in tab memory, and never written to browser storage or the engine.
- Preparing a review note produces a clearly non-executable plain-text handoff, not an engine action JSON contract. Download preserves workspace, version, scope, site/tenant/target, timestamps, exact references, the supplied review ceiling and human rationale. A human/trusted-host process would be separate later work.
- HTTP(S) evidence links reject credential-bearing or executable URLs; exact text still renders escaped and wraps.

## Validation and known gates

See `source-atlas-qa.md`. Component/behavior checks cover the three accepted fixtures, exact provenance, human authority, selection identity, filter nonmutation, bounded drafts, unsafe links and escaped long references. Browser proof covers keyboard activation, focus return/containment, validation, real .txt download and 1280/834/390/320 viewport layouts. Native browser zoom percentage remains unverified because cloud-browser shortcuts had no observable effect.

A concurrent draft PR #10 now owns another first-shell candidate. This selected-design branch does not rewrite or accept it. ORCH must consolidate the candidates before acceptance. Baseline maintenance #11 reports minimatch audit failures; no audit policy/dependency change belongs to this product candidate. Under Eddie's explicit gate, no new product PR is opened until local audit is green.

Figma file scaffold: https://www.figma.com/design/GLlxeg5jfdJKt6Ly9c9MB6 . The Starter MCP limit was reached before editable assets could be populated. This is an empty file scaffold, not a completed design system. No upgrade/spend was authorized or performed.

Cost: $0 incremental / included. Synthetic/public-safe only. No provider call, credential/OAuth/backend/database/AI/scheduler/customer payload, production deployment, merge, or repository-governance change.
