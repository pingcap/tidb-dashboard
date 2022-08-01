import {
  ISlowQueryDataSource,
  ISlowQueryContext,
  ReqConfig
} from '@pingcap/tidb-dashboard-lib'

import client from '~/client'

class DataSource implements ISlowQueryDataSource {
  infoListDatabases(options?: ReqConfig) {
    return Promise.resolve({
      data: [],
      status: 200,
      statusText: 'ok',
      headers: {},
      config: {}
    })
  }

  slowQueryAvailableFieldsGet(options?: ReqConfig) {
    return Promise.resolve({
      data: [],
      status: 200,
      statusText: 'ok',
      headers: {},
      config: {}
    })
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
    options?: ReqConfig
  ) {
    return client.getInstance().orgsOidClustersCidSlowqueriesGet(
      {
        xCsrfToken: client.getToken(),
        oid: '',
        itemID: '',
        cid: '',
        beginTime,
        endTime,
        db,
        limit,
        text,
        orderBy,
        desc,
        plans,
        digest
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
    return client.getInstance().orgsOidClustersCidSlowqueriesQueryidGet(
      {
        xCsrfToken: client.getToken(),
        oid: '',
        itemID: '',
        cid: '',
        queryid: ''
      },
      options
    )
  }

  slowQueryDownloadTokenPost(request: any, options?: ReqConfig) {
    return Promise.resolve({
      data: '',
      status: 200,
      statusText: 'ok',
      headers: {},
      config: {}
    })
  }
}

const ds = new DataSource()

export const ctx: () => ISlowQueryContext = () => ({
  ds,
  cfg: { apiPathBase: client.getBasePath(), enableExport: false }
})
