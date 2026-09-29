import { describe, expect, it } from 'vitest'

import { destinations } from '@/lib/cross-app/destinations'
import { crossAppHref } from '@/lib/cross-app/links'

const links = {
  app: 'knowledge',
  targets: { info: { web_base_url: 'https://info.example.test' } },
}

describe('where knowledge takes people', () => {
  it('goes to the request page of info with the security code filled in', () => {
    expect(
      crossAppHref({
        links,
        destination: destinations['info.request'],
        locale: 'zh-CN',
        values: { code: '600519' },
      }),
    ).toBe('https://info.example.test/zh-CN/requests/new?code=600519&from=knowledge')
  })

  it('goes nowhere else', () => {
    expect(Object.keys(destinations)).toEqual(['info.request'])
  })
})
