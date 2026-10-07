'use client'

import { useTranslations } from 'next-intl'

import { LogoutButton } from '@/components/auth/logout-button'

// knowledge 网页端的外框：顶上一条。账 56 起这里没有给用户看的页面：
// 数据目录在 knowledge 管理端，对用户，公共数据在 investment 里「问就有」。
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
  return (
    <div
      className="bg-background flex min-h-dvh flex-col"
      data-route-class="authenticated-workspace"
    >
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <span className="mr-3 text-sm font-semibold">{t('brand')}</span>
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
