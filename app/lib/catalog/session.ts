import 'server-only'

import { redirect } from 'next/navigation'
import { cache } from 'react'

import { loginPath } from '@/lib/auth/next-path'
import { getBrowserSession } from '@/lib/server/auth-session'

// 一次请求里外框和页面都要看登录没有：只问后端一次
export const sessionOnce = cache(getBrowserSession)

// 没登录就去登录，登录完回到 next（这一页自己的地址，带着参数）
export async function requireSession(locale: string, next: string) {
  const session = await sessionOnce()
  if (!session) redirect(loginPath(locale, next))
  return session
}
