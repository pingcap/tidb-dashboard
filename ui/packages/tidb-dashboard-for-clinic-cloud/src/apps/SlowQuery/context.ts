import {
  ISlowQueryDataSource,
  ISlowQueryContext,
  ISlowQueryConfig,
  ISlowQueryEvent,
  ReqConfig
} from '@pingcap/tidb-dashboard-lib'

import client, { SlowqueryModel } from '~/client'

const debugHeaders = {
  // 'x-cluster-id': '1379661944646413143',
  // 'x-org-id': '1372813089209061633',
  // 'x-project-id': '1372813089454525346',
  // 'x-provider': 'aws',
  // 'x-region': 'us-east-1',
  // 'x-env': 'prod'
}

class DataSource implements ISlowQueryDataSource {
  constructor(public cache: SlowqueryModel[]) {}

  getDatabaseList(beginTime: number, endTime: number, options?: ReqConfig) {
    // get database list from PD
    if (beginTime === 0) {
      return client.getInstance().infoListDatabases(options)
    }

    // get database list from s3
    return client
      .getAxiosInstance()
      .get(
        `/slow_query/databases?begin_time=${beginTime}&end_time=${endTime}`,
        { headers: debugHeaders }
      )
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
    const localVarQueryParameter = {} as any
    if (beginTime !== undefined) {
      localVarQueryParameter['begin_time'] = beginTime
    }
    if (db) {
      localVarQueryParameter['db'] = db
    }
    if (desc !== undefined) {
      localVarQueryParameter['desc'] = desc
    }
    if (digest !== undefined) {
      localVarQueryParameter['digest'] = digest
    }
    if (endTime !== undefined) {
      localVarQueryParameter['end_time'] = endTime
    }
    if (fields !== undefined) {
      localVarQueryParameter['fields'] = fields
    }
    if (limit !== undefined) {
      localVarQueryParameter['limit'] = limit
    }
    if (orderBy !== undefined) {
      localVarQueryParameter['orderBy'] = orderBy
    }
    if (plans) {
      localVarQueryParameter['plans'] = plans
    }
    if (resourceGroup) {
      localVarQueryParameter['resource_group'] = resourceGroup
    }
    if (text !== undefined) {
      localVarQueryParameter['text'] = text
    }
    if (showInternal !== undefined) {
      localVarQueryParameter['show_internal'] = showInternal
    }
    const searchParams = new URLSearchParams()
    for (const field in localVarQueryParameter) {
      const value = localVarQueryParameter[field]
      if (Array.isArray(value)) {
        searchParams.delete(field)
        for (const item of value) {
          searchParams.append(field, item)
        }
      } else {
        searchParams.set(field, value)
      }
    }
    const searchString = searchParams.toString()

    return client.getAxiosInstance().get(`/slow_query/list?${searchString}`)
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
      } as any)
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

  slowQueryAnalyze(start: number, end: number) {
    return client
      .getAxiosInstance()
      .get(`/slow_query/analyze?begin_time=${start}&end_time=${end}`)
  }

  slowQueryDownloadDBFile(begin_time: number, end_time: number) {
    return client
      .getAxiosInstance()
      .get(`/slow_query/files?begin_time=${begin_time}&end_time=${end_time}`, {
        responseType: 'blob',
        headers: {
          Accept: 'application/octet-stream'
        }
      })
  }

  promqlQuery(query: string, time: number, timeout: string) {
    return client
      .getAxiosInstance()
      .get(
        `/slow_query/vm_query?query=${query}&time=${time}&timeout=${timeout}`
      )
      .then((res) => res.data)
  }

  promqlQueryRange(query: string, start: number, end: number, step: string) {
    return client
      .getAxiosInstance()
      .get(
        `/slow_query/vm_query_range?query=${query}&start=${start}&end=${end}&step=${step}`
      )
      .then((res) => res.data)
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
      showDigestFilter: false,
      showResourceGroupFilter: true,
      showDownloadSlowQueryDBFile: true,
      showInternalFilter: true,
      ...cfg
    }
  }
}
