import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Button, Group, Stack } from "@tidbcloud/uikit"

import {
  AdvancedFilterInfo,
  AdvancedFilterSetting,
  AdvancedFilterSettingItem,
} from "./filter-setting"

export function newFilterSettingItem(): AdvancedFilterSettingItem {
  return {
    name: "",
    operator: "",
    values: [],
    createdAt: Date.now(),
    deleted: false,
  }
}

export function AdvancedFiltersSetting({
  availableFilters,
  filtersInfo,
  reqFilterInfo,
  filters,
  onUpdateFilters,
  onSubmit,
  onClose,
}: {
  availableFilters: Array<string | { label: string; value: string }>
  filtersInfo?: AdvancedFilterInfo[]
  reqFilterInfo?: (filterName: string) => void
  filters: AdvancedFilterSettingItem[]
  onUpdateFilters?: (items: AdvancedFilterSettingItem[]) => void
  onSubmit?: () => void
  onClose?: () => void
}) {
  const { tt } = useTn("advanced-filters")

  const activeItems = filters.filter((i) => !i.deleted)

  function handleAddItem() {
    onUpdateFilters?.([...filters, newFilterSettingItem()])
  }

  // update `deleted` to true to act as deleted
  function handleUpdateItem(item: AdvancedFilterSettingItem) {
    onUpdateFilters?.(
      filters.map((i) =>
        i.createdAt === item.createdAt ? { ...i, ...item } : i,
      ),
    )
  }

  return (
    <Stack w={720}>
      {activeItems.map((item, i) => (
        <AdvancedFilterSetting
          key={item.createdAt}
          availableFilters={availableFilters || []}
          filter={item}
          filtersInfo={filtersInfo}
          onReqFilterInfo={reqFilterInfo}
          onUpdate={handleUpdateItem}
          // showDelete={activeItems.length > 1}
          conditionLabel={i === 0 ? tt("WHEN") : tt("AND")}
        />
      ))}

      <Group>
        <Button variant="outline" onClick={handleAddItem}>
          {tt("Add Filter")}
        </Button>
        <Group ml="auto">
          <Button variant="default" onClick={onClose}>
            {tt("Cancel")}
          </Button>
          <Button onClick={onSubmit}>{tt("Save")}</Button>
        </Group>
      </Group>
    </Stack>
  )
}
