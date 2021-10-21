package resterror

import (
	"fmt"
	"strings"

	"github.com/joomcode/errorx"
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
			// Ignore standard transparent types..
			// User-defined transparent types are not detectable however.
			cause = causeEx.Cause()
		} else {
			return causeEx.Type().FullName()
		}
	}
	return errInternal.FullName()
}

func NewErrorResponse(err error) ErrorResponse {
	return ErrorResponse{
		Error:    true,
		Message:  buildSimpleMessage(err),
		Code:     buildCode(err),
		FullText: fmt.Sprintf("%+v", err),
	}
}
