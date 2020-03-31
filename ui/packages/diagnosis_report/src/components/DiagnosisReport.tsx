import React, { useState } from 'react'
import DiagnosisTable from './DiagnosisTable'
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
            style={{ marginRight: 12 }}
            onClick={() => setExpandAll(true)}
          >
            Expand All
          </button>
          <button
            className="button is-link is-light"
            onClick={() => setExpandAll(false)}
          >
            Fold All
          </button>
        </div>

        <ExpandContext.Provider value={expandAll}>
          {diagnosisData.map((item, idx) => (
            <DiagnosisTable diagnosis={item} key={idx} />
          ))}
        </ExpandContext.Provider>
      </div>
    </section>
  )
}
