import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import DiagnosisTable from './DiagnosisTable'
import { ExpandContext, TableDef } from '../types'
import { ALL_LANGUAGES } from '@lib/utils/i18n'

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

type Props = {
  diagnosisTables: TableDef[]
}

export default function DiagnosisReport({ diagnosisTables }: Props) {
  const [expandAll, setExpandAll] = useState(false)
  const { t } = useTranslation()

  return (
    <section className="section">
      <div className="container">
        <h1 className="title is-size-1">{t('diagnosis.title')}</h1>
        <div className="actions">
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
          <div className="dropdown is-hoverable">
            <div className="dropdown-trigger">
              <a className="navbar-link">Tables</a>
            </div>
            <div className="dropdown-menu">
              <div
                className="dropdown-content"
                style={{
                  maxHeight: 500,
                  overflowY: 'scroll',
                }}
              >
                {diagnosisTables.map((item) => (
                  <>
                    <h2 style={{ paddingLeft: 16 }}>
                      {item.Category[0] &&
                        t(`diagnosis.tables.category.${item.Category[0]}`)}
                    </h2>
                    <a
                      style={{ paddingLeft: 28 }}
                      key={item.Title}
                      href={`#${item.Title}`}
                      className="dropdown-item"
                    >
                      {t(`diagnosis.tables.title.${item.Title}`)}
                    </a>
                  </>
                ))}
              </div>
            </div>
          </div>
        </div>

        <ExpandContext.Provider value={expandAll}>
          {diagnosisTables.map((item, idx) => (
            <DiagnosisTable diagnosis={item} key={idx} />
          ))}
        </ExpandContext.Provider>
      </div>
    </section>
  )
}
