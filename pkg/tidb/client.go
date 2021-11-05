package tidb

import (
	"context"
	"database/sql/driver"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/VividCortex/mysqlerr"
	"github.com/go-sql-driver/mysql"
	"github.com/pingcap/log"
	"go.etcd.io/etcd/clientv3"
	"go.uber.org/fx"
	"go.uber.org/zap"
	mysqlDriver "gorm.io/driver/mysql"
	"gorm.io/gorm"

	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/httpc"
	"github.com/pingcap/tidb-dashboard/pkg/utils/distro"
)

var (
	ErrTiDBConnFailed          = ErrNS.NewType("tidb_conn_failed")
	ErrTiDBAuthFailed          = ErrNS.NewType("tidb_auth_failed")
	ErrTiDBClientRequestFailed = ErrNS.NewType("client_request_failed")
)

const (
	defaultTiDBStatusAPITimeout = time.Second * 10

	// When this environment variable is set, SQL requests will be always sent to this specific TiDB instance.
	// Calling `WithSQLAPIAddress` to enforce a SQL request endpoint will fail when opening the connection.
	tidbOverrideSQLEndpointEnvVar = "TIDB_OVERRIDE_ENDPOINT"
	// When this environment variable is set, status requests will be always sent to this specific TiDB instance.
	// Calling `WithStatusAPIAddress` to enforce a status API request endpoint will fail when opening the connection.
	tidbOverrideStatusEndpointEnvVar = "TIDB_OVERRIDE_STATUS_ENDPOINT"
)

type Client struct {
	lifecycleCtx             context.Context
	forwarder                *Forwarder
	statusAPIHTTPScheme      string
	statusAPIAddress         string // Empty means to use address provided by forwarder
	enforceStatusAPIAddresss bool   // enforced status api address and ignore env override config
	statusAPIHTTPClient      *httpc.Client
	statusAPITimeout         time.Duration
	sqlAPITLSKey             string // Non empty means use this key as MySQL TLS config
	sqlAPIAddress            string // Empty means to use address provided by forwarder
}

func NewTiDBClient(lc fx.Lifecycle, config *config.Config, etcdClient *clientv3.Client, httpClient *httpc.Client) *Client {
	sqlAPITLSKey := ""
	if config.TiDBTLSConfig != nil {
		sqlAPITLSKey = "tidb"
		_ = mysql.RegisterTLSConfig(sqlAPITLSKey, config.TiDBTLSConfig)
	}

	client := &Client{
		lifecycleCtx:             nil,
		forwarder:                newForwarder(lc, etcdClient),
		statusAPIHTTPScheme:      config.GetClusterHTTPScheme(),
		statusAPIAddress:         "",
		enforceStatusAPIAddresss: false,
		statusAPIHTTPClient:      httpClient,
		statusAPITimeout:         defaultTiDBStatusAPITimeout,
		sqlAPITLSKey:             sqlAPITLSKey,
		sqlAPIAddress:            "",
	}

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			client.lifecycleCtx = ctx
			return nil
		},
	})

	return client
}

func (c Client) WithStatusAPITimeout(timeout time.Duration) *Client {
	c.statusAPITimeout = timeout
	return &c
}

func (c Client) WithStatusAPIAddress(host string, statusPort int) *Client {
	c.statusAPIAddress = fmt.Sprintf("%s:%d", host, statusPort)
	return &c
}

func (c Client) WithEnforcedStatusAPIAddress(host string, statusPort int) *Client {
	c.enforceStatusAPIAddresss = true
	c.statusAPIAddress = fmt.Sprintf("%s:%d", host, statusPort)
	return &c
}

func (c Client) WithSQLAPIAddress(host string, sqlPort int) *Client {
	c.sqlAPIAddress = fmt.Sprintf("%s:%d", host, sqlPort)
	return &c
}

func (c *Client) OpenSQLConn(user string, pass string) (*gorm.DB, error) {
	var err error

	overrideEndpoint := os.Getenv(tidbOverrideSQLEndpointEnvVar)
	// the `tidbOverrideSQLEndpointEnvVar` and the `Client.sqlAPIAddress` have the same override priority, if both exist, an error is returned
	if overrideEndpoint != "" && c.sqlAPIAddress != "" {
		log.Warn(fmt.Sprintf("Reject to establish a target specified %s SQL connection since `%s` is set", distro.Data("tidb"), tidbOverrideSQLEndpointEnvVar))
		return nil, ErrTiDBConnFailed.New("%s Dashboard is configured to only connect to specified %s host", distro.Data("tidb"), distro.Data("tidb"))
	}

	var addr string
	switch {
	case overrideEndpoint != "":
		addr = overrideEndpoint
	default:
		addr = c.sqlAPIAddress
	}
	if addr == "" {
		if addr, err = c.forwarder.getEndpointAddr(c.forwarder.sqlPort); err != nil {
			return nil, err
		}
	}

	dsnConfig := mysql.NewConfig()
	dsnConfig.Net = "tcp"
	dsnConfig.Addr = addr
	dsnConfig.User = user
	dsnConfig.Passwd = pass
	dsnConfig.Timeout = time.Second
	dsnConfig.ParseTime = true
	dsnConfig.Loc = time.Local
	dsnConfig.MultiStatements = true
	dsnConfig.TLSConfig = c.sqlAPITLSKey
	dsn := dsnConfig.FormatDSN()

	db, err := gorm.Open(mysqlDriver.Open(dsn))
	if err != nil {
		if _, ok := err.(*net.OpError); ok || err == driver.ErrBadConn {
			if strings.HasPrefix(addr, "0.0.0.0:") {
				log.Warn(fmt.Sprintf("%s reported its address to be 0.0.0.0. Please specify `-advertise-address` command line parameter when running %s", distro.Data("tidb"), distro.Data("tidb")))
			}
			if c.forwarder.sqlProxy.noAliveRemote.Load() {
				return nil, ErrNoAliveTiDB.NewWithNoMessage()
			}
			return nil, ErrTiDBConnFailed.Wrap(err, "failed to connect to %s", distro.Data("tidb"))
		} else if mysqlErr, ok := err.(*mysql.MySQLError); ok {
			if mysqlErr.Number == mysqlerr.ER_ACCESS_DENIED_ERROR {
				return nil, ErrTiDBAuthFailed.New("bad %s username or password", distro.Data("tidb"))
			}
		}
		log.Warn(fmt.Sprintf("Unknown error occurred while opening %s connection", distro.Data("tidb")), zap.Error(err))
		return nil, err
	}

	return db, nil
}

func (c *Client) Get(relativeURI string) httpc.SendPending {
	return &Sender{
		client:      c,
		relativeURI: relativeURI,
		method:      http.MethodGet,
		body:        nil,
	}
}

type Sender struct {
	client      *Client
	relativeURI string
	method      string
	body        io.Reader
}

var _ httpc.SendPending = (*Sender)(nil)

func (s *Sender) Response() (*httpc.Response, error) {
	var err error

	overrideEndpoint := os.Getenv(tidbOverrideStatusEndpointEnvVar)
	// the `tidbOverrideStatusEndpointEnvVar` and the `Client.statusAPIAddress` have the same override priority, if both exist and have not enforced `Client.statusAPIAddress` then an error is returned
	if overrideEndpoint != "" && s.client.statusAPIAddress != "" && !s.client.enforceStatusAPIAddresss {
		log.Warn(fmt.Sprintf("Reject to establish a target specified %s status connection since `%s` is set", distro.Data("tidb"), tidbOverrideStatusEndpointEnvVar))
		return nil, ErrTiDBConnFailed.New("%s Dashboard is configured to only connect to specified %s host", distro.Data("tidb"), distro.Data("tidb"))
	}

	var addr string
	switch {
	case s.client.enforceStatusAPIAddresss:
		addr = s.client.statusAPIAddress
	case overrideEndpoint != "":
		addr = overrideEndpoint
	default:
		addr = s.client.statusAPIAddress
	}
	if addr == "" {
		if addr, err = s.client.forwarder.getEndpointAddr(s.client.forwarder.statusPort); err != nil {
			return nil, err
		}
	}

	uri := fmt.Sprintf("%s://%s%s", s.client.statusAPIHTTPScheme, addr, s.relativeURI)
	res := s.client.statusAPIHTTPClient.
		WithTimeout(s.client.statusAPITimeout).
		Send(s.client.lifecycleCtx, uri, s.method, s.body, ErrTiDBClientRequestFailed, distro.Data("tidb"))
	if s.client.forwarder.statusProxy.noAliveRemote.Load() {
		return nil, ErrNoAliveTiDB.NewWithNoMessage()
	}
	return res.Response()
}

func (s *Sender) Body() ([]byte, error) {
	res, err := s.Response()
	if err != nil {
		return nil, err
	}
	return res.Body()
}
