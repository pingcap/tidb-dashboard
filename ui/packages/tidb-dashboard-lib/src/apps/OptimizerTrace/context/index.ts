import { createContext } from 'react'

// import { AxiosPromise } from 'axios'

// import {} from '@lib/client'

// import { ReqConfig } from '@lib/types'

export interface IOptimizerTraceDataSource {}

export interface IOptimizerTraceContext {
  ds: IOptimizerTraceDataSource
}

export const OptimizerTraceContext =
  createContext<IOptimizerTraceContext | null>(null)

export const OptimizerTraceProvider = OptimizerTraceContext.Provider
