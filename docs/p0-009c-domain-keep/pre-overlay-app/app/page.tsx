import { redirect } from 'next/navigation'

// 根路径由 next-intl middleware 自动重定向到默认 locale
// 但作为兜底，显式跳转
export default function Home() {
  redirect('/zh-CN/dashboard')
}
