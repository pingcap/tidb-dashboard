// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package httpclient

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/joomcode/errorx"
	"github.com/stretchr/testify/require"
	"go.uber.org/atomic"
)

func TestReadBodyAsString(t *testing.T) {
	requestTimes := atomic.Int32{}
	responseStatus := atomic.Int32{}

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		requestTimes.Inc()
		w.WriteHeader(int(responseStatus.Load()))
		_, _ = fmt.Fprintf(w, "Basically OK, Req #%d", requestTimes.Load())
	}))
	defer ts.Close()

	client := New(Config{})

	responseStatus.Store(200)
	req := client.LR()
	resp := req.Get(ts.URL)
	responseStatus.Store(202)                       // Lazy request
	require.Equal(t, int32(0), requestTimes.Load()) // Lazy request
	dataStr, rawResp, err := resp.ReadBodyAsString()
	require.Equal(t, int32(1), requestTimes.Load())
	require.NoError(t, err)
	require.Equal(t, "Basically OK, Req #1", dataStr)
	require.Nil(t, rawResp.Body)
	require.Equal(t, 202, rawResp.StatusCode) // Due to lazy request, we should get 202

	// Read again should result in error
	dataStrE, rawRespE, err := resp.ReadBodyAsString()
	require.Equal(t, int32(1), requestTimes.Load())
	require.Contains(t, err.Error(), "read on closed response body")
	require.Empty(t, dataStrE)
	require.Nil(t, rawRespE)

	// Other kind of read operations should also result in error
	bytesE, rawRespE, err := resp.ReadBodyAsBytes()
	require.Equal(t, int32(1), requestTimes.Load())
	require.Contains(t, err.Error(), "read on closed response body")
	require.Nil(t, bytesE)
	require.Nil(t, rawRespE)

	// Test sending a new request via Get() over the same request again
	responseStatus.Store(201)
	resp = req.Get(ts.URL)
	require.Equal(t, int32(1), requestTimes.Load())
	dataStr2, rawResp2, err := resp.ReadBodyAsString()
	require.Equal(t, int32(2), requestTimes.Load())
	require.NoError(t, err)
	require.Equal(t, "Basically OK, Req #2", dataStr2)
	require.Nil(t, rawResp2.Body)
	require.Equal(t, 202, rawResp.StatusCode) // The previous response should not be changed by a new request
	require.Equal(t, 201, rawResp2.StatusCode)

	// Sending a new request via LR() over the same client
	responseStatus.Store(200)
	resp = client.LR().Get(ts.URL)
	require.Equal(t, int32(2), requestTimes.Load())
	dataStr3, rawResp3, err := resp.ReadBodyAsString()
	require.Equal(t, int32(3), requestTimes.Load())
	require.NoError(t, err)
	require.Equal(t, "Basically OK, Req #3", dataStr3)
	require.Nil(t, rawResp3.Body)
	require.Equal(t, 202, rawResp.StatusCode)
	require.Equal(t, 201, rawResp2.StatusCode)
	require.Equal(t, 200, rawResp3.StatusCode)

	// Sending a new request via creating a new client
	client2 := New(Config{})
	responseStatus.Store(202)
	resp = client2.LR().Get(ts.URL)
	require.Equal(t, int32(3), requestTimes.Load())
	dataStr4, rawResp4, err := resp.ReadBodyAsString()
	require.Equal(t, int32(4), requestTimes.Load())
	require.NoError(t, err)
	require.Equal(t, "Basically OK, Req #4", dataStr4)
	require.Nil(t, rawResp4.Body)
	require.Equal(t, 202, rawResp.StatusCode)
	require.Equal(t, 201, rawResp2.StatusCode)
	require.Equal(t, 200, rawResp3.StatusCode)
	require.Equal(t, 202, rawResp4.StatusCode)
}

func TestFinish(t *testing.T) {
	requestTimes := atomic.Int32{}
	responseStatus := atomic.Int32{}

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		requestTimes.Inc()
		w.WriteHeader(int(responseStatus.Load()))
		_, _ = fmt.Fprintf(w, "Basically OK, Req #%d", requestTimes.Load())
	}))
	defer ts.Close()

	client := New(Config{})
	responseStatus.Store(200)

	resp := client.LR().Get(ts.URL)
	responseStatus.Store(202)                       // Lazy request
	require.Equal(t, int32(0), requestTimes.Load()) // Lazy request
	rawResp, err := resp.Finish()
	require.Equal(t, int32(1), requestTimes.Load())
	require.NoError(t, err)
	require.Nil(t, rawResp.Body)
	require.Equal(t, 202, rawResp.StatusCode)

	// Call Finish() again should not send a new request
	rawResp, err = resp.Finish()
	require.Equal(t, int32(1), requestTimes.Load())
	require.NoError(t, err)
	require.Nil(t, rawResp.Body)
	require.Equal(t, 202, rawResp.StatusCode)

	// Read after Finish() should become errors
	dataStrE, rawRespE, err := resp.ReadBodyAsString()
	require.Equal(t, int32(1), requestTimes.Load())
	require.Contains(t, err.Error(), "read on closed response body")
	require.Empty(t, dataStrE)
	require.Nil(t, rawRespE)
	bytesE, rawRespE, err := resp.ReadBodyAsBytes()
	require.Equal(t, int32(1), requestTimes.Load())
	require.Contains(t, err.Error(), "read on closed response body")
	require.Nil(t, bytesE)
	require.Nil(t, rawRespE)

	// Finish() after read is fine.
	resp = client.LR().Get(ts.URL)
	responseStatus.Store(200)
	require.Equal(t, int32(1), requestTimes.Load())
	dataStr, rawResp, err := resp.ReadBodyAsString()
	require.Equal(t, int32(2), requestTimes.Load())
	require.NoError(t, err)
	require.Equal(t, "Basically OK, Req #2", dataStr)
	require.Nil(t, rawResp.Body)
	require.Equal(t, 200, rawResp.StatusCode)
	rawResp2, err := resp.Finish()
	require.Equal(t, int32(2), requestTimes.Load())
	require.NoError(t, err)
	require.Same(t, rawResp, rawResp2)
}

func TestReadBodyAsJSON(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = fmt.Fprintln(w, `{"foo":"bar"}`)
	}))
	defer ts.Close()

	// Unmarshal into map
	client := New(Config{})
	var respMap map[string]interface{}
	rawResp, err := client.LR().Get(ts.URL).ReadBodyAsJSON(&respMap)
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, rawResp.StatusCode)
	expectedMap := map[string]interface{}{
		"foo": "bar",
	}
	require.Equal(t, expectedMap, respMap)

	// Unmarshal into struct
	type Response struct {
		Foo string `json:"foo"`
	}
	var respStruct Response
	req := client.LR().Get(ts.URL)
	rawResp, err = req.ReadBodyAsJSON(&respStruct)
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, rawResp.StatusCode)
	require.Equal(t, Response{Foo: "bar"}, respStruct)
}

func TestReadBodyAsJSON_UnmarshalFailure(t *testing.T) {
	requestTimes := atomic.Int32{}
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		requestTimes.Inc()
		_, _ = fmt.Fprintln(w, `bad_json`)
	}))
	defer ts.Close()

	client := New(Config{})

	var respMap map[string]interface{}
	require.Equal(t, int32(0), requestTimes.Load())
	req := client.LR().Get(ts.URL)
	rawResp, err := req.ReadBodyAsJSON(&respMap)
	require.Equal(t, int32(1), requestTimes.Load())
	require.Contains(t, err.Error(), "invalid character")
	require.Nil(t, rawResp)
	require.Nil(t, respMap)

	// Read JSON again should not send new request
	rawResp, err = req.ReadBodyAsJSON(&respMap)
	require.Equal(t, int32(1), requestTimes.Load())
	require.Contains(t, err.Error(), "read on closed response body")
	require.Nil(t, rawResp)
	require.Nil(t, respMap)

	// Finish should success without sending new requests
	// Unlike other Read errors, for unmarshal errors, Finish() will succeed since an OK response is read successfully
	rawResp, err = req.Finish()
	require.Equal(t, int32(1), requestTimes.Load())
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, rawResp.StatusCode)
}

type myWriter struct {
	writedBytes int
	writeCalled int
	errorRaised int
}

func (w *myWriter) Write(p []byte) (int, error) {
	w.writeCalled++
	if w.writedBytes > 5 {
		w.errorRaised++
		return 0, fmt.Errorf("write too many bytes")
	}
	w.writedBytes += len(p)
	return len(p), nil
}

func TestPipeBody(t *testing.T) {
	requestTimes := atomic.Int32{}
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		requestTimes.Inc()
		_, _ = fmt.Fprintln(w, "Hello world")
	}))
	defer ts.Close()

	client := New(Config{})

	buf := bytes.Buffer{}
	require.Equal(t, int32(0), requestTimes.Load())
	req := client.LR().Get(ts.URL)
	wBytes, rawResp, err := req.PipeBody(&buf)
	require.Equal(t, int32(1), requestTimes.Load())
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, rawResp.StatusCode)
	require.Equal(t, "Hello world\n", buf.String())
	require.Equal(t, int64(12), wBytes)

	// The copy chunk size is large, so that there will be only one write call to the writer
	w := myWriter{}
	require.Equal(t, int32(1), requestTimes.Load())
	wBytes, rawResp, err = client.LR().Get(ts.URL).PipeBody(&w)
	require.Equal(t, int32(2), requestTimes.Load())
	require.Equal(t, int64(12), wBytes)
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, rawResp.StatusCode)
	require.Equal(t, 1, w.writeCalled)
	require.Equal(t, 12, w.writedBytes)
	require.Equal(t, 0, w.errorRaised)

	// Now the server write data chunk by chunk...
	ctx, cancel := context.WithCancel(context.Background())
	ts = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		requestTimes.Inc()
		_, _ = w.Write([]byte("Partial..."))
		w.(http.Flusher).Flush()
		select {
		case <-ctx.Done():
			return
		case <-time.After(1 * time.Second):
			_, _ = fmt.Fprintln(w, "Done")
		}
	}))
	defer ts.Close()
	defer cancel()

	// PipeData should produce data chunk by chunk
	w = myWriter{}
	require.Equal(t, int32(2), requestTimes.Load())
	resp := client.LR().Get(ts.URL)
	wBytes, rawResp, err = resp.PipeBody(&w)
	require.Equal(t, int32(3), requestTimes.Load())
	require.Equal(t, int64(10), wBytes)
	require.Error(t, err)
	require.Contains(t, err.Error(), "write too many bytes")
	require.Nil(t, rawResp)
	require.Equal(t, 2, w.writeCalled)
	require.Equal(t, 10, w.writedBytes) // The size of the first chunk
	require.Equal(t, 1, w.errorRaised)
	// Call PipeBody again should fail due to response is closed
	wBytes, rawResp, err = resp.PipeBody(&w)
	require.Equal(t, int32(3), requestTimes.Load())
	require.Equal(t, int64(0), wBytes)
	require.Error(t, err)
	require.Contains(t, err.Error(), "read on closed response body")
	require.Nil(t, rawResp)
	require.Equal(t, 2, w.writeCalled) // Unchanged
	require.Equal(t, 10, w.writedBytes)
	require.Equal(t, 1, w.errorRaised)

	// PipeBody should copy all data when there are multiple chunks from the server
	buf = bytes.Buffer{}
	require.Equal(t, int32(3), requestTimes.Load())
	req = client.LR().Get(ts.URL)
	wBytes, rawResp, err = req.PipeBody(&buf)
	require.Equal(t, int32(4), requestTimes.Load())
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, rawResp.StatusCode)
	require.Equal(t, "Partial...Done\n", buf.String())
	require.Equal(t, int64(15), wBytes)
}

func TestResponseHeader(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Add("foo", "bar")
		w.WriteHeader(http.StatusAlreadyReported)
		_, _ = fmt.Fprintln(w, "Fine!")
	}))
	defer ts.Close()

	client := New(Config{})
	resp := client.LR().Get(ts.URL)
	rawResp, err := resp.Finish()
	require.NoError(t, err)
	require.Equal(t, http.StatusAlreadyReported, rawResp.StatusCode)
	require.Equal(t, "bar", rawResp.Header.Get("foo"))
}

func TestSetURL(t *testing.T) {
	ts1 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = fmt.Fprintln(w, "Result from server 1")
	}))
	defer ts1.Close()

	ts2 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = fmt.Fprintln(w, "Result from server 2")
	}))
	defer ts2.Close()

	client := New(Config{})
	req := client.LR()

	// SetXxx should make changes in place
	r1 := req.SetURL(ts1.URL)
	r2 := req.SetURL(ts2.URL)
	require.Same(t, r1, r2)
	dataStr, _, err := r1.Send().ReadBodyAsString()
	require.NoError(t, err)
	require.Equal(t, "Result from server 2", dataStr)
	dataStr, _, err = r2.Send().ReadBodyAsString()
	require.NoError(t, err)
	require.Equal(t, "Result from server 2", dataStr)

	r1.SetURL(ts1.URL)
	dataStr, _, err = r2.Send().ReadBodyAsString()
	require.NoError(t, err)
	require.Equal(t, "Result from server 1", dataStr)

	// SetURL should not affect another request in the same client
	req2 := client.LR()
	req2.SetURL(ts2.URL)
	dataStr, _, err = r1.Send().ReadBodyAsString()
	require.NoError(t, err)
	require.Equal(t, "Result from server 1", dataStr)
	dataStr, _, err = r2.Send().ReadBodyAsString()
	require.NoError(t, err)
	require.Equal(t, "Result from server 1", dataStr)
	dataStr, _, err = req2.Send().ReadBodyAsString()
	require.NoError(t, err)
	require.Equal(t, "Result from server 2", dataStr)
	dataStr, _, err = req.Send().ReadBodyAsString()
	require.NoError(t, err)
	require.Equal(t, "Result from server 1", dataStr)
	dataStr, _, err = r1.Send().ReadBodyAsString()
	require.NoError(t, err)
	require.Equal(t, "Result from server 1", dataStr)
}

func TestLR(t *testing.T) {
	client := New(Config{})
	req1 := client.LR()
	req2 := client.LR()
	require.NotSame(t, req1, req2)
}

func TestGet(t *testing.T) {
	ts1 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = fmt.Fprintln(w, "Result from server 1")
	}))
	defer ts1.Close()

	ts2 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = fmt.Fprintln(w, "Result from server 2")
	}))
	defer ts2.Close()

	client := New(Config{})

	// "Get" from different requests should not affect each other
	resp1 := client.LR().Get(ts1.URL)
	resp2 := client.LR().Get(ts2.URL)
	dataStr, _, err := resp1.ReadBodyAsString()
	require.NoError(t, err)
	require.Equal(t, "Result from server 1", dataStr)
	dataStr, _, err = resp2.ReadBodyAsString()
	require.NoError(t, err)
	require.Equal(t, "Result from server 2", dataStr)

	// "Get" should not affect each other
	req := client.LR()
	resp1 = req.Get(ts1.URL)
	resp2 = req.Get(ts2.URL)
	dataStr, _, err = resp1.ReadBodyAsString()
	require.NoError(t, err)
	require.Equal(t, "Result from server 1", dataStr)
	dataStr, _, err = resp2.ReadBodyAsString()
	require.NoError(t, err)
	require.Equal(t, "Result from server 2", dataStr)
	resp3 := req.Get(ts1.URL)
	dataStr, _, err = resp3.ReadBodyAsString()
	require.NoError(t, err)
	require.Equal(t, "Result from server 1", dataStr)

	// "Get()" should not affect the previous "SetURL()" call
	req = client.LR()
	req.SetURL(ts1.URL)
	dataStr, _, err = req.Get(ts2.URL).ReadBodyAsString()
	require.NoError(t, err)
	require.Equal(t, "Result from server 2", dataStr)
	dataStr, _, err = req.Send().ReadBodyAsString()
	require.NoError(t, err)
	require.Equal(t, "Result from server 1", dataStr)

	// "SetURL()" should not affect the previous "Get()" call
	req = client.LR()
	resp1 = req.Get(ts1.URL)
	req.SetURL(ts2.URL)
	dataStr, _, err = resp1.ReadBodyAsString()
	require.NoError(t, err)
	require.Equal(t, "Result from server 1", dataStr)
	dataStr, _, err = req.Send().ReadBodyAsString()
	require.NoError(t, err)
	require.Equal(t, "Result from server 2", dataStr)
}

func TestPost(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		_, _ = fmt.Fprintf(w, "Body is %s", string(body))
	}))
	defer ts.Close()

	client := New(Config{})

	// SetBody from different requests should not affect each other
	r1 := client.LR().SetBody("foo")
	dataStr, _, err := r1.Post(ts.URL).ReadBodyAsString()
	require.NoError(t, err)
	require.Equal(t, "Body is foo", dataStr)

	r2 := client.LR().SetBody("bar")
	dataStr, _, err = r2.Post(ts.URL).ReadBodyAsString()
	require.NoError(t, err)
	require.Equal(t, "Body is bar", dataStr)

	dataStr, _, err = r1.Post(ts.URL).ReadBodyAsString()
	require.NoError(t, err)
	require.Equal(t, "Body is foo", dataStr)
}

func TestSetHeader(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = fmt.Fprintln(w, r.Header.Get("X-Test"))
	}))
	defer ts.Close()

	client := New(Config{})
	req := client.LR().SetHeader("X-Test", "foobar")

	// SetHeader from different requests should not affect each other
	dataStr, _, err := req.Get(ts.URL).ReadBodyAsString()
	require.NoError(t, err)
	require.Equal(t, "foobar", dataStr)

	dataStr, _, err = client.LR().Get(ts.URL).ReadBodyAsString()
	require.NoError(t, err)
	require.Equal(t, "", dataStr)

	dataStr, _, err = req.Get(ts.URL).ReadBodyAsString()
	require.NoError(t, err)
	require.Equal(t, "foobar", dataStr)

	// SetHeader after Get should not taking effect
	req = client.LR()
	resp := req.Get(ts.URL)
	req.SetHeader("X-Test", "hello")
	dataStr, _, err = resp.ReadBodyAsString()
	require.NoError(t, err)
	require.Equal(t, "", dataStr)

	resp = req.Get(ts.URL)
	dataStr, _, err = resp.ReadBodyAsString()
	require.NoError(t, err)
	require.Equal(t, "hello", dataStr)
}

func TestSetTLSAwareBaseURL(t *testing.T) {
	ts1 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = fmt.Fprintln(w, "ts1"+r.URL.Path)
	}))
	defer ts1.Close()

	ts2 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = fmt.Fprintln(w, "ts2"+r.URL.Path)
	}))
	defer ts2.Close()

	client := New(Config{})
	dataStr, _, err := client.LR().SetTLSAwareBaseURL(ts1.URL).Get("/foo").ReadBodyAsString()
	require.NoError(t, err)
	require.Equal(t, "ts1/foo", dataStr)

	// base url can be overwritten
	dataStr, _, err = client.LR().SetTLSAwareBaseURL(ts1.URL).Get(ts2.URL).ReadBodyAsString()
	require.NoError(t, err)
	require.Equal(t, "ts2/", dataStr)

	// Rewrite http:// to https:// if TLS config is specified
	tsTLS := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = fmt.Fprintln(w, "tsTLS"+r.URL.Path)
	}))
	defer tsTLS.Close()

	httpURL := "http://" + tsTLS.Listener.Addr().String()

	certpool := x509.NewCertPool()
	certpool.AddCert(tsTLS.Certificate())
	client = New(Config{TLSConfig: &tls.Config{
		RootCAs: certpool,
	}}) // #nosec G402
	_, _, err = client.LR().Get(httpURL).ReadBodyAsString()
	require.Error(t, err)
	require.Contains(t, err.Error(), "Response status 400")

	dataStr, _, err = client.LR().SetTLSAwareBaseURL(httpURL).Get("/bar").ReadBodyAsString()
	require.NoError(t, err)
	require.Equal(t, "tsTLS/bar", dataStr)
}

func TestFailureStatusCode(t *testing.T) {
	requestTimes := atomic.Int32{}
	responseStatus := atomic.Int32{}

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		requestTimes.Inc()
		w.WriteHeader(int(responseStatus.Load()))
		_, _ = fmt.Fprintf(w, "Fail from req #%d", requestTimes.Load())
	}))
	defer ts.Close()

	// Although request succeeded, failure status code will turn into errors by design.

	client := New(Config{})

	// ReadBodyAsBytes should fail
	responseStatus.Store(500)
	require.Equal(t, int32(0), requestTimes.Load())
	bytes, rawResp, err := client.LR().Get(ts.URL).ReadBodyAsBytes()
	require.Equal(t, int32(1), requestTimes.Load())
	require.True(t, errorx.IsOfType(err, ErrRequestFailed))
	require.Contains(t, err.Error(), "Response status 500")
	require.Nil(t, bytes)
	require.Nil(t, rawResp)

	// ReadBodyAsString should return empty string
	responseStatus.Store(400)
	require.Equal(t, int32(1), requestTimes.Load())
	resp := client.LR().Get(ts.URL)
	dataStr, rawResp, err := resp.ReadBodyAsString()
	require.Equal(t, int32(2), requestTimes.Load())
	require.True(t, errorx.IsOfType(err, ErrRequestFailed))
	require.Contains(t, err.Error(), "Response status 400")
	require.Empty(t, dataStr)
	require.Nil(t, rawResp)
	// Read again after failure should not send request again
	responseStatus.Store(500)
	dataStr, rawResp, err = resp.ReadBodyAsString()
	require.Equal(t, int32(2), requestTimes.Load())
	require.True(t, errorx.IsOfType(err, ErrRequestFailed))
	require.Contains(t, err.Error(), "Response status 400")
	require.Empty(t, dataStr)
	require.Nil(t, rawResp)

	// ReadBodyAsJSON should fail
	var respMap map[string]interface{}
	resp = client.LR().Get(ts.URL)
	rawResp, err = resp.ReadBodyAsJSON(respMap)
	require.Equal(t, int32(3), requestTimes.Load())
	require.True(t, errorx.IsOfType(err, ErrRequestFailed))
	require.Contains(t, err.Error(), "Response status 500")
	require.Empty(t, dataStr)
	require.Nil(t, rawResp)
	require.Nil(t, respMap)
	rawResp, err = resp.ReadBodyAsJSON(respMap)
	require.Equal(t, int32(3), requestTimes.Load())
	require.True(t, errorx.IsOfType(err, ErrRequestFailed))
	require.Contains(t, err.Error(), "Response status 500")
	require.Empty(t, dataStr)
	require.Nil(t, rawResp)
	require.Nil(t, respMap)

	// Finish should fail
	responseStatus.Store(404)
	require.Equal(t, int32(3), requestTimes.Load())
	resp = client.LR().Get(ts.URL)
	rawResp, err = resp.Finish()
	require.Equal(t, int32(4), requestTimes.Load())
	require.True(t, errorx.IsOfType(err, ErrRequestFailed))
	require.Contains(t, err.Error(), "Response status 404")
	require.Nil(t, rawResp)
	// Finish again after failure should not send request again
	responseStatus.Store(200)
	rawResp, err = resp.Finish()
	require.Equal(t, int32(4), requestTimes.Load())
	require.True(t, errorx.IsOfType(err, ErrRequestFailed))
	require.Contains(t, err.Error(), "Response status 404")
	require.Nil(t, rawResp)
	// Mix Finish() and ReadBodyAsString()
	responseStatus.Store(403)
	dataStr, rawResp, err = resp.ReadBodyAsString()
	require.Equal(t, int32(4), requestTimes.Load())
	require.True(t, errorx.IsOfType(err, ErrRequestFailed))
	require.Contains(t, err.Error(), "Response status 404")
	require.Empty(t, dataStr)
	require.Nil(t, rawResp)
	responseStatus.Store(200)
	rawResp, err = resp.Finish()
	require.Equal(t, int32(4), requestTimes.Load())
	require.True(t, errorx.IsOfType(err, ErrRequestFailed))
	require.Contains(t, err.Error(), "Response status 404")
	require.Nil(t, rawResp)
}

func TestBadServer(t *testing.T) {
	requestTimes := atomic.Int32{}
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)
	go func() {
		for {
			conn, err := listener.Accept()
			if err != nil {
				return
			}
			requestTimes.Inc()
			_, _ = conn.Write([]byte("Hello"))
			_ = conn.Close()
		}
	}()
	defer func() {
		_ = listener.Close()
	}()
	url := fmt.Sprintf("http://%s/foo", listener.Addr().String())

	client := New(Config{})

	// ReadBodyAsString should return empty string
	require.Equal(t, int32(0), requestTimes.Load())
	resp := client.LR().Get(url)
	dataStr, rawResp, err := resp.ReadBodyAsString()
	require.Equal(t, int32(1), requestTimes.Load())
	require.True(t, errorx.IsOfType(err, ErrRequestFailed))
	require.Empty(t, dataStr)
	require.Nil(t, rawResp)
	// Call multiple times
	dataStr, rawResp, err = resp.ReadBodyAsString()
	require.Equal(t, int32(1), requestTimes.Load())
	require.True(t, errorx.IsOfType(err, ErrRequestFailed))
	require.Empty(t, dataStr)
	require.Nil(t, rawResp)

	// Response should fail
	require.Equal(t, int32(1), requestTimes.Load())
	resp = client.LR().Get(url)
	rawResp, err = resp.Finish()
	require.Equal(t, int32(2), requestTimes.Load())
	require.True(t, errorx.IsOfType(err, ErrRequestFailed))
	require.Nil(t, rawResp)
	// Call multiple times
	rawResp, err = resp.Finish()
	require.Equal(t, int32(2), requestTimes.Load())
	require.True(t, errorx.IsOfType(err, ErrRequestFailed))
	require.Nil(t, rawResp)
	// Mix Finish() and ReadBodyAsString()
	dataStr, rawResp, err = resp.ReadBodyAsString()
	require.Equal(t, int32(2), requestTimes.Load())
	require.True(t, errorx.IsOfType(err, ErrRequestFailed))
	require.Empty(t, dataStr)
	require.Nil(t, rawResp)
	rawResp, err = resp.Finish()
	require.Equal(t, int32(2), requestTimes.Load())
	require.True(t, errorx.IsOfType(err, ErrRequestFailed))
	require.Nil(t, rawResp)

	// ReadBodyASJSON should fail
	require.Equal(t, int32(2), requestTimes.Load())
	resp = client.LR().Get(url)
	var respMap map[string]interface{}
	rawResp, err = resp.ReadBodyAsJSON(respMap)
	require.Equal(t, int32(3), requestTimes.Load())
	require.True(t, errorx.IsOfType(err, ErrRequestFailed))
	require.Nil(t, rawResp)
	require.Nil(t, respMap)
	// Call multiple times
	rawResp, err = resp.ReadBodyAsJSON(respMap)
	require.Equal(t, int32(3), requestTimes.Load())
	require.True(t, errorx.IsOfType(err, ErrRequestFailed))
	require.Nil(t, rawResp)
	require.Nil(t, respMap)
}

func TestBadScheme(t *testing.T) {
	client := New(Config{})
	bytes, rawResp, err := client.LR().Get("foo://abc.com").ReadBodyAsBytes()
	require.True(t, errorx.IsOfType(err, ErrRequestFailed))
	require.Contains(t, err.Error(), `unsupported protocol scheme "foo"`)
	require.Nil(t, bytes)
	require.Nil(t, rawResp)

	rawResp, err = client.LR().Get("bar://abc.com").Finish()
	require.True(t, errorx.IsOfType(err, ErrRequestFailed))
	require.Contains(t, err.Error(), `unsupported protocol scheme "bar"`)
	require.Nil(t, rawResp)
}

func TestConnectionReuse(t *testing.T) {
	newConn := atomic.Int32{}
	closedConn := atomic.Int32{}

	requestTimes := atomic.Int32{}
	ts := httptest.NewUnstartedServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		requestTimes.Inc()
		_, _ = fmt.Fprintf(w, "Req #%d", requestTimes.Load())
	}))
	ts.Config.ConnState = func(_ net.Conn, cs http.ConnState) {
		switch cs {
		case http.StateNew:
			newConn.Inc()
		case http.StateHijacked, http.StateClosed:
			closedConn.Inc()
		default:
			// we do not care other states
		}
	}
	ts.Start()
	defer ts.Close()

	require.Equal(t, int32(0), newConn.Load())
	require.Equal(t, int32(0), closedConn.Load())

	client := New(Config{})
	dataStr, _, err := client.LR().Get(ts.URL).ReadBodyAsString()
	require.NoError(t, err)
	require.Equal(t, "Req #1", dataStr)
	require.Equal(t, int32(1), newConn.Load())
	require.Equal(t, int32(0), closedConn.Load())

	// Use the same client to send request, the connection is expected to be reused
	dataStr, _, err = client.LR().Get(ts.URL).ReadBodyAsString()
	require.NoError(t, err)
	require.Equal(t, "Req #2", dataStr)
	require.Equal(t, int32(1), newConn.Load())
	require.Equal(t, int32(0), closedConn.Load())

	// A new client should create a new connection
	client2 := New(Config{})
	dataStr, _, err = client2.LR().Get(ts.URL).ReadBodyAsString()
	require.NoError(t, err)
	require.Equal(t, "Req #3", dataStr)
	require.Equal(t, int32(2), newConn.Load())
	require.Equal(t, int32(0), closedConn.Load())

	// Connections are reused
	dataStr, _, err = client.LR().Get(ts.URL).ReadBodyAsString()
	require.NoError(t, err)
	require.Equal(t, "Req #4", dataStr)
	require.Equal(t, int32(2), newConn.Load())
	require.Equal(t, int32(0), closedConn.Load())
	dataStr, _, err = client2.LR().Get(ts.URL).ReadBodyAsString()
	require.NoError(t, err)
	require.Equal(t, "Req #5", dataStr)
	require.Equal(t, int32(2), newConn.Load())
	require.Equal(t, int32(0), closedConn.Load())
}

func TestClone(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		m := make(map[string]string)
		for header, value := range r.Header {
			if strings.HasPrefix(header, "X-") {
				m[header] = value[0]
			}
		}
		j, _ := json.Marshal(m)
		_, _ = w.Write(j)
	}))
	defer ts.Close()

	client := New(Config{})

	req1 := client.LR()
	req1.SetHeader("x-req1header1", "value1")

	req2 := req1.Clone()
	// After clone, they will not affect each other
	req1.SetHeader("x-req1header2", "value2")
	req2.SetHeader("x-req2header1", "value1")

	dataStr, _, err := req1.Get(ts.URL).ReadBodyAsString()
	require.NoError(t, err)
	require.JSONEq(t, `{"X-Req1header1":"value1","X-Req1header2":"value2"}`, dataStr)

	dataStr, _, err = req2.Get(ts.URL).ReadBodyAsString()
	require.NoError(t, err)
	require.JSONEq(t, `{"X-Req1header1":"value1","X-Req2header1":"value1"}`, dataStr)
}

func TestTimeoutHeader(t *testing.T) {
	requestTimes := atomic.Int32{}
	ctx, cancel := context.WithCancel(context.Background())
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		requestTimes.Inc()
		select {
		case <-ctx.Done():
			w.WriteHeader(http.StatusGatewayTimeout)
		case <-time.After(1 * time.Second):
			_, _ = fmt.Fprintln(w, "OK")
		}
	}))
	defer ts.Close()
	defer cancel()

	client := New(Config{})
	tBegin := time.Now()
	require.Equal(t, int32(0), requestTimes.Load())
	resp := client.LR().SetTimeout(100 * time.Millisecond).Get(ts.URL)
	_, rawResp, err := resp.ReadBodyAsString()
	require.Equal(t, int32(1), requestTimes.Load())
	require.Less(t, time.Since(tBegin), 300*time.Millisecond)
	require.Error(t, err)
	require.Contains(t, err.Error(), "Client.Timeout")
	require.Nil(t, rawResp)
	// Read again
	_, rawResp, err = resp.ReadBodyAsString()
	require.Equal(t, int32(1), requestTimes.Load())
	require.Error(t, err)
	require.Contains(t, err.Error(), "Client.Timeout")
	require.Nil(t, rawResp)
	rawResp, err = resp.Finish()
	require.Equal(t, int32(1), requestTimes.Load())
	require.Error(t, err)
	require.Contains(t, err.Error(), "Client.Timeout")
	require.Nil(t, rawResp)
	// Even if the request is finished then, we should still get timeout error.
	time.Sleep(1 * time.Second)
	_, rawResp, err = resp.ReadBodyAsString()
	require.Equal(t, int32(1), requestTimes.Load())
	require.Error(t, err)
	require.Contains(t, err.Error(), "Client.Timeout")
	require.Nil(t, rawResp)

	// Call Finish() directly should fail
	tBegin = time.Now()
	resp = client.LR().SetTimeout(100 * time.Millisecond).Get(ts.URL)
	rawResp, err = resp.Finish()
	require.Equal(t, int32(2), requestTimes.Load())
	require.Less(t, time.Since(tBegin), 300*time.Millisecond)
	require.Error(t, err)
	require.Contains(t, err.Error(), "Client.Timeout")
	require.Nil(t, rawResp)

	// Read using long enough timeout should succeed
	resp = client.LR().SetTimeout(1200 * time.Millisecond).Get(ts.URL)
	dataStr, rawResp, err := resp.ReadBodyAsString()
	require.Equal(t, int32(3), requestTimes.Load())
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, rawResp.StatusCode)
	require.Equal(t, "OK", dataStr)
}

func TestTimeoutBody(t *testing.T) {
	requestTimes := atomic.Int32{}
	ctx, cancel := context.WithCancel(context.Background())
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		requestTimes.Inc()
		_, _ = w.Write([]byte("Partial..."))
		w.(http.Flusher).Flush()
		select {
		case <-ctx.Done():
			return
		case <-time.After(1 * time.Second):
			_, _ = fmt.Fprintln(w, "Done")
		}
	}))
	defer ts.Close()
	defer cancel()

	client := New(Config{})

	// Finish() should succeed, since a header is successfully returned
	tBegin := time.Now()
	resp := client.LR().SetTimeout(100 * time.Millisecond).Get(ts.URL)
	rawResp, err := resp.Finish()
	require.Equal(t, int32(1), requestTimes.Load())
	require.Less(t, time.Since(tBegin), 50*time.Millisecond)
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, rawResp.StatusCode)

	// ReadBodyAsString() should fail
	tBegin = time.Now()
	resp = client.LR().SetTimeout(100 * time.Millisecond).Get(ts.URL)
	_, rawResp, err = resp.ReadBodyAsString()
	require.Equal(t, int32(2), requestTimes.Load())
	require.Less(t, time.Since(tBegin), 300*time.Millisecond)
	require.Error(t, err)
	require.Contains(t, err.Error(), "Client.Timeout")
	require.Nil(t, rawResp)
	// Read again
	_, rawResp, err = resp.ReadBodyAsString()
	require.Equal(t, int32(2), requestTimes.Load())
	require.Error(t, err)
	require.Contains(t, err.Error(), "Client.Timeout")
	require.Nil(t, rawResp)
	// Wait enough time and read again
	time.Sleep(1 * time.Second)
	_, rawResp, err = resp.ReadBodyAsString()
	require.Equal(t, int32(2), requestTimes.Load())
	require.Error(t, err)
	require.Contains(t, err.Error(), "Client.Timeout")
	require.Nil(t, rawResp)
	// Finish() should succeed
	tBegin = time.Now()
	rawResp, err = resp.Finish()
	require.Equal(t, int32(2), requestTimes.Load())
	require.Less(t, time.Since(tBegin), 50*time.Millisecond)
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, rawResp.StatusCode)

	// PipeBody() should fail
	buf := bytes.Buffer{}
	tBegin = time.Now()
	resp = client.LR().SetTimeout(100 * time.Millisecond).Get(ts.URL)
	wBytes, rawResp, err := resp.PipeBody(&buf)
	require.Equal(t, int32(3), requestTimes.Load())
	require.Less(t, time.Since(tBegin), 300*time.Millisecond)
	require.Error(t, err)
	require.Contains(t, err.Error(), "Client.Timeout")
	require.Nil(t, rawResp)
	require.Equal(t, int64(10), wBytes) // The first chunk is written
	require.Equal(t, "Partial...", buf.String())
	// PipeBody again should fail
	wBytes, rawResp, err = resp.PipeBody(&buf)
	require.Equal(t, int32(3), requestTimes.Load())
	require.Less(t, time.Since(tBegin), 300*time.Millisecond)
	require.Error(t, err)
	require.Contains(t, err.Error(), "Client.Timeout")
	require.Nil(t, rawResp)
	require.Equal(t, int64(0), wBytes) // No more chunk is written
	require.Equal(t, "Partial...", buf.String())

	// Read using long enough timeout should succeed
	resp = client.LR().SetTimeout(1200 * time.Millisecond).Get(ts.URL)
	dataStr, rawResp, err := resp.ReadBodyAsString()
	require.Equal(t, int32(4), requestTimes.Load())
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, rawResp.StatusCode)
	require.Equal(t, "Partial...Done", dataStr)
}

// FIXME: Seems that there is no way to test the panic happens inside runtime finalizers.
// func TestUsageCheck(t *testing.T) {
//	if !israce.Enabled {
//		t.Skipf("LazyResponse usage check will be tested only when race detector is enabled")
//		return
//	}
//	client := New(Config{})
//	client.LR().Get("foo://example.com")
//	require.Panics(t, func() { runtime.GC() })
// }

// TODO: TestCtxRequest

// TODO: TestCtxResponse
// This test shows that ctx doesn't really restrict the response's lifetime.

// TODO: Test log output
