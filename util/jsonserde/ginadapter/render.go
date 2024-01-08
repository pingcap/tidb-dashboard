// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

// Copyright 2014 Manu Martinez-Almeida.

package ginadapter

import (
	"net/http"

	"github.com/pingcap/tidb-dashboard/util/jsonserde"
)

var jsonContentType = []string{"application/json; charset=utf-8"}

func writeContentType(w http.ResponseWriter, value []string) {
	header := w.Header()
	if val := header["Content-Type"]; len(val) == 0 {
		header["Content-Type"] = value
	}
}

type Renderer struct {
	Data interface{}
}

func (j Renderer) Render(w http.ResponseWriter) error {
	writeContentType(w, jsonContentType)
	jsonBytes, err := jsonserde.Default.Marshal(j.Data)
	if err != nil {
		return err
	}
	_, err = w.Write(jsonBytes)
	return err
}

func (j Renderer) WriteContentType(w http.ResponseWriter) {
	writeContentType(w, jsonContentType)
}
