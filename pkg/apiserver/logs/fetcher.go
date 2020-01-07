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

package logs

import (
	"context"
	"io"

	"github.com/pingcap/kvproto/pkg/diagnosticspb"
	"google.golang.org/grpc"
)

type Fetcher struct {
}

var fetcher *Fetcher

func init() {
	fetcher = &Fetcher{}
}

type streamResult struct {
	next chan streamResult

	messages []*diagnosticspb.LogMessage
	err      error
}

func (f *Fetcher) fetchLogs(ctx context.Context, addr string, req *diagnosticspb.SearchLogRequest) (chan streamResult, error) {
	opt := grpc.WithInsecure()

	conn, err := grpc.Dial(addr, opt)
	if err != nil {
		return nil, err
	}

	cli := diagnosticspb.NewDiagnosticsClient(conn)
	stream, err := cli.SearchLog(ctx, req)
	if err != nil {
		return nil, err
	}
	ch := make(chan streamResult)
	go func(ch chan streamResult) {
		defer close(ch)
		defer conn.Close()

		for {
			res, err := stream.Recv()
			if err != nil {
				if err != io.EOF {
					ch <- streamResult{err: err}
				}
				return
			}
			ch <- streamResult{next: ch, messages: res.Messages}
		}
	}(ch)

	return ch, nil
}
