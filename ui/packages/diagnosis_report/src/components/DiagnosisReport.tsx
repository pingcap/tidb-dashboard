import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import DiagnosisTable from './DiagnosisTable'
import { ExpandContext } from '../types'

export default function DiagnosisReport() {
  const diagnosisData = window.__diagnosis_data__ || []
  const [expandAll, setExpandAll] = useState(false)
  const { t } = useTranslation()

  return (
    <section className="section">
      <div className="container">
        <h1 className="title is-size-1">{t('diagnosis.title')}</h1>
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
