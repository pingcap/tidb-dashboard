import { EventEmitter2 } from 'eventemitter2'

const tokenKey = 'dashboard_auth_token'

export const authEvents = new EventEmitter2()

export const EVENT_TOKEN_CHANGED = 'tokenChanged'

export function getAuthToken() {
  return localStorage.getItem(tokenKey)
}

export function setAuthToken(token) {
  const lastToken = getAuthToken()
  if (lastToken !== token) {
    localStorage.setItem(tokenKey, token)
    authEvents.emit(EVENT_TOKEN_CHANGED, token)
  }
}

export function clearAuthToken() {
  const lastToken = getAuthToken()
  if (lastToken) {
    localStorage.removeItem(tokenKey)
    authEvents.emit(EVENT_TOKEN_CHANGED, null)
  }
}

export function getAuthTokenAsBearer() {
  const token = getAuthToken()
  if (!token) {
    return null
  }
  return `Bearer ${token}`
}

export enum AuthTypes {
  SQLUser = 0,
  SharingCode = 1,
  SSO = 2
}

export default {
  authEvents,
  EVENT_TOKEN_CHANGED,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  getAuthTokenAsBearer,
  AuthTypes
}
