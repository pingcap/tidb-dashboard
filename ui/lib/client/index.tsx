import React from 'react'
import i18next from 'i18next'
import axios, { AxiosInstance } from 'axios'
import { message, Modal, notification } from 'antd'
import * as singleSpa from 'single-spa'

import * as auth from '@lib/utils/auth'
import * as routing from '@lib/utils/routing'
import * as i18n from '@lib/utils/i18n'
import { reportError } from '@lib/utils/sentryHelpers'

import { DefaultApi } from './api'
import { getApiBasePath } from './baseUrl'

export * from './api'

//////////////////////////////

let basePath: string
let apiClientInstance: DefaultApi
let rawAxiosInstance: AxiosInstance

function save(
  instanceBasePath: string,
  instance: DefaultApi,
  axiosInstace: AxiosInstance
) {
  basePath = instanceBasePath
  apiClientInstance = instance
  rawAxiosInstance = axiosInstace
}

function getInstance(): DefaultApi {
  return apiClientInstance
}

function getBasePath(): string {
  return basePath
}

function getAxiosInstance(): AxiosInstance {
  return rawAxiosInstance
}

export default { getInstance, getBasePath, getAxiosInstance }

//////////////////////////////

export enum ErrorStrategy {
  Default = 'default',
  Custom = 'custom',
}

const ERR_CODE_OTHER = 'error.api.other'

function applyErrorHandlerInterceptor(instance: AxiosInstance) {
  instance.interceptors.response.use(undefined, async function (err) {
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

    reportError(err)
    return Promise.reject(err)
  })
}

function initAxios() {
  i18n.addTranslations(require.context('./translations/', false, /\.yaml$/))

  const instance = axios.create()
  applyErrorHandlerInterceptor(instance)

  return instance
}

function init() {
  const basePath = getApiBasePath()
  const axiosInstance = initAxios()
  const dashboardClient = new DefaultApi(
    {
      basePath,
      apiKey: () => auth.getAuthTokenAsBearer() || '',
      baseOptions: {
        errorStrategy: ErrorStrategy.Default,
      },
    },
    undefined,
    axiosInstance
  )

  save(basePath, dashboardClient, axiosInstance)
}

init()
