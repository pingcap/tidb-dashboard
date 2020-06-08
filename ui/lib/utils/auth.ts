const tokenKey = 'dashboard_auth_token'
let memAuthToken = ''

export const signInRoute = '/signin'

// FIXME: use strategy design mode
export function getAuthToken() {
  return localStorage.getItem(tokenKey) || memAuthToken
}

export function getAuthTokenAsBearer() {
  const token = getAuthToken()
  if (!token) {
    return null
  }
  return `Bearer ${token}`
}

// FIXME: use strategy design mode
export function setMemAuthToken(token) {
  memAuthToken = token
}

export function setAuthToken(token) {
  localStorage.setItem(tokenKey, token)
}

export function clearAuthToken() {
  memAuthToken = ''
  localStorage.removeItem(tokenKey)
}
