import { DefaultApi } from './api'

let apiClientInstance: DefaultApi
let basePath: string

function init(instanceBasePath: string, instance: DefaultApi) {
  basePath = instanceBasePath
  apiClientInstance = instance
}

function getInstance(): DefaultApi {
  return apiClientInstance
}

function getBasePath(): string {
  return basePath
}

export default { init, getInstance, getBasePath }

export * from './api'
