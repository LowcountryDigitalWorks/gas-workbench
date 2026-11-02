import followUpNotDue from './fixtures/measurement/follow-up-not-due.json'
import measuredNotComparable from './fixtures/measurement/measured-not-comparable.json'
import readyHumanAssessment from './fixtures/measurement/ready-human-assessment.json'
import humanOutcomeRecorded from './fixtures/measurement/human-outcome-recorded.json'
import blockedNotInterpretable from './fixtures/measurement/blocked-not-interpretable.json'
import type { WorkbenchProjection } from './projection'
import { decodeMeasurementProjection } from './measurement-projection'

export const measurementFixtureIds = [
  'follow-up-not-due',
  'measured-not-comparable',
  'ready-human-assessment',
  'human-outcome-recorded',
  'blocked-not-interpretable',
] as const

export type MeasurementFixtureId = (typeof measurementFixtureIds)[number]

const fixtures = {
  'follow-up-not-due': followUpNotDue,
  'measured-not-comparable': measuredNotComparable,
  'ready-human-assessment': readyHumanAssessment,
  'human-outcome-recorded': humanOutcomeRecorded,
  'blocked-not-interpretable': blockedNotInterpretable,
}

export async function loadMeasurementFixture(id: MeasurementFixtureId, shell: WorkbenchProjection) {
  return decodeMeasurementProjection(fixtures[id], shell)
}
