import { registeredModules } from './moduleRegistry'

const boundaries = [
  ['Product', 'Workbench owns application experience and interaction.'],
  ['Semantics', 'gas-engine remains authoritative for evidence meaning and comparability.'],
  ['Data', 'Synthetic/public-safe fixtures only in the bootstrap milestone.'],
  ['Cost', '$0 / included-only foundation; no provider or AI runtime.'],
] as const

export function App() {
  return (
    <div className="workbench-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <aside className="app-nav" aria-label="G.A.S. Workbench navigation">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true">G</span>
          <div>
            <p className="brand-kicker">Lowcountry Digital Works</p>
            <p className="brand-name">G.A.S. Workbench</p>
          </div>
        </div>

        <nav aria-label="Available modules">
          {registeredModules.map((module) => (
            <a className="nav-item nav-item-active" href="#home" key={module.id}>
              <span>{module.label}</span>
              <small>{module.description}</small>
            </a>
          ))}
        </nav>

        <div className="nav-footer">
          <span className="status-dot" aria-hidden="true" />
          Foundation workspace
        </div>
      </aside>

      <main id="main-content" className="workspace" tabIndex={-1}>
        <header className="workspace-header" id="home">
          <div>
            <p className="eyebrow">Workbench foundation</p>
            <h1>One product surface. One semantic source of truth.</h1>
            <p className="lede">
              The Workbench can now evolve independently while G.A.S. engine semantics stay deterministic and reviewable.
            </p>
          </div>
          <span className="pill pill-neutral">Synthetic only</span>
        </header>

        <section aria-labelledby="boundary-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Current boundary</p>
              <h2 id="boundary-title">Foundation contract</h2>
            </div>
            <p>No provider calls, customer data, runtime AI, or inferred scoring.</p>
          </div>

          <div className="boundary-grid">
            {boundaries.map(([label, detail]) => (
              <article className="boundary-card" key={label}>
                <p className="card-label">{label}</p>
                <p>{detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="next-slice" aria-labelledby="next-title">
          <div>
            <p className="eyebrow">Next product slice</p>
            <h2 id="next-title">Design system → shell → trusted engine projection</h2>
          </div>
          <p>
            New modules enter navigation only when they implement useful behavior. The first vertical slice will connect Home, Evidence, and Attention using a versioned public-safe fixture.
          </p>
        </section>
      </main>
    </div>
  )
}
