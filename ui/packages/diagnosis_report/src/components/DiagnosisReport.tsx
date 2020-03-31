import React from 'react'
import DiagnosisItem from './DiagnosisItem'

export default function DiagnosisReport() {
  const diagnosisData = window.__diagnosis_data__ || []

  return (
    <section className="section">
      <div className="container">
        <h1 className="title is-size-1">TiDB SQL Diagnosis System Report</h1>
        <div>
          <button className="button is-link is-light" id="expand-all-btn">
            Expand All
          </button>
          <button className="button is-link is-light" id="fold-all-btn">
            Fold All
          </button>
        </div>
        {diagnosisData.map((item, idx) => (
          <DiagnosisItem diagnosis={item} key={idx} />
        ))}
      </div>
    </section>
  )
}
