// 我的数据的状态与算法（features/library/model）：分栏、筛选、上传参数、预填、同名同描述。
import { describe, expect, it } from 'vitest'

import type { Entry, Recognition, Vocabulary } from '@/contracts/library'
import {
  EMPTY_DRAFT,
  EMPTY_FILTERS,
  applyFilters,
  categoriesOf,
  cleanCategory,
  cleanMaterialId,
  descriptionBody,
  duplicatesOf,
  mergeDraft,
  needsAttest,
  paths,
  periodForYear,
  prefillOf,
  recognizedFields,
  uploadQuery,
} from '@/features/library/model/library'

const vocabulary = {
  doc_types: {
    annual_report: { name: '年报', class: 'disclosure' },
    research_company: { name: '公司研究', class: 'research' },
  },
  periodic: { annual_report: { period_end: '12-31', deadline: '+1y 04-30' } },
} as unknown as Vocabulary

function entry(id: string, patch: Partial<Entry['material']> = {}, category = 'uploaded'): Entry {
  return {
    category,
    material: {
      material_id: id,
      name: `${id}.pdf`,
      mine: true,
      content_origin: 'upload',
      license: 'self',
      description: {
        subject: '600519.SH',
        doc_type: 'annual_report',
        doc_class: 'disclosure',
        period_start: '2025-01-01',
        period_end: '2025-12-31',
        disclosed_on: null,
        data_format: 'pdf',
        edition: 'full',
        topics: [],
        industry: null,
        language: null,
        attributes: {},
        status: 'confirmed',
        vocab_version: 2,
        resolvable: true,
      },
      current_version: 1,
      created_at: '2026-10-29T08:00:00+00:00',
      deleted: false,
      legacy_app: null,
      ...patch,
    },
    holding: { basis: 'upload', license: 'self', version_no: null },
    version: {
      version_no: 1,
      sha256: 'a'.repeat(64),
      size_bytes: 10,
      media_type: 'application/pdf',
      created_at: '2026-10-29T08:00:00+00:00',
    },
    shown: [],
  }
}

describe('分栏与筛选', () => {
  it('known categories come first and new ones from the backend are kept', () => {
    expect(categoriesOf([entry('a'), entry('b', {}, 'shared')])).toEqual([
      'uploaded',
      'collected',
      'purchased',
      'output',
      'shared',
    ])
    expect(cleanCategory('purchased')).toBe('purchased')
    expect(cleanCategory('a b')).toBeNull()
    expect(cleanMaterialId('1c1b81a8-433c-4e89-9917-98a0630af48e')).toBeTruthy()
    expect(cleanMaterialId('../x')).toBeNull()
  })

  it('filters by category, subject, year, shown-to and unconfirmed', () => {
    const shown = { ...entry('s'), shown: ['app:knowbench'] }
    const draft = entry('d', {
      description: { ...entry('d').material.description, status: 'unconfirmed', subject: null },
    })
    const all = [shown, draft, entry('p', {}, 'purchased')]
    expect(
      applyFilters(all, 'purchased', EMPTY_FILTERS).map((e) => e.material.material_id),
    ).toEqual(['p'])
    expect(applyFilters(all, null, { ...EMPTY_FILTERS, subject: '600519' })).toHaveLength(2)
    expect(applyFilters(all, null, { ...EMPTY_FILTERS, shownTo: 'app:knowbench' })).toEqual([shown])
    expect(applyFilters(all, null, { ...EMPTY_FILTERS, shownTo: 'none' })).toHaveLength(2)
    expect(applyFilters(all, null, { ...EMPTY_FILTERS, unconfirmed: true })).toEqual([draft])
    expect(applyFilters(all, null, { ...EMPTY_FILTERS, year: '2024' })).toEqual([])
  })

  it('the library address carries category and material for links from knowmart', () => {
    expect(paths.library('purchased', 'm-1')).toBe('/library?category=purchased&material=m-1')
    expect(paths.library()).toBe('/library')
  })
})

describe('描述与上传', () => {
  it('a periodic report is filled by year', () => {
    expect(periodForYear(vocabulary, 'annual_report', '2025')).toEqual({
      period_start: '2025-01-01',
      period_end: '2025-12-31',
    })
    expect(periodForYear(vocabulary, 'research_company', '2025')).toBeNull()
  })

  it('research dimensions travel only with research reports', () => {
    const draft = {
      ...EMPTY_DRAFT,
      doc_type: 'research_company',
      subject: '600519.sh',
      institution: '中信证券',
      analysts: '张三、李四, 张三',
      rating: '买入',
    }
    expect(descriptionBody(draft, vocabulary, true)).toMatchObject({
      subject: '600519.SH',
      attributes: { institution: '中信证券', analysts: ['张三', '李四'], rating: '买入' },
      confirm: true,
    })
    expect(
      descriptionBody({ ...draft, doc_type: 'annual_report' }, vocabulary, false).attributes,
    ).toEqual({})
  })

  it('upload query holds the description, license, attestation and the source app', () => {
    const query = uploadQuery(
      {
        ...EMPTY_DRAFT,
        doc_type: 'research_company',
        topics: ['results', 'equity'],
        rating: '增持',
      },
      vocabulary,
      {
        name: 'a.pdf',
        confirm: true,
        license: 'sale',
        attest: true,
        process: true,
        from: 'knowbench',
        ref: 't:1',
      },
    )
    expect(query.get('name')).toBe('a.pdf')
    expect(query.getAll('topics')).toEqual(['results', 'equity'])
    expect(JSON.parse(query.get('attributes') ?? '{}')).toEqual({ rating: '增持' })
    expect(Object.fromEntries([...query].filter(([k]) => k !== 'topics'))).toMatchObject({
      confirm: 'true',
      license: 'sale',
      attest: 'true',
      process: 'true',
      from: 'knowbench',
      ref: 't:1',
    })
    expect(needsAttest('self', 'via_expert')).toBe(true)
    expect(needsAttest('sale', 'self')).toBe(false)
  })

  it('the direct-upload link prefills what the app needs and wins over recognition', () => {
    const search = new URLSearchParams(
      'doc_type=annual_report&subject=600519.SH&period_end=2025-12-31&period_start=2025-01-01&edition=bad!&token=x',
    )
    const prefill = prefillOf(search)
    expect(prefill).toEqual({
      doc_type: 'annual_report',
      subject: '600519.SH',
      period_start: '2025-01-01',
      period_end: '2025-12-31',
    })
    const recognition = {
      description: {
        ...entry('r').material.description,
        doc_type: 'research_company',
        subject: '000001.SZ',
        language: 'zh',
      },
      fields: ['doc_type', 'subject', 'language', 'period'],
      rules_version: 1,
      read_first_page: true,
    } as unknown as Recognition
    const merged = mergeDraft(prefill, recognition)
    expect([merged.doc_type, merged.subject, merged.language]).toEqual([
      'annual_report',
      '600519.SH',
      'zh',
    ])
    expect([...recognizedFields(recognition, prefill)]).toEqual(['language'])
  })

  it('same name and same description asks whether it is a new version', () => {
    const existing = entry('a')
    const draft = {
      ...EMPTY_DRAFT,
      doc_type: 'annual_report',
      subject: '600519.sh',
      period_start: '2025-01-01',
      period_end: '2025-12-31',
    }
    expect(duplicatesOf([existing], 'a.pdf', draft)).toEqual([existing])
    expect(duplicatesOf([existing], 'b.pdf', draft)).toEqual([])
    expect(duplicatesOf([existing], 'a.pdf', { ...draft, edition: 'summary' })).toEqual([])
  })
})
