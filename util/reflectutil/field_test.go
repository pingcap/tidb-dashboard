// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package reflectutil

import (
	"reflect"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestIsFieldExported(t *testing.T) {
	//nolint:structcheck
	type f struct {
		a   string //nolint:unused
		B   string
		ab  string //nolint:unused
		aBC string //nolint:unused
	}
	rt := reflect.TypeOf(f{})
	require.Equal(t, 4, rt.NumField())
	require.False(t, IsFieldExported(rt.Field(0)))
	require.Equal(t, "a", rt.Field(0).Name)
	require.True(t, IsFieldExported(rt.Field(1)))
	require.Equal(t, "B", rt.Field(1).Name)
	require.False(t, IsFieldExported(rt.Field(2)))
	require.Equal(t, "ab", rt.Field(2).Name)
	require.False(t, IsFieldExported(rt.Field(3)))
	require.Equal(t, "aBC", rt.Field(3).Name)

	type F2 struct {
		f
	}
	rt = reflect.TypeOf(F2{})
	require.Equal(t, 1, rt.NumField())
	require.False(t, IsFieldExported(rt.Field(0)))
	require.Equal(t, "f", rt.Field(0).Name)

	type F3 struct {
		F2
	}
	rt = reflect.TypeOf(F3{})
	require.Equal(t, 1, rt.NumField())
	require.True(t, IsFieldExported(rt.Field(0)))
	require.Equal(t, "F2", rt.Field(0).Name)
}
