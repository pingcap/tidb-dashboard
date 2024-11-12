import {
  MRT_ColumnDef,
  MRT_Row,
  SQLWithHover,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { Box } from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import {
  formatTime,
  formatValue,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useMemo } from "react"

import { useAppContext } from "../../ctx/context"
import { SlowqueryModel } from "../../models"

function QueryCell({ row }: { row: MRT_Row<SlowqueryModel> }) {
  const ctx = useAppContext()
  return (
    <Box
      sx={{ cursor: "pointer" }}
      onClick={() => {
        ctx.actions.openDetail(
          `${row.original.digest}_${row.original.connection_id}_${row.original.timestamp}`,
        )
      }}
    >
      <SQLWithHover sql={row.original.query!} />
    </Box>
  )
}

export function useListTableColumns() {
  const columns = useMemo<MRT_ColumnDef<SlowqueryModel>[]>(() => {
    return [
      {
        id: "query",
        header: "Query",
        minSize: 300,
        enableSorting: false,
        Cell: (data) => <QueryCell {...data} />,
      },
      {
        id: "timestamp",
        header: "Finish Time",
        enableResizing: false,
        accessorFn: (row) => formatTime(row.timestamp! * 1000),
      },
      {
        id: "query_time",
        header: "Latency",
        size: 120,
        enableResizing: false,
        accessorFn: (row) => formatValue(row.query_time!, "s"),
      },
      {
        id: "memory_max",
        header: "Max Memory",
        size: 132,
        enableResizing: false,
        accessorFn: (row) => formatValue(row.memory_max!, "bytes"),
      },
    ]
  }, [])

  return columns
}
