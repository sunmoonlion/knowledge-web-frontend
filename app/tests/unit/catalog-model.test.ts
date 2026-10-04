import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { catalogDatasetSchema, catalogListSchema } from '@/contracts/catalog'
import {
  cleanQuery,
  codeIn,
  columnExtras,
  countsOf,
  periodOf,
  situationOf,
  splitTables,
} from '@/features/catalog/model/catalog'
import { routes } from '@/lib/catalog/routes'

const fixtures = join(process.cwd(), 'preview/fixtures')
type Manifest = {
  responses: { method: string; path: string; query: string; status: number; file: string }[]
}
function sampled(scenario: string) {
  const dir = join(fixtures, scenario)
  const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as Manifest
  return manifest.responses.map((response) => ({
    ...response,
    body: JSON.parse(readFileSync(join(dir, response.file), 'utf8')) as unknown,
  }))
}
const LIST = '/api/web/v1/catalog/datasets'
const bodyOf = (scenario: string, path: string, query = '') =>
  sampled(scenario).find((each) => each.path === path && each.query === query)!.body

describe('契约对得上真后端录下来的返回', () => {
  it.each(readdirSync(fixtures))('情景 %s', (scenario) => {
    const ok = sampled(scenario).filter((each) => each.status === 200)
    expect(ok.length).toBeGreaterThan(0)
    for (const each of ok) {
      const schema = each.path === LIST ? catalogListSchema : catalogDatasetSchema
      const parsed = schema.safeParse(each.body)
      expect(parsed.success, `${scenario} ${each.path}?${each.query}`).toBe(true)
    }
  })

  it('样例里没有数据、没有存放位置', () => {
    for (const scenario of readdirSync(fixtures)) {
      const text = JSON.stringify(sampled(scenario).map((each) => each.body))
      expect(text).not.toMatch(/"rows"|object_key|"bucket"|"sha256"|s3:\/\//)
    }
  })
})

describe('搜索的词', () => {
  it('去掉两头的空白，最多 80 个字', () => {
    expect(cleanQuery('  600009 ')).toBe('600009')
    expect(cleanQuery(null)).toBe('')
    expect(cleanQuery('x'.repeat(200))).toHaveLength(80)
  })

  it('六位数字才当作证券代码带给申请页', () => {
    expect(codeIn('600009')).toBe('600009')
    expect(codeIn('60000')).toBeUndefined()
    expect(codeIn('上海机场')).toBeUndefined()
    expect(codeIn('6000091')).toBeUndefined()
  })
})

describe('目录是哪一种样子', () => {
  const full = catalogListSchema.parse(bodyOf('default', LIST))
  const missing = catalogListSchema.parse(bodyOf('default', LIST, 'q=000001'))
  const only = catalogListSchema.parse(bodyOf('default-only', LIST))
  const onlyMissing = catalogListSchema.parse(bodyOf('default-only', LIST, 'q=600009'))

  it('有登记的数据集：列出来', () => {
    expect(situationOf(full, '')).toBe('listed')
    expect(
      situationOf(catalogListSchema.parse(bodyOf('default', LIST, 'q=600009')), '600009'),
    ).toBe('listed')
  })

  it('搜了没有：显示没有（AT-KNOW-03）', () => {
    expect(situationOf(missing, '000001')).toBe('not-found')
    expect(situationOf(onlyMissing, '600009')).toBe('not-found')
  })

  it('只有默认数据集：照常列出来，另加一句说明（AT-KNOW-08）', () => {
    expect(situationOf(only, '')).toBe('default-only')
    expect(only.registry_enabled).toBe(false)
  })
})

describe('一个数据集', () => {
  const airport = catalogDatasetSchema.parse(bodyOf('default', `${LIST}/sh600009-financials`))
  const retail = catalogDatasetSchema.parse(bodyOf('default', `${LIST}/retail`))

  it('装数据的表与说明用的表分开', () => {
    const { data, dictionary } = splitTables(airport.tables)
    expect(data.map((table) => table.name)).toEqual([
      'balance_sheet',
      'cash_flow',
      'disclosure_calendar',
      'income_statement',
      'official_key_figures',
    ])
    expect(dictionary.map((table) => table.name)).toContain('field_dictionary')
    expect(countsOf(airport)).toEqual({ tables: 5, metrics: 10, limitations: 7 })
  })

  it('列没有中文名、单位的表，不画那两栏', () => {
    const sheet = airport.tables.find((table) => table.name === 'balance_sheet')!
    expect(columnExtras(sheet)).toEqual({ labels: true, units: true })
    const orders = retail.tables.find((table) => table.name === 'order_performance')!
    expect(columnExtras(orders)).toEqual({ labels: false, units: false })
  })

  it('数据从哪天到哪天', () => {
    expect(periodOf(airport)).toEqual({ from: '1994-12-31', to: '2026-06-30' })
    expect(periodOf({ start_date: null, end_date: null })).toBeNull()
    expect(periodOf({ start_date: null, end_date: '2026-06-30' })).toEqual({
      from: '?',
      to: '2026-06-30',
    })
  })
})

describe('地址', () => {
  it('目录里走动时带着 from、ref；空的不带', () => {
    expect(routes.catalog('zh-CN')).toBe('/zh-CN/catalog')
    expect(routes.catalog('zh-CN', { q: '机场', from: 'investment', ref: 'task-1' })).toBe(
      '/zh-CN/catalog?q=%E6%9C%BA%E5%9C%BA&from=investment&ref=task-1',
    )
    expect(routes.catalog('zh-CN', { q: null, from: null })).toBe('/zh-CN/catalog')
    expect(routes.dataset('zh-CN', 'sh600009-financials', { from: 'info' })).toBe(
      '/zh-CN/catalog/sh600009-financials?from=info',
    )
    expect(routes.dataset('zh-CN', 'a/b')).toBe('/zh-CN/catalog/a%2Fb')
  })
})
