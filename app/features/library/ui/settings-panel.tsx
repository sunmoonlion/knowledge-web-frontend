'use client'

import { useTranslations } from 'next-intl'

import { useAccount, useLibraryActions } from '../api/library'
import { ErrorNote } from './error-note'

// 设置（0044 第 2.7 节）：「新数据默认展示给我的全部应用」。只对「我上传的」「为我采集的」
// 生效；本人点过（开或关）才算同意依据，没点过就不自动展示。
export function SettingsPanel({ csrfToken }: { csrfToken: string }) {
  const t = useTranslations('library.settings')
  const account = useAccount()
  const actions = useLibraryActions(csrfToken)
  const data = account.data
  return (
    <section className="space-y-3 rounded-lg border p-4 text-sm">
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={data ? data.displays_by_default : false}
          disabled={!data || actions.acknowledge.isPending}
          onChange={(event) => actions.acknowledge.mutate({ defaultDisplay: event.target.checked })}
        />
        <span>
          <span className="font-medium">{t('defaultDisplay')}</span>
          <span className="text-muted-foreground block text-xs">{t('defaultDisplayHint')}</span>
        </span>
      </label>
      {data && !data.seen ? <p className="text-muted-foreground text-xs">{t('notSeen')}</p> : null}
      <ErrorNote error={account.error ?? actions.acknowledge.error} />
    </section>
  )
}
