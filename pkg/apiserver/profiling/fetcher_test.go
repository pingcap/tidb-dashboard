package profiling

import (
	"testing"

	"github.com/stretchr/testify/require"
)


func Test_tikvFetcher(t *testing.T) {
	fetcher := &tikvFetcher{}
	_, err := fetcher.fetch(&fetchOptions{
		ip: "127.0.0.1",
		port: 20180,
		path: "/debug/pprof/heap",
	})
	require.NoError(t, err)
}