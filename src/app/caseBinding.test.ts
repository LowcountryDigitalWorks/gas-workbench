import { describe, expect, it } from 'vitest'
import { currentFeatureLoad } from './featureLoad'
import { decodeWorkbenchProjection } from '../engine/integrity'
import humanShellJson from '../engine/fixtures/human-review.json'
import internalShellJson from '../engine/fixtures/report-internal.json'
import { loadReportFixture } from '../engine/reportFixtures'
import { loadMeasurementFixture } from '../engine/measurementFixtures'

describe('current report and measurement selection safety', () => {
  const humanShell = decodeWorkbenchProjection(humanShellJson)
  const internalShell = decodeWorkbenchProjection(internalShellJson)

  it('rejects a former internal-appendix report if the case or decoded workspace changes', async () => {
    const value = await loadReportFixture('internal-appendix', internalShell)
    const saved = { fixture: 'internal-appendix' as const, source: internalShell, value }
    expect(currentFeatureLoad(saved, 'internal-appendix', internalShell)?.value?.report.internalAppendix).toBeDefined()
    expect(currentFeatureLoad(saved, 'focused-evidence', internalShell)).toBeUndefined()
    expect(currentFeatureLoad(saved, 'internal-appendix', humanShell)).toBeUndefined()
    expect(currentFeatureLoad(saved, 'internal-appendix', decodeWorkbenchProjection(internalShellJson))).toBeUndefined()
  })

  it('rejects an old human outcome whenever the selected measurement or shell moves', async () => {
    const value = await loadMeasurementFixture('human-outcome', humanShell)
    const saved = { fixture: 'human-outcome' as const, source: humanShell, value }
    expect(currentFeatureLoad(saved, 'human-outcome', humanShell)?.value?.outcomes).toHaveLength(1)
    expect(currentFeatureLoad(saved, 'follow-up-not-due', humanShell)).toBeUndefined()
    expect(currentFeatureLoad(saved, 'human-outcome', internalShell)).toBeUndefined()
  })
})