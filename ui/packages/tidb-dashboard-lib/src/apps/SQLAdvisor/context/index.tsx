import { createContext } from 'react'
import {
  TuningDetailProps,
  SQLTunedListProps,
  PerfInsightTask
} from '../types/'

export interface ISQLAdvisorDataSource {
  tuningListGet(
    pageNumber?: number,
    pageSize?: number
  ): Promise<SQLTunedListProps>

  tuningDetailGet(id: number): Promise<TuningDetailProps>

  tuningLatestGet(): Promise<PerfInsightTask>

  tuningTaskCreate(startTime: number, endTime: number): Promise<any>

  tuningTaskCancel(id: number): Promise<any>

  activateDBConnection(params: {
    userName: string
    password: string
  }): Promise<any>

  deactivateDBConnection(): Promise<any>

  checkDBConnection(): Promise<any>
}

export interface ISQLAdvisorContext {
  ds: ISQLAdvisorDataSource
  orgId?: string
  clusterId?: string
  registerUserDB?: boolean
}

export const SQLAdvisorContext = createContext<ISQLAdvisorContext | null>(null)

export const SQLAdvisorProvider = SQLAdvisorContext.Provider
