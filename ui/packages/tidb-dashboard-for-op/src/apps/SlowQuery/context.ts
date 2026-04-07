import {
  IMaterializedViewRefreshHistoryRequest,
  ISlowQueryDataSource,
  ISlowQueryContext,
  ReqConfig
} from '@pingcap/tidb-dashboard-lib'

import client from '~/client'

class DataSource implements ISlowQueryDataSource {
  slowQueryMaterializedViewRefreshHistoryGet(
    request: IMaterializedViewRefreshHistoryRequest,
    options?: ReqConfig
  ) {
    const searchParams = new URLSearchParams()
    searchParams.set('begin_time', String(request.begin_time))
    searchParams.set('end_time', String(request.end_time))
    searchParams.set('schema', request.schema)
    if (request.materialized_view) {
      searchParams.set('materialized_view', request.materialized_view)
    }
    request.status?.forEach((status) => {
      searchParams.append('status', status)
    })
    if (request.min_duration !== undefined) {
      searchParams.set('min_duration', String(request.min_duration))
    }
    if (request.page !== undefined) {
      searchParams.set('page', String(request.page))
    }
    if (request.page_size !== undefined) {
      searchParams.set('page_size', String(request.page_size))
    }
    if (request.orderBy) {
      searchParams.set('orderBy', request.orderBy)
    }
    if (request.desc !== undefined) {
      searchParams.set('desc', String(request.desc))
    }

    return client
      .getAxiosInstance()
      .get(`/materialized_view/list?${searchParams.toString()}`, {
        handleError: 'default',
        ...options
      })
  }

  getDatabaseList(beginTime: number, endTime: number, options?: ReqConfig) {
    return client.getInstance().infoListDatabases(options)
  }

  infoListResourceGroupNames(options?: ReqConfig) {
    return client.getInstance().resourceManagerInformationGroupNamesGet(options)
  }

  slowQueryAvailableFieldsGet(options?: ReqConfig) {
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
    resourceGroup?: Array<string>,
    text?: string,
    showInternal?: boolean,
    options?: ReqConfig
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
        resourceGroup,
        text
      },
      options
    )
  }

  slowQueryDetailGet(
    connectId?: string,
    digest?: string,
    timestamp?: number,
    options?: ReqConfig
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

  slowQueryDownloadTokenPost(request: any, options?: ReqConfig) {
    return client.getInstance().slowQueryDownloadTokenPost({ request }, options)
  }
}

const ds = new DataSource()

export const ctx: ISlowQueryContext = {
  ds,
  cfg: {
    apiPathBase: client.getBasePath(),
    enableExport: true,
    showDBFilter: true,
    showDigestFilter: false,
    showResourceGroupFilter: true,
    showMaterializedView: true
    // instantQuery: false,
    // timeRangeSelector: {
    //   recentSeconds: [3 * 24 * 60 * 60],
    //   customAbsoluteRangePicker: true
    // }
  }
}
