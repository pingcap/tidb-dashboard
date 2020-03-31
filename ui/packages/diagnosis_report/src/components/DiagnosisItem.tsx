import React from 'react'
import { TableDef } from '../types'

type Props = {
  diagnosis: TableDef
}

export default function DiagnosisItem({ diagnosis }: Props) {
  const { Category, Title, CommentEN, Column, Rows } = diagnosis

  return (
    <div className="report-container">
      {Category.map((c, idx) => (
        <h1 className={`title is-size-${idx + 2}`}>{c}</h1>
      ))}
    </div>
  )
}
