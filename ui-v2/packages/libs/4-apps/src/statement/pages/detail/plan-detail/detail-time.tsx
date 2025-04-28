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
      name: tk("fields.query_time_2"),
      value: formatNumByUnit(data.avg_latency ?? 0, "ns"),
      level: 0,
      desc: tk("fields.query_time_2.desc"),
    },
    {
      name: tk("fields.avg_parse_latency"),
      value: formatNumByUnit(data.avg_parse_latency ?? 0, "ns"),
      level: 1,
      // desc: tk("fields.avg_parse_latency.desc"),
    },
    {
      name: tk("fields.avg_compile_latency"),
      value: formatNumByUnit(data.avg_compile_latency ?? 0, "ns"),
      level: 1,
      // desc: tk("fields.avg_compile_latency.desc"),
    },
    {
      name: tk("fields.avg_wait_time"),
      value: formatNumByUnit(data.avg_wait_time ?? 0, "ns"),
      level: 1,
    },
    {
      name: tk("fields.avg_process_time"),
      value: formatNumByUnit(data.avg_process_time ?? 0, "ns"),
      level: 1,
    },
    {
      name: tk("fields.avg_backoff_time"),
      value: formatNumByUnit(data.avg_backoff_time ?? 0, "ns"),
      level: 1,
      // desc: tk("fields.avg_backoff_time.desc"),
    },
    {
      name: tk("fields.avg_get_commit_ts_time"),
      value: formatNumByUnit(data.avg_get_commit_ts_time ?? 0, "ns"),
      level: 1,
    },
    {
      name: tk("fields.avg_local_latch_wait_time"),
      value: formatNumByUnit(data.avg_local_latch_wait_time ?? 0, "ns"),
      level: 1,
    },
    {
      name: tk("fields.avg_resolve_lock_time"),
      value: formatNumByUnit(data.avg_resolve_lock_time ?? 0, "ns"),
      level: 1,
    },
    {
      name: tk("fields.avg_prewrite_time"),
      value: formatNumByUnit(data.avg_prewrite_time ?? 0, "ns"),
      level: 1,
    },
    {
      name: tk("fields.avg_commit_time"),
      value: formatNumByUnit(data.avg_commit_time ?? 0, "ns"),
      level: 1,
    },
    {
      name: tk("fields.avg_commit_backoff_time"),
      value: formatNumByUnit(data.avg_commit_backoff_time ?? 0, "ns"),
      level: 1,
    },
  ]
}

export function DetailTime({ data }: { data: StatementModel }) {
  const { tk } = useTn("statement")
  const infoData = useMemo(() => getData(data, tk), [data, tk])
  return <InfoTable data={infoData} />
}
