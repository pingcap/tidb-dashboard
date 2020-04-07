//+build !hot_swap_template
//go:generate vfsgendev -tag hot_swap_template -source="github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/diagnose".Vfs

package diagnose

// This file is only a placeholder for invoking go:generate.
// It will crate vfs_vfsdata.go
