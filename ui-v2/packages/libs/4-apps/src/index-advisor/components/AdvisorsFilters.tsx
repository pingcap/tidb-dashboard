import {
  Group,
  Select,
  Text,
  TextInput,
  UnstyledButton,
} from "@tidbcloud/uikit"
import { IconXClose } from "@tidbcloud/uikit/icons"
import { useEffect, useState } from "react"

import { useIndexAdvisorUrlState } from "../url-state/list-url-state"
import { STATUS_OPTIONS } from "../utils/type"
import { useAdvisorsData } from "../utils/use-data"

export function AdvisorsFilters() {
  const { status, setStatus, search, setSearch, reset } =
    useIndexAdvisorUrlState()
  const { isFetching } = useAdvisorsData()

  const [text, setText] = useState(search)
  useEffect(() => {
    setText(search)
  }, [search])

  function resetFilters() {
    setText("")
    reset()
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSearch(text)
  }

  const statusSelect = (
    <Select
      clearable
      w={200}
      placeholder="All Status"
      data={STATUS_OPTIONS}
      value={status}
      onChange={(e) => {
        setStatus(e ?? undefined)
      }}
      disabled={isFetching}
    />
  )

  const searchInput = (
    <form onSubmit={handleSubmit}>
      <TextInput
        w={320}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Find databases, tables"
        rightSection={
          !!text && (
            <IconXClose
              style={{ cursor: "pointer" }}
              size={14}
              onClick={() => {
                setText("")
                setSearch(undefined)
              }}
            />
          )
        }
        disabled={isFetching}
      />
    </form>
  )

  const resetFiltersBtn = (
    <UnstyledButton
      onClick={resetFilters}
      sx={(theme) => ({ color: theme.colors.carbon[7] })}
    >
      <Text pl={8} size="sm" fw="bold">
        Clear Filters
      </Text>
    </UnstyledButton>
  )

  return (
    <Group>
      {statusSelect}
      {searchInput}
      {resetFiltersBtn}
    </Group>
  )
}
