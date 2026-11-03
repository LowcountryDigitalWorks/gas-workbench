import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import shellJson from '../../engine/fixtures/human-review.json'
import { decodeWorkbenchProjection } from '../../engine/integrity'
import { loadMeasurementFixture } from '../../engine/measurementFixtures'
import { Measurement } from './Measurement'

const shell = decodeWorkbenchProjection(shellJson)
const noop = () => {}
async function render(id: 'follow-up-not-due' | 'limited-comparison' | 'ready-for-assessment' | 'human-outcome') {
  return renderToStaticMarkup(<Measurement projection={await loadMeasurementFixture(id, shell)} fixture={id} chooseFixture={noop}/>)
}

describe('Measure / Outcomes operator slice', () => {
  it('shows follow-up not due as explicit absence of due evidence, not zero', async () => {
    const html = await render('follow-up-not-due')
    expect(html).toContain('follow up not due')
    expect(html).toContain('Follow-up measurement is not due.')
    expect(html).toContain('no_change_claim_supported')
    expect(html).not.toContain('human authored</span>')
  })

  it('keeps observed numeric zero while blocking an incomparable directional interpretation', async () => {
    const html = await render('limited-comparison')
    expect(html).toContain('observation:synthetic-baseline-clicks')
    expect(html).toContain('<strong>0</strong>')
    expect(html).toContain('Claim ceiling: not interpretable')
    expect(html).toContain('source or method context changed')
    expect(html).not.toContain('caused')
  })

  it('makes ready-for-assessment a human handoff rather than an automatic outcome', async () => {
    const html = await render('ready-for-assessment')
    expect(html).toContain('ready for human assessment')
    expect(html).toContain('Claim ceiling: temporal association only')
    expect(html).toContain('observed_temporal_change')
    expect(html).toContain('No human outcome is recorded')
    expect(html).toContain('does not choose an outcome direction')
  })

  it('labels a recorded direction and attribution as human-authored history', async () => {
    const html = await render('human-outcome')
    expect(html).toContain('Outcome ledger')
    expect(html).toContain('improved')
    expect(html).toContain('human authored')
    expect(html).toContain('Attribution:')
    expect(html).toContain('causal attribution')
    expect(html).toContain('measurement:synthetic-baseline')
    expect(html).toContain('measurement:synthetic-follow-up')
  })
  it('keeps the selector available without stale measurement outcomes while a case is pending', () => {
    const pending = renderToStaticMarkup(<Measurement fixture="human-outcome" chooseFixture={noop}/>)
    expect(pending).toContain('Measurement walkthrough')
    expect(pending).toContain('role="status"')
    expect(pending).toContain('Checking measurement projection')
    expect(pending).not.toContain('Outcome ledger')
    expect(pending).not.toContain('human authored')
    const rejected = renderToStaticMarkup(<Measurement fixture="human-outcome" error="Mismatched workspace" chooseFixture={noop}/>)
    expect(rejected).toContain('role="alert"')
    expect(rejected).toContain('Mismatched workspace')
    expect(rejected).not.toContain('Outcome ledger')
  })
})
