import { AxiosRequestConfig } from 'axios'

// enum ErrorStrategy {
//   Default = 'default',
//   Custom = 'custom'
// }

export interface ReqConfig extends AxiosRequestConfig {
  // errorStrategy?: string
  handleError?: 'default' | 'custom'
}
