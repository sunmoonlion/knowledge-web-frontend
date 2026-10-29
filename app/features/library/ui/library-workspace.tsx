'use client'

import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Link, useRouter } from '@/i18n/navigation'

import { useAccount, useEntries, useLibraryActions, useUsage, useVocabulary } from '../api/library'
import {
  DISPLAY_APPS,
  EMPTY_FILTERS,
  applyFilters,
  categoriesOf,
  cleanCategory,
  cleanMaterialId,
  countsByCategory,
  formatBytes,
  parseUse,
  paths,
  unconfirmedCount,
  usagePercent,
  yearsOf,
  type Filters,
} from '../model/library'
import { ErrorNote } from './error-note'
import { MaterialDetail } from './material-detail'

const selectClass = 'h-8 rounded-lg border border-input bg-transparent px-2 text-sm'

// 我的数据（0044 第 2.1 节）：只列我名下有的，按取得依据分栏；地址里的 category、
// material 决定在哪一栏、选中哪一份（knowmart「交易记录」的直达链接就是这个地址）。
export function LibraryWorkspace({ csrfToken }: { csrfToken: string }) {
  const t = useTranslations('library.shelf')
  const tc = useTranslations('library.categories')
  const router = useRouter()
  const search = useSearchParams()
  const category = cleanCategory(search.get('category'))
  const selected = cleanMaterialId(search.get('material'))
  const entries = useEntries()
  const vocabulary = useVocabulary()
  const usage = useUsage()
  const account = useAccount()
  const actions = useLibraryActions(csrfToken)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [checked, setChecked] = useState<string[]>([])

  const all = useMemo(() => entries.data ?? [], [entries.data])
  const shown = useMemo(() => applyFilters(all, category, filters), [all, category, filters])
  const counts = countsByCategory(all)
  const current = all.find((e) => e.material.material_id === selected) ?? null
  const unconfirmed = unconfirmedCount(all)
  const go = (nextCategory: string | null, material: string | null) =>
    router.replace(paths.library(nextCategory, material))
  const set = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch })

  async function bulk(use: string, on: boolean) {
    await actions.bulk.mutateAsync({ ids: checked, use, on })
    setChecked([])
  }

  async function removeChecked() {
    if (!window.confirm(t('bulkDeleteConfirm', { count: checked.length }))) return
    for (const id of checked) await actions.remove.mutateAsync({ id })
    setChecked([])
  }

  return (
    <div className="space-y-5">
      {usage.data ? (
        <section aria-label={t('space')} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>{t('space')}</span>
            <span>
              {formatBytes(usage.data.bytes_used)} / {formatBytes(usage.data.quota_bytes)}
            </span>
          </div>
          <div className="bg-muted h-1.5 overflow-hidden rounded">
            <div
              className="bg-primary h-full"
              style={{ width: `${usagePercent(usage.data.bytes_used, usage.data.quota_bytes)}%` }}
            />
          </div>
        </section>
      ) : null}

      {account.data && !account.data.seen ? (
        <section className="space-y-2 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
          <p className="font-medium">{t('defaultTitle')}</p>
          <p>{t('defaultExplain')}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => actions.acknowledge.mutate({ defaultDisplay: true })}
            >
              {t('defaultKeep')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => actions.acknowledge.mutate({ defaultDisplay: false })}
            >
              {t('defaultOff')}
            </Button>
          </div>
          <ErrorNote error={actions.acknowledge.error} />
        </section>
      ) : null}

      {unconfirmed > 0 ? (
        <section className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <span>{t('unconfirmedHint', { count: unconfirmed })}</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => set({ unconfirmed: true })}
          >
            {t('unconfirmedShow')}
          </Button>
        </section>
      ) : null}

      <nav aria-label={t('categories')} className="flex flex-wrap gap-1 border-b">
        {[null, ...categoriesOf(all)].map((code) => (
          <button
            key={code ?? 'all'}
            type="button"
            aria-current={code === category ? 'page' : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              code === category ? 'border-primary font-medium' : 'border-transparent'
            }`}
            onClick={() => go(code, null)}
          >
            {code === null ? t('all') : tc.has(code) ? tc(code) : code}
            <span className="text-muted-foreground ml-1 text-xs">
              {code === null ? all.length : (counts[code] ?? 0)}
            </span>
          </button>
        ))}
        <div className="flex-1" />
        <Link href={paths.upload} className="text-primary self-center px-2 text-sm underline">
          {t('upload')}
        </Link>
      </nav>

      <section aria-label={t('filters')} className="flex flex-wrap items-end gap-2 text-sm">
        <Input
          className="w-40"
          placeholder={t('filterSubject')}
          value={filters.subject}
          onChange={(event) => set({ subject: event.target.value })}
        />
        <select
          className={selectClass}
          aria-label={t('filterClass')}
          value={filters.docClass}
          onChange={(event) => set({ docClass: event.target.value, docType: '' })}
        >
          <option value="">{t('filterClass')}</option>
          {Object.entries(vocabulary.data?.doc_classes ?? {}).map(([code, item]) => (
            <option key={code} value={code}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          aria-label={t('filterType')}
          value={filters.docType}
          onChange={(event) => set({ docType: event.target.value })}
        >
          <option value="">{t('filterType')}</option>
          {Object.entries(vocabulary.data?.doc_types ?? {})
            .filter(([, type]) => !filters.docClass || type.class === filters.docClass)
            .map(([code, type]) => (
              <option key={code} value={code}>
                {type.name}
              </option>
            ))}
        </select>
        <select
          className={selectClass}
          aria-label={t('filterYear')}
          value={filters.year}
          onChange={(event) => set({ year: event.target.value })}
        >
          <option value="">{t('filterYear')}</option>
          {yearsOf(all).map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          aria-label={t('filterShown')}
          value={filters.shownTo}
          onChange={(event) => set({ shownTo: event.target.value })}
        >
          <option value="">{t('filterShown')}</option>
          {DISPLAY_APPS.map((app) => (
            <option key={app} value={`app:${app}`}>
              {app}
            </option>
          ))}
          <option value="market">{t('use.market')}</option>
          <option value="none">{t('shownNowhere')}</option>
        </select>
        <label className="inline-flex items-center gap-1">
          <input
            type="checkbox"
            checked={filters.unconfirmed}
            onChange={(event) => set({ unconfirmed: event.target.checked })}
          />
          {t('filterUnconfirmed')}
        </label>
        <Button type="button" size="sm" variant="ghost" onClick={() => setFilters(EMPTY_FILTERS)}>
          {t('clear')}
        </Button>
      </section>

      {checked.length ? (
        <section className="bg-muted flex flex-wrap items-center gap-2 rounded-lg p-2 text-sm">
          <span>{t('checked', { count: checked.length })}</span>
          {DISPLAY_APPS.map((app) => (
            <span key={app} className="inline-flex gap-1">
              <Button type="button" size="xs" onClick={() => bulk(`app:${app}`, true)}>
                {t('bulkShow', { app })}
              </Button>
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={() => bulk(`app:${app}`, false)}
              >
                {t('bulkHide', { app })}
              </Button>
            </span>
          ))}
          <Button type="button" size="xs" variant="destructive" onClick={removeChecked}>
            {t('bulkDelete')}
          </Button>
          <ErrorNote error={actions.bulk.error ?? actions.remove.error} />
        </section>
      ) : null}

      <div className={current ? 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]' : ''}>
        <section aria-label={t('title')} className="overflow-x-auto">
          {entries.isPending ? <p className="text-sm">{t('loading')}</p> : null}
          <ErrorNote error={entries.error} />
          {entries.data && shown.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              {all.length === 0 ? t('empty') : t('noMatch')}
            </p>
          ) : null}
          {shown.length ? (
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-left text-xs">
                <tr>
                  <th className="w-6 p-2">
                    <input
                      type="checkbox"
                      aria-label={t('checkAll')}
                      checked={checked.length > 0 && checked.length === shown.length}
                      onChange={(event) =>
                        setChecked(
                          event.target.checked ? shown.map((e) => e.material.material_id) : [],
                        )
                      }
                    />
                  </th>
                  <th className="p-2">{t('name')}</th>
                  <th className="p-2">{t('description')}</th>
                  <th className="p-2">{t('status')}</th>
                  <th className="p-2">{t('license')}</th>
                  <th className="p-2">{t('size')}</th>
                  <th className="p-2">{t('shown')}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((entry) => {
                  const d = entry.material.description
                  const id = entry.material.material_id
                  const typeName = d.doc_type
                    ? (vocabulary.data?.doc_types[d.doc_type]?.name ?? d.doc_type)
                    : null
                  return (
                    <tr key={id} className={`border-t ${id === selected ? 'bg-muted/60' : ''}`}>
                      <td className="p-2">
                        <input
                          type="checkbox"
                          aria-label={entry.material.name}
                          checked={checked.includes(id)}
                          onChange={(event) =>
                            setChecked(
                              event.target.checked
                                ? [...checked, id]
                                : checked.filter((x) => x !== id),
                            )
                          }
                        />
                      </td>
                      <td className="p-2">
                        <button
                          type="button"
                          className="text-left font-medium break-all hover:underline"
                          onClick={() => go(category, id)}
                        >
                          {entry.material.name}
                        </button>
                        <span className="text-muted-foreground block text-xs">
                          {t(`origin.${entry.material.content_origin}`)}
                          {' · '}
                          {t('versionCount', { count: entry.material.current_version })}
                        </span>
                      </td>
                      <td className="p-2 text-xs">
                        {[d.subject, typeName, d.period_end ?? d.disclosed_on, d.data_format]
                          .filter(Boolean)
                          .join(' · ') || t('noDescription')}
                      </td>
                      <td className="p-2 text-xs">
                        {d.status === 'unconfirmed' ? (
                          <span className="rounded bg-amber-100 px-1 text-amber-900">
                            {t('statusUnconfirmed')}
                          </span>
                        ) : (
                          t(`statusName.${d.status}`)
                        )}
                      </td>
                      <td className="p-2 text-xs">{t(`licenseName.${entry.holding.license}`)}</td>
                      <td className="p-2 text-xs">{formatBytes(entry.version.size_bytes)}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {entry.shown.map((use) => (
                            <UseTag key={use} use={use} />
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : null}
        </section>
        {current && vocabulary.data ? (
          <aside className="lg:border-l lg:pl-6">
            <MaterialDetail
              key={current.material.material_id}
              entry={current}
              vocabulary={vocabulary.data}
              csrfToken={csrfToken}
              onClose={() => go(category, null)}
            />
          </aside>
        ) : null}
        {selected && entries.data && !current ? (
          <p role="status" className="text-muted-foreground text-sm">
            {t('notFound')}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function UseTag({ use }: { use: string }) {
  const t = useTranslations('library.shelf.use')
  const parsed = parseUse(use)
  const label =
    parsed.kind === 'app'
      ? parsed.app
      : parsed.kind === 'market'
        ? t('market')
        : parsed.kind === 'expert'
          ? parsed.version
            ? t('frozenExpert', { expert: parsed.expert, version: parsed.version })
            : t('expert', { expert: parsed.expert })
          : parsed.use
  return <span className="bg-muted rounded px-1.5 py-0.5 text-[0.7rem]">{label}</span>
}
