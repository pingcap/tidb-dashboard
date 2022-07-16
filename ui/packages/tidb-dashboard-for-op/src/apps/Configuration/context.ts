import {
  IConfigurationDataSource,
  IConfigurationContext,
  ReqConfig
} from '@pingcap/tidb-dashboard-lib'

import client, { ConfigurationEditRequest } from '~/client'

class DataSource implements IConfigurationDataSource {
  configurationEdit(request: ConfigurationEditRequest, options?: ReqConfig) {
    return client.getInstance().configurationEdit({ request }, options)
  }

  configurationGetAll(options?: ReqConfig) {
    return client.getInstance().configurationGetAll(options)
  }
}

const ds = new DataSource()

export const ctx: IConfigurationContext = {
  ds
}
