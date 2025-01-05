import {
  InfoModel,
  InfoTable,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import {
  formatNumByUnit,
  useTn,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useMemo } from "react"

import { SlowqueryModel } from "../../models"

function getData(
  data: SlowqueryModel,
  tk: (key: string) => string,
): InfoModel[] {
  return [
    {
      name: tk("fields.txn_start_ts"),
      value: data.txn_start_ts!,
      desc: tk("fields.txn_start_ts.desc"),
    },
    {
      name: tk("fields.write_keys"),
      value: formatNumByUnit(data.write_keys || 0, "short"),
    },
    {
      name: tk("fields.write_size"),
      value: formatNumByUnit(data.write_size || 0, "bytes"),
    },
    {
      name: tk("fields.prewrite_region"),
      value: formatNumByUnit(data.prewrite_region || 0, "short"),
    },
    {
      name: tk("fields.txn_retry"),
      value: formatNumByUnit(data.txn_retry || 0, "short"),
    },
  ]
}

export function DetailTxn({ data }: { data: SlowqueryModel }) {
  const { tk } = useTn("slow-query")
  const infoData = useMemo(() => getData(data, tk), [data, tk])
  return <InfoTable data={infoData} />
}
