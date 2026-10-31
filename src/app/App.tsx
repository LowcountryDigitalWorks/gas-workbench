import { registeredModules } from './moduleRegistry'
import { useEffect, useRef, useState } from 'react'
import type { WorkbenchProjection } from '../engine/projection'
import { Badge, Facts, Icon } from '../design-system/primitives'
import { siteName, timestamp } from '../design-system/format'
import { Home } from '../modules/home/Home'
import { Evidence } from '../modules/evidence/Evidence'
import { Attention } from '../modules/attention/Attention'
import { DecisionDraft } from '../modules/decisions/DecisionDraft'
import type { Draft } from '../modules/decisions/DecisionDraft'
import { fixtureIds, loadFixture } from './fixtures'
import type { FixtureId } from './fixtures'

const views = registeredModules.map((module) => module.id)
type View = (typeof views)[number]
const labels = {
  home: 'Home',
  evidence: 'Evidence',
  attention: 'Attention',
  decisions: 'Decision',
}
const icons = {
  home: 'home',
  evidence: 'file-description',
  attention: 'search',
  decisions: 'notes',
}
const cases = {
  quiet: 'Quiet',
  limited: 'Limited evidence',
  'human-review': 'Human review',
}
const emptyDraft = { rationale: '', disposition: 'Request review' }
export function App() {
  const [fixture, setFixture] = useState<FixtureId>('quiet')
  const [view, setView] = useState<View>('home')
  const [result, setResult] = useState<{
    projection?: WorkbenchProjection
    error?: string
  }>({})
  const [retry, setRetry] = useState(0)
  const [selected, setSelected] = useState<string | undefined>()
  const [attention, setAttention] = useState<string | undefined>()
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const draftKey = `${fixture}:${attention ?? ''}`
  const mainHeading = useRef<HTMLHeadingElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const dialogOpener = useRef<HTMLElement | null>(null)
  useEffect(() => {
    let active = true
    loadFixture(fixture)
      .then((projection) => {
        if (active) setResult({ projection })
      })
      .catch((error) => {
        if (active)
          setResult({
            error:
              error instanceof Error
                ? error.message
                : 'The projection could not be loaded.',
          })
      })
    return () => {
      active = false
    }
  }, [fixture, retry])
  const projection = result.projection
  const w = projection?.workspace
  function navigate(next: View) {
    setView(next)
    requestAnimationFrame(() =>
      mainHeading.current?.focus({ preventScroll: true }),
    )
  }
  function inspect(moduleId?: string) {
    setSelected(moduleId ?? w?.sourceManifest[0]?.moduleId)
    navigate('evidence')
  }
  function changeFixture(next: FixtureId) {
    if (next === fixture) return
    setFixture(next)
    setResult({})
    setSelected(undefined)
    setAttention(undefined)
    navigate('home')
  }
  function showContext() {
    dialogOpener.current = document.activeElement as HTMLElement
    dialog.current?.showModal()
  }
  const captions = {
    home: 'Current site state',
    evidence: `${w?.sourceManifest.length ?? '…'} supplied sources`,
    attention: `${w?.attention.length ?? '…'} unranked items`,
    decisions: 'Human draft / supplied context',
  }
  return (
    <div className="workbench-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="global-header">
        <div className="wordmark">
          G.A.S. Workbench<small>Lowcountry Digital Works</small>
        </div>
        <span className="site-identity">
          {w ? siteName(w.trustedTarget) : 'Loading workspace'}
        </span>
        <span className="demo-label">Synthetic demo</span>
        <button
          className="header-context"
          onClick={showContext}
          disabled={!projection}
        >
          Snapshot details
        </button>
      </header>
      <aside className="app-nav">
        <nav aria-label="Workspace navigation">
          {views.map((item) => (
            <button
              key={item}
              className="nav-item"
              aria-current={view === item ? 'page' : undefined}
              onClick={() => {
                if (item === 'evidence' && !selected)
                  setSelected(w?.sourceManifest[0]?.moduleId)
                navigate(item)
              }}
            >
              <Icon name={icons[item]} />
              <span>
                <strong>{labels[item]}</strong>
                <small>{captions[item]}</small>
              </span>
            </button>
          ))}
          <div className="nav-unavailable">
            <Icon name="chart-bar" />
            <span>
              <strong>Measurement</strong>
              <small>
                {w?.decisionCycle
                  ? w.decisionCycle.readiness.state.replaceAll('_', ' ')
                  : 'Not supplied'}{' '}
                • view unavailable
              </small>
            </span>
          </div>
          <div className="nav-unavailable">
            <Icon name="report" />
            <span>
              <strong>Report</strong>
              <small>View unavailable in this slice</small>
            </span>
          </div>
        </nav>
        <p className="rail-note">Workspace views, not a completion sequence.</p>
      </aside>
      <main id="main-content" className="workspace" tabIndex={-1}>
        <header className="workspace-header">
          <div className="workspace-heading">
            <p className="breadcrumb">Home / {labels[view]}</p>
            <h1 tabIndex={-1} ref={mainHeading}>
              {view === 'home'
                ? 'Current state'
                : view === 'evidence'
                  ? 'Source Atlas'
                  : view === 'attention'
                    ? 'Human review'
                    : 'Decision draft'}
            </h1>
            {w && (
              <p className="snapshot-time">
                Snapshot:{' '}
                <time dateTime={w.generatedAt}>{timestamp(w.generatedAt)}</time>
                <br />
                Evaluated:{' '}
                <time dateTime={w.evaluatedAt}>{timestamp(w.evaluatedAt)}</time>
              </p>
            )}
          </div>
          <fieldset className="fixture-picker">
            <legend>Presentation fixtures</legend>
            <div>
              {fixtureIds.map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={fixture === id}
                  onClick={() => changeFixture(id)}
                >
                  {cases[id]}
                </button>
              ))}
            </div>
            <small>Public-safe examples • drafts stay in this tab</small>
          </fieldset>
        </header>
        {!projection ? (
          result.error ? (
            <section className="error-state" role="alert">
              <h2>Snapshot unavailable</h2>
              <p>{result.error}</p>
              <p>No partial or coerced evidence is shown.</p>
              <button
                className="secondary"
                onClick={() => {
                  setResult({})
                  setRetry(retry + 1)
                }}
              >
                Retry snapshot
              </button>
            </section>
          ) : (
            <p className="loading-state" role="status">
              Loading and validating the supplied snapshot…
            </p>
          )
        ) : (
          <>
            <p className="snapshot-status" role="status">
              {cases[fixture]} fixture • {w!.attention.length} unranked
              Attention items
              {w!.readiness.some((source) => source.state === 'limited')
                ? ' • Limited source coverage'
                : ''}
            </p>
            {view === 'home' && (
              <Home
                projection={projection}
                inspect={inspect}
                review={() => {
                  setAttention(w!.attention[0]?.id)
                  navigate('attention')
                }}
              />
            )}
            {view === 'evidence' && (
              <Evidence
                key={fixture}
                projection={projection}
                selected={selected}
                select={setSelected}
                review={(id) => {
                  setAttention(id)
                  navigate('attention')
                }}
              />
            )}
            {view === 'attention' && (
              <Attention
                items={w!.attention}
                selected={attention}
                choose={setAttention}
                inspect={inspect}
                draft={() => navigate('decisions')}
              />
            )}
            {view === 'decisions' && (
              <DecisionDraft
                key={fixture}
                projection={projection}
                attentionId={attention}
                draft={drafts[draftKey] ?? emptyDraft}
                update={(draft) => setDrafts({ ...drafts, [draftKey]: draft })}
                back={() =>
                  inspect(
                    w!.attention.find((item) => item.id === attention)
                      ?.moduleId,
                  )
                }
              />
            )}
          </>
        )}
      </main>
      <dialog
        ref={dialog}
        aria-labelledby="snapshot-dialog-title"
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return
          const controls = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              'button, a[href], input, select, textarea, summary, [tabindex="0"]',
            ),
          ).filter((node) => !node.hasAttribute('disabled'))
          const first = controls[0]
          const last = controls[controls.length - 1]
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last?.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first?.focus()
          }
        }}
        onClose={() => dialogOpener.current?.focus()}
      >
        <div className="dialog-heading">
          <h2 id="snapshot-dialog-title">Snapshot details & limits</h2>
          <button
            className="icon-button"
            aria-label="Close snapshot details"
            onClick={() => dialog.current?.close()}
          >
            <Icon name="x" />
          </button>
        </div>
        {projection && (
          <>
            <Badge>Synthetic projection exemplar</Badge>
            <Facts
              rows={[
                ['Workspace', <code>{projection.source.workspaceId}</code>],
                ['Engine artifact version', projection.source.artifactVersion],
                [
                  'Projection schema',
                  <code>
                    {projection.schemaVersion} / {projection.schemaMinorVersion}
                  </code>,
                ],
                ['Site', <code>{w!.trustedTarget}</code>],
                ['Scope', <code>{JSON.stringify(w!.scope, null, 2)}</code>],
              ]}
            />
            <h3>Supplied history</h3>
            <ul>
              {w!.timeline.map((entry, i) => (
                <li key={i}>
                  {entry.label} — {entry.state} · {timestamp(entry.at)}
                  <br />
                  <code>{entry.referenceId ?? 'No reference supplied'}</code>
                </li>
              ))}
            </ul>
            <h3>Authority notes</h3>
            <ul>
              {w!.authorityNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
            <h3>Supplied limitations</h3>
            <ul>
              {w!.limitations.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </>
        )}
      </dialog>
    </div>
  )
}
