// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package httpclient

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"runtime"
	"runtime/debug"
	"strings"
	"time"

	"github.com/go-resty/resty/v2"
	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap/tidb-dashboard/util/israce"
	"github.com/pingcap/tidb-dashboard/util/nocopy"
)

const (
	defaultTimeout = time.Minute * 5 // Just a default long enough timeout.
)

type requestUpdateFn func(r *resty.Request)

type clientUpdateFn func(c *resty.Client)

// LazyResponse provides access to the response body and response headers in convenient ways.
// No request is actually sent until LazyResponse is read.
type LazyResponse struct {
	nocopy.NoCopy

	// The source request object to execute. It is a clone of the original request object
	// to allow concurrent executions.
	requestSnapshot *LazyRequest

	// stackAtNew is the stack when Response is created. It is only available when Golang race mode is enabled.
	// This is used to report the missing `Close()` calls.
	stackAtNew []byte

	// Fields below are set only after the request is actually sent.
	isExecuted                  bool
	executedResponseWithoutBody *http.Response
	executedResponseBody        io.ReadCloser
	executedError               error
	executeInfo                 *execInfo // Contains some execution information. Will be logged when error happens.
}

func newResponse(sourceSnapshot *LazyRequest) *LazyResponse {
	er := &LazyResponse{
		requestSnapshot: sourceSnapshot,
	}
	runtime.SetFinalizer(er, (*LazyResponse).finalize)
	if israce.Enabled {
		er.stackAtNew = debug.Stack()
	}
	return er
}

func (lResp *LazyResponse) doExecutionOnce() {
	if lResp.isExecuted {
		return
	}

	client := resty.NewWithClient(&http.Client{
		Transport: lResp.requestSnapshot.transport,
	})
	client.SetRedirectPolicy(resty.FlexibleRedirectPolicy(10))
	client.SetTimeout(defaultTimeout)
	if lResp.requestSnapshot.debugTag != "" {
		client.SetPreRequestHook(func(_ *resty.Client, rr *http.Request) error {
			log.Info("Send request",
				zap.String("kindTag", lResp.requestSnapshot.kindTag),
				zap.String("debugTag", lResp.requestSnapshot.debugTag),
				zap.String("method", rr.Method),
				zap.String("url", rr.URL.String()))
			return nil
		})
	}

	for _, op := range lResp.requestSnapshot.opsC {
		op(client)
	}
	restyReq := client.R()
	restyReq.SetDoNotParseResponse(true)
	for _, op := range lResp.requestSnapshot.opsR {
		op(restyReq)
	}

	info := &execInfo{kindTag: lResp.requestSnapshot.kindTag}
	info.reqURL = restyReq.URL
	info.reqMethod = restyReq.Method

	restyResp, err := restyReq.Send()
	if err != nil {
		// Turn all errors into ErrRequestFailed.
		err = ErrRequestFailed.WrapWithNoMessage(err)
	}

	if (restyResp == nil || restyResp.RawResponse == nil) && err == nil {
		// Response and error come from 3rd-party libraries, we are not sure about this.
		// Let's try out best to catch it.
		err = ErrRequestFailed.New("%s %s (%s): internal error, no response",
			restyResp.Request.Method,
			restyResp.Request.URL,
			lResp.requestSnapshot.kindTag)
		restyResp = nil
	}

	if !restyResp.IsSuccess() && err == nil {
		// Turn all non success responses to an error, like 301 Moved Permanently and 404 Not Found.
		// Note: IsError != !IsSuccess.
		err = ErrRequestFailed.New("%s %s (%s): Response status %d",
			restyResp.Request.Method,
			restyResp.Request.URL,
			lResp.requestSnapshot.kindTag,
			restyResp.StatusCode())
	}

	if err != nil {
		// Turn response into nil when there is an error.
		if restyResp != nil && restyResp.RawResponse != nil {
			data, _ := io.ReadAll(restyResp.RawResponse.Body)
			_ = restyResp.RawResponse.Body.Close()
			info.respStatus = restyResp.Status()
			info.respBody = string(data)
			restyResp = nil
		}
		info.Warn("Request failed", err)
	}

	if restyResp != nil && restyResp.RawResponse != nil {
		lResp.executedResponseBody = restyResp.RawResponse.Body
		lResp.executedResponseWithoutBody = restyResp.RawResponse
		restyResp.RawResponse.Body = nil
	} else {
		lResp.executedResponseBody = nil
		lResp.executedResponseWithoutBody = nil
	}
	lResp.executedError = err
	lResp.executeInfo = info
	lResp.isExecuted = true

	// The request is executed, no need to schedule a check for the execution any more.
	runtime.SetFinalizer(lResp, nil)
}

func (lResp *LazyResponse) close() {
	_ = lResp.executedResponseBody.Close()
}

// Finish closes the response and discard any unreaded response body. Read is not possible after that.
// The returned raw response does not have a body. To read the body, call PipeBody, ReadBodyAsBytes,
// ReadBodyAsString or ReadBodyAsJSON.
// If the response status code is not a success status, an error will be returned.
func (lResp *LazyResponse) Finish() (respNoBody *http.Response, err error) {
	lResp.doExecutionOnce()
	if lResp.executedError != nil {
		return nil, lResp.executedError
	}
	respNoBody = lResp.executedResponseWithoutBody
	lResp.close()
	return
}

// PipeBody pipes the body of the response to a writer.
// If the response status code is not a success status, an error will be returned.
func (lResp *LazyResponse) PipeBody(w io.Writer) (written int64, respNoBody *http.Response, err error) {
	lResp.doExecutionOnce()
	if lResp.executedError != nil {
		return 0, nil, lResp.executedError
	}
	respNoBody = lResp.executedResponseWithoutBody
	written, err = io.Copy(w, lResp.executedResponseBody)
	if err != nil {
		respNoBody = nil
		err = ErrRequestFailed.WrapWithNoMessage(err)
		lResp.executeInfo.Warn("Request failed", err)
	}
	lResp.close()
	return
}

// ReadBodyAsBytes reads all body content of the response to a byte slice.
// If the response status code is not a success status, an error will be returned.
func (lResp *LazyResponse) ReadBodyAsBytes() (bytes []byte, respNoBody *http.Response, err error) {
	lResp.doExecutionOnce()
	if lResp.executedError != nil {
		return nil, nil, lResp.executedError
	}
	respNoBody = lResp.executedResponseWithoutBody
	bytes, err = io.ReadAll(lResp.executedResponseBody)
	if err != nil {
		bytes = nil
		respNoBody = nil
		err = ErrRequestFailed.WrapWithNoMessage(err)
		lResp.executeInfo.Warn("Request failed", err)
	}
	lResp.close()
	return
}

// ReadBodyAsString reads all body content of the response to a string.
// If the response status code is not a success status, an error will be returned.
func (lResp *LazyResponse) ReadBodyAsString() (data string, respNoBody *http.Response, err error) {
	bytes, resp, err := lResp.ReadBodyAsBytes()
	if err != nil {
		return "", nil, err
	}
	return strings.TrimSpace(string(bytes)), resp, nil
}

// ReadBodyAsJSON reads all body content of the response as JSON and does unmarshal.
// If the response status code is not a success status, an error will be returned.
func (lResp *LazyResponse) ReadBodyAsJSON(destination interface{}) (respNoBody *http.Response, err error) {
	bytes, resp, err := lResp.ReadBodyAsBytes()
	if err != nil {
		return nil, err
	}
	err = json.Unmarshal(bytes, destination)
	if err != nil {
		err = ErrRequestFailed.WrapWithNoMessage(err)
		ei := *lResp.executeInfo
		ei.respStatus = lResp.executedResponseWithoutBody.Status
		ei.respBody = string(bytes)
		ei.Warn("Request failed", err)
		return nil, err
	}
	return resp, nil
}

func (lResp *LazyResponse) finalize() {
	if israce.Enabled {
		// try to catch incorrect usages
		_, _ = os.Stderr.Write(lResp.stackAtNew)
		panic(fmt.Sprintf("%T is not used correctly, one of PipeBody(), ReadBodyAsBytes(), ReadBodyAsString(), ReadBodyAsJSON() or Finish() must be called", lResp))
	}
	// If a LazyResponse is GCed without actually sending the request, then we can just do nothing.
	// There is even no need to close the response body, since the request is not sent.
}
