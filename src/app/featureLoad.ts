/**
 * Scope asynchronous feature data to the exact selected walkthrough and
 * decoded shell object. Never relabel old evidence after selection changes.
 */
export interface FeatureLoad<Value, Case, Source extends object> {
  readonly fixture: Case
  readonly source: Source
  readonly value?: Value
  readonly error?: string
}

export function currentFeatureLoad<Value, Case, Source extends object>(
  loaded: FeatureLoad<Value, Case, Source> | undefined,
  fixture: Case,
  source: Source | undefined,
): FeatureLoad<Value, Case, Source> | undefined {
  return source !== undefined && loaded?.fixture === fixture && loaded.source === source
    ? loaded
    : undefined
}

/** Technical samples are bound to the technical-review shell. Other shells must not call the decoder. */
export function technicalShellAllowsLoad(shellFixture: string): boolean {
  return shellFixture === 'technical-review'
}

export const technicalShellInstruction =
  'This technical walkthrough is unavailable for the selected workspace. Choose Technical review to view its compatible projection.'

/**
 * Outer fixture changes return Home, except the two explicit recoveries:
 * Technical already open and choosing Technical review, or Measure already
 * open and choosing Human review. The caller still clears selections and drafts.
 */
export function keepsCurrentViewOnFixtureChange(view: string, nextShellFixture: string): boolean {
  return (view === 'technical' && nextShellFixture === 'technical-review')
    || (view === 'measurement' && nextShellFixture === 'human-review')
}
