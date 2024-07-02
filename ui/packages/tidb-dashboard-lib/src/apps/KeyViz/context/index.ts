import { createContext } from 'react'

import { AxiosPromise } from 'axios'

import { ConfigKeyVisualConfig, MatrixMatrix } from '@lib/client'

import { ReqConfig } from '@lib/types'

export interface IKeyVizDataSource {
  keyvisualConfigGet(options?: ReqConfig): AxiosPromise<ConfigKeyVisualConfig>

  keyvisualConfigPut(
    request: ConfigKeyVisualConfig,
    options?: ReqConfig
  ): AxiosPromise<ConfigKeyVisualConfig>

  keyvisualHeatmapsGet(
    startkey?: string,
    endkey?: string,
    starttime?: number,
    endtime?: number,
    type?:
      | 'written_bytes'
      | 'read_bytes'
      | 'written_keys'
      | 'read_keys'
      | 'integration',
    options?: ReqConfig
  ): AxiosPromise<MatrixMatrix>
}

export interface IKeyVizConfig {
  showHelp?: boolean
  showSetting?: boolean
}

export interface IKeyVizContext {
  ds: IKeyVizDataSource
  cfg?: IKeyVizConfig
}

export const KeyVizContext = createContext<IKeyVizContext | null>(null)

export const KeyVizProvider = KeyVizContext.Provider
