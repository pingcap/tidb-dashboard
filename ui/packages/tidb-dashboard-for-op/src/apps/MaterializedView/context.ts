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
    return client.getInstance().materializedViewListGet(
      {
        beginTime: request.begin_time,
        endTime: request.end_time,
        schema: request.schema,
        materializedView: request.materialized_view,
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
}

const ds = new DataSource()

export const ctx: IMaterializedViewContext = {
  ds,
  cfg: {
    apiPathBase: client.getBasePath()
  }
}
