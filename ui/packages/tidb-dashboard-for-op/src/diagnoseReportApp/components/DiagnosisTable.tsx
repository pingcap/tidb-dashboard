import React, { useContext, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'

import { distro } from '@pingcap/tidb-dashboard-lib'

import { TableDef, ExpandContext, TableRowDef } from '../types'

const lowerDistro = Object.keys(distro).reduce((accu, cur) => {
  if (typeof distro[cur] === 'string') {
    accu[cur] = distro[cur].toLowerCase()
  }
  return accu
}, {})

const distroRegs = Object.keys(lowerDistro).reduce((accu, cur) => {
  accu[cur] = new RegExp(cur, 'ig')
  return accu
}, {})

function replaceDistro(oriStr: string): string {
  let retStr = oriStr
  Object.keys(lowerDistro).forEach((key) => {
    retStr = retStr.replace(distroRegs[key], lowerDistro[key])
  })
  return retStr
}

function DiagnosisRow({ row }: { row: TableRowDef }) {
  const outsideExpand = useContext(ExpandContext)
  const [internalExpand, setInternalExpand] = useState(false)
  const { t, i18n } = useTranslation()

  // when outsideExpand changes, reset the internalExpand to the same as outsideExpand
  useEffect(() => {
    setInternalExpand(outsideExpand)
  }, [outsideExpand])

  function showRowName(rowName: string) {
    const i18nKey = `diagnosis.tables.table.name.${rowName}`
    if (i18n.exists(i18nKey)) {
      return t(i18nKey)
    }
    return replaceDistro(rowName)
  }

  function showOthers(val: string | number) {
    if (typeof val === 'string') {
      return replaceDistro(val)
    }
    return val
  }

  return (
    <>
      <tr>
        {(row.values || []).map((val, valIdx) => (
          <td key={valIdx}>
            {valIdx === 0 ? showRowName(val) : showOthers(val)}
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
            {valIdx === 0 && (row.sub_values || []).length > 0 && (
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
      {(row.sub_values || []).map((subVals, subValsIdx) => (
        <tr
          key={subValsIdx}
          className={`subvalues ${!internalExpand && 'fold'}`}
        >
          {subVals.map((subVal, subValIdx) => (
            <td key={subValIdx}>
              {subValIdx === 0 && '|-- '}
              {showOthers(subVal)}
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
  const { category, title, column, rows } = diagnosis
  const { t } = useTranslation()

  return (
    <div className="report-container" id={title}>
      {(category || []).map((c, idx) => (
        <h1 className={`title is-size-${idx + 2}`} key={idx}>
          {c && t(`diagnosis.tables.category.${c}`)}
        </h1>
      ))}
      <h3 className="is-size-4">{t(`diagnosis.tables.title.${title}`)}</h3>
      <ReactMarkdown>
        {t(`diagnosis.tables.comment.${title}`, '')}
      </ReactMarkdown>
      <table
        className="table is-bordered is-hoverable is-narrow is-fullwidth"
        style={{ position: 'relative' }}
      >
        <thead>
          <tr>
            {column.map((col, colIdx) => (
              <th className="table-header-row" key={colIdx}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(rows || []).map((row, rowIdx) => (
            <DiagnosisRow key={rowIdx} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
