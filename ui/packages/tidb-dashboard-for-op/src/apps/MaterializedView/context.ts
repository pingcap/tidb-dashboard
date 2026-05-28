import {
  IMaterializedViewContext,
  IMaterializedViewDataSource,
  IMaterializedViewRefreshAlertRequest,
  IMaterializedViewRefreshHistoryRequest,
  ReqConfig
} from '@pingcap/tidb-dashboard-lib'

import client from '~/client'
import auth from '~/utils/auth'

class DataSource implements IMaterializedViewDataSource {
  getDatabaseList(options?: ReqConfig) {
    return client.getInstance().infoListDatabases(options)
  }

  materializedViewRefreshHistoryGet(
    request: IMaterializedViewRefreshHistoryRequest,
    options?: ReqConfig
  ) {
    return client.getInstance().materializedViewListGet(
      {
        beginTime: request.begin_time,
        endTime: request.end_time,
        schema: request.schema,
        materializedView: request.materialized_view,
        refreshMethod: request.refresh_method,
        status: request.status,
        minDuration: request.min_duration,
        page: request.page,
        pageSize: request.page_size,
        orderBy: request.orderBy,
        desc: request.desc
      },
      options
    )
  }

  materializedViewRefreshHistoryDetailGet(id: string, options?: ReqConfig) {
    return client.getInstance().materializedViewDetailIdGet({ id }, options)
  }

  materializedViewRefreshAlertGet(
    request: IMaterializedViewRefreshAlertRequest,
    options?: ReqConfig
  ) {
    const params = new URLSearchParams()
    request.schema?.forEach((schema) => params.append('schema', schema))
    if (request.materialized_view) {
      params.set('materialized_view', request.materialized_view)
    }
    if (request.last_success_time !== undefined) {
      params.set('last_success_time', String(request.last_success_time))
    }
    if (request.page !== undefined) {
      params.set('page', String(request.page))
    }
    if (request.page_size !== undefined) {
      params.set('page_size', String(request.page_size))
    }
    if (request.orderBy !== undefined) {
      params.set('orderBy', request.orderBy)
    }
    if (request.desc !== undefined) {
      params.set('desc', String(request.desc))
    }

    return client.getAxiosInstance().get('/materialized_view/alert', {
      ...options,
      params,
      headers: {
        ...(options?.headers ?? {}),
        Authorization: auth.getAuthTokenAsBearer() || ''
      }
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
