// 数据目录接口的收发。同源 /api/web/v1；浏览器会话 cookie；只有读；答复一律过 zod。
import { z } from 'zod'

export class CatalogError extends Error {
  constructor(
    public readonly code: 'not_found' | 'too_many' | 'backend_unavailable' | 'contract_invalid',
    public readonly status?: number,
    options?: { cause?: unknown },
  ) {
    super(code)
    this.name = 'CatalogError'
    if (options?.cause !== undefined) this.cause = options.cause
  }
}

type Fetch = typeof fetch

export async function getJson<T>(schema: z.ZodType<T>, path: string, fetchImpl: Fetch = fetch) {
  if (!path.startsWith('/api/web/v1/')) throw new Error('knowledge web path expected')
  let response: Response
  try {
    response = await fetchImpl(path, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'manual',
      headers: { Accept: 'application/json', 'X-Correlation-Id': crypto.randomUUID() },
    })
  } catch (error) {
    throw new CatalogError('backend_unavailable', undefined, { cause: error })
  }
  if (!response.ok || response.type === 'opaqueredirect') {
    throw new CatalogError(
      response.status === 404
        ? 'not_found'
        : response.status === 429
          ? 'too_many'
          : 'backend_unavailable',
      response.status,
    )
  }
  const parsed = schema.safeParse(await response.json().catch(() => null))
  if (!parsed.success) {
    throw new CatalogError('contract_invalid', response.status, { cause: parsed.error })
  }
  return parsed.data
}

export function seg(value: string) {
  return encodeURIComponent(value)
}
