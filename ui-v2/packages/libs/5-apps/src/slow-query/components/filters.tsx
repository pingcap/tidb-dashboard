import { IconXClose } from "@pingcap-incubator/tidb-dashboard-lib-icons"
import {
  Group,
  Select,
  Text,
  TextInput,
  UnstyledButton,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import { useEffect, useState } from "react"

import { useListUrlState } from "../url-state/list-url-state"
import { useListData } from "../utils/use-data"

const SLOW_QUERY_LIMIT = [100, 200, 500, 1000].map((l) => ({
  value: `${l}`,
  label: `Limit ${l}`,
}))

export function Filters() {
  const { limit, setLimit, term, setTerm, reset } = useListUrlState()

  const [text, setText] = useState(term)
  useEffect(() => {
    setText(term)
  }, [term])

  const { isFetching } = useListData()

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTerm(text)
  }

  function resetFilters() {
    setText("")
    reset()
  }

  const limitSelect = (
    <Select
      value={limit + ""}
      onChange={(v) => setLimit(v!)}
      data={SLOW_QUERY_LIMIT}
      disabled={isFetching}
    />
  )

  const searchInput = (
    <form onSubmit={handleSearchSubmit}>
      <TextInput
        w={320}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="search"
        rightSection={
          !!text && (
            <IconXClose
              style={{ cursor: "pointer" }}
              size={14}
              onClick={() => {
                setText("")
                setTerm(undefined)
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
      sx={(theme) => ({ color: theme.colors.gray[7] })}
    >
      <Text pl={8} size="sm" fw="bold">
        Clear Filters
      </Text>
    </UnstyledButton>
  )

  return (
    <Group>
      {limitSelect}
      {searchInput}
      {resetFiltersBtn}
    </Group>
  )
}
