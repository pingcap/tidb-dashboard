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

const Table = `
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
