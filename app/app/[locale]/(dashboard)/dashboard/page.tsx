import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// 登录之后默认到这里（后端的默认回跳地址）：knowbase web端的首页就是「我的数据」。
export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  redirect(`/${locale}/library`)
}
