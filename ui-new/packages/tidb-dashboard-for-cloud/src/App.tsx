import React from 'react'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'

export default function () {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<div>tidb dashboard for cloud</div>} />
      </Routes>
    </Router>
  )
}
