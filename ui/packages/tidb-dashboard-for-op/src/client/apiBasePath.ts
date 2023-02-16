import publicPathPrefix from '~/utils/publicPathPrefix'

export const API_HOST = (function () {
  let apiPrefix
  if (process.env.NODE_ENV === 'development') {
    if (process.env.REACT_APP_DASHBOARD_API_URL) {
      apiPrefix = `${process.env.REACT_APP_DASHBOARD_API_URL}/dashboard`
    } else {
      apiPrefix = `http://${window.location.hostname}:12333/dashboard`
    }
  } else {
    apiPrefix = publicPathPrefix
  }

  return apiPrefix
})()

export function getApiBasePath(): string {
  return `${API_HOST}/api`
}
