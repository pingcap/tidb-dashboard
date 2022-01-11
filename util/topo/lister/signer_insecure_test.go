// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package lister

import (
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/pingcap/tidb-dashboard/util/topo"
)

func TestInsecureSigner(t *testing.T) {
	signer := InsecureSigner{}

	component := topo.ComponentDescriptor{
		IP:         "topo-test-2.internal",
		Port:       4000,
		StatusPort: 10080,
		Kind:       topo.KindTiDB,
	}

	v, err := signer.Sign(component)
	require.NoError(t, err)
	require.NotEmpty(t, v)
	require.EqualValues(t, `{"ip":"topo-test-2.internal","port":4000,"status_port":10080,"kind":"tidb"}`, v)

	cd, err := signer.Verify(v)
	require.NoError(t, err)
	require.Equal(t, component, cd)

	cdList, err := signer.BatchVerify([]SignedComponentDescriptor{v})
	require.NoError(t, err)
	require.Equal(t, []topo.ComponentDescriptor{component}, cdList)
}
