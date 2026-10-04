import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CatalogScreen, DatasetScreen } from '@/features/catalog'
import messages from '@/messages/zh-CN.json'

const push = vi.fn()
let search = new URLSearchParams()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => search,
  usePathname: () => '/zh-CN/catalog',
}))

const fixtures = join(process.cwd(), 'preview/fixtures')
let scenario = 'default'
let infoConfigured = true
let asked: string[] = []
function manifestOf(name: string) {
  return JSON.parse(readFileSync(join(fixtures, name, 'manifest.json'), 'utf8')) as {
    responses: { method: string; path: string; query: string; status: number; file: string }[]
  }
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

beforeEach(() => {
  scenario = 'default'
  infoConfigured = true
  asked = []
  search = new URLSearchParams()
  push.mockReset()
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const url = new URL(String(input), 'http://x')
      expect(init.method ?? 'GET').toBe('GET') // 数据目录只有读
      if (url.pathname === '/api/web/v1/cross-app/origin') {
        return json(
          url.searchParams.get('from') === 'investment'
            ? {
                app: 'investment',
                ref: url.searchParams.get('ref'),
                return_url: 'http://localhost:3100/zh-CN/workbench?ref=task-1',
              }
            : null,
        )
      }
      if (url.pathname === '/api/web/v1/cross-app/links') {
        return json({
          app: 'knowledge',
          targets: infoConfigured ? { info: { web_base_url: 'https://info.example.test' } } : {},
        })
      }
      asked.push(`${url.pathname}${url.search}`)
      const query = decodeURIComponent(url.search.slice(1))
      const found = manifestOf(scenario).responses.find(
        (each) => each.path === url.pathname && each.query === query,
      )
      if (!found) return json({ detail: 'no sample' }, 500)
      return new Response(readFileSync(join(fixtures, scenario, found.file), 'utf8'), {
        status: found.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }),
  )
})

afterEach(() => vi.unstubAllGlobals())

function page(children: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <NextIntlClientProvider locale="zh-CN" messages={messages} timeZone="Asia/Shanghai">
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </NextIntlClientProvider>,
  )
}

describe('数据目录', () => {
  it('每个数据集一行：公司、代码、时间范围、现行版本、更新时间（F-KNOW-08）', async () => {
    page(<CatalogScreen />)
    const list = await screen.findByRole('list', { name: '数据目录' })
    const rows = within(list).getAllByRole('listitem')
    expect(rows).toHaveLength(3)
    expect(screen.getByText('一共 3 个数据集')).toBeInTheDocument()
    const airport = within(rows[1])
    expect(airport.getByText('600009')).toBeInTheDocument()
    expect(airport.getByText('上海机场 财务报表')).toBeInTheDocument()
    expect(airport.getByText('1994-12-31 至 2026-06-30')).toBeInTheDocument()
    expect(airport.getByText('sh600009-financials-9fd91db79529e208')).toBeInTheDocument()
    expect(airport.getByText('2026年9月27日 更新')).toBeInTheDocument()
    expect(airport.getByRole('link')).toHaveAttribute('href', '/zh-CN/catalog/sh600009-financials')
    // 默认数据集：标出来，没有更新时间
    expect(within(rows[0]).getByText('默认')).toBeInTheDocument()
    expect(within(rows[0]).getByText('随服务自带')).toBeInTheDocument()
    // 不是别的应用带来的：没有「回到原处」
    expect(screen.queryByRole('link', { name: '回到原处' })).toBeNull()
  })

  it('搜：把词放进地址；地址里有词，就按它向后端要', async () => {
    page(<CatalogScreen />)
    await screen.findByRole('list', { name: '数据目录' })
    fireEvent.change(screen.getByRole('searchbox', { name: '按证券代码或名字找' }), {
      target: { value: ' 600009 ' },
    })
    fireEvent.click(screen.getByRole('button', { name: '找' }))
    expect(push).toHaveBeenCalledWith('/zh-CN/catalog?q=600009')
  })

  it('地址里带着词：只列找到的，说明一共几个；「看全部」回到整份', async () => {
    search = new URLSearchParams('q=600009')
    page(<CatalogScreen />)
    const list = await screen.findByRole('list', { name: '数据目录' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('找到 1 个（一共 3 个）')).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toHaveValue('600009')
    expect(asked).toEqual(['/api/web/v1/catalog/datasets?q=600009'])
    fireEvent.click(screen.getByRole('button', { name: '看全部' }))
    expect(push).toHaveBeenCalledWith('/zh-CN/catalog')
  })

  it('没有这家公司：显示没有；「申请入库」去 info，带着代码与 from=knowledge（AT-KNOW-03）', async () => {
    search = new URLSearchParams('q=000001')
    page(<CatalogScreen />)
    expect(await screen.findByText('没有「000001」的数据')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: '数据目录' })).toBeNull()
    const link = await screen.findByRole('link', { name: '申请入库' })
    expect(link).toHaveAttribute(
      'href',
      'https://info.example.test/zh-CN/requests/new?code=000001&from=knowledge',
    )
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('搜的是名字不是代码：申请的链接不带代码', async () => {
    search = new URLSearchParams('q=平安银行')
    page(<CatalogScreen />)
    expect(await screen.findByText('没有「平安银行」的数据')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: '申请入库' })).toHaveAttribute(
      'href',
      'https://info.example.test/zh-CN/requests/new?from=knowledge',
    )
  })

  it('info 的地址没有配：不给一个点不了的链接，说明原因', async () => {
    infoConfigured = false
    search = new URLSearchParams('q=000001')
    page(<CatalogScreen />)
    expect(await screen.findByText('申请入库的入口还没有配置。')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '申请入库' })).toBeNull()
  })

  it('从 investment 来的：有「回到原处」；点进数据集时带着来处', async () => {
    search = new URLSearchParams('from=investment&ref=task-1')
    page(<CatalogScreen />)
    expect(await screen.findByRole('link', { name: '回到原处' })).toHaveAttribute(
      'href',
      'http://localhost:3100/zh-CN/workbench?ref=task-1',
    )
    const list = await screen.findByRole('list', { name: '数据目录' })
    expect(within(list).getAllByRole('link')[1]).toHaveAttribute(
      'href',
      '/zh-CN/catalog/sh600009-financials?from=investment&ref=task-1',
    )
  })

  it('多数据集没打开：只有默认数据集，页面不报错，说明原因（AT-KNOW-08）', async () => {
    scenario = 'default-only'
    page(<CatalogScreen />)
    const list = await screen.findByRole('list', { name: '数据目录' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
    expect(
      screen.getByText('这里还没有打开公司数据的登记，现在只有默认数据集。'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('后端答不上来：说打不开，不装作没有数据', async () => {
    search = new URLSearchParams('q=没录过的词')
    page(<CatalogScreen />)
    expect(await screen.findByRole('alert')).toHaveTextContent('数据目录暂时打不开，稍后再试。')
    expect(screen.queryByText(/没有「/)).toBeNull()
  })
})

describe('一个数据集', () => {
  it('摘要、表与列、口径、局限都有（F-KNOW-09、AT-KNOW-04）', async () => {
    page(<DatasetScreen dataset="sh600009-financials" />)
    expect(await screen.findByRole('heading', { name: '上海机场 财务报表' })).toBeInTheDocument()
    expect(screen.getByText('5 张表 · 10 个口径 · 7 条局限')).toBeInTheDocument()
    const summary = screen.getByLabelText('摘要')
    expect(within(summary).getByText('1994-12-31 至 2026-06-30')).toBeInTheDocument()
    expect(within(summary).getByText('sh600009-financials-9fd91db79529e208')).toBeInTheDocument()
    expect(within(summary).getByText('报表数据的来源')).toBeInTheDocument()
    expect(within(summary).getByText(/第三方网站整理的数据，不是法定披露原文/)).toBeInTheDocument()

    const tables = screen.getByRole('region', { name: '表' })
    expect(within(tables).getByText('balance_sheet')).toBeInTheDocument()
    expect(within(tables).getByText('110 行 · 35 列')).toBeInTheDocument()
    expect(within(tables).getByText('total_assets')).toBeInTheDocument()
    expect(within(tables).getByText('资产总计')).toBeInTheDocument()
    // 说明用的表不混在装数据的表里
    expect(within(tables).queryByText('field_dictionary')).toBeNull()
    expect(
      within(screen.getByRole('region', { name: '说明用的表' })).getByText('field_dictionary'),
    ).toBeInTheDocument()

    const metrics = screen.getByRole('list', { name: '口径' })
    expect(within(metrics).getAllByRole('listitem')).toHaveLength(10)
    expect(within(metrics).getByText('毛利率')).toBeInTheDocument()
    expect(within(metrics).getByText('gross_margin')).toBeInTheDocument()
    expect(
      within(metrics).getByText('(operate_income - operate_cost) / operate_income'),
    ).toBeInTheDocument()

    const limits = screen.getByRole('list', { name: '局限' })
    expect(within(limits).getAllByRole('listitem')).toHaveLength(7)
    expect(within(limits).getByText('追溯调整')).toBeInTheDocument()
    expect(within(limits).getByText('使用范围')).toBeInTheDocument()

    expect(
      screen.getByText('这里只显示结构，不显示数据。要查数，请在 investment 里问专家或代理。'),
    ).toBeInTheDocument()
  })

  it('「申请更新」去 info，带着这家公司的代码', async () => {
    page(<DatasetScreen dataset="sh600009-financials" />)
    expect(await screen.findByRole('link', { name: '申请更新' })).toHaveAttribute(
      'href',
      'https://info.example.test/zh-CN/requests/new?code=600009&from=knowledge',
    )
  })

  it('从 investment 来的：有「回到原处」；回目录时带着来处', async () => {
    search = new URLSearchParams('from=investment&ref=task-1')
    page(<DatasetScreen dataset="sh600009-financials" />)
    expect(await screen.findByRole('link', { name: '回到原处' })).toHaveAttribute(
      'href',
      'http://localhost:3100/zh-CN/workbench?ref=task-1',
    )
    expect(screen.getByRole('link', { name: '数据目录' })).toHaveAttribute(
      'href',
      '/zh-CN/catalog?from=investment&ref=task-1',
    )
  })

  it('默认数据集：没有公司，所以没有「申请更新」；没写局限就说没写', async () => {
    page(<DatasetScreen dataset="retail" />)
    expect(
      await screen.findByRole('heading', { name: '零售经营库（最小实例）' }),
    ).toBeInTheDocument()
    expect(screen.getByText('随服务自带，不经登记')).toBeInTheDocument()
    expect(screen.getByText('这个数据集没有写明局限。')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '申请更新' })).toBeNull()
    // 这个老数据集的列没有中文名：不画空的一栏
    expect(screen.queryByRole('columnheader', { name: '中文名' })).toBeNull()
  })

  it('现编的样例数据集，它自己的说明里写着是样例', async () => {
    page(<DatasetScreen dataset="sh600519-financials" />)
    expect(
      await screen.findByText('这是给预览用的样例数据集：表、列与口径是编的，不是真的入库结果'),
    ).toBeInTheDocument()
  })

  it('没有这个数据集：说没有，给回目录的路', async () => {
    page(<DatasetScreen dataset="sh000001-financials" />)
    expect(await screen.findByRole('alert')).toHaveTextContent('没有这个数据集')
    expect(screen.getByRole('link', { name: '数据目录' })).toHaveAttribute('href', '/zh-CN/catalog')
  })

  it('后端答不上来：说打不开，不说成「没有这个数据集」', async () => {
    page(<DatasetScreen dataset="no-sample-for-this" />)
    expect(await screen.findByRole('alert')).toHaveTextContent('这个数据集暂时打不开，稍后再试。')
  })
})
