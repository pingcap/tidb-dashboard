import {
  ITopSQLDataSource,
  ITopSQLContext,
  ITopSQLConfig,
  ReqConfig
} from '@pingcap/tidb-dashboard-lib'

import client, { TopsqlEditableConfig } from '~/client'

type TikvNetworkIoCollectionConfig = {
  enable: boolean
  is_multi_value?: boolean
}

type TikvNetworkIoCollectionUpdateResponse = {
  warnings: any[]
}

class DataSource implements ITopSQLDataSource {
  topsqlConfigGet(options?: ReqConfig) {
    return client.getInstance().topsqlConfigGet(options)
  }

  topsqlConfigPost(request: TopsqlEditableConfig, options?: ReqConfig) {
    return client.getInstance().topsqlConfigPost({ request }, options)
  }

  topsqlTikvNetworkIoCollectionGet(options?: ReqConfig) {
    return client
      .getAxiosInstance()
      .get<TikvNetworkIoCollectionConfig>(
        '/topsql/tikv_network_io_collection',
        options as any
      )
  }

  topsqlTikvNetworkIoCollectionPost(
    request: TikvNetworkIoCollectionConfig,
    options?: ReqConfig
  ) {
    return client
      .getAxiosInstance()
      .post<TikvNetworkIoCollectionUpdateResponse>(
        '/topsql/tikv_network_io_collection',
        request,
        options as any
      )
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

export const ctx: (cfg: Partial<ITopSQLConfig>) => ITopSQLContext = (cfg) => ({
  ds,
  cfg: {
    checkNgm: true,
    showSetting: true,
    ...cfg
  }
})
