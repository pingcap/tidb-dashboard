import {
  ISlowQueryDataSource,
  ISlowQueryContext
} from '@pingcap/tidb-dashboard-lib'

import { AxiosRequestConfig } from 'axios'
import client from '~/client'

class DataSource implements ISlowQueryDataSource {
  infoListDatabases(options?: any) {
    return client.getInstance().infoListDatabases(options)
  }

  slowQueryAvailableFieldsGet(options?: any) {
    return client.getInstance().slowQueryAvailableFieldsGet(options)
  }

  slowQueryListGet(
    beginTime?: number,
    db?: Array<string>,
    desc?: boolean,
    digest?: string,
    endTime?: number,
    fields?: string,
    limit?: number,
    orderBy?: string,
    plans?: Array<string>,
    text?: string,
    options?: AxiosRequestConfig
  ) {
    return client.getInstance().slowQueryListGet(
      {
        beginTime,
        db,
        desc,
        digest,
        endTime,
        fields,
        limit,
        orderBy,
        plans,
        text
      },
      options
    )
  }

  slowQueryDetailGet(
    connectId?: string,
    digest?: string,
    timestamp?: number,
    options?: AxiosRequestConfig
  ) {
    return client.getInstance().slowQueryDetailGet(
      {
        connectId,
        digest,
        timestamp
      },
      options
    )
  }

  slowQueryDownloadTokenPost(request: any, options?: AxiosRequestConfig) {
    return client.getInstance().slowQueryDownloadTokenPost({ request }, options)
  }
}

const slowQueryDS = new DataSource()

export const ctx: ISlowQueryContext = {
  ds: slowQueryDS,
  config: { basePath: client.getBasePath() }
}
