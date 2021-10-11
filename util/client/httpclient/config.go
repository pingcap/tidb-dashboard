package httpclient

import (
	"context"
	"crypto/tls"
	"net/url"
)

type Config struct {
	BaseURL string
	Context context.Context
	TLS     *tls.Config
	KindTag string // Used to mark what kind of HttpClient it is in error messages and logs.
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
		BaseURL: schema + "://" + u.Host,
		Context: dc.Context,
		TLS:     dc.TLS,
		KindTag: kindTag,
	}, nil
}
