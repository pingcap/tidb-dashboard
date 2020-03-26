import React from 'react'

import { StatementTimeRange } from './statement-types'

export interface SearchOptions {
  curInstance: string | undefined
  curSchemas: string[]
  curTimeRange: StatementTimeRange | undefined
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
  },
  setSearchOptions: (_options: SearchOptions) => {},
})
