import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Button, notifier, openConfirmModal } from "@tidbcloud/uikit"
import { MRT_ColumnDef, ProTable } from "@tidbcloud/uikit/biz"
import { useMemo } from "react"

import { SqlLimitStatusItem } from "../ctx"
import { useDeleteSqlLimitData, useSqlLimitStatusData } from "../utils/use-data"

export function SqlLimitTable() {
  const { data: sqlLimitStatus } = useSqlLimitStatusData()
  const deleteSqlLimitMut = useDeleteSqlLimitData()
  const { tt } = useTn("sql-limit")

  async function handleDelete(id: string) {
    try {
      await deleteSqlLimitMut.mutateAsync(id)
      notifier.success(tt("Delete SQL limit successfully"))
    } catch (_err) {
      notifier.error(tt("Delete SQL limit failed"))
    }
  }

  function confirmDelete(item: SqlLimitStatusItem) {
    openConfirmModal({
      title: tt("Delete Limit"),
      children: tt(
        "Are you sure to delete this limit (Resource Group - {{ruGroup}}, Action - {{action}})?",
        { ruGroup: item.ru_group, action: item.action },
      ),
      confirmProps: { color: "red", variant: "outline" },
      labels: { confirm: tt("Delete"), cancel: tt("Cancel") },
      onConfirm: () => handleDelete(item.id),
    })
  }

  const columns = useMemo<MRT_ColumnDef<SqlLimitStatusItem>[]>(
    () => [
      {
        id: "ru_group",
        header: tt("Resource Group"),
        accessorFn: (row) => row.ru_group,
      },
      { id: "action", header: tt("Action"), accessorFn: (row) => row.action },
      {
        id: "start_time",
        header: tt("Start Time"),
        accessorFn: (row) => row.start_time,
      },
      {
        id: "operation",
        header: "",
        size: 120,
        mantineTableBodyCellProps: {
          align: "right",
        },
        // accessorFn can't update the text when changing the language
        Cell: (d) => (
          <Button
            c="red.7"
            variant="transparent"
            onClick={() => confirmDelete(d.row.original)}
          >
            {tt("Delete Limit")}
          </Button>
        ),
      },
    ],
    [tt],
  )

  return (
    <ProTable
      data={sqlLimitStatus || []}
      columns={columns}
      enableColumnPinning
      initialState={{
        columnPinning: { right: ["operation"] },
      }}
    />
  )
}
