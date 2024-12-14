import axios, { AxiosError, AxiosRequestConfig } from "axios"

declare module "axios" {
  interface AxiosRequestConfig {
    skipGlobalErrorHandling?: boolean
  }
}

const DEFAULT_TIMEOUT = 30 * 1000
const axiosClient = axios.create({
  baseURL: "",
  timeout: DEFAULT_TIMEOUT,
})

function handleResponseError(error: AxiosError) {
  // TODO:
  return Promise.reject(error)
}

axiosClient.interceptors.response.use(
  (response) => response,
  handleResponseError,
)

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
