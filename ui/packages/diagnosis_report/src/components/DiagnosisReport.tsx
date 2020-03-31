import React, { useState } from 'react'
import DiagnosisItem from './DiagnosisItem'
import { ExpandContext } from '../types'

export default function DiagnosisReport() {
  const diagnosisData = window.__diagnosis_data__ || []
  const [expandAll, setExpandAll] = useState(false)

  return (
    <section className="section">
      <div className="container">
        <h1 className="title is-size-1">TiDB SQL Diagnosis System Report</h1>
        <div>
          <button
            className="button is-link is-light"
            id="expand-all-btn"
            onClick={() => setExpandAll(true)}
          >
            Expand All
          </button>
          <button
            className="button is-link is-light"
            id="fold-all-btn"
            onClick={() => setExpandAll(false)}
          >
            Fold All
          </button>
        </div>
        <ExpandContext.Provider value={expandAll}>
          {diagnosisData.map((item, idx) => (
            <DiagnosisItem diagnosis={item} key={idx} />
          ))}
        </ExpandContext.Provider>
      </div>
    </section>
  )
}
