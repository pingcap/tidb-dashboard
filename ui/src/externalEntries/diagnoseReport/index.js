import React from 'react'
import ReactDOM from 'react-dom'

import 'bulma/css/bulma.css'
import '@fortawesome/fontawesome-free/js/all.js'

import * as i18nUtil from '@/utils/i18n'
import DiagnosisReport from './components/DiagnosisReport'
import './index.css'

console.log(window.__diagnosis_data__)

i18nUtil.init()
i18nUtil.addTranslations(require.context('./translations/', false, /\.yaml$/))

ReactDOM.render(<DiagnosisReport />, document.getElementById('root'))
