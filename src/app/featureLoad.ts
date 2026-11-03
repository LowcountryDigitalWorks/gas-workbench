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
