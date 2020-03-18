import { DefaultApi } from './api'

let apiClientInstance: DefaultApi

function setInstance(instance: DefaultApi) {
  apiClientInstance = instance
}

function getInstance(): DefaultApi {
  return apiClientInstance
}

export default { setInstance, getInstance }

export * from './api'
