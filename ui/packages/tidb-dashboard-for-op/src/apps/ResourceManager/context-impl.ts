import {
  IResourceManagerDataSource,
  IResourceManagerContext,
  ReqConfig
} from '@pingcap/tidb-dashboard-lib'
import { AxiosPromise } from 'axios'

import client, {
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
}

export const getResourceManagerContext: () => IResourceManagerContext = () => {
  return {
    ds: new DataSource(),
    cfg: {}
  }
}
