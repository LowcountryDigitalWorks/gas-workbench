# G.A.S. Workbench

G.A.S. Workbench is the evergreen operator product for Lowcountry Digital Works' Growth Automation System.

## Repository boundary

- **`gas-workbench` owns product experience:** application shell, design system, module composition, interaction, accessibility, and presentation of supplied G.A.S. state.
- **`gas-engine` owns semantic truth:** evidence normalization, provenance, missingness, compatibility/comparability, analysis, human decision state, measurements/outcomes, and claim ceilings.
- Workbench must not recreate provider semantics, infer unsupported priority/business value, or silently coerce incompatible engine data.

The first milestone is intentionally synthetic/public-safe. It does not connect to provider APIs, OAuth, customer data, a backend, or runtime AI.

## Stack

- Node.js 24.22.2
- npm 11.x
- React 19
- Vite 8
- TypeScript 7
- Vitest
- ESLint

## Local development

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run check
npm run dev
```

`npm run check` runs type checking, linting, tests, and a production build.

## Product structure

```text
src/
  app/            application shell and module composition
  design-system/  shared tokens, components, and interaction patterns
  modules/        bounded product modules as they earn implementation
  engine/         future versioned boundary to accepted engine projections
```

Modules begin as feature directories, not separate packages or repositories. Extract only when a real second consumer or materially different runtime/security lifecycle justifies it.

## Design principles

- command center, not a wall of dashboards;
- progressive disclosure over information overload;
- factual state and legitimate next action over opaque scoring;
- provenance, freshness, missingness, and uncertainty visible when decision-relevant;
- human-authored decisions and outcomes visually distinct from provider/machine evidence;
- accessibility and responsive behavior are release conditions.

See `docs/architecture.md` and the owning GitHub issues for current authority. Live repository state overrides historical chat context.
