import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'

import { UploadPanel } from '@/features/library'
import { KnowledgeShell } from '@/features/shell'
import { requireBrowserSession } from '@/lib/server/auth-session'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('pages.upload')
  return { title: t('title'), robots: { index: false, follow: false } }
}

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

// 上传与直达上传（SDD 0044 第 2.3、2.4 节）。直达上传的地址 /upload?from=…&ref=…&doc_type=…
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams])
  // 没登录先去登录，登录完回到这一页，参数还在（直达上传的 from、ref 与预填都要留着）
  const next = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    const first = one(value)
    if (first !== undefined) next.set(key, first)
  }
  const tail = next.toString()
  const session = await requireBrowserSession(locale, `/${locale}/upload${tail ? `?${tail}` : ''}`)
  const t = await getTranslations('pages.upload')
  return (
    <KnowledgeShell csrfToken={session.csrf_token} locale={locale}>
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <h1 className="text-xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground mt-1 mb-6 text-sm">{t('lead')}</p>
        <Suspense>
          <UploadPanel csrfToken={session.csrf_token} />
        </Suspense>
      </div>
    </KnowledgeShell>
  )
}
