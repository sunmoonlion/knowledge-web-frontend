// 数据目录的状态与算法：不取数、不渲染。
import type { CatalogDataset, CatalogEntry, Table } from '@/contracts/catalog'

// 搜索框里的词：去掉两头的空白；后端最多收 80 个字
export function cleanQuery(raw: string | null | undefined) {
  return (raw ?? '').trim().slice(0, 80)
}

// 搜的是不是一个证券代码。是的话，「申请入库」的链接带上它
export function codeIn(query: string) {
  return /^\d{6}$/.test(query) ? query : undefined
}

// 数据从哪天到哪天。两头都没有就是不知道
export function periodOf(entry: Pick<CatalogEntry, 'start_date' | 'end_date'>) {
  if (!entry.start_date && !entry.end_date) return null
  return { from: entry.start_date ?? '?', to: entry.end_date ?? '?' }
}

// 装数据的表在前，数据集自带的说明表另列
export function splitTables(tables: Table[]) {
  return {
    data: tables.filter((table) => table.kind === 'data'),
    dictionary: tables.filter((table) => table.kind === 'dictionary'),
  }
}

// 这张表的列有没有中文名、单位：都没有就不画那两栏
export function columnExtras(table: Table) {
  return {
    labels: table.columns.some((column) => column.label),
    units: table.columns.some((column) => column.unit),
  }
}

export function countsOf(dataset: CatalogDataset) {
  const { data } = splitTables(dataset.tables)
  return {
    tables: data.length,
    metrics: dataset.metrics.length,
    limitations: dataset.limitations.length,
  }
}

// 目录是哪一种样子
export type CatalogSituation =
  | 'listed' // 有数据集可列
  | 'not-found' // 搜了，没有
  | 'default-only' // 没搜，目录里只有默认数据集

export function situationOf(
  list: { total: number; datasets: CatalogEntry[] },
  query: string,
): CatalogSituation {
  if (query !== '' && list.datasets.length === 0) return 'not-found'
  if (query === '' && list.datasets.every((entry) => entry.default)) return 'default-only'
  return 'listed'
}
