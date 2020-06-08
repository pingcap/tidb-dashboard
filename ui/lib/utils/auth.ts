export const signInRoute = '/signin'

let store: AuthTokenStore

export function setStore(s: AuthTokenStore) {
  store = s
}

export function getAuthToken() {
  return store.getAuthToken()
}

export function getAuthTokenAsBearer() {
  const token = getAuthToken()
  if (!token) {
    return null
  }
  return `Bearer ${token}`
}

export function setAuthToken(token) {
  store.setAuthToken(token)
}

export function clearAuthToken() {
  store.clearAuthToken()
}

//////////////////////////////////////

interface AuthTokenStore {
  getAuthToken: () => string | null
  setAuthToken: (token) => void
  clearAuthToken: () => void
}

export class MemAuthTokenStore implements AuthTokenStore {
  private memAuthToken: string | null = null

  getAuthToken() {
    return this.memAuthToken
  }

  setAuthToken(token) {
    this.memAuthToken = token
  }

  clearAuthToken() {
    this.memAuthToken = null
  }
}

export class LocalStorageAuthTokenStore implements AuthTokenStore {
  private readonly tokenKey = 'dashboard_auth_token'

  getAuthToken() {
    return localStorage.getItem(this.tokenKey)
  }

  setAuthToken(token) {
    localStorage.setItem(this.tokenKey, token)
  }

  clearAuthToken() {
    localStorage.removeItem(this.tokenKey)
  }
}
