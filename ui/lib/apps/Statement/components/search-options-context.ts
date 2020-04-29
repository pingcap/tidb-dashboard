import React from 'react'

import { StatementTimeRange } from '@lib/client'

export interface SearchOptions {
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
    curSchemas: [],
    curTimeRange: undefined,
    curStmtTypes: [],
  },
  setSearchOptions: (_options: SearchOptions) => {},
})
