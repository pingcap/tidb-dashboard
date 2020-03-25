const tokenKey = 'dashboard_auth_token'

export const signInRoute = '/signin'

export function getAuthToken() {
  return localStorage.getItem(tokenKey)
}

export function getAuthTokenAsBearer() {
  const token = getAuthToken()
  if (!token) {
    return null
  }
  return `Bearer ${token}`
}

export function setAuthToken(token) {
  localStorage.setItem(tokenKey, token)
}

export function clearAuthToken() {
  localStorage.removeItem(tokenKey)
}
