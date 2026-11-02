import { describe, expect, it } from 'vitest'
import { decodeWorkbenchProjection } from './integrity'
import shellJson from './fixtures/technical-review.json'
import ready from './fixtures/technical/ready.json'
import changed from './fixtures/technical/changed.json'
import coverage from './fixtures/technical/coverage-unknown.json'
import discovery from './fixtures/technical/discovery-candidate.json'
import quiet from './fixtures/technical/quiet.json'
import { decodeTechnicalProjection, parseTechnicalProjection } from './technical-projection'

const shell = decodeWorkbenchProjection(shellJson)
const copy = <T,>(value: T): T => structuredClone(value)
describe('Technical feature projection v1 minor 0', () => {
  it('decodes all five bounded public-safe states and preserves shell handoffs', () => {
    expect(parseTechnicalProjection(ready).collections[0].provider).toBe('siteone')
    expect(parseTechnicalProjection(changed).diff?.entries[0].state).toBe('changed')
    expect(parseTechnicalProjection(coverage).diff?.entries[0].state).toBe('coverage_unknown')
    expect(parseTechnicalProjection(discovery).discovery?.urls[0].clicks).toBe(0)
    expect(parseTechnicalProjection(quiet).discovery?.urls[0].findings).toContain('no_cross_engine_divergence_observed')
    expect(decodeTechnicalProjection(ready, shell).collections[0].evidenceIdentity).toBeUndefined()
    expect(decodeTechnicalProjection(changed, shell).diff?.entries[0].attentionId).toBe('attention:evidence-diff:page-title')
    expect(decodeTechnicalProjection(discovery, shell).discovery?.urls[0].attentionId).toBe('attention:discovery:services')
  })
  it('rejects wrong versions and unknown widening', () => {
    const wrong = copy(ready); wrong.schemaMinorVersion = 1
    expect(() => parseTechnicalProjection(wrong)).toThrow('Unsupported Technical projection schema/version')
    const widened = copy(ready) as typeof ready & { surprise: boolean }; widened.surprise = true
    expect(() => parseTechnicalProjection(widened)).toThrow('technical.surprise is not supported')
  })
  it('binds shell identity and rejects dangling evidence or attention references', () => {
    const mismatch = copy(shellJson); mismatch.workspace.scope.siteId = 'site:other'
    expect(() => decodeTechnicalProjection(ready, decodeWorkbenchProjection(mismatch))).toThrow('identities do not match')
    const dangling = copy(ready) as { collections: Array<Record<string, unknown>> }; dangling.collections[0].evidenceIdentity = 'synthetic:absent'
    expect(() => decodeTechnicalProjection(dangling, shell)).toThrow('absent from the matched shell')
    const attention = copy(changed) as { diff: { entries: Array<Record<string, unknown>> } }; attention.diff.entries[0].attentionId = 'attention:absent'
    expect(() => decodeTechnicalProjection(attention, shell)).toThrow('Attention reference')
  })
  it('rejects duplicate collection and observation identities', () => {
    const duplicate = copy(ready); duplicate.collections.push(copy(duplicate.collections[0]))
    expect(() => parseTechnicalProjection(duplicate)).toThrow('Duplicate Technical collection id')
    const observations = copy(ready); observations.collections[0].observations.push(copy(observations.collections[0].observations[0]))
    expect(() => parseTechnicalProjection(observations)).toThrow('duplicate observation ID')
  })
  it('keeps diff vocabulary, coverage ambiguity, summaries, and collection identity fail-closed', () => {
    const invalid = copy(changed); invalid.diff.entries[0].state = 'regressed'
    expect(() => parseTechnicalProjection(invalid)).toThrow('unsupported value')
    const falseAbsence = copy(coverage) as { diff: { entries: Array<Record<string, unknown>> } }; falseAbsence.diff.entries[0].currentValue = 'missing'
    expect(() => parseTechnicalProjection(falseAbsence)).toThrow('coverage_unknown cannot assert')
    const incompatible = copy(changed); incompatible.collections[1].adapterMapping = '4.0.0'
    expect(() => parseTechnicalProjection(incompatible)).toThrow('Incompatible Technical collection identities')
    const badCount = copy(changed); badCount.diff.summary.changed = 0
    expect(() => parseTechnicalProjection(badCount)).toThrow('summary counts do not reconcile')
  })
  it('enforces Discovery finding, readiness, search missingness, and IndexNow vocabularies', () => {
    const finding = copy(discovery); finding.discovery.urls[0].findings[0] = 'critical_failure'
    expect(() => parseTechnicalProjection(finding)).toThrow('unsupported value')
    const contradiction = copy(discovery); contradiction.discovery.providers[0].coverage = 'partial'
    expect(() => parseTechnicalProjection(contradiction)).toThrow('ready contradicts incomplete coverage')
    const falseZero = copy(discovery); falseZero.discovery.urls[0].searchContext = 'not_observed'
    expect(() => parseTechnicalProjection(falseZero)).toThrow('cannot carry counts')
    const falseIndexing = copy(discovery) as { discovery: { urls: Array<{ indexNow: Record<string, unknown> }> } }; falseIndexing.discovery.urls[0].indexNow.state = 'caused_indexing'
    expect(() => parseTechnicalProjection(falseIndexing)).toThrow('unsupported value')
    expect(parseTechnicalProjection(discovery).discovery?.urls[0].clicks).toBe(0)
  })
  it('rejects URL readiness contradictions and duplicate Discovery source IDs', () => {
    const mismatch = copy(discovery); mismatch.discovery.urls[0].providers[0].providerReadiness = 'not_ready'
    expect(() => parseTechnicalProjection(mismatch)).toThrow('contradicts URL observation state')
    const duplicate = copy(discovery); duplicate.discovery.providers.push(copy(duplicate.discovery.providers[0]))
    expect(() => parseTechnicalProjection(duplicate)).toThrow('Duplicate Discovery provider ID')
    const duplicateUrl = copy(discovery); duplicateUrl.discovery.urls.push(copy(duplicateUrl.discovery.urls[0]))
    expect(() => parseTechnicalProjection(duplicateUrl)).toThrow('Duplicate Discovery URL ID')
  })
})
