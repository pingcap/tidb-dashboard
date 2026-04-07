import {
  IMaterializedViewContext,
  IMaterializedViewDataSource,
  IMaterializedViewRefreshHistoryRequest,
  ReqConfig
} from '@pingcap/tidb-dashboard-lib'

import client from '~/client'

class DataSource implements IMaterializedViewDataSource {
  materializedViewRefreshHistoryGet(
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
}

const ds = new DataSource()

export const ctx: IMaterializedViewContext = {
  ds,
  cfg: {
    apiPathBase: client.getBasePath()
  }
}
