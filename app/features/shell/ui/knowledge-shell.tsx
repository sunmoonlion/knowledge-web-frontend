'use client'

import { ArrowUpRightIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

import { LogoutButton } from '@/components/auth/logout-button'
import { CrossAppLink } from '@/components/common/cross-app-link'
import { routes } from '@/lib/catalog/routes'
import { cn } from '@/lib/utils'

// knowledge 网页端的外框：顶上一条导航。用户在这里只做一件事：看有什么数据。
export function KnowledgeShell({
  csrfToken,
  locale,
  children,
}: {
  csrfToken: string
  locale: string
  children: React.ReactNode
}) {
  const t = useTranslations('catalog.shell')
  const tAuth = useTranslations('auth')
  const link = 'rounded-md px-3 py-1.5 text-sm hover:bg-foreground/5'
  return (
    <div
      className="bg-background flex min-h-dvh flex-col"
      data-route-class="authenticated-workspace"
    >
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <span className="mr-3 text-sm font-semibold">{t('brand')}</span>
        <nav aria-label={t('brand')} className="flex items-center gap-1">
          <Link
            href={routes.catalog(locale)}
            aria-current="page"
            className={cn(link, 'bg-foreground/[0.07] font-medium')}
          >
            {t('catalog')}
          </Link>
          <CrossAppLink to="info.request" className={cn(link, 'flex items-center gap-1')}>
            {t('request')}
            <ArrowUpRightIcon className="text-muted-foreground size-3.5" />
          </CrossAppLink>
        </nav>
        <div className="flex-1" />
        <LogoutButton
          csrfToken={csrfToken}
          locale={locale}
          label={tAuth('logout')}
          errorLabel={tAuth('logoutFailed')}
        />
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
