import {
  IMaterializedViewContext,
  IMaterializedViewDataSource,
  IMaterializedViewRefreshHistoryRequest,
  ReqConfig
} from '@pingcap/tidb-dashboard-lib'

import client from '~/client'

class DataSource implements IMaterializedViewDataSource {
  getDatabaseList(options?: ReqConfig) {
    return client.getInstance().infoListDatabases(options)
  }

  materializedViewRefreshHistoryGet(
    request: IMaterializedViewRefreshHistoryRequest,
    options?: ReqConfig
  ) {
    const params = new URLSearchParams()

    params.set('begin_time', String(request.begin_time))
    params.set('end_time', String(request.end_time))

    request.schema?.forEach((schema) => params.append('schema', schema))
    if (request.materialized_view) {
      params.set('materialized_view', request.materialized_view)
    }
    request.status?.forEach((status) => params.append('status', status))
    if (request.min_duration !== undefined) {
      params.set('min_duration', String(request.min_duration))
    }
    if (request.page !== undefined) {
      params.set('page', String(request.page))
    }
    if (request.page_size !== undefined) {
      params.set('page_size', String(request.page_size))
    }
    if (request.orderBy) {
      params.set('orderBy', request.orderBy)
    }
    if (request.desc !== undefined) {
      params.set('desc', String(request.desc))
    }

    return client
      .getAxiosInstance()
      .get(`/materialized_view/list?${params.toString()}`, options)
  }

  materializedViewRefreshHistoryDetailGet(id: string, options?: ReqConfig) {
    return client.getInstance().materializedViewDetailIdGet({ id }, options)
  }
}

const ds = new DataSource()

export const ctx: IMaterializedViewContext = {
  ds,
  cfg: {
    apiPathBase: client.getBasePath()
  }
}
