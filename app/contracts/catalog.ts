// 数据目录的契约。字段以 knowledge-backend `interfaces/schemas/catalog.py` 为真源。
// 这些写法由 `tests/unit/catalog-contract-samples.test.ts` 对着预览样例（真后端录下来的返回）逐份检查。
import { z } from 'zod'

export const catalogEntrySchema = z
  .object({
    dataset: z.string(),
    title: z.string(),
    security_code: z.string().nullable(),
    data_version: z.string(),
    start_date: z.string().nullable(),
    end_date: z.string().nullable(),
    // 默认数据集：不经登记，所以没有更新时间
    default: z.boolean(),
    updated_at: z.string().nullable(),
  })
  .loose()
export type CatalogEntry = z.infer<typeof catalogEntrySchema>

export const catalogListSchema = z
  .object({
    // 多数据集开没开。没开时目录里只有默认数据集
    registry_enabled: z.boolean(),
    // 不管搜没搜，现在一共有几个
    total: z.number().int(),
    datasets: z.array(catalogEntrySchema),
  })
  .loose()
export type CatalogList = z.infer<typeof catalogListSchema>

const noteSchema = z.object({ key: z.string(), label: z.string(), text: z.string() }).loose()
export type Note = z.infer<typeof noteSchema>

const columnSchema = z
  .object({
    name: z.string(),
    type: z.string(),
    label: z.string().nullable(),
    unit: z.string().nullable(),
  })
  .loose()

const tableSchema = z
  .object({
    name: z.string(),
    // data：装数据的表；dictionary：数据集自带的说明表
    kind: z.enum(['data', 'dictionary']),
    row_count: z.number().int().nullable(),
    columns: z.array(columnSchema),
  })
  .loose()
export type Table = z.infer<typeof tableSchema>

const metricSchema = z
  .object({
    name: z.string(),
    label: z.string().nullable(),
    description: z.string().nullable(),
    expression: z.string().nullable(),
    unit: z.string().nullable(),
    time_basis: z.string().nullable(),
    tables: z.array(z.string()),
    applicable_when: z.string().nullable(),
    reason_if_not: z.string().nullable(),
    // 能不能按名字直接算。老的数据集不知道，是空
    queryable: z.boolean().nullable(),
  })
  .loose()
export type Metric = z.infer<typeof metricSchema>

// 一个数据集：只有结构。这里没有、也不该有任何一行数据
export const catalogDatasetSchema = catalogEntrySchema
  .extend({
    sources: z.array(noteSchema),
    tables: z.array(tableSchema),
    metrics: z.array(metricSchema),
    limitations: z.array(noteSchema),
  })
  .loose()
export type CatalogDataset = z.infer<typeof catalogDatasetSchema>
