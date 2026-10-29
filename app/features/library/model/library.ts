// 我的数据（knowbase web端，SDD 0044）的状态与算法：不取数、不渲染。
import type { Description, Entry, Recognition, Vocabulary } from '@/contracts/library'

// —— 总栏的分类（0044 第 2.1 节）：后端给什么分类就画什么；这四类先排在前面 ——

export const KNOWN_CATEGORIES = ['uploaded', 'collected', 'purchased', 'output'] as const

export function categoriesOf(entries: Entry[]): string[] {
  const extra = [...new Set(entries.map((e) => e.category))].filter(
    (c) => !(KNOWN_CATEGORIES as readonly string[]).includes(c),
  )
  return [...KNOWN_CATEGORIES, ...extra.sort()]
}

// 地址栏里带的分类、选中的那一份：不合样子的当作没带
export function cleanCategory(raw: string | null | undefined): string | null {
  return raw && /^[a-z_]{1,32}$/.test(raw) ? raw : null
}

export function cleanMaterialId(raw: string | null | undefined): string | null {
  return raw && /^[A-Za-z0-9-]{1,64}$/.test(raw) ? raw : null
}

// —— 展示到哪里（0044 第 2.2 节） ——

export const DISPLAY_APPS = ['knowbench', 'knowlab'] as const
export type DisplayApp = (typeof DISPLAY_APPS)[number]

export type ParsedUse =
  | { kind: 'app'; app: string }
  | { kind: 'market' }
  | { kind: 'expert'; expert: string; version: string | null }
  | { kind: 'other'; use: string }

export function parseUse(use: string): ParsedUse {
  if (use.startsWith('app:')) return { kind: 'app', app: use.slice(4) }
  if (use === 'market') return { kind: 'market' }
  if (use.startsWith('expert:')) {
    const [expert, version] = use.slice(7).split('@', 2)
    return { kind: 'expert', expert, version: version ?? null }
  }
  return { kind: 'other', use }
}

export function isShownTo(entry: Entry, use: string) {
  return entry.shown.includes(use)
}

// 买来的只有两个应用开关和「绑给自用专家」，没有交给 knowmart（许可继承卖家设置）
export function canHandToMarket(entry: Entry) {
  return entry.material.mine && entry.category !== 'purchased'
}

// —— 许可档（数据拓扑第 5.3 节）：只许本人用 < 可以经专家给别人用 < 可以出售 ——

export const LICENSES = ['self', 'via_expert', 'sale'] as const
const RANK: Record<string, number> = { self: 0, via_expert: 1, sale: 2 }

export function licenseRank(license: string) {
  return RANK[license] ?? 0
}

export function needsAttest(from: string, to: string) {
  return licenseRank(to) > licenseRank(from)
}

export function isLowering(from: string, to: string) {
  return licenseRank(to) < licenseRank(from)
}

// 只有自己上传的能改；采集来的、买来的、产出转来的由系统定（0044 第 2.2 节）
export function canChangeLicense(entry: Entry) {
  return entry.material.mine && entry.material.content_origin === 'upload'
}

// 产出区的才能「转为数据」；转过来的那份不在产出栏
export function canConvert(entry: Entry) {
  return entry.category === 'output' && entry.material.mine
}

// 产出不改（测试证据只增不改）；买来的、采集来的没有上传新版本
export function canAddVersion(entry: Entry) {
  return entry.material.mine && entry.category === 'uploaded'
}

// —— 筛选（0044 第 2.1 节） ——

export type Filters = {
  subject: string
  docClass: string
  docType: string
  year: string
  shownTo: string
  unconfirmed: boolean
}

export const EMPTY_FILTERS: Filters = {
  subject: '',
  docClass: '',
  docType: '',
  year: '',
  shownTo: '',
  unconfirmed: false,
}

function yearOf(d: Description): string | null {
  const day = d.period_end ?? d.disclosed_on
  return day ? day.slice(0, 4) : null
}

export function applyFilters(entries: Entry[], category: string | null, filters: Filters) {
  const subject = filters.subject.trim().toUpperCase()
  return entries.filter((entry) => {
    const d = entry.material.description
    if (category && entry.category !== category) return false
    if (subject && !(d.subject ?? '').toUpperCase().includes(subject)) return false
    if (filters.docClass && d.doc_class !== filters.docClass) return false
    if (filters.docType && d.doc_type !== filters.docType) return false
    if (filters.year && yearOf(d) !== filters.year) return false
    if (filters.shownTo === 'none' && entry.shown.length > 0) return false
    if (filters.shownTo && filters.shownTo !== 'none' && !entry.shown.includes(filters.shownTo))
      return false
    if (filters.unconfirmed && d.status !== 'unconfirmed') return false
    return true
  })
}

export function countsByCategory(entries: Entry[]) {
  const counts: Record<string, number> = {}
  for (const entry of entries) counts[entry.category] = (counts[entry.category] ?? 0) + 1
  return counts
}

export function yearsOf(entries: Entry[]) {
  return [...new Set(entries.map((e) => yearOf(e.material.description)).filter(Boolean))].sort(
    (a, b) => (b as string).localeCompare(a as string),
  ) as string[]
}

export function unconfirmedCount(entries: Entry[]) {
  return entries.filter((e) => e.material.mine && e.material.description.status === 'unconfirmed')
    .length
}

// —— 空间 ——

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unit]}`
}

export function usagePercent(used: number, quota: number) {
  if (quota <= 0) return 0
  return Math.min(100, Math.round((used / quota) * 1000) / 10)
}

// —— 描述表单（接词表各维度，0049 第六节）：表单里一律是字符串 ——

export type Draft = {
  subject: string
  doc_type: string
  period_start: string
  period_end: string
  disclosed_on: string
  edition: string
  topics: string[]
  industry: string
  language: string
  institution: string
  analysts: string
  rating: string
  forecast: string[]
  market: string
  depth: string
  frequency: string
}

export const EMPTY_DRAFT: Draft = {
  subject: '',
  doc_type: '',
  period_start: '',
  period_end: '',
  disclosed_on: '',
  edition: 'full',
  topics: [],
  industry: '',
  language: '',
  institution: '',
  analysts: '',
  rating: '',
  forecast: [],
  market: '',
  depth: '',
  frequency: '',
}

type DescriptionLike = Pick<
  Description,
  | 'subject'
  | 'doc_type'
  | 'period_start'
  | 'period_end'
  | 'disclosed_on'
  | 'edition'
  | 'topics'
  | 'industry'
  | 'language'
  | 'attributes'
>

const text = (value: unknown) => (typeof value === 'string' ? value : '')
const list = (value: unknown) =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []

export function draftOf(d: DescriptionLike): Draft {
  const a = d.attributes ?? {}
  return {
    subject: d.subject ?? '',
    doc_type: d.doc_type ?? '',
    period_start: d.period_start ?? '',
    period_end: d.period_end ?? '',
    disclosed_on: d.disclosed_on ?? '',
    edition: d.edition || 'full',
    topics: [...d.topics],
    industry: d.industry ?? '',
    language: d.language ?? '',
    institution: text(a.institution),
    analysts: list(a.analysts).join('、'),
    rating: text(a.rating),
    forecast: list(a.forecast),
    market: text(a.market),
    depth: text(a.depth),
    frequency: text(a.frequency),
  }
}

export function classOf(vocabulary: Vocabulary | undefined, docType: string) {
  return vocabulary?.doc_types[docType]?.class ?? null
}

export function isResearch(vocabulary: Vocabulary | undefined, docType: string) {
  return classOf(vocabulary, docType) === 'research'
}

export function isPeriodic(vocabulary: Vocabulary | undefined, docType: string) {
  return Boolean(vocabulary?.periodic[docType])
}

// 定期报告按年填：年初到报告期末（vocabulary.py 的 PERIODIC）
export function periodForYear(vocabulary: Vocabulary | undefined, docType: string, year: string) {
  const rule = vocabulary?.periodic[docType]
  if (!rule || !/^\d{4}$/.test(year)) return null
  return { period_start: `${year}-01-01`, period_end: `${year}-${rule.period_end}` }
}

// 研报的几维（只有研报带）：空的不写
export function attributesOf(draft: Draft, research: boolean): Record<string, unknown> {
  if (!research) return {}
  const attributes: Record<string, unknown> = {}
  if (draft.institution.trim()) attributes.institution = draft.institution.trim()
  const analysts = draft.analysts
    .split(/[、,，\s]+/)
    .map((name) => name.trim())
    .filter(Boolean)
  if (analysts.length) attributes.analysts = [...new Set(analysts)].slice(0, 20)
  if (draft.rating.trim()) attributes.rating = draft.rating.trim()
  if (draft.forecast.length) attributes.forecast = draft.forecast
  if (draft.market) attributes.market = draft.market
  if (draft.depth) attributes.depth = draft.depth
  if (draft.frequency) attributes.frequency = draft.frequency
  return attributes
}

const orNull = (value: string) => (value.trim() ? value.trim() : null)

// 改描述的请求体（整份替换）
export function descriptionBody(
  draft: Draft,
  vocabulary: Vocabulary | undefined,
  confirm: boolean,
) {
  const research = isResearch(vocabulary, draft.doc_type)
  return {
    subject: orNull(draft.subject)?.toUpperCase() ?? null,
    doc_type: orNull(draft.doc_type),
    period_start: orNull(draft.period_start),
    period_end: orNull(draft.period_end),
    disclosed_on: orNull(draft.disclosed_on),
    edition: draft.edition || 'full',
    topics: draft.topics,
    industry: orNull(draft.industry),
    language: orNull(draft.language),
    attributes: attributesOf(draft, research),
    confirm,
  }
}

export type UploadOptions = {
  name: string
  confirm: boolean
  license: string
  attest: boolean
  process: boolean
  from?: string | null
  ref?: string | null
}

// 上传的查询参数：描述放在参数里，研报的几维是一段 JSON；文件本身是请求体
export function uploadQuery(
  draft: Draft,
  vocabulary: Vocabulary | undefined,
  options: UploadOptions,
) {
  const body = descriptionBody(draft, vocabulary, options.confirm)
  const query = new URLSearchParams({ name: options.name })
  for (const key of [
    'subject',
    'doc_type',
    'period_start',
    'period_end',
    'disclosed_on',
    'industry',
    'language',
  ] as const) {
    const value = body[key]
    if (value) query.set(key, value)
  }
  query.set('edition', body.edition)
  for (const topic of body.topics) query.append('topics', topic)
  if (Object.keys(body.attributes).length) query.set('attributes', JSON.stringify(body.attributes))
  if (options.confirm) query.set('confirm', 'true')
  query.set('license', options.license)
  if (options.attest) query.set('attest', 'true')
  if (options.process) query.set('process', 'true')
  if (options.from) query.set('from', options.from)
  if (options.ref) query.set('ref', options.ref)
  return query
}

// —— 识别结果 + 直达上传带来的预填 ——

// 直达上传的链接带的描述（0044 第 2.4 节）：只认这几栏，值不合样子的不要
export const PREFILL_KEYS = [
  'subject',
  'doc_type',
  'period_start',
  'period_end',
  'disclosed_on',
  'edition',
] as const

const PREFILL_PATTERN: Record<(typeof PREFILL_KEYS)[number], RegExp> = {
  subject: /^[A-Za-z0-9.:-]{1,64}$/,
  doc_type: /^[a-z_]{1,32}$/,
  period_start: /^\d{4}-\d{2}-\d{2}$/,
  period_end: /^\d{4}-\d{2}-\d{2}$/,
  disclosed_on: /^\d{4}-\d{2}-\d{2}$/,
  edition: /^[a-z]{1,16}$/,
}

export function prefillOf(search: { get(name: string): string | null }): Partial<Draft> {
  const prefill: Partial<Draft> = {}
  for (const key of PREFILL_KEYS) {
    const value = search.get(key)
    if (value && PREFILL_PATTERN[key].test(value)) prefill[key] = value
  }
  return prefill
}

// 链接预填的照链接（那是应用要的那一样）；没预填的用识别出来的
export function mergeDraft(prefill: Partial<Draft>, recognition: Recognition | null): Draft {
  const recognized = recognition ? draftOf(recognition.description) : EMPTY_DRAFT
  return { ...EMPTY_DRAFT, ...recognized, ...prefill }
}

// 表单上哪几栏标「待确认」（识别出来的）：研报的几维记成 attributes.<键>
export function recognizedFields(recognition: Recognition | null, prefill: Partial<Draft>) {
  const fields = new Set(recognition?.fields ?? [])
  for (const key of Object.keys(prefill)) {
    fields.delete(key)
    if (key === 'period_start' || key === 'period_end') fields.delete('period')
  }
  return fields
}

// —— 同名同描述（0044 第 2.3 节）：问「作为新版本」还是「另一份资料」 ——

export function descriptionKey(d: {
  doc_type: string | null
  subject: string | null
  period_end: string | null
  disclosed_on: string | null
  edition: string
}) {
  return [
    d.doc_type ?? '',
    (d.subject ?? '').toUpperCase(),
    d.period_end ?? '',
    d.disclosed_on ?? '',
    d.edition,
  ].join('|')
}

export function duplicatesOf(entries: Entry[], name: string, draft: Draft) {
  const key = descriptionKey({
    doc_type: orNull(draft.doc_type),
    subject: orNull(draft.subject),
    period_end: orNull(draft.period_end),
    disclosed_on: orNull(draft.disclosed_on),
    edition: draft.edition || 'full',
  })
  return entries.filter(
    (e) =>
      e.material.mine &&
      e.category === 'uploaded' &&
      e.material.name === name &&
      descriptionKey(e.material.description) === key,
  )
}

// —— 地址（不带语言：i18n 的 Link 自己加） ——

export const paths = {
  library: (category?: string | null, material?: string | null) => {
    const query = new URLSearchParams()
    if (category) query.set('category', category)
    if (material) query.set('material', material)
    const tail = query.toString()
    return tail ? `/library?${tail}` : '/library'
  },
  upload: '/upload',
  consents: '/consents',
  settings: '/settings',
}
