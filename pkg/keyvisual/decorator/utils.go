// Copyright 2019 PingCAP, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// See the License for the specific language governing permissions and
// limitations under the License.

package decorator

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/pingcap/log"
	"go.uber.org/zap"
)

const (
	retryCnt       = 10
	etcdGetTimeout = time.Second
)

func request(addr string, uri string, v interface{}) error {
	url := fmt.Sprintf("http://%s/%s", addr, uri)
	resp, err := http.Get(url) //nolint:gosec
	if err != nil {
		log.Warn("request failed", zap.String("url", url))
		return err
	}
	defer resp.Body.Close()
	decoder := json.NewDecoder(resp.Body)
	return decoder.Decode(v)
}
