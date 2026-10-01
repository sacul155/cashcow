const API_URL = import.meta.env.VITE_API_URL
const TOKEN_KEY = 'cashcow_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

// The auth context registers a function here to run when the server rejects our token
let onUnauthorized = () => {}
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export async function apiFetch(path, { skipAuth = false, headers: extraHeaders, ...options } = {}) {
  const token = skipAuth ? null : getToken()
  const headers = { 'Content-Type': 'application/json', ...extraHeaders }
  if (token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers })
  } catch {
    throw new ApiError(0, 'Cannot reach the server')
  }

  // A token was sent but rejected: it has expired or is invalid, so log out
  if (response.status === 401 && token) onUnauthorized()

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    // FastAPI sends a string for most errors, but a list for validation errors (422)
    const detail = Array.isArray(body?.detail) ? body.detail[0].msg : body?.detail
    throw new ApiError(response.status, detail || 'Request failed')
  }
  return response.json()
}