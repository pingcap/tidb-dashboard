// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

// Copyright 2014 Manu Martinez-Almeida.

package ginadapter

import (
	"bytes"
	"fmt"
	"io"
	"net/http"

	"github.com/gin-gonic/gin/binding"

	"github.com/pingcap/tidb-dashboard/util/jsonserde"
)

var Binding = jsonBinding{}

type jsonBinding struct{}

func (jsonBinding) Name() string {
	return "json"
}

func (jsonBinding) Bind(req *http.Request, obj interface{}) error {
	if req == nil || req.Body == nil {
		return fmt.Errorf("invalid request")
	}
	return decodeJSON(req.Body, obj)
}

func (jsonBinding) BindBody(body []byte, obj interface{}) error {
	return decodeJSON(bytes.NewReader(body), obj)
}

func decodeJSON(r io.Reader, obj interface{}) error {
	decoder := jsonserde.Default.NewDecoder(r)
	if err := decoder.Decode(obj); err != nil {
		return err
	}
	return validate(obj)
}

func validate(obj interface{}) error {
	if binding.Validator == nil {
		return nil
	}
	return binding.Validator.ValidateStruct(obj)
}
