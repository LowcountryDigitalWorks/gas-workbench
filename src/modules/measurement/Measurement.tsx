import { useId } from 'react'
import { Badge, Facts, Notice } from '../../design-system/primitives'
import type { MeasurementProjection } from '../../engine/measurement-projection'
import { measurementFixtureIds } from '../../engine/measurementFixtures'
import type { MeasurementFixtureId } from '../../engine/measurementFixtures'

const names: Record<MeasurementFixtureId, string> = {
  'follow-up-not-due': 'Follow-up not due',
  'measured-not-comparable': 'Measured, not comparable',
  'ready-human-assessment': 'Ready for human assessment',
  'human-outcome-recorded': 'Human outcome recorded',
  'blocked-not-interpretable': 'Blocked / not interpretable',
}

function humanize(value: string): string {
  return value.replaceAll('_', ' ')
}

function observationValue(value: MeasurementProjection['measurements'][number]['result'] extends infer R
  ? R extends { observations?: readonly (infer O)[] }
    ? O extends { value: infer V }
      ? V
      : never
    : never
  : never): string {
  if (value.state !== 'observed') return `${humanize(value.state)} — ${value.reason}`
  if (value.type === 'boolean') return value.value ? 'true' : 'false'
  return String(value.value)
}

export function Measurement({
  projection,
  fixture,
  chooseFixture,
  openDecision,
}: {
  projection: MeasurementProjection
  fixture: MeasurementFixtureId
  chooseFixture: (id: MeasurementFixtureId) => void
  openDecision: () => void
}) {
  const selectId = useId()
  const interpretation = projection.interpretation

  return <section className="measurement-view">
    <div className="measurement-heading">
      <div>
        <p className="eyebrow">Decision → evidence → interpretation → human outcome</p>
        <h2>Measure and outcomes</h2>
        <p>Canonical records and engine-supplied claim limits stay separate from human assessment.</p>
      </div>
      <label htmlFor={selectId}>Measurement walkthrough</label>
      <select id={selectId} value={fixture} onChange={(event) => chooseFixture(event.target.value as MeasurementFixtureId)}>
        {measurementFixtureIds.map((id) => <option key={id} value={id}>{names[id]}</option>)}
      </select>
    </div>

    <p className="measurement-schema">Checked feature projection <code>{projection.schemaVersion}</code> / minor {projection.schemaMinorVersion}; the Workbench shell remains minor 0.</p>

    <article className="measurement-panel measurement-decision">
      <header>
        <div><p className="eyebrow">Human decision context</p><h3>{projection.decision.summary}</h3></div>
        <Badge>{projection.decision.disposition}</Badge>
      </header>
      <Facts rows={[
        ['Decision ID', <code>{projection.decision.id}</code>],
        ['Recorded', projection.decision.recordedAt],
        ['Cycle readiness', humanize(projection.cycleReadiness.state)],
      ]}/>
      {projection.cycleReadiness.reasons.map((reason) => <Notice key={reason}><strong>Supplied cycle reason</strong><br/><code>{reason}</code></Notice>)}
      <div className="action-row"><button className="secondary" onClick={openDecision}>Open Decision context</button></div>
    </article>

    {projection.plan && <article className="measurement-panel measurement-plan">
      <header>
        <div><p className="eyebrow">Accepted Search Change plan</p><h3>{projection.plan.annotation.summary}</h3></div>
        <Badge>{humanize(projection.plan.readiness.state)}</Badge>
      </header>
      <Facts rows={[
        ['Target query', <code>{projection.plan.target.query}</code>],
        ['Target page', <code>{projection.plan.target.page}</code>],
        ['Metric', projection.plan.target.metric],
        ['Baseline record', <code>{projection.plan.baselineMeasurementId}</code>],
        ['Follow-up record', <code>{projection.plan.followUpMeasurementId}</code>],
      ]}/>
      {projection.plan.readiness.reasons.map((reason) => <Notice key={reason}><strong>Plan not ready</strong><br/><code>{reason}</code></Notice>)}
    </article>}

    <section className="measurement-records" aria-labelledby="measurement-records-title">
      <div className="measurement-section-heading"><p className="eyebrow">Canonical evidence</p><h3 id="measurement-records-title">Measurement records</h3></div>
      <div className="measurement-grid">
        {projection.measurements.map((record) => <article className="measurement-record" key={record.id}>
          <header><div><p className="eyebrow">{humanize(record.relationship.role)}</p><h4>{record.id}</h4></div><Badge>{humanize(record.result.state)}</Badge></header>
          <Facts rows={[
            ['Due window', `${record.dueWindow.start} → ${record.dueWindow.end}`],
            ['Comparability', humanize(record.comparability.state)],
            ['Methodology', <code>{record.methodology.id} / {record.methodology.version}</code>],
            ['Created', record.createdAt],
          ]}/>
          {record.relationship.role === 'follow_up' && <p className="muted">Baseline link: <code>{record.relationship.baselineMeasurementId}</code></p>}
          {record.comparability.reason && <Notice><strong>Comparability reason</strong><br/><code>{record.comparability.reason}</code></Notice>}
          {record.result.state === 'measured' ? <div className="measurement-observations">
            <p><strong>Observed window:</strong> {record.result.observedWindow?.start} → {record.result.observedWindow?.end}</p>
            <ul>{record.result.observations?.map((observation) => <li key={observation.referenceId}><code>{observation.referenceId}</code><span>{observationValue(observation.value)}</span></li>)}</ul>
          </div> : <Notice><strong>{record.result.state === 'not_due' ? 'Follow-up is not due — this is not a failure.' : 'Measurement not recorded.'}</strong><br/>{record.result.reason}</Notice>}
        </article>)}
      </div>
    </section>

    {interpretation && <article className="measurement-panel measurement-interpretation">
      <header>
        <div><p className="eyebrow">Engine-supplied interpretation guidance</p><h3>Claim ceiling: {humanize(interpretation.claimCeiling)}</h3></div>
        <Badge>{interpretation.readiness}</Badge>
      </header>
      <Facts rows={[
        ['Design class', humanize(interpretation.designClass)],
        ['Exposure', humanize(interpretation.exposure.state)],
        ['Comparability', humanize(interpretation.comparability.state)],
        ['Methodology', <code>{interpretation.methodology.id} / {interpretation.methodology.version}</code>],
      ]}/>
      {interpretation.comparability.reasons.map((reason) => <Notice key={reason}><strong>Interpretation reason</strong><br/><code>{reason}</code></Notice>)}
      <div className="measurement-claims">
        <div><h4>Allowed claim code</h4>{interpretation.allowedClaimCodes.map((code) => <code key={code}>{code}</code>)}</div>
        <div><h4>Explicitly prohibited overclaims</h4><ul>{interpretation.prohibitedOverclaimCodes.map((code) => <li key={code}><code>{code}</code></li>)}</ul></div>
      </div>
      {interpretation.limitations.map((item) => <p className="muted" key={item}>{item}</p>)}
      <p className="measurement-boundary"><strong>Workbench does not recompute or strengthen this interpretation.</strong></p>
    </article>}

    <section className="measurement-outcomes" aria-labelledby="measurement-outcomes-title">
      <div className="measurement-section-heading"><p className="eyebrow">Human/trusted-caller state</p><h3 id="measurement-outcomes-title">Recorded outcomes</h3></div>
      {projection.outcomes.length === 0 ? <Notice><strong>No human outcome supplied.</strong><br/>Numeric movement does not create an outcome direction automatically.</Notice> : projection.outcomes.map((outcome) => <article className="measurement-panel measurement-outcome" key={outcome.id}>
        <header><div><p className="eyebrow">Human/trusted-caller authored outcome</p><h4>{humanize(outcome.direction)}</h4></div><Badge>{humanize(outcome.attribution.strength)}</Badge></header>
        <p><strong>This direction is recorded human/trusted-caller state; it is not inferred by Workbench from numeric movement.</strong></p>
        <Facts rows={[
          ['Outcome ID', <code>{outcome.id}</code>],
          ['Recorded', outcome.createdAt],
          ['Attribution', humanize(outcome.attribution.strength)],
          ...(outcome.comparability ? [['Comparability', outcome.comparability] as const] : []),
        ]}/>
        {outcome.rationale && <p>{outcome.rationale}</p>}
        {outcome.reason && <Notice>{outcome.reason}</Notice>}
        {outcome.measurementIds.length > 0 && <details className="measurement-references"><summary>Exact measurement references</summary><ul>{outcome.measurementIds.map((id) => <li key={id}><code>{id}</code></li>)}</ul></details>}
      </article>)}
    </section>

    <details className="measurement-limits"><summary>Authority notes and limitations</summary>
      <h3>Authority notes</h3><ul>{projection.authorityNotes.map((note) => <li key={note}>{note}</li>)}</ul>
      <h3>Limitations</h3><ul>{projection.limitations.map((note) => <li key={note}>{note}</li>)}</ul>
    </details>
  </section>
}
