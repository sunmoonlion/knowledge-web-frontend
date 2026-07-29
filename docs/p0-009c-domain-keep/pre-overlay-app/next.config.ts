import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n.ts')

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['43.159.148.235'],
  // 生产环境去掉 console.log
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
}

export default withNextIntl(nextConfig)
