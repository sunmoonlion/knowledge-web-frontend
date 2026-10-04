import { KnowledgeShell } from '@/features/shell'
import { sessionOnce } from '@/lib/catalog/session'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// 数据目录的外框。没登录时不画外框：页面自己会带着要回的地址去登录
// （外框不知道地址栏里的参数，所以去登录这件事由页面做）。
export default async function CatalogLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await sessionOnce()
  if (!session) return children
  return (
    <KnowledgeShell csrfToken={session.csrf_token} locale={locale}>
      {children}
    </KnowledgeShell>
  )
}
