import React from 'react'
import ReactDOM from 'react-dom'

import 'bulma/css/bulma.css'
import '@fortawesome/fontawesome-free/js/all.js'

import * as i18n from '@lib/utils/i18n'
import DiagnosisReport from './components/DiagnosisReport'
import './index.css'

function refineDiagnosisData() {
  const diagnosisData = window.__diagnosis_data__ || []
  console.log(window.__diagnosis_data__)

  let preCategory = ''
  diagnosisData.forEach((d) => {
    if (d.Category.join('') === preCategory) {
      d.Category = []
    } else {
      preCategory = d.Category.join('')
    }
  })
  return diagnosisData
}

i18n.addTranslations(require.context('./translations/', false, /\.yaml$/))

ReactDOM.render(
  <DiagnosisReport diagnosisTables={refineDiagnosisData()} />,
  document.getElementById('root')
)
