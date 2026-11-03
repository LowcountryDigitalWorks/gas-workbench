import { registeredModules } from './moduleRegistry'
import { useEffect, useRef, useState } from 'react'
import type { WorkbenchProjection } from '../engine/projection'
import { Badge, Facts, Icon } from '../design-system/primitives'
import { siteName, timestamp } from '../design-system/format'
import { Home } from '../modules/home/Home'
import { Evidence } from '../modules/evidence/Evidence'
import { Attention } from '../modules/attention/Attention'
import { DecisionDraft } from '../modules/decisions/DecisionDraft'
import { Visibility } from '../modules/visibility/Visibility'
import { loadVisibilityFixture } from '../engine/visibilityFixtures'
import type { VisibilityFeatureProjection } from '../engine/visibility-projection'
import type { VisibilityFixtureId } from '../engine/visibilityFixtures'
import { loadTechnicalFixture } from '../engine/technicalFixtures'
import type { TechnicalFixtureId } from '../engine/technicalFixtures'
import type { TechnicalProjection } from '../engine/technical-projection'
import { Technical } from '../modules/technical/Technical'
import { Measurement } from '../modules/measurement/Measurement'
import { loadMeasurementFixture } from '../engine/measurementFixtures'
import type { MeasurementFixtureId } from '../engine/measurementFixtures'
import type { MeasurementFeatureProjection } from '../engine/measurement-projection'
import { Reports } from '../modules/reports/Reports'
import { loadReportFixture } from '../engine/reportFixtures'
import type { ReportFixtureId } from '../engine/reportFixtures'
import type { ReportFeatureProjection } from '../engine/report-projection'
import type { Draft } from '../modules/decisions/DecisionDraft'
import { fixtureIds, loadFixture } from './fixtures'
import type { FixtureId } from './fixtures'

const views = registeredModules.map((module) => module.id)
type View = (typeof views)[number]
const labels = {
  home: 'Home',
  visibility: 'Visibility',
  technical: 'Technical',
  evidence: 'Evidence',
  attention: 'Attention',
  decisions: 'Decision',
  measurement: 'Measure / Outcomes',
  reports: 'Reports',
}
const icons = {
  home: 'home',
  visibility: 'chart-bar',
  technical: 'file-description',
  evidence: 'file-description',
  attention: 'search',
  decisions: 'notes',
  measurement: 'chart-bar',
  reports: 'report',
}
const cases: Record<FixtureId, string> = {
  quiet: 'Quiet',
  limited: 'Limited evidence',
  'human-review': 'Human review',
  'visibility-review': 'Visibility review',
  'technical-review': 'Technical review',
  'report-outcome': 'Report outcome',
  'report-internal': 'Report appendix',
}
function reportShellFixture(id: ReportFixtureId): FixtureId {
  if (id === 'decision-outcome') return 'report-outcome'
  if (id === 'internal-appendix') return 'report-internal'
  return 'human-review'
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
  const [visibilityCase, setVisibilityCase] = useState<VisibilityFixtureId>('comparable-search')
  const [visibility, setVisibility] = useState<{ value?: VisibilityFeatureProjection; error?: string }>({})
  const [technicalCase, setTechnicalCase] = useState<TechnicalFixtureId>('ready')
  const [technical, setTechnical] = useState<{ value?: TechnicalProjection; error?: string }>({})
  const [measurementCase, setMeasurementCase] = useState<MeasurementFixtureId>('follow-up-not-due')
  const [measurement, setMeasurement] = useState<{ value?: MeasurementFeatureProjection; error?: string }>({})
  const [reportCase, setReportCase] = useState<ReportFixtureId>('focused-evidence')
  const [report, setReport] = useState<{ value?: ReportFeatureProjection; error?: string }>({})
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
  useEffect(() => {
    if (!projection) return
    let active = true
    loadVisibilityFixture(visibilityCase, projection).then((value) => {
      if (active) setVisibility({ value })
    }).catch((error) => {
      if (active) setVisibility({ error: error instanceof Error ? error.message : 'Visibility projection unavailable.' })
    })
    return () => { active = false }
  }, [projection, visibilityCase])
  useEffect(() => {
    if (!projection) return
    let active = true
    loadTechnicalFixture(technicalCase, projection).then((value) => { if (active) setTechnical({ value }) }).catch((error) => { if (active) setTechnical({ error: error instanceof Error ? error.message : 'Technical projection unavailable.' }) })
    return () => { active = false }
  }, [projection, technicalCase])
  useEffect(() => {
    if (!projection || fixture !== 'human-review') return
    let active = true
    loadMeasurementFixture(measurementCase, projection).then((value) => {
      if (active) setMeasurement({ value })
    }).catch((error) => {
      if (active) setMeasurement({ error: error instanceof Error ? error.message : 'Measurement projection unavailable.' })
    })
    return () => { active = false }
  }, [projection, fixture, measurementCase])
  useEffect(() => {
    if (!projection || fixture !== reportShellFixture(reportCase)) return
    let active = true
    loadReportFixture(reportCase, projection).then((value) => {
      if (active) setReport({ value })
    }).catch((error) => {
      if (active) setReport({ error: error instanceof Error ? error.message : 'Report projection unavailable.' })
    })
    return () => { active = false }
  }, [projection, fixture, reportCase])
  const w = projection?.workspace
  function navigate(next: View) {
    if (next === 'technical' && fixture !== 'technical-review') {
      setFixture('technical-review')
      setResult({})
      setSelected(undefined)
      setAttention(undefined)
      setTechnical({})
    }
    if (next === 'visibility' && fixture !== 'visibility-review') {
      setFixture('visibility-review')
      setResult({})
      setSelected(undefined)
      setAttention(undefined)
      setVisibility({})
    }
    if (next === 'measurement' && fixture !== 'human-review') {
      setFixture('human-review')
      setResult({})
      setSelected(undefined)
      setAttention(undefined)
      setMeasurement({})
    }
    const expectedReportShell = reportShellFixture(reportCase)
    if (next === 'reports' && fixture !== expectedReportShell) {
      setFixture(expectedReportShell)
      setResult({})
      setSelected(undefined)
      setAttention(undefined)
      setReport({})
    }
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
  function chooseReportCase(next: ReportFixtureId) {
    const nextShell = reportShellFixture(next)
    setReportCase(next)
    setReport({})
    if (nextShell !== fixture) {
      setFixture(nextShell)
      setResult({})
      setSelected(undefined)
      setAttention(undefined)
    }
  }
  function showContext() {
    dialogOpener.current = document.activeElement as HTMLElement
    dialog.current?.showModal()
  }
  const captions = {
    home: 'Current site state',
    visibility: 'Source-specific evidence and comparability',
    technical: 'Technical evidence and coverage',
    evidence: `${w?.sourceManifest.length ?? '…'} supplied sources`,
    attention: `${w?.attention.length ?? '…'} unranked items`,
    decisions: 'Human draft / supplied context',
    measurement: measurement.value ? measurement.value.cycle.readiness.state.replaceAll('_', ' ') : 'Measurement cycle',
    reports: report.value ? `${report.value.report.focusItems.length} customer-safe focus item${report.value.report.focusItems.length === 1 ? '' : 's'}` : 'Customer-safe report',
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
                : view === 'visibility'
                  ? 'Visibility evidence'
                : view === 'technical'
                  ? 'Technical evidence'
                : view === 'measurement'
                  ? 'Measure / Outcomes'
                : view === 'reports'
                  ? 'Customer-safe Reports'
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
            {view === 'visibility' && (
              visibility.value ? <Visibility
                projection={visibility.value}
                shell={projection}
                fixture={visibilityCase}
                chooseFixture={setVisibilityCase}
                inspect={(moduleId) => inspect(moduleId)}
                review={(id) => { setAttention(id); navigate('attention') }}
              /> : <section className="error-state" role={visibility.error ? 'alert' : 'status'}>
                <h2>{visibility.error ? 'Visibility unavailable' : 'Checking Visibility projection'}</h2>
                <p>{visibility.error ?? 'Validating source and workspace identity…'}</p>
              </section>
            )}
            {view === 'technical' && (
              technical.value ? <Technical projection={technical.value} shell={projection} fixture={technicalCase} chooseFixture={setTechnicalCase} inspect={(moduleId) => inspect(moduleId)} review={(id) => { setAttention(id); navigate('attention') }} /> : <section className="error-state" role={technical.error ? 'alert' : 'status'}><h2>{technical.error ? 'Technical unavailable' : 'Checking Technical projection'}</h2><p>{technical.error ?? 'Validating source and workspace identity…'}</p></section>
            )}
            {view === 'measurement' && (
              measurement.value ? <Measurement projection={measurement.value} fixture={measurementCase} chooseFixture={(id) => { setMeasurementCase(id); setMeasurement({}) }} /> : <section className="error-state" role={measurement.error ? 'alert' : 'status'}><h2>{measurement.error ? 'Measure / Outcomes unavailable' : 'Checking measurement projection'}</h2><p>{measurement.error ?? 'Validating measurement-cycle identity and supplied semantics…'}</p></section>
            )}
            {view === 'reports' && (
              report.value ? <Reports projection={report.value} fixture={reportCase} chooseFixture={chooseReportCase} /> : <section className="error-state" role={report.error ? 'alert' : 'status'}><h2>{report.error ? 'Reports unavailable' : 'Checking report projection'}</h2><p>{report.error ?? 'Validating Release 0.17 report identity, source binding, and customer-safe focus…'}</p></section>
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
