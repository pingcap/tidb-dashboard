export interface TableRowDef {
  Values: string[]
  SubValues: string[][]
  ratio: number
  Comment: string
}

export interface TableDef {
  Category: string[]
  Title: string
  CommentEN: string
  CommentCN: string
  joinColumns: number[]
  compareColumns: number[]
  Column: string[]
  Rows: TableRowDef[]
}
