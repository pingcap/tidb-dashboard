import { AdvancedFilterItem } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import {
  ActionIcon,
  Box,
  Group,
  NumberInput,
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
  type: string // string | number | bool
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
  availableFilters: Array<string | { label: string; value: string }>
  filtersInfo?: AdvancedFilterInfo[]
  onReqFilterInfo?: (filterName: string) => void
  filter: AdvancedFilterSettingItem
  onUpdate?: (item: AdvancedFilterSettingItem) => void
  showDelete?: boolean
  conditionLabel?: string
}) {
  const filterInfo = filtersInfo?.find((f) => f.name === filter.name)

  useEffect(() => {
    if (filter.name) {
      const fInfo = filtersInfo?.find((f) => f.name === filter.name)
      if (!fInfo) {
        onReqFilterInfo?.(filter.name)
      }
    }
  }, [filter.name])

  return (
    <Group>
      <Typography w={42}>{conditionLabel}</Typography>

      <Select
        w={240}
        searchable
        placeholder="Filter Name"
        data={availableFilters}
        value={filter.name}
        onChange={(v) => onUpdate?.({ ...filter, name: v || "", values: [] })}
      />

      <Box w={100}>
        {filterInfo && filterInfo.values.length > 0 && (
          <Select
            data={["in", "not in"]}
            value={filter.operator || "in"}
            onChange={(v) => onUpdate?.({ ...filter, operator: v || "in" })}
          />
        )}
        {filterInfo && filterInfo.values.length === 0 && (
          <Select
            data={["=", "!=", ">", ">=", "<", "<="]}
            value={filter.operator || "="}
            onChange={(v) => onUpdate?.({ ...filter, operator: v || "=" })}
          />
        )}
      </Box>

      <Box w={240}>
        {filterInfo && filterInfo.values.length > 0 && (
          <FilterMultiSelect
            kind={filter.name}
            hideKind
            fullResultCount={3}
            data={filterInfo.values}
            value={filter.values}
            onChange={(v) =>
              onUpdate?.({
                ...filter,
                values: v,
                operator: filter.operator || "in",
              })
            }
          />
        )}
        {filterInfo &&
          filterInfo.values.length === 0 &&
          filterInfo.type === "string" && (
            <TextInput
              value={filter.values[0]}
              onChange={(e) =>
                onUpdate?.({
                  ...filter,
                  values: [e.target.value],
                  operator: filter.operator || "=",
                })
              }
            />
          )}
        {filterInfo &&
          filterInfo.values.length === 0 &&
          filterInfo.type !== "string" && (
            <NumberInput
              rightSection={filterInfo.unit}
              value={filter.values[0]}
              allowNegative={false}
              allowDecimal={filterInfo.type.startsWith("float")}
              hideControls
              onChange={(v) =>
                onUpdate?.({
                  ...filter,
                  values: [v + ""],
                  operator: filter.operator || "=",
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
