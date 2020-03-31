import React from 'react'

export default function Report() {
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
      </div>
    </section>
  )
}
