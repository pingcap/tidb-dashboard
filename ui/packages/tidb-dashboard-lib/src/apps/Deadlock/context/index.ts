import { createContext } from 'react'
import { AxiosPromise } from 'axios'

import { DeadlockModel } from '@lib/client'
import { ReqConfig } from '@lib/types'

export interface IDeadlockDataSource {
  deadlockListGet(options?: ReqConfig): AxiosPromise<Array<DeadlockModel>>
}

export interface IDeadlockContext {
  ds: IDeadlockDataSource
}

export const DeadlockContext = createContext<IDeadlockContext | null>(null)

export const DeadlockProvider = DeadlockContext.Provider
