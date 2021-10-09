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

	"github.com/ReneKroon/ttlcache/v2"
	"github.com/VividCortex/mysqlerr"
	"github.com/go-sql-driver/mysql"
	"github.com/pingcap/log"
	"github.com/thoas/go-funk"
	"go.etcd.io/etcd/clientv3"
	"go.uber.org/fx"
	"go.uber.org/zap"
	mysqlDriver "gorm.io/driver/mysql"
	"gorm.io/gorm"

	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/httpc"
	"github.com/pingcap/tidb-dashboard/pkg/utils/distro"
	"github.com/pingcap/tidb-dashboard/pkg/utils/topology"
)

var (
	ErrTiDBConnFailed          = ErrNS.NewType("tidb_conn_failed")
	ErrTiDBAuthFailed          = ErrNS.NewType("tidb_auth_failed")
	ErrTiDBClientRequestFailed = ErrNS.NewType("client_request_failed")
	ErrInvalidTiDBAddr         = ErrNS.NewType("invalid_tidb_addr")
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
	endpointAllowlist        []string // Endpoint addrs in the whitelist can skip the checkValidAddress check
	statusAPIHTTPScheme      string
	statusAPIAddress         string // Empty means to use address provided by forwarder
	enforceStatusAPIAddresss bool   // enforced status api address and ignore env override config
	statusAPIHTTPClient      *httpc.Client
	statusAPITimeout         time.Duration
	sqlAPITLSKey             string // Non empty means use this key as MySQL TLS config
	sqlAPIAddress            string // Empty means to use address provided by forwarder
	cache                    *ttlcache.Cache
}

func NewTiDBClient(lc fx.Lifecycle, config *config.Config, etcdClient *clientv3.Client, httpClient *httpc.Client) *Client {
	sqlAPITLSKey := ""
	if config.TiDBTLSConfig != nil {
		sqlAPITLSKey = "tidb"
		_ = mysql.RegisterTLSConfig(sqlAPITLSKey, config.TiDBTLSConfig)
	}

	cache := ttlcache.NewCache()
	cache.SkipTTLExtensionOnHit(true)
	client := &Client{
		lifecycleCtx:             context.Background(),
		forwarder:                newForwarder(lc, etcdClient),
		endpointAllowlist:        []string{},
		statusAPIHTTPScheme:      config.GetClusterHTTPScheme(),
		statusAPIAddress:         "",
		enforceStatusAPIAddresss: false,
		statusAPIHTTPClient:      httpClient,
		statusAPITimeout:         defaultTiDBStatusAPITimeout,
		sqlAPITLSKey:             sqlAPITLSKey,
		sqlAPIAddress:            "",
		cache:                    cache,
	}

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			client.lifecycleCtx = ctx
			client.endpointAllowlist = append(client.endpointAllowlist, client.forwarder.statusProxy.listener.Addr().String())

			return nil
		},
		OnStop: func(c context.Context) error {
			return cache.Close()
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

func (c *Client) Get(relativeURI string) (*httpc.Response, error) {
	var err error

	overrideEndpoint := os.Getenv(tidbOverrideStatusEndpointEnvVar)
	// the `tidbOverrideStatusEndpointEnvVar` and the `Client.statusAPIAddress` have the same override priority, if both exist and have not enforced `Client.statusAPIAddress` then an error is returned
	if overrideEndpoint != "" && c.statusAPIAddress != "" && !c.enforceStatusAPIAddresss {
		log.Warn(fmt.Sprintf("Reject to establish a target specified %s status connection since `%s` is set", distro.Data("tidb"), tidbOverrideStatusEndpointEnvVar))
		return nil, ErrTiDBConnFailed.New("%s Dashboard is configured to only connect to specified %s host", distro.Data("tidb"), distro.Data("tidb"))
	}

	var addr string
	switch {
	case c.enforceStatusAPIAddresss:
		addr = c.statusAPIAddress
	case overrideEndpoint != "":
		addr = overrideEndpoint
	default:
		addr = c.statusAPIAddress
	}
	if addr == "" {
		if addr, err = c.forwarder.getEndpointAddr(c.forwarder.statusPort); err != nil {
			return nil, err
		}
	}

	err = c.checkValidAddress(addr)
	if err != nil {
		return nil, err
	}

	uri := fmt.Sprintf("%s://%s%s", c.statusAPIHTTPScheme, addr, relativeURI)
	res, err := c.statusAPIHTTPClient.
		WithTimeout(c.statusAPITimeout).
		Send(c.lifecycleCtx, uri, http.MethodGet, nil, ErrTiDBClientRequestFailed, distro.Data("tidb"))
	if err != nil && c.forwarder.statusProxy.noAliveRemote.Load() {
		return nil, ErrNoAliveTiDB.NewWithNoMessage()
	}
	return res, err
}

func (c *Client) getMemberAddrs() ([]string, error) {
	cached, _ := c.cache.Get("tidb_member_addrs")
	if cached != nil {
		return cached.([]string), nil
	}

	topos, err := topology.FetchTiDBTopology(c.lifecycleCtx, c.forwarder.etcdClient)
	if err != nil {
		return nil, err
	}
	addrs := []string{}
	for _, topo := range topos {
		addrs = append(addrs, fmt.Sprintf("%s:%d", topo.IP, topo.StatusPort))
	}

	_ = c.cache.SetWithTTL("tidb_member_addrs", addrs, 10*time.Second)

	return addrs, nil
}

func (c *Client) checkValidAddress(addr string) error {
	if funk.Contains(c.endpointAllowlist, addr) {
		return nil
	}

	addrs, err := c.getMemberAddrs()
	if err != nil {
		return err
	}
	isValid := funk.Contains(addrs, func(mAddr string) bool {
		return mAddr == addr
	})
	if !isValid {
		return ErrInvalidTiDBAddr.New("request address %s is invalid", addr)
	}
	return nil
}

// FIXME: SendGetRequest should be extracted, as a common method.
func (c *Client) SendGetRequest(relativeURI string) ([]byte, error) {
	res, err := c.Get(relativeURI)
	if err != nil {
		return nil, err
	}
	return res.Body()
}
