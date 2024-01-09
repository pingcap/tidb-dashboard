// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package metrics

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/pingcap/tidb-dashboard/pkg/utils/topology"
)

const (
	promCacheTTL = time.Second * 5
)

type promAddressCacheEntity struct {
	address string
	cacheAt time.Time
}

type pdServerConfig struct {
	MetricStorage string `json:"metric-storage"`
}

type pdConfig struct {
	PdServer pdServerConfig `json:"pd-server"`
}

// Check and normalize a Prometheus address supplied by user.
func normalizeCustomizedPromAddress(addr string) (string, error) {
	if !strings.HasPrefix(addr, "http://") && !strings.HasPrefix(addr, "https://") {
		addr = "http://" + addr
	}
	u, err := url.Parse(addr)
	if err != nil {
		return "", fmt.Errorf("invalid Prometheus address format: %v", err)
	}
	if len(u.Host) == 0 || len(u.Scheme) == 0 {
		return "", fmt.Errorf("invalid Prometheus address format")
	}
	// Normalize the address, remove unnecessary parts.
	addr = fmt.Sprintf("%s://%s%s", u.Scheme, u.Host, strings.TrimSuffix(u.Path, "/"))
	return addr, nil
}

// Resolve the customized Prometheus address in PD config. If it is not configured, empty address will be returned.
// The returned address must be valid. If an invalid Prometheus address is configured, errors will be returned.
func (s *Service) resolveCustomizedPromAddress(acceptInvalidAddr bool) (string, error) {
	// Lookup "metric-storage" cluster config in PD.
	data, err := s.params.PDClient.SendGetRequest("/config")
	if err != nil {
		return "", err
	}
	var config pdConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return "", err
	}
	addr := config.PdServer.MetricStorage
	if len(addr) > 0 {
		if acceptInvalidAddr {
			return addr, nil
		}
		// Verify whether address is valid. If not valid, throw error.
		addr, err = normalizeCustomizedPromAddress(addr)
		if err != nil {
			return "", err
		}
		return addr, nil
	}
	return "", nil
}

// Resolve the Prometheus address recorded by deployment tools in the `/topology` etcd namespace.
// If the address is not recorded (for example, when Prometheus is not deployed), empty address will be returned.
func (s *Service) resolveDeployedPromAddress() (string, error) {
	pi, err := topology.FetchPrometheusTopology(s.lifecycleCtx, s.params.EtcdClient)
	if err != nil {
		return "", err
	}
	if pi == nil {
		return "", nil
	}
	return fmt.Sprintf("http://%s", net.JoinHostPort(pi.IP, strconv.Itoa(int(pi.Port)))), nil
}

// Resolve the final Prometheus address. When user has customized an address, this address is returned. Otherwise,
// address recorded by deployment tools will be returned.
// If neither custom address nor deployed address is available, empty address will be returned.
func (s *Service) resolveFinalPromAddress() (string, error) {
	addr, err := s.resolveCustomizedPromAddress(false)
	if err != nil {
		return "", err
	}
	if addr != "" {
		return addr, nil
	}
	addr, err = s.resolveDeployedPromAddress()
	if err != nil {
		return "", err
	}
	if addr != "" {
		return addr, nil
	}
	return "", nil
}

// Get the final Prometheus address from cache. If cache item is not valid, the address will be resolved from PD
// or etcd and then the cache will be updated.
func (s *Service) getPromAddressFromCache() (string, error) {
	fn := func() (string, error) {
		// Check whether cache is valid, and use the cache if possible.
		if v := s.promAddressCache.Load(); v != nil {
			entity := v.(*promAddressCacheEntity)
			if entity.cacheAt.Add(promCacheTTL).After(time.Now()) {
				return entity.address, nil
			}
		}

		// Cache is not valid, read from PD and etcd.
		addr, err := s.resolveFinalPromAddress()
		if err != nil {
			return "", err
		}

		s.promAddressCache.Store(&promAddressCacheEntity{
			address: addr,
			cacheAt: time.Now(),
		})

		return addr, nil
	}

	resolveResult, err, _ := s.promRequestGroup.Do("any_key", func() (interface{}, error) {
		return fn()
	})
	if err != nil {
		return "", err
	}
	return resolveResult.(string), nil
}

// Set the customized Prometheus address. Address can be empty or a valid address like `http://host:port`.
// If address is set to empty, address from deployment tools will be used later.
func (s *Service) setCustomPromAddress(addr string) (string, error) {
	var err error
	if len(addr) > 0 {
		addr, err = normalizeCustomizedPromAddress(addr)
		if err != nil {
			return "", err
		}
	}

	body := make(map[string]interface{})
	body["metric-storage"] = addr
	bodyJSON, err := json.Marshal(&body)
	if err != nil {
		return "", err
	}

	_, err = s.params.PDClient.SendPostRequest("/config", bytes.NewBuffer(bodyJSON))
	if err != nil {
		return "", err
	}

	// Invalidate cache immediately.
	s.promAddressCache.Value.Store(&promAddressCacheEntity{
		address: addr,
		cacheAt: time.Time{},
	})

	return addr, nil
}
