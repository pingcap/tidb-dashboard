// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package endpoint

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestAPIParamPDKey(t *testing.T) {
	p := APIParamPDKey("foo", true)
	require.Equal(t, p.Name, "foo")
	require.True(t, p.Required)

	v, err := p.Resolve("fooo")
	require.Nil(t, v)
	require.NotNil(t, err)
	require.Contains(t, err.Error(), "'fooo' is not a valid hex key")

	v, err = p.Resolve("0x0011")
	require.Nil(t, v)
	require.NotNil(t, err)
	require.Contains(t, err.Error(), "'0x0011' is not a valid hex key")

	v, err = p.Resolve("0011")
	require.Equal(t, []string{"\x00\x11"}, v)
	require.Nil(t, err)
}

func TestAPIParamEnum(t *testing.T) {
	p := APIParamEnum("bar", false, []EnumItemDefinition{
		{Value: "v1"},
		{Value: "v2", DisplayAs: "d1"},
	})
	require.Equal(t, p.Name, "bar")
	require.False(t, p.Required)

	v, err := p.Resolve("x")
	require.Nil(t, v)
	require.NotNil(t, err)
	require.Contains(t, err.Error(), "'x' is not a valid enum value")

	v, err = p.Resolve("")
	require.Nil(t, v)
	require.NotNil(t, err)
	require.Contains(t, err.Error(), "'' is not a valid enum value")

	v, err = p.Resolve("v1")
	require.Equal(t, []string{"v1"}, v)
	require.Nil(t, err)

	v, err = p.Resolve("d1")
	require.Nil(t, v)
	require.NotNil(t, err)
	require.Contains(t, err.Error(), "'d1' is not a valid enum value")
}

func TestAPIParamInt(t *testing.T) {
	p := APIParamInt("ix", true)
	require.Equal(t, p.Name, "ix")
	require.True(t, p.Required)

	v, err := p.Resolve("ab")
	require.Nil(t, v)
	require.NotNil(t, err)
	require.Contains(t, err.Error(), "'ab' is not a int")

	v, err = p.Resolve("123.4")
	require.Nil(t, v)
	require.NotNil(t, err)
	require.Contains(t, err.Error(), "'123.4' is not a int")

	v, err = p.Resolve("123")
	require.Equal(t, []string{"123"}, v)
	require.Nil(t, err)
}
