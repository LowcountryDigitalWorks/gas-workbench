import { describe, expect, it } from 'vitest'
import comparable from './fixtures/visibility/comparable-search.json'
import aiLimited from './fixtures/visibility/ai-limited.json'
import { decodeWorkbenchProjection } from './integrity'
import { decodeVisibilityProjection, parseVisibilityProjection } from './visibility-projection'
import shellJson from './fixtures/visibility-review.json'

const shell = decodeWorkbenchProjection(shellJson)
const clone = <T,>(value: T): T => structuredClone(value)

describe('Visibility feature projection boundary', () => {
  it('decodes matched feature and shell identities and exact Attention linkage', () => {
    const feature = decodeVisibilityProjection(comparable, shell)
    expect(feature.identity.workspaceId).toBe(shell.source.workspaceId)
    expect(feature.sources[0].attentionId).toBe(shell.workspace.attention[0].id)
  })
  it('rejects wrong versions and unknown widening', () => {
    const wrong = clone(comparable) as Record<string, unknown>
    wrong.schemaMinorVersion = 1
    expect(() => parseVisibilityProjection(wrong)).toThrow('Unsupported Visibility')
    const widened = clone(comparable) as Record<string, unknown>
    widened.futureField = true
    expect(() => parseVisibilityProjection(widened)).toThrow('not supported')
  })
  it('rejects combined modality and preserves legacy as subtype-not-established', () => {
    const combined = clone(comparable) as { sources: Record<string, unknown>[] }
    combined.sources[0].modality = 'combined'
    expect(() => parseVisibilityProjection(combined)).toThrow('unsupported value')
    const legacy = clone(comparable) as { sources: Record<string, unknown>[] }
    legacy.sources[0].modality = 'legacy_subtype_not_established'
    expect(parseVisibilityProjection(legacy).sources[0].modality).toBe('legacy_subtype_not_established')
  })
  it('rejects shell identity mismatch and dangling claimed links', () => {
    const mismatch = clone(shellJson) as { workspace: { scope: { siteScopeRevisionId: string } } }
    mismatch.workspace.scope.siteScopeRevisionId = 'scope:other'
    expect(() => decodeVisibilityProjection(comparable, decodeWorkbenchProjection(mismatch))).toThrow('identities do not match')
    const dangling = clone(comparable) as { sources: Record<string, unknown>[] }
    dangling.sources[0].attentionId = 'attention:missing'
    expect(() => decodeVisibilityProjection(dangling, shell)).toThrow('claims an Attention/evidence link absent')
  })
  it('rejects incompatible descriptive changes and comparable modality discontinuity', () => {
    const bad = clone(comparable) as { sources: Record<string, unknown>[] }
    bad.sources[0].comparison = 'incompatible'
    bad.sources[0].readiness = 'limited'
    bad.sources[0].comparisonReasons = ['source_universe_changed']
    expect(() => parseVisibilityProjection(bad)).toThrow('Non-comparable')
    const modality = clone(comparable) as { sources: Record<string, unknown>[] }
    modality.sources[0].baselineModality = 'multimodal'
    expect(() => parseVisibilityProjection(modality)).toThrow('cannot be marked comparable')
  })
  it('keeps an observed numeric zero distinct from a missing value', () => {
    const feature = parseVisibilityProjection(aiLimited)
    expect(feature.sources[0].metrics[0].current).toBe(0)
    expect(feature.sources[2].metrics[0].current).toBeUndefined()
    expect(feature.sources[1].concentration).toEqual({ numerator: 2, denominator: 5, share: 0.4, policy: 'sampled-citation-share-v1' })
  })
})
