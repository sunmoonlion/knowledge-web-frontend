// 通用 API 响应结构
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

// 分页
export interface Pagination {
  page: number
  pageSize: number
  total: number
}

export interface PageResult<T> {
  list: T[]
  pagination: Pagination
}
