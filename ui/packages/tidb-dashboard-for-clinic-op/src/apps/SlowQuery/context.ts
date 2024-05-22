import {
  ISlowQueryDataSource,
  ISlowQueryEvent,
  ISlowQueryContext,
  ReqConfig
} from '@pingcap/tidb-dashboard-lib'

import client from '~/client'

export type DsExtra = {
  oid: string
  cid: string
  itemID: string
  beginTime: number
  endTime: number
  curQueryID: string
}

class DataSource implements ISlowQueryDataSource {
  constructor(public extra: DsExtra) {}

  getDatabaseList(beginTime: number, endTime: number, options?: ReqConfig) {
    // return Promise.reject(new Error('no need to implemented'))
    return Promise.resolve({
      data: [],
      status: 200,
      statusText: 'ok',
      headers: {},
      config: {}
    } as any)
  }

  infoListResourceGroupNames(options?: ReqConfig) {
    // return Promise.reject(new Error('no need to implemented'))
    return Promise.resolve({
      data: [],
      status: 200,
      statusText: 'ok',
      headers: {},
      config: {}
    } as any)
  }

  slowQueryAvailableFieldsGet(options?: ReqConfig) {
    // return Promise.reject(new Error('no need to implemented'))
    return Promise.resolve({
      data: [],
      status: 200,
      statusText: 'ok',
      headers: {},
      config: {}
    } as any)
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
    options?: ReqConfig
  ) {
    return client.getInstance().orgsOidClustersCidSlowqueriesGet(
      {
        xCsrfToken: client.getToken(),
        oid: this.extra.oid,
        itemID: this.extra.itemID,
        cid: this.extra.cid,
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
        oid: this.extra.oid,
        itemID: this.extra.itemID,
        cid: this.extra.cid,
        queryid: this.extra.curQueryID
      },
      options
    )
  }

  slowQueryDownloadTokenPost(request: any, options?: ReqConfig) {
    return Promise.reject(new Error('no need to implemented'))
    // return Promise.resolve({
    //   data: '',
    //   status: 200,
    //   statusText: 'ok',
    //   headers: {},
    //   config: {}
    // })
  }
}

class EventHandler implements ISlowQueryEvent {
  constructor(public extra: DsExtra) {}

  selectSlowQueryItem(item: any) {
    this.extra.curQueryID = item.id
  }
}

export const ctx: (extra: DsExtra) => ISlowQueryContext = (extra) => ({
  ds: new DataSource(extra),
  event: new EventHandler(extra),
  cfg: {
    apiPathBase: client.getBasePath(),
    enableExport: false,
    showDBFilter: false,
    showDigestFilter: false,
    showResourceGroupFilter: true
  }
})
