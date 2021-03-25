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
	"github.com/jinzhu/gorm"
	"github.com/pingcap/log"
	"go.etcd.io/etcd/clientv3"
	"go.uber.org/fx"
	"go.uber.org/zap"

	// MySQL driver used by gorm
	_ "github.com/jinzhu/gorm/dialects/mysql"

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
	lifecycleCtx        context.Context
	forwarder           *Forwarder
	statusAPIHTTPScheme string
	statusAPIAddress    string // Empty means to use address provided by forwarder
	statusAPIHTTPClient *httpc.Client
	statusAPITimeout    time.Duration
	sqlAPITLSKey        string // Non empty means use this key as MySQL TLS config
	sqlAPIAddress       string // Empty means to use address provided by forwarder
}

func NewTiDBClient(lc fx.Lifecycle, config *config.Config, etcdClient *clientv3.Client, httpClient *httpc.Client) *Client {
	sqlAPITLSKey := ""
	if config.TiDBTLSConfig != nil {
		sqlAPITLSKey = "tidb"
		_ = mysql.RegisterTLSConfig(sqlAPITLSKey, config.TiDBTLSConfig)
	}

	client := &Client{
		lifecycleCtx:        nil,
		forwarder:           newForwarder(lc, etcdClient),
		statusAPIHTTPScheme: config.GetClusterHTTPScheme(),
		statusAPIAddress:    "",
		statusAPIHTTPClient: httpClient,
		statusAPITimeout:    defaultTiDBStatusAPITimeout,
		sqlAPITLSKey:        sqlAPITLSKey,
		sqlAPIAddress:       "",
	}

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			client.lifecycleCtx = ctx
			return nil
		},
	})

	return client
}

func (c *Client) WithStatusAPITimeout(timeout time.Duration) *Client {
	c2 := *c
	c2.statusAPITimeout = timeout
	return &c2
}

func (c *Client) WithStatusAPIAddress(host string, statusPort int) *Client {
	c2 := *c
	c2.statusAPIAddress = fmt.Sprintf("%s:%d", host, statusPort)
	return &c2
}

func (c *Client) WithSQLAPIAddress(host string, sqlPort int) *Client {
	c2 := *c
	c2.sqlAPIAddress = fmt.Sprintf("%s:%d", host, sqlPort)
	return &c2
}

func (c *Client) OpenSQLConn(user string, pass string) (*gorm.DB, error) {
	overrideEndpoint := os.Getenv(tidbOverrideSQLEndpointEnvVar)
	if overrideEndpoint != "" && c.sqlAPIAddress != "" {
		log.Warn(fmt.Sprintf("Reject to establish a target specified TiDB SQL connection since `%s` is set", tidbOverrideSQLEndpointEnvVar))
		return nil, ErrTiDBConnFailed.New("TiDB Dashboard is configured to only connect to specified TiDB host")
	}

	addr := c.sqlAPIAddress
	if addr == "" {
		if overrideEndpoint != "" {
			addr = overrideEndpoint
		} else {
			addr = fmt.Sprintf("127.0.0.1:%d", c.forwarder.sqlPort)
		}
	}

	dsnConfig := mysql.NewConfig()
	dsnConfig.Net = "tcp"
	dsnConfig.Addr = addr
	dsnConfig.User = user
	dsnConfig.Passwd = pass
	dsnConfig.Timeout = time.Second * 60
	dsnConfig.ParseTime = true
	dsnConfig.Loc = time.Local
	dsnConfig.MultiStatements = true
	dsnConfig.TLSConfig = c.sqlAPITLSKey
	dsn := dsnConfig.FormatDSN()

	db, err := gorm.Open("mysql", dsn)
	if err != nil {
		if _, ok := err.(*net.OpError); ok || err == driver.ErrBadConn {
			if strings.HasPrefix(addr, "0.0.0.0:") {
				log.Warn("TiDB reported its address to be 0.0.0.0. Please specify `-advertise-address` command line parameter when running TiDB")
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

func (c *Client) SendGetRequest(path string) ([]byte, error) {
	overrideEndpoint := os.Getenv(tidbOverrideStatusEndpointEnvVar)
	if overrideEndpoint != "" && c.statusAPIAddress != "" {
		log.Warn(fmt.Sprintf("Reject to establish a target specified TiDB status connection since `%s` is set", tidbOverrideStatusEndpointEnvVar))
		return nil, ErrTiDBConnFailed.New("TiDB Dashboard is configured to only connect to specified TiDB host")
	}

	addr := c.statusAPIAddress
	if addr == "" {
		if overrideEndpoint != "" {
			addr = overrideEndpoint
		} else {
			addr = fmt.Sprintf("127.0.0.1:%d", c.forwarder.statusPort)
		}
	}

	uri := fmt.Sprintf("%s://%s%s", c.statusAPIHTTPScheme, addr, path)
	return c.statusAPIHTTPClient.WithTimeout(c.statusAPITimeout).SendRequest(c.lifecycleCtx, uri, http.MethodGet, nil, ErrTiDBClientRequestFailed, "TiDB")
}
