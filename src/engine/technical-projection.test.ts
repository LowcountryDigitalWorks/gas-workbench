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
    expect(() => parseTechnicalProjection(falseAbsence)).toThrow('cannot assert a delta or an absent-side value')
    const incompatible = copy(changed); incompatible.collections[1].adapterMapping = '4.0.0'
    expect(() => parseTechnicalProjection(incompatible)).toThrow('Incompatible Technical collection identities')
    const badCount = copy(changed); badCount.diff.summary.changed = 0
    expect(() => parseTechnicalProjection(badCount)).toThrow('summary counts do not reconcile')

    const danglingBaseline = copy(changed)
    danglingBaseline.diff.entries[0].baselineObservationId = 'observation:absent'
    expect(() => parseTechnicalProjection(danglingBaseline)).toThrow('absent from baseline collection')

    const mismatchedCurrentValue = copy(changed)
    mismatchedCurrentValue.diff.entries[0].currentValue = 'Disconnected supplied value'
    expect(() => parseTechnicalProjection(mismatchedCurrentValue)).toThrow('current value does not match observation')
  })
  it('preserves either known side of coverage-unknown entries without asserting absence', () => {
    expect(parseTechnicalProjection(coverage).diff?.entries[0]).toMatchObject({
      state: 'coverage_unknown',
      baselineObservationId: 'observation:siteone-baseline',
    })
    const currentOnly = copy(coverage) as typeof coverage & { collections: Array<{ completeness: string; observations: Array<{ id: string; code: string; value: string }> }>; diff: { entries: Array<Record<string, unknown>> } }
    currentOnly.collections[0].completeness = 'unknown'
    currentOnly.collections[0].availability = 'partial'
    const baselineReasons = currentOnly.collections[0].reasons as string[]
    baselineReasons.push('coverage_unknown')
    currentOnly.collections[1].completeness = 'complete'
    currentOnly.collections[1].observations.push({ id: 'observation:siteone-current', code: 'page-title', value: 'Harbor services' })
    const currentEntry = currentOnly.diff.entries[0] as Record<string, unknown>
    delete currentEntry.baselineObservationId
    currentEntry.currentObservationId = 'observation:siteone-current'
    currentEntry.currentValue = 'Harbor services'
    expect(parseTechnicalProjection(currentOnly).diff?.entries[0]).toMatchObject({
      state: 'coverage_unknown',
      currentObservationId: 'observation:siteone-current',
      currentValue: 'Harbor services',
    })
    const bothSides = copy(currentOnly)
    bothSides.diff.entries[0].baselineObservationId = 'observation:siteone-baseline'
    expect(() => parseTechnicalProjection(bothSides)).toThrow('coverage_unknown requires exactly one supplied-side observation')
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
  it('preserves exact Discovery provider namespaces and rejects transformed or WQT provider IDs', () => {
    type MutableDiscovery = { discovery: { providers: Array<Record<string, unknown>>; urls: Array<{ providers: Array<Record<string, unknown>>; indexNow: Record<string, unknown> }> } }
    const transformed = copy(discovery) as unknown as MutableDiscovery
    transformed.discovery.providers[0].id = 'google_search_console'
    expect(() => parseTechnicalProjection(transformed)).toThrow('unsupported value')

    const mixed = copy(discovery) as unknown as MutableDiscovery
    mixed.discovery.providers[0].id = 'siteone'
    expect(() => parseTechnicalProjection(mixed)).toThrow('unsupported value')

    const unknown = copy(discovery) as unknown as MutableDiscovery
    unknown.discovery.urls[0].providers[0].id = 'google'
    expect(() => parseTechnicalProjection(unknown)).toThrow('unsupported value')

    const transformedLaterProvider = copy(discovery) as unknown as MutableDiscovery
    transformedLaterProvider.discovery.urls[0].indexNow.state = 'submission_accepted_later_present_observed'
    transformedLaterProvider.discovery.urls[0].indexNow.laterProviders = ['google_search_console']
    expect(() => parseTechnicalProjection(transformedLaterProvider)).toThrow('unsupported value')

    expect(parseTechnicalProjection(discovery).discovery?.providers.map((provider) => provider.id)).toContain('yandex-webmaster')
  })
  it('rejects Discovery state values outside accepted engine vocabularies', () => {
    type MutableUrlProvider = { discovery: { urls: Array<{ providers: Array<Record<string, unknown>> }> } }
    const invalidStates: Record<string, string> = {
      searchPresence: 'indexed',
      crawlState: 'ok',
      indexingPermission: 'permitted',
      canonicalState: 'self_canonical',
    }
    for (const [field, invalidValue] of Object.entries(invalidStates)) {
      const candidate = copy(discovery) as unknown as MutableUrlProvider
      candidate.discovery.urls[0].providers[0][field] = invalidValue
      expect(() => parseTechnicalProjection(candidate)).toThrow('unsupported value')
    }
  })
  it('preserves valid URL readiness combinations and rejects actual observation contradictions', () => {
    const validMixedReadiness = parseTechnicalProjection(discovery)
    expect(validMixedReadiness.discovery?.urls[0].state).toBe('ready')
    expect(validMixedReadiness.discovery?.urls[0].providers[1].observationState).toBe('observed_provider_not_ready')

    const mismatch = copy(discovery); mismatch.discovery.urls[0].providers[0].providerReadiness = 'not_ready'
    expect(() => parseTechnicalProjection(mismatch)).toThrow('contradicts URL observation state')

    type MutableUrlProvider = { discovery: { urls: Array<{ providers: Array<Record<string, unknown>> }> } }
    const notObservedWithFields = copy(discovery) as unknown as MutableUrlProvider
    notObservedWithFields.discovery.urls[0].providers[1].observationState = 'not_observed'
    expect(() => parseTechnicalProjection(notObservedWithFields)).toThrow('not_observed cannot carry URL observation fields')

    const validNotObserved = copy(discovery) as unknown as MutableUrlProvider
    const provider = validNotObserved.discovery.urls[0].providers[1]
    provider.observationState = 'not_observed'
    delete provider.searchPresence
    delete provider.crawlState
    delete provider.indexingPermission
    delete provider.canonicalState
    expect(() => parseTechnicalProjection(validNotObserved)).not.toThrow()
    const missingProviderState = copy(discovery) as unknown as MutableUrlProvider
    missingProviderState.discovery.urls[0].providers.pop()
    expect(() => parseTechnicalProjection(missingProviderState)).toThrow('must exactly cover the supplied search-engine readiness set')
  })
  it('rejects impossible Discovery finding and observed-search combinations', () => {
    const notReadyWithFinding = copy(discovery)
    notReadyWithFinding.discovery.urls[0].state = 'not_ready'
    expect(() => parseTechnicalProjection(notReadyWithFinding)).toThrow('not_ready cannot carry Discovery findings')

    const conflictingFinding = copy(discovery)
    conflictingFinding.discovery.urls[0].findings.push('no_cross_engine_divergence_observed')
    expect(() => parseTechnicalProjection(conflictingFinding)).toThrow('cannot coexist with candidate findings')

    const zeroQueries = copy(discovery)
    zeroQueries.discovery.urls[0].queryCount = 0
    expect(() => parseTechnicalProjection(zeroQueries)).toThrow('requires at least one observed query row')


    const unsupportedQuiet = copy(quiet)
    unsupportedQuiet.discovery.providers.pop()
    unsupportedQuiet.discovery.urls[0].providers.pop()
    expect(() => parseTechnicalProjection(unsupportedQuiet)).toThrow('ready requires at least two observed-ready search engines')
  })
  it('keeps IndexNow notification context internally coherent and bounded', () => {
    const mismatchedResult = copy(discovery)
    mismatchedResult.discovery.urls[0].indexNow.submissionResult = 'rejected'
    expect(() => parseTechnicalProjection(mismatchedResult)).toThrow('submissionResult contradicts state')

    const badStatus = copy(discovery)
    badStatus.discovery.urls[0].indexNow.resultCode = 99
    expect(() => parseTechnicalProjection(badStatus)).toThrow('HTTP status')


    type MutableIndexNowFixture = { discovery: { urls: Array<{ indexNow: { submittedAt?: string; submissionResult?: string; resultCode?: number; state: string; laterProviders: string[] } }> } }
    const validLaterPresent = copy(discovery) as unknown as MutableIndexNowFixture
    validLaterPresent.discovery.urls[0].indexNow.submittedAt = '2026-11-01T10:00:00Z'
    validLaterPresent.discovery.urls[0].indexNow.state = 'submission_accepted_later_present_observed'
    validLaterPresent.discovery.urls[0].indexNow.laterProviders = ['google-search-console', 'yandex-webmaster']
    expect(() => parseTechnicalProjection(validLaterPresent)).not.toThrow()

    const nonReadyLaterProvider = copy(validLaterPresent)
    nonReadyLaterProvider.discovery.urls[0].indexNow.laterProviders = ['bing-webmaster-tools']
    expect(() => parseTechnicalProjection(nonReadyLaterProvider)).toThrow('must reference observed-ready URL evidence')

    const preSubmissionLaterProvider = copy(validLaterPresent)
    preSubmissionLaterProvider.discovery.urls[0].indexNow.submittedAt = '2026-11-01T11:30:00Z'
    expect(() => parseTechnicalProjection(preSubmissionLaterProvider)).toThrow('must be observed after submission')

    const contradictoryLaterState = copy(validLaterPresent)
    contradictoryLaterState.discovery.urls[0].indexNow.state = 'submission_accepted_later_absent_observed'
    expect(() => parseTechnicalProjection(contradictoryLaterState)).toThrow('contradicts named provider search presence')

    const duplicateLaterProvider = copy(validLaterPresent)
    duplicateLaterProvider.discovery.urls[0].indexNow.laterProviders = ['google-search-console', 'google-search-console']
    expect(() => parseTechnicalProjection(duplicateLaterProvider)).toThrow('cannot contain duplicate provider IDs')
  })
  it('rejects duplicate Discovery source IDs', () => {
    const duplicate = copy(discovery); duplicate.discovery.providers.push(copy(duplicate.discovery.providers[0]))
    expect(() => parseTechnicalProjection(duplicate)).toThrow('Duplicate Discovery provider ID')
    const duplicateUrl = copy(discovery); duplicateUrl.discovery.urls.push(copy(duplicateUrl.discovery.urls[0]))
    expect(() => parseTechnicalProjection(duplicateUrl)).toThrow('Duplicate Discovery URL ID')
  })
})
