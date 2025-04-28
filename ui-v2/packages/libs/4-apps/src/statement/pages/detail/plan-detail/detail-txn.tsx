import {
  InfoModel,
  InfoTable,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import {
  formatNumByUnit,
  useTn,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useMemo } from "react"

import { StatementModel } from "../../../models"

function getData(
  data: StatementModel,
  tk: (key: string) => string,
): InfoModel[] {
  return [
    {
      name: tk("fields.avg_affected_rows"),
      value: formatNumByUnit(data.avg_affected_rows ?? 0, "short"),
    },
    {
      name: tk("fields.sum_backoff_times"),
      value: formatNumByUnit(data.sum_backoff_times ?? 0, "short"),
    },
    {
      name: tk("fields.avg_write_keys"),
      value: formatNumByUnit(data.avg_write_keys ?? 0, "short"),
    },
    {
      name: tk("fields.max_write_keys"),
      value: formatNumByUnit(data.max_write_keys ?? 0, "short"),
    },
    {
      name: tk("fields.avg_write_size"),
      value: formatNumByUnit(data.avg_write_size ?? 0, "bytes"),
    },
    {
      name: tk("fields.max_write_size"),
      value: formatNumByUnit(data.max_write_size ?? 0, "bytes"),
    },
    {
      name: tk("fields.avg_prewrite_regions"),
      value: formatNumByUnit(data.avg_prewrite_regions ?? 0, "short"),
    },
    {
      name: tk("fields.max_prewrite_regions"),
      value: formatNumByUnit(data.max_prewrite_regions ?? 0, "short"),
    },
    {
      name: tk("fields.avg_txn_retry"),
      value: formatNumByUnit(data.avg_txn_retry ?? 0, "short"),
    },
    {
      name: tk("fields.max_txn_retry"),
      value: formatNumByUnit(data.max_txn_retry ?? 0, "short"),
    },
  ]
}

export function DetailTxn({ data }: { data: StatementModel }) {
  const { tk } = useTn("statement")
  const infoData = useMemo(() => getData(data, tk), [data, tk])
  return <InfoTable data={infoData} />
}
