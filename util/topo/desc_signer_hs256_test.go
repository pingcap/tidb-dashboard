// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package topo

import (
	"testing"

	"github.com/joomcode/errorx"
	"github.com/stretchr/testify/require"
)

func TestHS256Signer(t *testing.T) {
	signer := NewHS256CompDescSigner()
	require.NotNil(t, signer)

	component := CompDesc{
		IP:         "topo-test.internal",
		Port:       1234,
		StatusPort: 4567,
		Kind:       KindPrometheus,
	}

	signedComponent, err := signer.Sign(&component)
	require.NoError(t, err)
	require.NotEmpty(t, signedComponent)

	err = signer.Verify(&signedComponent)
	require.NoError(t, err)

	err = signer.Verify(nil)
	require.Error(t, err)
	require.True(t, errorx.IsOfType(err, ErrSignerBadInput))

	err = signer.Verify(&SignedCompDesc{})
	require.Error(t, err)
	require.True(t, errorx.IsOfType(err, ErrSignerBadSignature))

	err = signer.Verify(&SignedCompDesc{Signature: "hello"})
	require.Error(t, err)
	require.True(t, errorx.IsOfType(err, ErrSignerBadSignature))

	err = signer.Verify(&SignedCompDesc{Signature: "fffe"})
	require.Error(t, err)
	require.True(t, errorx.IsOfType(err, ErrSignerBadSignature))

	// malformed descriptor
	badSignedComponent := signedComponent
	badSignedComponent.Port = 5667
	err = signer.Verify(&badSignedComponent)
	require.Error(t, err)
	require.True(t, errorx.IsOfType(err, ErrSignerBadSignature))

	// malformed signature
	badSignedComponent = signedComponent
	badSignedComponent.Signature += "00"
	err = signer.Verify(&badSignedComponent)
	require.Error(t, err)
	require.True(t, errorx.IsOfType(err, ErrSignerBadSignature))

	// signature from another signer
	signer2 := NewHS256CompDescSigner()
	require.NotNil(t, signer)
	signedComponent2, err := signer2.Sign(&component)
	require.NoError(t, err)
	err = signer2.Verify(&signedComponent2)
	require.NoError(t, err)
	err = signer.Verify(&signedComponent2)
	require.Error(t, err)
	require.True(t, errorx.IsOfType(err, ErrSignerBadSignature))
}
