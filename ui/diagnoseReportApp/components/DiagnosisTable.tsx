import React, { useContext, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { TableDef, ExpandContext, TableRowDef } from '../types'

function DiagnosisRow({ row }: { row: TableRowDef }) {
  const outsideExpand = useContext(ExpandContext)
  const [internalExpand, setInternalExpand] = useState(false)
  const { t } = useTranslation()

  // when outsideExpand changes, reset the internalExpand to the same as outsideExpand
  useEffect(() => {
    setInternalExpand(outsideExpand)
  }, [outsideExpand])

  return (
    <>
      <tr>
        {(row.Values || []).map((val, valIdx) => (
          <td key={valIdx}>
            {t(`diagnosis.tables.table.name.${val}`, val)}
            {valIdx === 0 &&
              t(`diagnosis.tables.table.comment.${val}`, '') !== '' && (
                <div className="dropdown is-hoverable is-up">
                  <div className="dropdown-trigger">
                    <span className="icon has-text-info">
                      <i className="fas fa-info-circle"></i>
                    </span>
                  </div>
                  <div className="dropdown-menu">
                    <div className="dropdown-content">
                      <div className="dropdown-item">
                        <p>{t(`diagnosis.tables.table.comment.${val}`)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            {valIdx === 0 && (row.SubValues || []).length > 0 && (
              <>
                &nbsp;&nbsp;&nbsp;
                <span
                  className="subvalues-toggle"
                  onClick={() => setInternalExpand(!internalExpand)}
                >
                  {internalExpand ? t('diagnosis.fold') : t('diagnosis.expand')}
                </span>
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
  const { Category, Title, Column, Rows } = diagnosis
  const { t } = useTranslation()

  return (
    <div className="report-container" id={Title}>
      {(Category || []).map((c, idx) => (
        <h1 className={`title is-size-${idx + 2}`} key={idx}>
          {c && t(`diagnosis.tables.category.${c}`)}
        </h1>
      ))}
      <h3 className="is-size-4">{t(`diagnosis.tables.title.${Title}`)}</h3>
      {<p>{t(`diagnosis.tables.comment.${Title}`, '')}</p>}
      <table
        className="table is-bordered is-hoverable is-narrow is-fullwidth"
        style={{ position: 'relative' }}
      >
        <thead>
          <tr>
            {Column.map((col, colIdx) => (
              <th className="table-header-row" key={colIdx}>
                {col}
              </th>
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
