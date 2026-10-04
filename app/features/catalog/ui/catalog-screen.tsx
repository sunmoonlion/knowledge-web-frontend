'use client'

import { ArrowUpRightIcon, SearchIcon } from 'lucide-react'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { CrossAppLink } from '@/components/common/cross-app-link'
import { ReturnToOrigin } from '@/components/common/return-to-origin'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { routes } from '@/lib/catalog/routes'
import { cn } from '@/lib/utils'

import { useDatasets } from '../api/catalog'
import { cleanQuery, codeIn, periodOf, situationOf } from '../model/catalog'

// 数据目录：现在有哪些数据集、各自到哪一天。这里列的就是专家和代理查得到的数据。
export function CatalogScreen() {
  const t = useTranslations('catalog.list')
  const format = useFormatter()
  const locale = useLocale()
  const router = useRouter()
  const search = useSearchParams()
  const query = cleanQuery(search.get('q'))
  const origin = { from: search.get('from'), ref: search.get('ref') }
  const [typed, setTyped] = useState(query)
  const datasets = useDatasets(query)
  const go = (q: string) => router.push(routes.catalog(locale, { q: q || null, ...origin }))

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-10">
      <header className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('lead')}</p>
        </div>
        <ReturnToOrigin className={cn(buttonVariants({ variant: 'outline' }))}>
          {t('back')}
        </ReturnToOrigin>
      </header>

      <form
        role="search"
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          go(cleanQuery(typed))
        }}
      >
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            type="search"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            maxLength={80}
            aria-label={t('searchLabel')}
            placeholder={t('searchPlaceholder')}
            className="h-9 pl-8"
          />
        </div>
        <Button type="submit" className="h-9">
          {t('search')}
        </Button>
        {query ? (
          <Button
            type="button"
            variant="ghost"
            className="h-9"
            onClick={() => {
              setTyped('')
              go('')
            }}
          >
            {t('clear')}
          </Button>
        ) : null}
      </form>

      {datasets.isPending ? (
        <p className="text-muted-foreground text-sm">{t('loading')}</p>
      ) : datasets.isError ? (
        <p role="alert" className="text-destructive text-sm">
          {t('failed')}
        </p>
      ) : (
        <>
          {situationOf(datasets.data, query) === 'not-found' ? (
            <div className="rounded-xl border px-4 py-8 text-center">
              <p className="text-base font-medium">{t('notFound', { query })}</p>
              <p className="text-muted-foreground mt-1 text-sm">{t('notFoundHint')}</p>
              <CrossAppLink
                to="info.request"
                values={{ code: codeIn(query) }}
                className={cn(buttonVariants(), 'mt-4 gap-1')}
                fallback={
                  <p className="text-muted-foreground mt-4 text-[13px]">{t('requestOff')}</p>
                }
              >
                {t('request')}
                <ArrowUpRightIcon className="size-3.5" />
              </CrossAppLink>
            </div>
          ) : (
            <>
              <p className="text-muted-foreground text-[13px]">
                {query
                  ? t('found', { count: datasets.data.datasets.length, total: datasets.data.total })
                  : t('count', { count: datasets.data.total })}
              </p>
              <ul aria-label={t('title')} className="divide-y rounded-xl border">
                {datasets.data.datasets.map((entry) => {
                  const period = periodOf(entry)
                  return (
                    <li key={entry.dataset}>
                      <Link
                        href={routes.dataset(locale, entry.dataset, origin)}
                        className="hover:bg-muted/60 flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3"
                      >
                        <span className="w-20 shrink-0 font-mono text-base font-medium">
                          {entry.security_code ?? '—'}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate font-medium">{entry.title}</span>
                            {entry.default ? (
                              <span className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.5 text-xs">
                                {t('default')}
                              </span>
                            ) : null}
                          </span>
                          <span className="text-muted-foreground mt-0.5 block truncate font-mono text-xs">
                            {entry.data_version}
                          </span>
                        </span>
                        <span className="shrink-0 text-right text-[13px]">
                          <span className="block">
                            {period ? t('period', period) : t('periodUnknown')}
                          </span>
                          <span className="text-muted-foreground block">
                            {entry.updated_at
                              ? t('updated', {
                                  when: format.dateTime(new Date(entry.updated_at), {
                                    dateStyle: 'medium',
                                  }),
                                })
                              : t('builtIn')}
                          </span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
          {situationOf(datasets.data, query) === 'default-only' ? (
            <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-3 text-[13px]">
              {datasets.data.registry_enabled ? t('noneRegistered') : t('registryOff')}
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}
