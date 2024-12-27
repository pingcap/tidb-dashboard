import { AdvancedFilterItem } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import {
  ActionIcon,
  Box,
  Group,
  Select,
  TextInput,
  Typography,
} from "@tidbcloud/uikit"
import { IconTrash01 } from "@tidbcloud/uikit/icons"
import { useEffect } from "react"

import { FilterMultiSelect } from "../filter-multi-select"

// AdvancedFilterItem represent the filter from url
export type AdvancedFilterSettingItem = AdvancedFilterItem & {
  createdAt: number
  deleted: boolean
}

// AdvancedFilterInfo represent the info from backend
export type AdvancedFilterInfo = {
  name: string
  unit: string
  values: string[]
}

export function AdvancedFilterSetting({
  availableFilters,
  filtersInfo,
  onReqFilterInfo,
  filter,
  onUpdate,
  showDelete = true,
  conditionLabel = "AND",
}: {
  availableFilters: string[]
  filtersInfo?: AdvancedFilterInfo[]
  onReqFilterInfo?: (filterName: string) => void
  filter: AdvancedFilterSettingItem
  onUpdate?: (item: AdvancedFilterSettingItem) => void
  showDelete?: boolean
  conditionLabel?: string
}) {
  const filterInfo = filtersInfo?.find((f) => f.name === filter.filterName)

  useEffect(() => {
    if (filter.filterName) {
      const fInfo = filtersInfo?.find((f) => f.name === filter.filterName)
      if (!fInfo) {
        onReqFilterInfo?.(filter.filterName)
      }
    }
  }, [filter.filterName])

  return (
    <Group>
      <Typography w={42}>{conditionLabel}</Typography>

      <Select
        w={240}
        searchable
        placeholder="Filter Name"
        data={availableFilters}
        value={filter.filterName}
        onChange={(v) =>
          onUpdate?.({ ...filter, filterName: v || "", filterValues: [] })
        }
      />

      <Box w={100}>
        {filterInfo && filterInfo.values.length > 0 && (
          <Select
            data={["in", "not in"]}
            value={filter.filterOperator || "in"}
            onChange={(v) =>
              onUpdate?.({ ...filter, filterOperator: v || "in" })
            }
          />
        )}
        {filterInfo && filterInfo.values.length === 0 && (
          <Select
            data={["=", "!=", ">", ">=", "<", "<="]}
            value={filter.filterOperator || "="}
            onChange={(v) =>
              onUpdate?.({ ...filter, filterOperator: v || "=" })
            }
          />
        )}
      </Box>

      <Box w={240}>
        {filterInfo && filterInfo.values.length > 0 && (
          <FilterMultiSelect
            kind={filter.filterName}
            hideKind
            fullResultCount={3}
            data={filterInfo.values}
            value={filter.filterValues}
            onChange={(v) =>
              onUpdate?.({
                ...filter,
                filterValues: v,
                filterOperator: filter.filterOperator || "in",
              })
            }
          />
        )}
        {filterInfo && filterInfo.values.length === 0 && (
          <TextInput
            rightSection={filterInfo.unit}
            value={filter.filterValues[0]}
            onChange={(e) =>
              onUpdate?.({
                ...filter,
                filterValues: [e.target.value],
                filterOperator: filter.filterOperator || "=",
              })
            }
          />
        )}
      </Box>

      <Group ml="auto" w={28}>
        {showDelete && (
          <ActionIcon onClick={() => onUpdate?.({ ...filter, deleted: true })}>
            <IconTrash01 size={16} />
          </ActionIcon>
        )}
      </Group>
    </Group>
  )
}
