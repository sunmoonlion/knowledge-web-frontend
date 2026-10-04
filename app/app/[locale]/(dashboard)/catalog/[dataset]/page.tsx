import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { DatasetScreen } from '@/features/catalog'
import { routes } from '@/lib/catalog/routes'
import { requireSession } from '@/lib/catalog/session'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('catalog.dataset')
  return { title: t('title'), robots: { index: false, follow: false } }
}

const one = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) || undefined

// 一个数据集。info、investment 会用链接直接带到这里。
export default async function DatasetPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; dataset: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ locale, dataset }, query] = await Promise.all([params, searchParams])
  await requireSession(
    locale,
    routes.dataset(locale, dataset, { from: one(query.from), ref: one(query.ref) }),
  )
  return <DatasetScreen dataset={dataset} />
}
