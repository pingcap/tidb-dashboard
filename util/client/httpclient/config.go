// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package httpclient

import (
	"context"
	"crypto/tls"
	"net/url"
)

type Config struct {
	KindTag        string
	TLSConfig      *tls.Config
	DefaultCtx     context.Context
	DefaultBaseURL string
}

type APIClientConfig struct {
	// Endpoint is required in format `http(s)://host:port`.
	// If TLS is specified, `http://` will be updated to `https://`.
	Endpoint string
	Context  context.Context
	TLS      *tls.Config
}

func (dc APIClientConfig) IntoConfig(kindTag string) (Config, error) {
	if len(dc.Endpoint) == 0 {
		return Config{}, ErrInvalidEndpoint.New("API Endpoint is not specified")
	}
	u, err := url.Parse(dc.Endpoint)
	if err != nil {
		return Config{}, ErrInvalidEndpoint.Wrap(err, "API Endpoint is invalid")
	}
	var schema string
	if dc.TLS != nil {
		schema = "https"
	} else {
		schema = "http"
	}
	return Config{
		TLSConfig:      dc.TLS,
		KindTag:        kindTag,
		DefaultCtx:     dc.Context,
		DefaultBaseURL: schema + "://" + u.Host,
	}, nil
}
