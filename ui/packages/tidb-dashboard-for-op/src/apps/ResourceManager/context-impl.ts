import {
  IResourceManagerDataSource,
  IResourceManagerContext,
  ReqConfig
} from '@pingcap/tidb-dashboard-lib'

import client from '~/client'

class DataSource implements IResourceManagerDataSource {}

export const getResourceManagerContext: () => IResourceManagerContext = () => {
  return {
    ds: new DataSource(),
    cfg: {}
  }
}
