import { createContext } from 'react'

import { AxiosPromise } from 'axios'

import {
  ConfigurationEditRequest,
  ConfigurationEditResponse,
  ConfigurationAllConfigItems
} from '@lib/client'

import { ReqConfig } from '@lib/types'

export interface IConfigurationDataSource {
  configurationEdit(
    request: ConfigurationEditRequest,
    options?: ReqConfig
  ): AxiosPromise<ConfigurationEditResponse>

  configurationGetAll(
    options?: ReqConfig
  ): AxiosPromise<ConfigurationAllConfigItems>
}

export interface IConfigurationContext {
  ds: IConfigurationDataSource
}

export const ConfigurationContext = createContext<IConfigurationContext | null>(
  null
)

export const ConfigurationProvider = ConfigurationContext.Provider
