// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package rest

import (
	"fmt"
	"strings"

	"github.com/joomcode/errorx"
	"github.com/pingcap/log"
	"go.uber.org/zap/zapcore"
)

type ErrorResponse struct {
	Error    bool   `json:"error"`
	Message  string `json:"message"`
	Code     string `json:"code"`
	FullText string `json:"full_text"`
}

// buildSimpleMessage traverses through the error chain and builds a simple error message.
func buildSimpleMessage(err error) string {
	if err == nil {
		return ""
	}

	mb := strings.Builder{}
	isFirstMsg := true
	cause := err
	for cause != nil {
		causeEx := errorx.Cast(cause)
		var msg string
		if causeEx == nil {
			// cause exists, but is not an errorx type
			msg = cause.Error()
		} else {
			msg = causeEx.Message()
		}

		if len(msg) > 0 {
			if !isFirstMsg {
				mb.WriteString(", caused by: ")
			}
			mb.WriteString(msg)
			isFirstMsg = false
		}

		if causeEx == nil {
			// This is already an error interface. It is not possible to get cause any more.
			break
		}
		cause = causeEx.Cause()
	}

	if isFirstMsg {
		// No message is successfully extracted
		return err.Error()
	}
	return mb.String()
}

func buildCode(err error) string {
	if err == nil {
		return ""
	}

	cause := err
	for cause != nil {
		causeEx := errorx.Cast(cause)
		if causeEx == nil {
			break
		}
		if causeEx.Type().RootNamespace().FullName() == "synthetic" {
			// Ignore standard transparent types.
			// User-defined transparent types are not detectable, however.
			cause = causeEx.Cause()
		} else {
			return causeEx.Type().FullName()
		}
	}
	return errInternal.FullName()
}

// Note: This function only exists for compatibility during the refactoring. Before refactoring,
// all error codes begin with "error.". We will migrate more and more error codes to not begin with "error.".
// Finally, after all error codes are migrated, this function is no longer needed.
func removeErrorPrefix(code string) string {
	return strings.TrimPrefix(code, "error.")
}

func buildDetailMessage(err error) string {
	if err == nil {
		return ""
	}
	return fmt.Sprintf("%+v", errorx.EnsureStackTrace(err))
}

func NewErrorResponse(err error) ErrorResponse {
	logLevel := log.GetLevel()
	fullText := ""
	if logLevel == zapcore.DebugLevel {
		fullText = buildDetailMessage(err)
	}
	return ErrorResponse{
		Error:   true,
		Message: buildSimpleMessage(err),
		Code:    removeErrorPrefix(buildCode(err)),
		// For security reasons, we need to hide detailed stacktrace info in prod.
		FullText: fullText,
	}
}
