'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { catalogDatasetSchema, catalogListSchema } from '@/contracts/catalog'
import { CatalogError, getJson, seg } from '@/lib/catalog/http'

const base = '/api/web/v1/catalog/datasets'

// 现有的数据集。和专家、代理用工具查到的是同一份
export function useDatasets(query: string) {
  return useQuery({
    queryKey: ['catalog', 'datasets', query],
    queryFn: () =>
      getJson(catalogListSchema, query ? `${base}?q=${encodeURIComponent(query)}` : base),
    placeholderData: keepPreviousData,
  })
}

// 一个数据集的结构
export function useDataset(dataset: string) {
  return useQuery({
    queryKey: ['catalog', 'dataset', dataset],
    queryFn: () => getJson(catalogDatasetSchema, `${base}/${seg(dataset)}`),
  })
}

export function isNotFound(error: unknown) {
  return error instanceof CatalogError && error.code === 'not_found'
}
