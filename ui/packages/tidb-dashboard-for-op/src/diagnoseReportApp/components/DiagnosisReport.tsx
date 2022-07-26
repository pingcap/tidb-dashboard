import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { i18n } from '@pingcap/tidb-dashboard-lib'

import DiagnosisTable from './DiagnosisTable'
import { ExpandContext, TableDef } from '../types'

function LangDropdown() {
  const { i18n: i18next } = useTranslation()
  return (
    <div className="select">
      <select
        onChange={(e) => i18next.changeLanguage(e.target.value)}
        defaultValue={i18next.language}
      >
        {Object.keys(i18n.ALL_LANGUAGES).map((langKey) => (
          <option value={langKey} key={langKey}>
            {i18n.ALL_LANGUAGES[langKey]}
          </option>
        ))}
      </select>
    </div>
  )
}

type Props = {
  diagnosisTables: TableDef[]
}

function TablesNavMenu({ diagnosisTables }: Props) {
  const { t } = useTranslation()
  return (
    <div className="dropdown is-hoverable">
      <div className="dropdown-trigger">
        <a className="navbar-link">{t('diagnosis.all_tables')}</a>
      </div>
      <div className="dropdown-menu">
        <div
          className="dropdown-content"
          style={{
            maxHeight: 500,
            overflowY: 'scroll'
          }}
        >
          {diagnosisTables.map((item) => (
            <React.Fragment key={item.title}>
              <h2 style={{ paddingLeft: 16 }}>
                {item.category[0] &&
                  t(`diagnosis.tables.category.${item.category[0]}`)}
              </h2>
              <a
                style={{ paddingLeft: 32 }}
                className="dropdown-item"
                href={`#${item.title}`}
              >
                {t(`diagnosis.tables.title.${item.title}`)}
              </a>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
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
          <TablesNavMenu diagnosisTables={diagnosisTables} />
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
