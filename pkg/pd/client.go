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
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"go.uber.org/fx"

	"github.com/thoas/go-funk"

	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/httpc"
	"github.com/pingcap/tidb-dashboard/pkg/utils/distro"
	"github.com/pingcap/tidb-dashboard/pkg/utils/host"
)

var (
	ErrPDClientRequestFailed = ErrNS.NewType("client_request_failed")
	ErrInvalidPDAddr         = ErrNS.NewType("invalid_pd_addr")
)

const (
	defaultPDTimeout = time.Second * 10
)

type Client struct {
	httpScheme   string
	baseURL      string
	specificURL  string
	httpClient   *httpc.Client
	lifecycleCtx context.Context
	timeout      time.Duration
}

func NewPDClient(lc fx.Lifecycle, httpClient *httpc.Client, config *config.Config) *Client {
	client := &Client{
		httpClient:   httpClient,
		httpScheme:   config.GetClusterHTTPScheme(),
		baseURL:      config.PDEndPoint,
		specificURL:  "",
		lifecycleCtx: nil,
		timeout:      defaultPDTimeout,
	}

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			client.lifecycleCtx = ctx
			return nil
		},
	})

	return client
}

func (c Client) WithURL(url string) *Client {
	c.specificURL = url
	return &c
}

func (c Client) WithAddress(host string, port int) *Client {
	c.specificURL = fmt.Sprintf("%s://%s:%d", c.httpScheme, host, port)
	return &c
}

func (c *Client) getURL() string {
	if c.specificURL != "" {
		return c.specificURL
	}
	return c.baseURL
}

func (c Client) WithTimeout(timeout time.Duration) *Client {
	c.timeout = timeout
	return &c
}

func (c Client) WithBeforeRequest(callback func(req *http.Request)) *Client {
	c.httpClient.BeforeRequest = callback
	return &c
}

func (c *Client) Get(relativeURI string) (*httpc.Response, error) {
	err := c.checkValidHost()
	if err != nil {
		return nil, err
	}

	uri := fmt.Sprintf("%s/pd/api/v1%s", c.getURL(), relativeURI)
	return c.httpClient.WithTimeout(c.timeout).Send(c.lifecycleCtx, uri, http.MethodGet, nil, ErrPDClientRequestFailed, distro.Data("pd"))
}

func (c *Client) SendGetRequest(relativeURI string) ([]byte, error) {
	res, err := c.Get(relativeURI)
	if err != nil {
		return nil, err
	}
	return res.Body()
}

func (c *Client) SendPostRequest(relativeURI string, body io.Reader) ([]byte, error) {
	err := c.checkValidHost()
	if err != nil {
		return nil, err
	}

	uri := fmt.Sprintf("%s/pd/api/v1%s", c.getURL(), relativeURI)
	return c.httpClient.WithTimeout(c.timeout).SendRequest(c.lifecycleCtx, uri, http.MethodPost, body, ErrPDClientRequestFailed, distro.Data("pd"))
}

type InfoMembers struct {
	Count   int          `json:"count"`
	Members []InfoMember `json:"members"`
}

type InfoMember struct {
	GitHash       string   `json:"git_hash"`
	ClientUrls    []string `json:"client_urls"`
	DeployPath    string   `json:"deploy_path"`
	BinaryVersion string   `json:"binary_version"`
	MemberID      uint64   `json:"member_id"`
}

func (c *Client) FetchMembers() (*InfoMembers, error) {
	data, err := c.SendGetRequest("/members")
	if err != nil {
		return nil, err
	}

	ds := &InfoMembers{}
	err = json.Unmarshal(data, ds)
	if err != nil {
		return nil, ErrPDClientRequestFailed.Wrap(err, "%s members API unmarshal failed", distro.Data("pd"))
	}
	return ds, nil
}

func (c *Client) checkValidHost() error {
	requestIP, requestPort, err := host.ParseHostAndPortFromAddressURL(c.getURL())
	if err != nil {
		return err
	}
	addr := fmt.Sprintf("%s:%d", requestIP, requestPort)
	wl := c.addrWhitelist()
	if funk.Contains(wl, addr) {
		return nil
	}

	ds, err := c.FetchMembers()
	if err != nil {
		return err
	}
	isValid := funk.Contains(ds, func(item InfoMember) bool {
		ip, port, _ := host.ParseHostAndPortFromAddressURL(item.ClientUrls[0])
		return fmt.Sprintf("%s:%d", ip, port) == addr
	})
	if !isValid {
		return ErrInvalidPDAddr.New("request address %s is invalid", addr)
	}
	return nil
}

func (c *Client) addrWhitelist() []string {
	// baseURL should be placed in the whitelist to aviod circular invoke when fetch memebers
	baseIP, basePort, _ := host.ParseHostAndPortFromAddressURL(c.baseURL)
	baseAddr := fmt.Sprintf("%s:%d", baseIP, basePort)
	return []string{baseAddr}
}
