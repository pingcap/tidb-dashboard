import { ColumnMultiSelect } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { useMemo } from "react"

import { useListUrlState } from "../../shared-state/list-url-state"
import { useAvailableFieldsData } from "../../utils/use-data"

import { useListTableColumns } from "./cols"

export function ColsSelect() {
  const { cols, setCols } = useListUrlState()
  const { data: availableFields } = useAvailableFieldsData()
  const tableColumns = useListTableColumns()

  const colsData = useMemo(() => {
    return tableColumns
      .filter((f) => f.id !== undefined)
      .filter((f) => availableFields?.includes(f.id!))
      .map((f) => ({ label: f.header, val: f.id! }))
  }, [availableFields, tableColumns])

  function handleColsChange(newCols: string[]) {
    // to avoid conflict with the default value ("query,timestamp,query_time,memory_max") when cols is no value
    if (newCols.length === 0) {
      setCols(["empty"])
    } else {
      setCols(newCols)
    }
  }

  return (
    <ColumnMultiSelect
      data={colsData}
      value={cols}
      onChange={handleColsChange}
      onReset={() => setCols([])}
    />
  )
}
