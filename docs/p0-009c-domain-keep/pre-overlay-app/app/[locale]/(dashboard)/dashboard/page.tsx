import { getTranslations } from 'next-intl/server'

const logoutUrl = `${process.env.NEXT_PUBLIC_API_URL}/auth/logout`

export default async function DashboardPage() {
  const t = await getTranslations('auth')
  const tNav = await getTranslations('nav')

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <span className="text-sm font-medium text-muted-foreground">{tNav('dashboard')}</span>
        <a
          href={logoutUrl}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {t('logout')}
        </a>
      </header>
      <main className="p-8">
        <h1 className="text-2xl font-semibold tracking-tight">{tNav('dashboard')}</h1>
        <p className="mt-2 text-muted-foreground">{t('dashboardWelcome')}</p>
      </main>
    </div>
  )
}
