package tcp

import (
	"fmt"
	"net"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap/log"
	"go.uber.org/zap"
)

type ProxyRef struct {
	Port int
	*Proxy
}

type ProxyManager struct {
	c       *config.Config
	proxies map[string]*ProxyRef
}

func NewProxyManager(c *config.Config) *ProxyManager {
	return &ProxyManager{
		c:       c,
		proxies: make(map[string]*ProxyRef),
	}
}

// Create uses an available system port and create a loadbalance based TCP proxy for given endpoints
func (pm *ProxyManager) Create(key string, endpoints map[string]string) (*ProxyRef, error) {
	if len(endpoints) == 0 {
		return nil, fmt.Errorf("empty endpoints")
	}
	port, err := getFreePort()
	if err != nil {
		return nil, err
	}
	l, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", port))
	if err != nil {
		return nil, err
	}
	proxy := NewProxy(l, endpoints, pm.c.CheckInterval, 0)

	r := &ProxyRef{
		Port:  port,
		Proxy: proxy,
	}

	pm.proxies[key] = r
	return r, nil
}

func (pm *ProxyManager) GetProxy(key string) *ProxyRef {
	return pm.proxies[key]
}

func (pm *ProxyManager) UpdateRemote(key string, newEndpoints map[string]string) {
	if p := pm.GetProxy(key); p != nil {
		if newEndpoints == nil {
			log.Warn("remove all remotes in proxy", zap.String("proxy", key))
		}
		p.updateRemotes(newEndpoints)
	}
}

func getFreePort() (int, error) {
	addr, err := net.ResolveTCPAddr("tcp", "127.0.0.1:0")
	if err != nil {
		return 0, err
	}

	l, err := net.ListenTCP("tcp", addr)
	if err != nil {
		return 0, err
	}
	defer l.Close()
	return l.Addr().(*net.TCPAddr).Port, nil
}
