'use client'

import { useFormatter, useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'

import {
  useEntries,
  useLibraryActions,
  usePlatformConsents,
  useSubscriptions,
} from '../api/library'
import { paths } from '../model/library'
import { ErrorNote } from './error-note'

// 给平台的授权（0044 第 2.6 节）：knowlab 平台孵化、平台测试、交付审核、自助重跑时留下的，
// 每次过程一条；在 knowfeed 建订阅时留下的范围同意。每条都能撤，撤了立即停。
export function ConsentsPanel({ csrfToken }: { csrfToken: string }) {
  const t = useTranslations('library.consents')
  const format = useFormatter()
  const consents = usePlatformConsents()
  const subscriptions = useSubscriptions()
  const entries = useEntries()
  const actions = useLibraryActions(csrfToken)
  const nameOf = (id: string | null) =>
    entries.data?.find((e) => e.material.material_id === id)?.material.name ?? id ?? '—'
  const when = (value: string) => format.dateTime(new Date(value), { dateStyle: 'medium' })

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div>
          <h2 className="font-medium">{t('platformTitle')}</h2>
          <p className="text-muted-foreground text-xs">{t('platformHint')}</p>
        </div>
        {consents.data && consents.data.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('platformNone')}</p>
        ) : null}
        <ul className="space-y-3">
          {(consents.data ?? []).map((c) => (
            <li
              key={`${c.app}:${c.kind}:${c.ref}`}
              className="space-y-2 rounded-lg border p-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">
                  {t.has(`kind.${c.kind}`) ? t(`kind.${c.kind}`) : c.kind} · {c.app} · {c.ref}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={actions.withdrawPlatform.isPending}
                  onClick={() => {
                    if (window.confirm(t('withdrawConfirm')))
                      actions.withdrawPlatform.mutate({ app: c.app, kind: c.kind, ref: c.ref })
                  }}
                >
                  {t('withdraw')}
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                {t('since', { date: when(c.created_at) })}
                {' · '}
                {c.until ? t('until', { date: when(c.until) }) : t('untilProcess')}
                {' · '}
                {t('operatorReads', { count: c.operator_reads })}
              </p>
              <ul className="list-disc pl-5 text-xs">
                {c.items.map((item) => (
                  <li key={`${item.material_id}-${item.version_no}`}>
                    {item.material_id ? (
                      <Link href={paths.library(null, item.material_id)} className="underline">
                        {nameOf(item.material_id)}
                      </Link>
                    ) : (
                      '—'
                    )}
                    {item.version_no ? ` v${item.version_no}` : null}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <ErrorNote error={consents.error ?? actions.withdrawPlatform.error} />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-medium">{t('subscriptionTitle')}</h2>
          <p className="text-muted-foreground text-xs">{t('subscriptionHint')}</p>
        </div>
        {subscriptions.data && subscriptions.data.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('subscriptionNone')}</p>
        ) : null}
        <ul className="space-y-3">
          {(subscriptions.data ?? []).map((s) => (
            <li
              key={`${s.subscription_id}@${s.revision}`}
              className="space-y-1 rounded-lg border p-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">
                  {s.purpose}{' '}
                  <span className="text-muted-foreground text-xs">
                    {t('revision', { revision: s.revision })}
                  </span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={actions.unsubscribe.isPending}
                  onClick={() => {
                    if (window.confirm(t('unsubscribeConfirm')))
                      actions.unsubscribe.mutate({ id: s.subscription_id, revision: s.revision })
                  }}
                >
                  {t('unsubscribe')}
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                {t('range', { start: s.starts_on, end: s.ends_on })}
                {' · '}
                {t.has(`by.${s.by}`) ? t(`by.${s.by}`) : s.by}
              </p>
              <p className="text-xs break-all">
                {[...s.subjects, ...s.doc_types, ...s.urls, s.topic ?? '']
                  .filter(Boolean)
                  .join('、')}
              </p>
            </li>
          ))}
        </ul>
        <ErrorNote error={subscriptions.error ?? actions.unsubscribe.error} />
      </section>
    </div>
  )
}
