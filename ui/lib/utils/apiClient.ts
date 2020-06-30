import i18next from 'i18next'
import axios from 'axios'
import { message } from 'antd'
import * as singleSpa from 'single-spa'
import DashboardClient, { DefaultApi } from '@lib/client'
import * as auth from '@lib/utils/auth'
import * as routing from '@lib/utils/routing'
import publicPathPrefix from '@lib/utils/publicPathPrefix'

function initAxios() {
  const instance = axios.create()

  instance.interceptors.response.use(undefined, function (err) {
    const { response } = err
    // Handle unauthorized error in a unified way
    if (
      response &&
      response.data &&
      response.data.code === 'error.api.unauthorized'
    ) {
      if (!routing.isLocationMatch('/') && !routing.isSignInPage()) {
        message.error(i18next.t('error.message.unauthorized'))
      }
      auth.clearAuthToken()
      singleSpa.navigateToUrl('#' + routing.signInRoute)
      err.handled = true
    } else if (err.message === 'Network Error') {
      const content = i18next.t('error.message.network')
      message.error({ content, key: 'network_error' }) // use the same key to avoid multiple message boxes
      err.handled = true
      err.msg = content // use `err.message = content` doesn't work
    }
    return Promise.reject(err)
  })

  return instance
}

export function init() {
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
  const apiUrl = `${apiPrefix}/api`

  console.log('API BasePath: %s', apiUrl)

  const dashboardClient = new DefaultApi(
    {
      basePath: apiUrl,
      apiKey: () => auth.getAuthTokenAsBearer() || '',
    },
    undefined,
    initAxios()
  )

  DashboardClient.init(apiUrl, dashboardClient)
}
