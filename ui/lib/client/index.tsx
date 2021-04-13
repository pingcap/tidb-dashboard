import React from 'react'
import i18next from 'i18next'
import axios from 'axios'
import { message, Modal, notification } from 'antd'
import * as singleSpa from 'single-spa'

import * as auth from '@lib/utils/auth'
import * as routing from '@lib/utils/routing'
import * as i18n from '@lib/utils/i18n'
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

export enum ErrorStrategy {
  Default = 'default',
  Custom = 'custom',
}
const ERR_CODE_OTHER = 'error.api.other'

function initAxios() {
  i18n.addTranslations(require.context('./translations/', false, /\.yaml$/))

  const instance = axios.create()
  instance.interceptors.response.use(undefined, function (err) {
    const { response, config } = err
    const errorStrategy = config.errorStrategy as ErrorStrategy
    const method = (config.method as string).toLowerCase()

    let errCode: string
    let content: string
    if (err.message === 'Network Error') {
      errCode = 'error.network'
    } else {
      errCode = response?.data?.code
    }
    if (errCode !== ERR_CODE_OTHER && i18next.exists(errCode)) {
      content = i18next.t(errCode)
    } else {
      content =
        response?.data?.message || err.message || i18next.t(ERR_CODE_OTHER)
    }
    err.message = content

    if (errCode === 'error.api.unauthorized') {
      // Handle unauthorized error in a unified way
      if (!routing.isLocationMatch('/') && !routing.isSignInPage()) {
        message.error({ content, key: errCode })
      }
      auth.clearAuthToken()
      singleSpa.navigateToUrl('#' + routing.signInRoute)
      err.handled = true
    } else if (errorStrategy === ErrorStrategy.Default) {
      if (method === 'get') {
        const fullUrl = config.url as string
        const API = fullUrl.replace(getBasePath(), '').split('?')[0]
        notification.error({
          key: API,
          message: i18next.t('error.title'),
          description: (
            <span>
              API: {API}
              <br />
              {content}
            </span>
          ),
        })
      } else if (['post', 'put', 'delete', 'patch'].includes(method)) {
        Modal.error({
          title: i18next.t('error.title'),
          content: content,
          zIndex: 2000, // higher than popover
        })
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
        errorStrategy: ErrorStrategy.Default,
      },
    },
    undefined,
    initAxios()
  )

  save(apiUrl, dashboardClient)
}

init()

export function download(token: string) {
  window.location.href = `${basePath}/files/${token}`
}
