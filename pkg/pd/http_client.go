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

package pd

import (
	"context"
	"io/ioutil"
	"net/http"

	"go.uber.org/fx"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
)

var (
	ErrPDClientRequestFailed = ErrNS.NewType("client_request_failed")
)

type Client struct {
	address      string
	httpClient   *http.Client
	lifecycleCtx context.Context
}

func NewPDClient(lc fx.Lifecycle, httpClient *http.Client, config *config.Config) *Client {
	client := &Client{
		httpClient: httpClient,
		address:    config.PDEndPoint,
	}

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			client.lifecycleCtx = ctx
			return nil
		},
	})

	return client
}

func (pd *Client) SendRequest(path string) ([]byte, error) {
	uri := pd.address + path
	req, err := http.NewRequestWithContext(pd.lifecycleCtx, "GET", uri, nil)
	if err != nil {
		return nil, ErrPDClientRequestFailed.Wrap(err, "failed to build request for PD API %s", path)
	}

	resp, err := pd.httpClient.Do(req)
	if err != nil {
		return nil, ErrPDClientRequestFailed.Wrap(err, "failed to send request to PD API %s", path)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, ErrPDClientRequestFailed.New("received non success status code %d from PD API %s", resp.StatusCode, path)
	}

	data, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, ErrPDClientRequestFailed.Wrap(err, "failed to read response from PD API %s", path)
	}

	return data, nil
}
