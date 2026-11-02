# Source Atlas design QA

final result: passed

## Visual target and scope

Selected displayed ideation option 2, Source Atlas, chosen by the executor after Eddie explicitly delegated the choice between options 2 and 3. Source visual: `/workspace/scratch/771878c33930/generated_images/exec-3e557040-a434-4c73-81b8-7f9bf4088af7.png` (1487 × 1058), also Library `libfile_d23a02a9e9608191b36fbf5af9ffb23f`.

Prototype: `/workspace/scratch/771878c33930/gas-prototype`. Local cloud preview; no hosted or production deployment.

Code/fixture baseline: gas-workbench main `85ff099db357720967be8ed3a7bc324128a3f2ea`, tree `60be8c153659847cfbb78a0aeed1bd1092aaaf2d`. The accepted projection seam landed after ideation. Its actual quiet/limited/human-review fixtures replace the mock's illustrative WQT/AI rows, dates, source counts, comparison, and fake demo IDs. No source-window comparison, observed technical zero, or no-action result is invented. The quiet fixture's zero Attention is expressly not site health or proven absence.

## Comparison evidence

- Browser capture: `qa-evidence/desktop-limited.jpg` (1363 × 936 outer capture, containing 1280 × 900 iframe; content width 1265 excluding scrollbar).
- Full comparison: `qa-evidence/desktop-comparison.jpg`. Source proportionally normalized to 1280 × 910; implementation crop is the matching 1280 × 900 app viewport at density 1. The 10px height difference is disclosed, not treated as design drift. Both are the Evidence view, limited fixture, light theme, expanded source inspector.
- Focused comparison: `qa-evidence/focused-inspector.jpg`, source/detail-region crops together, allowing readable checks of title, state notice, exact identity, and source facts. Source content intentionally differs where accepted fixtures supersede illustrative data.
- Additional browser evidence: `narrow-draft.jpg` (390 × 844 iframe), `tablet-evidence.jpg` (834 × 1194), `minimum-width.jpg` (320 × 844), and `long-reference.jpg` (390 × 844). Screenshots include surrounding browser viewport; iframe region is the scoped product surface.

## Comparison history and fixes

1. Initial blocked findings: [P2] keyboard navigation could scroll away from the workspace header; [P2] showing all missing modules before the supplied source obscured the useful source; [P2] native dialog Tab handling did not retain focus on its only control; [P2] the human-review validation caveat needed to appear before deep provenance. Fixed heading focus with preventScroll, grouped missing modules in an inspectable disclosure, explicitly looped dialog Tab/Shift-Tab, and promoted exact supplied caveats into Home and the inspector. The later browser screenshots and keyboard checks show those fixes. Browser focus actions can still scroll naturally to a control; Ctrl+Home returns to the header.
2. Minimum-width check removed a 320px body minimum that would overflow a 320px viewport with a classic scrollbar. Later browser measurement: width 305, scrollWidth 305. No hidden content or horizontal page overflow.
3. Post-fix comparison: no actionable P0/P1/P2 differences remain. The selected hierarchy, flat ledger/inspector split, restrained Tidal surfaces, and grouped source rows remain intact. Accepted fixture semantics supersede illustrative mock content.

## Required fidelity surfaces

- Typography: locally hosted Manrope, regular through extra-bold; readable 15px base, 32px page title, 25–28px inspector headings, smaller supporting labels, wrapping monospace references. Minor differences from generated type outlines are P3. No clipped authoritative text.
- Layout rhythm: fixed compact workflow navigation, persistent site identity, source ledger and inspector separated by one divider; 4/8px spacing rhythm; minimal 4–6px radii; no dashboard card grid or gradients. Tablet retains split view; narrow screens stack it in DOM order. No progress/completion funnel.
- Colors/tokens: exact Tidal foundation. Calculated WCAG contrast: navy/white 14.85:1; muted/white 6.09:1; white/teal 5.33:1; muted/oyster 5.31:1; ready label 6.29:1; limited label 6.14:1; copper focus/white 6.18:1. Status labels carry words as well as color.
- Assets: genuine Tabler outline icons, vendored with MIT notice; locally hosted Manrope with OFL notice. No handwritten SVG, rasterized complete interface, fake illustration, remote font dependency, or new runtime dependency. The wordmark is actual text; the mock's decorative G badge is omitted (acceptable P3).
- Copy/content: source identities, periods, readiness reasons, history, authority notes, selected references, and human decision context come from the canonical decoded fixture. Human draft labels are separate and never claim engine persistence. Unknown comparability remains explicitly not supplied.

## Browser interaction and accessibility proof

Cloud-browser controls used Enter/Tab/Escape and text entry to exercise the quiet Home → manifest inspection, limited Home → exact `current:coverage_partial` reason/identity, and human Home → Attention → linked Page Focus evidence → selected Attention → draft/error/prepare/download/return flow. Empty filters announce zero matching modules and can be cleared without modifying data. Detail close returns focus to its source button after the animation frame. Snapshot dialog Tab is contained; Escape closes and returns focus to its opener. Draft field is labelled, invalid input is announced, and rationale/refs survive navigation. A real .txt download was verified in the shared filesystem; the browser download-event waiter timed out independently of the successful download.

Read-only DOM measurements: 834 frame has width/scrollWidth 819/819; 390 frame 375/375; 320 frame 305/305. A 450-character synthetic URL in a test-only derived projection wraps with width/scrollWidth 375/375. No engine fixture was edited for this proof.

Console review found no application errors. The browser extension emitted metadata-delivery errors; these are tool/environment messages, not product exceptions.

## Limits / follow-up polish

- Actual browser zoom shortcuts did not change the cloud browser's reported CSS viewport. Native zoom percentage is unverified; 320px reflow and larger-type layout resilience are the available evidence. Do not claim a completed 200% browser-zoom check.
- Full-page and clipped screenshot APIs timed out; ordinary viewport screenshots succeeded. Visual QA uses those genuine browser captures.
- This is browser/component proof, not screen-reader certification. Independent accessibility review remains appropriate before acceptance.
- Small labels and exact text-outline differences remain P3. No blocked substantive visual finding remains.

## Implementation checklist

Transfer only app/design-system/modules and locally licensed assets to a fresh branch from current main. Reuse the accepted decoder/fixtures unchanged. Run the full prescribed suite and inspect the complete diff before PR. Do not self-accept, merge, deploy, or modify repository governance.

## Final repository transfer verification

The same app/design-system/modules were transferred to `feat/wb-source-atlas-slice` from current main. Formatting helpers were split to satisfy the existing React Refresh lint rule; the module registry now lists the four implemented destinations. Draft memory is keyed by fixture plus exact selected Attention ID. The source-detail focus fallback covers entry from Home and a filtered-away opener. Ready-module prose is derived from supplied readiness entries.

The actual Vite 8 repository build was opened in the cloud browser. Quiet Home, limited-source inspection/focus return, and Human review → exact evidence → linked Attention → prepared local note were checked again. `qa-evidence/repository-final.jpg` is the actual repository build, not a mock or the earlier prototype.

Local locked install, typecheck, lint, 33 tests, build, `npm run check`, and `git diff --check` pass. Package manifest/lockfile and `src/engine/**` are unchanged. `npm audit` fails with 12 moderate existing minimatch/toolchain findings, GHSA-g3hv-75wg-m249, matching baseline #11. This is a publication/acceptance hold; a new PR is not opened under Eddie's explicit green-validation gate. Concurrent draft PR #10 is left untouched for ORCH consolidation. No hosted candidate CI is claimed.

Figma scaffold `https://www.figma.com/design/GLlxeg5jfdJKt6Ly9c9MB6` exists, but the Starter MCP tool limit blocked editable population. It is not a completed design file. No paid upgrade was attempted.
