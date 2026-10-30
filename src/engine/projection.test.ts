import { describe, expect, it } from 'vitest'
import humanReviewFixture from './fixtures/human-review.json'
import limitedFixture from './fixtures/limited.json'
import quietFixture from './fixtures/quiet.json'
import {
  parseWorkbenchProjection,
  WorkbenchProjectionError,
} from './projection'

describe('Workbench engine projection boundary', () => {
  it('accepts the quiet adequately-evidenced fixture without inventing attention', () => {
    const projection = parseWorkbenchProjection(quietFixture)

    expect(projection.source.artifactVersion).toBe('0.17.0')
    expect(projection.workspace.navigation.attention.rowCount).toBe(0)
    expect(projection.workspace.readiness.map((entry) => entry.state)).toEqual([
      'ready',
      'ready',
    ])
  })

  it('preserves limited, unavailable, and not-comparable states distinctly', () => {
    const projection = parseWorkbenchProjection(limitedFixture)

    expect(projection.workspace.readiness.map((entry) => entry.state)).toEqual([
      'limited',
      'unavailable',
    ])
    expect(projection.workspace.evidenceRows[0]?.state).toBe('not_comparable')
    expect(projection.workspace.navigation.attention.rowCount).toBe(1)
  })

  it('preserves human review state without converting it into a recommendation', () => {
    const projection = parseWorkbenchProjection(humanReviewFixture)

    expect(projection.workspace.decisionCycle?.decision.disposition).toBe('investigate')
    expect(projection.workspace.decisionCycle?.readiness.state).toBe(
      'recommendation_not_created',
    )
    expect(projection.workspace.decisionCycle?.recommendation).toBeUndefined()
    expect(projection.workspace.navigation.decisionCycle.recordedMeasurementCount).toBe(0)
    expect(projection.workspace.navigation.decisionCycle.humanOutcomeCount).toBe(0)
  })

  it('is deterministic for equivalent JSON input', () => {
    const first = parseWorkbenchProjection(humanReviewFixture)
    const second = parseWorkbenchProjection(
      JSON.parse(JSON.stringify(humanReviewFixture)) as unknown,
    )

    expect(second).toEqual(first)
  })

  it('fails visibly on an unsupported Workbench projection revision', () => {
    const unsupported = structuredClone(quietFixture) as unknown as {
      schemaMinorVersion: number
    }
    unsupported.schemaMinorVersion = 1

    expect(() => parseWorkbenchProjection(unsupported)).toThrowError(
      expect.objectContaining<Partial<WorkbenchProjectionError>>({
        code: 'unsupported_projection_version',
      }),
    )
  })

  it('fails visibly on an unsupported engine workspace version', () => {
    const unsupported = structuredClone(quietFixture) as unknown as {
      source: { artifactVersion: string }
    }
    unsupported.source.artifactVersion = '0.18.0'

    expect(() => parseWorkbenchProjection(unsupported)).toThrowError(
      expect.objectContaining<Partial<WorkbenchProjectionError>>({
        code: 'unsupported_engine_workspace_version',
      }),
    )
  })

  it('rejects unknown fields instead of silently broadening the contract', () => {
    const widened = structuredClone(quietFixture) as unknown as Record<string, unknown>
    widened.unreviewedProviderState = true

    expect(() => parseWorkbenchProjection(widened)).toThrowError(
      expect.objectContaining<Partial<WorkbenchProjectionError>>({
        code: 'invalid_projection',
      }),
    )
  })

  it('rejects unsupported readiness values instead of coercing them', () => {
    const invalid = structuredClone(quietFixture) as unknown as {
      workspace: { readiness: Array<{ state: string }> }
    }
    invalid.workspace.readiness[0]!.state = 'healthy'

    expect(() => parseWorkbenchProjection(invalid)).toThrowError(
      expect.objectContaining<Partial<WorkbenchProjectionError>>({
        code: 'invalid_projection',
      }),
    )
  })
})
