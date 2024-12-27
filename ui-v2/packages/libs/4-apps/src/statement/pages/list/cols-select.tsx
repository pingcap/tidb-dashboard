import { ColumnMultiSelect } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"

import { useListUrlState } from "../../url-state/list-url-state"
import { useAvailableFieldsData } from "../../utils/use-data"

export function ColsSelect() {
  const { cols, setCols } = useListUrlState()
  const { data: availableFields } = useAvailableFieldsData()

  function handleColsChange(newCols: string[]) {
    // to avoid conflict with the default value ("digest_text,sum_latency,avg_latency,exec_count,plan_count") when cols is no value
    if (newCols.length === 0) {
      setCols(["empty"])
    } else {
      setCols(newCols)
    }
  }

  return (
    <ColumnMultiSelect
      data={availableFields || []}
      value={cols}
      onChange={handleColsChange}
      onReset={() => setCols([])}
    />
  )
}
