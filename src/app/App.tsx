import { useState } from 'react'
import type {
  WorkbenchAttentionItem,
  WorkbenchEvidenceRow,
  WorkbenchProjection,
  WorkbenchReadinessEntry,
  WorkbenchSourceManifestEntry,
} from '../engine/projection'
import {
  WORKBENCH_SCENARIO_KEYS,
  type WorkbenchScenarioKey,
  workbenchScenarios,
} from './scenarios'

type WorkspaceView = 'home' | 'evidence' | 'attention' | 'decision'

const workspaceViews: readonly Readonly<{
  id: WorkspaceView
  label: string
  description: string
}>[] = [
  { id: 'home', label: 'Home', description: 'Current state and evidence gates' },
  { id: 'evidence', label: 'Evidence', description: 'Sources, provenance, and exact rows' },
  { id: 'attention', label: 'Attention', description: 'Unranked human-review selections' },
  { id: 'decision', label: 'Decision', description: 'Prepared request and supplied human state' },
]

function displayToken(value: string): string {
  return value.replaceAll('_', ' ')
}

function displayTimestamp(value: string): string {
  return value.replace('T', ' ').replace('Z', ' UTC')
}

function stateClass(value: string): string {
  if (value === 'ready') return 'state-ready'
  if (value === 'limited') return 'state-limited'
  if (value === 'not_ready' || value === 'unavailable') return 'state-blocked'
  return 'state-neutral'
}

function StatusPill({ state }: { readonly state: string }) {
  return <span className={`status-pill ${stateClass(state)}`}>{displayToken(state)}</span>
}

function ReadinessList({ entries }: { readonly entries: readonly WorkbenchReadinessEntry[] }) {
  return (
    <div className="readiness-list">
      {entries.map((entry) => (
        <div className="readiness-row" key={entry.moduleId}>
          <div>
            <strong>{displayToken(entry.moduleId)}</strong>
            {entry.reasons.length > 0 ? (
              <p>{entry.reasons.map(displayToken).join(' · ')}</p>
            ) : null}
          </div>
          <StatusPill state={entry.state} />
        </div>
      ))}
    </div>
  )
}

function SourceCard({ source }: { readonly source: WorkbenchSourceManifestEntry }) {
  return (
    <article className="source-card">
      <div className="card-heading-row">
        <div>
          <p className="eyebrow">Release {source.release}</p>
          <h3>{displayToken(source.moduleId)}</h3>
        </div>
        <StatusPill state={source.readiness} />
      </div>
      <dl className="metadata-list">
        <div>
          <dt>Provider</dt>
          <dd>{source.providerIds.join(', ')}</dd>
        </div>
        <div>
          <dt>Identity</dt>
          <dd className="mono-wrap">{source.identity}</dd>
        </div>
        <div>
          <dt>Period</dt>
          <dd>
            {source.sourcePeriods.map((period) => `${period.start} → ${period.end}`).join(', ')}
          </dd>
        </div>
      </dl>
      {source.reasons.length > 0 ? (
        <div className="inline-notice" role="note">
          <strong>Interpretation limit</strong>
          <span>{source.reasons.map(displayToken).join(' · ')}</span>
        </div>
      ) : null}
    </article>
  )
}

function EvidenceCard({
  row,
  selected,
  onSelect,
}: {
  readonly row: WorkbenchEvidenceRow
  readonly selected: boolean
  readonly onSelect: () => void
}) {
  return (
    <button
      className={`evidence-card ${selected ? 'is-selected' : ''}`}
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="card-heading-row">
        <span>
          <span className="eyebrow">{displayToken(row.moduleId)}</span>
          <strong>{displayToken(row.kind)}</strong>
        </span>
        <span className="status-pill state-neutral">{displayToken(row.state)}</span>
      </span>
      <span className="mono-wrap evidence-identity">{row.evidenceIdentity}</span>
      {row.url ? <span className="mono-wrap">{row.url}</span> : null}
      {row.query ? <span>Query: {row.query}</span> : null}
    </button>
  )
}

function AttentionCard({
  item,
  selected,
  onSelect,
  onEvidence,
  onDecision,
}: {
  readonly item: WorkbenchAttentionItem
  readonly selected: boolean
  readonly onSelect: () => void
  readonly onEvidence: () => void
  readonly onDecision: () => void
}) {
  return (
    <article className={`attention-card ${selected ? 'is-selected' : ''}`}>
      <button className="attention-select" type="button" onClick={onSelect} aria-pressed={selected}>
        <span className="attention-order" aria-label={`Navigation order ${item.navigationOrder}`}>
          {item.navigationOrder}
        </span>
        <span>
          <span className="eyebrow">{displayToken(item.moduleId)}</span>
          <strong>{displayToken(item.originalKind)}</strong>
          <span>{displayToken(item.originalState)}</span>
        </span>
      </button>
      <div className="attention-actions">
        <button className="text-button" type="button" onClick={onEvidence}>
          View linked evidence
        </button>
        <button className="primary-button" type="button" onClick={onDecision}>
          Prepare decision request
        </button>
      </div>
    </article>
  )
}

function EmptyState({ title, detail }: { readonly title: string; readonly detail: string }) {
  return (
    <div className="empty-state" role="status">
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  )
}

function ContextPanel({
  projection,
  selectedAttentionId,
}: {
  readonly projection: WorkbenchProjection
  readonly selectedAttentionId: string | null
}) {
  const attention = projection.workspace.attention.find((item) => item.id === selectedAttentionId)
  const evidence = projection.workspace.evidenceRows.find((row) => row.id === selectedAttentionId)

  if (!attention && !evidence) {
    return (
      <aside className="context-panel" aria-label="Selected context">
        <p className="eyebrow">Selected context</p>
        <p>No evidence or Attention item is selected.</p>
      </aside>
    )
  }

  return (
    <aside className="context-panel" aria-label="Selected context">
      <p className="eyebrow">Selected context</p>
      <h3>{attention ? displayToken(attention.originalKind) : displayToken(evidence?.kind ?? '')}</h3>
      <dl className="metadata-list">
        <div>
          <dt>Reference</dt>
          <dd className="mono-wrap">{attention?.id ?? evidence?.id}</dd>
        </div>
        <div>
          <dt>Evidence identity</dt>
          <dd className="mono-wrap">{attention?.evidenceIdentity ?? evidence?.evidenceIdentity}</dd>
        </div>
        {attention?.identity.url || evidence?.url ? (
          <div>
            <dt>URL</dt>
            <dd className="mono-wrap">{attention?.identity.url ?? evidence?.url}</dd>
          </div>
        ) : null}
      </dl>
      {(attention?.readinessContext ?? evidence?.readinessContext ?? []).length > 0 ? (
        <div className="inline-notice" role="note">
          <strong>Readiness context</strong>
          {(attention?.readinessContext ?? evidence?.readinessContext ?? []).map((reason) => (
            <span key={reason}>{reason}</span>
          ))}
        </div>
      ) : null}
    </aside>
  )
}

export function LimitationsPanel({ limitations }: { readonly limitations: readonly string[] }) {
  const primaryLimitations = limitations.slice(0, 4)
  const additionalLimitations = limitations.slice(4)

  return (
    <div className="panel-card">
      <p className="eyebrow">Interpretation boundary</p>
      <h3>Limitations remain visible</h3>
      <ul className="plain-list">
        {primaryLimitations.map((limitation) => (
          <li key={limitation}>{limitation}</li>
        ))}
      </ul>
      {additionalLimitations.length > 0 ? (
        <details className="limitations-disclosure">
          <summary>
            Show all {limitations.length} supplied limitations
            <span className="secondary-note"> ({additionalLimitations.length} more)</span>
          </summary>
          <ul className="plain-list limitations-list">
            {additionalLimitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  )
}

export function DecisionRequestCard({ attention }: { readonly attention: WorkbenchAttentionItem }) {
  return (
    <article className="decision-card">
      <div className="card-heading-row">
        <div>
          <p className="eyebrow">Workbench preparation only</p>
          <h3>Human decision request</h3>
        </div>
        <span className="status-pill state-neutral">not recorded</span>
      </div>
      <p className="decision-summary">
        Carry this exact unranked Attention item into human review. This request does not record a
        recommendation, decision, action, measurement, or outcome.
      </p>
      <dl className="metadata-list">
        <div>
          <dt>Attention reference</dt>
          <dd className="mono-wrap">{attention.id}</dd>
        </div>
        <div>
          <dt>Evidence identity</dt>
          <dd className="mono-wrap">{attention.evidenceIdentity}</dd>
        </div>
      </dl>
    </article>
  )
}

export function App() {
  const [scenarioKey, setScenarioKey] = useState<WorkbenchScenarioKey>('human-review')
  const [activeView, setActiveView] = useState<WorkspaceView>('home')
  const selectedScenario = workbenchScenarios[scenarioKey]
  const projection = selectedScenario.status === 'ready' ? selectedScenario.scenario.projection : null
  const [selectedAttentionId, setSelectedAttentionId] = useState<string | null>(
    projection?.workspace.attention[0]?.id ?? null,
  )

  const selectScenario = (key: WorkbenchScenarioKey) => {
    const nextScenario = workbenchScenarios[key]
    setScenarioKey(key)
    setActiveView('home')
    setSelectedAttentionId(
      nextScenario.status === 'ready'
        ? nextScenario.scenario.projection.workspace.attention[0]?.id ?? null
        : null,
    )
  }

  if (selectedScenario.status === 'error' || projection === null) {
    return (
      <main className="boundary-error" id="main-content">
        <p className="eyebrow">Projection boundary</p>
        <h1>Workbench state cannot be displayed.</h1>
        <p>
          The selected engine-shaped fixture was rejected by the accepted Workbench decoder. No fallback
          semantics were inferred.
        </p>
        <p className="mono-wrap">Boundary code: {selectedScenario.status === 'error' ? selectedScenario.code : 'unknown'}</p>
      </main>
    )
  }

  const { workspace } = projection
  const selectedEvidence = workspace.evidenceRows.find((row) => row.id === selectedAttentionId)
  const selectedAttention = workspace.attention.find((item) => item.id === selectedAttentionId)
  const decisionCycle = workspace.decisionCycle
  const activeScenario = selectedScenario.scenario

  const openEvidence = (id: string) => {
    setSelectedAttentionId(id)
    setActiveView('evidence')
  }

  const openDecision = (id: string) => {
    setSelectedAttentionId(id)
    setActiveView('decision')
  }

  return (
    <div className="workbench-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>

      <aside className="app-nav" aria-label="G.A.S. Workbench navigation">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true">G</span>
          <div>
            <p className="brand-kicker">Lowcountry Digital Works</p>
            <p className="brand-name">G.A.S. Workbench</p>
          </div>
        </div>

        <nav className="workspace-nav" aria-label="Workspace views">
          {workspaceViews.map((view) => (
            <button
              className={`nav-item ${activeView === view.id ? 'nav-item-active' : ''}`}
              type="button"
              key={view.id}
              onClick={() => setActiveView(view.id)}
              aria-current={activeView === view.id ? 'page' : undefined}
            >
              <span>{view.label}</span>
              <small>{view.description}</small>
            </button>
          ))}
        </nav>

        <div className="nav-footer">
          <span className="status-dot" aria-hidden="true" />
          Decoded engine projection
        </div>
      </aside>

      <main id="main-content" className="workspace" tabIndex={-1}>
        <header className="workspace-header">
          <div>
            <p className="eyebrow">{workspace.scope.siteId}</p>
            <h1>{workspace.trustedTarget}</h1>
            <p className="lede">
              Evaluated {displayTimestamp(workspace.evaluatedAt)} · {workspace.sourceManifest.length} supplied source{workspace.sourceManifest.length === 1 ? '' : 's'} · {workspace.navigation.overview.attentionCount} Attention item{workspace.navigation.overview.attentionCount === 1 ? '' : 's'}
            </p>
          </div>
          <div className="header-badges">
            <span className="pill pill-neutral">Synthetic fixture</span>
            <span className="pill pill-engine">Engine 0.17</span>
          </div>
        </header>

        <section className="scenario-switcher" aria-labelledby="scenario-title">
          <div>
            <p className="eyebrow">Walkthrough state</p>
            <h2 id="scenario-title">{activeScenario.label}</h2>
            <p>{activeScenario.description}</p>
          </div>
          <div className="scenario-options" role="group" aria-label="Synthetic walkthrough state">
            {WORKBENCH_SCENARIO_KEYS.map((key) => {
              const option = workbenchScenarios[key]
              const label = option.status === 'ready' ? option.scenario.shortLabel : option.label
              return (
                <button
                  type="button"
                  key={key}
                  className={`scenario-button ${scenarioKey === key ? 'is-active' : ''}`}
                  aria-pressed={scenarioKey === key}
                  onClick={() => selectScenario(key)}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </section>

        <div className="view-frame" aria-live="polite">
          {activeView === 'home' ? (
            <section aria-labelledby="home-title">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Current state</p>
                  <h2 id="home-title">What is happening now?</h2>
                </div>
                <p>Factual readiness from the supplied projection. No score or priority is inferred.</p>
              </div>

              <div className="metric-grid">
                <article className="metric-card">
                  <span>Supplied sources</span>
                  <strong>{workspace.sourceManifest.length}</strong>
                  <small>{workspace.sourceManifest.map((source) => displayToken(source.moduleId)).join(' · ') || 'None supplied'}</small>
                </article>
                <article className="metric-card">
                  <span>Attention</span>
                  <strong>{workspace.attention.length}</strong>
                  <small>Human-review selection, not priority</small>
                </article>
                <article className="metric-card">
                  <span>Decision cycle</span>
                  <strong>{decisionCycle ? displayToken(decisionCycle.readiness.state) : 'not supplied'}</strong>
                  <small>{decisionCycle ? 'Human decision state supplied' : 'No dossier projection supplied'}</small>
                </article>
              </div>

              <div className="two-column-layout">
                <div className="panel-card">
                  <div className="card-heading-row">
                    <div>
                      <p className="eyebrow">Evidence gates</p>
                      <h3>Module readiness</h3>
                    </div>
                    <span className="count-badge">{workspace.readiness.length}</span>
                  </div>
                  <ReadinessList entries={workspace.readiness} />
                </div>

                <LimitationsPanel limitations={workspace.limitations} />
              </div>
            </section>
          ) : null}

          {activeView === 'evidence' ? (
            <section aria-labelledby="evidence-title">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Evidence</p>
                  <h2 id="evidence-title">Sources before conclusions</h2>
                </div>
                <p>Provider, period, readiness, and identity remain attached to every supplied source.</p>
              </div>

              <div className="source-grid">
                {workspace.sourceManifest.length > 0 ? workspace.sourceManifest.map((source) => (
                  <SourceCard source={source} key={source.identity} />
                )) : (
                  <EmptyState title="No source manifest supplied" detail="This projection does not claim a source universe." />
                )}
              </div>

              <div className="detail-layout">
                <div>
                  <div className="subsection-heading">
                    <h3>Evidence rows</h3>
                    <span>{workspace.evidenceRows.length}</span>
                  </div>
                  {workspace.evidenceRows.length > 0 ? (
                    <div className="evidence-list">
                      {workspace.evidenceRows.map((row) => (
                        <EvidenceCard
                          row={row}
                          key={row.id}
                          selected={selectedEvidence?.id === row.id}
                          onSelect={() => setSelectedAttentionId(row.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="No evidence row is projected for human review"
                      detail="An empty row list is shown as supplied state; it is not translated into a health or success claim."
                    />
                  )}
                </div>
                <ContextPanel projection={projection} selectedAttentionId={selectedAttentionId} />
              </div>
            </section>
          ) : null}

          {activeView === 'attention' ? (
            <section aria-labelledby="attention-title">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Attention</p>
                  <h2 id="attention-title">Human review, without ranking</h2>
                </div>
                <p>Navigation order is supplied for review convenience and does not imply severity or business value.</p>
              </div>

              {workspace.attention.length > 0 ? (
                <div className="attention-list">
                  {workspace.attention.map((item) => (
                    <AttentionCard
                      item={item}
                      key={item.id}
                      selected={selectedAttention?.id === item.id}
                      onSelect={() => setSelectedAttentionId(item.id)}
                      onEvidence={() => openEvidence(item.id)}
                      onDecision={() => openDecision(item.id)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No Attention items are supplied"
                  detail="The evaluated projection contains zero human-review selections. This UI does not convert zero Attention into an inferred health claim."
                />
              )}
            </section>
          ) : null}

          {activeView === 'decision' ? (
            <section aria-labelledby="decision-title">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Decision</p>
                  <h2 id="decision-title">Human decision handoff</h2>
                </div>
                <p>Workbench preparation remains visually and semantically separate from supplied human decision context.</p>
              </div>

              <div className="decision-layout">
                <div className="evidence-list">
                  {selectedAttention ? (
                    <DecisionRequestCard attention={selectedAttention} />
                  ) : (
                    <EmptyState
                      title="No Attention item is selected"
                      detail="Workbench does not prepare a decision request without an exact supplied Attention reference."
                    />
                  )}

                  {decisionCycle ? (
                    <article className="decision-card">
                      <div className="card-heading-row">
                        <div>
                          <p className="eyebrow">Supplied engine state · {displayToken(decisionCycle.decision.disposition)}</p>
                          <h3>Supplied human decision context</h3>
                        </div>
                        <StatusPill state={decisionCycle.readiness.state} />
                      </div>
                      <p className="decision-summary">{decisionCycle.decision.summary}</p>
                      <dl className="metadata-list">
                        <div>
                          <dt>Decision ID</dt>
                          <dd className="mono-wrap">{decisionCycle.decision.id}</dd>
                        </div>
                        <div>
                          <dt>Statement timestamp</dt>
                          <dd>{displayTimestamp(decisionCycle.decision.recordedAt)}</dd>
                        </div>
                        <div>
                          <dt>Selected Attention</dt>
                          <dd>{decisionCycle.decision.selectedAttentionIds.length}</dd>
                        </div>
                      </dl>
                    </article>
                  ) : (
                    <div className="inline-notice" role="note">
                      <strong>Supplied engine state</strong>
                      <span>No decision-cycle projection is supplied for this walkthrough.</span>
                    </div>
                  )}
                </div>
                <ContextPanel projection={projection} selectedAttentionId={selectedAttentionId} />
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  )
}
