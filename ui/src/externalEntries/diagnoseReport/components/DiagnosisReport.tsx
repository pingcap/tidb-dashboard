import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import DiagnosisTable from './DiagnosisTable'
import { ExpandContext } from '../types'
import { ALL_LANGUAGES } from '@/utils/i18n'

function LangDropdown() {
  const { i18n } = useTranslation()
  return (
    <div className="select">
      <select
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        defaultValue={i18n.language}
      >
        {Object.keys(ALL_LANGUAGES).map((langKey) => (
          <option value={langKey} key={langKey}>
            {ALL_LANGUAGES[langKey]}
          </option>
        ))}
      </select>
    </div>
  )
}

export default function DiagnosisReport() {
  const diagnosisData = window['__diagnosis_data__'] || []
  const [expandAll, setExpandAll] = useState(false)
  const { t } = useTranslation()

  return (
    <section className="section">
      <div className="container">
        <h1 className="title is-size-1">{t('diagnosis.title')}</h1>
        <div>
          <LangDropdown />
          <button
            className="button is-link is-light"
            style={{ marginRight: 12, marginLeft: 12 }}
            onClick={() => setExpandAll(true)}
          >
            {t('diagnosis.expand_all')}
          </button>
          <button
            className="button is-link is-light"
            onClick={() => setExpandAll(false)}
          >
            {t('diagnosis.fold_all')}
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
