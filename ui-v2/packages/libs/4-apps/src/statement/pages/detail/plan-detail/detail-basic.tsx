import {
  InfoModel,
  InfoTable,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import {
  formatNumByUnit,
  formatTime,
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
      name: tk("fields.table_names"),
      value: data.table_names || "-",
    },
    {
      name: tk("fields.index_names"),
      value: data.index_names || "-",
      desc: tk("fields.index_names.desc"),
    },
    {
      name: tk("fields.first_seen"),
      value: data.first_seen ? formatTime(data.first_seen * 1000) : "-",
    },
    {
      name: tk("fields.last_seen"),
      value: data.last_seen ? formatTime(data.last_seen * 1000) : "-",
    },
    {
      name: tk("fields.exec_count"),
      value: formatNumByUnit(data.exec_count ?? 0, "short"),
      desc: tk("fields.exec_count.desc"),
    },
    {
      name: tk("fields.sum_latency"),
      value: formatNumByUnit(data.sum_latency ?? 0, "ns"),
      desc: tk("fields.sum_latency.desc"),
    },
    {
      name: tk("fields.avg_latency"),
      value: formatNumByUnit(data.avg_latency ?? 0, "ns"),
      desc: tk("fields.avg_latency.desc"),
    },
    {
      name: tk("fields.sample_user"),
      value: data.sample_user || "-",
      desc: tk("fields.sample_user.desc"),
    },
    {
      name: tk("fields.sum_errors"),
      value: formatNumByUnit(data.sum_errors ?? 0, "short"),
    },
    {
      name: tk("fields.sum_warnings"),
      value: formatNumByUnit(data.sum_warnings ?? 0, "short"),
    },
    {
      name: tk("fields.avg_mem"),
      value: formatNumByUnit(data.avg_mem ?? 0, "bytes"),
      desc: tk("fields.avg_mem.desc"),
    },
    {
      name: tk("fields.max_mem"),
      value: formatNumByUnit(data.max_mem ?? 0, "bytes"),
      desc: tk("fields.max_mem.desc"),
    },
    {
      name: tk("fields.avg_disk"),
      value: formatNumByUnit(data.avg_disk ?? 0, "bytes"),
      desc: tk("fields.avg_disk.desc"),
    },
    {
      name: tk("fields.max_disk"),
      value: formatNumByUnit(data.max_disk ?? 0, "bytes"),
      desc: tk("fields.max_disk.desc"),
    },
  ]
}

export function DetailBasic({ data }: { data: StatementModel }) {
  const { tk } = useTn("statement")
  const infoData = useMemo(() => getData(data, tk), [data, tk])
  return <InfoTable data={infoData} />
}
