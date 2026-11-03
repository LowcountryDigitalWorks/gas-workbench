import { decodeWorkbenchProjection } from '../engine/integrity'
export const fixtureIds = ['quiet', 'limited', 'human-review', 'visibility-review', 'technical-review'] as const
export type FixtureId = (typeof fixtureIds)[number] | 'report-outcome' | 'report-internal'
export async function loadFixture(id: FixtureId) {
  const modules = {
    quiet: () => import('../engine/fixtures/quiet.json'),
    limited: () => import('../engine/fixtures/limited.json'),
    'human-review': () => import('../engine/fixtures/human-review.json'),
    'visibility-review': () => import('../engine/fixtures/visibility-review.json'),
    'technical-review': () => import('../engine/fixtures/technical-review.json'),
    'report-outcome': () => import('../engine/fixtures/report-outcome.json'),
    'report-internal': () => import('../engine/fixtures/report-internal.json'),
  }
  const result = await modules[id]()
  return decodeWorkbenchProjection(result.default)
}
