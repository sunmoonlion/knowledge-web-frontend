'use client'

import { useTranslations } from 'next-intl'

import { LogoutButton } from '@/components/auth/logout-button'
import { Link, usePathname } from '@/i18n/navigation'

// knowbase web端的外框：顶上一条，左边品牌，中间几个去处，右边退出。
// knowbase web端是用户管自己数据的唯一入口（SDD 0044 第一节）。
const NAV = [
  { href: '/library', key: 'library' },
  { href: '/upload', key: 'upload' },
  { href: '/consents', key: 'consents' },
  { href: '/settings', key: 'settings' },
] as const

export function KnowledgeShell({
  csrfToken,
  locale,
  children,
}: {
  csrfToken: string
  locale: string
  children: React.ReactNode
}) {
  const t = useTranslations('shell')
  const tAuth = useTranslations('auth')
  const pathname = usePathname()
  return (
    <div
      className="bg-background flex min-h-dvh flex-col"
      data-route-class="authenticated-workspace"
    >
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <span className="mr-3 text-sm font-semibold">{t('brand')}</span>
        <nav aria-label={t('navigation')} className="flex gap-1 text-sm">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`rounded-md px-2 py-1 ${active ? 'bg-muted font-medium' : ''}`}
              >
                {t(`nav.${item.key}`)}
              </Link>
            )
          })}
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
