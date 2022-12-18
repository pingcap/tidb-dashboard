import { createContext } from 'react'
import { AxiosPromise } from 'axios'

import { ReqConfig } from '@lib/types'

export interface ISQLAdvisorDataSource {
  sqlAdvisorGet(token: string, options?: ReqConfig): AxiosPromise<void>
}

export interface ISQLAdvisorContext {
  ds: ISQLAdvisorDataSource
}

export const SQLAdvisorContext = createContext<ISQLAdvisorContext | null>(null)

export const SQLAdvisorProvider = SQLAdvisorContext.Provider
