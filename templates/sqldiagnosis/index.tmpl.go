// Copyright 2020 PingCAP, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// See the License for the specific language governing permissions and
// limitations under the License.

package sqldiagnosis

const Index = `
{{ define "sql-diagnosis/index" }}
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bulma@0.8.0/css/bulma.min.css"/>
      <script defer src="https://use.fontawesome.com/releases/v5.3.1/js/all.js"></script>
      <title>Diagnose Report</title>
      <style>
        .report-container {
          margin-bottom: 16px;
        }
        tr.subvalues {
          background-color: lightcyan;
        }
        tr.subvalues.fold {
          display: none;
        }
        .subvalues-toggle {
          display: inline-block;
          width: 60px;
        }
      </style>
    </head>
    <body>
      <section class="section">
        <div class="container">
          <h1 class="title is-size-1">TiDB SQL Diagnosis System Report</h1>
          <div>
            <button class="button is-link is-light" id="expand-all-btn">
            Expand All
          </button>
            <button class="button is-link is-light" id="fold-all-btn">
            Fold All
          </button>
          </div>
          {{ range . }}
            {{ template "sql-diagnosis/table" . }}
          {{ end }}
        </div>
      </section>

      <script>
        const toggleBtns = document.querySelectorAll('.subvalues-toggle')
        const expandAllBtn = document.querySelector('#expand-all-btn')
        const foldAllBtn = document.querySelector('#fold-all-btn')

        function handleToggleDetail() {
          toggleBtns.forEach(btn => {
            btn.onclick = function () {
              const curRow = btn.getAttribute('data-row')
              const tbodyEl = btn.parentNode.parentNode.parentNode
              const subValueRows = tbodyEl.querySelectorAll(` + "`tr[data-row=\"${curRow}\"]`" + `)
              subValueRows.forEach(row => row.classList.toggle('fold'))

              if (btn.innerHTML === 'expand') {
                btn.innerHTML = 'fold'
              } else {
                btn.innerHTML = 'expand'
              }
            }
          })
        }
        handleToggleDetail()

        // action: 'expand' or 'fold'
        function expandOrFoldAll(action) {
          toggleBtns.forEach(btn => {
            if (btn.innerHTML === action) {
              btn.click()
            }
          })
        }
        expandAllBtn.onclick = function () {
          expandOrFoldAll('expand')
        }
        foldAllBtn.onclick = function () {
          expandOrFoldAll('fold')
        }
      </script>
    </body>
  </html>
{{ end }}
`
