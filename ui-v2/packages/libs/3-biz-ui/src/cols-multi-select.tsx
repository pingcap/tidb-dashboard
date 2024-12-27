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
import { useState } from "react"

export type ColumnMultiSelectProps = {
  data: string[]
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

  const selectedData = data.filter((item) => value.includes(item))

  const filteredData = data
    .filter((item) => item.toLowerCase().includes(search.toLowerCase().trim()))
    .filter((item) => !showSelected || value.includes(item))

  const options = filteredData.map((item) => (
    <Combobox.Option
      value={item}
      key={item}
      styles={{
        option: {
          "&:hover": {
            backgroundColor: theme.colors.carbon[3],
          },
        },
      }}
    >
      <Group wrap="nowrap" gap="xs">
        <Checkbox checked={value.includes(item)} />
        <Typography truncate>{item}</Typography>
      </Group>
    </Combobox.Option>
  ))

  function handleOptionSelect(val: string) {
    const newValue = value.includes(val)
      ? value.filter((v) => v !== val)
      : [...value, val]
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
          placeholder={`Search columns...`}
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
            <Combobox.Empty>Nothing found</Combobox.Empty>
          )}
        </Combobox.Options>
        <Combobox.Footer>
          <Group>
            <Typography fz="xs" c="dimmed">
              {selectedData.length} selected
            </Typography>
            <Group ml="auto" justify="flex-end">
              <UnstyledButton
                fz="xs"
                c="peacock"
                onClick={() => setShowSelected(!showSelected)}
              >
                {showSelected ? "Show All" : "Show Selected"}
              </UnstyledButton>
              <UnstyledButton fz="xs" c="peacock" onClick={onReset}>
                Reset
              </UnstyledButton>
            </Group>
          </Group>
        </Combobox.Footer>
      </Combobox.Dropdown>
    </Combobox>
  )
}
