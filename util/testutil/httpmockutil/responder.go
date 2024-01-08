// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package httpmockutil

import (
	"net/http"
	"strings"

	"github.com/jarcoal/httpmock"
)

func StringResponder(body string) httpmock.Responder {
	return httpmock.NewStringResponder(200, strings.TrimSpace(body))
}

func ChanStringResponder(ch chan string) httpmock.Responder {
	return func(*http.Request) (*http.Response, error) {
		v := <-ch
		return httpmock.NewStringResponse(200, v), nil
	}
}
