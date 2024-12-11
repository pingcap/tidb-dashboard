// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

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

	"github.com/pingcap/check"
	"go.uber.org/fx"
)

var _ = check.Suite(&testDistanceSuite{})

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
	defer func() {
		_ = fin.Close()
	}()
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

	var strategy SplitStrategy
	wg := &sync.WaitGroup{}
	app := fx.New(
		fx.Provide(func(lc fx.Lifecycle) SplitStrategy {
			return DistanceSplitStrategy(lc, wg, 1.0/math.Phi, 15, 50)
		}),
		fx.Populate(&strategy),
	)
	_ = app.Start(context.Background())
	s := strategy.(*distanceSplitStrategy)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		b.StopTimer()
		rollbackDis()
		b.StartTimer()
		_ = s.GenerateScale(chunks, compactKeys, dis)
	}
	b.StopTimer()
	_ = app.Stop(context.Background())
	wg.Wait()
}
