import React from 'react'
import i18next from 'i18next'
import axios from 'axios'
import { message, notification } from 'antd'
import * as singleSpa from 'single-spa'

import * as auth from '@lib/utils/auth'
import * as routing from '@lib/utils/routing'
import publicPathPrefix from '@lib/utils/publicPathPrefix'

import { DefaultApi } from './api'

export * from './api'

//////////////////////////////

let basePath: string
let apiClientInstance: DefaultApi

function save(instanceBasePath: string, instance: DefaultApi) {
  basePath = instanceBasePath
  apiClientInstance = instance
}

function getInstance(): DefaultApi {
  return apiClientInstance
}

function getBasePath(): string {
  return basePath
}

export default { getInstance, getBasePath }

//////////////////////////////

export type HandleErrorWay = 'notification' | 'message' | 'custom'

function initAxios() {
  const instance = axios.create()

  instance.interceptors.response.use(undefined, function (err) {
    const { response, config } = err
    const handleErrorWay = config.handleErrorWay as HandleErrorWay

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
    } else if (handleErrorWay !== 'custom') {
      const fullUrl = config.url as string
      const API = fullUrl.replace(getBasePath(), '').split('?')[0]
      const errCode = response?.data?.code || 'error.message.unknown'
      const content = i18next.t(errCode)

      if (handleErrorWay === 'notification') {
        notification.error({
          key: API,
          message: i18next.t('error.message.title'),
          description: (
            <span>
              API: {API}
              <br />
              {content}
            </span>
          ),
        })
      } else if (handleErrorWay === 'message') {
        message.error({ key: API, content })
      }
      err.handled = true
    }
    return Promise.reject(err)
  })

  return instance
}

function init() {
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

  const dashboardClient = new DefaultApi(
    {
      basePath: apiUrl,
      apiKey: () => auth.getAuthTokenAsBearer() || '',
      baseOptions: {
        handleErrorWay: 'notification' as HandleErrorWay,
      },
    },
    undefined,
    initAxios()
  )

  save(apiUrl, dashboardClient)
}

init()
