import { describe, expect, it } from 'vitest'
import humanReviewFixture from './fixtures/human-review.json'
import { decodeWorkbenchProjection } from './integrity'
import { WorkbenchProjectionError } from './projection'

function expectInvalidProjection(action: () => unknown): void {
  expect(action).toThrowError(
    expect.objectContaining<Partial<WorkbenchProjectionError>>({
      code: 'invalid_projection',
    }),
  )
}

function relabelEvidenceModule(moduleId: string): unknown {
  const invalid = structuredClone(humanReviewFixture) as unknown as {
    workspace: {
      attention: Array<{ moduleId: string }>
      evidenceRows: Array<{ moduleId: string; providerIds: string[] }>
    }
  }
  invalid.workspace.attention[0]!.moduleId = moduleId
  invalid.workspace.evidenceRows[0]!.moduleId = moduleId
  invalid.workspace.evidenceRows[0]!.providerIds = []
  return invalid
}

describe('Release 0.17 projection provenance integrity', () => {
  it('rejects evidence relabeled to an accepted but unsupplied module', () => {
    expectInvalidProjection(() => decodeWorkbenchProjection(relabelEvidenceModule('ai_visibility')))
  })

  it('rejects evidence relabeled to an unknown module', () => {
    expectInvalidProjection(() => decodeWorkbenchProjection(relabelEvidenceModule('future_module')))
  })
})
