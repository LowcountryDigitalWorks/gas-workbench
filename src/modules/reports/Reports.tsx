import { useId } from 'react'
import { Badge, Facts, Notice } from '../../design-system/primitives'
import { timestamp } from '../../design-system/format'
import type { ReportFeatureProjection } from '../../engine/report-projection'
import { reportFixtureIds } from '../../engine/reportFixtures'
import type { ReportFixtureId } from '../../engine/reportFixtures'

const names: Record<ReportFixtureId, string> = {
  'quiet-report': 'Quiet customer-safe report',
  'focused-evidence': 'Focused evidence report',
  'decision-outcome': 'Decision / outcome report',
  'internal-appendix': 'Internal appendix available',
}
function words(value: string) { return value.replaceAll('_', ' ') }
function downloadJson(report: ReportFeatureProjection['report']) {
  const blob = new Blob([`${JSON.stringify(report, null, 2)}\n`], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${report.id.replace(':', '-')}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export function Reports({ projection, error, fixture, chooseFixture }: {
  projection?: ReportFeatureProjection
  error?: string
  fixture: ReportFixtureId
  chooseFixture: (id: ReportFixtureId) => void
}) {
  const selectId = useId()
  const report = projection?.report
  return <section className="report-view">
    <div className="report-heading">
      <div>
        <p className="eyebrow">Accepted evidence → human context → customer-safe output</p>
        <h2>Reports</h2>
        <p>Preview the supplied Release 0.17 customer report without generating new claims, rankings, or causal language.</p>
      </div>
      <label htmlFor={selectId}>Report walkthrough</label>
      <select id={selectId} value={fixture} onChange={(event) => chooseFixture(event.target.value as ReportFixtureId)}>
        {reportFixtureIds.map((id) => <option key={id} value={id}>{names[id]}</option>)}
      </select>
      {report && <div className="report-controls" aria-label="Deterministic report export">
        <button type="button" className="button secondary" onClick={() => downloadJson(report)}>Download supplied JSON{report.internalAppendix ? ' · includes internal appendix' : ''}</button>
        <button type="button" className="button secondary" onClick={() => window.print()}>Print customer-safe body / save PDF</button>
      </div>}
    </div>
    {projection && report ? <>
    <p className="report-schema">Checked feature contract <code>{projection.schemaVersion}</code> / minor {projection.schemaMinorVersion}. Report payload remains supplied Release <code>{report.version}</code> output.</p>

    <article className="report-paper report-customer-body">
      <header className="report-title">
        <p className="eyebrow">Customer-safe report</p>
        <h3>{report.title}</h3>
        <p className="muted">Created {timestamp(report.createdAt)}</p>
      </header>
      <section className="report-section">
        <h4>Executive summary</h4>
        <p className="report-summary">{report.executiveSummary}</p>
        <Facts rows={[
          ['Site', <code>{report.context.siteId}</code>],
          ['Target', <code>{report.context.target}</code>],
          ['Evidence periods', report.context.periods.map((item) => `${item.start} → ${item.end}`).join('; ')],
        ]}/>
      </section>

      <section className="report-section">
        <div className="report-section-heading"><div><p className="eyebrow">Human-selected focus</p><h4>Primary report focus</h4></div><Badge>{report.focusItems.length} selected</Badge></div>
        <p className="muted">Selection is explicit report focus, not an automatic priority or business-impact ranking.</p>
        <div className="report-focus-grid">{report.focusItems.map((item, index) => <article className="report-focus-item" key={`${item.moduleId}:${item.label}`}>
          <span className="report-focus-index">{index + 1}</span>
          <div><strong>{item.label}</strong><p>{words(item.moduleId)} · {words(item.kind)} · {words(item.state)}</p>{item.readinessContext.map((context) => <p className="muted" key={context}>{context}</p>)}</div>
        </article>)}</div>
      </section>

      <section className="report-section">
        <h4>Observed changes</h4>
        {report.observedChanges.length === 0 ? <Notice>No supplied observed-change narrative. Workbench does not manufacture one from metric deltas.</Notice> : <ul className="report-list">{report.observedChanges.map((item) => <li key={item}>{item}</li>)}</ul>}
      </section>

      {report.decision && <section className="report-section report-decision">
        <div className="report-section-heading"><div><p className="eyebrow">Human decision context</p><h4>{report.decision.summary}</h4></div><Badge>{words(report.decision.readiness)}</Badge></div>
        <Facts rows={[
          ['Disposition', words(report.decision.disposition)],
          ['Measurement planned', report.decision.measurementPlanned ? 'Yes' : 'No'],
          ['Recorded measurements', report.decision.recordedMeasurementCount],
          ['Recommendation lifecycle', report.decision.recommendationLifecycle ? words(report.decision.recommendationLifecycle) : 'Not supplied'],
        ]}/>
        {report.decision.recommendationRationale && <p>{report.decision.recommendationRationale}</p>}
        <div className="report-outcomes"><p className="eyebrow">Human / trusted-caller authored outcomes</p>
          {report.decision.humanOutcomes.length === 0 ? <Notice>No human outcome is supplied in this report.</Notice> : report.decision.humanOutcomes.map((outcome) => <article className="report-outcome" key={`${outcome.createdAt}:${outcome.direction}`}>
            <div><strong>{words(outcome.direction)}</strong><Badge>human authored</Badge></div>
            <p>{outcome.rationale}</p><p className="muted">Attribution: {words(outcome.attribution)} · recorded {timestamp(outcome.createdAt)}</p>
          </article>)}
        </div>
      </section>}

      <section className="report-section">
        <h4>Readiness and limitations</h4>
        <div className="report-readiness">{report.readiness.map((entry) => <div key={entry.moduleId}><span>{words(entry.moduleId)}</span><Badge>{words(entry.state)}</Badge>{entry.reasons.map((reason) => <code key={reason}>{reason}</code>)}</div>)}</div>
        <ul className="report-list report-limitations">{report.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>

      <section className="report-section"><h4>Next review</h4><p>{report.nextReview}</p></section>

      <section className="report-section">
        <h4>Source notes</h4>
        <div className="report-source-notes">{report.sourceNotes.map((note) => <article key={`${note.moduleId}:${note.release}`}>
          <div className="report-section-heading"><strong>{words(note.moduleId)} · Release {note.release}</strong><Badge>{words(note.readiness)}</Badge></div>
          <p>Providers: {note.providers.join(', ')}</p><p>Periods: {note.periods.map((item) => `${item.start} → ${item.end}`).join('; ')}</p>
          {note.reasons.map((reason) => <code key={reason}>{reason}</code>)}
        </article>)}</div>
      </section>
      <details className="report-identifiers"><summary>Exact customer report identity</summary><code>{report.id}</code></details>
    </article>

    {report.internalAppendix && <details className="report-internal">
      <summary>Internal appendix · not customer narrative</summary>
      <Notice><strong>Internal provenance only.</strong><br/>These exact references support operator verification and stay visually separate from the customer-safe body.</Notice>
      <code>{report.internalAppendix.workspaceId}</code><code>{report.internalAppendix.serviceBriefId}</code>
      {report.internalAppendix.selectedAttentionIds.map((id) => <code key={id}>{id}</code>)}
    </details>}
    </> : <div className="error-state" role={error ? 'alert' : 'status'}>
      <h3>{error ? 'Reports unavailable' : 'Checking report projection'}</h3>
      <p>{error ?? 'Validating report identity, source binding, and customer-safe focus…'}</p>
      <p>No report body, internal appendix, download, or print action is available without a checked current projection.</p>
    </div>}
  </section>
}
