// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

// Copyright 2014 Manu Martinez-Almeida.

package ginjson

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/pingcap/tidb-dashboard/util/jsonserde"
)

var jsonContentType = []string{"application/json; charset=utf-8"}

func writeContentType(w http.ResponseWriter, value []string) {
	header := w.Header()
	if val := header["Content-Type"]; len(val) == 0 {
		header["Content-Type"] = value
	}
}

type jsonRenderer struct {
	Data interface{}
}

func (j jsonRenderer) Render(w http.ResponseWriter) error {
	writeContentType(w, jsonContentType)
	jsonBytes, err := jsonserde.Default.Marshal(j.Data)
	if err != nil {
		return err
	}
	_, err = w.Write(jsonBytes)
	return err
}

func (j jsonRenderer) WriteContentType(w http.ResponseWriter) {
	writeContentType(w, jsonContentType)
}

func Render(c *gin.Context, code int, obj interface{}) {
	c.Render(code, jsonRenderer{Data: obj})
}
