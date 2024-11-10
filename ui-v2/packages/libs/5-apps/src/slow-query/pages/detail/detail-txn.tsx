import { formatValue } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useMemo } from "react"

import { InfoModel, InfoTable } from "../../components/info-table"
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
      value: formatValue(data.write_keys || 0, "short"),
    },
    {
      name: "Write Size",
      value: formatValue(data.write_size || 0, "bytes"),
    },
    {
      name: "Prewrite Regions",
      value: formatValue(data.prewrite_region || 0, "short"),
    },
    {
      name: "Transaction Retries",
      value: formatValue(data.txn_retry || 0, "short"),
    },
  ]
}

export function DetailTxn({ data }: { data: SlowqueryModel }) {
  const infoData = useMemo(() => getData(data), [data])
  return <InfoTable data={infoData} />
}
