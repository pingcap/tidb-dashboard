import {
  InfoModel,
  InfoTable,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { formatNumByUnit } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useMemo } from "react"

import { SlowqueryModel } from "../../models"

function getData(data: SlowqueryModel): InfoModel[] {
  return [
    {
      name: "Start Timestamp",
      value: data.txn_start_ts!,
      desc: "Transaction start timestamp, a.k.a. Transaction ID",
    },
    {
      name: "Write Keys",
      value: formatNumByUnit(data.write_keys || 0, "short"),
    },
    {
      name: "Write Size",
      value: formatNumByUnit(data.write_size || 0, "bytes"),
    },
    {
      name: "Prewrite Regions",
      value: formatNumByUnit(data.prewrite_region || 0, "short"),
    },
    {
      name: "Transaction Retries",
      value: formatNumByUnit(data.txn_retry || 0, "short"),
    },
  ]
}

export function DetailTxn({ data }: { data: SlowqueryModel }) {
  const infoData = useMemo(() => getData(data), [data])
  return <InfoTable data={infoData} />
}
