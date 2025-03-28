import {
  addLangsLocales,
  useTn,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import {
  Button,
  Checkbox,
  Combobox,
  Group,
  UnstyledButton,
  useCombobox,
  useMantineTheme,
} from "@tidbcloud/uikit"
import { IconChevronDown } from "@tidbcloud/uikit/icons"
import { useMemo, useState } from "react"

addLangsLocales({
  zh: {
    __namespace__: "charts-multi-select",
    Search: "搜索",
    "Nothing found": "未找到",
    "Show Hidden": "显示未选",
    "Show All": "显示全部",
    "Select All": "全选",
    "All charts selected": "所有图表已选",
    "{{selected}}/{{all}} charts selected": "{{selected}}/{{all}} 图表已选",
    Reset: "重置",
  },
})

export type ChartsSelectData = {
  category: string
  label: string
  val: string
}[]

export type ChartMultiSelectProps = {
  data: ChartsSelectData
  value: string[]

  onSelect?: (val: string) => void
  onUnSelect?: (val: string) => void
  onReset?: () => void
}

export function ChartMultiSelect({
  data,
  value,

  onSelect,
  onUnSelect,
  onReset,
}: ChartMultiSelectProps) {
  const { tt } = useTn("charts-multi-select")

  const theme = useMantineTheme()
  const [showHidden, setShowHidden] = useState(false)
  const [search, setSearch] = useState("")

  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption()
      setSearch("")
    },
    onDropdownOpen: () => {
      combobox.focusSearchInput()
    },
  })

  const selectedData = data.filter(
    (item) => value.includes(item.val) || value.includes("all"),
  )

  const filteredData = useMemo(() => {
    let d = data.filter(
      (item) =>
        !showHidden || (!value.includes(item.val) && !value.includes("all")),
    )
    const term = search.toLowerCase().trim()
    if (term) {
      d = d.filter(
        (item) =>
          item.val.toLowerCase().includes(term) ||
          item.label.toLowerCase().includes(term),
      )
    }
    return d
  }, [search, showHidden, data, value])

  const categories = Array.from(
    new Set(filteredData.map((item) => item.category)),
  )

  const options = categories.map((c, idx) => (
    <Combobox.Group label={c} key={c + "_" + idx}>
      {filteredData
        .filter((item) => item.category === c)
        .map((item, i) => (
          <Combobox.Option
            value={item.val}
            key={item.val + "_" + i}
            styles={{
              option: {
                "&:hover": {
                  backgroundColor: theme.colors.carbon[3],
                },
              },
            }}
          >
            <Checkbox
              checked={value.includes(item.val) || value.includes("all")}
              onChange={(e) =>
                handleCheckChange(e.currentTarget.checked, item.val)
              }
              label={item.label}
            />
          </Combobox.Option>
        ))}
    </Combobox.Group>
  ))

  function handleCheckChange(checked: boolean, v: string) {
    if (checked) {
      onSelect?.(v)
    } else {
      onUnSelect?.(v)
    }
  }

  return (
    <Combobox
      store={combobox}
      shadow="sm"
      width={260}
      position="bottom-end"
      styles={{
        search: {
          border: "none",
          borderBottom: `1px solid ${theme.colors.carbon[3]}`,
          "&:hover": {
            borderBottom: `1px solid ${theme.colors.carbon[3]}`,
          },
          "&:focus": {
            borderBottom: `1px solid ${theme.colors.carbon[3]}`,
          },
        },
      }}
    >
      <Combobox.Target>
        <Button
          variant="outline"
          rightSection={<IconChevronDown size={16} />}
          onClick={() => combobox.openDropdown()}
        >
          {data.length === selectedData.length
            ? tt("All charts selected")
            : tt("{{selected}}/{{all}} charts selected", {
                selected: selectedData.length,
                all: data.length,
              })}
        </Button>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Search
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder={tt("Search")}
          styles={{
            input: {
              border: "none",
            },
          }}
        />
        <Combobox.Options mah={300} style={{ overflowY: "auto" }}>
          {options.length > 0 ? (
            options
          ) : (
            <Combobox.Empty>{tt("Nothing found")}</Combobox.Empty>
          )}
        </Combobox.Options>
        <Combobox.Footer>
          <Group>
            <Group ml="auto" justify="flex-end" gap="xs">
              <UnstyledButton
                fz="xs"
                c="peacock.7"
                onClick={() => setShowHidden(!showHidden)}
              >
                {showHidden ? tt("Show All") : tt("Show Hidden")}
              </UnstyledButton>
              <UnstyledButton fz="xs" c="peacock.7" onClick={onReset}>
                {tt("Reset")}
              </UnstyledButton>
            </Group>
          </Group>
        </Combobox.Footer>
      </Combobox.Dropdown>
    </Combobox>
  )
}
