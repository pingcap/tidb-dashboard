import { DefaultApi } from './api'
import { message } from 'antd'

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

export async function reqWithErrPrompt<T>(
  req: Promise<T>,
  msg: string
): Promise<T | null> {
  try {
    return await req
  } catch (error) {
    console.log(error)
    if (msg) {
      message.error(msg)
    }
    return null
  }
}

export default { init, getInstance, getBasePath }

export * from './api'
