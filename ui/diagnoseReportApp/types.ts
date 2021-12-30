import { createContext } from 'react'

export interface TableRowDef {
  values: string[]
  sub_values: string[][]
  comment: string
}

export interface TableDef {
  category: string[]
  title: string
  comment: string
  column: string[]
  rows: TableRowDef[]
}

export const ExpandContext = createContext(false)
