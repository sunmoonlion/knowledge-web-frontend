import axios from 'axios'

const request = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? '/api',
  timeout: 15000,
  withCredentials: true, // 携带 cookie（session_id）
})

// 请求拦截
request.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error),
)

// 响应拦截
request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status
    if (status === 401) {
      window.location.href = '/zh-CN/login'
    }
    return Promise.reject(error)
  },
)

export default request
