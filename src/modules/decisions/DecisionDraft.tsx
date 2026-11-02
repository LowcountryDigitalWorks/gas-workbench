import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import type { WorkbenchProjection } from '../../engine/projection'
import { Badge, Facts, Notice } from '../../design-system/primitives'
import { readable, timestamp } from '../../design-system/format'
import { createReviewNote } from './handoff'

export interface Draft {
  rationale: string
  disposition: string
}
export function DecisionDraft({
  projection,
  attentionId,
  draft,
  update,
  back,
}: {
  projection: WorkbenchProjection
  attentionId?: string
  draft: Draft
  update: (value: Draft) => void
  back: () => void
}) {
  const [error, setError] = useState('')
  const [prepared, setPrepared] = useState('')
  const fieldId = useId()
  const item = projection.workspace.attention.find(
    (row) => row.id === attentionId,
  )
  const existing = projection.workspace.decisionCycle
  function submit(event: FormEvent) {
    event.preventDefault()
    try {
      setPrepared(
        createReviewNote(
          projection,
          attentionId ?? '',
          draft.disposition,
          draft.rationale,
        ),
      )
      setError('')
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'The draft could not be prepared.',
      )
      setPrepared('')
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([prepared], { type: 'text/plain;charset=utf-8' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = 'gas-synthetic-review-note.txt'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <section className="decision-view">
      <h2>Human decision handoff</h2>
      <p>Draft preparation is separate from supplied decision state.</p>
      {existing && (
        <details className="supplied-decision">
          <summary>
            Supplied human decision context —{' '}
            {readable(existing.decision.disposition)}
          </summary>
          <Facts
            rows={[
              [
                'Source decision reference',
                <code>{existing.decision.id}</code>,
              ],
              ['Supplied at', timestamp(existing.decision.recordedAt)],
              ['Statement', existing.decision.summary],
              ['Readiness', readable(existing.readiness.state)],
            ]}
          />
          <p>
            No persistence is inferred from the supplied dossier. This screen
            does not change it.
          </p>
        </details>
      )}
      {!item ? (
        <Notice>
          Select an Attention item before preparing a draft. There is no
          selected review context in this snapshot.
        </Notice>
      ) : (
        <>
          <div className="draft-context">
            <Badge>Human-authored • local draft</Badge>
            <h3>
              Decision draft <span className="muted">/ Not recorded</span>
            </h3>
            <Facts
              rows={[
                ['Attention reference', <code>{item.id}</code>],
                ['Evidence identity', <code>{item.evidenceIdentity}</code>],
                [
                  'Exact page',
                  <code>{item.identity.url ?? 'Not supplied'}</code>,
                ],
              ]}
            />
            {item.readinessContext.map((reason) => (
              <Notice key={reason}>{reason}</Notice>
            ))}
          </div>
          <form onSubmit={submit} noValidate>
            <label htmlFor={`${fieldId}-disposition`}>Draft disposition</label>
            <select
              id={`${fieldId}-disposition`}
              value={draft.disposition}
              onChange={(e) => {
                update({ ...draft, disposition: e.target.value })
                setPrepared('')
              }}
            >
              <option>Request review</option>
              <option>Consider deferral</option>
              <option>Consider dismissal</option>
            </select>
            <label htmlFor={`${fieldId}-rationale`}>Human rationale</label>
            <textarea
              id={`${fieldId}-rationale`}
              rows={4}
              maxLength={2000}
              value={draft.rationale}
              onChange={(e) => {
                update({ ...draft, rationale: e.target.value })
                setPrepared('')
                setError('')
              }}
              aria-describedby={`${fieldId}-help${error ? ` ${fieldId}-error` : ''}`}
              aria-invalid={!!error}
            />
            <p id={`${fieldId}-help`} className="muted">
              1–2,000 characters. Stays in this tab until downloaded; no engine
              write or submission.
            </p>
            {error && (
              <p id={`${fieldId}-error`} role="alert" className="form-error">
                {error}
              </p>
            )}
            <div className="action-row">
              <button className="primary" type="submit">
                Prepare review note
              </button>
              <button type="button" className="text-button" onClick={back}>
                Return to linked evidence
              </button>
            </div>
          </form>
          {prepared && (
            <div className="prepared-note" role="status">
              <h3>Draft review note prepared — not recorded</h3>
              <p>
                This plain-text handoff is not an executable engine request.
              </p>
              <pre>{prepared}</pre>
              <button className="secondary" onClick={download}>
                Download draft note (.txt)
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
