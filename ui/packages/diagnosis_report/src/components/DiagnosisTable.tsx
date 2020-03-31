import React, { useContext, useState, useEffect } from 'react'
import { TableDef, ExpandContext, TableRowDef } from '../types'

function DiagnosisRow({ row }: { row: TableRowDef }) {
  const outsideExpand = useContext(ExpandContext)
  const [internalExpand, setInternalExpand] = useState(false)

  // when outsideExpand changes, reset the internalExpand to the same as outsideExpand
  useEffect(() => {
    setInternalExpand(outsideExpand)
  }, [outsideExpand])

  return (
    <>
      <tr>
        {(row.Values || []).map((val, valIdx) => (
          <td key={valIdx}>
            {val}
            {valIdx === 0 && row.Comment && (
              <div className="dropdown is-hoverable is-up">
                <div className="dropdown-trigger">
                  <span className="icon has-text-info">
                    <i className="fas fa-info-circle"></i>
                  </span>
                </div>
                <div className="dropdown-menu">
                  <div className="dropdown-content">
                    <div className="dropdown-item">
                      <p>{row.Comment}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {valIdx === 0 && (row.SubValues || []).length > 0 && (
              <>
                &nbsp;&nbsp;&nbsp;
                <a
                  className="subvalues-toggle"
                  onClick={() => setInternalExpand(!internalExpand)}
                >
                  {internalExpand ? 'fold' : 'expand'}
                </a>
              </>
            )}
          </td>
        ))}
      </tr>
      {(row.SubValues || []).map((subVals, subValsIdx) => (
        <tr
          key={subValsIdx}
          className={`subvalues ${!internalExpand && 'fold'}`}
        >
          {subVals.map((subVal, subValIdx) => (
            <td key={subValIdx}>
              {subValIdx === 0 && '|-- '}
              {subVal}
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

type Props = {
  diagnosis: TableDef
}

export default function DiagnosisTable({ diagnosis }: Props) {
  const { Category, Title, CommentEN, Column, Rows } = diagnosis

  return (
    <div className="report-container">
      {(Category || []).map((c, idx) => (
        <h1 className={`title is-size-${idx + 2}`} key={idx}>
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
          {(Rows || []).map((row, rowIdx) => (
            <DiagnosisRow key={rowIdx} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
