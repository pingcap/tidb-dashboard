import { AxiosRequestConfig } from 'axios'

export interface ReqConfig extends AxiosRequestConfig {
  handleError?: 'default' | 'custom'
}

export interface IContextConfig {
  apiPathBase: string
}
