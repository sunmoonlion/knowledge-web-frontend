import { z } from 'zod'

// knowbase web端自家的资料库接口（后端 /api/web/v1/library，SDD 0044）。
// 样子照后端 app/interfaces/schemas/user_library.py、web_library.py；答复一律过 zod。
// 分类、用途、许可这类值后端以后可能加，这里收字符串，不写死成枚举（0044 第 2.1 节）。

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const isoDateTime = z.string().min(10)

export const descriptionSchema = z.object({
  subject: z.string().nullable(),
  doc_type: z.string().nullable(),
  doc_class: z.string().nullable().optional(),
  period_start: isoDate.nullable(),
  period_end: isoDate.nullable(),
  disclosed_on: isoDate.nullable(),
  data_format: z.string().nullable(),
  edition: z.string(),
  topics: z.array(z.string()),
  industry: z.string().nullable(),
  language: z.string().nullable(),
  attributes: z.record(z.string(), z.unknown()),
  status: z.string(),
  vocab_version: z.number(),
  resolvable: z.boolean(),
})

export const versionSchema = z.object({
  version_no: z.number().int(),
  sha256: z.string(),
  size_bytes: z.number().int(),
  media_type: z.string(),
  created_at: isoDateTime,
})

export const entrySchema = z.object({
  category: z.string(),
  material: z.object({
    material_id: z.string(),
    name: z.string(),
    mine: z.boolean(),
    content_origin: z.string(),
    license: z.string(),
    description: descriptionSchema,
    current_version: z.number().int(),
    created_at: isoDateTime,
    deleted: z.boolean(),
    legacy_app: z.string().nullable(),
    provenance: z.record(z.string(), z.unknown()).nullable().optional(),
  }),
  holding: z.object({
    basis: z.string(),
    license: z.string(),
    version_no: z.number().int().nullable(),
  }),
  version: versionSchema,
  shown: z.array(z.string()),
})

export const entriesSchema = z.array(entrySchema)

export const usageSchema = z.object({
  bytes_used: z.number().int(),
  quota_bytes: z.number().int(),
  max_item_bytes: z.number().int(),
  accepted: z.array(z.string()),
})

export const vocabularySchema = z.object({
  version: z.number().int(),
  doc_classes: z.record(z.string(), z.object({ name: z.string(), publisher: z.string() })),
  doc_types: z.record(z.string(), z.object({ name: z.string(), class: z.string() })),
  editions: z.record(z.string(), z.string()),
  topics: z.record(z.string(), z.string()),
  industries: z.array(z.string()),
  languages: z.record(z.string(), z.string()),
  research: z.object({
    closed: z.record(z.string(), z.record(z.string(), z.string())),
    open: z.array(z.string()),
  }),
  formats: z.record(z.string(), z.string()),
  subject_kinds: z.array(z.string()),
  periodic: z.record(z.string(), z.object({ period_end: z.string(), deadline: z.string() })),
  collectable: z.record(z.string(), z.array(z.string())),
})

export const recognitionSchema = z.object({
  description: descriptionSchema.omit({ status: true, vocab_version: true, resolvable: true }),
  fields: z.array(z.string()),
  rules_version: z.number().int(),
  read_first_page: z.boolean(),
})

export const renditionSchema = z.object({
  kind: z.string(),
  rendition_no: z.number().int(),
  processor: z.string(),
  processor_version: z.string(),
  status: z.string(),
  sha256: z.string().nullable(),
  detail: z.record(z.string(), z.unknown()),
  created_at: isoDateTime,
  ready_at: isoDateTime.nullable(),
})

export const useSchema = z.object({
  use: z.string(),
  created_at: isoDateTime,
  created_via: z.string(),
  version_no: z.number().int().nullable(),
  material_id: z.string().nullable().optional(),
})

export const historyEntrySchema = z.object({
  at: isoDateTime,
  what: z.string(),
  before: z.record(z.string(), z.unknown()),
  after: z.record(z.string(), z.unknown()),
})

export const readEventSchema = z.object({
  at: isoDateTime,
  reader: z.string(),
  operation: z.string(),
  app: z.string().nullable(),
  grant_id: z.string().nullable(),
  sha256: z.string(),
  beneficiary: z.string().nullable(),
  reader_role: z.string().nullable(),
})

export const impactSchema = z.object({
  other_holders: z.number().int(),
  market: z.boolean(),
  bound_experts: z.array(z.string()),
  frozen_experts: z.array(z.string()),
  active_grants: z.number().int(),
})

export const accountSchema = z.object({
  default_display: z.boolean(),
  seen: z.boolean(),
  displays_by_default: z.boolean(),
})

export const expertSchema = z.object({
  expert_id: z.string(),
  name: z.string(),
  latest_version: z.string().nullable(),
})

export const platformConsentSchema = z.object({
  app: z.string(),
  kind: z.string(),
  ref: z.string(),
  created_at: isoDateTime,
  until: isoDateTime.nullable(),
  operator_reads: z.number().int(),
  items: z.array(
    z.object({ material_id: z.string().nullable(), version_no: z.number().int().nullable() }),
  ),
})

export const subscriptionSchema = z.object({
  subscription_id: z.string(),
  revision: z.number().int(),
  by: z.string(),
  starts_on: isoDate,
  ends_on: isoDate,
  purpose: z.string(),
  subjects: z.array(z.string()),
  doc_types: z.array(z.string()),
  urls: z.array(z.string()),
  topic: z.string().nullable(),
  pick_each_round: z.boolean(),
  created_at: isoDateTime,
})

export type Description = z.infer<typeof descriptionSchema>
export type Entry = z.infer<typeof entrySchema>
export type Usage = z.infer<typeof usageSchema>
export type Vocabulary = z.infer<typeof vocabularySchema>
export type Recognition = z.infer<typeof recognitionSchema>
export type Version = z.infer<typeof versionSchema>
export type Rendition = z.infer<typeof renditionSchema>
export type Use = z.infer<typeof useSchema>
export type HistoryEntry = z.infer<typeof historyEntrySchema>
export type ReadEvent = z.infer<typeof readEventSchema>
export type Impact = z.infer<typeof impactSchema>
export type Account = z.infer<typeof accountSchema>
export type Expert = z.infer<typeof expertSchema>
export type PlatformConsent = z.infer<typeof platformConsentSchema>
export type Subscription = z.infer<typeof subscriptionSchema>
