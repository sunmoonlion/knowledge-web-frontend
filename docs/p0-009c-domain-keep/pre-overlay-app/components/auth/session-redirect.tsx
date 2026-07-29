'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function SessionRedirect({ locale }: { locale: string }) {
  const router = useRouter()

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL ?? '/api'
    fetch(`${base}/auth/me`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) return null
        return r.json() as Promise<{ user: unknown }>
      })
      .then((data) => {
        if (data?.user) router.replace(`/${locale}/dashboard`)
      })
      .catch(() => {})
  }, [locale, router])

  return null
}
