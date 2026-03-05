import {
  ITopSQLDataSource,
  ITopSQLContext,
  ITopSQLConfig,
  TopsqlTikvNetworkIoCollectionConfig,
  TopsqlTikvNetworkIoCollectionUpdateResponse,
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

<<<<<<< HEAD
  topsqlInstancesGet(end?: string, start?: string, options?: ReqConfig) {
    return client.getInstance().topsqlInstancesGet({ start, end }, options)
=======
  topsqlTikvNetworkIoCollectionGet(options?: ReqConfig) {
    // Cloud TopSQL does not expose TiKV multi-dimensional collection settings.
    // Return a fixed disabled state to keep interface compatibility.
    return Promise.resolve({
      data: {
        enable: false,
        is_multi_value: false
      } as TopsqlTikvNetworkIoCollectionConfig
    } as any)
  }

  topsqlTikvNetworkIoCollectionPost(
    request: TopsqlTikvNetworkIoCollectionConfig,
    options?: ReqConfig
  ) {
    // Cloud TopSQL does not expose TiKV multi-dimensional collection settings.
    // Keep no-op behavior for compatibility if called unexpectedly.
    return Promise.resolve({
      data: {
        warnings: []
      } as TopsqlTikvNetworkIoCollectionUpdateResponse
    } as any)
  }

  topsqlInstancesGet(
    end?: string,
    start?: string,
    dataSource?: string,
    options?: ReqConfig
  ) {
    const requestParameters: any = { start, end }
    if (dataSource !== undefined) {
      requestParameters.dataSource = dataSource
    }
    return client.getInstance().topsqlInstancesGet(requestParameters, options)
>>>>>>> 70e5bb19e (TopSQL(OP): support TiKV multi-dimensional collection controls and partial-state UX (#1868))
  }

  topsqlSummaryGet(
    end?: string,
    groupBy?: string,
    instance?: string,
    instanceType?: string,
    start?: string,
    top?: string,
    window?: string,
    options?: ReqConfig
  ) {
    return client.getInstance().topsqlSummaryGet(
      {
        end,
        groupBy,
        instance,
        instanceType,
        start,
        top,
        window
      },
      options
    )
  }
}

const ds = new DataSource()

export const ctx: (cfg: Partial<ITopSQLConfig>) => ITopSQLContext = (cfg) => ({
  ds,
  cfg: {
    checkNgm: true,
    showSetting: true,
    ...cfg
  }
})
