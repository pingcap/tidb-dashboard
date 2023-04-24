import {
  IResourceManagerDataSource,
  IResourceManagerContext,
  ReqConfig
} from '@pingcap/tidb-dashboard-lib'
import { AxiosPromise } from 'axios'

import client, {
  ResourcemanagerCalibrateResponse,
  ResourcemanagerGetConfigResponse,
  ResourcemanagerResourceInfoRowDef
} from '~/client'

class DataSource implements IResourceManagerDataSource {
  getConfig(
    options?: ReqConfig
  ): AxiosPromise<ResourcemanagerGetConfigResponse> {
    return client.getInstance().resourceManagerConfigGet(options)
  }
  getInformation(
    options?: ReqConfig
  ): AxiosPromise<ResourcemanagerResourceInfoRowDef[]> {
    return client.getInstance().resourceManagerInformationGet(options)
  }

  getCalibrateByHardware(
    params: { workload: string },
    options?: ReqConfig | undefined
  ): AxiosPromise<ResourcemanagerCalibrateResponse> {
    return client
      .getInstance()
      .resourceManagerCalibrateHardwareGet(params, options)
  }
  getCalibrateByActual(
    params: { startTime: string; endTime: string },
    options?: ReqConfig | undefined
  ): AxiosPromise<ResourcemanagerCalibrateResponse> {
    return client
      .getInstance()
      .resourceManagerCalibrateActualGet(params, options)
  }
}

export const getResourceManagerContext: () => IResourceManagerContext = () => {
  return {
    ds: new DataSource(),
    cfg: {}
  }
}
