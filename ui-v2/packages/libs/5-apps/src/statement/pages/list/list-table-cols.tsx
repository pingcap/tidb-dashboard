import {
  EvictedSQL,
  MRT_ColumnDef,
  MRT_Row,
  SQLWithHover,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { Box } from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import { formatValue } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useMemo } from "react"

import { useAppContext } from "../../ctx/context"
import { StatementModel } from "../../models"

function QueryCell({ row }: { row: MRT_Row<StatementModel> }) {
  const ctx = useAppContext()

  function handleClick() {
    if (row.original.digest_text) {
      const { digest, schema_name, summary_begin_time, summary_end_time } =
        row.original
      const id = [
        summary_begin_time,
        summary_end_time,
        digest,
        schema_name,
      ].join(",")
      ctx.actions.openDetail(id)
    }
  }

  return row.original.digest_text ? (
    <Box sx={{ cursor: "pointer" }} onClick={handleClick}>
      <SQLWithHover sql={row.original.digest_text} />
    </Box>
  ) : (
    <EvictedSQL />
  )
}

export function useListTableColumns() {
  const columns = useMemo<MRT_ColumnDef<StatementModel>[]>(() => {
    return [
      {
        id: "digest_text",
        header: "Statement Template",
        minSize: 300,
        enableSorting: false,
        Cell: (data) => <QueryCell {...data} />,
      },
      {
        id: "sum_latency",
        header: "Total Latency",
        enableResizing: false,
        accessorFn: (row) => formatValue(row.sum_latency!, "ns"),
      },
      {
        id: "avg_latency",
        header: "Mean Latency",
        enableResizing: false,
        accessorFn: (row) => formatValue(row.avg_latency!, "ns"),
      },
      {
        id: "exec_count",
        header: "Executions Count",
        enableResizing: false,
        accessorFn: (row) => formatValue(row.exec_count!, "short"),
      },
      {
        id: "plan_count",
        header: "Plans Count",
        enableResizing: false,
        accessorFn: (row) => row.plan_count ?? 0,
      },
    ]
  }, [])

  return columns
}
