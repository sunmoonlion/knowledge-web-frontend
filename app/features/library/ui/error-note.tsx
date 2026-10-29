'use client'

import { useTranslations } from 'next-intl'

import { errorCode } from '../api/library'

// 后端拒绝时照它的码说一句人话；不认得的码说「没成，请重试」，附上码便于对账。
export function ErrorNote({ error }: { error: unknown }) {
  const t = useTranslations('library.errors')
  const code = errorCode(error)
  if (!code) return null
  const known = t.has(code)
  return (
    <p role="alert" className="text-destructive text-sm">
      {known ? t(code) : t('unknown', { code })}
    </p>
  )
}
