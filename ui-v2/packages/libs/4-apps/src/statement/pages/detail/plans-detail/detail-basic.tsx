import {
  InfoModel,
  InfoTable,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import {
  formatNumByUnit,
  formatTime,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useMemo } from "react"

import { StatementModel } from "../../../models"

function getData(data: StatementModel): InfoModel[] {
  return [
    {
      name: "Table Names",
      value: data.table_names || "-",
    },
    {
      name: "Index Names",
      value: data.index_names || "-",
      desc: "The name of the used index",
    },
    {
      name: "First Seen",
      value: data.first_seen ? formatTime(data.first_seen * 1000) : "-",
    },
    {
      name: "Last Seen",
      value: data.last_seen ? formatTime(data.last_seen * 1000) : "-",
    },
    {
      name: "Executions Count",
      value: formatNumByUnit(data.exec_count ?? 0, "short"),
      desc: "Total execution count for this kind of statement",
    },
    {
      name: "Total Latency",
      value: formatNumByUnit(data.sum_latency ?? 0, "ns"),
      desc: "Total execution time for this kind of statement",
    },
    {
      name: "Execution User",
      value: data.sample_user || "-",
      desc: "The user that executes the query (sampled)",
    },
    {
      name: "Total Errors",
      value: formatNumByUnit(data.sum_errors ?? 0, "short"),
    },
    {
      name: "Total Warnings",
      value: formatNumByUnit(data.sum_warnings ?? 0, "short"),
    },
    {
      name: "Mean Memory",
      value: formatNumByUnit(data.avg_mem ?? 0, "bytes"),
      desc: "Memory usage of single query",
    },
    {
      name: "Max Memory",
      value: formatNumByUnit(data.max_mem ?? 0, "bytes"),
      desc: "Maximum memory usage of single query",
    },
    {
      name: "Mean Disk",
      value: formatNumByUnit(data.avg_disk ?? 0, "bytes"),
      desc: "Disk usage of single query",
    },
    {
      name: "Max Disk",
      value: formatNumByUnit(data.max_disk ?? 0, "bytes"),
      desc: "Maximum disk usage of single query",
    },
  ]
}

export function DetailBasic({ data }: { data: StatementModel }) {
  const infoData = useMemo(() => getData(data), [data])
  return <InfoTable data={infoData} />
}
