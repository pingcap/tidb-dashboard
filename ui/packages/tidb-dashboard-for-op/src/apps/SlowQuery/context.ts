import {
  ISlowQueryDataSource,
  ISlowQueryContext,
  ReqConfig
} from '@pingcap/tidb-dashboard-lib'

import client from '~/client'

class DataSource implements ISlowQueryDataSource {
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
    showResourceGroupFilter: true
    // instantQuery: false,
    // timeRangeSelector: {
    //   recentSeconds: [3 * 24 * 60 * 60],
    //   customAbsoluteRangePicker: true
    // }
  }
}
