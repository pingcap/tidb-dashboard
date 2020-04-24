import { createContext } from 'react'

export interface TableRowDef {
  Values: string[]
  SubValues: string[][]
  ratio: number
  Comment: string
}

export interface TableDef {
  Category: string[]
  Title: string
  Comment: string
  joinColumns: number[]
  compareColumns: number[]
  Column: string[]
  Rows: TableRowDef[]
}

export const ExpandContext = createContext(false)
