import { describe, expect, it } from 'vitest'
import comparable from './fixtures/visibility/comparable-search.json'
import aiLimited from './fixtures/visibility/ai-limited.json'
import mixedAvailability from './fixtures/visibility/mixed-availability.json'
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
  it('binds legacy Web and minor1 modalities to explicit source universes', () => {
    const legacy = clone(aiLimited) as { sources: Record<string, unknown>[] }
    expect(parseVisibilityProjection(legacy).sources[0].modality).toBe('legacy_subtype_not_established')
    for (const modality of ['text_based', 'multimodal']) {
      const relabeled = clone(aiLimited) as { sources: Record<string, unknown>[] }
      relabeled.sources[0].modality = modality
      expect(() => parseVisibilityProjection(relabeled)).toThrow('cannot be relabeled')
    }

    expect(parseVisibilityProjection(comparable).sources[0].modality).toBe('text_based')
    expect(parseVisibilityProjection(mixedAvailability).sources[0].modality).toBe('multimodal')
    const minor1Legacy = clone(comparable) as { sources: Record<string, unknown>[] }
    minor1Legacy.sources[0].modality = 'legacy_subtype_not_established'
    expect(() => parseVisibilityProjection(minor1Legacy)).toThrow('must preserve its text-based or multimodal identity')

    const combined = clone(comparable) as { sources: Record<string, unknown>[] }
    combined.sources[0].modality = 'combined'
    expect(() => parseVisibilityProjection(combined)).toThrow('unsupported value')
  })
  it('rejects Search/Web source fields on AI Visibility and requires paired baseline identity', () => {
    const aiModality = clone(aiLimited) as { sources: Record<string, unknown>[] }
    aiModality.sources[1].modality = 'text_based'
    expect(() => parseVisibilityProjection(aiModality)).toThrow('cannot carry Search/Web')
    const aiBaselineModality = clone(aiLimited) as { sources: Record<string, unknown>[] }
    aiBaselineModality.sources[1].baselineModality = 'multimodal'
    expect(() => parseVisibilityProjection(aiBaselineModality)).toThrow('cannot carry Search/Web')
    const aiUniverse = clone(aiLimited) as { sources: Record<string, unknown>[] }
    aiUniverse.sources[1].sourceUniverse = 'search_performance_minor1'
    expect(() => parseVisibilityProjection(aiUniverse)).toThrow('cannot carry Search/Web')
    const incompleteBaseline = clone(comparable) as { sources: Record<string, unknown>[] }
    delete incompleteBaseline.sources[0].baselineSourceUniverse
    expect(() => parseVisibilityProjection(incompleteBaseline)).toThrow('must be supplied together')
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
    const crossUniverse = clone(comparable) as { sources: Record<string, unknown>[] }
    crossUniverse.sources[0].baselineSourceUniverse = 'legacy_generic_web'
    crossUniverse.sources[0].baselineModality = 'legacy_subtype_not_established'
    expect(() => parseVisibilityProjection(crossUniverse)).toThrow('cannot be marked comparable')
  })
  it('keeps an observed numeric zero distinct from a missing value', () => {
    const feature = parseVisibilityProjection(aiLimited)
    expect(feature.sources[0].metrics[0].current).toBe(0)
    expect(feature.sources[2].metrics[0].current).toBeUndefined()
    expect(feature.sources[1].concentration).toEqual({ numerator: 2, denominator: 5, share: 0.4, policy: 'sampled-citation-share-v1' })
  })
})
