import { decodeWorkbenchProjection } from '../engine/integrity'

export const fixtureIds = [
  'quiet',
  'limited',
  'human-review',
  'visibility-review',
  'technical-review',
  'measurement-follow-up-not-due',
  'measurement-measured-not-comparable',
  'measurement-ready-human-assessment',
  'measurement-human-outcome-recorded',
  'measurement-blocked-not-interpretable',
] as const

export const fixturePickerIds = [
  'quiet',
  'limited',
  'human-review',
  'visibility-review',
  'technical-review',
] as const satisfies readonly (typeof fixtureIds)[number][]

export type FixtureId = (typeof fixtureIds)[number]

export async function loadFixture(id: FixtureId) {
  const modules = {
    quiet: () => import('../engine/fixtures/quiet.json'),
    limited: () => import('../engine/fixtures/limited.json'),
    'human-review': () => import('../engine/fixtures/human-review.json'),
    'visibility-review': () => import('../engine/fixtures/visibility-review.json'),
    'technical-review': () => import('../engine/fixtures/technical-review.json'),
    'measurement-follow-up-not-due': () => import('../engine/fixtures/measurement-follow-up-not-due.json'),
    'measurement-measured-not-comparable': () => import('../engine/fixtures/measurement-measured-not-comparable.json'),
    'measurement-ready-human-assessment': () => import('../engine/fixtures/measurement-ready-human-assessment.json'),
    'measurement-human-outcome-recorded': () => import('../engine/fixtures/measurement-human-outcome-recorded.json'),
    'measurement-blocked-not-interpretable': () => import('../engine/fixtures/measurement-blocked-not-interpretable.json'),
  }
  const result = await modules[id]()
  return decodeWorkbenchProjection(result.default)
}
