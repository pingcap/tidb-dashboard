import {
  addLangsLocales,
  useTn,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import {
  ActionIcon,
  Checkbox,
  Combobox,
  Group,
  Typography,
  UnstyledButton,
  useCombobox,
  useMantineTheme,
} from "@tidbcloud/uikit"
import { IconSettings04 } from "@tidbcloud/uikit/icons"
import { useMemo, useState } from "react"

addLangsLocales({
  zh: {
    "cols-multi-select": {
      texts: {
        "Search columns...": "搜索列...",
        "Nothing found": "未找到",
        "{{count}} selected": "{{count}} 已选",
        "Show Selected": "显示已选",
        "Show All": "显示全部",
        "Select All": "全选",
        Reset: "重置",
      },
    },
  },
})

export type ColumnMultiSelectProps = {
  data: { label: string; val: string }[]
  value: string[]
  onChange: (value: string[]) => void
  onReset?: () => void
}

export function ColumnMultiSelect({
  data,
  value,
  onChange,
  onReset,
}: ColumnMultiSelectProps) {
  const { tt } = useTn("cols-multi-select")

  const theme = useMantineTheme()
  const [showSelected, setShowSelected] = useState(false)
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
        !showSelected || value.includes(item.val) || value.includes("all"),
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
  }, [search, showSelected, data, value])

  const options = filteredData.map((item) => (
    <Combobox.Option
      value={item.val}
      key={item.val}
      styles={{
        option: {
          "&:hover": {
            backgroundColor: theme.colors.carbon[3],
          },
        },
      }}
    >
      <Group wrap="nowrap" gap="xs">
        <Checkbox
          checked={value.includes(item.val) || value.includes("all")}
          onChange={() => {}}
        />
        <Typography truncate>{item.label}</Typography>
      </Group>
    </Combobox.Option>
  ))

  function handleOptionSelect(val: string) {
    const selected = selectedData.map((item) => item.val)
    const newValue = selected.includes(val)
      ? selected.filter((v) => v !== val)
      : [...selected, val]
    onChange(newValue)
  }

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={handleOptionSelect}
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
        <ActionIcon onClick={() => combobox.toggleDropdown()}>
          <IconSettings04 size={16} />
        </ActionIcon>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Search
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder={tt("Search columns...")}
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
            <Typography fz="xs" c="dimmed">
              {tt("{{count}} selected", {
                count: selectedData.length,
              })}
            </Typography>
            <Group ml="auto" justify="flex-end" gap="xs">
              <UnstyledButton
                fz="xs"
                c="peacock"
                onClick={() => setShowSelected(!showSelected)}
              >
                {showSelected ? tt("Show All") : tt("Show Selected")}
              </UnstyledButton>
              <UnstyledButton
                fz="xs"
                c="peacock"
                onClick={() => onChange(["all"])}
              >
                {tt("Select All")}
              </UnstyledButton>
              <UnstyledButton fz="xs" c="peacock" onClick={onReset}>
                {tt("Reset")}
              </UnstyledButton>
            </Group>
          </Group>
        </Combobox.Footer>
      </Combobox.Dropdown>
    </Combobox>
  )
}
