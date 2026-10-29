'use client'

// 我的数据的取数：同源 /api/web/v1/library，凭本人会话；改动带 CSRF。答复一律过 zod。
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { z } from 'zod'

import {
  accountSchema,
  entriesSchema,
  entrySchema,
  expertSchema,
  historyEntrySchema,
  impactSchema,
  platformConsentSchema,
  readEventSchema,
  recognitionSchema,
  renditionSchema,
  subscriptionSchema,
  usageSchema,
  useSchema,
  versionSchema,
  vocabularySchema,
} from '@/contracts/library'
import { ApiClientError, requestJson } from '@/lib/common/api-client'

const BASE = '/api/web/v1/library'
const seg = (value: string) => encodeURIComponent(value)
const material = (id: string) => `${BASE}/materials/${seg(id)}`

export class LibraryContractError extends Error {
  constructor(options?: { cause?: unknown }) {
    super('library_contract_invalid')
    this.name = 'LibraryContractError'
    if (options?.cause !== undefined) this.cause = options.cause
  }
}

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value)
  if (!parsed.success) throw new LibraryContractError({ cause: parsed.error })
  return parsed.data
}

async function get<T>(schema: z.ZodType<T>, path: string): Promise<T> {
  return parse(schema, await requestJson<unknown>(path))
}

// 文件本身就是请求体（后端按原样收、50 MB 封顶）
async function sendFile(path: string, file: Blob, csrfToken: string): Promise<unknown> {
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    redirect: 'manual',
    body: file,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/octet-stream',
      'X-CSRF-Token': csrfToken,
    },
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const candidate = (payload ?? {}) as Record<string, unknown>
    throw new ApiClientError(response.status, {
      code: typeof candidate.code === 'string' ? candidate.code : 'request_failed',
      message_key: 'errors.requestFailed',
      retryable: false,
      correlation_id: typeof candidate.correlation_id === 'string' ? candidate.correlation_id : '',
    })
  }
  return payload
}

export function errorCode(error: unknown): string | null {
  if (error instanceof ApiClientError) return error.problem.code
  if (error instanceof LibraryContractError) return 'contract_invalid'
  return error ? 'request_failed' : null
}

export const keys = {
  all: ['knowbase', 'library'] as const,
  entries: () => [...keys.all, 'entries'] as const,
  entry: (id: string) => [...keys.all, 'entry', id] as const,
  usage: () => [...keys.all, 'usage'] as const,
}

// —— 读 ——

export function useVocabulary() {
  return useQuery({
    queryKey: [...keys.all, 'vocabulary'],
    queryFn: () => get(vocabularySchema, `${BASE}/vocabulary`),
    staleTime: 10 * 60 * 1000,
  })
}

export function useUsage() {
  return useQuery({ queryKey: keys.usage(), queryFn: () => get(usageSchema, `${BASE}/usage`) })
}

// 总栏一次取全，分栏、筛选在页面上做（每栏的数也要）
export function useEntries() {
  return useQuery({
    queryKey: keys.entries(),
    queryFn: () => get(entriesSchema, `${BASE}/materials`),
  })
}

export function useEntry(id: string | null) {
  return useQuery({
    queryKey: keys.entry(id ?? ''),
    queryFn: () => get(entrySchema, material(id ?? '')),
    enabled: id !== null,
  })
}

export function useVersions(id: string) {
  return useQuery({
    queryKey: [...keys.entry(id), 'versions'],
    queryFn: () => get(versionSchema.array(), `${material(id)}/versions`),
  })
}

export function useRenditions(id: string, versionNo: number, enabled: boolean) {
  return useQuery({
    queryKey: [...keys.entry(id), 'renditions', versionNo],
    queryFn: () => get(renditionSchema.array(), `${material(id)}/versions/${versionNo}/renditions`),
    enabled,
  })
}

export function useHistory(id: string, enabled: boolean) {
  return useQuery({
    queryKey: [...keys.entry(id), 'history'],
    queryFn: () => get(historyEntrySchema.array(), `${material(id)}/history`),
    enabled,
  })
}

export function useReads(id: string, enabled: boolean) {
  return useQuery({
    queryKey: [...keys.entry(id), 'reads'],
    queryFn: () => get(readEventSchema.array(), `${material(id)}/reads`),
    enabled,
  })
}

export function useImpact(id: string, enabled: boolean) {
  return useQuery({
    queryKey: [...keys.entry(id), 'impact'],
    queryFn: () => get(impactSchema, `${material(id)}/impact`),
    enabled,
  })
}

export function useAccount() {
  return useQuery({
    queryKey: [...keys.all, 'account'],
    queryFn: () => get(accountSchema, `${BASE}/account`),
  })
}

export function useExperts(enabled: boolean) {
  return useQuery({
    queryKey: [...keys.all, 'experts'],
    queryFn: () => get(expertSchema.array(), `${BASE}/experts`),
    enabled,
  })
}

export function usePlatformConsents() {
  return useQuery({
    queryKey: [...keys.all, 'platform-consents'],
    queryFn: () => get(platformConsentSchema.array(), `${BASE}/platform-consents`),
  })
}

export function useSubscriptions() {
  return useQuery({
    queryKey: [...keys.all, 'subscriptions'],
    queryFn: () => get(subscriptionSchema.array(), `${BASE}/subscriptions`),
  })
}

// 下载某一版：普通链接，凭会话 Cookie
export function downloadHref(id: string, versionNo: number) {
  return `${material(id)}/versions/${versionNo}/content`
}

// —— 改 ——

function useRefresh() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: keys.all })
}

export function useRecognize(csrfToken: string) {
  return useMutation({
    mutationFn: async (file: File) =>
      parse(
        recognitionSchema,
        await sendFile(
          `${BASE}/recognitions?${new URLSearchParams({ name: file.name })}`,
          file,
          csrfToken,
        ),
      ),
  })
}

export function useUpload(csrfToken: string) {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async ({ file, query }: { file: File; query: URLSearchParams }) =>
      parse(entrySchema, await sendFile(`${BASE}/materials?${query}`, file, csrfToken)),
    onSuccess: refresh,
  })
}

export function useAddVersion(csrfToken: string) {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async ({ id, file, process }: { id: string; file: File; process: boolean }) => {
      const query = new URLSearchParams({ name: file.name })
      if (process) query.set('process', 'true')
      return parse(
        entrySchema,
        await sendFile(`${material(id)}/versions?${query}`, file, csrfToken),
      )
    },
    onSuccess: refresh,
  })
}

export function useLibraryActions(csrfToken: string) {
  const refresh = useRefresh()
  const send = async <T>(
    schema: z.ZodType<T> | null,
    path: string,
    method: string,
    body?: unknown,
  ) => {
    const answer = await requestJson<unknown>(path, { method, body, csrfToken })
    return schema ? parse(schema, answer) : (answer as T)
  }
  const describe = useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) =>
      send(entrySchema, `${material(id)}/description`, 'PUT', body),
    onSuccess: refresh,
  })
  const setLicense = useMutation({
    mutationFn: ({ id, license, attest }: { id: string; license: string; attest: boolean }) =>
      send(entrySchema, `${material(id)}/license`, 'PUT', { license, attest }),
    onSuccess: refresh,
  })
  const show = useMutation({
    mutationFn: ({ id, use }: { id: string; use: string }) =>
      send(useSchema, `${material(id)}/uses`, 'POST', { use }),
    onSuccess: refresh,
  })
  const hide = useMutation({
    mutationFn: ({ id, use }: { id: string; use: string }) =>
      send(null, `${material(id)}/uses?${new URLSearchParams({ use })}`, 'DELETE'),
    onSuccess: refresh,
  })
  const bulk = useMutation({
    mutationFn: ({ ids, use, on }: { ids: string[]; use: string; on: boolean }) =>
      send(null, `${BASE}/uses/bulk`, 'POST', { material_ids: ids, use, on }),
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: ({ id }: { id: string }) => send(null, material(id), 'DELETE'),
    onSuccess: refresh,
  })
  const convert = useMutation({
    mutationFn: ({
      id,
      name,
      license,
      attest,
    }: {
      id: string
      name?: string
      license: string
      attest: boolean
    }) => send(entrySchema, `${material(id)}/convert`, 'POST', { name, license, attest }),
    onSuccess: refresh,
  })
  const process = useMutation({
    mutationFn: ({ id, versionNo }: { id: string; versionNo: number }) =>
      send(useSchema, `${material(id)}/versions/${versionNo}/processing`, 'POST'),
    onSuccess: refresh,
  })
  const acknowledge = useMutation({
    mutationFn: ({ defaultDisplay }: { defaultDisplay: boolean }) =>
      send(accountSchema, `${BASE}/account`, 'PUT', { default_display: defaultDisplay }),
    onSuccess: refresh,
  })
  const withdrawPlatform = useMutation({
    mutationFn: ({ app, kind, ref }: { app: string; kind: string; ref: string }) =>
      send(null, `${BASE}/platform-consents/${seg(app)}/${seg(kind)}/${seg(ref)}`, 'DELETE'),
    onSuccess: refresh,
  })
  const unsubscribe = useMutation({
    mutationFn: ({ id, revision }: { id: string; revision: number }) =>
      send(null, `${BASE}/subscriptions/${seg(id)}/revisions/${revision}`, 'DELETE'),
    onSuccess: refresh,
  })
  return {
    describe,
    setLicense,
    show,
    hide,
    bulk,
    remove,
    convert,
    process,
    acknowledge,
    withdrawPlatform,
    unsubscribe,
  }
}
