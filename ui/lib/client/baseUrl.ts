import publicPathPrefix from '@lib/utils/publicPathPrefix'

export const API_BASEPATH_PREFIX = (function getApiPathPrefix(): string {
  let apiPrefix
  if (process.env.NODE_ENV === 'development') {
    if (process.env.REACT_APP_DASHBOARD_API_URL) {
      apiPrefix = `${process.env.REACT_APP_DASHBOARD_API_URL}/dashboard`
    } else {
      apiPrefix = 'http://127.0.0.1:12333/dashboard'
    }
  } else {
    apiPrefix = publicPathPrefix
  }

  return apiPrefix
})()

export function getApiBasePath(): string {
  return `${API_BASEPATH_PREFIX}/api`
}

export function getApiOrigin(): string {
  return `${window.location.origin}`
}
