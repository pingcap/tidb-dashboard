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
      name: "Query Time",
      value: formatNumByUnit(data.avg_latency ?? 0, "ns"),
      level: 0,
      desc: "The execution time of a query (due to the parallel execution, it may be significantly smaller than the sum of below time)",
    },
    {
      name: "Parse Time",
      value: formatNumByUnit(data.avg_parse_latency ?? 0, "ns"),
      level: 1,
      desc: "Time consumed when parsing the query",
    },
    {
      name: "Compile",
      value: formatNumByUnit(data.avg_compile_latency ?? 0, "ns"),
      level: 1,
      desc: "Time consumed when optimizing the query",
    },
    {
      name: "Coprocessor Wait Time",
      value: formatNumByUnit(data.avg_wait_time ?? 0, "ns"),
      level: 1,
    },
    {
      name: "Coprocessor Execution Time",
      value: formatNumByUnit(data.avg_process_time ?? 0, "ns"),
      level: 1,
    },
    {
      name: "Backoff Retry Time",
      value: formatNumByUnit(data.avg_backoff_time ?? 0, "ns"),
      level: 1,
      desc: "The waiting time before retry when a query encounters errors that require a retry",
    },
    {
      name: "Get Commit Ts Time",
      value: formatNumByUnit(data.avg_get_commit_ts_time ?? 0, "ns"),
      level: 1,
    },
    {
      name: "Local Latch Wait Time",
      value: formatNumByUnit(data.avg_local_latch_wait_time ?? 0, "ns"),
      level: 1,
    },
    {
      name: "Resolve Lock Time",
      value: formatNumByUnit(data.avg_resolve_lock_time ?? 0, "ns"),
      level: 1,
    },
    {
      name: "Prewrite Time",
      value: formatNumByUnit(data.avg_prewrite_time ?? 0, "ns"),
      level: 1,
    },
    {
      name: "Commit Time",
      value: formatNumByUnit(data.avg_commit_time ?? 0, "ns"),
      level: 1,
    },
    {
      name: "Commit Backoff Retry Time",
      value: formatNumByUnit(data.avg_commit_backoff_time ?? 0, "ns"),
      level: 1,
    },
  ]
}

export function DetailTime({ data }: { data: StatementModel }) {
  const infoData = useMemo(() => getData(data), [data])
  return <InfoTable data={infoData} />
}
