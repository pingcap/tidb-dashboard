import {
  ISlowQueryDataSource,
  ISlowQueryContext,
  ISlowQueryConfig,
  ISlowQueryEvent,
  ReqConfig
} from '@pingcap/tidb-dashboard-lib'

import client, { SlowqueryModel } from '~/client'

class DataSource implements ISlowQueryDataSource {
  constructor(public cache: SlowqueryModel[]) {}

  infoListDatabases(options?: ReqConfig) {
    return client.getInstance().infoListDatabases(options)
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
    text?: string,
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
    // to make this.cache as small as possible
    const cachedItem = this.cache.pop()
    if (cachedItem) {
      return Promise.resolve({
        data: cachedItem,
        status: 200,
        statusText: 'ok',
        headers: {},
        config: {}
      })
    } else {
      return client.getInstance().slowQueryDetailGet(
        {
          connectId,
          digest,
          timestamp
        },
        options
      )
    }
  }

  slowQueryDownloadTokenPost(request: any, options?: ReqConfig) {
    return client.getInstance().slowQueryDownloadTokenPost({ request }, options)
  }
}

class EventHandler implements ISlowQueryEvent {
  constructor(
    public listApiReturnDetail: boolean,
    public cache: SlowqueryModel[]
  ) {}

  selectSlowQueryItem(item: any) {
    if (this.listApiReturnDetail === true) {
      this.cache.push(item)
    }
  }
}

export const ctx: (cfg: Partial<ISlowQueryConfig>) => ISlowQueryContext = (
  cfg
) => {
  const slowQueryCache: SlowqueryModel[] = []

  return {
    ds: new DataSource(slowQueryCache),
    event: new EventHandler(cfg.listApiReturnDetail ?? false, slowQueryCache),
    cfg: {
      apiPathBase: client.getBasePath(),
      enableExport: true,
      showDBFilter: true,
      ...cfg
    }
  }
}
