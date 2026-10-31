import type { ReactNode } from 'react'

export function Icon({ name }: { name: string }) {
  return (
    <img
      className="icon"
      src={`/assets/${name}.svg`}
      alt=""
      aria-hidden="true"
    />
  )
}
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'ready' | 'limited'
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="notice">
      <Icon name="info-circle" />
      <div>{children}</div>
    </div>
  )
}
export function Facts({
  rows,
}: {
  rows: readonly (readonly [string, ReactNode])[]
}) {
  return (
    <dl className="facts">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}
