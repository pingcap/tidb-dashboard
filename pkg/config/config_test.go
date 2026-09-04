// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package config

import (
	"crypto/tls"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestNormalizePDEndPoint(t *testing.T) {
	tests := []struct {
		input string
		tls   bool
		want  []string
	}{
		{"127.0.0.1:2379", false, []string{"http://127.0.0.1:2379"}},
		{"http://127.0.0.1:23791,http://127.0.0.1:23792", false, []string{"http://127.0.0.1:23791", "http://127.0.0.1:23792"}},
		{"http://127.0.0.1:23791,http://127.0.0.1:23792", true, []string{"https://127.0.0.1:23791", "https://127.0.0.1:23792"}},
	}
	for _, tt := range tests {
		c := Default()
		c.PDEndPoint = tt.input
		if tt.tls {
			c.ClusterTLSConfig = &tls.Config{}
		}
		require.NoError(t, c.NormalizePDEndPoint())
		require.Equal(t, tt.want[0], c.PDEndPoint)
		require.Equal(t, tt.want, c.PDEndPoints)
	}
}
