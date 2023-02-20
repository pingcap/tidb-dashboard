import React from 'react'
import ReactDOM from 'react-dom'

import 'bulma/css/bulma.css'
import '@fortawesome/fontawesome-free/js/all.js'

import { i18n, distro } from '@pingcap/tidb-dashboard-lib'

import DiagnosisReport from './components/DiagnosisReport'
import translations from './translations'

// for update distro strings resource
import '~/utils/distro/stringsRes'

import './index.css'

function refineDiagnosisData() {
  const diagnosisData = window.__diagnosis_data__ || []

  let preCategory = ''
  diagnosisData.forEach((d) => {
    if (d.category.join('') === preCategory) {
      d.category = []
    } else {
      preCategory = d.category.join('')
    }
  })
  return diagnosisData
}

i18n.addTranslations(translations)
document.title = `${distro().tidb} Dashboard Diagnosis Report`

ReactDOM.render(
  <DiagnosisReport diagnosisTables={refineDiagnosisData()} />,
  document.getElementById('root')
)
