import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware(routing)

// 正向 matcher：仅根路径与 /en、/zh-CN 下页面走中间件；/_next/* 永不命中，避免静态资源重定向死循环（ERR_TOO_MANY_REDIRECTS）
export const config = {
  matcher: ['/', '/(en|zh-CN)/:path*'],
}
