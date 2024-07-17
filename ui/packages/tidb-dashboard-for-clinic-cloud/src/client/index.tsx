import React from 'react'
import i18next from 'i18next'
import axios, { AxiosInstance } from 'axios'
import { message, Modal, notification } from 'antd'

import { routing, i18n } from '@pingcap/tidb-dashboard-lib'
import {
  Configuration,
  DefaultApi as DashboardApi
} from '@pingcap/tidb-dashboard-client'

import { ClientOptions, ClusterInfo } from '~/utils/globalConfig'

import translations from './translations'

export * from '@pingcap/tidb-dashboard-client'

//////////////////////////////

const client = {
  init(
    apiBasePath: string,
    apiInstance: DashboardApi,
    axiosInstance: AxiosInstance
  ) {
    this.apiBasePath = apiBasePath
    this.apiInstance = apiInstance
    this.axiosInstance = axiosInstance
  },

  getInstance(): DashboardApi {
    return this.apiInstance
  },

  getBasePath(): string {
    return this.apiBasePath
  },

  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance
  }
}

export default client

//////////////////////////////

type HandleError = 'default' | 'custom'

function applyErrorHandlerInterceptor(instance: AxiosInstance) {
  instance.interceptors.response.use(undefined, async function (err) {
    const { response, config } = err
    const handleError = config.handleError as HandleError
    const method = (config.method as string).toLowerCase()

    let errCode: string
    let content: string
    if (err.message === 'Network Error') {
      errCode = 'common.network'
    } else {
      errCode = response?.data?.code
    }
    if (i18next.exists(`error.${errCode ?? ''}`)) {
      // If there is a translation for the code, use the translation.
      // TODO: Better to display error details somewhere.
      content = i18next.t(`error.${errCode}`)
    } else {
      content = String(
        response?.data?.message || err.message || 'Internal error'
      )
    }
    err.message = content
    err.errCode = errCode

    if (errCode === 'common.unauthenticated' || response?.status === 401) {
      // Handle unauthorized error in a unified way
      if (!routing.isLocationMatch('/') && !routing.isSignInPage()) {
        message.error({ content, key: errCode ?? '401' })
      }
      // Remember the current url before redirecting to login page,
      // to support redirect back after login.
      localStorage.setItem('clinic.login.from', window.location.href)
      setTimeout(() => {
        window.location.href = window.location.origin
      }, 2000)
      err.handled = true
    } else if (handleError === 'default') {
      if (method === 'get') {
        const fullUrl = config.url as string
        const API = fullUrl.replace(client.getBasePath(), '').split('?')[0]
        notification.error({
          key: API,
          message: i18next.t('error.title'),
          description: (
            <span>
              API: {API}
              <br />
              {content}
            </span>
          )
        })
      } else if (['post', 'put', 'delete', 'patch'].includes(method)) {
        Modal.error({
          title: i18next.t('error.title'),
          content: content,
          zIndex: 2000 // higher than popover
        })
      }
      err.handled = true
    }

    return Promise.reject(err)
  })
}

function initAxios(clientOptions: ClientOptions, clusterInfo: ClusterInfo) {
  const { apiToken } = clientOptions
  const { provider, region, orgId, projectId, clusterId, deployType, env } =
    clusterInfo

  let headers = {}
  // for clinic
  headers['x-csrf-token'] = apiToken

  // for tidb cloud
  // headers['authorization'] = `Bearer ${apiToken}`

  if (provider) {
    headers['x-provider'] = provider
  }
  if (region) {
    headers['x-region'] = region
  }
  if (orgId) {
    headers['x-org-id'] = orgId
  }
  if (projectId) {
    headers['x-project-id'] = projectId
  }
  if (clusterId) {
    headers['x-cluster-id'] = clusterId
  }
  if (deployType) {
    headers['x-deploy-type'] = deployType
  }
  if (env) {
    headers['x-env'] = env
  }
  const instance = axios.create({
    baseURL: clientOptions.apiPathBase,
    headers
  })
  applyErrorHandlerInterceptor(instance)

  return instance
}

export function setupClient(
  clientOptions: ClientOptions,
  clusterInfo: ClusterInfo
) {
  i18n.addTranslations(translations)

  const axiosInstance = initAxios(clientOptions, clusterInfo)
  const dashboardApi = new DashboardApi(
    new Configuration({
      baseOptions: {
        handleError: 'default'
      }
    }),
    // basePath, it's set in the axiosInstance, so we pass empty string to dashboard Api
    // if basePath and baseURL are both relative path
    // the final api path will be the value that combined by dashboardApi basePath and axiosInstance baseURL
    // if we use undefined for this param, dashboardApi basePath will be the default value `/dashboard/api`
    '',
    axiosInstance
  )

  client.init(clientOptions.apiPathBase, dashboardApi, axiosInstance)
}
