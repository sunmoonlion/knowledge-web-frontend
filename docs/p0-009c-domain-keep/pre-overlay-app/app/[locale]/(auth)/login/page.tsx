import { getTranslations } from 'next-intl/server'
import { buttonVariants } from '@/components/ui/button'
import { SessionRedirect } from '@/components/auth/session-redirect'
import { cn } from '@/lib/utils'

const loginUrl = `${process.env.NEXT_PUBLIC_API_URL}/auth/login`
const signupUrl = `${process.env.NEXT_PUBLIC_API_URL}/auth/signup`
const continueUrl = `${process.env.NEXT_PUBLIC_API_URL}/auth/continue`

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    error?: string
    error_hint?: string
    error_description?: string
    /** 由 BFF /api/auth/after-signup 或 Casdoor 跳转带回 */
    registered?: string
  }>
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params
  const t = await getTranslations('auth')
  const paramsQ = await searchParams

  let errorText: string | null = null
  if (paramsQ.error === 'auth_failed') {
    errorText = t('errorAuthFailed')
  } else if (paramsQ.error === 'no_code') {
    errorText = t('errorNoCode')
  } else if (paramsQ.error === 'oauth_error') {
    const parts = [paramsQ.error_hint, paramsQ.error_description].filter(Boolean)
    errorText = parts.length ? parts.join(' — ') : t('errorOAuthGeneric')
  }

  const signupOk =
    paramsQ.registered === '1' || paramsQ.registered === 'true'

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SessionRedirect locale={locale} />
      <div className="w-full max-w-sm space-y-6 rounded-xl border p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{t('loginTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('loginSubtitle')}</p>
          <p className="text-xs text-muted-foreground">{t('loginCasdoorHint')}</p>
        </div>
        {signupOk ? (
          <p
            role="status"
            className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 px-3 py-2 text-center text-sm text-emerald-800 dark:text-emerald-200"
          >
            {t('signupSuccessHint')}
          </p>
        ) : null}
        {errorText ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-center text-sm text-destructive"
          >
            {errorText}
          </p>
        ) : null}
        <a href={loginUrl} className={cn(buttonVariants({ className: 'w-full' }))}>
          {t('login')}
        </a>
        <p className="text-center text-sm text-muted-foreground">
          <a href={signupUrl} className="font-medium text-primary underline-offset-4 hover:underline">
            {t('signup')}
          </a>
        </p>
        <p className="text-center text-xs text-muted-foreground">
          <a href={continueUrl} className="underline-offset-4 hover:underline">
            {t('continueToDashboard')}
          </a>
        </p>
      </div>
    </div>
  )
}
