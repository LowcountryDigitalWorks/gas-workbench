import { useRef, useState } from 'react'
import type { WorkbenchProjection } from '../../engine/projection'
import { Badge, Facts, Icon, Notice } from '../../design-system/primitives'
import { moduleName, providerName, readable } from '../../design-system/format'
import { filterSources, safeHttpUrl } from './presentation'

export function Evidence({
  projection,
  selected,
  select,
  review,
}: {
  projection: WorkbenchProjection
  selected?: string
  select: (id?: string) => void
  review: (attentionId: string) => void
}) {
  const [query, setQuery] = useState('')
  const [state, setState] = useState('all')
  const opener = useRef<HTMLButtonElement | null>(null)
  const detailHeading = useRef<HTMLHeadingElement>(null)
  const w = projection.workspace
  const filtered = filterSources(w.readiness, w.sourceManifest, query, state)
  const entry = w.readiness.find((source) => source.moduleId === selected)
  const sources = w.sourceManifest.filter(
    (source) => source.moduleId === selected,
  )
  const evidence = w.evidenceRows.filter((row) => row.moduleId === selected)
  const linked = w.attention.filter((row) => row.moduleId === selected)
  function close() {
    const target = opener.current?.isConnected
      ? opener.current
      : (document.querySelector<HTMLButtonElement>(
          '.source-row[aria-pressed="true"]',
        ) ?? document.querySelector<HTMLInputElement>('.filters input'))
    select(undefined)
    requestAnimationFrame(() => target?.focus())
  }
  return (
    <section className="evidence-layout" aria-label="Evidence workspace">
      <div className="source-ledger">
        <h2>Source evidence</h2>
        <div className="filters">
          <label className="search-field">
            <span className="sr-only">Find a source or reference</span>
            <Icon name="search" />
            <input
              value={query}
              placeholder="Find a source or reference"
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label>
            <span className="sr-only">Readiness filter</span>
            <select value={state} onChange={(e) => setState(e.target.value)}>
              <option value="all">All states</option>
              <option value="ready">Ready</option>
              <option value="limited">Limited</option>
              <option value="not_supplied">Not supplied</option>
              <option value="unavailable">Unavailable</option>
              <option value="not_ready">Not ready</option>
            </select>
          </label>
        </div>
        <p className="filter-status" role="status" aria-live="polite">
          {filtered.length} of {w.readiness.length} modules shown
        </p>
        <ul className="source-list">
          {filtered
            .filter(
              (source) =>
                source.state !== 'not_supplied' ||
                query !== '' ||
                state !== 'all',
            )
            .map((source) => {
              const manifest = w.sourceManifest.filter(
                (item) => item.moduleId === source.moduleId,
              )
              return (
                <li key={source.moduleId}>
                  <button
                    className="source-row"
                    aria-pressed={selected === source.moduleId}
                    aria-controls="source-inspector"
                    onClick={(e) => {
                      opener.current = e.currentTarget
                      select(source.moduleId)
                      requestAnimationFrame(() =>
                        detailHeading.current?.focus(),
                      )
                    }}
                  >
                    <span className="source-name">
                      <strong>{moduleName(source.moduleId)}</strong>
                      <small>
                        {manifest
                          .flatMap((item) => item.providerIds.map(providerName))
                          .join(', ') || 'No source supplied'}
                      </small>
                    </span>
                    <span className="source-state">
                      <Badge
                        tone={
                          source.state === 'ready'
                            ? 'ready'
                            : source.state === 'limited'
                              ? 'limited'
                              : 'neutral'
                        }
                      >
                        {source.state === 'not_supplied'
                          ? 'Not supplied'
                          : readable(source.state)}
                      </Badge>
                      {source.reasons.map((reason) => (
                        <small key={reason}>{readable(reason)}</small>
                      ))}
                    </span>
                    <Icon name="chevron-right" />
                  </button>
                </li>
              )
            })}
        </ul>
        {query === '' && state === 'all' && (
          <details className="missing-modules">
            <summary>
              Not supplied (
              {
                filtered.filter((source) => source.state === 'not_supplied')
                  .length
              }{' '}
              modules)
            </summary>
            <ul className="source-list">
              {filtered
                .filter((source) => source.state === 'not_supplied')
                .map((source) => (
                  <li key={source.moduleId}>
                    <button
                      className="source-row"
                      aria-pressed={selected === source.moduleId}
                      aria-controls="source-inspector"
                      onClick={(e) => {
                        opener.current = e.currentTarget
                        select(source.moduleId)
                        requestAnimationFrame(() =>
                          detailHeading.current?.focus(),
                        )
                      }}
                    >
                      <span className="source-name">
                        <strong>{moduleName(source.moduleId)}</strong>
                        <small>No module evidence supplied</small>
                      </span>
                      <Badge>Not supplied</Badge>
                    </button>
                  </li>
                ))}
            </ul>
          </details>
        )}
        {filtered.length === 0 && (
          <div className="empty-state">
            <h3>No sources match these filters</h3>
            <p>The underlying snapshot has not changed.</p>
            <button
              className="secondary"
              onClick={() => {
                setQuery('')
                setState('all')
              }}
            >
              Clear filters
            </button>
          </div>
        )}
        <aside className="source-explainer">
          <h3>Read the state, then the evidence</h3>
          <p>
            Not supplied is not observed zero. Ready describes module readiness,
            not site health.
          </p>
          <p>
            Comparability:{' '}
            {evidence.length
              ? 'inspect the supplied context'
              : 'not supplied for this view'}
            .
          </p>
        </aside>
      </div>
      <div id="source-inspector" className="source-inspector">
        {!entry ? (
          <div className="empty-state">
            <h2>Select a source</h2>
            <p>
              Inspect its exact identity, period, readiness and supplied
              limitations here.
            </p>
          </div>
        ) : (
          <>
            <div className="inspector-heading">
              <h2 ref={detailHeading} tabIndex={-1}>
                {moduleName(entry.moduleId)}
              </h2>
              <button
                className="icon-button"
                onClick={close}
                aria-label="Close source detail"
              >
                <Icon name="x" />
              </button>
            </div>
            <Badge>Provider / machine-derived • synthetic</Badge>
            <h3>
              {entry.state === 'not_supplied'
                ? 'No module evidence supplied'
                : entry.state === 'limited'
                  ? 'Why interpretation is limited'
                  : 'Supplied evidence context'}
            </h3>
            {entry.state === 'not_supplied' ? (
              <Notice>
                This module was not supplied. No zero, absence, readiness, or
                health conclusion is established.
              </Notice>
            ) : entry.reasons.length > 0 ? (
              <Notice>
                {entry.reasons.map((reason) => (
                  <p key={reason}>
                    <strong>
                      {reason === 'current:coverage_partial'
                        ? 'Current source coverage is partial.'
                        : 'Supplied limitation'}
                    </strong>
                    <br />
                    <code>{reason}</code>
                  </p>
                ))}
              </Notice>
            ) : (
              <p className="muted">
                No module readiness reason was supplied. Readiness alone does
                not establish a comparison or an action.
              </p>
            )}
            {[...new Set(evidence.flatMap((row) => row.readinessContext))].map(
              (reason) => (
                <Notice key={reason}>{reason}</Notice>
              ),
            )}
            <Facts
              rows={[
                ['Module', <code>{entry.moduleId}</code>],
                ['Readiness', readable(entry.state)],
                [
                  'Comparability',
                  'Not supplied as a separate field; no comparison inferred.',
                ],
              ]}
            />
            {sources.map((source) => (
              <div className="source-provenance" key={source.identity}>
                <h3>Exact provenance</h3>
                <Facts
                  rows={[
                    [
                      'Provider',
                      <>
                        {source.providerIds.map((provider) => (
                          <span className="provider" key={provider}>
                            {providerName(provider)} <code>{provider}</code>
                          </span>
                        ))}
                      </>,
                    ],
                    ['Source identity', <code>{source.identity}</code>],
                    ['Source release', source.release],
                    [
                      'Source window',
                      source.sourcePeriods.length
                        ? source.sourcePeriods
                            .map((period) => `${period.start} – ${period.end}`)
                            .join('; ')
                        : 'Not supplied',
                    ],
                  ]}
                />
                {source.reasons
                  .filter((reason) => !entry.reasons.includes(reason))
                  .map((reason) => (
                    <Notice key={reason}>
                      <code>{reason}</code>
                    </Notice>
                  ))}
              </div>
            ))}
            {evidence.map((row) => (
              <div className="exact-evidence" key={row.id}>
                <h3>Evidence reference</h3>
                <Facts
                  rows={[
                    ['Exact identity', <code>{row.evidenceIdentity}</code>],
                    ['Row / Attention ID', <code>{row.id}</code>],
                    [
                      'Kind / state',
                      `${readable(row.kind)} / ${readable(row.state)}`,
                    ],
                    [
                      'Page',
                      row.url ? (
                        <>
                          <code>{row.url}</code>
                          {safeHttpUrl(row.url) && (
                            <a
                              className="external-link"
                              href={safeHttpUrl(row.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Open page <Icon name="external-link" />
                              <span className="sr-only"> in a new tab</span>
                            </a>
                          )}
                        </>
                      ) : (
                        'Not supplied'
                      ),
                    ],
                    ...[
                      ['Query', row.query],
                      ['Prompt', row.promptId],
                      ['Cohort', row.cohortHash],
                    ]
                      .filter(
                        (pair): pair is [string, string] =>
                          typeof pair[1] === 'string',
                      )
                      .map(
                        ([label, value]) =>
                          [label, <code>{value}</code>] as const,
                      ),
                  ]}
                />
                {row.readinessContext.map((reason) => (
                  <Notice key={reason}>{reason}</Notice>
                ))}
              </div>
            ))}
            {sources.length > 0 && evidence.length === 0 && (
              <p className="muted">
                No evidence / Attention rows were supplied for this module. The
                source manifest above remains inspectable.
              </p>
            )}
            <div className="linked-context">
              <h3>Linked context</h3>
              {linked.length ? (
                linked.map((item) => (
                  <div key={item.id}>
                    <p>
                      <strong>Attention</strong> <code>{item.id}</code>
                    </p>
                    <p className="muted">
                      Unranked human review; no automatic recommendation.
                    </p>
                    <button className="primary" onClick={() => review(item.id)}>
                      Open linked Attention
                    </button>
                  </div>
                ))
              ) : (
                <p>No Attention item supplied for this module.</p>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
