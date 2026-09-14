// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package model

import (
	"strings"
	"testing"
)

func TestRequestTargetNodeValidate(t *testing.T) {
	tests := []struct {
		name string
		host string
		port int
		want bool
	}{
		{name: "ipv4", host: "127.0.0.1", port: 20180, want: true},
		{name: "ipv6", host: "2001:db8::1", port: 20180, want: true},
		{name: "scoped ipv6", host: "fe80::1%eth0", port: 20180, want: true},
		{name: "hostname", host: "tikv-0.tikv-peer.default.svc", port: 20180, want: true},
		{name: "hostname with underscore", host: "tikv_0.internal", port: 20180, want: true},
		{name: "trailing dot hostname", host: "tikv.example.com.", port: 20180, want: true},
		{name: "maximum length trailing dot hostname", host: strings.Repeat("a", 63) + "." + strings.Repeat("b", 63) + "." + strings.Repeat("c", 63) + "." + strings.Repeat("d", 61) + ".", port: 20180, want: true},
		{name: "empty host", host: "", port: 20180, want: false},
		{name: "shell metacharacters", host: "127.0.0.1'';touch marker;echo '''", port: 20180, want: false},
		{name: "path", host: "127.0.0.1/path", port: 20180, want: false},
		{name: "invalid scoped ipv6 zone", host: "fe80::1%eth0;touch", port: 20180, want: false},
		{name: "zero port", host: "127.0.0.1", port: 0, want: false},
		{name: "port too large", host: "127.0.0.1", port: 65536, want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			target := RequestTargetNode{IP: tt.host, Port: tt.port}
			if got := target.Validate() == nil; got != tt.want {
				t.Fatalf("RequestTargetNode.Validate() = %t, want %t", got, tt.want)
			}
		})
	}
}
func TestRequestTargetNodeFileName(t *testing.T) {
	tests := []struct {
		name   string
		target RequestTargetNode
		expect string
	}{
		{
			name:   "normal ipv4 display name",
			target: RequestTargetNode{Kind: NodeKindTiDB, DisplayName: "127.0.0.1:4000"},
			expect: "tidb_127.0.0.1_4000",
		},
		{
			name:   "ipv6 display name",
			target: RequestTargetNode{Kind: NodeKindTiDB, DisplayName: "[::1]:4000"},
			expect: "tidb_[__1]_4000",
		},
		{
			name:   "path traversal in display name",
			target: RequestTargetNode{Kind: NodeKindTiDB, DisplayName: "../../tmp/x"},
			expect: "tidb_.._.._tmp_x",
		},
		{
			name:   "windows path traversal in display name",
			target: RequestTargetNode{Kind: NodeKindTiDB, DisplayName: `..\..\tmp\x`},
			expect: "tidb_.._.._tmp_x",
		},
		{
			name:   "path traversal in kind",
			target: RequestTargetNode{Kind: NodeKind("../"), DisplayName: "target"},
			expect: "..__target",
		},
		{
			name:   "control characters",
			target: RequestTargetNode{Kind: NodeKindTiDB, DisplayName: "target\r\n"},
			expect: "tidb_target__",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.target.FileName(); got != tt.expect {
				t.Fatalf("RequestTargetNode.FileName() = %q, want %q", got, tt.expect)
			}
		})
	}
}
