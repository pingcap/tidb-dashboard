package http

import (
	"crypto/tls"
	"net"
	"net/http"
	"time"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
)

const (
	HTTPTimeout = time.Second * 3
)

func NewHTTPClientWithConf(config *config.Config) *http.Client {
	return &http.Client{
		Transport: &http.Transport{
			DialTLS: func(network, addr string) (net.Conn, error) {
				conn, err := tls.Dial(network, addr, config.TLSConfig)
				return conn, err
			},
		},
		Timeout: HTTPTimeout,
	}
}
