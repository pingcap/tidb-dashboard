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
        <h1 className={`title is-size-${idx + 2}`} key={c}>
          {c}
        </h1>
      ))}
      <h3 className="is-size-4">{Title}</h3>
      {CommentEN && <p>{CommentEN}</p>}
      <table className="table is-bordered is-hoverable is-narrow is-fullwidth">
        <thead>
          <tr>
            {Column.map((col, colIdx) => (
              <th key={colIdx}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Rows.map((row, rowIdx) => (
            <React.Fragment key={rowIdx}>
              <tr>
                {(row.Values || []).map((val, valIdx) => (
                  <td key={valIdx}>{val}</td>
                ))}
              </tr>
              {(row.SubValues || []).map((subVals, subValsIdx) => (
                <tr key={subValsIdx} className="subvalues">
                  {subVals.map((subVal, subValIdx) => (
                    <td key={subValIdx}>{subVal}</td>
                  ))}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
