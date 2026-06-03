import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

// Attach JWT token only if not already set
api.interceptors.request.use(config => {
  if (!config.headers.Authorization) {
    const token = localStorage.getItem('devol_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 errors — only redirect if we actually had a token and are not already on a public page
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      const hadToken = !!localStorage.getItem('devol_token')
      if (hadToken) {
        localStorage.removeItem('devol_token')
        const publicPaths = ['/', '/admin']
        if (!publicPaths.includes(window.location.pathname)) {
          window.location.href = '/'
        }
      }
    }
    return Promise.reject(err)
  }
)

export default api
