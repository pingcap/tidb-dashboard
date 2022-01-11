// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package lister

import (
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/pingcap/tidb-dashboard/util/topo"
)

func TestHS256Signer(t *testing.T) {
	signer := NewHS256Signer()
	require.NotNil(t, signer)

	component := topo.ComponentDescriptor{
		IP:         "topo-test.internal",
		Port:       1234,
		StatusPort: 4567,
		Kind:       topo.KindPrometheus,
	}

	v, err := signer.Sign(component)
	require.NoError(t, err)
	require.NotEmpty(t, v)

	cd, err := signer.Verify(v)
	require.NoError(t, err)
	require.Equal(t, component, cd)

	_, err = signer.Verify("")
	require.Error(t, err)
	require.Contains(t, err.Error(), "descriptor verify failed")

	_, err = signer.Verify("invalid")
	require.Error(t, err)
	require.Contains(t, err.Error(), "descriptor verify failed")

	signer2 := NewHS256Signer()
	require.NotNil(t, signer)
	v2, err := signer2.Sign(component)
	require.NoError(t, err)
	cd, err = signer2.Verify(v2)
	require.NoError(t, err)
	require.Equal(t, component, cd)
	_, err = signer.Verify(v2) // Verify using another signer
	require.Error(t, err)
	require.Contains(t, err.Error(), "descriptor verify failed")

	cdList, err := signer2.BatchVerify([]SignedComponentDescriptor{v2})
	require.NoError(t, err)
	require.Equal(t, []topo.ComponentDescriptor{component}, cdList)

	_, err = signer2.BatchVerify([]SignedComponentDescriptor{v2, v})
	require.Error(t, err)
	require.Contains(t, err.Error(), "descriptor verify failed")
}
