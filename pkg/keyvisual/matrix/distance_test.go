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

package matrix

import (
	"compress/gzip"
	"context"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"sync"
	"testing"

	. "github.com/pingcap/check"
	"go.uber.org/fx"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/keyvisual/decorator"
)

var _ = Suite(&testDistanceSuite{})

type testDistanceSuite struct{}

type testDisData struct {
	Dis            []int    `json:"dis"`
	Keys           []string `json:"keys"`
	CompactKeysLen int      `json:"compact_keys_len"`
}

func BenchmarkGenerateScale(b *testing.B) {
	perr := func(err error) {
		if err != nil {
			panic("Can not load test data!")
		}
	}

	var data testDisData
	fin, err := os.Open("../testdata/dis.json.gzip")
	perr(err)
	defer fin.Close()
	ifs, err := gzip.NewReader(fin)
	perr(err)
	err = json.NewDecoder(ifs).Decode(&data)
	perr(err)

	n := 300
	chunks := make([]chunk, n)
	disOrig := make([][]int, n)
	dis := make([][]int, n)
	for i := range chunks {
		chunks[i] = createZeroChunk(data.Keys)
		disOrig[i] = make([]int, len(data.Dis))
	}
	rollbackDis := func() {
		copy(dis, disOrig)
		for i := range dis {
			copy(dis[i], data.Dis)
		}
	}

	compactKeys := []string{""}
	for i := 1; i < data.CompactKeysLen; i++ {
		compactKeys = append(compactKeys, fmt.Sprintf("t%05d", i))
	}
	compactKeys = append(compactKeys, "")

	keymap := KeyMap{}
	keymap.SaveKeys(compactKeys)
	keymap.SaveKeys(data.Keys)

	var strategy *distanceStrategy
	wg := &sync.WaitGroup{}
	app := fx.New(
		fx.Provide(func(lc fx.Lifecycle) Strategy {
			return DistanceStrategy(lc, wg, decorator.NaiveLabelStrategy{}, 1.0/math.Phi, 15, 50).(*distanceStrategy)
		}),
		fx.Populate(&strategy),
	)
	_ = app.Start(context.Background())
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		b.StopTimer()
		rollbackDis()
		b.StartTimer()
		_ = strategy.GenerateScale(chunks, compactKeys, dis)
	}
	b.StopTimer()
	_ = app.Stop(context.Background())
	wg.Wait()
}
