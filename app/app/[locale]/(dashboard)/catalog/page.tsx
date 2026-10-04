import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { CatalogScreen } from '@/features/catalog'
import { routes } from '@/lib/catalog/routes'
import { requireSession } from '@/lib/catalog/session'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('catalog.list')
  return { title: t('title'), robots: { index: false, follow: false } }
}

const one = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) || undefined

// 数据目录。别的应用用链接把用户带到这里，可带 from、ref；搜索的词在 q 里。
// 没登录的人先去登录，登录完回到这一页，这三个参数还在（AT-KNOW-06）。别的参数不带。
export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams])
  await requireSession(
    locale,
    routes.catalog(locale, { q: one(query.q), from: one(query.from), ref: one(query.ref) }),
  )
  return <CatalogScreen />
}
