import {
  MRT_ColumnDef,
  SQLWithHover,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { Typography } from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import {
  formatTime,
  formatValue,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useMemo } from "react"

import { SlowqueryModel } from "../models"

export const SLOW_QUERY_COLUMNS = [
  "query",
  "timestamp",
  "query_time",
  "memory_max",
]

export function useSlowQueryColumns() {
  const columns = useMemo<MRT_ColumnDef<SlowqueryModel>[]>(() => {
    return [
      {
        id: "query",
        header: "Query",
        minSize: 300,
        enableSorting: false,
        accessorFn: (row) => <SQLWithHover sql={row.query!} />,
      },
      {
        id: "timestamp",
        header: "Finish Time",
        enableResizing: false,
        accessorFn: (row) => (
          <Typography truncate variant="body-lg">
            {formatTime(row.timestamp! * 1000)}
          </Typography>
        ),
      },
      {
        id: "query_time",
        header: "Latency",
        size: 120,
        enableResizing: false,
        accessorFn: (row) => (
          <Typography w={80} variant="body-lg">
            {formatValue(row.query_time!, "s")}
          </Typography>
        ),
      },
      {
        id: "memory_max",
        header: "Max Memory",
        size: 132,
        enableResizing: false,
        accessorFn: (row) => (
          <Typography w={80} variant="body-lg">
            {formatValue(row.memory_max!, "bytes")}
          </Typography>
        ),
      },
    ]
  }, [])

  return columns
}
