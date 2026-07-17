import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Attach JWT to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('tec_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401 — clear token and redirect to login
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('tec_token')
      localStorage.removeItem('tec_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const login = (username, password) =>
  api.post('/login', { username, password })

export const getFilters = type => api.get(`/filters/${type}`)

export const getSales = params => api.get('/sales', { params })

export const getUserPrefs = (tabName) => {
  const user = localStorage.getItem('tec_user') || 'SYSTEM'
  return api.get('/prefs', { params: { tabName, user, t: Date.now() } })
}

export const saveUserPrefs = (tabName, columns) => {
  const user = localStorage.getItem('tec_user') || 'SYSTEM'
  return api.post('/prefs', { tabName, columns, user })
}

export const getMOU = params => api.get('/mou', { params })

// Discount Payable endpoints
export const getDiscountPayable = (params) => api.get('/discount/payable', { params })
export const postDiscountPayable = (data) => api.post('/discount/payable/post', data)
export const getInterestPosted = () => api.get('/interest/posted')
export const getCashDiscount = (params) => api.get('/cash-discount', { params })
export const getCashDiscountPosted = (params) => api.get('/cash-discount-posted', { params })
export const postCashDiscount = (data) => api.post('/cash-discount/post', data)

export default api
