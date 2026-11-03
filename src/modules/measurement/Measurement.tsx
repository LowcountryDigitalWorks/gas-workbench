import { useId } from 'react'
import { Badge, Facts, Notice } from '../../design-system/primitives'
import type { MeasurementFeatureProjection } from '../../engine/measurement-projection'
import { measurementFixtureIds } from '../../engine/measurementFixtures'
import type { MeasurementFixtureId } from '../../engine/measurementFixtures'

const names: Record<MeasurementFixtureId, string> = {
  'follow-up-not-due': 'Follow-up not due',
  'limited-comparison': 'Measured, not comparable',
  'ready-for-assessment': 'Ready for human assessment',
  'human-outcome': 'Human outcome recorded',
}
function words(value: string) { return value.replaceAll('_', ' ') }
function display(value: string | number | boolean | null | undefined) {
  if (value === undefined) return 'Not supplied'
  if (value === null) return 'Explicit null supplied'
  return String(value)
}

export function Measurement({ projection, error, fixture, chooseFixture, retrySnapshot }: {
  projection?: MeasurementFeatureProjection
  error?: string
  fixture: MeasurementFixtureId
  chooseFixture: (id: MeasurementFixtureId) => void
  retrySnapshot?: () => void
}) {
  const selectId = useId()
  const plan = projection?.cycle.measurementPlan
  return <section className="measurement-view">
    <div className="measurement-heading">
      <div>
        <p className="eyebrow">Decision → evidence → interpretation → human outcome</p>
        <h2>Measure / Outcomes</h2>
        <p>Inspect the accepted measurement cycle without turning numeric movement into an automatic outcome or causal claim.</p>
      </div>
      <label htmlFor={selectId}>Measurement walkthrough</label>
      <select id={selectId} value={fixture} onChange={(event) => chooseFixture(event.target.value as MeasurementFixtureId)}>
        {measurementFixtureIds.map((id) => <option key={id} value={id}>{names[id]}</option>)}
      </select>
    </div>
    {projection ? <>
    <p className="measurement-schema">Checked feature contract <code>{projection.schemaVersion}</code> / minor {projection.schemaMinorVersion}. Supplied Release 0.22 interpretation is displayed, never recomputed here.</p>

    <section className="measurement-card decision-context">
      <div className="measurement-card-heading"><div><p className="eyebrow">Human-authored decision context</p><h3>{projection.cycle.decision.summary}</h3></div><Badge>{words(projection.cycle.readiness.state)}</Badge></div>
      <Facts rows={[
        ['Disposition', projection.cycle.decision.disposition],
        ['Recorded', projection.cycle.decision.recordedAt],
      ]}/>
      <details className="measurement-identifiers"><summary>Exact decision and recorded-measurement references</summary>
        <code>{projection.cycle.decision.id}</code><code>{projection.cycle.dossierId}</code><code>{projection.cycle.sourceServiceBriefId}</code>{projection.cycle.recordedMeasurementIds.map((id) => <code key={id}>{id}</code>)}
      </details>
      {projection.cycle.readiness.reasons.map((reason) => <Notice key={reason}><strong>Readiness reason</strong><br/><code>{reason}</code></Notice>)}
    </section>

    {plan && <section className="measurement-card">
      <div className="measurement-card-heading"><div><p className="eyebrow">Release 0.11 · Search Change plan</p><h3>{plan.annotation.summary}</h3></div><Badge>{words(plan.readiness.state)}</Badge></div>
      <Facts rows={[
        ['Target query', <code>{plan.target.query}</code>],
        ['Target page', <code>{plan.target.page}</code>],
        ['Metric', plan.target.metric],
        ['Changed', plan.annotation.occurredAt],
      ]}/>
      <details className="measurement-identifiers"><summary>Exact plan and record references</summary>
        <code>{plan.id}</code><code>{plan.annotation.id}</code><code>{plan.target.rowIdentity}</code><code>{plan.baselineMeasurementId}</code><code>{plan.followUpMeasurementId}</code><code>{plan.target.baselineObservationId}</code>{plan.target.followUpObservationId && <code>{plan.target.followUpObservationId}</code>}
      </details>
      {plan.readiness.reasons.map((reason) => <Notice key={reason}><strong>Plan is not ready for human assessment</strong><br/><code>{reason}</code></Notice>)}
    </section>}

    <section className="measurement-card">
      <p className="eyebrow">Canonical Release 0.8 measurement records</p>
      <h3>Measured evidence</h3>
      <div className="measurement-records">
        {projection.measurements.map((measurement) => <article key={measurement.id} className="measurement-record">
          <header><strong>{measurement.relationship.role === 'baseline' ? 'Baseline' : 'Follow-up'}</strong><Badge>{words(measurement.result.state)}</Badge></header>
          <p>Due window: {measurement.dueWindow.start} → {measurement.dueWindow.end}</p>
          {measurement.result.state === 'measured' ? <>
            <p>Observed window: {measurement.result.observedWindow.start} → {measurement.result.observedWindow.end}</p>
            <ul>{measurement.result.observations.map((observation) => <li key={observation.id}><span>Observed value</span><strong>{display(observation.value)}</strong></li>)}</ul>
          </> : <Notice>{measurement.result.reason}</Notice>}
          <p>Comparability: <strong>{measurement.comparability.state}</strong>{measurement.comparability.state === 'comparable' ? '' : ` — ${measurement.comparability.reason}`}</p>
          <p className="muted">Method: <code>{measurement.methodology.id}</code> / {measurement.methodology.version}</p>
          <details className="measurement-identifiers"><summary>Exact record identity</summary>
            <code>{measurement.id}</code>{measurement.relationship.role === 'follow_up' && <code>{measurement.relationship.baselineMeasurementId}</code>}{measurement.result.state === 'measured' && measurement.result.observations.map((observation) => <code key={observation.id}>{observation.id}</code>)}<code>{measurement.createdAt}</code>
          </details>
        </article>)}
      </div>
      <Notice><strong>No automatic direction.</strong><br/>Observed values—including zero—remain evidence. Workbench does not label numeric movement improved, regressed, or unchanged.</Notice>
    </section>

    {projection.interpretations.map((profile) => <section className="measurement-card interpretation-card" key={profile.id}>
      <div className="measurement-card-heading"><div><p className="eyebrow">Release 0.22 · supplied interpretation guidance</p><h3>Claim ceiling: {words(profile.claimCeiling)}</h3></div><Badge>{profile.readiness}</Badge></div>
      <Facts rows={[
        ['Design class', words(profile.designClass)],
        ['Exposure', words(profile.exposure.state)],
        ['Comparability', words(profile.comparability.state)],
      ]}/>
      <details className="measurement-identifiers"><summary>Exact interpretation references</summary>
        <code>{profile.id}</code><code>{profile.methodology.id} / {profile.methodology.version} / {profile.methodology.release}</code><code>{profile.comparability.baselineMeasurementId}</code><code>{profile.comparability.followUpMeasurementId}</code>{profile.exposure.methodId && <code>{profile.exposure.methodId}{profile.exposure.methodVersion ? ` / ${profile.exposure.methodVersion}` : ''}</code>}{profile.exposure.evidenceReference && <code>{profile.exposure.evidenceReference}</code>}
      </details>
      {profile.comparability.reasons.map((reason) => <Notice key={reason}><code>{reason}</code></Notice>)}
      <div className="claim-grid">
        <div><h4>Allowed claim code</h4>{profile.allowedClaimCodes.map((code) => <code key={code}>{code}</code>)}</div>
        <div><h4>Explicitly prohibited overclaims</h4>{profile.prohibitedOverclaimCodes.map((code) => <code key={code}>{code}</code>)}</div>
      </div>
      {profile.limitations.map((item) => <p className="muted" key={item}>{words(item)}</p>)}
    </section>)}

    <section className="measurement-card outcome-card">
      <p className="eyebrow">Human / trusted-caller authored</p>
      <h3>Outcome ledger</h3>
      {projection.outcomes.length === 0 ? <Notice>No human outcome is recorded. Measurement readiness does not choose an outcome direction.</Notice> : projection.outcomes.map((outcome) => <article key={outcome.id} className="human-outcome">
        <div className="measurement-card-heading"><div><h4>{words(outcome.direction)}</h4><p className="muted">Recorded {outcome.createdAt}</p></div><Badge>human authored</Badge></div>
        {outcome.rationale && <p>{outcome.rationale}</p>}{outcome.reason && <p>{outcome.reason}</p>}
        <p>Attribution: <strong>{words(outcome.attribution.strength)}</strong></p>
        {outcome.attribution.reason && <p className="muted">{outcome.attribution.reason}</p>}
        {outcome.attribution.basis && <p className="muted">{outcome.attribution.basis}</p>}
        <details className="measurement-identifiers"><summary>Exact outcome and measurement references</summary><code>{outcome.id}</code>{outcome.measurementIds.map((id) => <code className="measurement-reference" key={id}>{id}</code>)}{outcome.attribution.method && <code>{outcome.attribution.method.id} / {outcome.attribution.method.version}</code>}</details>
      </article>)}
    </section>

    <details className="measurement-limits"><summary>Authority and limitations</summary>
      <h4>Authority notes</h4><ul>{projection.authorityNotes.map((item) => <li key={item}>{item}</li>)}</ul>
      <h4>Limitations</h4><ul>{projection.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
    </details>
    </> : <div className="error-state" role={error ? 'alert' : 'status'}>
      <h3>{error ? 'Measure / Outcomes unavailable' : 'Checking measurement projection'}</h3>
      <p>{error ?? 'Validating measurement-cycle identity and supplied semantics…'}</p>
      {error && retrySnapshot && <button type="button" className="secondary" onClick={retrySnapshot}>Retry snapshot</button>}
    </div>}
  </section>
}
