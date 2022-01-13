// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package profutil

import (
	"bytes"
	"testing"

	"github.com/jarcoal/httpmock"
	"github.com/stretchr/testify/require"

	"github.com/pingcap/tidb-dashboard/util/client/httpclient"
	"github.com/pingcap/tidb-dashboard/util/testutil/httpmockutil"
	"github.com/pingcap/tidb-dashboard/util/topo"
)

func TestIsProfKindValid(t *testing.T) {
	require.True(t, IsProfKindValid(ProfKindCPU))
	require.True(t, IsProfKindValid(ProfKindHeap))
	require.False(t, IsProfKindValid("abc"))
}

func Test_resolvePProfAPI(t *testing.T) {
	host, port, err := resolvePProfAPI(topo.CompDescriptor{
		IP:         "test-pd.example-domain.internal",
		Port:       4000,
		StatusPort: 10080,
		Kind:       topo.KindTiDB,
	})
	require.NoError(t, err)
	require.Equal(t, "test-pd.example-domain.internal", host)
	require.EqualValues(t, 10080, port)

	_, _, err = resolvePProfAPI(topo.CompDescriptor{
		IP:         "test-prometheus.example-domain.internal",
		Port:       9090,
		StatusPort: 0,
		Kind:       topo.KindPrometheus,
	})
	require.EqualError(t, err, "component kind prometheus is not supported")
}

func TestIsProfSupported(t *testing.T) {
	require.True(t, IsProfSupported(Config{
		ProfilingKind: ProfKindCPU,
		Target:        topo.CompDescriptor{Kind: topo.KindTiKV},
	}))
	require.True(t, IsProfSupported(Config{
		ProfilingKind: ProfKindGoroutine,
		Target:        topo.CompDescriptor{Kind: topo.KindTiDB},
	}))
	require.False(t, IsProfSupported(Config{
		ProfilingKind: ProfKindHeap,
		Target:        topo.CompDescriptor{Kind: topo.KindTiKV},
	}))
	require.False(t, IsProfSupported(Config{
		ProfilingKind: "fooKind",
		Target:        topo.CompDescriptor{Kind: topo.KindTiDB},
	}))
	require.False(t, IsProfSupported(Config{
		ProfilingKind: ProfKindCPU,
		Target:        topo.CompDescriptor{Kind: "fooComponent"},
	}))
}

func Test_profilerMutex_isSupported(t *testing.T) {
	p := profilerMutex{}
	require.False(t, p.isSupported(topo.KindTiKV))
	require.True(t, p.isSupported(topo.KindTiDB))
	require.False(t, p.isSupported("fooComponent"))
}

func Test_profilerMutex_fetch(t *testing.T) {
	mockTransport := httpmock.NewMockTransport()
	mockTransport.RegisterResponder("GET", "http://172.16.6.171:2379/debug/pprof/mutex?debug=1",
		httpmockutil.StringResponder(`
--- mutex:
cycles/second=2200002545
sampling period=5
16464096815 361 @ 0xc3c0eb 0x157f7a5 0x157f78d 0x157f685 0x1579ac6 0xc2f761
#	0xc3c0ea	sync.(*RWMutex).Unlock+0x6a					/usr/local/go/src/sync/rwmutex.go:146
#	0x157f7a4	go.etcd.io/etcd/mvcc/backend.(*readTx).Unlock+0x64		/nfs/cache/mod/go.etcd.io/etcd@v0.5.0-alpha.5.0.20191023171146-3cf2f69b5738/mvcc/backend/read_tx.go:55
#	0x157f78c	go.etcd.io/etcd/mvcc/backend.(*batchTxBuffered).commit+0x4c	/nfs/cache/mod/go.etcd.io/etcd@v0.5.0-alpha.5.0.20191023171146-3cf2f69b5738/mvcc/backend/batch_tx.go:304
#	0x157f684	go.etcd.io/etcd/mvcc/backend.(*batchTxBuffered).Commit+0x44	/nfs/cache/mod/go.etcd.io/etcd@v0.5.0-alpha.5.0.20191023171146-3cf2f69b5738/mvcc/backend/batch_tx.go:290
#	0x1579ac5	go.etcd.io/etcd/mvcc/backend.(*backend).run+0x165		/nfs/cache/mod/go.etcd.io/etcd@v0.5.0-alpha.5.0.20191023171146-3cf2f69b5738/mvcc/backend/backend.go:330

8826489579 245 @ 0x157cc1b 0x157cbf1 0x157f596 0x157f693 0x1579ac6 0xc2f761
#	0x157cc1a	sync.(*Mutex).Unlock+0x5a					/usr/local/go/src/sync/mutex.go:190
#	0x157cbf0	go.etcd.io/etcd/mvcc/backend.(*batchTx).Unlock+0x30		/nfs/cache/mod/go.etcd.io/etcd@v0.5.0-alpha.5.0.20191023171146-3cf2f69b5738/mvcc/backend/batch_tx.go:56
#	0x157f595	go.etcd.io/etcd/mvcc/backend.(*batchTxBuffered).Unlock+0x35	/nfs/cache/mod/go.etcd.io/etcd@v0.5.0-alpha.5.0.20191023171146-3cf2f69b5738/mvcc/backend/batch_tx.go:285
#	0x157f692	go.etcd.io/etcd/mvcc/backend.(*batchTxBuffered).Commit+0x52	/nfs/cache/mod/go.etcd.io/etcd@v0.5.0-alpha.5.0.20191023171146-3cf2f69b5738/mvcc/backend/batch_tx.go:291
#	0x1579ac5	go.etcd.io/etcd/mvcc/backend.(*backend).run+0x165		/nfs/cache/mod/go.etcd.io/etcd@v0.5.0-alpha.5.0.20191023171146-3cf2f69b5738/mvcc/backend/backend.go:330
`))
	mockTransport.RegisterResponder("GET", "http://example-tidb.internal:10080/debug/pprof/mutex?debug=1",
		httpmockutil.StringResponder(`
--- mutex:
cycles/second=1000000073
sampling period=10
5154711460 19 @ 0x1026e497c 0x103743928 0x1037432b4 0x1038e5b24 0x1026daaf4
#	0x1026e497b	sync.(*Mutex).Unlock+0x5b				/usr/local/go1.16.4/src/sync/mutex.go:190
#	0x103743927	github.com/pingcap/tidb/statistics/handle.(*Handle).dumpTableStatCountToKV+0x347	/Users/pingcap/workspace/build-darwin-arm64-4.0/go/src/github.com/pingcap/tidb/statistics/handle/update.go:533
#	0x1037432b3	github.com/pingcap/tidb/statistics/handle.(*Handle).DumpStatsDeltaToKV+0x1c3		/Users/pingcap/workspace/build-darwin-arm64-4.0/go/src/github.com/pingcap/tidb/statistics/handle/update.go:463
#	0x1038e5b23	github.com/pingcap/tidb/domain.(*Domain).updateStatsWorker+0x4a3			/Users/pingcap/workspace/build-darwin-arm64-4.0/go/src/github.com/pingcap/tidb/domain/domain.go:1427
`))

	client := httpclient.New(httpclient.Config{})
	client.SetDefaultTransport(mockTransport)

	p := profilerMutex{}
	w := bytes.Buffer{}
	resultType, err := p.fetch(Config{
		ProfilingKind: ProfKindMutex, // This doesn't matter
		Client:        client,
		Target: topo.CompDescriptor{
			IP:         "172.16.6.171",
			Port:       2379,
			StatusPort: 0,
			Kind:       topo.KindPD,
		},
	}, &w)
	require.Equal(t, ProfDataTypeText, resultType)
	require.NoError(t, err)
	require.Contains(t, w.String(), "cycles/second=2200002545")

	w.Reset()
	_, err = p.fetch(Config{
		ProfilingKind: ProfKindMutex,
		Client:        client,
		Target: topo.CompDescriptor{
			IP:         "example.internal",
			Port:       4000,
			StatusPort: 10080,
			Kind:       topo.KindTiDB,
		},
	}, &w)
	require.Error(t, err)
	require.Contains(t, err.Error(), "no responder found")
	require.Empty(t, w.String())

	w.Reset()
	_, err = p.fetch(Config{
		ProfilingKind: ProfKindMutex,
		Client:        client,
		Target: topo.CompDescriptor{
			IP:         "example.internal",
			Port:       4000,
			StatusPort: 10080,
			Kind:       "foo",
		},
	}, &w)
	require.Error(t, err)
	require.Contains(t, err.Error(), "component kind foo is not supported")
	require.Empty(t, w.String())

	w.Reset()
	resultType, err = p.fetch(Config{
		ProfilingKind: ProfKindMutex, // This doesn't matter
		Client:        client,
		Target: topo.CompDescriptor{
			IP:         "example-tidb.internal",
			Port:       4000,
			StatusPort: 10080,
			Kind:       topo.KindTiDB,
		},
	}, &w)
	require.Equal(t, ProfDataTypeText, resultType)
	require.NoError(t, err)
	require.Contains(t, w.String(), "cycles/second=1000000073")
}

func TestFetchProfile(t *testing.T) {
	mockTransport := httpmock.NewMockTransport()
	mockTransport.RegisterResponder("GET", "http://example-tidb.internal:10080/debug/pprof/mutex?debug=1",
		httpmockutil.StringResponder(`
--- mutex:
cycles/second=1000000073
sampling period=10
5154711460 19 @ 0x1026e497c 0x103743928 0x1037432b4 0x1038e5b24 0x1026daaf4
#	0x1026e497b	sync.(*Mutex).Unlock+0x5b				/usr/local/go1.16.4/src/sync/mutex.go:190
#	0x103743927	github.com/pingcap/tidb/statistics/handle.(*Handle).dumpTableStatCountToKV+0x347	/Users/pingcap/workspace/build-darwin-arm64-4.0/go/src/github.com/pingcap/tidb/statistics/handle/update.go:533
#	0x1037432b3	github.com/pingcap/tidb/statistics/handle.(*Handle).DumpStatsDeltaToKV+0x1c3		/Users/pingcap/workspace/build-darwin-arm64-4.0/go/src/github.com/pingcap/tidb/statistics/handle/update.go:463
#	0x1038e5b23	github.com/pingcap/tidb/domain.(*Domain).updateStatsWorker+0x4a3			/Users/pingcap/workspace/build-darwin-arm64-4.0/go/src/github.com/pingcap/tidb/domain/domain.go:1427
`))

	client := httpclient.New(httpclient.Config{})
	client.SetDefaultTransport(mockTransport)

	w := bytes.Buffer{}
	resultType, err := FetchProfile(Config{
		ProfilingKind: ProfKindMutex,
		Client:        client,
		Target: topo.CompDescriptor{
			IP:         "abc.internal",
			Port:       2379,
			StatusPort: 0,
			Kind:       topo.KindPD,
		},
	}, &w)
	require.Equal(t, ProfDataTypeText, resultType)
	require.Error(t, err)
	require.Contains(t, err.Error(), `Get "http://abc.internal:2379/debug/pprof/mutex?debug=1": no responder found`)

	w.Reset()
	resultType, err = FetchProfile(Config{
		ProfilingKind: ProfKindCPU,
		Client:        client,
		Target: topo.CompDescriptor{
			IP:         "def.internal",
			Port:       20111,
			StatusPort: 20180,
			Kind:       topo.KindTiKV,
		},
	}, &w)
	require.Equal(t, ProfDataTypeProtobuf, resultType)
	require.Error(t, err)
	require.Contains(t, err.Error(), `Get "http://def.internal:20180/debug/pprof/profile?seconds=10": no responder found`)

	w.Reset()
	resultType, err = FetchProfile(Config{
		ProfilingKind: ProfKindMutex,
		Client:        client,
		Target: topo.CompDescriptor{
			IP:         "example-tidb.internal",
			Port:       1234,
			StatusPort: 10080,
			Kind:       topo.KindTiDB,
		},
	}, &w)
	require.Equal(t, ProfDataTypeText, resultType)
	require.NoError(t, err)
	require.Contains(t, w.String(), `5154711460 19 @ 0x1026e497c 0x103743928 0x1037432b4 0x1038e5b24 0x1026daaf4`)

	w.Reset()
	resultType, err = FetchProfile(Config{
		ProfilingKind: ProfKindHeap,
		Client:        client,
		Target: topo.CompDescriptor{
			IP:         "xyz.internal",
			Port:       1234,
			StatusPort: 5678,
			Kind:       topo.KindTiFlash,
		},
	}, &w)
	require.Equal(t, ProfDataTypeUnknown, resultType)
	require.Error(t, err)
	require.Contains(t, err.Error(), `profiling kind heap is not supported`)

	w.Reset()
	resultType, err = FetchProfile(Config{
		ProfilingKind: ProfKindHeap,
		Client:        client,
		Target: topo.CompDescriptor{
			IP:         "xyz.internal",
			Port:       1234,
			StatusPort: 5678,
			Kind:       topo.KindTiDB,
		},
	}, &w)
	require.Equal(t, ProfDataTypeProtobuf, resultType)
	require.Error(t, err)
	require.Contains(t, err.Error(), `Get "http://xyz.internal:5678/debug/pprof/heap": no responder found`)

	w.Reset()
	resultType, err = FetchProfile(Config{
		ProfilingKind: ProfKindGoroutine,
		Client:        client,
		Target: topo.CompDescriptor{
			IP:         "foo.internal",
			Port:       1234,
			StatusPort: 5678,
			Kind:       topo.KindPD,
		},
	}, &w)
	require.Equal(t, ProfDataTypeText, resultType)
	require.Error(t, err)
	require.Contains(t, err.Error(), `Get "http://foo.internal:1234/debug/pprof/goroutine?debug=1": no responder found`)
}
