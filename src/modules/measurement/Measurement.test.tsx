import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { decodeWorkbenchProjection } from '../../engine/integrity'
import { loadMeasurementFixture } from '../../engine/measurementFixtures'
import followUpShell from '../../engine/fixtures/measurement-follow-up-not-due.json'
import incomparableShell from '../../engine/fixtures/measurement-measured-not-comparable.json'
import readyShell from '../../engine/fixtures/measurement-ready-human-assessment.json'
import outcomeShell from '../../engine/fixtures/measurement-human-outcome-recorded.json'
import blockedShell from '../../engine/fixtures/measurement-blocked-not-interpretable.json'
import { Measurement } from './Measurement'

const noop = () => {}
async function html(
  fixture: Parameters<typeof loadMeasurementFixture>[0],
  shellJson: unknown,
) {
  const shell = decodeWorkbenchProjection(shellJson)
  const projection = await loadMeasurementFixture(fixture, shell)
  return renderToStaticMarkup(
    <Measurement projection={projection} fixture={fixture} chooseFixture={noop} openDecision={noop}/>,
  )
}

describe('Measurement operator slice', () => {
  it('keeps follow-up not due factual rather than rendering it as failure', async () => {
    const markup = await html('follow-up-not-due', followUpShell)
    expect(markup).toContain('Follow-up is not due — this is not a failure.')
    expect(markup).toContain('follow up not due')
    expect(markup).toContain('not interpretable')
    expect(markup).not.toContain('ROI score')
  })

  it('shows measured evidence separately from non-comparable interpretation', async () => {
    const markup = await html('measured-not-comparable', incomparableShell)
    expect(markup).toContain('measurement:baseline')
    expect(markup).toContain('measurement:follow-up')
    expect(markup).toContain('methodology_changed')
    expect(markup).toContain('canonical_measurement_discontinuous')
    expect(markup).toContain('Claim ceiling: not interpretable')
  })

  it('preserves observed numeric zero and the bounded ready claim ceiling without inventing outcome direction', async () => {
    const markup = await html('ready-human-assessment', readyShell)
    expect(markup).toContain('observation:baseline-clicks')
    expect(markup).toContain('>0</span>')
    expect(markup).toContain('Claim ceiling: temporal association only')
    expect(markup).toContain('observed_temporal_change')
    expect(markup).toContain('No human outcome supplied.')
    expect(markup).toContain('Numeric movement does not create an outcome direction automatically.')
  })

  it('labels recorded outcome direction as human/trusted-caller state', async () => {
    const markup = await html('human-outcome-recorded', outcomeShell)
    expect(markup).toContain('Human/trusted-caller authored outcome')
    expect(markup).toContain('This direction is recorded human/trusted-caller state')
    expect(markup).toContain('improved')
    expect(markup).toContain('association')
    expect(markup).toContain('Human reviewer recorded improvement')
  })

  it('keeps missing observation state distinct from observed zero in the blocked case', async () => {
    const markup = await html('blocked-not-interpretable', blockedShell)
    expect(markup).toContain('unknown — Synthetic source observation unavailable for this case.')
    expect(markup).toContain('canonical_measurement_observation_missing')
    expect(markup).toContain('Workbench does not recompute or strengthen this interpretation.')
    expect(markup).toContain('business_or_revenue_causality')
  })
})
