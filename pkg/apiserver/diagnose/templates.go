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

package diagnose

import (
	"github.com/pingcap-incubator/tidb-dashboard/pkg/utils"
)

var TemplateInfos = []utils.TemplateInfo{
	{Name: "sql-diagnosis/index", Text: TemplateIndex},
	{Name: "sql-diagnosis/table", Text: TemplateTable},
}

const TemplateIndex = `
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
              const subValueRows = tbodyEl.querySelectorAll('tr[data-row="' + curRow + ''"]')
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

const TemplateTable = `
{{ define "sql-diagnosis/table" }}
  <div class="report-container">
    {{ range $cIdx, $c := .Category }}
      {{ if eq $cIdx 0 }}
        {{ if . }}
          <h1 class="title is-size-2">{{.}}</h1>
        {{ end }}
      {{ else if eq $cIdx 1 }}
        {{ if . }}
          <h1 class="title is-size-3">{{.}}</h1>
        {{ end }}
      {{ else if eq $cIdx 2 }}
        {{ if . }}
          <h1 class="title is-size-4">{{.}}</h1>
        {{ end }}
      {{ else }}
        {{ if . }}
          <h1 class="title is-size-5">{{.}}</h1>
        {{ end }}
      {{ end }}
    {{ end }}
    <h3 class="is-size-4">{{ .Title }}</h3>
    {{ if .CommentEN }}
      <p>{{ .CommentEN }}</p>
    {{ end }}
    <table class="table is-bordered is-hoverable is-narrow is-fullwidth">
      <thead>
        <tr>
          {{ range .Column }}
            <th>{{ . }}</th>
          {{ end }}
        </tr>
      </thead>
      <tbody>
        {{ range $rowIdx, $row := .Rows }}
          {{ $len := len .SubValues }}
          <tr>
            {{ range $vIdx, $v := .Values }}
              <td>
                {{ . }}
                {{ if and ($row.Comment) (eq $vIdx 0) }}
                  <div class="dropdown is-hoverable is-up">
                    <div class="dropdown-trigger">
                      <span class="icon has-text-info">
                        <i class="fas fa-info-circle"></i>
                      </span>
                    </div>
                    <div class="dropdown-menu">
                      <div class="dropdown-content">
                        <div class="dropdown-item">
                          <p>{{$row.Comment}}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                {{ end }}
                {{ if and (gt $len 0) (eq $vIdx 0)}}
                  &nbsp;&nbsp;&nbsp;
                  <a href="javascript:void(0)"
                     class="subvalues-toggle"
                     data-row="{{$rowIdx}}">expand</a>
                {{ end }}
              </td>
            {{ end }}
          </tr>
          {{ if gt $len 0 }}
            {{ range .SubValues }}
              <tr class="subvalues fold" data-row="{{$rowIdx}}">
                {{ range $cIdx, $v := . }}
                  {{ if eq $cIdx 0 }}
                    <td>|-- {{ . }}</td>
                  {{ else }}
                    <td>{{ . }}</td>
                  {{ end }}
                {{ end }}
              </tr>
            {{ end }}
          {{ end }}
        {{ end }}
      </tbody>
    </table>
  </div>
{{ end }}
`
