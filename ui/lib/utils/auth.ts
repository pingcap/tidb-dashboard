export const signInRoute = '/signin'
export const dashoardTokenKey = 'dashboard_auth_token'
export const portalTokenKey = 'portal_auth_token'

let tokenKey = dashoardTokenKey

export function setTokenKey(tk) {
  tokenKey = tk
}

export function getAuthToken() {
  return localStorage.getItem(tokenKey)
}

export function setAuthToken(token) {
  localStorage.setItem(tokenKey, token)
}

export function clearAuthToken() {
  localStorage.removeItem(tokenKey)
}

export function getAuthTokenAsBearer() {
  const token = getAuthToken()
  if (!token) {
    return null
  }
  return `Bearer ${token}`
}
