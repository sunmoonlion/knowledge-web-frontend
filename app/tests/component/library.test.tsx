// 我的数据的页面（features/library）：总栏认 knowmart 带来的地址；上传先识别、高档要勾
// 「我有权」；直达上传带上来源应用，传完回到原处。
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { LibraryWorkspace, UploadPanel } from '@/features/library'
import messages from '@/messages/zh-CN.json'

let search = new URLSearchParams()
const push = vi.fn()
const replace = vi.fn()
const leave = vi.fn()

vi.mock('next/navigation', () => ({ useSearchParams: () => search }))
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ push, replace }),
}))
vi.mock('@/lib/leave-to', () => ({ leaveTo: (url: string) => leave(url) }))

const VOCABULARY = {
  version: 2,
  doc_classes: {
    disclosure: { name: '公告', publisher: '上市公司' },
    research: { name: '研报', publisher: '研究机构' },
  },
  doc_types: {
    annual_report: { name: '年报', class: 'disclosure' },
    research_company: { name: '公司研究', class: 'research' },
  },
  editions: { full: '全文', summary: '摘要' },
  topics: { results: '业绩' },
  industries: ['银行'],
  languages: { zh: '中文' },
  research: {
    closed: {
      forecast: { initiation: '首次覆盖' },
      market: { cn: 'A股' },
      depth: {},
      frequency: {},
    },
    open: ['institution', 'analysts', 'rating'],
  },
  formats: { pdf: 'PDF' },
  subject_kinds: ['cn_security'],
  periodic: { annual_report: { period_end: '12-31', deadline: '+1y 04-30' } },
  collectable: { security: ['annual_report'], org: [] },
}

function entry(id: string, category: string, name: string) {
  return {
    category,
    material: {
      material_id: id,
      name,
      mine: category !== 'purchased',
      content_origin: category === 'purchased' ? 'upload' : 'upload',
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
      provenance: null,
    },
    holding: {
      basis: category === 'purchased' ? 'purchase' : 'upload',
      license: 'self',
      version_no: 1,
    },
    version: {
      version_no: 1,
      sha256: 'b'.repeat(64),
      size_bytes: 2048,
      media_type: 'application/pdf',
      created_at: '2026-10-29T08:00:00+00:00',
    },
    shown: category === 'purchased' ? ['app:knowbench'] : [],
  }
}

const ENTRIES = [
  entry('m-up', 'uploaded', '我的年报.pdf'),
  entry('m-buy', 'purchased', '买来的年报.pdf'),
]
const USAGE = {
  bytes_used: 4096,
  quota_bytes: 1024 ** 3,
  max_item_bytes: 50 * 1024 * 1024,
  accepted: ['.pdf'],
}
const ACCOUNT = { default_display: true, seen: true, displays_by_default: true }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function routes(
  extra: (url: string, init?: RequestInit) => Response | undefined = () => undefined,
) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const found = extra(url, init)
    if (found) return found
    if (url.endsWith('/vocabulary')) return json(VOCABULARY)
    if (url.endsWith('/usage')) return json(USAGE)
    if (url.endsWith('/account')) return json(ACCOUNT)
    if (url.endsWith('/library/materials')) return json(ENTRIES)
    if (url.endsWith('/experts')) return json([])
    if (url.includes('/versions')) return json([ENTRIES[1].version])
    if (url.includes('/cross-app/origin')) return json(null)
    return json({ code: 'unexpected' }, 404)
  })
}

function page(children: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <NextIntlClientProvider locale="zh-CN" messages={messages} timeZone="Asia/Shanghai">
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </NextIntlClientProvider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  search = new URLSearchParams()
  push.mockReset()
  replace.mockReset()
  leave.mockReset()
})

describe('LibraryWorkspace', () => {
  it('opens the column and the material that a knowmart link points at', async () => {
    search = new URLSearchParams('category=purchased&material=m-buy')
    vi.stubGlobal('fetch', routes())
    page(<LibraryWorkspace csrfToken={'c'.repeat(32)} />)
    expect(await screen.findByRole('heading', { name: '买来的年报.pdf' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '我的年报.pdf' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^买来的\s*1$/ })).toHaveAttribute(
      'aria-current',
      'page',
    )
    // 买来的：没有「交给 knowmart」，有「绑给自用专家」；许可由系统定
    expect(screen.queryByText('交给 knowmart 待上架')).not.toBeInTheDocument()
    expect(screen.getByText('绑给自用专家')).toBeInTheDocument()
    expect(screen.getByText('采集来的、买来的、产出转来的由系统定，不能改。')).toBeInTheDocument()
  })

  it('asks for the default-display choice the first time', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    vi.stubGlobal(
      'fetch',
      routes((url, init) => {
        calls.push({ url, init })
        if (url.endsWith('/account') && init?.method === 'PUT') return json(ACCOUNT)
        if (url.endsWith('/account'))
          return json({ ...ACCOUNT, seen: false, displays_by_default: false })
        return undefined
      }),
    )
    page(<LibraryWorkspace csrfToken={'c'.repeat(32)} />)
    fireEvent.click(await screen.findByRole('button', { name: '知道了，保持开' }))
    await waitFor(() =>
      expect(calls.some((c) => c.url.endsWith('/account') && c.init?.method === 'PUT')).toBe(true),
    )
    const put = calls.find((c) => c.init?.method === 'PUT')
    expect(JSON.parse(String(put?.init?.body))).toEqual({ default_display: true })
    expect((put?.init?.headers as Record<string, string>)['X-CSRF-Token']).toBe('c'.repeat(32))
  })
})

describe('UploadPanel', () => {
  const recognition = {
    description: {
      subject: '600519.SH',
      doc_type: 'research_company',
      doc_class: 'research',
      period_start: null,
      period_end: null,
      disclosed_on: '2026-10-27',
      data_format: 'pdf',
      edition: 'full',
      topics: [],
      industry: null,
      language: 'zh',
      attributes: { institution: '中信证券' },
    },
    fields: ['subject', 'doc_type', 'attributes.institution'],
    rules_version: 1,
    read_first_page: true,
  }

  it('recognises first, needs the attestation for a higher license, then uploads', async () => {
    const sent: Array<{ url: string; init?: RequestInit }> = []
    vi.stubGlobal(
      'fetch',
      routes((url, init) => {
        if (url.includes('/recognitions')) return json(recognition)
        if (url.includes('/library/materials?')) {
          sent.push({ url, init })
          return json(entry('m-new', 'uploaded', '茅台.pdf'), 201)
        }
        return undefined
      }),
    )
    const { container } = page(<UploadPanel csrfToken={'c'.repeat(32)} />)
    const input = container.querySelector('input[type=file]') as HTMLInputElement
    const file = new File(['%PDF-1.4'], '茅台.pdf', { type: 'application/pdf' })
    await waitFor(() => expect(input).toBeInTheDocument())
    fireEvent.change(input, { target: { files: [file] } })
    expect(await screen.findByDisplayValue('中信证券')).toBeInTheDocument()
    expect(screen.getAllByText('待确认').length).toBeGreaterThanOrEqual(3)

    fireEvent.click(screen.getByLabelText('可以出售'))
    const submit = screen.getByRole('button', { name: '上传' })
    expect(submit).toBeDisabled()
    fireEvent.click(screen.getByLabelText('我有权让这份资料「可以出售」。'))
    fireEvent.click(screen.getByLabelText(/描述无误，我确认/))
    fireEvent.click(submit)
    await waitFor(() => expect(sent).toHaveLength(1))
    const query = new URL(sent[0].url, 'http://x').searchParams
    expect(query.get('license')).toBe('sale')
    expect(query.get('attest')).toBe('true')
    expect(query.get('confirm')).toBe('true')
    expect(JSON.parse(query.get('attributes') ?? '{}')).toEqual({ institution: '中信证券' })
    expect(sent[0].init?.body).toBe(file)
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/library?category=uploaded&material=m-new'),
    )
  })

  it('a direct upload carries the source app and returns to where it came from', async () => {
    search = new URLSearchParams('from=knowbench&ref=t:9&doc_type=annual_report&subject=600519.SH')
    const sent: string[] = []
    vi.stubGlobal(
      'fetch',
      routes((url) => {
        if (url.includes('/cross-app/origin'))
          return json({
            app: 'knowbench',
            ref: 't:9',
            return_url: 'https://knowbench.example/back?ref=t%3A9',
          })
        if (url.includes('/recognitions')) return json(recognition)
        if (url.includes('/library/materials?')) {
          sent.push(url)
          return json(entry('m-new', 'uploaded', '年报.pdf'), 201)
        }
        return undefined
      }),
    )
    const { container } = page(<UploadPanel csrfToken={'c'.repeat(32)} />)
    expect(
      await screen.findByText('knowbench 缺这一样资料，采不来，请在这里上传'),
    ).toBeInTheDocument()
    const input = container.querySelector('input[type=file]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['%PDF'], '年报.pdf')] } })
    // 链接预填的照链接：类型是年报，不是识别出来的公司研究
    await waitFor(() => expect(screen.getByDisplayValue('年报')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '上传' }))
    await waitFor(() => expect(sent).toHaveLength(1))
    const query = new URL(sent[0], 'http://x').searchParams
    expect([query.get('from'), query.get('ref'), query.get('doc_type')]).toEqual([
      'knowbench',
      't:9',
      'annual_report',
    ])
    await waitFor(() =>
      expect(leave).toHaveBeenCalledWith('https://knowbench.example/back?ref=t%3A9'),
    )
  })
})
