import * as DashboardClient from '@/utils/dashboard_client'
import _ from 'lodash'

let globalOpt = {}
let globalSingleton = null

setGlobalByOptions({})

export function getGlobal() {
  return globalSingleton
}

export function getGlobalOptions() {
  return globalOpt
}

export function setGlobalByOptions(opt) {
  const options = opt || {}
  _.defaults(options, {
    basePath: '/dashboard/api',
  })
  globalOpt = options
  globalSingleton = new DashboardClient.DefaultApi(options)
}
