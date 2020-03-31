import React from 'react'
import ReactDOM from 'react-dom'
import DiagnosisReport from './components/DiagnosisReport'

import 'bulma/css/bulma.css'
import './index.css'

console.log(window.__diagnosis_data__)

ReactDOM.render(<DiagnosisReport />, document.getElementById('root'))
