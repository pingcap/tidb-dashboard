package tidb

import (
	"context"
	"database/sql/driver"
	"fmt"
	"net"
	"os"
	"strings"
	"time"

	"github.com/VividCortex/mysqlerr"
	"github.com/go-resty/resty/v2"
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
	lifecycleCtx           context.Context
	forwarder              *Forwarder
	httpClient             *httpc.Client
	defaultStatusAPIClient *resty.Client

	clusterScheme string
	sqlAPITLSKey  string // Non empty means use this key as MySQL TLS config
	sqlAPIAddress string // Empty means to use address provided by forwarder
}

func NewTiDBClient(lc fx.Lifecycle, config *config.Config, etcdClient *clientv3.Client, httpClient *httpc.Client) *Client {
	sqlAPITLSKey := ""
	if config.TiDBTLSConfig != nil {
		sqlAPITLSKey = "tidb"
		_ = mysql.RegisterTLSConfig(sqlAPITLSKey, config.TiDBTLSConfig)
	}

	client := &Client{
		lifecycleCtx:  nil,
		forwarder:     newForwarder(lc, etcdClient),
		httpClient:    httpClient,
		clusterScheme: config.GetClusterHTTPScheme(),
		sqlAPITLSKey:  sqlAPITLSKey,
		sqlAPIAddress: "",
	}
	client.defaultStatusAPIClient = client.NewStatusAPIClient()

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			client.lifecycleCtx = ctx
			return nil
		},
	})

	return client
}

func (c *Client) newStatusAPIClient() *resty.Client {
	return c.httpClient.New().
		SetTimeout(defaultTiDBStatusAPITimeout).
		OnBeforeRequest(func(rc *resty.Client, r *resty.Request) error {
			if r.Context() == nil {
				r.SetContext(c.lifecycleCtx)
			}
			return nil
		})
}

func (c *Client) NewStatusAPIClient() *resty.Client {
	return c.newStatusAPIClient().
		OnBeforeRequest(createBeforeRequestEndpointOverrideMiddleware(c))
}

func (c *Client) NewStatusAPIClientWithEnforceHost(host string) *resty.Client {
	return c.newStatusAPIClient().
		SetHostURL(normalizeScheme(c.clusterScheme, host))
}

func (c *Client) NewStatusAPIRequest() *resty.Request {
	return c.defaultStatusAPIClient.R()
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

func createBeforeRequestEndpointOverrideMiddleware(c *Client) resty.RequestMiddleware {
	return func(rc *resty.Client, r *resty.Request) error {
		overrideEndpoint := os.Getenv(tidbOverrideStatusEndpointEnvVar)
		// the `tidbOverrideStatusEndpointEnvVar` and the `Client.HostURL` have the same override priority, if both exist, an error is returned
		if overrideEndpoint != "" && rc.HostURL != "" {
			log.Warn(fmt.Sprintf("Reject to establish a target specified TiDB status connection since `%s` is set", tidbOverrideStatusEndpointEnvVar))
			return ErrTiDBConnFailed.New("TiDB Dashboard is configured to only connect to specified TiDB host")
		}

		var addr string
		var err error
		switch {
		case overrideEndpoint != "":
			addr = overrideEndpoint
		default:
			addr = rc.HostURL
		}
		if addr == "" {
			if addr, err = c.forwarder.getEndpointAddr(c.forwarder.statusPort); err != nil {
				return err
			}
		}

		rc.SetHostURL(normalizeScheme(c.clusterScheme, addr))
		return nil
	}
}

// there's a bug in resty when mix `SetScheme` and `SetHostURL`: https://github.com/go-resty/resty/issues/407
// so we need normalized scheme for now
func normalizeScheme(scheme, host string) string {
	if strings.HasPrefix(host, "http://") || strings.HasPrefix(host, "https://") {
		return host
	}
	return fmt.Sprintf("%s://%s", scheme, host)
}
