// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package httpclient

import (
	"github.com/pingcap/log"
	"go.uber.org/zap"
)

// execInfo is a copy of necessary information during the execution.
// It can be used to print logs when something happens.
type execInfo struct {
	kindTag    string
	reqURL     string
	reqMethod  string
	respStatus string
	respBody   string
}

func (e *execInfo) Warn(msg string, err error) {
	fields := []zap.Field{
		zap.String("kindTag", e.kindTag),
		zap.String("url", e.reqURL),
		zap.String("method", e.reqMethod),
	}
	if e.respStatus != "" {
		fields = append(fields, zap.String("responseStatus", e.respStatus))
	}
	if e.respBody != "" {
		fields = append(fields, zap.String("responseBody", e.respBody))
	}
	fields = append(fields, zap.Error(err))
	log.Warn(msg, fields...)
}
