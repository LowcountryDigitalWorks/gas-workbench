# G.A.S. Workbench

G.A.S. Workbench is Lowcountry Digital Works' operator product for the **Generative / Answer / Search** (G.A.S.) intelligence program.

**Current status:** The synthetic/public-safe operator frontend is accepted through [Workbench PR #27](https://github.com/LowcountryDigitalWorks/gas-workbench/pull/27). The original Source Atlas, Visibility, Technical, Measure / Outcomes, Reports, and LDW-internal Sites / Portfolio slices are implemented. This is **not** an authorized live provider integration, customer portal, production service, or autonomous recommendation engine.

## Product and semantic ownership

- **`gas-workbench` owns UX:** shell, Tidal design system, feature composition, navigation, accessible interactions, local report preview/export, and strict consumption of supplied checked projections.
- **[`gas-engine`](https://github.com/LowcountryDigitalWorks/gas-engine) owns semantic truth:** normalized evidence, provenance, missingness, comparisons, Attention inputs, human decisions, measurement/outcomes, and claim ceilings. Release 0.24 is the accepted semantic baseline; the UI does not reserve another engine release.
- **Providers and WQT own sensing:** Workbench modules do not fetch provider APIs, run crawlers, execute SEO changes, manage credentials, or create a competing evidence/priority system.

## Implemented operator destinations

Home, Visibility, Technical, Evidence, Attention, Decision, Measure / Outcomes, Reports, and **Sites / Portfolio** are registered in `src/app/moduleRegistry.ts`. These destinations consume checked synthetic/public-safe state and preserve exact site/scope/target and evidence references. The Portfolio view is explicitly **LDW internal**, not a customer-facing comparison/ranking dashboard.

`discover` is a reserved module ID but **not** a registered destination. Implementation requires a separate accepted operator-value trigger and bounded issue; it must not clone keyword research, crawlers, provider dashboards, or auto-content-generation tools.

The shell consumes `ldw.gas-workbench-projection.v1` (minor 0). Feature-specific checked projections for Visibility, Technical, Measurement, Reports, and Portfolio live under `src/engine/`; they do not silently extend or reinterpret the shell/engine contracts. See [engine boundary](src/engine/README.md) and [architecture](docs/architecture.md).

## Toolchain and validation

Use Node.js **24.22.2** and npm **11.x** (package manager declared as npm 11.19.1). From a clean checkout:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run check
npm audit
git diff --check
```

`npm run check` runs TypeScript, strict ESLint, Vitest, and a Vite production build. `npm run dev` serves the local synthetic UI. A passing build does **not** grant production deployment or customer-data authority.

The temporary root `minimatch` override is tracked under [#14](https://github.com/LowcountryDigitalWorks/gas-workbench/issues/14); do not remove it until a supported parent toolchain resolves a fixed line and the full audit remains clean.

## Code map

- `src/app/` — application shell, module registry, feature-load coherence and scenarios.
- `src/design-system/` — shared Tidal tokens, primitives and formatting.
- `src/modules/` — real feature components and behavioral tests.
- `src/engine/` — checked JSON projection decoders, integrity gates and synthetic fixtures.
- `docs/design/` — historical Source Atlas design/QA evidence (not current deployment or acceptance authority).

The [evergreen Workbench roadmap, #8](https://github.com/LowcountryDigitalWorks/gas-workbench/issues/8) governs sequencing. Live GitHub source, exact issues/PRs and [`AGENTS.md`](AGENTS.md) override older documentation or chat summaries.

## Safety and release discipline

No provider/API calls, production backend, database, OAuth, runtime AI, persistent customer data, new schedules, account mutation, or paid capacity are authorized by this frontend. Missing evidence never becomes observed zero; provider comparisons and human decisions remain source-qualified. Changes use a bounded issue, branch, PR, deterministic checks, and independent exact-head review before merge.
