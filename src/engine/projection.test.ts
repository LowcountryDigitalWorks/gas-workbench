import { describe, expect, it } from 'vitest'
import humanReviewFixture from './fixtures/human-review.json'
import limitedFixture from './fixtures/limited.json'
import quietFixture from './fixtures/quiet.json'
import { decodeWorkbenchProjection } from './integrity'
import { WorkbenchProjectionError } from './projection'

function expectInvalidProjection(action: () => unknown): void {
  expect(action).toThrowError(
    expect.objectContaining<Partial<WorkbenchProjectionError>>({
      code: 'invalid_projection',
    }),
  )
}

describe('Workbench engine projection boundary', () => {
  it('accepts the quiet adequately-evidenced fixture without inventing attention', () => {
    const projection = decodeWorkbenchProjection(quietFixture)

    expect(projection.source.artifactVersion).toBe('0.17.0')
    expect(projection.workspace.navigation.attention.rowCount).toBe(0)
    expect(projection.workspace.readiness.map((entry) => [entry.moduleId, entry.state])).toEqual([
      ['evidence_diff', 'not_supplied'],
      ['review_history', 'not_supplied'],
      ['search_analytics', 'ready'],
      ['search_change', 'not_supplied'],
      ['page_focus', 'not_supplied'],
      ['discovery_diagnostics', 'not_supplied'],
      ['ai_visibility', 'ready'],
    ])
  })

  it('preserves limited and not-supplied states distinctly from observed zero', () => {
    const projection = decodeWorkbenchProjection(limitedFixture)

    expect(
      projection.workspace.readiness.find((entry) => entry.moduleId === 'search_analytics')?.state,
    ).toBe('limited')
    expect(
      projection.workspace.readiness.find((entry) => entry.moduleId === 'ai_visibility')?.state,
    ).toBe('not_supplied')
    expect(projection.workspace.evidenceRows).toHaveLength(0)
    expect(projection.workspace.attention).toHaveLength(0)
  })

  it('preserves human investigation state without converting it into a recommendation', () => {
    const projection = decodeWorkbenchProjection(humanReviewFixture)

    expect(projection.workspace.decisionCycle?.decision.disposition).toBe('investigate')
    expect(projection.workspace.decisionCycle?.readiness.state).toBe('measurement_not_planned')
    expect(projection.workspace.decisionCycle?.recommendation).toBeUndefined()
    expect(projection.workspace.navigation.decisionCycle.recordedMeasurementCount).toBe(0)
    expect(projection.workspace.navigation.decisionCycle.humanOutcomeCount).toBe(0)
    expect(projection.workspace.attention[0]?.navigationOrder).toBe(1)
    expect(projection.workspace.attention[0]?.identity).toEqual({
      url: 'https://harbor-demo.example/services',
    })
  })

  it('is deterministic for equivalent JSON input', () => {
    const first = decodeWorkbenchProjection(humanReviewFixture)
    const second = decodeWorkbenchProjection(
      JSON.parse(JSON.stringify(humanReviewFixture)) as unknown,
    )

    expect(second).toEqual(first)
  })

  it('fails visibly on an unsupported Workbench projection revision', () => {
    const unsupported = structuredClone(quietFixture) as unknown as {
      schemaMinorVersion: number
    }
    unsupported.schemaMinorVersion = 1

    expect(() => decodeWorkbenchProjection(unsupported)).toThrowError(
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

    expect(() => decodeWorkbenchProjection(unsupported)).toThrowError(
      expect.objectContaining<Partial<WorkbenchProjectionError>>({
        code: 'unsupported_engine_workspace_version',
      }),
    )
  })

  it('rejects unknown fields instead of silently broadening the contract', () => {
    const widened = structuredClone(quietFixture) as unknown as Record<string, unknown>
    widened.unreviewedProviderState = true

    expectInvalidProjection(() => decodeWorkbenchProjection(widened))
  })

  it('rejects unsupported readiness values instead of coercing them', () => {
    const invalid = structuredClone(quietFixture) as unknown as {
      workspace: { readiness: Array<{ state: string }> }
    }
    invalid.workspace.readiness[0]!.state = 'healthy'

    expectInvalidProjection(() => decodeWorkbenchProjection(invalid))
  })

  it('rejects navigation counts that contradict projected Attention and evidence rows', () => {
    const invalid = structuredClone(humanReviewFixture) as unknown as {
      workspace: {
        navigation: {
          overview: { attentionCount: number }
          attention: { rowCount: number }
        }
      }
    }
    invalid.workspace.navigation.overview.attentionCount = 0
    invalid.workspace.navigation.attention.rowCount = 0

    expectInvalidProjection(() => decodeWorkbenchProjection(invalid))
  })

  it('rejects decision navigation that claims no supplied dossier', () => {
    const invalid = structuredClone(humanReviewFixture) as unknown as {
      workspace: { navigation: { decisionCycle: { supplied: boolean } } }
    }
    invalid.workspace.navigation.decisionCycle.supplied = false

    expectInvalidProjection(() => decodeWorkbenchProjection(invalid))
  })

  it('rejects dangling selected Attention identifiers', () => {
    const invalid = structuredClone(humanReviewFixture) as unknown as {
      workspace: {
        decisionCycle: { decision: { selectedAttentionIds: string[] } }
      }
    }
    invalid.workspace.decisionCycle.decision.selectedAttentionIds = ['attention:not-present']

    expectInvalidProjection(() => decodeWorkbenchProjection(invalid))
  })

  it('rejects duplicate semantic identifiers', () => {
    const invalid = structuredClone(humanReviewFixture) as unknown as {
      workspace: { attention: Array<Record<string, unknown>> }
    }
    invalid.workspace.attention.push(structuredClone(invalid.workspace.attention[0]!))

    expectInvalidProjection(() => decodeWorkbenchProjection(invalid))
  })

  it('rejects source manifest state that contradicts module readiness', () => {
    const invalid = structuredClone(limitedFixture) as unknown as {
      workspace: {
        sourceManifest: Array<{ readiness: string; reasons: string[] }>
      }
    }
    invalid.workspace.sourceManifest[0]!.readiness = 'ready'
    invalid.workspace.sourceManifest[0]!.reasons = []

    expectInvalidProjection(() => decodeWorkbenchProjection(invalid))
  })

  it('rejects a manifest entry for a module declared not supplied', () => {
    const invalid = structuredClone(quietFixture) as unknown as {
      workspace: {
        sourceManifest: Array<{ moduleId: string; readiness: string; reasons: string[] }>
      }
    }
    invalid.workspace.sourceManifest[0]!.moduleId = 'evidence_diff'
    invalid.workspace.sourceManifest[0]!.readiness = 'not_supplied'
    invalid.workspace.sourceManifest[0]!.reasons = []

    expectInvalidProjection(() => decodeWorkbenchProjection(invalid))
  })
})
