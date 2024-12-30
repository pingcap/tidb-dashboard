import {
  InfoModel,
  InfoTable,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { formatNumByUnit } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useMemo } from "react"

import { StatementModel } from "../../../models"

function getData(data: StatementModel): InfoModel[] {
  return [
    {
      name: "Mean Affected Rows",
      value: formatNumByUnit(data.avg_affected_rows ?? 0, "short"),
    },
    {
      name: "Total Backoff Count",
      value: formatNumByUnit(data.sum_backoff_times ?? 0, "short"),
    },
    {
      name: "Mean Written Keys",
      value: formatNumByUnit(data.avg_write_keys ?? 0, "short"),
    },
    {
      name: "Max Written Keys",
      value: formatNumByUnit(data.max_write_keys ?? 0, "short"),
    },
    {
      name: "Mean Written Data Size",
      value: formatNumByUnit(data.avg_write_size ?? 0, "bytes"),
    },
    {
      name: "Max Written Data Size",
      value: formatNumByUnit(data.max_write_size ?? 0, "bytes"),
    },
    {
      name: "Mean Prewrite Regions",
      value: formatNumByUnit(data.avg_prewrite_regions ?? 0, "short"),
    },
    {
      name: "Max Prewrite Regions",
      value: formatNumByUnit(data.max_prewrite_regions ?? 0, "short"),
    },
    {
      name: "Mean Transaction Retries",
      value: formatNumByUnit(data.avg_txn_retry ?? 0, "short"),
    },
    {
      name: "Max Transaction Retries",
      value: formatNumByUnit(data.max_txn_retry ?? 0, "short"),
    },
  ]
}

export function DetailTxn({ data }: { data: StatementModel }) {
  const infoData = useMemo(() => getData(data), [data])
  return <InfoTable data={infoData} />
}
