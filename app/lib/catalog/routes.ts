// knowledge 网页端各页的地址（PRD/apps/knowledge.md 第三节）。页面与功能都从这里取，不自己拼。
function at(locale: string, ...parts: string[]) {
  return `/${[locale, ...parts].map(encodeURIComponent).join('/')}`
}

// 别的应用带过来的 from、ref：在目录里走动时原样带着，「回到原处」才一直在
export type Origin = { from?: string | null; ref?: string | null }

function withQuery(path: string, query: Record<string, string | null | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) if (value) search.set(key, value)
  const text = search.toString()
  return `${path}${text ? `?${text}` : ''}`
}

export const routes = {
  // 数据目录。可带搜索的词
  catalog: (locale: string, query: Origin & { q?: string | null } = {}) =>
    withQuery(at(locale, 'catalog'), { q: query.q, from: query.from, ref: query.ref }),
  dataset: (locale: string, dataset: string, query: Origin = {}) =>
    withQuery(at(locale, 'catalog', dataset), { from: query.from, ref: query.ref }),
}
