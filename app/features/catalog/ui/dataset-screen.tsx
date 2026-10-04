'use client'

import { ArrowLeftIcon, ArrowUpRightIcon } from 'lucide-react'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { CrossAppLink } from '@/components/common/cross-app-link'
import { ReturnToOrigin } from '@/components/common/return-to-origin'
import { buttonVariants } from '@/components/ui/button'
import type { Metric, Note, Table } from '@/contracts/catalog'
import { routes } from '@/lib/catalog/routes'
import { cn } from '@/lib/utils'

import { isNotFound, useDataset } from '../api/catalog'
import { columnExtras, countsOf, periodOf, splitTables } from '../model/catalog'

// 一个数据集：摘要、表与列、口径、局限。只有结构，看不到任何一行的数值。
export function DatasetScreen({ dataset }: { dataset: string }) {
  const t = useTranslations('catalog.dataset')
  const format = useFormatter()
  const locale = useLocale()
  const search = useSearchParams()
  const origin = { from: search.get('from'), ref: search.get('ref') }
  const found = useDataset(dataset)
  const back = (
    <Link
      href={routes.catalog(locale, origin)}
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
    >
      <ArrowLeftIcon className="size-3.5" />
      {t('toCatalog')}
    </Link>
  )

  if (found.isPending) {
    return (
      <Frame>
        {back}
        <p className="text-muted-foreground text-sm">{t('loading')}</p>
      </Frame>
    )
  }
  if (found.isError) {
    return (
      <Frame>
        {back}
        <div role="alert" className="rounded-xl border px-4 py-8 text-center">
          <p className="text-base font-medium">
            {isNotFound(found.error) ? t('notFound') : t('failed')}
          </p>
          {isNotFound(found.error) ? (
            <p className="text-muted-foreground mt-1 font-mono text-[13px]">{dataset}</p>
          ) : null}
        </div>
      </Frame>
    )
  }

  const data = found.data
  const period = periodOf(data)
  const tables = splitTables(data.tables)
  const counts = countsOf(data)
  return (
    <Frame>
      {back}
      <header className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{data.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {data.security_code ? (
              <span className="text-foreground mr-2 font-mono">{data.security_code}</span>
            ) : null}
            {t('counts', counts)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ReturnToOrigin className={cn(buttonVariants({ variant: 'outline' }))}>
            {t('back')}
          </ReturnToOrigin>
          {data.security_code ? (
            <CrossAppLink
              to="info.request"
              values={{ code: data.security_code }}
              className={cn(buttonVariants({ variant: 'outline' }), 'gap-1')}
            >
              {t('requestUpdate')}
              <ArrowUpRightIcon className="size-3.5" />
            </CrossAppLink>
          ) : null}
        </div>
      </header>

      <dl
        aria-label={t('summary')}
        className="grid gap-x-8 gap-y-3 rounded-xl border px-4 py-4 text-sm sm:grid-cols-2"
      >
        <Fact label={t('period')}>{period ? t('periodValue', period) : t('periodUnknown')}</Fact>
        <Fact label={t('version')}>
          <span className="font-mono text-[13px] break-all">{data.data_version}</span>
        </Fact>
        <Fact label={t('updated')}>
          {data.updated_at
            ? format.dateTime(new Date(data.updated_at), {
                dateStyle: 'medium',
                timeStyle: 'short',
              })
            : t('builtIn')}
        </Fact>
        <Fact label={t('id')}>
          <span className="font-mono text-[13px] break-all">{data.dataset}</span>
        </Fact>
        {data.sources.map((note) => (
          <Fact key={note.key} label={note.label} wide>
            {note.text}
          </Fact>
        ))}
      </dl>

      <p className="bg-muted/60 text-muted-foreground rounded-lg px-3 py-2 text-[13px]">
        {t('structureOnly')}
      </p>

      <Section title={t('tables')} count={tables.data.length} empty={t('noTables')}>
        {tables.data.map((table) => (
          <TableCard key={table.name} table={table} />
        ))}
      </Section>

      <Section title={t('metrics')} count={data.metrics.length} empty={t('noMetrics')}>
        {data.metrics.length ? (
          <ul aria-label={t('metrics')} className="divide-y rounded-xl border">
            {data.metrics.map((metric) => (
              <MetricRow key={metric.name} metric={metric} />
            ))}
          </ul>
        ) : null}
      </Section>

      <Section title={t('limitations')} count={data.limitations.length} empty={t('noLimitations')}>
        {data.limitations.length ? (
          <Notes notes={data.limitations} label={t('limitations')} />
        ) : null}
      </Section>

      {tables.dictionary.length ? (
        <Section title={t('dictionary')} count={tables.dictionary.length} empty="">
          <p className="text-muted-foreground text-[13px]">{t('dictionaryHint')}</p>
          {tables.dictionary.map((table) => (
            <TableCard key={table.name} table={table} />
          ))}
        </Section>
      ) : null}
    </Frame>
  )
}

function Frame({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-10">{children}</div>
}

function Fact({
  label,
  wide = false,
  children,
}: {
  label: string
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={cn('min-w-0', wide && 'sm:col-span-2')}>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 leading-relaxed">{children}</dd>
    </div>
  )
}

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string
  count: number
  empty: string
  children: React.ReactNode
}) {
  return (
    <section aria-label={title} className="space-y-2">
      <h2 className="text-base font-semibold">
        {title}
        <span className="text-muted-foreground ml-2 text-sm font-normal">{count}</span>
      </h2>
      {count === 0 ? <p className="text-muted-foreground text-sm">{empty}</p> : children}
    </section>
  )
}

// 一张表：名字、有几行、每一列。默认收着，点开看列
function TableCard({ table }: { table: Table }) {
  const t = useTranslations('catalog.dataset')
  const extras = columnExtras(table)
  return (
    <details className="group rounded-xl border">
      <summary className="hover:bg-muted/60 flex cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-2.5 [&::-webkit-details-marker]:hidden">
        <span className="text-muted-foreground text-xs transition-transform group-open:rotate-90">
          ▶
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-sm font-medium">{table.name}</span>
        <span className="text-muted-foreground shrink-0 text-[13px]">
          {t('tableSize', { rows: table.row_count ?? 0, columns: table.columns.length })}
        </span>
      </summary>
      <div className="overflow-x-auto border-t">
        <table className="w-full text-left text-[13px]">
          <thead className="text-muted-foreground text-xs">
            <tr>
              <th className="px-4 py-2 font-normal">{t('column')}</th>
              {extras.labels ? <th className="px-4 py-2 font-normal">{t('columnLabel')}</th> : null}
              <th className="px-4 py-2 font-normal">{t('columnType')}</th>
              {extras.units ? <th className="px-4 py-2 font-normal">{t('columnUnit')}</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y">
            {table.columns.map((column) => (
              <tr key={column.name}>
                <td className="px-4 py-1.5 font-mono">{column.name}</td>
                {extras.labels ? <td className="px-4 py-1.5">{column.label ?? ''}</td> : null}
                <td className="text-muted-foreground px-4 py-1.5 font-mono">{column.type}</td>
                {extras.units ? (
                  <td className="text-muted-foreground px-4 py-1.5">{column.unit ?? ''}</td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

// 一个口径：名字、中文名、怎么算、用到哪些表、适用范围
function MetricRow({ metric }: { metric: Metric }) {
  const t = useTranslations('catalog.dataset')
  return (
    <li className="space-y-1.5 px-4 py-3">
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-medium">{metric.label ?? metric.name}</span>
        {metric.label ? (
          <span className="text-muted-foreground font-mono text-xs">{metric.name}</span>
        ) : null}
        {metric.queryable === false ? (
          <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs">
            {t('notQueryable')}
          </span>
        ) : null}
      </p>
      {metric.description ? <p className="text-sm leading-relaxed">{metric.description}</p> : null}
      {metric.expression ? (
        <p className="bg-muted/60 overflow-x-auto rounded-md px-2.5 py-1.5 font-mono text-xs whitespace-nowrap">
          {metric.expression}
        </p>
      ) : null}
      <p className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-0.5 text-[13px]">
        {metric.tables.length ? (
          <span>
            {t('metricTables')}
            <span className="font-mono">{metric.tables.join(', ')}</span>
          </span>
        ) : null}
        {metric.unit ? <span>{t('metricUnit', { unit: metric.unit })}</span> : null}
        {metric.time_basis ? <span>{t('metricTime', { basis: metric.time_basis })}</span> : null}
      </p>
      {metric.reason_if_not ? (
        <p className="text-muted-foreground text-[13px]">
          {t('metricScope', { reason: metric.reason_if_not })}
        </p>
      ) : null}
    </li>
  )
}

function Notes({ notes, label }: { notes: Note[]; label: string }) {
  return (
    <ul aria-label={label} className="divide-y rounded-xl border">
      {notes.map((note) => (
        <li key={note.key} className="px-4 py-3">
          <p className="text-sm font-medium">{note.label}</p>
          <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">{note.text}</p>
        </li>
      ))}
    </ul>
  )
}
