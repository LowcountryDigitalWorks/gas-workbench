import { decodeWorkbenchProjection } from '../engine/integrity'
export const fixtureIds = ['quiet', 'limited', 'human-review', 'visibility-review'] as const
export type FixtureId = (typeof fixtureIds)[number]
export async function loadFixture(id: FixtureId) {
  const modules = {
    quiet: () => import('../engine/fixtures/quiet.json'),
    limited: () => import('../engine/fixtures/limited.json'),
    'human-review': () => import('../engine/fixtures/human-review.json'),
    'visibility-review': () => import('../engine/fixtures/visibility-review.json'),
  }
  const result = await modules[id]()
  return decodeWorkbenchProjection(result.default)
}
