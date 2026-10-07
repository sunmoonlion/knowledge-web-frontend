import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { KnowledgeShell } from '@/features/shell'
import { requireBrowserSession } from '@/lib/server/auth-session'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shell')
  return { title: t('brand'), robots: { index: false, follow: false } }
}

// 登录之后默认到这里。账 56 起 knowledge 网页端没有给用户看的页面（数据目录在管理端）：
// 只说明一句，不装作有内容。
export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await requireBrowserSession(locale)
  const t = await getTranslations('shell')
  return (
    <KnowledgeShell csrfToken={session.csrf_token} locale={locale}>
      <div className="mx-auto w-full max-w-2xl px-6 py-16">
        <h1 className="text-xl font-semibold tracking-tight">{t('nothingHere')}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{t('hint')}</p>
      </div>
    </KnowledgeShell>
  )
}
