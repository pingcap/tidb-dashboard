import { createContext } from 'react'
import { TuningDetailProps, TuningTaskStatus } from '../types/'

export interface ISQLAdvisorDataSource {
  tuningListGet(type?: string): Promise<TuningDetailProps[]>

  tuningTaskStatusGet(): Promise<TuningTaskStatus>

  tuningTaskCreate(startTime: number, endTime: number): Promise<any>

  tuningDetailGet(id: number): Promise<TuningDetailProps>

  registerUserDB?(params: { userName: string; password: string }): Promise<any>

  unRegisterUserDB?(): Promise<any>

  registerUserDBStatusGet?(): Promise<any>

  sqlValidationGet?(): Promise<any>
}

export interface ISQLAdvisorContext {
  ds: ISQLAdvisorDataSource
  orgId?: string
  clusterId?: string
  registerUserDB?: boolean
}

export const SQLAdvisorContext = createContext<ISQLAdvisorContext | null>(null)

export const SQLAdvisorProvider = SQLAdvisorContext.Provider
