import axios, { AxiosRequestConfig } from "axios"

declare module "axios" {
  interface AxiosRequestConfig {
    skipGlobalErrorHandling?: boolean
  }
}

const DEFAULT_TIMEOUT = 30 * 1000
export const axiosClient = axios.create({
  baseURL: "",
  timeout: DEFAULT_TIMEOUT,
})

/**
 * Add a second `options` argument to
 * pass extra options to each generated query
 */
export const httpClient = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  const promise = axiosClient({
    ...config,
    ...options,
  }).then(({ data }) => data)

  return promise
}
