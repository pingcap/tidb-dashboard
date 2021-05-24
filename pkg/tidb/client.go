package tidb

import (
	"context"
	"database/sql/driver"
	"fmt"
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
		log.Warn(fmt.Sprintf("Reject to establish a target specified TiDB SQL connection since `%s` is set", tidbOverrideSQLEndpointEnvVar))
		return nil, ErrTiDBConnFailed.New("TiDB Dashboard is configured to only connect to specified TiDB host")
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
				log.Warn("TiDB reported its address to be 0.0.0.0. Please specify `-advertise-address` command line parameter when running TiDB")
			}
			if c.forwarder.sqlProxy.noAliveRemote.Load() {
				return nil, ErrNoAliveTiDB.NewWithNoMessage()
			}
			return nil, ErrTiDBConnFailed.Wrap(err, "failed to connect to TiDB")
		} else if mysqlErr, ok := err.(*mysql.MySQLError); ok {
			if mysqlErr.Number == mysqlerr.ER_ACCESS_DENIED_ERROR {
				return nil, ErrTiDBAuthFailed.New("bad TiDB username or password")
			}
		}
		log.Warn("Unknown error occurred while opening TiDB connection", zap.Error(err))
		return nil, err
	}

	return db, nil
}

func (c *Client) Get(path string) (*httpc.Response, error) {
	var err error

	overrideEndpoint := os.Getenv(tidbOverrideStatusEndpointEnvVar)
	// the `tidbOverrideStatusEndpointEnvVar` and the `Client.statusAPIAddress` have the same override priority, if both exist and have not enforced `Client.statusAPIAddress` then an error is returned
	if overrideEndpoint != "" && c.statusAPIAddress != "" && !c.enforceStatusAPIAddresss {
		log.Warn(fmt.Sprintf("Reject to establish a target specified TiDB status connection since `%s` is set", tidbOverrideStatusEndpointEnvVar))
		return nil, ErrTiDBConnFailed.New("TiDB Dashboard is configured to only connect to specified TiDB host")
	}

	var addr string
	switch {
	case c.enforceStatusAPIAddresss:
		addr = c.sqlAPIAddress
	case overrideEndpoint != "":
		addr = overrideEndpoint
	default:
		addr = c.sqlAPIAddress
	}
	if addr == "" {
		if addr, err = c.forwarder.getEndpointAddr(c.forwarder.statusPort); err != nil {
			return nil, err
		}
	}

	uri := fmt.Sprintf("%s://%s%s", c.statusAPIHTTPScheme, addr, path)
	res, err := c.statusAPIHTTPClient.
		WithTimeout(c.statusAPITimeout).
		Send(c.lifecycleCtx, uri, http.MethodGet, nil, ErrTiDBClientRequestFailed, "TiDB")
	if err != nil && c.forwarder.statusProxy.noAliveRemote.Load() {
		return nil, ErrNoAliveTiDB.NewWithNoMessage()
	}
	return res, err
}

func (c *Client) SendGetRequest(path string) ([]byte, error) {
	res, err := c.Get(path)
	if err != nil {
		return nil, err
	}
	return res.Body()
}
