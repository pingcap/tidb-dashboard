// Copyright 2020 PingCAP, Inc.
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

package region

import (
	"go.etcd.io/etcd/clientv3"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/dbstore"
)

type RegionsInfo interface {
	Len() int
	GetKeys() []string
	GetValues(tag StatTag) []uint64
}

type RegionsInfoGenerator func() (RegionsInfo, error)

type PDDataProvider struct {
	// File mode (debug)
	FileStartTime int64
	FileEndTime   int64
	// API or Core mode
	// This item takes effect only when both FileStartTime and FileEndTime are 0.
	PeriodicGetter RegionsInfoGenerator

	GetEtcdClient func() *clientv3.Client
	Store         *dbstore.DB
}
