import { SQLWithHover } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import {
  formatNumByUnit,
  formatTime,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Box } from "@tidbcloud/uikit"
import { MRT_ColumnDef } from "@tidbcloud/uikit/biz"
import { useMemo } from "react"

import { useAppContext } from "../../ctx"
import { SlowqueryModel } from "../../models"
import { useTimeRangeValueState } from "../../shared-state/memory-state"

function SqlCell({ row }: { row: SlowqueryModel }) {
  const ctx = useAppContext()
  const trv = useTimeRangeValueState((s) => s.trv)

  function handleClick() {
    const { digest, connection_id, timestamp } = row
    const id = [digest, connection_id, timestamp, trv[0], trv[1]].join(",")
    ctx.actions.openDetail(id)
  }

  return (
    <Box sx={{ cursor: "pointer" }} onClick={handleClick} w="100%">
      <SQLWithHover sql={row.query!} />
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
        accessorFn: (row) => <SqlCell row={row} />,
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
        accessorFn: (row) => formatNumByUnit(row.query_time!, "s"),
      },
      {
        id: "memory_max",
        header: "Max Memory",
        size: 132,
        enableResizing: false,
        accessorFn: (row) => formatNumByUnit(row.memory_max!, "bytes"),
      },
    ]
  }, [])

  return columns
}
