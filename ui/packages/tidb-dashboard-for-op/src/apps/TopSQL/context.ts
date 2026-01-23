import {
  ITopSQLDataSource,
  ITopSQLContext,
  ITopSQLConfig,
  ReqConfig
} from '@pingcap/tidb-dashboard-lib'

import client, { TopsqlEditableConfig } from '~/client'

class DataSource implements ITopSQLDataSource {
  topsqlConfigGet(options?: ReqConfig) {
    return client.getInstance().topsqlConfigGet(options)
  }

  topsqlConfigPost(request: TopsqlEditableConfig, options?: ReqConfig) {
    return client.getInstance().topsqlConfigPost({ request }, options)
  }

  topsqlInstancesGet(end?: string, start?: string, options?: ReqConfig) {
    return client.getInstance().topsqlInstancesGet({ start, end }, options)
  }

  topsqlSummaryGet(
    end?: string,
    groupBy?: string,
    instance?: string,
    instanceType?: string,
    orderBy?: string,
    start?: string,
    top?: string,
    window?: string,
    dataSource?: string,
    options?: ReqConfig
  ) {
    return client.getInstance().topsqlSummaryGet(
      {
        end,
        groupBy,
        instance,
        instanceType,
        orderBy,
        start,
        top,
        window,
        dataSource
      },
      options
    )
  }
}

const ds = new DataSource()

export const ctx: ITopSQLContext = {
  ds,
  cfg: {
    checkNgm: true,
    showSetting: true,
    showLimit: true,
    showGroupBy: true
  } as ITopSQLConfig
}
