import React from 'react'

import { StatementTimeRange } from '@lib/client'

export interface SearchOptions {
  curInstance: string | undefined
  curSchemas: string[]
  curTimeRange: StatementTimeRange | undefined
  curStmtTypes: string[]
}

export interface SearchContextType {
  searchOptions: SearchOptions
  setSearchOptions: (otpions: SearchOptions) => void
}

export const SearchContext = React.createContext<SearchContextType>({
  searchOptions: {
    curInstance: undefined,
    curSchemas: [],
    curTimeRange: undefined,
    curStmtTypes: [],
  },
  setSearchOptions: (_options: SearchOptions) => {},
})
